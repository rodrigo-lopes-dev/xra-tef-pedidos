# Backend SaaS - Guia de Implementacao

> Documento pra codar o backend do xra-autopay-pedidos.
> Porta 5500. Node.js + Express + TypeScript + Supabase.
> Copiar este doc na proxima sessao e pedir pra implementar.

---

## 1. Setup inicial

```bash
cd c:\xra-autopay-pedidos
mkdir -p backend/src/{config,middleware,routes,controllers,services}
cd backend
npm init -y
npm install express cors dotenv @supabase/supabase-js jsonwebtoken bcrypt
npm install -D typescript ts-node-dev @types/express @types/cors @types/jsonwebtoken @types/bcrypt @types/node
npx tsc --init
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### .env
```
SUPABASE_URL=https://igtzpmqiwerxeiihqwpg.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
PORT=5500
JWT_SECRET=uma_chave_secreta_forte_aqui
NODE_ENV=development
```

---

## 2. Estrutura de arquivos

```
backend/src/
├── config/
│   └── supabase.ts
├── middleware/
│   ├── tenantMiddleware.ts      # Resolve tenant pelo header X-Tenant-Slug
│   ├── authMiddleware.ts        # Valida JWT
│   └── rateLimiter.ts           # Rate limiting
├── routes/
│   ├── publicRoutes.ts          # Config tenant + cardapio (sem auth)
│   ├── authRoutes.ts            # Login
│   ├── adminProductRoutes.ts    # CRUD produtos (auth)
│   ├── adminCategoryRoutes.ts   # CRUD categorias (auth)
│   ├── adminExtraRoutes.ts      # CRUD adicionais (auth)
│   ├── adminOrderRoutes.ts      # Pedidos (auth)
│   └── adminConfigRoutes.ts     # Config tenant (auth)
├── controllers/
│   ├── publicController.ts
│   ├── authController.ts
│   ├── productController.ts
│   ├── categoryController.ts
│   ├── extraController.ts
│   ├── orderController.ts
│   └── configController.ts
├── services/
│   ├── tenantService.ts
│   ├── authService.ts
│   ├── productService.ts
│   ├── categoryService.ts
│   ├── extraService.ts
│   └── orderService.ts
└── server.ts
```

---

## 3. server.ts (entry point)

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';
import publicRoutes from './routes/publicRoutes';
import authRoutes from './routes/authRoutes';
import adminProductRoutes from './routes/adminProductRoutes';
import adminCategoryRoutes from './routes/adminCategoryRoutes';
import adminExtraRoutes from './routes/adminExtraRoutes';
import adminOrderRoutes from './routes/adminOrderRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());
app.use(generalLimiter);

// Tenant middleware em todas as rotas /api
app.use('/api', tenantMiddleware);

// Rotas publicas (sem auth)
app.use('/api/tenant', publicRoutes);
app.use('/api/categories', publicRoutes);
app.use('/api/products', publicRoutes);
app.use('/api/extras', publicRoutes);
app.use('/api/orders', publicRoutes);

// Auth
app.use('/api/auth', authLimiter, authRoutes);

// Rotas admin (com auth JWT)
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/extras', adminExtraRoutes);
app.use('/api/admin/orders', adminOrderRoutes);

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'XRA AutoPay Pedidos', port: PORT });
});

app.listen(PORT, () => {
  console.log(`XRA AutoPay Pedidos rodando na porta ${PORT}`);
});
```

---

## 4. config/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL e SUPABASE_ANON_KEY obrigatorias!');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 5. middleware/tenantMiddleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Cache em memoria (5 min TTL)
const cache = new Map<string, { tenant: any; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Pegar slug do header (app envia) ou do subdominio (web)
  const slug = req.headers['x-tenant-slug'] as string
    || req.hostname.split('.')[0];

  if (!slug || slug === 'autopay' || slug === 'localhost') {
    return res.status(400).json({ error: 'Tenant nao identificado' });
  }

  // Buscar no cache
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    (req as any).tenant = cached.tenant;
    return next();
  }

  // Buscar no banco
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'ativo')
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Estabelecimento nao encontrado' });
  }

  // Cachear
  cache.set(slug, { tenant: data, cachedAt: Date.now() });
  (req as any).tenant = data;
  next();
}
```

---

## 6. middleware/authMiddleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token ausente' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verificar se o token pertence ao mesmo tenant
    const tenant = (req as any).tenant;
    if (tenant && decoded.tenantId !== tenant.id) {
      return res.status(403).json({ error: 'Acesso negado a este estabelecimento' });
    }

    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}
```

---

## 7. middleware/rateLimiter.ts

```typescript
import rateLimit from 'express-rate-limit';
// npm install express-rate-limit

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: { error: 'Muitas requisicoes. Tente novamente em 1 minuto.' }
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas de login. Tente novamente em 1 minuto.' }
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Limite de pedidos atingido.' }
});
```

---

## 8. services/authService.ts

```typescript
import { supabase } from '../config/supabase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export class AuthService {
  async login(tenantId: string, usuario: string, senha: string) {
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('usuario', usuario)
      .eq('ativo', true)
      .single();

    if (error || !user) throw new Error('Usuario ou senha incorretos');

    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) throw new Error('Usuario ou senha incorretos');

    const token = jwt.sign(
      { userId: user.id, tenantId, tipo: user.tipo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { token, user: { nome: user.nome, tipo: user.tipo } };
  }

  async createUser(tenantId: string, nome: string, usuario: string, senha: string, tipo: string = 'vendedor') {
    const senhaHash = await bcrypt.hash(senha, 10);

    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ tenant_id: tenantId, nome, usuario, senha_hash: senhaHash, tipo }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

---

## 9. services/productService.ts (exemplo, categorias e extras sao iguais)

```typescript
import { supabase } from '../config/supabase';

export class ProductService {
  // Publico: so ativos
  async getAll(tenantId: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Admin: todos (ativos + inativos)
  async getAllAdmin(tenantId: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('ordem', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async create(tenantId: string, productData: any) {
    const { data, error } = await supabase
      .from('produtos')
      .insert([{ ...productData, tenant_id: tenantId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(tenantId: string, id: string, productData: any) {
    const { data, error } = await supabase
      .from('produtos')
      .update(productData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(tenantId: string, id: string) {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }

  async toggle(tenantId: string, id: string) {
    // Buscar o estado atual
    const { data: product } = await supabase
      .from('produtos')
      .select('ativo')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!product) throw new Error('Produto nao encontrado');

    const { data, error } = await supabase
      .from('produtos')
      .update({ ativo: !product.ativo })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

---

## 10. Rotas de exemplo

### routes/publicRoutes.ts
```typescript
import { Router } from 'express';
import { PublicController } from '../controllers/publicController';

const router = Router();
const controller = new PublicController();

router.get('/config', controller.getTenantConfig);        // GET /api/tenant/config
router.get('/categories', controller.getCategories);       // GET /api/categories
router.get('/products', controller.getProducts);           // GET /api/products
router.get('/extras', controller.getExtras);               // GET /api/extras
router.post('/orders', controller.createOrder);            // POST /api/orders

export default router;
```

### routes/adminProductRoutes.ts
```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { ProductController } from '../controllers/productController';

const router = Router();
const controller = new ProductController();

router.use(authMiddleware); // Todas as rotas admin precisam de JWT

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.patch('/:id/toggle', controller.toggle);

export default router;
```

---

## 11. Controllers de exemplo

### controllers/publicController.ts
```typescript
import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { CategoryService } from '../services/categoryService';
import { ExtraService } from '../services/extraService';
import { OrderService } from '../services/orderService';

const productService = new ProductService();
const categoryService = new CategoryService();
const extraService = new ExtraService();
const orderService = new OrderService();

export class PublicController {
  async getTenantConfig(req: Request, res: Response) {
    const tenant = (req as any).tenant;
    res.json({
      nome: tenant.nome,
      logo_url: tenant.logo_url,
      cor_primaria: tenant.cor_primaria,
      cor_secundaria: tenant.cor_secundaria,
      cor_fundo: tenant.cor_fundo,
      cor_texto: tenant.cor_texto,
      cor_destaque: tenant.cor_destaque,
      maquininha_ativa: tenant.maquininha_ativa,
      mensagem_boas_vindas: tenant.mensagem_boas_vindas,
    });
  }

  async getCategories(req: Request, res: Response) {
    try {
      const tenant = (req as any).tenant;
      const data = await categoryService.getAll(tenant.id);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProducts(req: Request, res: Response) {
    try {
      const tenant = (req as any).tenant;
      const data = await productService.getAll(tenant.id);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getExtras(req: Request, res: Response) {
    try {
      const tenant = (req as any).tenant;
      const data = await extraService.getAll(tenant.id);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createOrder(req: Request, res: Response) {
    try {
      const tenant = (req as any).tenant;
      const data = await orderService.create(tenant.id, req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

---

## 12. SQL pra rodar no Supabase (tabelas ja criadas, so falta seed)

```sql
-- Seed: criar tenant de teste
INSERT INTO tenants (slug, nome, cor_primaria, cor_secundaria, cor_fundo, cor_texto, cor_destaque)
VALUES ('demo', 'Demo AutoPay', '#3B82F6', '#1E40AF', '#0F172A', '#FFFFFF', '#60A5FA');

-- Seed: criar usuario admin do tenant demo
-- Senha: admin123 (hash bcrypt)
INSERT INTO usuarios (tenant_id, nome, usuario, senha_hash, tipo)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'demo'),
  'Admin Demo',
  'admin',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', -- gerar hash real
  'admin'
);
```

---

## 13. App Android - Retrofit Service (conectar no backend)

```kotlin
// data/api/ApiService.kt
interface ApiService {
    @GET("api/tenant/config")
    suspend fun getTenantConfig(): TenantConfig

    @GET("api/categories")
    suspend fun getCategories(): List<Category>

    @GET("api/products")
    suspend fun getProducts(): List<Product>

    @GET("api/extras")
    suspend fun getExtras(): List<Extra>

    @POST("api/orders")
    suspend fun createOrder(@Body order: CreateOrderRequest): Order

    @POST("api/auth/login")
    suspend fun login(@Body credentials: LoginRequest): LoginResponse

    // Admin
    @GET("api/admin/products")
    suspend fun getAdminProducts(): List<Product>

    @POST("api/admin/products")
    suspend fun createProduct(@Body product: Product): Product

    @PUT("api/admin/products/{id}")
    suspend fun updateProduct(@Path("id") id: String, @Body product: Product): Product

    @DELETE("api/admin/products/{id}")
    suspend fun deleteProduct(@Path("id") id: String)

    @PATCH("api/admin/products/{id}/toggle")
    suspend fun toggleProduct(@Path("id") id: String): Product
}

// data/api/ApiClient.kt
object ApiClient {
    private const val BASE_URL = "https://autopay.xrtec1.com/"

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("X-Tenant-Slug", PrefsManager.getTenantSlug())
                .apply {
                    PrefsManager.getToken()?.let {
                        addHeader("Authorization", "Bearer $it")
                    }
                }
                .build()
            chain.proceed(request)
        }
        .build()

    val service: ApiService = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)
}
```

---

## 14. Ordem de implementacao

```
1. npm init + instalar dependencias
2. config/supabase.ts
3. middleware/tenantMiddleware.ts
4. middleware/authMiddleware.ts
5. middleware/rateLimiter.ts
6. services/authService.ts
7. routes/authRoutes.ts + controllers/authController.ts
8. services/categoryService.ts
9. services/productService.ts
10. services/extraService.ts
11. routes/publicRoutes.ts + controllers/publicController.ts
12. routes/adminProductRoutes.ts + controllers/productController.ts
13. routes/adminCategoryRoutes.ts + controllers/categoryController.ts
14. routes/adminExtraRoutes.ts + controllers/extraController.ts
15. services/orderService.ts
16. routes/adminOrderRoutes.ts + controllers/orderController.ts
17. server.ts (juntar tudo)
18. Testar com curl
19. Conectar app Android via Retrofit
```

---

## 15. Seguranca implementada

| Camada | Protecao |
|---|---|
| Rate limit | 5 req/min login, 100 req/min geral |
| JWT | Token com tenantId, expira em 24h |
| Tenant isolation | Todas as queries filtram por tenant_id |
| Senha | bcrypt hash (nunca texto puro) |
| HTTPS | Hostinger proxy com SSL |
| Validacao | Tenant do token == tenant da URL |
| CORS | Habilitado |

---

**Pra proxima sessao**: abra este arquivo e peca pra implementar na ordem da secao 14.
