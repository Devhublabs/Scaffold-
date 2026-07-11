import express from "express";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Health check so `docker-compose up` gives an obvious "it works" signal.
// Build auth, JWT, and the export service on top of this file.
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "backend-node" });
});

// express binds to 0.0.0.0 by default, so the container is reachable from the host
app.listen(PORT, () => {
  console.log(`backend-node listening on http://0.0.0.0:${PORT}`);
});
