import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import bcrypt from "bcryptjs";
import { createApp } from "../app.js";
import User from "../models/User.js";
import { login, signup } from "../services/authService.js";
import { generateToken, verifyToken } from "../utils/jwt.js";

async function withServer(run) {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("JWT round-trip preserves the shared identity claims", () => {
  process.env.JWT_SECRET = "test-secret";

  const token = generateToken({ userId: "user-123", username: "artist" });
  const payload = verifyToken(token);

  assert.equal(payload.userId, "user-123");
  assert.equal(payload.username, "artist");
  assert.equal(typeof payload.iat, "number");
  assert.equal(typeof payload.exp, "number");
  assert.ok(payload.exp > payload.iat);
});

test("JWT verification rejects a token signed with another secret", () => {
  process.env.JWT_SECRET = "first-secret";
  const token = generateToken({ userId: "user-123", username: "artist" });

  process.env.JWT_SECRET = "second-secret";
  assert.throws(() => verifyToken(token));
});

test("signup validates input before accessing MongoDB", async () => {
  await assert.rejects(
    signup({ username: "ab", email: "invalid", password: "short" }),
    (error) => error.status === 400
  );
});

test("signup hashes the password and returns a verifiable identity token", async () => {
  process.env.JWT_SECRET = "test-secret";
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  let createdDocument;

  User.findOne = async () => null;
  User.create = async (document) => {
    createdDocument = document;
    return document;
  };

  try {
    const result = await signup({
      username: "  artist  ",
      email: "ARTIST@example.com",
      password: "password123",
    });
    const payload = verifyToken(result.token);

    assert.equal(result.username, "artist");
    assert.equal(payload.userId, result.userId);
    assert.equal(createdDocument.email, "artist@example.com");
    assert.notEqual(createdDocument.password, "password123");
    assert.equal(
      await bcrypt.compare("password123", createdDocument.password),
      true
    );
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
  }
});

test("login verifies the password and returns the stored user identity", async () => {
  process.env.JWT_SECRET = "test-secret";
  const originalFindOne = User.findOne;
  const password = await bcrypt.hash("password123", 4);

  User.findOne = async () => ({
    userId: "user-123",
    username: "artist",
    email: "artist@example.com",
    password,
  });

  try {
    const result = await login({
      email: "ARTIST@example.com",
      password: "password123",
    });

    assert.equal(result.userId, "user-123");
    assert.equal(result.username, "artist");
    assert.equal(verifyToken(result.token).userId, "user-123");
  } finally {
    User.findOne = originalFindOne;
  }
});

test("health endpoint allows the configured frontend origin", async () => {
  process.env.CORS_ORIGINS = "http://localhost:5173";

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "http://localhost:5173" },
    });

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:5173"
    );
  });
});

test("requests from unconfigured browser origins are rejected", async () => {
  process.env.CORS_ORIGINS = "http://localhost:5173";

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "https://untrusted.example" },
    });

    assert.equal(response.status, 403);
  });
});

test("auth/me returns verified token claims", async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  const token = generateToken({ userId: "user-123", username: "artist" });

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { userId: "user-123", username: "artist" });
  });
});

test("auth/me rejects requests without a bearer token", async () => {
  process.env.JWT_SECRET = "test-secret";

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/me`);

    assert.equal(response.status, 401);
  });
});
