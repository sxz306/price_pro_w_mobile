import { Router, type IRouter } from "express";
import healthRouter from "./health";
import appRouter, { seedDatabase } from "./routes";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appRouter);

// Seed on import (mirrors original app behavior, but only once)
seedDatabase().catch((err) => {
  logger.error({ err }, "Failed to seed database");
});

export default router;
