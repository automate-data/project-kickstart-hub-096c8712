import { MessageSquare, Mail, Phone } from "lucide-react";
const Footer = () => (
  <footer className="bg-gray-900 text-white py-12">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center space-x-2 mb-4"><div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"><MessageSquare className="w-5 h-5 text-white" /></div><span className="text-2xl font-bold">Cobraae</span></div>
          <p className="text-gray-300 mb-6 max-w-md">Automatize suas cobranças via WhatsApp e melhore sua gestão financeira.</p>
          <div className="flex space-x-4"><div className="flex items-center space-x-2 text-gray-300"><Mail className="w-4 h-4" /><span>contato@cobraae.com</span></div></div>
        </div>
        <div><h4 className="text-lg font-semibold mb-4">Produto</h4><ul className="space-y-2 text-gray-300"><li><a href="#" className="hover:text-green-400">Recursos</a></li><li><a href="#" className="hover:text-green-400">Preços</a></li></ul></div>
        <div><h4 className="text-lg font-semibold mb-4">Suporte</h4><ul className="space-y-2 text-gray-300"><li><a href="#" className="hover:text-green-400">Central de Ajuda</a></li><li><a href="#" className="hover:text-green-400">Contato</a></li></ul></div>
      </div>
      <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400"><p>&copy; 2024 Cobraae. Todos os direitos reservados.</p></div>
    </div>
  </footer>
);
export default Footer;