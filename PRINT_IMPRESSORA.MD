# Print Server + TEF - Arquitetura e Lógica

## Visao Geral

Servidor local (Python Flask) que roda no **PC da lanchonete/totem**, responsavel por:
1. **Impressao** de comandas na impressora termica (ESC/POS)
2. **TEF** (pagamento cartao) via Stone AutoTEF Slim
3. **Heartbeat** pro painel de monitoramento XRTec
4. **Log de transacoes** enviado pro painel XRTec

**Porta:** 5555 (HTTP, localhost)
**Stack:** Python 3.10+ / Flask / Flask-CORS / pywin32 / requests

---

## Arquitetura de Rede

```
[TOTEM/PC LOCAL]
  ├── Frontend React (navegador)         → porta 80 (via VPS)
  ├── print_server_elgin.py              → porta 5555 (localhost)
  ├── Stone AutoTEF.Service.exe          → porta 8000 (localhost)
  └── Impressora ELGIN i8 (USB)

[VPS - 31.97.151.194]
  ├── Backend Node.js (PM2)              → porta 5300
  ├── N8N (Docker)                       → porta 5678
  └── Tunel SSH reverso                  → porta 5555 (espelhada do PC)
```

### Tunel SSH Reverso

O cliente usa **rede domestica** (IP dinamico, sem porta aberta). Para o N8N na VPS conseguir chamar o print server no PC local, usamos um **tunel SSH reverso**:

```
PC Local (porta 5555) ← SSH reverso → VPS (porta 5555)
```

- O PC local conecta na VPS via SSH e "espelha" a porta 5555
- O N8N (que roda na VPS via Docker) chama `localhost:5555` e cai no PC do cliente
- A porta 5555 esta **bloqueada** no IP publico da VPS (iptables) - so acessivel pela rede Docker (172.21.0.0/16)
- Chave SSH ed25519 dedicada (sem senha, so pra tunel)
- Script `tunel_ssh.bat` mantem a conexao ativa com reconexao automatica (loop + ServerAliveInterval)

**Arquivo:** `tunel_ssh.bat`
```bat
ssh -R 0.0.0.0:5555:127.0.0.1:5555 root@31.97.151.194 -N -i "%USERPROFILE%\.ssh\tunel_shaka"
    -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes
```

---

## Fluxo de Pagamento (Maquininha)

### Toggle no Admin

O dono controla se o pagamento na maquininha esta ativo ou nao via painel admin:
- `GET /api/config/pagamento-maquininha-status` → retorna `{ ativo: true/false }`
- `PUT /api/config/pagamento-maquininha-status` → altera (so admin autenticado)

Chave no banco: `pagamento_maquininha_ativo` (tabela configs no Supabase)

### Se maquininha ATIVA (pagamento no totem):

```
1. Cliente monta pedido no totem
2. Escolhe forma: CREDITO / DEBITO / VOUCHER / PIX
3. Se cartao → Frontend chama localhost:5555/tef/venda
4. Print server chama Stone localhost:8000/api/Pay
5. Cliente aproxima/insere cartao na maquininha
6. Stone responde aprovado/negado
7. Se APROVADO → Frontend cria pedido no backend (POST /api/orders)
8. Backend cria pedido → dispara webhook N8N
9. N8N chama print server (via tunel SSH) → imprime comanda
10. COMANDA SO IMPRIME APOS PAGAMENTO CONFIRMADO
```

### Se maquininha DESATIVADA (pagamento no balcao):

```
1. Cliente monta pedido no totem
2. Escolhe "DINHEIRO/PIX" (unica opcao visivel)
3. Frontend cria pedido direto no backend
4. Backend cria pedido → dispara webhook N8N
5. N8N chama print server → imprime comanda
6. Cliente paga no balcao
```

**Resumo:** A comanda so imprime depois do pagamento aprovado (quando maquininha ativa). Se desativada, imprime direto e o pagamento e no balcao.

---

## Fluxo de Impressao (N8N)

```
Backend cria pedido
  → Webhook N8N (POST)
  → N8N formata dados da comanda
  → N8N chama POST http://localhost:5555/print (via tunel SSH)
  → Print server recebe JSON com dados do pedido
  → Formata em comandos ESC/POS
  → Envia RAW pra impressora via win32print
  → Impressora ELGIN i8 imprime a comanda
```

### Dados da comanda (JSON enviado pelo N8N):
```json
{
  "codigo": "SHAKA-001",
  "numero_pedido": "#20260405-123",
  "data_hora": "05/04/2026, 14:30:00",
  "telefone_raw": "PAGER42",
  "nome_cliente": "Joao",
  "valor_total": 45.90,
  "itens": [
    {
      "quantidade": 1,
      "nome": "X-Bacon",
      "ponto_carne": "ao ponto",
      "batata_frita": true,
      "adicionais": [{"nome": "Cheddar", "preco": 5.00}],
      "observacoes": "Sem cebola"
    }
  ],
  "observacoes_pedido": "Mesa 3"
}
```

---

## TEF - Stone AutoTEF Slim

### Integracao

O print server atua como **proxy** entre o frontend e a maquininha Stone:

```
Frontend → POST localhost:5555/tef/venda → Print Server → POST localhost:8000/api/Pay → Stone
```

O frontend NAO fala direto com a Stone. Sempre passa pelo print server.

### Endpoints TEF

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/tef/status` | Verifica se maquininha esta online |
| POST | `/tef/venda` | Realizar pagamento (credito/debito/voucher) |
| POST | `/tef/cancelar` | Estornar transacao (SO OPERADOR) |

### Payload de Venda (frontend → print server)
```json
{
  "valor": 45.79,
  "tipo": "credito",
  "pedido_id": "123"
}
```

### Payload pro Stone (print server → Stone API)
```json
{
  "amount": 45.79,
  "captureTransaction": true,
  "accountType": "credit",
  "installment": {"type": 1, "number": 0},
  "hasAlcoholicDrink": false
}
```

### Mapeamento de tipos
| Frontend | Stone accountType |
|----------|-------------------|
| credito | credit |
| debito | debit |
| voucher | voucher |

### Resposta aprovada (print server → frontend)
```json
{
  "sucesso": true,
  "mensagem": "Transacao Aprovada",
  "valorTransacao": 45.79,
  "tipo": "credito",
  "nsuCTF": "18562179802078",
  "codigoAprovacao": "123456",
  "bandeira": "MASTERCARD",
  "cartao": "************2341",
  "redeAdquirente": "STONE",
  "stone_atk": "18562179802078",
  "stone_pan_mask": "516292*********7053",
  "stone_transaction_type": "2"
}
```

### Resposta negada
```json
{
  "sucesso": false,
  "mensagem": "Transacao nao autorizada",
  "codigoErro": "DECL"
}
```

### Cancelamento/Estorno (so operador)
```json
{
  "valor": 45.79,
  "stone_atk": "18562179802078",
  "stone_transaction_type": "1",
  "stone_pan_mask": "516292*********7053"
}
```

---

## Impressao ESC/POS

### Impressora
- Modelo: ELGIN i8 (termica 80mm)
- Conexao: USB
- Driver: Windows RAW (win32print)
- Largura: 42 caracteres

### Comandos ESC/POS usados
| Comando | Funcao |
|---------|--------|
| `ESC @` | Inicializar impressora |
| `ESC a 1` | Centralizar texto |
| `ESC a 0` | Alinhar esquerda |
| `ESC E 1/0` | Negrito ON/OFF |
| `ESC ! 0x30` | Texto duplo (grande) |
| `ESC ! 0x00` | Texto normal |
| `GS V 0` | Cortar papel |
| `ESC d N` | Avancar N linhas |

### Codificacao
- Texto convertido para **CP850** (compativel com impressoras termicas)
- Caracteres especiais tratados com `errors='ignore'`

---

## Monitoramento (Painel XRTec)

### Heartbeat
A cada 60 segundos, o print server envia status pro painel:
```json
{
  "stone_code": "101903756",
  "print_server_online": true,
  "autotef_online": true,
  "printer_online": true
}
```
Endpoint: `POST https://painel.xrtec1.com/api/xrtec/heartbeat`

### Log de Transacoes
Toda transacao (aprovada, negada ou erro) e enviada pro painel em background (thread separada, nao bloqueia):
```json
{
  "stone_code": "101903756",
  "amount": 45.79,
  "type": "credit",
  "status": "approved",
  "brand": "MASTERCARD",
  "atk": "18562179802078",
  "error_code": "",
  "error_message": ""
}
```
Endpoint: `POST https://painel.xrtec1.com/api/xrtec/transaction-log`

---

## Configuracoes Importantes

```python
PRINTER_NAME = "ELGIN i8 (copy 1)"   # Nome exato no Windows
STONE_API_URL = "http://localhost:8000"  # AutoTEF Slim
STONE_CODE = "101903756"              # Stonecode do cliente
TEF_TIMEOUT = 120                     # 2 minutos pro cliente passar cartao
XRTEC_BACKEND_URL = "https://painel.xrtec1.com"
```

**Para cada novo cliente**, mudar:
- `PRINTER_NAME` → nome da impressora instalada no Windows
- `STONE_CODE` → Stonecode do cliente
- Chave SSH do tunel

---

## Como rodar

### No PC do cliente:
```bash
# 1. Iniciar AutoTEF Slim
cd C:\AutoTEFSlim && .\AutoTEF.Service.exe

# 2. Iniciar print server
python print_server_elgin.py

# 3. Iniciar tunel SSH (em outro terminal)
tunel_ssh.bat
```

### Dependencias:
```bash
pip install flask flask-cors pywin32 requests
```

---

## Seguranca

- Print server so aceita conexoes **locais** (localhost:5555)
- Tunel SSH com chave ed25519 (sem senha)
- Porta 5555 bloqueada no IP publico da VPS (iptables)
- So acessivel pela rede Docker (N8N) na VPS
- Chave da Woovi e Stone ficam no servidor, nunca no frontend
- Cancelamento/estorno so via admin autenticado
