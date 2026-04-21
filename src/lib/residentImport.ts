import * as XLSX from 'xlsx';
import {
  validateBrazilianMobile,
  validateName,
  nameSimilarity,
  normalizeForCompare,
} from './residentValidation';

export interface RawRow {
  nome_completo?: string;
  telefone?: string;
  bloco?: string;
  apartamento?: string;
  whatsapp_ativo?: string;
}

export type RowStatus = 'valid' | 'warning' | 'error' | 'duplicate_skip' | 'needs_review';

export interface ParsedRow {
  rowIndex: number; // linha original (1-based, excluindo header)
  raw: RawRow;
  fullName: string;
  phone: string; // normalizado E.164 (se válido)
  block: string;
  apartment: string;
  whatsappEnabled: boolean;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  suspiciousReasons: string[];
  // Para revisão
  matchedExistingId?: string;
  matchedExistingName?: string;
}

export interface ExistingResident {
  id: string;
  full_name: string;
  phone: string;
  block: string;
  apartment: string;
}

const HEADER_ALIASES: Record<string, keyof RawRow> = {
  nome_completo: 'nome_completo', nome: 'nome_completo', full_name: 'nome_completo', name: 'nome_completo',
  telefone: 'telefone', phone: 'telefone', celular: 'telefone', whatsapp: 'telefone',
  bloco: 'bloco', block: 'bloco', torre: 'bloco', tower: 'bloco',
  apartamento: 'apartamento', apto: 'apartamento', apartment: 'apartamento', unidade: 'apartamento', unit: 'apartamento',
  whatsapp_ativo: 'whatsapp_ativo', whatsapp_enabled: 'whatsapp_ativo', notificar: 'whatsapp_ativo',
};

function normalizeHeader(h: string): keyof RawRow | null {
  const k = h.toString().toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  return HEADER_ALIASES[k] || null;
}

export async function parseFile(file: File): Promise<RawRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  if (!json.length) return [];

  const headerRow = json[0].map((h) => (h ?? '').toString());
  const colMap: (keyof RawRow | null)[] = headerRow.map(normalizeHeader);

  const rows: RawRow[] = [];
  for (let i = 1; i < json.length; i++) {
    const r = json[i];
    if (!r || r.every((c) => c === '' || c == null)) continue;
    const row: RawRow = {};
    for (let c = 0; c < colMap.length; c++) {
      const key = colMap[c];
      if (!key) continue;
      const val = r[c];
      row[key] = val != null ? String(val).trim() : '';
    }
    rows.push(row);
  }
  return rows;
}

export function validateRows(rows: RawRow[], existing: ExistingResident[]): ParsedRow[] {
  const parsed: ParsedRow[] = [];
  const seenInSheet = new Map<string, number>(); // chave full+block+apt -> rowIndex
  const seenPhones = new Map<string, number>();

  rows.forEach((raw, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suspiciousReasons: string[] = [];

    const nameRes = validateName(raw.nome_completo || '');
    const phoneRes = validateBrazilianMobile(raw.telefone || '');
    const block = (raw.bloco || '').toString().trim();
    const apartment = (raw.apartamento || '').toString().trim();

    if (!nameRes.ok) errors.push(nameRes.error || 'Nome inválido');
    if (!phoneRes.ok) errors.push(phoneRes.error || 'Telefone inválido');
    if (!block) errors.push('Bloco vazio');
    if (!apartment) errors.push('Apartamento vazio');

    if (nameRes.suspicious) suspiciousReasons.push(...nameRes.suspicious);
    if (phoneRes.warning) warnings.push(phoneRes.warning);

    const fullName = nameRes.normalized || (raw.nome_completo || '').trim();
    const phone = phoneRes.normalized || '';
    const wppRaw = (raw.whatsapp_ativo || '').toString().toLowerCase().trim();
    const whatsappEnabled = !['nao', 'não', 'no', 'false', '0'].includes(wppRaw);

    // Dedup dentro da própria planilha (chave exata)
    const key = `${normalizeForCompare(fullName)}||${block.toLowerCase()}||${apartment.toLowerCase()}`;
    if (errors.length === 0 && seenInSheet.has(key)) {
      warnings.push(`Duplicado na planilha (linha ${seenInSheet.get(key)! + 1})`);
    } else if (errors.length === 0) {
      seenInSheet.set(key, idx);
    }

    // Dedup telefone na planilha
    if (phone && seenPhones.has(phone)) {
      warnings.push(`Telefone duplicado na planilha (linha ${seenPhones.get(phone)! + 1})`);
      suspiciousReasons.push('Telefone repetido na planilha');
    } else if (phone) {
      seenPhones.set(phone, idx);
    }

    // Comparação com banco
    let matchedExistingId: string | undefined;
    let matchedExistingName: string | undefined;
    let exactMatchInDb = false;

    if (errors.length === 0) {
      for (const e of existing) {
        const sameUnit = e.block.toLowerCase() === block.toLowerCase()
          && e.apartment.toLowerCase() === apartment.toLowerCase();
        const sameNameNorm = normalizeForCompare(e.full_name) === normalizeForCompare(fullName);

        if (sameUnit && sameNameNorm) {
          exactMatchInDb = true;
          matchedExistingId = e.id;
          matchedExistingName = e.full_name;
          break;
        }
        if (sameUnit) {
          const sim = nameSimilarity(e.full_name, fullName);
          if (sim >= 0.8) {
            suspiciousReasons.push(`Nome parecido com "${e.full_name}" no mesmo ${block}/${apartment}`);
            matchedExistingId = e.id;
            matchedExistingName = e.full_name;
          } else {
            suspiciousReasons.push(`${block}/${apartment} já tem morador "${e.full_name}"`);
            matchedExistingId = e.id;
            matchedExistingName = e.full_name;
          }
        } else if (phone && e.phone === phone) {
          warnings.push(`Telefone já cadastrado para "${e.full_name}"`);
          suspiciousReasons.push(`Telefone igual ao de "${e.full_name}"`);
        }
      }
    }

    let status: RowStatus = 'valid';
    if (errors.length) status = 'error';
    else if (exactMatchInDb) status = 'duplicate_skip';
    else if (suspiciousReasons.length) status = 'needs_review';
    else if (warnings.length) status = 'warning';

    parsed.push({
      rowIndex: idx,
      raw,
      fullName,
      phone,
      block,
      apartment,
      whatsappEnabled,
      status,
      errors,
      warnings,
      suspiciousReasons,
      matchedExistingId,
      matchedExistingName,
    });
  });

  return parsed;
}

export function generateErrorReport(rows: ParsedRow[]): string {
  const BOM = '\uFEFF';
  const headers = ['linha', 'status', 'nome', 'telefone', 'bloco', 'apartamento', 'erros', 'avisos'];
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    const cells = [
      String(r.rowIndex + 2), // +2: header + 1-based
      r.status,
      r.fullName,
      r.phone || r.raw.telefone || '',
      r.block,
      r.apartment,
      r.errors.join(' | '),
      [...r.warnings, ...r.suspiciousReasons].join(' | '),
    ];
    lines.push(cells.map(escapeCsv).join(','));
  });
  return BOM + lines.join('\n');
}

function escapeCsv(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
