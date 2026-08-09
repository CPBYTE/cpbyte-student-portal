import asyncHandler from "express-async-handler";
import prisma from "../config/db.js";
import ResponseError from "../types/ResponseError.js";
import axios from "axios";
import cloudinary from "../config/cloudinary.js";
import { refreshProfiles } from "../utils/cron.js";
import redis from "../config/redis.js";

const invalidateLeaderboardCache = async () => {
  try {
    await redis.delByPattern("leaderboard:*");
  } catch (err) {
    console.error("Failed to invalidate leaderboard cache:", err);
  }
};

const invalidateTrackerCache = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { library_id: true }
    });
    if (user && user.library_id) {
      await redis.del(`tracker:dashboard:${user.library_id}`);
    }
    await invalidateLeaderboardCache();
  } catch (err) {
    console.error("Failed to invalidate tracker cache:", err);
  }
};

export const getTrackerDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ResponseError("User ID is required", 400);
  }

  const cacheKey = `tracker:dashboard:${id}`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const DashData = await prisma.user.findUnique({
    where: {
      library_id: id,
    },
    include: {
      tracker: {
        include: {
          leetcode: true,
          github: true,
          projects:true
        },
      },
    },
    omit: {
      password: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!DashData) {
    return res
      .status(404)
      .json({ message: "No tracker data found for this user" });
  }

  // Calculate dynamic rank based on solved problems count
  if (DashData.tracker) {
    let rank = 0;
    if (DashData.tracker.leetcode) {
      const solved = DashData.tracker.leetcode.solvedProblems;
      const higherSolvedCount = await prisma.leetcode.count({
        where: {
          solvedProblems: {
            gt: solved,
          },
        },
      });
      rank = higherSolvedCount + 1;
    }
    DashData.tracker.rank = rank;
  }

  // Cache dashboard for 2 hours
  await redis.set(cacheKey, JSON.stringify(DashData), "EX", 2 * 60 * 60);

  return res.status(200).json(DashData);
});

export const addSkill = asyncHandler(async (req, res) => {
  const { skill } = req.body;

  if (!skill) {
    throw new ResponseError("Skill is required", 400);
  }

  const updatedTracker = await prisma.trackerDashboard.update({
    where: {
      userId: req.userId,
    },
    data: {
      skills: {
        push: skill,
      },
    },
  });

  await invalidateTrackerCache(req.userId);

  return res.status(200).json(updatedTracker);
});

export const removeSkill = asyncHandler(async (req, res) => {
  const { skill } = req.body;

  if (!skill) {
    throw new ResponseError("Skill is required", 400);
  }
  const dashboard = await prisma.trackerDashboard.findUnique({
    where: {
      userId: req.userId,
    },
  });

  if (!dashboard) {
    throw new ResponseError("Dashboard not found", 404);
  }

  const updatedSkills = dashboard.skills.filter((s) => s !== skill);

  const updatedTracker = await prisma.trackerDashboard.update({
    where: {
      userId: req.userId,
    },
    data: {
      skills: updatedSkills,
    },
  });

  await invalidateTrackerCache(req.userId);

  return res.status(200).json(updatedTracker);
});

const getPastFiveDays = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pastFiveDays = [];

  for (let i = 4; i >= 0; i--) {
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - i);
    const utcTimestamp = Date.UTC(
      pastDate.getFullYear(),
      pastDate.getMonth(),
      pastDate.getDate()
    );
    pastFiveDays.push(utcTimestamp / 1000);
  }
  return pastFiveDays;
}; // This function returns an array of the last 5 days in UTC timestamp format

const check = async (matchDate, dbHistory) => {
  const dbObject = JSON.parse(dbHistory);
  const set = new Set(Object.keys(dbObject).map(Number));
  const finalDate = [0, 0, 0, 0, 0];
  for (let i = 4; i >= 0; i--) {
    if (set.has(matchDate[i])) {
      finalDate[i] = 1;
    }
  }
  return finalDate;
}; // This function checks if the last 5 days are present in the database history and returns an array of 1s and 0s

export const addLeetCode = asyncHandler(async (req, res) => {
  const { leetcodeUsername } = req.body;

  if (!leetcodeUsername) {
    throw new ResponseError("Leetcode username is required", 400);
  }

  const leetcode = await axios.get(
    `https://leetcode.com/graphql?query=query%20{%20matchedUser(username:%22${leetcodeUsername}%22)%20{%20submissionCalendar%20submitStats%20{%20acSubmissionNum%20{%20count%20}%20}%20}%20}`
  );

  const matchedUser = leetcode.data.data.matchedUser;

  if (!matchedUser) {
    throw new ResponseError("Leetcode user not found", 404);
  }

  const tracker = await prisma.trackerDashboard.findUnique({
    where: {
      userId: req.userId,
    },
    include: {
      leetcode: true,
    },
  });

  await prisma.leetcode.update({
    where: {
      id: tracker.leetcode.id,
    },
    data: {
      username: leetcodeUsername,
      url: `https://leetcode.com/${leetcodeUsername}/`,
      solvedProblems: matchedUser.submitStats.acSubmissionNum[0].count,
      easy: matchedUser.submitStats.acSubmissionNum[1].count,
      medium: matchedUser.submitStats.acSubmissionNum[2].count,
      hard: matchedUser.submitStats.acSubmissionNum[3].count,
      calendar: matchedUser.submissionCalendar,
      tracker: {
        connect: {
          id: tracker.id,
        },
      },
    },
  });

  const past5Days = getPastFiveDays();
  const record = await check(past5Days, matchedUser.submissionCalendar);

  const updatedTracker = await prisma.trackerDashboard.update({
    where: {
      id: tracker.id,
    },
    data: {
      past5: record,
    },
    include: {
      leetcode: true,
    },
  });

  await invalidateTrackerCache(req.userId);

  return res.status(200).json(updatedTracker);
});

export const addProject = asyncHandler(async (req, res) => {
  const { project } = req.body;

  if (!project) {
    throw new ResponseError("Project data is required", 400);
  }
  const tracker = await prisma.trackerDashboard.findUnique({
    where: { userId: req.userId },
  });

  if (!tracker) {
    throw new ResponseError("Tracker not found for this user", 404);
  }

  const { coverImage } = project;
  let coverImageUrl = coverImage;

  if (!coverImage.startsWith("http://") && !coverImage.startsWith("https://")) {
    const result = await cloudinary.uploader.upload(coverImage);

    if (!result) {
      throw new ResponseError("Image upload failed", 500);
    }

    coverImageUrl = result.url;
  }

  project.coverImage = coverImageUrl;

  const addedProject = await prisma.projects.create({
    data: {
      ...project,
      tracker: {
        connect: {
          id: tracker.id,
        },
      },
    },
  });

  await invalidateTrackerCache(req.userId);

  return res.status(201).json(addedProject);
});

export const removeProject = asyncHandler(async (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    throw new ResponseError("Project ID is required", 400);
  }

  const deletedProject = await prisma.projects.delete({
    where: {
      id: projectId,
    },
  });

   if (deletedProject.coverImage) {
          const publicId = deletedProject.coverImage.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
  }

  const newProject = await prisma.projects.findMany({
    where: {
      trackerId: deletedProject.trackerId,
    },
  });

  // Invalidate cache
  const trackerForProject = await prisma.trackerDashboard.findUnique({
    where: { id: deletedProject.trackerId },
    select: { userId: true }
  });
  if (trackerForProject && trackerForProject.userId) {
    await invalidateTrackerCache(trackerForProject.userId);
  }

  return res.status(200).json(newProject);
});

export const addGitHub = asyncHandler(async (req, res) => {
  const { githubUsername } = req.body;

  if (!githubUsername) {
    throw new ResponseError("GitHub data is required", 400);
  }

  const tracker = await prisma.trackerDashboard.findUnique({
    where: {
      userId: req.userId,
    },
    include: {
      github: true,
    },
  });

  if (!tracker) {
    throw new ResponseError("User Tracker Dashboard not found", 404);
  }

  const response = await axios.post(
    "https://api.github.com/graphql",
    {
      query: `query {user(login: "${githubUsername}") {contributionsCollection {contributionCalendar {totalContributions}}pullRequests {totalCount}repositories(privacy: PUBLIC) {totalCount}}}`,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    }
  );

  if (response.status !== 200) {
    throw new ResponseError("GitHub user not found", 404);
  }

  const totalContributions =
    response.data.data.user.contributionsCollection.contributionCalendar
      .totalContributions;
  const totalPullRequests = response.data.data.user.pullRequests.totalCount;
  const totalRepositories = response.data.data.user.repositories.totalCount;

  const updatedGithub = await prisma.gitHub.update({
    where: {
      id: tracker.github.id,
    },
    data: {
      url: `https://github.com/${githubUsername}`,
      contributions: totalContributions,
      prs: totalPullRequests,
      repos: totalRepositories,
      username: githubUsername,
    },
  });

  await invalidateTrackerCache(req.userId);

  return res.status(200).json(updatedGithub);
});

export const refreshAll = asyncHandler(async (req, res) => {
  refreshProfiles().catch((err) => {
    console.error("Error in background profile refresh:", err);
  });

  return res.status(202).json({
    message: "LeetCode and GitHub profile refresh started in the background",
  });
});

export const getTop = asyncHandler(async (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit || "3", 10));
  const language = req.query.language;
  const year = req.query.year ? parseInt(req.query.year, 10) : undefined;

  const cacheKey = `leaderboard:top:limit:${limit}:lang:${language || "all"}:year:${year || "all"}`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const whereFilter = {};
  if (language || year !== undefined) {
    whereFilter.tracker = { user: {} };
    if (language) whereFilter.tracker.user.domain_dsa = language;
    if (year !== undefined) whereFilter.tracker.user.year = year;
  }

  const entries = await prisma.leetcode.findMany({
    where: whereFilter,
    orderBy: { solvedProblems: "desc" },
    take: limit,
    include: {
      tracker: {
        include: {
          user: {
            select: { name: true, library_id: true, avatar: true, domain_dsa: true, year: true }
          }
        }
      }
    }
  });

  const formatted = entries
    .filter(entry => entry.tracker?.id)
    .map((entry) => ({
      id: entry.tracker.id,
      name: entry.tracker.user.name,
      library_id: entry.tracker.user.library_id,
      solvedProblems: entry.solvedProblems,
      avatar: entry.tracker.user.avatar,
      language: entry.tracker.user.domain_dsa,
      previous: entry.tracker.past5,
      year: entry.tracker.user.year,
      leetcodeUsername: entry.username
    }));

  // Cache leaderboard for 30 minutes
  await redis.set(cacheKey, JSON.stringify(formatted), "EX", 30 * 60);

  return res.status(200).json(formatted);
});

export const getAll = asyncHandler(async (req, res) => {
  const page = Math.max(0, parseInt(req.query.page || "0", 10));
  const limit = Math.max(1, parseInt(req.query.limit || "10", 10));
  const language = req.query.language;
  const year = req.query.year ? parseInt(req.query.year, 10) : undefined;

  const cacheKey = `leaderboard:all:page:${page}:limit:${limit}:lang:${language || "all"}:year:${year || "all"}`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const whereFilter = {};
  if (language || year !== undefined) {
    whereFilter.tracker = { user: {} };
    if (language) whereFilter.tracker.user.domain_dsa = language;
    if (year !== undefined) whereFilter.tracker.user.year = year;
  }

  const total = await prisma.leetcode.count({ where: whereFilter });

  const pageEntries = await prisma.leetcode.findMany({
    where: whereFilter,
    orderBy: { solvedProblems: "desc" },
    skip: page * limit,
    take: limit,
    include: {
      tracker: {
        include: {
          user: {
            select: { name: true, library_id: true, avatar: true, domain_dsa: true, year: true }
          }
        }
      }
    }
  });

  const formattedPage = pageEntries
    .filter(entry => entry.tracker?.id)
    .map((entry) => ({
      id: entry.tracker.id,
      name: entry.tracker.user.name,
      library_id: entry.tracker.user.library_id,
      solvedProblems: entry.solvedProblems,
      avatar: entry.tracker.user.avatar,
      language: entry.tracker.user.domain_dsa,
      previous: entry.tracker.past5,
      year: entry.tracker.user.year,
      leetcodeUsername: entry.username
    }));

  const withRank = formattedPage.map((entry, idx) => ({ ...entry, rank: page * limit + idx + 1 }));

  const result = { users: withRank, total };

  // Cache leaderboard page for 30 minutes
  await redis.set(cacheKey, JSON.stringify(result), "EX", 30 * 60);

  return res.status(200).json(result);
});