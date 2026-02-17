import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Upload } from "lucide-react";
import { useClientes } from "@/hooks/useClientes";
import { useServicos } from "@/hooks/useServicos";
import { useCreateCobranca } from "@/hooks/useCreateCobranca";
import { useUploadBoleto } from "@/hooks/useBoletos";

interface ServicoSelecionado { servico_id: string; nome: string; quantidade: number; valor_unitario: number; }

const CobrancaDialog = () => {
  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([]);
  const [servicoSelecionadoAtual, setServicoSelecionadoAtual] = useState("");
  const [titulo, setTitulo] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("");
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [observacoes, setObservacoes] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);

  const { data: clientes = [] } = useClientes();
  const { data: servicos = [] } = useServicos();
  const createCobranca = useCreateCobranca();
  const uploadBoleto = useUploadBoleto();

  const servicosDisponiveis = servicos.filter(s => !servicosSelecionados.find(ss => ss.servico_id === s.id));

  const adicionarServico = (servicoId: string) => {
    const servico = servicos.find(s => s.id === servicoId);
    if (!servico) return;
    setServicosSelecionados([...servicosSelecionados, { servico_id: servico.id, nome: servico.nome, quantidade: 1, valor_unitario: Number(servico.valor) }]);
    setServicoSelecionadoAtual("");
  };

  const removerServico = (servicoId: string) => { setServicosSelecionados(servicosSelecionados.filter(s => s.servico_id !== servicoId)); };
  const atualizarServico = (servicoId: string, campo: 'quantidade' | 'valor_unitario', valor: number) => { setServicosSelecionados(servicosSelecionados.map(s => s.servico_id === servicoId ? { ...s, [campo]: valor } : s)); };
  const calcularTotal = () => servicosSelecionados.reduce((acc, s) => acc + (s.quantidade * s.valor_unitario), 0);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setArquivos(Array.from(e.target.files)); };
  const removerArquivo = (index: number) => { setArquivos(arquivos.filter((_, i) => i !== index)); };

  const handleSubmit = async () => {
    if (!clienteId || servicosSelecionados.length === 0 || !titulo || !dataVencimento || !metodoPagamento) return;
    const valorTotal = calcularTotal();
    try {
      const cobranca = await createCobranca.mutateAsync({ cobrancaData: { cliente_id: clienteId, titulo, valor: valorTotal, data_vencimento: dataVencimento, status: 'pendente', metodo_pagamento: metodoPagamento, observacoes }, servicos: servicosSelecionados, numeroParcelas });
      if (arquivos.length > 0 && cobranca) { for (const file of arquivos) { await uploadBoleto.mutateAsync({ file, clienteId, valor: valorTotal / numeroParcelas, dataVencimento }); } }
      setClienteId(""); setServicosSelecionados([]); setServicoSelecionadoAtual(""); setTitulo(""); setDataVencimento(""); setMetodoPagamento(""); setNumeroParcelas(1); setObservacoes(""); setArquivos([]); setOpen(false);
    } catch (error) { console.error('Erro ao criar cobrança:', error); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-gradient-to-r from-green-600 to-emerald-600"><Plus className="w-4 h-4 mr-2" />Nova Cobrança</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cadastrar Nova Cobrança</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div><Label>Cliente *</Label><Select value={clienteId} onValueChange={setClienteId}><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger><SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} - {c.email}</SelectItem>)}</SelectContent></Select></div>
          <div>
            <Label>Serviços *</Label>
            <Select value={servicoSelecionadoAtual} onValueChange={adicionarServico}><SelectTrigger><SelectValue placeholder="Adicionar serviço" /></SelectTrigger><SelectContent>{servicosDisponiveis.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} - R$ {Number(s.valor).toFixed(2)}</SelectItem>)}</SelectContent></Select>
            <div className="mt-4 space-y-3">
              {servicosSelecionados.map(servico => (
                <div key={servico.servico_id} className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex-1"><p className="font-medium">{servico.nome}</p><div className="flex gap-4 mt-2"><div><Label className="text-xs">Quantidade</Label><Input type="number" min="1" value={servico.quantidade} onChange={(e) => atualizarServico(servico.servico_id, 'quantidade', parseInt(e.target.value))} className="w-20" /></div><div><Label className="text-xs">Valor Unitário</Label><Input type="number" step="0.01" min="0" value={servico.valor_unitario} onChange={(e) => atualizarServico(servico.servico_id, 'valor_unitario', parseFloat(e.target.value))} className="w-32" /></div><div><Label className="text-xs">Subtotal</Label><p className="text-lg font-semibold">R$ {(servico.quantidade * servico.valor_unitario).toFixed(2)}</p></div></div></div>
                  <Button variant="ghost" size="sm" onClick={() => removerServico(servico.servico_id)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
              {servicosSelecionados.length > 0 && <div className="p-4 bg-primary/10 rounded-lg"><p className="text-lg font-bold">Valor Total: R$ {calcularTotal().toFixed(2)}</p></div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Título *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Serviços de consultoria" /></div>
            <div><Label>Data de Vencimento *</Label><Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} /></div>
            <div><Label>Forma de Pagamento *</Label><Select value={metodoPagamento} onValueChange={setMetodoPagamento}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="pix">Pix</SelectItem><SelectItem value="boleto">Boleto</SelectItem></SelectContent></Select></div>
            <div><Label>Número de Parcelas</Label><Input type="number" min="1" value={numeroParcelas} onChange={(e) => setNumeroParcelas(parseInt(e.target.value))} />{numeroParcelas > 1 && <p className="text-sm text-muted-foreground mt-1">Valor por parcela: R$ {(calcularTotal() / numeroParcelas).toFixed(2)}</p>}</div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} /></div>
          </div>
          <div>
            <Label>Upload de Boletos</Label>
            <div className="border-2 border-dashed rounded-lg p-4"><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" id="file-upload" /><label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer"><Upload className="w-8 h-8 text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Clique para selecionar ou arraste arquivos</p></label>
              {arquivos.length > 0 && <div className="mt-4 space-y-2">{arquivos.map((file, index) => <div key={index} className="flex items-center justify-between p-2 bg-muted rounded"><span className="text-sm">{file.name}</span><Button variant="ghost" size="sm" onClick={() => removerArquivo(index)}><X className="w-4 h-4" /></Button></div>)}</div>}
            </div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={!clienteId || servicosSelecionados.length === 0 || !titulo || !dataVencimento || !metodoPagamento}>Cadastrar Cobrança</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CobrancaDialog;
