import type { NextFunction, Request, Response } from "express";
import { addCartItemSchema, updateCartItemSchema } from "../validators/cart.validator";
import * as cartService from "../services/cart.service";
import type { CartContext } from "../services/cart.service";
import { getCartCookieName, setCartTokenCookie, clearCartTokenCookie } from "../utils/cookies";

function contextOf(req: Request): CartContext {
  return { userId: req.user?.id, rawCartToken: req.cookies?.[getCartCookieName()] };
}

export async function getCartController(req: Request, res: Response, next: NextFunction) {
  try {
    const cart = await cartService.getCart(contextOf(req));
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
}

export async function addCartItemController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = addCartItemSchema.parse(req.body);
    const { cart, newCartToken, limitado } = await cartService.addItem(contextOf(req), input.variantId, input.cantidad);
    if (newCartToken) setCartTokenCookie(res, newCartToken);
    res.status(201).json({ success: true, data: { cart, limitado } });
  } catch (error) {
    next(error);
  }
}

export async function updateCartItemController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCartItemSchema.parse(req.body);
    const cart = await cartService.updateItemQuantity(contextOf(req), req.params.id, input.cantidad);
    res.json({ success: true, data: { cart } });
  } catch (error) {
    next(error);
  }
}

export async function deleteCartItemController(req: Request, res: Response, next: NextFunction) {
  try {
    const cart = await cartService.removeItem(contextOf(req), req.params.id);
    res.json({ success: true, data: { cart } });
  } catch (error) {
    next(error);
  }
}

export async function mergeCartController(req: Request, res: Response, next: NextFunction) {
  try {
    const rawCartToken = req.cookies?.[getCartCookieName()];
    const cart = await cartService.mergeAnonymousCart(req.user!.id, rawCartToken);
    clearCartTokenCookie(res);
    res.json({ success: true, data: { cart } });
  } catch (error) {
    next(error);
  }
}
