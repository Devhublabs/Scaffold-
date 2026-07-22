import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

const SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeSignupInput({ username, email, password }) {
  if (
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    throw httpError('username, email, and password are required', 400);
  }

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedUsername.length < 3 || normalizedUsername.length > 40) {
    throw httpError('username must be between 3 and 40 characters', 400);
  }
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw httpError('email must be valid', 400);
  }
  if (password.length < 8 || password.length > 128) {
    throw httpError('password must be between 8 and 128 characters', 400);
  }

  return { username: normalizedUsername, email: normalizedEmail, password };
}

function normalizeLoginInput({ email, password }) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw httpError('email and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalizedEmail) || password.length === 0) {
    throw httpError('email and password are required', 400);
  }

  return { email: normalizedEmail, password };
}

export async function signup({ username, email, password }) {
  const normalized = normalizeSignupInput({ username, email, password });

  const existingUser = await User.findOne({
    $or: [{ username: normalized.username }, { email: normalized.email }],
  });

  if (existingUser) {
    throw httpError('A user with this username or email already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(normalized.password, SALT_ROUNDS);
  const userId = randomUUID();

  let user;
  try {
    user = await User.create({
      userId,
      username: normalized.username,
      email: normalized.email,
      password: hashedPassword,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw httpError('A user with this username or email already exists', 409);
    }
    throw error;
  }

  const token = generateToken({ userId: user.userId, username: user.username });

  return { userId: user.userId, username: user.username, token };
}

export async function login({ email, password }) {
  const normalized = normalizeLoginInput({ email, password });
  const user = await User.findOne({ email: normalized.email });

  if (!user) throw httpError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(normalized.password, user.password);
  if (!isMatch) throw httpError('Invalid email or password', 401);

  const token = generateToken({ userId: user.userId, username: user.username });

  return { userId: user.userId, username: user.username, token };
}
