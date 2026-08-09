import asyncHandler from "express-async-handler";
import ResponseError from "../types/ResponseError.js";
import prisma from "../config/db.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import logger from "../config/logger.js";
dayjs.extend(utc);
dayjs.extend(timezone);

export const allAttendance = asyncHandler(async (req, res) => {
  const page = Math.max(0, parseInt(req.query.page || "0", 10));
  const limit = Math.max(1, parseInt(req.query.limit || "50", 10));

  const total = await prisma.user.count({
    where: { role: "USER" },
  });

  const allUsers = await prisma.user.findMany({
    where: { role: "USER" },
    skip: page * limit,
    take: limit,
    include: { attendances: true },
  });

  if (allUsers.length === 0) {
    throw new ResponseError("No attendance records found", 404);
  }

  const record = allUsers.map((user) => ({
    name: user.name,
    library_id: user.library_id,
    dsaAttendance: user.dsaAttendance,
    devAttendance: user.devAttendance,
    attendances: user.attendances
      ? user.attendances.map((attendance) => ({
          date: attendance.date,
          status: attendance.status,
          subject: attendance.subject,
        }))
      : [],
  }));

  res.json({
    success: true,
    data: record,
    total,
    page,
    limit,
    message: "Attendance records fetched successfully",
  });
});

export const markAttendance = asyncHandler(async (req, res) => {
  const { responses, subject, date } = req.body;

  if (!responses || responses.length === 0) {
    throw new ResponseError("No responses provided", 400);
  }

  const istDate = dayjs(date).tz("Asia/Kolkata").startOf("day").toDate();

  const libraryIds = responses.map(r => r.library_id);
  const users = await prisma.user.findMany({
    where: { library_id: { in: libraryIds } },
  });

  const userMap = new Map(users.map(u => [u.library_id, u]));
  const userIds = users.map(u => u.id);

  // Fetch only the existing records for this specific date and subject
  const existingRecords = await prisma.attendance.findMany({
    where: {
      userId: { in: userIds },
      date: istDate,
      subject,
    },
  });
  const existingRecordsMap = new Map(existingRecords.map(r => [r.userId, r]));

  // Fetch counts of previous attendances grouped by user, subject, and status
  const aggregates = await prisma.attendance.groupBy({
    by: ["userId", "subject", "status"],
    where: {
      userId: { in: userIds },
    },
    _count: {
      id: true,
    },
  });

  const countMap = new Map();
  for (const userId of userIds) {
    countMap.set(userId, { dsaTotal: 0, dsaPresent: 0, devTotal: 0, devPresent: 0 });
  }

  for (const agg of aggregates) {
    const counts = countMap.get(agg.userId);
    if (!counts) continue;

    const count = agg._count.id;
    if (agg.subject === "DSA") {
      counts.dsaTotal += count;
      if (agg.status === "PRESENT") {
        counts.dsaPresent += count;
      }
    } else if (agg.subject === "DEV") {
      counts.devTotal += count;
      if (agg.status === "PRESENT") {
        counts.devPresent += count;
      }
    }
  }

  const toCreate = [];
  const attendanceUpdates = [];
  const userUpdates = [];

  for (const response of responses) {
    const { library_id, status } = response;
    const user = userMap.get(library_id);

    if (!user) {
      throw new ResponseError(`User with Library_ID: ${library_id} not found`, 404);
    }

    const finalStatus =
      status === "PRESENT"
        ? "PRESENT"
        : status === "ABSENT WITH REASON"
          ? "ABSENT_WITH_REASON"
          : "ABSENT_WITHOUT_REASON";

    const userCounts = countMap.get(user.id);
    let dsaTotal = userCounts.dsaTotal;
    let dsaPresent = userCounts.dsaPresent;
    let devTotal = userCounts.devTotal;
    let devPresent = userCounts.devPresent;

    const existingRecord = existingRecordsMap.get(user.id);

    if (subject === "DSA") {
      if (existingRecord) {
        if (existingRecord.status === "PRESENT" && finalStatus !== "PRESENT") {
          dsaPresent = Math.max(0, dsaPresent - 1);
        } else if (existingRecord.status !== "PRESENT" && finalStatus === "PRESENT") {
          dsaPresent += 1;
        }
      } else {
        dsaTotal += 1;
        if (finalStatus === "PRESENT") {
          dsaPresent += 1;
        }
      }
    } else {
      if (existingRecord) {
        if (existingRecord.status === "PRESENT" && finalStatus !== "PRESENT") {
          devPresent = Math.max(0, devPresent - 1);
        } else if (existingRecord.status !== "PRESENT" && finalStatus === "PRESENT") {
          devPresent += 1;
        }
      } else {
        devTotal += 1;
        if (finalStatus === "PRESENT") {
          devPresent += 1;
        }
      }
    }

    const dsaPercentage = dsaTotal ? (dsaPresent / dsaTotal) * 100 : 0;
    const devPercentage = devTotal ? (devPresent / devTotal) * 100 : 0;

    if (existingRecord) {
      if (existingRecord.status !== finalStatus) {
        attendanceUpdates.push(
          prisma.attendance.update({
            where: { id: existingRecord.id },
            data: { status: finalStatus },
          })
        );
      }
    } else {
      toCreate.push({
        userId: user.id,
        subject,
        date: istDate,
        status: finalStatus,
      });
    }

    userUpdates.push(
      prisma.user.update({
        where: { id: user.id },
        data: {
          dsaAttendance: Math.round(dsaPercentage),
          devAttendance: Math.round(devPercentage),
        },
      })
    );
  }

  // Execute bulk insertions in a single query (critical to await to ensure records are saved)
  if (toCreate.length > 0) {
    await prisma.attendance.createMany({ data: toCreate });
  }

  // Trigger updates asynchronously in the background (Fire-and-Forget)
  const backgroundOps = [...attendanceUpdates, ...userUpdates];
  if (backgroundOps.length > 0) {
    Promise.all(backgroundOps).catch(err => {
      logger.error("Failed to execute background attendance updates:", { error: err.message });
    });
  }

  res.json({
    success: true,
    message: "Attendance marked successfully",
  });
});

export const memberOfDomain = asyncHandler(async (req, res) => {
  const { domain } = req.query;

  if (!domain) {
    throw new ResponseError("Domain is required", 400);
  }

  const validDevDomains = {
    ANDROID_FLUTTER: "ANDROID_FLUTTER",
    ANDROID_KOTLIN: "ANDROID_KOTLIN",
    ARVR: "ARVR",
    ML: "ML",
    WEBDEV: "WEBDEV",
    UIUX: "UIUX",
    GENAI: "GENAI",
  };

  const validDsaDomains = {
    JAVA: "JAVA",
    CPP: "CPP"
  };

  if (!validDevDomains[domain] && !validDsaDomains[domain]) {
    throw new ResponseError("Invalid domain", 400);
  }

  const orConditions = [];
  if (validDevDomains[domain]) {
    orConditions.push({ domain_dev: validDevDomains[domain] });
  }
  if (validDsaDomains[domain]) {
    orConditions.push({ domain_dsa: validDsaDomains[domain] });
  }

  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      OR: orConditions,
    },
  });

  const usersWithStatus = users.map(user => ({
    ...user,
    status: "PENDING",
  }));

  res.json({
    success: true,
    data: usersWithStatus,
    message: `Users in domain ${domain} fetched successfully`,
  });
})

export const checkStatus = asyncHandler(async (req, res) => {
  const { domain, date } = req.body;

  if (!domain)
    throw new ResponseError("Domain is required", 400);
  if (!date)
    throw new ResponseError("Date is required", 400);

  const istStart = dayjs(date, "YYYY-MM-DD").tz("Asia/Kolkata").startOf("day").toDate();
  const istEnd = dayjs(date, "YYYY-MM-DD").tz("Asia/Kolkata").endOf("day").toDate();
  console.log(istStart);
  console.log(istEnd);

  const status = await prisma.attendanceLog.findMany({
    where: {
      domain,
      date: {
        gte: istStart,
        lte: istEnd,
      }
    }
  })

  res.json({
    marked: status.length > 0
  })
})

export const updateStatus = asyncHandler(async (req, res) => {
  const { domain, date } = req.body;

  if (!domain)
    throw new ResponseError("Domain is required", 400);
  if (!date)
    throw new ResponseError("Date is required", 400);

  const istDate = dayjs(date, "YYYY-MM-DD").tz("Asia/Kolkata").endOf("day").toDate();

  await prisma.attendanceLog.create({
    data: {
      domain,
      date: istDate,
    }
  })

  res.json({
    success: true,
    message: "Status updated successfully"
  })
})