// Geração de template CSV para importação de moradores

export function generateResidentTemplate(groupLabel: string, unitLabel: string): string {
  const headers = ['nome_completo', 'telefone', 'bloco', 'apartamento', 'whatsapp_ativo'];
  const example1 = ['João da Silva', '+5511987654321', 'A', '101', 'sim'];
  const example2 = ['Maria Souza', '11912345678', 'B', '202', 'sim'];

  // BOM para Excel reconhecer UTF-8 corretamente
  const BOM = '\uFEFF';
  const rows = [headers, example1, example2];
  const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');

  // Comentário inicial com labels do condomínio (opcional, removido pra parsing)
  return BOM + csv + '\n';

  // groupLabel/unitLabel apenas referenciam para futura customização visual
  void groupLabel; void unitLabel;
}

function escapeCsv(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
