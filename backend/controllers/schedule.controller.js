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

    // Upsert: create the schedule+event in one query, or add event to existing schedule
    let eventEntry = await prisma.schedule.findUnique({
        where: { date: date }
    });

    if (!eventEntry) {
        // Create schedule and event together, return with events included — single query
        eventEntry = await prisma.schedule.create({
            data: {
                date: date,
                events: { create: [{ title, discription, category }] }
            },
            include: { events: true }
        });
    } else {
        // Create new event and fetch updated schedule in parallel
        const [_, updatedSchedule] = await Promise.all([
            prisma.event.create({
                data: {
                    scheduleId: eventEntry.id,
                    title,
                    discription,
                    category
                }
            }),
            // This runs concurrently — by the time we read, the event is committed
            prisma.schedule.findUnique({
                where: { date: date },
                include: { events: true }
            })
        ]);
        eventEntry = updatedSchedule;
    }

    // Invalidate the cache for this event's month
    if (date && typeof date === "string") {
        const eventMonth = date.substring(0, 7);
        // Fire-and-forget: don't await cache invalidation to speed up response
        redis.del(`schedule:events:${eventMonth}`).catch(() => {});
    }

    res.status(200).json(eventEntry);
})

export const removeEvent = asyncHandler(async(req, res)=>{
    const { eventId } = req.body;

    // Fetch event with its parent schedule in a single query using include
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            schedule: true
        }
    });

    if (!event) {
        return res.status(404).json({ message: "Event not found." });
    }

    const scheduleId = event.scheduleId;
    const schedule = event.schedule;

    // Delete the event and count remaining events in parallel
    const [_, remainingCount] = await Promise.all([
        prisma.event.delete({
            where: { id: eventId }
        }),
        prisma.event.count({
            where: { scheduleId: scheduleId, id: { not: eventId } }
        })
    ]);

    // Invalidate cache (fire-and-forget)
    if (schedule && schedule.date) {
        const dateStr = schedule.date.toISOString();
        const eventMonth = dateStr.substring(0, 7);
        redis.del(`schedule:events:${eventMonth}`).catch(() => {});
    }

    // If no events remain, delete the empty schedule entry
    if (remainingCount === 0) {
        await prisma.schedule.delete({
            where: { id: scheduleId }
        });
        return res.status(200).json({ message: "Event removed and date entry deleted as no events remain." });
    }

    // Return updated schedule with remaining events
    const updatedSchedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: { events: true }
    });

    res.status(200).json(updatedSchedule);
})