import asyncHandler from "express-async-handler";
import prisma from "../config/db.js";
import redis from "../config/redis.js";

export const getEvents = asyncHandler(async(req, res)=>{
    const { month } = req.query; // format "YYYY-MM"
    
    if (!month) {
        return res.status(400).json({ message: "Month must be provided." });
    }

    const cacheKey = `schedule:events:${month}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    const startDate = new Date(`${month}-01`);    
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);

    const events = await prisma.schedule.findMany({
        where: {
                date: {
                    gte: startDate,
                    lt: endDate
                }
        },
        include: {
            events: true
        }
    });

    const organizedData = events.map((event)=>{
        return{
            date:event.date,
            events:event.events
        }
    })

    // Cache month events for 24 hours
    await redis.set(cacheKey, JSON.stringify(organizedData), "EX", 24 * 60 * 60);

    res.status(200).json(organizedData);
})

export const addEvent = asyncHandler(async(req, res)=>{
    const { date, title, discription, category } = req.body;

    let eventEntry = await prisma.schedule.findUnique({
        where: { date: date }
    });

    if (!eventEntry) {
        eventEntry = await prisma.schedule.create({
            data: {
                date: date,
                events: { create: [{ title, discription, category }] }
            }
        });
    } else {
        await prisma.event.create({
            data: {
                scheduleId: eventEntry.id,
                title,
                discription,
                category
            }
        });
    }
        eventEntry = await prisma.schedule.findUnique({
            where: { date: date },
            include: { events: true }
        });

    // Invalidate the cache for this event's month
    if (date && typeof date === "string") {
        const eventMonth = date.substring(0, 7);
        await redis.del(`schedule:events:${eventMonth}`);
    }

    res.status(200).json(eventEntry);
})

export const removeEvent = asyncHandler(async(req, res)=>{
    const { eventId } = req.body;

    const event = await prisma.event.findUnique({
        where: { id: eventId }
    });

    if (!event) {
        return res.status(404).json({ message: "Event not found." });
    }

    const scheduleId = event.scheduleId;

    // Fetch the schedule date before deleting so we can invalidate the cache
    const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId }
    });

    await prisma.event.delete({
        where: { id: eventId }
    });

    const remainingEvents = await prisma.event.findMany({
        where: { scheduleId: scheduleId }
    });

    if (schedule && schedule.date) {
        const dateStr = schedule.date.toISOString();
        const eventMonth = dateStr.substring(0, 7);
        await redis.del(`schedule:events:${eventMonth}`);
    }

    if (remainingEvents.length === 0) {
        await prisma.schedule.delete({
            where: { id: scheduleId }
        });
        return res.status(200).json({ message: "Event removed and date entry deleted as no events remain." });
    }

    const updatedSchedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: { events: true }
    });

    res.status(200).json(updatedSchedule);
})