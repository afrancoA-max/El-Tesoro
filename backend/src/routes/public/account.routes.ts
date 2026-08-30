import { Router } from "express";
import { getProfileController, updateProfileController, listMyOrdersController } from "../../controllers/profile.controller";
import {
  listAddressesController,
  createAddressController,
  updateAddressController,
  setDefaultAddressController,
  deleteAddressController,
} from "../../controllers/addresses.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

export const accountRouter = Router();

// Todo lo bajo /account requiere sesión — protección centralizada, no
// confiar en que cada controlador lo verifique por su cuenta.
accountRouter.use(requireAuth);

accountRouter.get("/profile", getProfileController);
accountRouter.patch("/profile", updateProfileController);

accountRouter.get("/addresses", listAddressesController);
accountRouter.post("/addresses", createAddressController);
accountRouter.put("/addresses/:id", updateAddressController);
accountRouter.patch("/addresses/:id/default", setDefaultAddressController);
accountRouter.delete("/addresses/:id", deleteAddressController);

accountRouter.get("/orders", listMyOrdersController);
