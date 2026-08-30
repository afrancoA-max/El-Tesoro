import type { NextFunction, Request, Response } from "express";
import { updateProfileSchema } from "../validators/profile.validator";
import * as authService from "../services/auth.service";
import * as usersService from "../services/users.service";

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

/// "Mis pedidos" (checklist del módulo 04): estructura y endpoint listos
/// mostrando vacío. El módulo 06 (checkout/pedidos) le agrega contenido
/// real — este handler solo evita que el frontend necesite un modelo de
/// Order que todavía no existe.
export async function listMyOrdersController(_req: Request, res: Response) {
  res.json({ success: true, data: { items: [], total: 0 } });
}
