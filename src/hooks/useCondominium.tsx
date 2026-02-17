import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Condominium {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  unit_type: string;
  group_label: string;
  unit_label: string;
  groups: string[];
  setup_completed: boolean;
  admin_user_id: string;
  created_at: string;
  updated_at: string;
}

interface CondominiumContextType {
  condominium: Condominium | null;
  isLoading: boolean;
  needsSetup: boolean;
  refetch: () => Promise<void>;
}

const CondominiumContext = createContext<CondominiumContextType | undefined>(undefined);

export function CondominiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCondominium = async () => {
    if (!user) {
      setCondominium(null);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('condominiums')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data) {
      setCondominium({
        ...data,
        groups: Array.isArray(data.groups) ? data.groups as string[] : [],
      });
    } else {
      setCondominium(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCondominium();
  }, [user]);

  const needsSetup = !isLoading && (!condominium || !condominium.setup_completed);

  return (
    <CondominiumContext.Provider value={{ condominium, isLoading, needsSetup, refetch: fetchCondominium }}>
      {children}
    </CondominiumContext.Provider>
  );
}

export function useCondominium() {
  const context = useContext(CondominiumContext);
  if (context === undefined) {
    throw new Error('useCondominium must be used within a CondominiumProvider');
  }
  return context;
}
