import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, Loader2, FileWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  parseFile, validateRows, generateErrorReport, chunk,
  type ParsedRow, type ExistingResident,
} from '@/lib/residentImport';
import { generateResidentTemplate, downloadCsv } from '@/lib/residentTemplate';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominiumId: string;
  groupLabel: string;
  unitLabel: string;
  onImportComplete: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

export default function ImportResidentsDialog({
  open, onOpenChange, condominiumId, groupLabel, unitLabel, onImportComplete,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [reviewDecisions, setReviewDecisions] = useState<Record<number, 'import' | 'skip'>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ inserted: number; skipped: number; failed: number } | null>(null);

  const reset = () => {
    setStep(1); setParsing(false); setParsedRows([]); setReviewDecisions({});
    setImporting(false); setProgress(0); setResults(null);
  };

  const handleClose = (next: boolean) => {
    if (importing) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleDownloadTemplate = () => {
    const csv = generateResidentTemplate(groupLabel, unitLabel);
    downloadCsv('modelo-moradores.csv', csv);
  };

  const handleFileSelected = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 2 MB', variant: 'destructive' });
      return;
    }
    setParsing(true);
    try {
      const raw = await parseFile(file);
      if (!raw.length) {
        toast({ title: 'Planilha vazia', variant: 'destructive' });
        setParsing(false);
        return;
      }
      // Buscar moradores existentes
      const { data: existing } = await supabase
        .from('residents')
        .select('id, full_name, phone, block, apartment')
        .eq('condominium_id', condominiumId)
        .is('deleted_at', null);

      const parsed = validateRows(raw, (existing || []) as ExistingResident[]);
      setParsedRows(parsed);
      setStep(3);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao ler arquivo', description: e.message, variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const counts = useMemo(() => {
    const c = { valid: 0, warning: 0, error: 0, duplicate: 0, review: 0 };
    parsedRows.forEach((r) => {
      if (r.status === 'valid') c.valid++;
      else if (r.status === 'warning') c.warning++;
      else if (r.status === 'error') c.error++;
      else if (r.status === 'duplicate_skip') c.duplicate++;
      else if (r.status === 'needs_review') c.review++;
    });
    return c;
  }, [parsedRows]);

  const reviewRows = useMemo(
    () => parsedRows.filter((r) => r.status === 'needs_review'),
    [parsedRows]
  );

  const goToImport = () => {
    if (reviewRows.length > 0) {
      // Inicializa decisões: default = import
      const init: Record<number, 'import' | 'skip'> = {};
      reviewRows.forEach((r) => { init[r.rowIndex] = 'import'; });
      setReviewDecisions(init);
      setStep(4);
    } else {
      setStep(5);
      runImport();
    }
  };

  const confirmReview = () => {
    setStep(5);
    runImport();
  };

  const runImport = async () => {
    setImporting(true);
    setProgress(0);

    const toImport = parsedRows.filter((r) => {
      if (r.status === 'error') return false;
      if (r.status === 'duplicate_skip') return false;
      if (r.status === 'needs_review') return reviewDecisions[r.rowIndex] === 'import';
      return true; // valid + warning
    });

    if (!toImport.length) {
      setResults({ inserted: 0, skipped: parsedRows.length, failed: 0 });
      setImporting(false);
      return;
    }

    const batches = chunk(toImport, 100);
    let inserted = 0, failed = 0;
    let processed = 0;

    for (const batch of batches) {
      const payload = batch.map((r) => ({
        condominium_id: condominiumId,
        full_name: r.fullName,
        phone: r.phone,
        block: r.block,
        apartment: r.apartment,
        whatsapp_enabled: r.whatsappEnabled,
      }));
      const { error, data } = await supabase.from('residents').insert(payload).select('id');
      if (error) {
        failed += batch.length;
        console.error('Batch insert error:', error);
      } else {
        inserted += data?.length || batch.length;
      }
      processed += batch.length;
      setProgress(Math.round((processed / toImport.length) * 100));
    }

    const skipped = parsedRows.length - inserted - failed;
    setResults({ inserted, skipped, failed });
    setImporting(false);
    onImportComplete();
  };

  const downloadErrorReport = () => {
    const failedRows = parsedRows.filter((r) =>
      r.status === 'error' || r.status === 'duplicate_skip' ||
      (r.status === 'needs_review' && reviewDecisions[r.rowIndex] === 'skip')
    );
    if (!failedRows.length) {
      toast({ title: 'Sem itens para reportar' });
      return;
    }
    const csv = generateErrorReport(failedRows);
    downloadCsv('relatorio-importacao.csv', csv);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar moradores em massa</DialogTitle>
          <DialogDescription>
            Etapa {step} de 5 — somente superadmin
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Baixe o modelo</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use a planilha modelo com as colunas: <strong>nome_completo, telefone, bloco, apartamento, whatsapp_ativo</strong>.
                  Aceita CSV, XLSX e XLS (até 2 MB).
                </p>
                <Button onClick={handleDownloadTemplate} variant="outline">
                  <Download className="w-4 h-4 mr-2" /> Baixar modelo CSV
                </Button>
              </div>
              <div className="rounded-lg border p-4 text-sm space-y-1">
                <p><strong>Validação rigorosa de telefone:</strong> aceita apenas celulares brasileiros com nono dígito (11 dígitos + DDD válido).</p>
                <p><strong>Validação de nome:</strong> mínimo 2 palavras, sem dígitos. Casos suspeitos vão para revisão manual.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => setStep(2)}>Próximo: Upload</Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-4">
              <label className="block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium mb-1">Selecionar arquivo</p>
                <p className="text-sm text-muted-foreground">CSV, XLSX ou XLS (máx. 2 MB)</p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  disabled={parsing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                  }}
                />
              </label>
              {parsing && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analisando planilha...
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)} disabled={parsing}>Voltar</Button>
              </DialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                <Stat label="Válidos" value={counts.valid} icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} />
                <Stat label="Avisos" value={counts.warning} icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />} />
                <Stat label="Revisar" value={counts.review} icon={<FileWarning className="w-4 h-4 text-orange-600" />} />
                <Stat label="Erros" value={counts.error} icon={<XCircle className="w-4 h-4 text-destructive" />} />
                <Stat label="Duplicados" value={counts.duplicate} icon={<AlertTriangle className="w-4 h-4 text-muted-foreground" />} />
              </div>
              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((r) => (
                      <TableRow key={r.rowIndex}>
                        <TableCell className="text-xs text-muted-foreground">{r.rowIndex + 2}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-sm">{r.fullName || r.raw.nome_completo || '—'}</TableCell>
                        <TableCell className="text-xs">{r.phone || r.raw.telefone || '—'}</TableCell>
                        <TableCell className="text-xs">{r.block}/{r.apartment}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[...r.errors, ...r.warnings, ...r.suspiciousReasons].join(' • ') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                {(counts.error > 0 || counts.duplicate > 0) && (
                  <Button variant="outline" onClick={downloadErrorReport}>
                    <Download className="w-4 h-4 mr-2" /> Baixar relatório
                  </Button>
                )}
                <Button onClick={goToImport} disabled={counts.valid + counts.warning + counts.review === 0}>
                  {counts.review > 0 ? 'Revisar suspeitos' : `Importar ${counts.valid + counts.warning} morador(es)`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 p-3 text-sm">
                <p className="font-medium text-orange-900 dark:text-orange-200 flex items-center gap-2">
                  <FileWarning className="w-4 h-4" /> Confirme manualmente os itens suspeitos
                </p>
                <p className="text-orange-800 dark:text-orange-300 text-xs mt-1">
                  Marque "Importar" ou "Pular" para cada caso. Itens deixados como "Pular" não serão cadastrados.
                </p>
              </div>
              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Decisão</TableHead>
                      <TableHead>Nome / Unidade</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewRows.map((r) => (
                      <TableRow key={r.rowIndex}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={reviewDecisions[r.rowIndex] === 'import'}
                              onCheckedChange={(v) =>
                                setReviewDecisions((prev) => ({
                                  ...prev,
                                  [r.rowIndex]: v ? 'import' : 'skip',
                                }))
                              }
                            />
                            <span className="text-xs">{reviewDecisions[r.rowIndex] === 'import' ? 'Importar' : 'Pular'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{r.fullName}</div>
                          <div className="text-xs text-muted-foreground">{r.block}/{r.apartment} · {r.phone}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.suspiciousReasons.join(' • ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
                <Button onClick={confirmReview}>Confirmar e importar</Button>
              </DialogFooter>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 py-6">
              {importing ? (
                <>
                  <p className="text-sm text-center text-muted-foreground">Importando moradores...</p>
                  <Progress value={progress} />
                  <p className="text-xs text-center text-muted-foreground">{progress}%</p>
                </>
              ) : results ? (
                <>
                  <div className="text-center space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                    <h3 className="text-lg font-semibold">Importação concluída</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border p-3">
                      <div className="text-2xl font-bold text-green-600">{results.inserted}</div>
                      <div className="text-xs text-muted-foreground">Importados</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-2xl font-bold text-muted-foreground">{results.skipped}</div>
                      <div className="text-xs text-muted-foreground">Ignorados</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-2xl font-bold text-destructive">{results.failed}</div>
                      <div className="text-xs text-muted-foreground">Falharam</div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={downloadErrorReport}>
                      <Download className="w-4 h-4 mr-2" /> Baixar relatório
                    </Button>
                    <Button onClick={() => handleClose(false)}>Fechar</Button>
                  </DialogFooter>
                </>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-2 flex items-center gap-2">
      {icon}
      <div>
        <div className="text-lg font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ParsedRow['status'] }) {
  const map: Record<ParsedRow['status'], { label: string; className: string }> = {
    valid: { label: 'Válido', className: 'bg-green-500/10 text-green-700 border-green-500/20' },
    warning: { label: 'Aviso', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
    needs_review: { label: 'Revisar', className: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
    error: { label: 'Erro', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    duplicate_skip: { label: 'Duplicado', className: 'bg-muted text-muted-foreground' },
  };
  const cfg = map[status];
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}
