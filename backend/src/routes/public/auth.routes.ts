import { Router } from "express";
import {
  registerController,
  verifyEmailController,
  resendVerificationController,
  loginController,
  refreshController,
  logoutController,
  forgotPasswordController,
  resetPasswordController,
  meController,
} from "../../controllers/auth.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { loginRateLimiter, registerRateLimiter, passwordResetRateLimiter } from "../../middlewares/rateLimit.middleware";

export const authRouter = Router();

authRouter.post("/register", registerRateLimiter, registerController);
authRouter.get("/verify-email", verifyEmailController);
authRouter.post("/resend-verification", registerRateLimiter, resendVerificationController);
authRouter.post("/login", loginRateLimiter, loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);
authRouter.post("/forgot-password", passwordResetRateLimiter, forgotPasswordController);
authRouter.post("/reset-password", passwordResetRateLimiter, resetPasswordController);
authRouter.get("/me", requireAuth, meController);
