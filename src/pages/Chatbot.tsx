
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Settings, User, Clock } from "lucide-react";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";

const Chatbot = () => {
  const [clientsData] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");

  const sendMessage = () => {
    if (newMessage.trim() && selectedClient) {
      const updatedMessages = [...selectedClient.messages, {
        id: selectedClient.messages.length + 1,
        sender: "bot" as const,
        message: newMessage,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        status: "sent" as const
      }];
      setSelectedClient({ ...selectedClient, messages: updatedMessages });
      setNewMessage("");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Em andamento';
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      default: return 'Inativo';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <BackToDashboardButton />
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold text-gray-800">Chatbot WhatsApp</span>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="h-auto min-h-[400px] lg:h-[600px]">
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Lista de conversas ativas</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 p-4">
                    {clientsData.length === 0 ? (
                      <div className="text-center py-12">
                        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhuma conversa ativa</p>
                        <p className="text-sm text-gray-400 mt-2">As conversas com clientes aparecerão aqui</p>
                      </div>
                    ) : (
                      clientsData.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedClient?.id === client.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-sm">{client.name}</span>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(client.status)}`}>{getStatusText(client.status)}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{client.company}</p>
                          <p className="text-xs text-gray-600 mb-2">{client.amount}</p>
                          <p className="text-xs text-gray-500 truncate">{client.lastMessage}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400 flex items-center"><Clock className="w-3 h-3 mr-1" />{client.lastMessageTime}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-auto min-h-[400px] lg:h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>{selectedClient ? `Conversa com ${selectedClient.name}` : "Selecione uma conversa"}</CardTitle>
                <CardDescription>{selectedClient ? `Cliente: ${selectedClient.company} • Valor: ${selectedClient.amount}` : "Escolha um cliente da lista para visualizar a conversa"}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {selectedClient ? (
                  <>
                    <ScrollArea className="flex-1 mb-4">
                      <div className="space-y-4 pr-4">
                        {selectedClient.messages?.map((msg: any) => (
                          <div key={msg.id} className={`flex ${msg.sender === "bot" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.sender === "bot" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-800"}`}>
                              <p className="whitespace-pre-wrap">{msg.message}</p>
                              <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex space-x-2">
                      <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite sua mensagem..." onKeyPress={(e) => e.key === "Enter" && sendMessage()} />
                      <Button onClick={sendMessage}><Send className="w-4 h-4" /></Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhuma conversa selecionada</p>
                      <p className="text-sm text-gray-400 mt-2">Selecione um cliente da lista para iniciar a conversa</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle>Configurações da Mensagem</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template">Template da Mensagem</Label>
                  <Textarea id="template" defaultValue="Olá {nome}, sou do Financeiro da {empresa}. Você tem uma fatura em aberto. Como você deseja pagar? Pix ou boleto bancário?" rows={4} />
                </div>
                <div>
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input id="pixKey" defaultValue="empresa@abc.com" />
                </div>
                <Button className="w-full">Salvar Configurações</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Status do Bot</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between"><span>WhatsApp Conectado</span><div className="w-3 h-3 bg-green-500 rounded-full"></div></div>
                <div className="flex items-center justify-between mt-2"><span>Mensagens Automáticas</span><div className="w-3 h-3 bg-green-500 rounded-full"></div></div>
                <Button className="w-full mt-4" variant="outline">Reconectar WhatsApp</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
