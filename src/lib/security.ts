export const generateNonce = (): string => { const array = new Uint8Array(16); crypto.getRandomValues(array); return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join(''); };

export const sanitizeForStorage = (data: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') sanitized[key] = value.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim().slice(0, 1000);
    else if (typeof value === 'number') sanitized[key] = Math.max(-1000000, Math.min(1000000, value));
    else if (typeof value === 'boolean') sanitized[key] = Boolean(value);
    else if (value === null || value === undefined) sanitized[key] = value;
    else sanitized[key] = sanitizeForStorage(value);
  }
  return sanitized;
};

export const maskSensitiveData = (data: any): any => {
  if (typeof data !== 'object' || data === null) return data;
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  const masked = { ...data };
  for (const field of sensitiveFields) { if (field in masked) masked[field] = '***'; }
  return masked;
};

export const detectInjectionAttempt = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  const suspiciousPatterns = [/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b|\bDROP\b)/i, /<script[^>]*>.*?<\/script>/i, /javascript:/i, /on\w+\s*=/i, /\beval\s*\(/i, /\balert\s*\(/i, /document\.cookie/i, /window\.location/i];
  return suspiciousPatterns.some(pattern => pattern.test(input));
};

export const secureFormInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  if (detectInjectionAttempt(input)) { console.warn('Possible injection attempt detected'); return ''; }
  return input.replace(/[<>]/g, '').replace(/[\"']/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim().slice(0, 1000);
};