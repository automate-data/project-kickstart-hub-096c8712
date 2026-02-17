import React, { createContext, useContext, useState, ReactNode } from 'react';
interface CompanySettings { companyName: string; email: string; phone: string; whatsappToken: string; notifications: boolean; autoReminders: boolean; reminderDays: string; }
interface CompanyContextType { settings: CompanySettings; updateSettings: (s: Partial<CompanySettings>) => void; }
const defaultSettings: CompanySettings = { companyName: "Minha Empresa", email: "contato@empresa.com", phone: "(11) 99999-9999", whatsappToken: "", notifications: true, autoReminders: true, reminderDays: "3" };
const CompanyContext = createContext<CompanyContextType | undefined>(undefined);
export const CompanyProvider = ({ children }: { children: ReactNode }) => { const [settings, setSettings] = useState<CompanySettings>(defaultSettings); const updateSettings = (s: Partial<CompanySettings>) => setSettings(prev => ({ ...prev, ...s })); return <CompanyContext.Provider value={{ settings, updateSettings }}>{children}</CompanyContext.Provider>; };
export const useCompany = () => { const ctx = useContext(CompanyContext); if (!ctx) throw new Error('useCompany deve ser usado dentro de um CompanyProvider'); return ctx; };