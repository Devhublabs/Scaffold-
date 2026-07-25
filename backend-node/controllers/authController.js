import { signup as signupService, login as loginService } from '../services/authService.js';

export async function signup(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const result = await signupService({ username, email, password });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await loginService({ email, password });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
