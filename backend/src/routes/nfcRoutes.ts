import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  consultarCpfEndpoint,
  cadastrarCartao,
  lerCartao,
  abrirComanda,
  recarregar,
  adicionarItem,
  verComanda,
  fecharComanda,
  listarComandasAbertas,
  historicoCliente,
  enviarCobranca
} from '../controllers/nfcController';

const router = Router();

// Publicas (app na maquininha, sem auth por enquanto)
router.get('/cpf/:cpf', consultarCpfEndpoint);
router.post('/cadastrar', cadastrarCartao);
router.get('/cartao/:uid', lerCartao);
router.post('/abrir', abrirComanda);
router.post('/comanda/:id/recarregar', recarregar);
router.post('/comanda/:id/item', adicionarItem);
router.get('/comanda/:id', verComanda);
router.post('/comanda/:id/fechar', fecharComanda);

// Admin (painel CRM - precisa auth)
router.get('/comandas-abertas', authMiddleware, listarComandasAbertas);
router.get('/historico/:cpf', authMiddleware, historicoCliente);
router.post('/comanda/:id/cobrar', authMiddleware, enviarCobranca);

export { router as nfcRoutes };
