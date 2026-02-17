import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateAndSanitize } from "@/lib/validation";
import { z } from "zod";

const resetPasswordSchema = z.object({ password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(128, "Senha muito longa").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter ao menos uma letra minúscula, maiúscula e um número") });

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (error) { toast({ title: "Erro no link", description: errorDescription || "Link de redefinição inválido.", variant: "destructive" }); navigate("/login"); return; }
    if (code && !error) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) { toast({ title: "Erro de autenticação", description: "Link de redefinição inválido ou expirado.", variant: "destructive" }); navigate("/login"); }
      });
    }
  }, [searchParams, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErrors({});
    if (password !== confirmPassword) { setErrors({ confirmPassword: "As senhas não coincidem." }); setLoading(false); return; }
    const validation = validateAndSanitize(resetPasswordSchema, { password });
    if (!validation.success) { setErrors(validation.fieldErrors || {}); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast({ title: "Sessão expirada", description: "Solicite um novo link de redefinição.", variant: "destructive" }); navigate("/login"); setLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast({ title: "Erro ao redefinir senha", description: error.message, variant: "destructive" }); }
    else { setSuccess(true); toast({ title: "Senha redefinida com sucesso!" }); setTimeout(async () => { await supabase.auth.signOut(); navigate("/login"); }, 3000); }
    setLoading(false);
  };

  if (success) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md"><CardHeader className="text-center"><CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-4" /><CardTitle className="text-green-600">Senha redefinida!</CardTitle><CardDescription>Você será redirecionado para a página de login.</CardDescription></CardHeader><CardContent className="text-center"><Button onClick={() => navigate("/login")} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">Ir para Login</Button></CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4"><div className="w-10 h-10 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"><MessageSquare className="w-6 h-6 text-white" /></div><span className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Cobraae</span></div>
          <CardTitle>Redefinir senha</CardTitle><CardDescription>Digite sua nova senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="password">Nova senha</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={loading} className={errors.password ? "border-red-500 pr-10" : "pr-10"} required /><Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>{errors.password && <p className="text-sm text-red-500">{errors.password}</p>}</div>
            <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar nova senha</Label><div className="relative"><Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" disabled={loading} className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"} required /><Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>{errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}</div>
            <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-emerald-600" disabled={loading}>{loading ? "Redefinindo..." : "Redefinir senha"}</Button>
          </form>
          <div className="mt-4 text-center"><Button variant="ghost" onClick={() => navigate("/login")} className="text-sm text-gray-500 hover:underline p-0 h-auto">Voltar ao login</Button></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;