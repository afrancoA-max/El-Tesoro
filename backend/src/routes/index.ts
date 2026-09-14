import { Router } from "express";
import { prisma } from "../config/prisma";
import { categoriesRouter } from "./public/categories.routes";
import { productsRouter } from "./public/products.routes";
import { searchRouter } from "./public/search.routes";
import { collectionsRouter } from "./public/collections.routes";
import { authRouter } from "./public/auth.routes";
import { accountRouter } from "./public/account.routes";
import { newsletterRouter } from "./public/newsletter.routes";
import { cartRouter } from "./public/cart.routes";
import { staffInventoryRouter } from "./public/staffInventory.routes";
import { sitemapRouter } from "./public/sitemap.routes";
import { bannersRouter } from "./public/banners.routes";
import { checkoutRouter } from "./public/checkout.routes";
import { ordersRouter } from "./public/orders.routes";

export const apiRouter = Router();

apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/search", searchRouter);
apiRouter.use("/collections", collectionsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/account", accountRouter);
apiRouter.use("/newsletter", newsletterRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/staff/inventory", staffInventoryRouter);
apiRouter.use("/sitemap", sitemapRouter);
apiRouter.use("/banners", bannersRouter);
apiRouter.use("/checkout", checkoutRouter);
apiRouter.use("/orders", ordersRouter);

// INF-10: antes solo confirmaba que el proceso Express respondía, nunca que
// la base de datos estuviera accesible — un Cloud SQL caído (o el
// connector mal configurado) se veía "sano" aquí mientras todo lo demás
// fallaba con 500.
apiRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: "ok" } });
  } catch {
    res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "No se pudo conectar a la base de datos." } });
  }
});
