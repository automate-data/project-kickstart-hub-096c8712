
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Trash2, Calendar, DollarSign, User, MessageSquare, Bell, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { boletoSchema, validateAndSanitize, sanitizeString, validateFile } from "@/lib/validation";
import { generateId } from "@/lib/auth";

interface Boleto {
  id: string; filename: string; clientName: string; valor: string; vencimento: string; uploadDate: string; url: string;
}

const Boletos = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings } = useCompany();
  const { logout } = useAuth();
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newBoleto, setNewBoleto] = useState({ clientName: "", valor: "", vencimento: "", file: null as File | null });

  const handleLogout = () => { logout(); toast({ title: "Logout realizado", description: "Você foi desconectado com sucesso." }); };
  const handleNotificationClick = () => { toast({ title: "Notificações", description: "Você tem 3 notificações não lidas" }); };
  const handleSettingsClick = () => { navigate("/settings"); };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.valid) { setErrors({ file: validation.error || "Arquivo inválido" }); toast({ title: "Erro", description: validation.error, variant: "destructive" }); return; }
    setNewBoleto({ ...newBoleto, file }); setErrors({ ...errors, file: "" });
  };

  const formatValue = (value: string) => { const digits = value.replace(/\D/g, ''); const cents = parseInt(digits) || 0; const reais = (cents / 100).toFixed(2); return `R$ ${reais.replace('.', ',')}`; };
  const handleValueChange = (value: string) => { setNewBoleto({ ...newBoleto, valor: formatValue(value) }); if (errors.valor) setErrors({ ...errors, valor: "" }); };
  const handleClientNameChange = (value: string) => { setNewBoleto({ ...newBoleto, clientName: sanitizeString(value) }); if (errors.clientName) setErrors({ ...errors, clientName: "" }); };
  const handleDateChange = (value: string) => { setNewBoleto({ ...newBoleto, vencimento: value }); if (errors.vencimento) setErrors({ ...errors, vencimento: "" }); };

  const handleUpload = async () => {
    if (!newBoleto.file) { setErrors({ file: "Por favor, selecione um arquivo PDF" }); return; }
    setLoading(true); setErrors({});
    const validation = validateAndSanitize(boletoSchema, { clientName: newBoleto.clientName, valor: newBoleto.valor, vencimento: newBoleto.vencimento });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.errors?.forEach(error => { if (error.includes("cliente")) fieldErrors.clientName = error; if (error.includes("valor")) fieldErrors.valor = error; if (error.includes("vencimento")) fieldErrors.vencimento = error; });
      setErrors(fieldErrors); setLoading(false); return;
    }
    try {
      const fileValidation = validateFile(newBoleto.file);
      if (!fileValidation.valid) { setErrors({ file: fileValidation.error || "Arquivo inválido" }); setLoading(false); return; }
      const novoBoleto: Boleto = { id: generateId(), filename: newBoleto.file.name, clientName: validation.data!.clientName, valor: validation.data!.valor, vencimento: validation.data!.vencimento, uploadDate: new Date().toISOString().split('T')[0], url: URL.createObjectURL(newBoleto.file) };
      setBoletos([...boletos, novoBoleto]); setUploadDialogOpen(false); setNewBoleto({ clientName: "", valor: "", vencimento: "", file: null }); setErrors({});
      toast({ title: "Sucesso", description: "Boleto enviado com sucesso!" });
    } catch (error) { toast({ title: "Erro", description: "Ocorreu um erro ao enviar o boleto. Tente novamente.", variant: "destructive" }); } finally { setLoading(false); }
  };

  const handleDelete = (id: string) => { setBoletos(boletos.filter(b => b.id !== id)); toast({ title: "Sucesso", description: "Boleto removido com sucesso!" }); };
  const handleDownload = (boleto: Boleto) => { try { const link = document.createElement('a'); link.href = boleto.url; link.download = boleto.filename; link.click(); } catch (error) { toast({ title: "Erro", description: "Não foi possível baixar o arquivo.", variant: "destructive" }); } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b backdrop-blur-sm bg-white/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BackToDashboardButton className="mr-2" />
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"><MessageSquare className="w-6 h-6 text-white" /></div>
            <div><span className="text-xl font-bold text-gray-800">Cobraae</span><p className="text-sm text-gray-500">Sistema de Cobrança</p></div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="relative" onClick={handleNotificationClick}><Bell className="w-4 h-4" /><span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span></Button>
            <Button variant="ghost" size="sm" onClick={handleSettingsClick}><Settings className="w-4 h-4" /></Button>
            <Button variant="outline" onClick={handleLogout}>Sair</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-4xl font-bold text-gray-900 mb-2">Gerenciar Boletos</h1><p className="text-gray-600 text-lg">Upload e visualização de boletos para pagamento</p></div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild><Button className="bg-gradient-to-r from-green-500 to-emerald-600"><Upload className="w-4 h-4 mr-2" />Upload Boleto</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Enviar Novo Boleto</DialogTitle><DialogDescription>Faça upload de um boleto em PDF para disponibilizar aos clientes.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label htmlFor="clientName">Nome do Cliente</Label><Input id="clientName" value={newBoleto.clientName} onChange={(e) => handleClientNameChange(e.target.value)} placeholder="Digite o nome do cliente" disabled={loading} className={errors.clientName ? "border-red-500" : ""} />{errors.clientName && <p className="text-sm text-red-500">{errors.clientName}</p>}</div>
                <div className="space-y-2"><Label htmlFor="valor">Valor do Boleto</Label><Input id="valor" value={newBoleto.valor} onChange={(e) => handleValueChange(e.target.value)} placeholder="R$ 0,00" disabled={loading} className={errors.valor ? "border-red-500" : ""} />{errors.valor && <p className="text-sm text-red-500">{errors.valor}</p>}</div>
                <div className="space-y-2"><Label htmlFor="vencimento">Data de Vencimento</Label><Input id="vencimento" type="date" value={newBoleto.vencimento} onChange={(e) => handleDateChange(e.target.value)} disabled={loading} className={errors.vencimento ? "border-red-500" : ""} />{errors.vencimento && <p className="text-sm text-red-500">{errors.vencimento}</p>}</div>
                <div className="space-y-2"><Label htmlFor="file">Arquivo PDF</Label><Input id="file" type="file" accept=".pdf" onChange={handleFileSelect} disabled={loading} className={errors.file ? "border-red-500" : ""} />{errors.file && <p className="text-sm text-red-500">{errors.file}</p>}{newBoleto.file && !errors.file && <p className="text-sm text-green-600">Arquivo selecionado: {newBoleto.file.name}</p>}</div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setUploadDialogOpen(false); setErrors({}); setNewBoleto({ clientName: "", valor: "", vencimento: "", file: null }); }} disabled={loading}>Cancelar</Button>
                <Button type="button" onClick={handleUpload} disabled={loading}>{loading ? "Enviando..." : "Enviar Boleto"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-0"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Total de Boletos</p><p className="text-3xl font-bold text-gray-900">{boletos.length}</p></div><div className="p-3 bg-blue-50 rounded-xl"><FileText className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
          <Card className="shadow-lg border-0"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Valor Total</p><p className="text-3xl font-bold text-gray-900">R$ 0,00</p></div><div className="p-3 bg-green-50 rounded-xl"><DollarSign className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
          <Card className="shadow-lg border-0"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Clientes</p><p className="text-3xl font-bold text-gray-900">0</p></div><div className="p-3 bg-purple-50 rounded-xl"><User className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
          <Card className="shadow-lg border-0"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Este Mês</p><p className="text-3xl font-bold text-gray-900">{boletos.length}</p></div><div className="p-3 bg-orange-50 rounded-xl"><Calendar className="w-6 h-6 text-orange-600" /></div></div></CardContent></Card>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Boletos Disponíveis</CardTitle><CardDescription>Lista de todos os boletos enviados e disponíveis para download</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {boletos.map((boleto) => (
                <div key={boleto.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-red-100 rounded-lg"><FileText className="w-5 h-5 text-red-600" /></div>
                    <div><h3 className="font-semibold text-gray-900">{boleto.filename}</h3><div className="flex items-center space-x-4 text-sm text-gray-600"><span>Cliente: {boleto.clientName}</span><span>Valor: {boleto.valor}</span><span>Vencimento: {new Date(boleto.vencimento).toLocaleDateString('pt-BR')}</span></div></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(boleto)}><Download className="w-4 h-4 mr-1" />Download</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(boleto.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              {boletos.length === 0 && (
                <div className="text-center py-12"><FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum boleto encontrado</h3><p className="text-gray-600 mb-6">Comece enviando seu primeiro boleto</p><Button onClick={() => setUploadDialogOpen(true)}><Upload className="w-4 h-4 mr-2" />Enviar Primeiro Boleto</Button></div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Boletos;
