import axios from 'axios';

interface CpfResult {
  sucesso: boolean;
  cpf: string;
  nome: string;
  nomeUpper: string;
  genero: string;
  dataNascimento: string;
  dia: number;
  mes: number;
  ano: number;
  erro?: string;
}

const CPFHUB_API_URL = 'https://api.cpfhub.io';
const CPFHUB_API_KEY = process.env.CPFHUB_API_KEY || '';

/**
 * Consulta CPF na API CPFHub
 * Retorna nome, data de nascimento e gênero
 */
export async function consultarCpf(cpf: string): Promise<CpfResult> {
  // Limpar CPF (só números)
  const cpfLimpo = cpf.replace(/\D/g, '');

  if (cpfLimpo.length !== 11) {
    return { sucesso: false, cpf: cpfLimpo, nome: '', nomeUpper: '', genero: '', dataNascimento: '', dia: 0, mes: 0, ano: 0, erro: 'CPF deve ter 11 digitos' };
  }

  if (!CPFHUB_API_KEY) {
    console.warn('[CPFHub] API Key nao configurada, retornando mock');
    return {
      sucesso: true,
      cpf: cpfLimpo,
      nome: 'Cliente Teste',
      nomeUpper: 'CLIENTE TESTE',
      genero: 'M',
      dataNascimento: '01/01/1990',
      dia: 1, mes: 1, ano: 1990
    };
  }

  try {
    const response = await axios.get(`${CPFHUB_API_URL}/cpf/${cpfLimpo}`, {
      headers: {
        'x-api-key': CPFHUB_API_KEY,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const data = response.data;

    if (!data.success || !data.data) {
      return { sucesso: false, cpf: cpfLimpo, nome: '', nomeUpper: '', genero: '', dataNascimento: '', dia: 0, mes: 0, ano: 0, erro: 'CPF nao encontrado' };
    }

    return {
      sucesso: true,
      cpf: data.data.cpf,
      nome: data.data.name,
      nomeUpper: data.data.nameUpper,
      genero: data.data.gender,
      dataNascimento: data.data.birthDate,
      dia: data.data.day,
      mes: data.data.month,
      ano: data.data.year
    };
  } catch (error: any) {
    const msg = error.response?.data?.error?.message || error.message || 'Erro ao consultar CPF';
    console.error('[CPFHub] Erro:', msg);
    return { sucesso: false, cpf: cpfLimpo, nome: '', nomeUpper: '', genero: '', dataNascimento: '', dia: 0, mes: 0, ano: 0, erro: msg };
  }
}
