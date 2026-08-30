import type { NextFunction, Request, Response } from "express";
import { newsletterSubscribeSchema } from "../validators/newsletter.validator";
import * as newsletterService from "../services/newsletter.service";

export async function subscribeController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = newsletterSubscribeSchema.parse(req.body);
    await newsletterService.subscribe(input);
    res.status(201).json({ success: true, data: { subscribed: true } });
  } catch (error) {
    next(error);
  }
}
