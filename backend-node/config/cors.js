const DEFAULT_ORIGINS = ["http://localhost:5173"];

export function getAllowedOrigins(env = process.env) {
  const configured = env.CORS_ORIGINS;
  if (!configured) return DEFAULT_ORIGINS;

  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createCorsOptions(env = process.env) {
  const allowedOrigins = getAllowedOrigins(env);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error("Origin is not allowed");
      error.status = 403;
      callback(error);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 600,
  };
}
