import { verifyToken } from "../utils/jwt.js";

function unauthorized(message) {
  const error = new Error(message);
  error.status = 401;
  return error;
}

export function requireAuth(req, res, next) {
  void res;

  const authorization = req.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(unauthorized("Bearer token required"));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    next(unauthorized("Bearer token required"));
    return;
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}
