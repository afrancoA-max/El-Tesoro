import type { NextFunction, Request, Response } from "express";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";
import * as authService from "../services/auth.service";
import { setAuthCookies, clearAuthCookies, getRefreshCookieName } from "../utils/cookies";
import { AppError } from "../utils/AppError";

export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const user = await authService.register(input);
    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmailController(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = verifyEmailSchema.parse(req.query);
    await authService.verifyEmail(token);
    res.json({ success: true, data: { verified: true } });
  } catch (error) {
    next(error);
  }
}

export async function resendVerificationController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    await authService.resendVerification(email);
    res.json({ success: true, data: { sent: true } });
  } catch (error) {
    next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const { user, tokens } = await authService.login(input);
    setAuthCookies(res, tokens);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function refreshController(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRefreshToken = req.cookies?.[getRefreshCookieName()];
    if (!rawRefreshToken) {
      throw AppError.unauthorized("NOT_AUTHENTICATED", "No hay sesión activa.");
    }
    const { user, tokens } = await authService.refreshSession(rawRefreshToken);
    setAuthCookies(res, tokens);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRefreshToken = req.cookies?.[getRefreshCookieName()];
    await authService.logout(rawRefreshToken);
    clearAuthCookies(res);
    res.json({ success: true, data: { loggedOut: true } });
  } catch (error) {
    next(error);
  }
}

export async function forgotPasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    res.json({ success: true, data: { sent: true } });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    res.json({ success: true, data: { reset: true } });
  } catch (error) {
    next(error);
  }
}

export async function meController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getPublicUserById(req.user!.id);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}
