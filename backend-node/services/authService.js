import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

const SALT_ROUNDS = 10;

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function signup({ username, email, password }) {
  if (!username || !email || !password) {
    throw httpError('username, email, and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    $or: [{ username }, { email: normalizedEmail }],
  });

  if (existingUser) {
    throw httpError('A user with this username or email already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = randomUUID();

  const user = await User.create({
    userId,
    username,
    email: normalizedEmail,
    password: hashedPassword,
  });

  const token = generateToken({ userId: user.userId, username: user.username });

  return { userId: user.userId, username: user.username, token };
}

export async function login({ email, password }) {
  if (!email || !password) {
    throw httpError('email and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) throw httpError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw httpError('Invalid email or password', 401);

  const token = generateToken({ userId: user.userId, username: user.username });

  return { userId: user.userId, username: user.username, token };
}
