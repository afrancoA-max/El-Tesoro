import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { createUserController, listUsersController, updateUserController } from "../../controllers/usersAdmin.controller";

export const usersAdminRouter = Router();

usersAdminRouter.use(requirePermission("users:manage"));

usersAdminRouter.get("/", listUsersController);
usersAdminRouter.post("/", createUserController);
usersAdminRouter.patch("/:id", updateUserController);
