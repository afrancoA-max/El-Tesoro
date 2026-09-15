import type { NextFunction, Request, Response } from "express";
import * as usersAdmin from "../services/usersAdmin.service";
import { createInternalUserSchema, updateInternalUserSchema } from "../validators/usersAdmin.validator";

export async function listUsersController(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await usersAdmin.listInternalUsers() });
  } catch (error) {
    next(error);
  }
}

export async function createUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createInternalUserSchema.parse(req.body);
    res.status(201).json({ success: true, data: await usersAdmin.createInternalUser(input) });
  } catch (error) {
    next(error);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateInternalUserSchema.parse(req.body);
    res.json({ success: true, data: await usersAdmin.updateInternalUser(req.params.id, input, req.user!.id) });
  } catch (error) {
    next(error);
  }
}
