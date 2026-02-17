import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { registerSchema, validateAndSanitize } from "@/lib/validation";
import { secureFormInput } from "@/lib/security";
import PasswordStrength from "@/components/PasswordStrength";

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", company: "", phone: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, user } = useAuth();

  if (user) { navigate("/dashboard"); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const sanitizedData = { name: secureFormInput(formData.name), email: secureFormInput(formData.email), company: secureFormInput(formData.company), phone: secureFormInput(formData.phone), password: formData.password, confirmPassword: formData.confirmPassword };
    const validation = validateAndSanitize(registerSchema, sanitizedData);
    if (!validation.success) { setErrors(validation.fieldErrors || {}); setLoading(false); return; }
    const result = await register(sanitizedData);
    if (result.success) { toast({ title: "Cadastro realizado com sucesso!", description: "Verifique seu email para confirmar a conta." }); setTimeout(() => navigate("/login"), 2000); }
    else { toast({ title: "Erro no cadastro", description: result.error || "Não foi possível criar a conta.", variant: "destructive" }); }
    setLoading(false);
  };

  const handleChange = (field: string, value: string) => { setFormData(prev => ({ ...prev, [field]: value })); if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" })); };
  const formatPhone = (value: string) => { const digits = value.replace(/\D/g, ''); if (digits.length <= 11) return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2'); return value; };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"><MessageSquare className="w-6 h-6 text-white" /></div>
            <span className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Cobraae</span>
          </div>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Cadastre-se para começar a usar o Cobraae</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">Nome completo</Label><Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Seu nome" disabled={loading} className={errors.name ? "border-red-500" : ""} required />{errors.name && <p className="text-sm text-red-500">{errors.name}</p>}</div>
            <div className="space-y-2"><Label htmlFor="company">Empresa</Label><Input id="company" value={formData.company} onChange={(e) => handleChange("company", e.target.value)} placeholder="Nome da empresa" disabled={loading} className={errors.company ? "border-red-500" : ""} required />{errors.company && <p className="text-sm text-red-500">{errors.company}</p>}</div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="seu@email.com" disabled={loading} className={errors.email ? "border-red-500" : ""} required />{errors.email && <p className="text-sm text-red-500">{errors.email}</p>}</div>
            <div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" value={formData.phone} onChange={(e) => handleChange("phone", formatPhone(e.target.value))} placeholder="(11) 99999-9999" disabled={loading} className={errors.phone ? "border-red-500" : ""} maxLength={15} required />{errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}</div>
            <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleChange("password", e.target.value)} placeholder="••••••••••••" disabled={loading} className={errors.password ? "border-red-500 pr-10" : "pr-10"} required /><Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} disabled={loading}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div><PasswordStrength password={formData.password} />{errors.password && <p className="text-sm text-red-500">{errors.password}</p>}</div>
            <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar senha</Label><div className="relative"><Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} placeholder="••••••••••••" disabled={loading} className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"} required /><Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>{errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}</div>
            <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-emerald-600" disabled={loading}>{loading ? "Criando conta..." : "Criar conta"}</Button>
          </form>
          <div className="mt-4 text-center text-sm">Já tem uma conta?{" "}<Link to="/login" className="text-green-600 hover:underline">Entrar</Link></div>
          <div className="mt-2 text-center"><Link to="/" className="text-sm text-gray-500 hover:underline">Voltar ao início</Link></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;