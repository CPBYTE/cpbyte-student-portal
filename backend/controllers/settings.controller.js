import bcrypt from "bcrypt";
import ResponseError from "../types/ResponseError.js";
import prisma from "../config/db.js";
import asyncHandler from "express-async-handler";
import cloudinary from "../config/cloudinary.js";

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

    const result = await cloudinary.uploader.upload(image);

    if (!result) {
        throw new ResponseError("Image upload failed", 500);
    }

    if (user.avatar) {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
    }

    await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: result.url },
    });

    return res.json({
        success: true,
        message: "Avatar updated successfully",
        image: result.url,
    });
})