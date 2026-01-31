import { Router } from "express";

import { login, logout, register, refresh, debugCookies } from "../controllers/auth.controller.js";
import isAuthenticated from "../middlewares/auth/isAuthenticated.js";

import {
  validateLoginRequest,
  validateRegisterRequest,
} from "../middlewares/validators/auth.validator.js";

import isAdmin from "../middlewares/auth/isAdmin.js";

const router = Router();

router.post("/login", validateLoginRequest, login);
router.post("/refresh", refresh);
router.post("/register", isAdmin, validateRegisterRequest, register);
router.get("/logout",isAuthenticated,logout);
router.get("/debug-cookies", debugCookies);

export default router;
