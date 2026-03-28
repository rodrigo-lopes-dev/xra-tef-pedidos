import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';
import { listOrders, getOrderDetail, updateOrderStatus } from '../controllers/adminOrderController';
import {
  listProducts, createProduct, updateProduct, deleteProduct,
  listCategories, createCategory, updateCategory, deleteCategory,
  listExtras, createExtra, updateExtra, deleteExtra,
  getSettings, updateSettings,
  getDailySales,
} from '../controllers/adminCrudController';

const router = Router();

// Todas as rotas admin precisam de auth
router.use(authMiddleware);

// Dashboard
router.get('/dashboard', getDailySales);

// Pedidos (admin + vendedor)
router.get('/orders', listOrders);
router.get('/orders/:id', getOrderDetail);
router.patch('/orders/:id/status', updateOrderStatus);

// Produtos (admin only)
router.get('/products', listProducts);
router.post('/products', adminOnly, createProduct);
router.put('/products/:id', adminOnly, updateProduct);
router.delete('/products/:id', adminOnly, deleteProduct);

// Categorias (admin only)
router.get('/categories', listCategories);
router.post('/categories', adminOnly, createCategory);
router.put('/categories/:id', adminOnly, updateCategory);
router.delete('/categories/:id', adminOnly, deleteCategory);

// Adicionais (admin only)
router.get('/extras', listExtras);
router.post('/extras', adminOnly, createExtra);
router.put('/extras/:id', adminOnly, updateExtra);
router.delete('/extras/:id', adminOnly, deleteExtra);

// Configuracoes (admin only)
router.get('/settings', adminOnly, getSettings);
router.put('/settings', adminOnly, updateSettings);

export { router as adminRoutes };
