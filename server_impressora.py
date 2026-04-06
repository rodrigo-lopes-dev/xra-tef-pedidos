#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor de Impressao + TEF - XRATec (ELGIN i8 + Stone AutoTEF Slim)
Impressao ESC/POS + Integracao TEF via REST API

Instalacao:
    pip install flask flask-cors pywin32 requests

Uso:
    python print_server_elgin.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import win32print
import win32api
import logging
from datetime import datetime
import json
import time
import requests


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURAÇÕES
# ═══════════════════════════════════════════════════════════════════════════════

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────────────────────────
# CONFIGURAÇÃO DE LOGS (console + arquivo com data)
# ─────────────────────────────────────────────────────────────────────────────────
import os
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

log_filename = os.path.join(LOG_DIR, f'print_server_{datetime.now().strftime("%Y-%m-%d")}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%d/%m/%Y %H:%M:%S',
    handlers=[
        logging.StreamHandler(),  # Console
        logging.FileHandler(log_filename, encoding='utf-8')  # Arquivo
    ]
)

# ─────────────────────────────────────────────────────────────────────────────────
# CONFIGURAÇÕES DA IMPRESSORA
# ─────────────────────────────────────────────────────────────────────────────────
PRINTER_NAME = "EPSON TM-T20 Receipt"
COMANDA_WIDTH = 42  # 42 caracteres para 80mm

# ─────────────────────────────────────────────────────────────────────────────────
# CONFIGURAÇÕES DO TEF (STONE AutoTEF Slim)
# ─────────────────────────────────────────────────────────────────────────────────
TEF_MOCK_MODE = False  # PRODUCAO - Maquininha conectada
STONE_API_URL = "http://localhost:8000"  # AutoTEF Slim REST API
STONE_CODE = ""  # Configurar com o Stonecode do cliente
STONE_PARTNER_NAME = "XRA AutoPay"
TEF_TIMEOUT = 120  # Timeout em segundos (2 minutos para cliente passar cartão)

# ─────────────────────────────────────────────────────────────────────────────────
# CONFIGURAÇÕES DO PAINEL XRTEC (log de transações + heartbeat)
# ─────────────────────────────────────────────────────────────────────────────────
XRTEC_BACKEND_URL = "https://painel.xrtec1.com"  # Backend XRTec (painel separado)
XRTEC_LOG_ENABLED = True  # Enviar logs pro painel XRTec


# ═══════════════════════════════════════════════════════════════════════════════
# COMANDOS ESC/POS
# ═══════════════════════════════════════════════════════════════════════════════

ESC = b'\x1b'
INIT = ESC + b'@'              # Inicializar
CENTER = ESC + b'a\x01'        # Centralizar
LEFT = ESC + b'a\x00'          # Esquerda
BOLD_ON = ESC + b'E\x01'       # Negrito ON
BOLD_OFF = ESC + b'E\x00'      # Negrito OFF
DOUBLE = ESC + b'!\x30'        # Texto duplo
NORMAL = ESC + b'!\x00'        # Texto normal
CUT = b'\x1d\x56\x00'          # Cortar papel
FEED = lambda n: ESC + b'd' + bytes([n])  # Avançar linhas


# ═══════════════════════════════════════════════════════════════════════════════
# CLASSE TEF CLIENT (STONE AutoTEF Slim - REST API)
# ═══════════════════════════════════════════════════════════════════════════════

class StoneTEFClient:
    """Cliente TEF Stone via AutoTEF Slim REST API (HTTP localhost:8000)"""

    def __init__(self, base_url=STONE_API_URL):
        self.base_url = base_url
        self.activated = False

    def healthcheck(self):
        """Verifica se o AutoTEF Slim está rodando"""
        try:
            resp = requests.get(f"{self.base_url}/api/Healthcheck", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                self.activated = True
                logging.info(f"[TEF] Healthcheck OK - StoneCode: {data.get('stoneCode')}, Porta: {data.get('connectionName')}")
                return data
            else:
                logging.warning(f"[TEF] Healthcheck retornou {resp.status_code}")
                return None
        except requests.ConnectionError:
            logging.error("[TEF] AutoTEF Slim nao esta rodando (porta 8000)")
            return None
        except Exception as e:
            logging.error(f"[TEF] Erro no healthcheck: {e}")
            return None

    def activate(self):
        """Ativa o Stonecode e inicializa o pinpad"""
        try:
            payload = {
                "stoneCode": STONE_CODE,
                "partnerName": STONE_PARTNER_NAME
            }
            logging.info(f"[TEF] Ativando StoneCode {STONE_CODE}...")
            resp = requests.post(f"{self.base_url}/api/Activate", json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                self.activated = True
                logging.info(f"[TEF] Ativado - Porta: {data.get('connectionName')}, Serial: {data.get('serialNumber')}")
                return data
            else:
                logging.error(f"[TEF] Falha na ativacao: {resp.status_code} - {resp.text}")
                return None
        except Exception as e:
            logging.error(f"[TEF] Erro na ativacao: {e}")
            return None

    def pay(self, valor_reais, account_type="credit"):
        """
        Realizar pagamento via Stone AutoTEF Slim
        account_type: "credit", "debit", "voucher", "undefined"
        Retorna resposta da Stone ou erro
        """
        payload = {
            "amount": valor_reais,
            "captureTransaction": True,
            "accountType": account_type,
            "installment": {"type": 1, "number": 0},
            "hasAlcoholicDrink": False
        }

        logging.info(f"[TEF] Stone Pay: R$ {valor_reais:.2f} ({account_type})")
        logging.info(f"[TEF] Payload: {json.dumps(payload)}")

        try:
            resp = requests.post(
                f"{self.base_url}/api/Pay",
                json=payload,
                timeout=TEF_TIMEOUT
            )

            data = resp.json()
            logging.info(f"[TEF] Stone Response ({resp.status_code}): {json.dumps(data)[:300]}")
            return data, resp.status_code

        except requests.Timeout:
            logging.error("[TEF] Timeout - cliente nao passou o cartao em 2 minutos")
            return {"responseCode": "TIMEOUT", "responseReason": "Timeout", "messageDisplay": "Tempo esgotado"}, 408
        except requests.ConnectionError:
            logging.error("[TEF] AutoTEF Slim nao esta rodando")
            return {"responseCode": "OFFLINE", "responseReason": "Connection refused", "messageDisplay": "Maquininha indisponivel"}, 503
        except Exception as e:
            logging.error(f"[TEF] Erro: {e}")
            return {"responseCode": "ERROR", "responseReason": str(e), "messageDisplay": str(e)}, 500

    def cancel(self, atk, valor_reais, transaction_type, pan_mask):
        """
        Estornar transação (SÓ OPERADOR - não autoatendimento)
        transaction_type: "1" = débito, "2" = crédito
        """
        payload = {
            "acquirerTransactionKey": atk,
            "amount": valor_reais,
            "transactionType": transaction_type,
            "panMask": pan_mask
        }

        logging.info(f"[TEF] Stone Cancel: ATK={atk}, R$ {valor_reais:.2f}")

        try:
            resp = requests.post(
                f"{self.base_url}/api/Cancel/",
                json=payload,
                timeout=TEF_TIMEOUT
            )
            data = resp.json()
            logging.info(f"[TEF] Stone Cancel Response: {json.dumps(data)}")
            return data, resp.status_code
        except Exception as e:
            logging.error(f"[TEF] Erro no cancelamento: {e}")
            return {"responseCode": "ERROR", "responseReason": str(e)}, 500


# Instância global do cliente TEF Stone
tef_client = StoneTEFClient()


# ═══════════════════════════════════════════════════════════════════════════════
# FUNÇÕES XRTEC (log de transações + heartbeat)
# ═══════════════════════════════════════════════════════════════════════════════

import threading

def enviar_log_transacao(log_data):
    """Envia log de transação pro backend XRTec (em background, não bloqueia)"""
    if not XRTEC_LOG_ENABLED:
        return

    def _send():
        try:
            resp = requests.post(
                f"{XRTEC_BACKEND_URL}/api/xrtec/transaction-log",
                json=log_data,
                timeout=10
            )
            if resp.status_code == 201:
                logging.info(f'[XRTEC] Log salvo - {log_data.get("status")} R$ {log_data.get("amount")}')
            else:
                logging.warning(f'[XRTEC] Erro ao salvar log: {resp.status_code}')
        except Exception as e:
            logging.warning(f'[XRTEC] Falha ao enviar log (backend offline?): {e}')

    # Envia em thread separada pra não atrasar a resposta pro frontend
    threading.Thread(target=_send, daemon=True).start()


def enviar_heartbeat():
    """Envia heartbeat pro backend XRTec"""
    if not XRTEC_LOG_ENABLED:
        return

    def _send():
        try:
            # Verificar status dos serviços
            autotef_online = False
            try:
                r = requests.get(f"{STONE_API_URL}/api/Healthcheck", timeout=3)
                autotef_online = r.status_code == 200
            except:
                pass

            printer_online = False
            try:
                import win32print
                printers = [p[2] for p in win32print.EnumPrinters(2)]
                printer_online = PRINTER_NAME in printers
            except:
                pass

            payload = {
                "stone_code": STONE_CODE,
                "print_server_online": True,
                "autotef_online": autotef_online,
                "printer_online": printer_online,
            }

            resp = requests.post(
                f"{XRTEC_BACKEND_URL}/api/xrtec/heartbeat",
                json=payload,
                timeout=5
            )
            if resp.status_code == 200:
                logging.debug('[XRTEC] Heartbeat enviado')
        except Exception as e:
            logging.debug(f'[XRTEC] Falha heartbeat: {e}')

    threading.Thread(target=_send, daemon=True).start()


def iniciar_heartbeat_periodico(intervalo=60):
    """Envia heartbeat a cada N segundos"""
    def _loop():
        while True:
            enviar_heartbeat()
            time.sleep(intervalo)

    t = threading.Thread(target=_loop, daemon=True)
    t.start()
    logging.info(f'[XRTEC] Heartbeat periodico iniciado (a cada {intervalo}s)')


# ═══════════════════════════════════════════════════════════════════════════════
# FUNÇÕES DE FORMATAÇÃO (IMPRESSÃO)
# ═══════════════════════════════════════════════════════════════════════════════

def centralizar(texto, largura=COMANDA_WIDTH):
    """Centraliza texto"""
    return texto.center(largura)

def linha_sep(char='=', largura=COMANDA_WIDTH):
    """Linha separadora"""
    return char * largura

def formatar_comanda_escpos(data):
    """Formata comanda em comandos ESC/POS (payload do XRA AutoPay)"""
    cmd = bytearray()

    # Inicializar
    cmd.extend(INIT)
    cmd.extend(FEED(1))

    # Cabeçalho
    cmd.extend(CENTER)
    cmd.extend(linha_sep('=').encode('cp850', errors='ignore') + b'\n')
    cmd.extend(DOUBLE)
    cmd.extend(BOLD_ON)
    cmd.extend('XRA AutoPay\n'.encode('cp850', errors='ignore'))
    cmd.extend(NORMAL)
    cmd.extend(BOLD_OFF)
    cmd.extend('COMANDA DE PEDIDO\n'.encode('cp850', errors='ignore'))
    cmd.extend(linha_sep('=').encode('cp850', errors='ignore') + b'\n')
    cmd.extend(FEED(1))

    # Código da comanda - DESTAQUE
    cmd.extend(DOUBLE)
    cmd.extend(BOLD_ON)
    cmd.extend(f'*** {data["codigo"]} ***\n'.encode('cp850', errors='ignore'))
    cmd.extend(NORMAL)
    cmd.extend(BOLD_OFF)
    cmd.extend(FEED(1))

    # Informações do pedido
    cmd.extend(LEFT)

    numero_pedido = data["numero_pedido"]
    partes = numero_pedido.split('-')
    numero_simples = partes[-1] if len(partes) > 1 else numero_pedido.replace('#', '')

    cmd.extend(f'PEDIDO #{numero_simples}\n'.encode('cp850', errors='ignore'))
    cmd.extend(f'Data: {data["data_hora"]}\n'.encode('cp850', errors='ignore'))

    # Tipo de pagamento
    tipo_pag = data.get("tipo_pagamento", "")
    if tipo_pag:
        cmd.extend(f'Pagamento: {tipo_pag.upper()}\n'.encode('cp850', errors='ignore'))

    cmd.extend(FEED(1))

    # NOME DO CLIENTE - GRANDE e DESTAQUE
    nome_cliente = data.get("nome_cliente", "")
    if nome_cliente:
        cmd.extend(DOUBLE)
        cmd.extend(BOLD_ON)
        cmd.extend(f'CLIENTE: {nome_cliente}\n'.encode('cp850', errors='ignore'))
        cmd.extend(NORMAL)
        cmd.extend(BOLD_OFF)
        cmd.extend(FEED(1))

    # PAGER - GRANDE e DESTAQUE
    numero_pager = data.get("numero_pager", "")
    if numero_pager:
        cmd.extend(DOUBLE)
        cmd.extend(BOLD_ON)
        cmd.extend(f'PAGER: #{numero_pager}\n'.encode('cp850', errors='ignore'))
        cmd.extend(NORMAL)
        cmd.extend(BOLD_OFF)
        cmd.extend(FEED(1))

    cmd.extend(linha_sep('-').encode('cp850', errors='ignore') + b'\n')
    cmd.extend(FEED(1))

    # Itens
    for item in data['itens']:
        qtd = item.get('quantidade', 1) or 1
        nome_item = item.get('nome', 'Item') or 'Item'
        linha = f'{qtd}x {nome_item}\n'
        cmd.extend(DOUBLE)
        cmd.extend(BOLD_ON)
        cmd.extend(linha.encode('cp850', errors='ignore'))
        cmd.extend(NORMAL)
        cmd.extend(BOLD_OFF)

        # Preco unitario
        preco_unit = item.get('preco_unitario', 0)
        if preco_unit:
            preco_fmt = f'R$ {float(preco_unit):.2f}'.replace('.', ',')
            cmd.extend(f'   {preco_fmt} cada\n'.encode('cp850', errors='ignore'))

        # Adicionais
        adicionais = item.get('adicionais') or []
        if adicionais and len(adicionais) > 0:
            cmd.extend(BOLD_ON)
            cmd.extend('   ADICIONAIS:\n'.encode('cp850', errors='ignore'))
            cmd.extend(BOLD_OFF)
            for ad in adicionais:
                nome_ad = ad.get('nome', 'Adicional') if isinstance(ad, dict) else str(ad)
                preco = ad.get('preco', 0) if isinstance(ad, dict) else 0
                preco_fmt = f'R$ {float(preco):.2f}'.replace('.', ',')
                cmd.extend(f'    + {nome_ad} ({preco_fmt})\n'.encode('cp850', errors='ignore'))

        # Observacoes do item
        obs = item.get('observacoes')
        if obs:
            cmd.extend(BOLD_ON)
            cmd.extend('   OBS:\n'.encode('cp850', errors='ignore'))
            cmd.extend(BOLD_OFF)
            cmd.extend(f'   {obs}\n'.encode('cp850', errors='ignore'))

        cmd.extend(FEED(1))

    # Observações gerais do pedido
    if data.get('observacoes_pedido'):
        cmd.extend(linha_sep('-').encode('cp850', errors='ignore') + b'\n')
        cmd.extend(BOLD_ON)
        cmd.extend('OBSERVACOES DO PEDIDO:\n'.encode('cp850', errors='ignore'))
        cmd.extend(BOLD_OFF)
        cmd.extend(f'{data["observacoes_pedido"]}\n'.encode('cp850', errors='ignore'))
        cmd.extend(FEED(1))

    # Total
    cmd.extend(linha_sep('=').encode('cp850', errors='ignore') + b'\n')
    cmd.extend(CENTER)
    cmd.extend(DOUBLE)
    cmd.extend(BOLD_ON)
    valor = f'R$ {data["valor_total"]:.2f}'.replace('.', ',')
    cmd.extend(f'TOTAL: {valor}\n'.encode('cp850', errors='ignore'))
    cmd.extend(NORMAL)
    cmd.extend(BOLD_OFF)
    cmd.extend(linha_sep('=').encode('cp850', errors='ignore') + b'\n')
    cmd.extend(FEED(1))
    cmd.extend(BOLD_ON)
    cmd.extend('Obrigado pela preferencia!\n'.encode('cp850', errors='ignore'))
    cmd.extend(BOLD_OFF)
    cmd.extend('XRA Shaka - Sistema PDV\n'.encode('cp850', errors='ignore'))
    cmd.extend(FEED(4))
    
    # Cortar papel
    cmd.extend(CUT)
    
    return bytes(cmd)


def formatar_cupom_tef_escpos(cupom_linhas, tipo="estabelecimento"):
    """Formata cupom TEF em comandos ESC/POS"""
    cmd = bytearray()
    
    # Inicializar
    cmd.extend(INIT)
    cmd.extend(FEED(1))
    
    # Cabeçalho
    cmd.extend(CENTER)
    cmd.extend(BOLD_ON)
    if tipo == "estabelecimento":
        cmd.extend('VIA ESTABELECIMENTO\n'.encode('cp850', errors='ignore'))
    else:
        cmd.extend('VIA CLIENTE\n'.encode('cp850', errors='ignore'))
    cmd.extend(BOLD_OFF)
    cmd.extend(FEED(1))
    
    # Imprimir linhas do cupom
    cmd.extend(LEFT)
    for linha_obj in cupom_linhas:
        linha = linha_obj.get("linha", "")
        cmd.extend(f'{linha}\n'.encode('cp850', errors='ignore'))
    
    cmd.extend(FEED(4))
    cmd.extend(CUT)
    
    return bytes(cmd)


# ═══════════════════════════════════════════════════════════════════════════════
# FUNÇÕES DE IMPRESSÃO
# ═══════════════════════════════════════════════════════════════════════════════

def imprimir_raw(dados_raw):
    """Imprime dados RAW direto na impressora"""
    try:
        # Abrir impressora
        hPrinter = win32print.OpenPrinter(PRINTER_NAME)
        
        try:
            # Iniciar documento
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Comanda", None, "RAW"))
            
            try:
                # Iniciar página
                win32print.StartPagePrinter(hPrinter)
                
                # Enviar dados
                win32print.WritePrinter(hPrinter, dados_raw)
                
                # Finalizar página
                win32print.EndPagePrinter(hPrinter)
                
            finally:
                # Finalizar documento
                win32print.EndDocPrinter(hPrinter)
                
        finally:
            # Fechar impressora
            win32print.ClosePrinter(hPrinter)
        
        logging.info(f'[PRINT] Dados enviados ({len(dados_raw)} bytes)')
        return True
        
    except Exception as e:
        logging.error(f'[PRINT] Erro ao imprimir: {e}')
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - IMPRESSÃO
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health_check():
    """Health check"""
    try:
        # Verificar se impressora existe
        printers = [printer[2] for printer in win32print.EnumPrinters(2)]
        impressora_ok = PRINTER_NAME in printers
        
        return jsonify({
            'status': 'online' if impressora_ok else 'impressora_nao_encontrada',
            'printer': PRINTER_NAME,
            'printers_disponiveis': printers,
            'tef_mode': 'MOCK' if TEF_MOCK_MODE else 'PRODUCAO',
            'tef_websocket': TEF_WEBSOCKET_URL,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/print', methods=['POST'])
def print_comanda():
    """Endpoint principal"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'JSON vazio'}), 400
        
        # Validar
        campos = ['codigo', 'numero_pedido', 'valor_total', 'itens']
        for campo in campos:
            if campo not in data:
                return jsonify({'error': f'Campo ausente: {campo}'}), 400
        
        # LOG: Ver dados recebidos
        logging.info(f'[PRINT] Comanda: {data["codigo"]} ({data["numero_pedido"]})')
        logging.debug(f'[DEBUG] Itens recebidos: {data.get("itens")}')
        
        # Formatar e imprimir
        comandos = formatar_comanda_escpos(data)
        sucesso = imprimir_raw(comandos)
        
        if sucesso:
            logging.info(f'[PRINT] Comanda impressa: {data["codigo"]}')
            return jsonify({
                'status': 'success',
                'codigo': data['codigo'],
                'numero_pedido': data['numero_pedido'],
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            return jsonify({'error': 'Falha na impressão'}), 500
            
    except Exception as e:
        logging.error(f'[PRINT] Erro: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/test', methods=['GET'])
def test_print():
    """Teste"""
    try:
        dados = {
            'codigo': 'TEST01',
            'numero_pedido': '#20251016-999',
            'data_hora': datetime.now().strftime('%d/%m/%Y, %H:%M:%S'),
            'telefone_raw': 'PAGER1234',  # Exemplo de pager
            'telefone_ultimos4': '1234',
            'valor_total': 99.90,
            'itens': [
                {
                    'quantidade': 1,
                    'nome': 'TESTE DE IMPRESSAO',
                    'ponto_carne': 'ao ponto',
                    'batata_frita': True,
                    'observacoes': 'Este e um teste',
                    'adicionais': [
                        {'nome': 'Bacon', 'preco': 6.00},
                        {'nome': 'Cheddar', 'preco': 5.00}
                    ]
                }
            ],
            'observacoes_pedido': 'Comanda de teste'
        }
        
        comandos = formatar_comanda_escpos(dados)
        sucesso = imprimir_raw(comandos)
        
        if sucesso:
            return jsonify({'status': 'Teste enviado!'}), 200
        else:
            return jsonify({'error': 'Falha no teste'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - TEF (STONE AutoTEF Slim)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/tef/status', methods=['GET'])
def tef_status():
    """Status do TEF Stone"""
    health = tef_client.healthcheck()
    if health:
        return jsonify({
            'status': 'online',
            'provider': 'Stone AutoTEF Slim',
            'stoneCode': health.get('stoneCode', ''),
            'connectionName': health.get('connectionName', ''),
            'timestamp': datetime.now().isoformat()
        }), 200
    else:
        return jsonify({
            'status': 'offline',
            'provider': 'Stone AutoTEF Slim',
            'error': 'AutoTEF Slim nao esta rodando na porta 8000',
            'timestamp': datetime.now().isoformat()
        }), 503


@app.route('/tef/venda', methods=['POST'])
def tef_venda():
    """
    Realizar venda no cartao via Stone AutoTEF Slim
    Mesma interface do frontend - nao precisa mudar nada no front

    Body JSON:
    {
        "valor": 45.79,           // Valor em reais (obrigatorio)
        "tipo": "credito",        // "credito", "debito", "voucher" (padrao: credito)
        "pedido_id": "123",       // ID do pedido (opcional)
    }
    """
    try:
        data = request.json

        if not data or 'valor' not in data:
            return jsonify({'error': 'Campo "valor" e obrigatorio'}), 400

        valor_reais = float(data['valor'])
        tipo = data.get('tipo', 'credito').lower()
        pedido_id = data.get('pedido_id')

        logging.info(f'[TEF] Venda Stone: R$ {valor_reais:.2f} ({tipo}) - Pedido: {pedido_id}')

        # Mapear tipo do frontend para accountType da Stone
        tipo_map = {
            'credito': 'credit',
            'debito': 'debit',
            'voucher': 'voucher',
        }
        account_type = tipo_map.get(tipo, 'credit')

        # Chamar Stone AutoTEF Slim
        response, status_code = tef_client.pay(valor_reais, account_type)

        # Stone retorna brandName no nível raiz quando aprovada
        sucesso = 'brandName' in response and 'receipt' in response
        receipt = response.get('receipt', {})
        card = response.get('card', {})

        # Preparar resposta compatível com o frontend existente
        result = {
            'sucesso': sucesso,
            'mensagem': receipt.get('messageDisplay', response.get('messageDisplay', 'Sem mensagem')),
            'valorTransacao': valor_reais,
            'tipo': tipo,
            'timestamp': datetime.now().isoformat()
        }

        if sucesso:
            # Dados da transação aprovada
            result.update({
                'nsuCTF': receipt.get('acquirerTransactionKey', ''),
                'codigoAprovacao': receipt.get('authorisationCode', ''),
                'bandeira': receipt.get('brandName', card.get('brandName', '')),
                'cartao': receipt.get('maskedPrimaryAccountNumber', ''),
                'dataTransacao': receipt.get('transactionDateTime', ''),
                'redeAdquirente': 'STONE',
                'cupom_impresso': False,  # Autoatendimento: nao imprime cupom
                # Dados para eventual estorno (salvar no banco)
                'stone_atk': receipt.get('acquirerTransactionKey', ''),
                'stone_pan_mask': card.get('maskedPan', ''),
                'stone_transaction_type': str(receipt.get('transactionType', '')),
                'stone_card_reading': receipt.get('cardReadingType', ''),
                # Cupons como texto (para log/rastreabilidade)
                'cupomEstabelecimento': receipt.get('merchantVia', ''),
                'cupomCliente': receipt.get('clientVia', ''),
            })
            logging.info(f'[TEF] Aprovada - ATK: {result["stone_atk"]} - {result["bandeira"]} - R$ {valor_reais:.2f}')

            # Enviar log pro painel XRTec (em background)
            enviar_log_transacao({
                'stone_code': STONE_CODE,
                'amount': valor_reais,
                'type': account_type,
                'status': 'approved',
                'brand': result.get('bandeira', ''),
                'atk': result.get('stone_atk', ''),
                'authorization_code': result.get('codigoAprovacao', ''),
                'masked_card': result.get('cartao', ''),
                'card_reading': result.get('stone_card_reading', ''),
                'pedido_id': pedido_id,
                'response_raw': response,
            })

            return jsonify(result), 200
        else:
            # Transação negada
            result.update({
                'codigoErro': response.get('responseCode', response.get('responseReason', '')),
                'nsuCTF': '',
                'bandeira': '',
                'cartao': '',
            })
            logging.warning(f'[TEF] Negada - {response.get("responseCode", "")} - {result["mensagem"]}')

            # Enviar log de negada pro painel XRTec
            enviar_log_transacao({
                'stone_code': STONE_CODE,
                'amount': valor_reais,
                'type': account_type,
                'status': 'denied',
                'error_code': response.get('responseCode', ''),
                'error_message': result.get('mensagem', ''),
                'pedido_id': pedido_id,
                'response_raw': response,
            })

            return jsonify(result), 400

    except Exception as e:
        logging.error(f'[TEF] Erro: {e}')

        # Enviar log de erro pro painel XRTec
        enviar_log_transacao({
            'stone_code': STONE_CODE,
            'amount': valor_reais if 'valor_reais' in dir() else 0,
            'type': account_type if 'account_type' in dir() else 'unknown',
            'status': 'error',
            'error_message': str(e),
        })

        return jsonify({'error': str(e), 'sucesso': False}), 500


@app.route('/tef/cancelar', methods=['POST'])
def tef_cancelar():
    """
    Estornar transação Stone (SÓ OPERADOR - não autoatendimento)

    Body JSON:
    {
        "valor": 45.79,
        "stone_atk": "17961083310875",
        "stone_transaction_type": "1",
        "stone_pan_mask": "516292*********7053"
    }
    """
    try:
        data = request.json

        campos_obrigatorios = ['valor', 'stone_atk', 'stone_transaction_type', 'stone_pan_mask']
        for campo in campos_obrigatorios:
            if campo not in data:
                return jsonify({'error': f'Campo "{campo}" e obrigatorio'}), 400

        valor_reais = float(data['valor'])
        atk = data['stone_atk']
        transaction_type = data['stone_transaction_type']
        pan_mask = data['stone_pan_mask']

        logging.info(f'[TEF] Estorno Stone: R$ {valor_reais:.2f} - ATK: {atk}')

        response, status_code = tef_client.cancel(atk, valor_reais, transaction_type, pan_mask)

        response_code = response.get('responseCode', '')
        sucesso = status_code == 200 and response_code != 'DECL'

        result = {
            'sucesso': sucesso,
            'responseCode': response_code,
            'responseReason': response.get('responseReason', ''),
            'timestamp': datetime.now().isoformat()
        }

        if sucesso:
            logging.info(f'[TEF] Estorno aprovado - ATK: {atk}')
        else:
            logging.warning(f'[TEF] Estorno negado - {response_code} - {response.get("responseReason", "")}')

        return jsonify(result), 200 if sucesso else 400

    except Exception as e:
        logging.error(f'[TEF] Erro no estorno: {e}')
        return jsonify({'error': str(e), 'sucesso': False}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('=' * 60)
    print('  SERVIDOR DE IMPRESSAO + TEF - XRA Shaka')
    print('  ELGIN i8 (ESC/POS) + STONE AutoTEF Slim (REST)')
    print('=' * 60)
    print(f'Impressora: {PRINTER_NAME}')
    print(f'Porta HTTP: 5556')
    print('')
    print(f'TEF Provider: STONE AutoTEF Slim')
    print(f'TEF API: {STONE_API_URL}')
    print(f'StoneCode: {STONE_CODE}')
    print('')

    # Verificar se AutoTEF Slim esta rodando
    health = tef_client.healthcheck()
    if health:
        print(f'TEF Status: ONLINE - Porta: {health.get("connectionName", "?")}')
    else:
        print('TEF Status: OFFLINE - Inicie o AutoTEF.Service.exe')

    print('')
    print('Endpoints IMPRESSAO:')
    print('  GET  /health       - Status geral')
    print('  POST /print        - Imprimir comanda')
    print('  GET  /test         - Teste de impressao')
    print('')
    print('Endpoints TEF (Stone):')
    print('  GET  /tef/status   - Status do TEF Stone')
    print('  POST /tef/venda    - Venda cartao (credito/debito/voucher)')
    print('  POST /tef/cancelar - Estornar transacao (so operador)')
    print('')
    print('Aguardando requisicoes...')
    print('=' * 60)
    print('')

    # Iniciar heartbeat periodico pro painel XRTec (a cada 60 segundos)
    iniciar_heartbeat_periodico(60)

    app.run(host='0.0.0.0', port=5556, debug=False, threaded=True)
