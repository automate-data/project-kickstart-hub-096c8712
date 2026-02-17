import { z } from "zod";

const COMMON_PASSWORDS = ["password", "123456", "123456789", "12345678", "12345", "1234567", "password123", "admin", "letmein", "welcome"];

export const checkPasswordStrength = (password: string): { score: number; feedback: string[]; isStrong: boolean } => {
  const feedback: string[] = []; let score = 0;
  if (password.length >= 12) score += 2; else if (password.length >= 8) score += 1; else feedback.push("Use pelo menos 12 caracteres");
  if (/[a-z]/.test(password)) score += 1; else feedback.push("Adicione letras minúsculas");
  if (/[A-Z]/.test(password)) score += 1; else feedback.push("Adicione letras maiúsculas");
  if (/\d/.test(password)) score += 1; else feedback.push("Adicione números");
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 2; else feedback.push("Adicione símbolos especiais");
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) { score = 0; feedback.push("Evite senhas muito comuns"); }
  return { score, feedback, isStrong: score >= 6 };
};

export const loginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório").max(254, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo").refine(name => !/[<>\"'&]/.test(name), "Nome contém caracteres não permitidos"),
  email: z.string().email("Email inválido").max(254, "Email muito longo"),
  company: z.string().min(2, "Nome da empresa deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Formato de telefone inválido"),
  password: z.string().min(12, "Senha deve ter pelo menos 12 caracteres").max(128, "Senha muito longa").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, "Senha deve conter ao menos uma letra minúscula, maiúscula, um número e um símbolo especial"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, { message: "Senhas não coincidem", path: ["confirmPassword"] });

export const boletoSchema = z.object({
  clientName: z.string().min(2, "Nome do cliente deve ter pelo menos 2 caracteres"),
  valor: z.string().regex(/^R\$\s\d+,\d{2}$/, "Formato de valor inválido"),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida"),
});

export const sanitizeString = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').replace(/[\"']/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim().slice(0, 1000);
};

export const validateAndSanitize = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[]; fieldErrors?: Record<string, string> } => {
  try { const result = schema.parse(data); return { success: true, data: result }; }
  catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      const errors = error.errors.map(err => { const field = err.path.join('.'); fieldErrors[field] = err.message; return err.message; });
      return { success: false, errors, fieldErrors };
    }
    return { success: false, errors: ["Erro de validação desconhecido"], fieldErrors: {} };
  }
};

export const validateFile = (file: File, options: { maxSize?: number; allowedTypes?: string[]; allowedExtensions?: string[] } = {}): { valid: boolean; error?: string } => {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ["application/pdf"], allowedExtensions = [".pdf"] } = options;
  if (!file) return { valid: false, error: "Nenhum arquivo selecionado" };
  if (file.size > maxSize) return { valid: false, error: `Arquivo muito grande (máximo ${Math.round(maxSize / (1024 * 1024))}MB)` };
  if (!allowedTypes.includes(file.type)) return { valid: false, error: "Tipo de arquivo não permitido" };
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) return { valid: false, error: "Extensão de arquivo não permitida" };
  return { valid: true };
};

const requestCounts = new Map<string, { count: number; resetTime: number }>();
export const checkRateLimit = (key: string, limit: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now(); const entry = requestCounts.get(key);
  if (!entry || now > entry.resetTime) { requestCounts.set(key, { count: 1, resetTime: now + windowMs }); return true; }
  if (entry.count >= limit) return false;
  entry.count++; return true;
};