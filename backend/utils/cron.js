import axios from "axios";
import prisma from "../config/db.js";

const chunkArray = (array, size) => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

export const refreshProfiles = async () => {
  try {
    const leetcodeEntries = await prisma.leetcode.findMany();
    const githubEntries = await prisma.gitHub.findMany();

    // ========================================================
    // 1. LEETCODE PROFILE SYNCHRONIZATION (BUFFERED WORKFLOW)
    // ========================================================
    const leetcodeUpdateBuffer = [];
    const leetcodeBatches = chunkArray(leetcodeEntries, 5); // 5 concurrent fetches

    for (const batch of leetcodeBatches) {
      await Promise.all(
        batch.map(async (entry) => {
          if (!entry.username) return;
          try {
            const leetcode = await axios.get(
              `https://leetcode.com/graphql?query=query%20{%20matchedUser(username:%22${entry.username}%22)%20{%20submissionCalendar%20submitStats%20{%20acSubmissionNum%20{%20count%20}%20}%20}%20}`
            );

            const matchedUser = leetcode.data.data.matchedUser;
            if (!matchedUser) return;

            const past5Days = getPastFiveDays();
            const record = await check(past5Days, matchedUser.submissionCalendar);

            // Buffer network payload in memory
            leetcodeUpdateBuffer.push({
              id: entry.id,
              trackerId: entry.trackerId,
              solvedProblems: matchedUser.submitStats.acSubmissionNum[0].count,
              easy: matchedUser.submitStats.acSubmissionNum[1].count,
              medium: matchedUser.submitStats.acSubmissionNum[2].count,
              hard: matchedUser.submitStats.acSubmissionNum[3].count,
              calendar: matchedUser.submissionCalendar,
              past5: record
            });
          } catch (err) {
            console.error(`Failed to fetch LeetCode data for user ${entry.username}:`, err.message);
          }
        })
      );
      // Brief pause to prevent hitting LeetCode request limits too aggressively
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Apply LeetCode updates sequentially back-to-back to prevent pool lockup
    if (leetcodeUpdateBuffer.length > 0) {
      for (const update of leetcodeUpdateBuffer) {
        try {
          await prisma.leetcode.update({
            where: { id: update.id },
            data: {
              solvedProblems: update.solvedProblems,
              easy: update.easy,
              medium: update.medium,
              hard: update.hard,
              calendar: update.calendar,
            },
          });

          await prisma.trackerDashboard.update({
            where: { id: update.trackerId },
            data: { past5: update.past5 },
          });
        } catch (err) {
          console.error(`Failed to execute LeetCode DB writes for trackerId ${update.trackerId}:`, err.message);
        }
      }
    }

    // ========================================================
    // 2. GITHUB PROFILE SYNCHRONIZATION (BUFFERED WORKFLOW)
    // ========================================================
    const githubUpdateBuffer = [];
    const githubBatches = chunkArray(githubEntries, 5); // 5 concurrent fetches

    for (const batch of githubBatches) {
      await Promise.all(
        batch.map(async (entry) => {
          if (!entry.username) return;
          try {
            const response = await axios.post(
              "https://api.github.com/graphql",
              {
                query: `query {user(login: "${entry.username}") {contributionsCollection {contributionCalendar {totalContributions}}pullRequests {totalCount}repositories(privacy: PUBLIC) {totalCount}}}`,
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                },
                timeout: 10000 // 10s network timeout
              }
            );

            const data = response.data.data.user;
            if (!data) return;

            // Buffer network payload in memory
            githubUpdateBuffer.push({
              id: entry.id,
              contributions: data.contributionsCollection.contributionCalendar.totalContributions,
              prs: data.pullRequests.totalCount,
              repos: data.repositories.totalCount
            });
          } catch (err) {
            console.error(`Failed to fetch GitHub data for user ${entry.username}:`, err.message);
          }
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Apply GitHub updates sequentially back-to-back
    if (githubUpdateBuffer.length > 0) {
      for (const update of githubUpdateBuffer) {
        try {
          await prisma.gitHub.update({
            where: { id: update.id },
            data: {
              contributions: update.contributions,
              prs: update.prs,
              repos: update.repos,
            },
          });
        } catch (err) {
          console.error(`Failed to execute GitHub DB write for ID ${update.id}:`, err.message);
        }
      }
    }

  } catch (globalErr) {
    console.error("Global error in refreshProfiles background task:", globalErr);
  }

  // Clear tracker dashboards and leaderboard caches
  try {
    const redis = (await import("../config/redis.js")).default;
    await redis.delByPattern("tracker:dashboard:*");
    await redis.delByPattern("leaderboard:*");
  } catch (err) {
    console.error("Cron failed to clear tracker/leaderboard caches:", err);
  }
};

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
