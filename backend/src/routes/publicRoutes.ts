import { Router } from 'express';
import {
  getTenantConfig,
  getCategories,
  getProducts,
  getProductById,
  getExtras,
} from '../controllers/publicController';
import { createOrder } from '../controllers/orderController';

const router = Router();

// Config do tenant (branding, cores, logo)
router.get('/tenant/config', getTenantConfig);

// Cardapio publico
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.get('/extras', getExtras);

// Pedidos (totem do cliente)
router.post('/orders', createOrder);

export { router as publicRoutes };
