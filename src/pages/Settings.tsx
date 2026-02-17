import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Bell, Lock, User, Smartphone } from "lucide-react";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

const Settings = () => {
  const { settings, updateSettings } = useCompany();
  const { toast } = useToast();

  const handleSave = () => { toast({ title: "Configurações salvas!", description: "Suas configurações foram atualizadas com sucesso." }); };
  const handleChange = (field: string, value: string | boolean) => { updateSettings({ [field]: value }); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BackToDashboardButton />
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"><MessageSquare className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold text-gray-800">Configurações</span>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1><p className="text-gray-600">Gerencie as configurações do seu sistema</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card><CardContent className="p-6"><nav className="space-y-2">
              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg"><User className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium text-blue-600">Perfil</span></div>
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"><Smartphone className="w-4 h-4 text-gray-500" /><span className="text-sm text-gray-700">WhatsApp</span></div>
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"><Bell className="w-4 h-4 text-gray-500" /><span className="text-sm text-gray-700">Notificações</span></div>
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"><Lock className="w-4 h-4 text-gray-500" /><span className="text-sm text-gray-700">Segurança</span></div>
            </nav></CardContent></Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card><CardHeader><CardTitle>Informações da Empresa</CardTitle><CardDescription>Configure os dados básicos da sua empresa</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="companyName">Nome da Empresa</Label><Input id="companyName" value={settings.companyName} onChange={(e) => handleChange("companyName", e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={settings.email} onChange={(e) => handleChange("email", e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" value={settings.phone} onChange={(e) => handleChange("phone", e.target.value)} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Integração WhatsApp</CardTitle><CardDescription>Configure a integração com WhatsApp Business API</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="whatsappToken">Token do WhatsApp</Label><Input id="whatsappToken" type="password" value={settings.whatsappToken} onChange={(e) => handleChange("whatsappToken", e.target.value)} placeholder="Cole aqui seu token do WhatsApp Business API" /></div>
                <div className="p-4 bg-blue-50 rounded-lg"><p className="text-sm text-blue-800">Para obter o token, acesse o Facebook Developers e configure sua aplicação WhatsApp Business.</p></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Notificações e Lembretes</CardTitle><CardDescription>Configure como você deseja receber notificações</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><Label>Notificações por Email</Label><p className="text-sm text-gray-500">Receba atualizações sobre cobranças</p></div><Switch checked={settings.notifications} onCheckedChange={(checked) => handleChange("notifications", checked)} /></div>
                <Separator />
                <div className="flex items-center justify-between"><div><Label>Lembretes Automáticos</Label><p className="text-sm text-gray-500">Envie lembretes automáticos aos devedores</p></div><Switch checked={settings.autoReminders} onCheckedChange={(checked) => handleChange("autoReminders", checked)} /></div>
                <div className="space-y-2"><Label htmlFor="reminderDays">Dias antes do vencimento</Label><Input id="reminderDays" type="number" value={settings.reminderDays} onChange={(e) => handleChange("reminderDays", e.target.value)} className="w-20" /></div>
              </CardContent>
            </Card>
            <div className="flex justify-end"><Button onClick={handleSave} className="bg-gradient-to-r from-green-600 to-emerald-600">Salvar Configurações</Button></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
