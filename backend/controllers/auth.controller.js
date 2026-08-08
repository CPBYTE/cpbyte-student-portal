import asyncHandler from "express-async-handler";
import bcrypt from "bcrypt";
import { config } from "dotenv";
import jwt from "jsonwebtoken";
import { generateRefreshToken, hashToken, REFRESH_TOKEN_DAYS, generateAccessToken } from "../utils/authTokens.js";
import prisma from "../config/db.js";
import ResponseError from "../types/ResponseError.js";
import redis from "../config/redis.js";

import crypto from "crypto";
import { sendPasswordResetEmail } from "../utils/emailService.js";

config();

export const login = asyncHandler(async (req, res) => {
  const { library_id, password } = req.body;
  const cleanLibraryId = String(library_id || "").trim().toUpperCase();

  const user = await prisma.user.findUnique({
    where: {
      library_id: cleanLibraryId,
    },
  });
  if (!user) throw new ResponseError("User does not exist", 401);

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new ResponseError("Invalid credentials", 401);

  const token = generateAccessToken(user);

  const rawRefresh = generateRefreshToken();
  const tokenHash = hashToken(rawRefresh);

  // Store in Redis (expiration in seconds: 30 days)
  await redis.set(
    `refresh_token:${tokenHash}`,
    user.id,
    "EX",
    REFRESH_TOKEN_DAYS * 24 * 60 * 60
  );

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    path: "/",
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.cookie("refreshToken", rawRefresh, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    path: "/",
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });


  res.json({ success: true, message: "Login successfull", data: token, refreshToken: rawRefresh });
});


export const refresh = asyncHandler(async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) return res.status(401).json({ error: 'No refresh token' });
    const tHash = hashToken(rawToken);

    const redisKey = `refresh_token:${tHash}`;
    const storedValue = await redis.get(redisKey);

    if (!storedValue) {
      return res.status(401).json({ error: 'Refresh failed', reason: 'invalid_or_expired' });
    }

    let userId = storedValue;
    let isGrace = false;

    // Check if this token is currently in the 15-second grace period
    if (storedValue.startsWith("grace:")) {
      const activeHash = storedValue.split(":")[1];
      // Resolve the active token's owner
      const activeUserId = await redis.get(`refresh_token:${activeHash}`);
      if (activeUserId) {
        userId = activeUserId;
        isGrace = true;
      } else {
        return res.status(401).json({ error: 'Refresh failed', reason: 'revoked' });
      }
    }

    let newRaw = null;
    let newHash = null;

    if (!isGrace) {
      // Rotate token: Generate a new refresh token
      newRaw = generateRefreshToken();
      newHash = hashToken(newRaw);

      // Set old token to expire in 15 seconds (grace period) and point to new token
      await redis.set(redisKey, `grace:${newHash}`, "EX", 15);

      // Store the new token in Redis (valid for 30 days)
      await redis.set(
        `refresh_token:${newHash}`,
        userId,
        "EX",
        REFRESH_TOKEN_DAYS * 24 * 60 * 60
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ error: 'Refresh failed', reason: 'user_not_found' });
    }

    const newAccess = generateAccessToken(user);
    const isProduction = process.env.NODE_ENV === "production";

    // Set cookies
    if (!isGrace && newRaw) {
      res.cookie('refreshToken', newRaw, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? 'None' : 'Lax',
          path: "/",
          maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
      });
    }

    res.cookie('token', newAccess, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
        path: "/",
        maxAge: 60 * 60 * 1000, // 1 hour
    });

    return res.json({ accessToken: newAccess });
  } catch (err) {
    console.error('refresh error', err);
    return res.status(500).json({ error: 'server error' });
  }
});




export const register = asyncHandler(async (req, res) => {
  const { name, library_id, email, role, domain_dev, domain_dsa, year } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { library_id } });
  if (existingUser) throw new ResponseError("User already exists", 400);

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) throw new ResponseError("Email already registered", 400);
  const generateRandomPassword = (length = 10) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };
  const randomPassword = "password123"
  // generateRandomPassword();
  // console.log(randomPassword)
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const user = await prisma.user.create({
    data: {
      name,
      library_id,
      email,
      role,
      year,
      domain_dev,
      domain_dsa,
      password: hashedPassword,
    },
  });

  // @todo! Mail the generated password to the user through their email

  const tracker = await prisma.trackerDashboard.create({
    data: {
      userId: user.id,
      skills: [],
      github: {
        create: {
          url: "",
          username: ""
        },
      },
      leetcode: {
        create: {
          url: "",
          username: ""
        },
      },
    },
  })

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: user,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (rawToken) {
    const tHash = hashToken(rawToken);
    await redis.del(`refresh_token:${tHash}`);
  }

  const isProductionClear = process.env.NODE_ENV === "production";
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProductionClear,
    sameSite: isProductionClear ? "None" : "Lax",
    path: "/",
  });

  res.clearCookie("token", {
    httpOnly: true,
    secure: isProductionClear,
    sameSite: isProductionClear ? "None" : "Lax",
    path: "/",
  });

  res.status(200).json({ success: true, message: "Logout successful" });
});

export const debugCookies = asyncHandler(async (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: {
      'user-agent': req.get('User-Agent'),
      'origin': req.get('origin'),
      'referer': req.get('referer'),
    },
    message: 'Debug: cookies are being sent if they appear above'
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  const cleanIdentifier = String(identifier || "").trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: cleanIdentifier, mode: "insensitive" } },
        { library_id: { equals: cleanIdentifier, mode: "insensitive" } },
      ],
    },
  });

  if (!user) {
    throw new ResponseError("No user found with the provided Library ID or Email", 404);
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    },
  });

  const clientUrl = req.get("origin") || process.env.CLIENT_URL || "http://localhost:5173";
  const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

  const mailResult = await sendPasswordResetEmail(user.email, resetLink, user.name);

  res.status(200).json({
    success: true,
    message: `Password reset instructions sent to ${user.email}.`,
    email: user.email,
    ...(process.env.NODE_ENV !== "production" && { resetToken, resetLink, mailResult }),
  });
});

export const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ResponseError("Token is required", 400);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
    select: {
      id: true,
      name: true,
      email: true,
      library_id: true,
    },
  });

  if (!user) {
    throw new ResponseError("Invalid or expired reset token", 400);
  }

  res.status(200).json({
    success: true,
    message: "Token is valid",
    data: user,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ResponseError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });

  res.status(200).json({
    success: true,
    message: "Password reset successful! You can now log in with your new password.",
  });
});

