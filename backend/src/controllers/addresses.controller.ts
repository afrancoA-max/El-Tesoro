import type { NextFunction, Request, Response } from "express";
import { addressSchema, updateAddressSchema } from "../validators/address.validator";
import * as addressesService from "../services/addresses.service";

export async function listAddressesController(req: Request, res: Response, next: NextFunction) {
  try {
    const addresses = await addressesService.listAddresses(req.user!.id);
    res.json({ success: true, data: { items: addresses } });
  } catch (error) {
    next(error);
  }
}

export async function createAddressController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = addressSchema.parse(req.body);
    const address = await addressesService.createAddress(req.user!.id, input);
    res.status(201).json({ success: true, data: { address } });
  } catch (error) {
    next(error);
  }
}

export async function updateAddressController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateAddressSchema.parse(req.body);
    const address = await addressesService.updateAddress(req.user!.id, req.params.id, input);
    res.json({ success: true, data: { address } });
  } catch (error) {
    next(error);
  }
}

export async function setDefaultAddressController(req: Request, res: Response, next: NextFunction) {
  try {
    const address = await addressesService.setDefaultAddress(req.user!.id, req.params.id);
    res.json({ success: true, data: { address } });
  } catch (error) {
    next(error);
  }
}

export async function deleteAddressController(req: Request, res: Response, next: NextFunction) {
  try {
    await addressesService.deleteAddress(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
