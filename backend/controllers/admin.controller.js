import asyncHandler from 'express-async-handler';
import prisma from '../config/db.js';
import ResponseError from '../types/ResponseError.js';
import cloudinary from '../config/cloudinary.js';

export const editUserProfile = asyncHandler(async (req, res) => {
    const { libId, data } = req.body;
    const { name, email, role, year, mentor_dsa, mentor_dev, domain_dev, domain_dsa, library_id } = data;

    if(!libId || !email || !name || !role || !year || !library_id || !domain_dev || !domain_dsa) {
        throw new ResponseError('Please provide all required fields', 400);
    }

    const user = await prisma.user.update({
        where: { library_id: libId },
        data: {
            name,
            email,
            role,
            year,
            mentor_dsa,
            mentor_dev,
            domain_dev,
            domain_dsa,
            library_id
        }
    })
    if (!user) {
        throw new ResponseError('User not found', 404);
    }
    res.status(200).json({
        success: true,
        data: user,
        message: 'User details updated successfully'
    });
});

export const deleteUser = asyncHandler(async (req, res) => {
    const { libId } = req.body;
    if (!libId) {
        throw new ResponseError('Please provide all required fields', 400);
    }

    const user =  await prisma.user.findUnique({
        where: { library_id: libId }
    });

    if (!user) {
        throw new ResponseError('User not found', 404);
    }

    if (user.avatar) {
            const publicId = user.avatar.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
    }

    await prisma.user.delete({
        where: { library_id: libId }
    });
    if (!user) {
        throw new ResponseError('User not found', 404);
    }
    res.status(200).json({
        success: true,
        data: user,
        message: 'User deleted successfully'
    });
});
export const getAllUsers = asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: {
        role: "USER",
      },
      omit: {
        password: true,
      },
    });
  
    if (!users || users.length === 0) {
      throw new ResponseError("No users found with role USER", 404);
    }
  
    res.status(200).json({
      success: true,
      message: "Users with role USER fetched successfully",
      data: users,
    });
  });

  
  export const getAllCoordinators = asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: {
        role: "COORDINATOR",
      },
      omit: {
        password: true,
      },
    });
  
    if (!users || users.length === 0) {
      throw new ResponseError("No users found with role USER", 404);
    }
  
    res.status(200).json({
      success: true,
      message: "Users with role COORDINATOR fetched successfully",
      data: users,
    });
  });
  

  export const getAllLeads = asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: {
        role: "LEAD",
      },
      omit: {
        password: true,
      },
    });
  
    if (!users || users.length === 0) {
      throw new ResponseError("No users found with role USER", 404);
    }
  
    res.status(200).json({
      success: true,
      message: "Users with role USER fetched successfully",
      data: users,
    });
  });
  
  