import asyncHandler from "express-async-handler";
import prisma from "../config/db.js";
import ResponseError from "../types/ResponseError.js";
import redis from "../config/redis.js";

export const userAttendance = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { attendances: true },
    });

    if (!user) throw new ResponseError("User does not exist", 401);

    res.json({ success: true,message: "Attendance Fetched successfully", data: user.attendances });
});

export const getProfile = asyncHandler(async (req, res) => {
    const cacheKey = `user:profile:${req.userId}`;
    const cachedProfile = await redis.get(cacheKey);
    if (cachedProfile) {
        return res.status(200).json({ success: true, message: "User profile fetched", data: JSON.parse(cachedProfile) });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include:{
        attendances: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
      omit: {
        password: true
      }
    });
    if (!user) throw new ResponseError("User not found", 404);

    // Cache profile for 12 hours
    await redis.set(cacheKey, JSON.stringify(user), "EX", 12 * 60 * 60);
  
    res.status(200).json({ success: true, message: "User profile fetched", data: user });
  });

export const getProjects = asyncHandler(async (req, res)=>{
  const projects = await prisma.trackerDashboard.findUnique({
    where:{  userId:req.userId  },
    select:{
      projects:true
    }
  })

  res.status(200).json({success: true, message: "User projects fetched Successfully", data: projects})
})