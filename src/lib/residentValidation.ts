// Validação rigorosa de moradores para importação em massa

// DDDs válidos do Brasil (oficiais Anatel)
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export interface PhoneValidationResult {
  ok: boolean;
  normalized?: string; // E.164: +55XXXXXXXXXXX
  error?: string;
  warning?: string;
}

export function validateBrazilianMobile(raw: string): PhoneValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Telefone vazio' };
  }
  // Remover tudo que não é dígito
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return { ok: false, error: 'Telefone vazio' };

  // Remover prefixo 55 se já tiver
  if (digits.length === 13 && digits.startsWith('55')) {
    digits = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith('55')) {
    // 55 + 10 dígitos => sem nono dígito
    digits = digits.slice(2);
  }

  if (digits.length < 11) {
    return { ok: false, error: 'Telefone incompleto (menos de 11 dígitos)' };
  }
  if (digits.length > 11) {
    return { ok: false, error: 'Telefone com dígitos demais' };
  }

  const ddd = parseInt(digits.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) {
    return { ok: false, error: `DDD ${digits.slice(0, 2)} inválido` };
  }

  const ninth = digits[2];
  if (ninth !== '9') {
    return { ok: false, error: 'Falta nono dígito (celular deve começar com 9)' };
  }

  // Verificar sequências triviais (todos iguais ou padrões óbvios)
  const subscriber = digits.slice(2); // 9 dígitos
  if (/^(\d)\1+$/.test(subscriber)) {
    return { ok: false, error: 'Número repetitivo inválido' };
  }
  if (/^9(\d)\1{7}$/.test(subscriber)) {
    return { ok: true, normalized: `+55${digits}`, warning: 'Número repetitivo, confirme' };
  }

  return { ok: true, normalized: `+55${digits}` };
}

export interface NameValidationResult {
  ok: boolean;
  normalized?: string;
  error?: string;
  suspicious?: string[]; // razões para revisão manual
}

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;

export function validateName(raw: string): NameValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Nome vazio' };
  }
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 3) return { ok: false, error: 'Nome muito curto (< 3 chars)' };
  if (trimmed.length > 100) return { ok: false, error: 'Nome muito longo (> 100 chars)' };

  // Não pode ter dígitos -> erro bloqueante? plano diz suspeito
  // Caracteres permitidos: letras, espaço, hífen, apóstrofo
  if (/\d/.test(trimmed)) {
    // dígitos => suspeito (não erro)
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return { ok: false, error: 'Nome precisa ter sobrenome' };
    return { ok: true, normalized: trimmed, suspicious: ['Nome contém dígitos'] };
  }

  if (!NAME_REGEX.test(trimmed)) {
    return { ok: false, error: 'Nome contém caracteres inválidos' };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return { ok: false, error: 'Nome precisa ter ao menos nome e sobrenome' };
  }

  const suspicious: string[] = [];
  if (trimmed.length < 5) suspicious.push('Nome muito curto');
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    suspicious.push('Nome todo em MAIÚSCULAS');
  }
  if (trimmed === trimmed.toLowerCase() && /[a-z]/.test(trimmed)) {
    suspicious.push('Nome todo em minúsculas');
  }
  // Letras repetidas demais (4+ iguais seguidas)
  if (/([a-zA-ZÀ-ÿ])\1{3,}/.test(trimmed)) {
    suspicious.push('Caracteres repetidos suspeitos');
  }

  return { ok: true, normalized: trimmed, suspicious: suspicious.length ? suspicious : undefined };
}

// Levenshtein distance normalizada
export function nameSimilarity(a: string, b: string): number {
  const s1 = normalizeForCompare(a);
  const s2 = normalizeForCompare(b);
  if (!s1.length || !s2.length) return 0;
  if (s1 === s2) return 1;
  const dist = levenshtein(s1, s2);
  return 1 - dist / Math.max(s1.length, s2.length);
}

export function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}
