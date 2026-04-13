/**
 * Validador robusto de telefone brasileiro
 * Aceita celular (9 dígitos) com DDD válido
 */

// DDDs válidos no Brasil
const DDDS_VALIDOS = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24, // RJ
  27, 28, // ES
  31, 32, 33, 34, 35, 37, 38, // MG
  41, 42, 43, 44, 45, 46, // PR
  47, 48, 49, // SC
  51, 53, 54, 55, // RS
  61, // DF
  62, 64, // GO
  63, // TO
  65, 66, // MT
  67, // MS
  68, // AC
  69, // RO
  71, 73, 74, 75, 77, // BA
  79, // SE
  81, 87, // PE
  82, // AL
  83, // PB
  84, // RN
  85, 88, // CE
  86, 89, // PI
  91, 93, 94, // PA
  92, 97, // AM
  95, // RR
  96, // AP
  98, 99, // MA
];

export function validarTelefone(telefone: string): { valido: boolean; formatado: string; erro?: string } {
  // Limpar (só números)
  const limpo = telefone.replace(/\D/g, '');

  // Remover +55 se tiver
  const sem55 = limpo.startsWith('55') && limpo.length >= 12 ? limpo.slice(2) : limpo;

  // Deve ter 11 dígitos (DDD + 9 + número)
  if (sem55.length !== 11) {
    return { valido: false, formatado: '', erro: 'Telefone deve ter DDD + 9 digitos (ex: 11987654321)' };
  }

  // Extrair DDD
  const ddd = parseInt(sem55.slice(0, 2));
  if (!DDDS_VALIDOS.includes(ddd)) {
    return { valido: false, formatado: '', erro: `DDD ${ddd} invalido` };
  }

  // Celular deve começar com 9
  if (sem55[2] !== '9') {
    return { valido: false, formatado: '', erro: 'Celular deve comecar com 9' };
  }

  // Não pode ser tudo igual (99999999999)
  if (/^(\d)\1+$/.test(sem55)) {
    return { valido: false, formatado: '', erro: 'Numero invalido' };
  }

  // Não pode ter sequência óbvia
  if (sem55.includes('123456789') || sem55.includes('987654321')) {
    return { valido: false, formatado: '', erro: 'Numero invalido' };
  }

  return {
    valido: true,
    formatado: sem55 // 11 dígitos limpos
  };
}
