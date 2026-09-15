import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import path from "path";
import fs from "fs";

app.use("/api", router);

// Serve frontend static assets:
// - On Vercel: VERCEL=1 is auto-set, Vite outputs to root public/
// - Locally: serve from the local dist/public build output
const frontendDist = process.env.VERCEL
  ? path.resolve(process.cwd(), "public")
  : path.resolve(import.meta.dirname, "../../qa-machine-board/dist/public");

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
  });
} else {
  app.get("/", (_req, res) => {
    res.json({
      status: "online",
      message: "QA Machine Board API Server is running",
      frontendDevUrl: "http://localhost:3000",
      apiEndpoints: {
        machines: "/api/machines",
        summary: "/api/summary",
        activity: "/api/activity",
      },
    });
  });
}


export default app;

