import { Button } from "@/components/ui/button";
import { MessageSquare, Menu } from "lucide-react";

const Header = () => (
  <header className="w-full bg-white/95 backdrop-blur-lg border-b border-green-100/50 sticky top-0 z-50 shadow-sm">
    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg"><MessageSquare className="w-6 h-6 text-white" /></div>
        <span className="text-3xl font-black bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">Cobraae</span>
      </div>
      <div className="hidden md:flex items-center space-x-6">
        <Button variant="ghost" asChild><a href="/login">Entrar</a></Button>
        <Button className="bg-gradient-to-r from-green-600 to-emerald-600" asChild><a href="/register">Cadastrar-se</a></Button>
      </div>
      <div className="md:hidden"><Button variant="ghost" size="icon"><Menu className="w-6 h-6" /></Button></div>
    </div>
  </header>
);
export default Header;