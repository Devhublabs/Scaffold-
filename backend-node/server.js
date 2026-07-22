import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, "../.env") });

const PORT = process.env.PORT || 4000;

async function startServer() {
  await connectDB();
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`backend-node listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
