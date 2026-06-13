import { Router } from "express";
import { login } from "../controllers/auth.controller";
import { rateLimitLogin } from "../middlewares/security.middleware";

const router = Router();

router.post("/login", rateLimitLogin, login);

export default router;
