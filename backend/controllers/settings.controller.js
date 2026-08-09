import bcrypt from "bcrypt";
import ResponseError from "../types/ResponseError.js";
import prisma from "../config/db.js";
import asyncHandler from "express-async-handler";
import cloudinary from "../config/cloudinary.js";
import redis from "../config/redis.js";

export const editPass = asyncHandler(async (req, res) => {

        const { oldPass, newPass, confPass } = req.body;

        if (!oldPass || !newPass || !confPass) {
        throw new ResponseError("Please provide all required fields", 400);
        }
        if (newPass !== confPass) {
        throw new ResponseError("New password and confirmation password do not match", 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: req.userId },
        });

        const isMatch = await bcrypt.compare(oldPass, user.password);
        if (!isMatch) {
            throw new ResponseError("Old password is incorrect", 401);
        }

        const hashedPassword = await bcrypt.hash(newPass, 10);

        await prisma.user.update({
            where: { id: req.userId },
            data: { password: hashedPassword },
        });

        // Invalidate profile cache
        await redis.del(`user:profile:${req.userId}`);
        
        return res.json({
            success: true,
            message: "Password updated successfully",
        });
})

export const editAvatar = asyncHandler(async (req, res) => {
    const { image } = req.body;

    if (!image) {
        throw new ResponseError("Please provide an image", 400);
    }
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
    });

    let imageUrl = image;

    if (!image.startsWith("http://") && !image.startsWith("https://")) {
        const result = await cloudinary.uploader.upload(image);

        if (!result) {
            throw new ResponseError("Image upload failed", 500);
        }

        imageUrl = result.url;

        if (user.avatar) {
            const publicId = user.avatar.split('/').pop().split('.')[0];
            cloudinary.uploader.destroy(publicId).catch((err) => {
                console.error("Failed to delete old avatar from Cloudinary:", err);
            });
        }
    }

    await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: imageUrl },
    });

    // Invalidate profile cache
    await redis.del(`user:profile:${req.userId}`);

    return res.json({
        success: true,
        message: "Avatar updated successfully",
        image: imageUrl,
    });
})