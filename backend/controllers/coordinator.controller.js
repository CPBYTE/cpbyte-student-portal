import asyncHandler from "express-async-handler";
import ResponseError from "../types/ResponseError.js";
import prisma from "../config/db.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

export const allAttendance = asyncHandler(async (req, res) => {

  const allUsers = await prisma.user.findMany({
    where: { role: "USER" },
    include: { attendances: true },
  });

  if (allUsers.length === 0) {
    throw new ResponseError("No attendance records found", 404);
  }

  const record = await Promise.all(
    allUsers.map(async (user) => ({
      name: user.name,
      library_id: user.library_id,
      dsaAttendance: user.dsaAttendance,
      devAttendance: user.devAttendance,
      attendances: user.attendances ?
        user.attendances.map((attendance) => ({
          date: attendance.date,
          status: attendance.status,
          subject: attendance.subject,
        })) : [],
    })))

  res.json({
    success: true,
    data: record,
    message: "All attendance records fetched successfully",
  })
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
    include: { attendances: true },
  });

  const userMap = new Map(users.map(u => [u.library_id, u]));

  const ops = [];

  for (const response of responses) {
    const { library_id, status } = response;
    const user = userMap.get(library_id);

    if (!user) {
      throw new ResponseError(`User with Library_ID: ${library_id} not found`, 404);
    }

    let Tdsa = 0, Tdev = 0, TdsaP = 0, TdevP = 0;

    user.attendances.forEach(item => {
      if (item.subject === "DSA") {
        Tdsa++;
        if (item.status === "PRESENT") TdsaP++;
      } else if (item.subject === "DEV") {
        Tdev++;
        if (item.status === "PRESENT") TdevP++;
      }
    });

    if (subject === "DSA") {
      Tdsa++;
      if (status === "PRESENT") TdsaP++;
    } else {
      Tdev++;
      if (status === "PRESENT") TdevP++;
    }

    const dsaPercentage = Tdsa ? (TdsaP / Tdsa) * 100 : 0;
    const devPercentage = Tdev ? (TdevP / Tdev) * 100 : 0;

    const finalStatus =
      status === "PRESENT"
        ? "PRESENT"
        : status === "ABSENT WITH REASON"
          ? "ABSENT_WITH_REASON"
          : "ABSENT_WITHOUT_REASON";

    ops.push(
      prisma.attendance.upsert({
        where: {
          userId_date_subject: {
            userId: user.id,
            date: istDate,
            subject,
          },
        },
        update: { status: finalStatus },
        create: {
          userId: user.id,
          subject,
          date: istDate,
          status: finalStatus,
        },
      })
    );

    ops.push(
      prisma.user.update({
        where: { id: user.id },
        data: {
          dsaAttendance: Math.round(dsaPercentage),
          devAttendance: Math.round(devPercentage),
        },
      })
    );
  }

  await prisma.$transaction(ops, { timeout: 20000 });

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

  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      OR: [
        { domain_dev: validDevDomains[domain] },
        { domain_dsa: validDsaDomains[domain] },
      ]
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