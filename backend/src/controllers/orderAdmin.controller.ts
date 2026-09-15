import type { NextFunction, Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import * as orderAdmin from "../services/orderAdmin.service";
import { parsePagination } from "../utils/pagination";
import { advanceOrderSchema, cancelOrderSchema, orderListQuerySchema } from "../validators/orderAdmin.validator";

export async function listOrdersController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = orderListQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const result = await orderAdmin.listOrdersAdmin(
      {
        estado: query.estado as OrderStatus | undefined,
        desde: query.desde ? new Date(query.desde) : undefined,
        hasta: query.hasta ? new Date(query.hasta) : undefined,
        q: query.q,
      },
      pagination,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await orderAdmin.getOrderAdminDetail(req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function confirmPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await orderAdmin.confirmPaymentManually(req.params.id, req.user!.id) });
  } catch (error) {
    next(error);
  }
}

export async function advanceOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = advanceOrderSchema.parse(req.body);
    res.json({ success: true, data: await orderAdmin.advanceOrderStatus(req.params.id, req.user!.id, input) });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const { motivo } = cancelOrderSchema.parse(req.body);
    res.json({ success: true, data: await orderAdmin.cancelOrder(req.params.id, motivo, req.user!.id) });
  } catch (error) {
    next(error);
  }
}
