import type { NextFunction, Request, Response } from "express";
import { updateProfileSchema } from "../validators/profile.validator";
import * as authService from "../services/auth.service";
import * as usersService from "../services/users.service";
import * as orderService from "../services/order.service";

export async function getProfileController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getPublicUserById(req.user!.id);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function updateProfileController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProfileSchema.parse(req.body);
    const user = await usersService.updateProfile(req.user!.id, input);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

/// "Mis pedidos" (checklist del módulo 04, contenido real del módulo 06).
export async function listMyOrdersController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await orderService.listMyOrders(req.user!.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
