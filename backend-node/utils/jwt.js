import jwt from 'jsonwebtoken';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined in environment variables');
  return secret;
}

export function generateToken(payload) {
  const { userId, username } = payload;
  return jwt.sign({ userId, username }, getSecret(), { algorithm: 'HS256', expiresIn: '1h' });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
}
