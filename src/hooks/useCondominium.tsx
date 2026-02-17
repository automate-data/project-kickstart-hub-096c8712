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
  condominiums: Condominium[];
  isLoading: boolean;
  needsSetup: boolean;
  selectCondominium: (id: string) => void;
  refetch: () => Promise<void>;
}

const CondominiumContext = createContext<CondominiumContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_condominium_id';

export function CondominiumProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCondominiums = async () => {
    if (!user) {
      setCondominiums([]);
      setIsLoading(false);
      return;
    }

    let data: any[] | null = null;

    if (role === 'admin') {
      // Admins see all condominiums
      const res = await supabase
        .from('condominiums')
        .select('*')
        .order('name');
      data = res.data;
    } else {
      // Non-admins only see condominiums they're assigned to
      const { data: roles } = await supabase
        .from('user_roles')
        .select('condominium_id')
        .eq('user_id', user.id)
        .not('condominium_id', 'is', null);

      const condIds = roles?.map(r => r.condominium_id).filter(Boolean) || [];

      if (condIds.length > 0) {
        const res = await supabase
          .from('condominiums')
          .select('*')
          .in('id', condIds)
          .order('name');
        data = res.data;
      } else {
        data = [];
      }
    }

    if (data && data.length > 0) {
      const mapped = data.map(d => ({
        ...d,
        groups: Array.isArray(d.groups) ? d.groups as string[] : [],
      }));
      setCondominiums(mapped);

      const validIds = mapped.map(c => c.id);
      if (!selectedId || !validIds.includes(selectedId)) {
        const newId = mapped[0].id;
        setSelectedId(newId);
        try { localStorage.setItem(STORAGE_KEY, newId); } catch {}
      }
    } else {
      setCondominiums([]);
      setSelectedId(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && role !== undefined) {
      fetchCondominiums();
    }
  }, [user, role]);

  const selectCondominium = (id: string) => {
    setSelectedId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  };

  const condominium = condominiums.find(c => c.id === selectedId) || null;
  const needsSetup = !isLoading && condominiums.length === 0;

  return (
    <CondominiumContext.Provider value={{ condominium, condominiums, isLoading, needsSetup, selectCondominium, refetch: fetchCondominiums }}>
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
