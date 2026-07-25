import cors from "cors";
import express from "express";
import { createCorsOptions } from "./config/cors.js";
import authRoutes from "./routes/authRoutes.js";

export function createApp() {
  const app = express();

  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "backend-node" });
  });

  app.use("/auth", authRoutes);

  app.use((err, req, res, next) => {
    void next;
    const status = Number.isInteger(err.status) ? err.status : 500;
    if (status >= 500) {
      console.error(err);
    }

    const message =
      status >= 500 ? "Internal server error" : err.message || "Request failed";

    res.status(status).json({ error: message });
  });

  return app;
}
