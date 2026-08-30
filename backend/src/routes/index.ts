import { Router } from "express";
import { categoriesRouter } from "./public/categories.routes";
import { productsRouter } from "./public/products.routes";
import { searchRouter } from "./public/search.routes";
import { collectionsRouter } from "./public/collections.routes";
import { authRouter } from "./public/auth.routes";
import { accountRouter } from "./public/account.routes";
import { newsletterRouter } from "./public/newsletter.routes";

export const apiRouter = Router();

apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/search", searchRouter);
apiRouter.use("/collections", collectionsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/account", accountRouter);
apiRouter.use("/newsletter", newsletterRouter);

apiRouter.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});
