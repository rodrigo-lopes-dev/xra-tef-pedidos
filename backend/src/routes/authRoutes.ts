import { Router } from 'express';
import { loginController, verifyController } from '../controllers/authController';
import { loginRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/auth/login — rate limited contra brute force
router.post('/login', loginRateLimiter, loginController);

// GET /api/auth/verify — verificar se token e valido
router.get('/verify', verifyController);

export { router as authRoutes };
