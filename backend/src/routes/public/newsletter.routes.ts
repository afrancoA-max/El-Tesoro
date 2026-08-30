import { Router } from "express";
import { subscribeController } from "../../controllers/newsletter.controller";
import { newsletterRateLimiter } from "../../middlewares/rateLimit.middleware";

export const newsletterRouter = Router();

newsletterRouter.post("/subscribe", newsletterRateLimiter, subscribeController);
