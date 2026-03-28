import rateLimit from 'express-rate-limit';

// Rate limiter global: 100 requests por minuto por IP
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: {
    error: 'Muitas requisicoes. Tente novamente em 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter mais restrito para login (previne brute force)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas a cada 15 min
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
