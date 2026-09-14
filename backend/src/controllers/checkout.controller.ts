import type { NextFunction, Request, Response } from "express";
import { createOrderSchema, shippingMethodsQuerySchema } from "../validators/checkout.validator";
import * as shippingService from "../services/shipping.service";
import * as orderService from "../services/order.service";
import * as paymentConfigService from "../services/paymentConfig.service";
import type { CartContext } from "../services/cart.service";
import { getCartCookieName } from "../utils/cookies";

function cartContextOf(req: Request): CartContext {
  return { userId: req.user?.id, rawCartToken: req.cookies?.[getCartCookieName()] };
}

export async function getCheckoutConfigController(_req: Request, res: Response, next: NextFunction) {
  try {
    const pagosEnLineaHabilitado = await paymentConfigService.isOnlinePaymentEnabled();
    res.json({ success: true, data: { pagosEnLineaHabilitado } });
  } catch (error) {
    next(error);
  }
}

export async function getShippingMethodsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = shippingMethodsQuerySchema.parse(req.query);
    const methods = await shippingService.getShippingMethods(query.departamento ?? null, query.subtotal ?? "0.00");
    res.json({ success: true, data: { items: methods } });
  } catch (error) {
    next(error);
  }
}

export async function createOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder(cartContextOf(req), req.user?.id, input);
    res.status(201).json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
}

export async function getOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = typeof req.query.token === "string" ? req.query.token : undefined;
    const order = await orderService.getOrderByNumero(req.params.numero, { userId: req.user?.id, rawToken });
    res.json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
}
