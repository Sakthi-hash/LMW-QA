import { Router, type IRouter } from "express";
import healthRouter from "./health";
import machinesRouter from "./machines";

const router: IRouter = Router();

router.use(healthRouter);
router.use(machinesRouter);

export default router;
