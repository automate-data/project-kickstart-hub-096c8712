import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesAPI, type Cliente, type ClienteInsert, type ClienteUpdate } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useClientes = () => useQuery({ queryKey: ['clientes'], queryFn: clientesAPI.getAll });
export const useCreateCliente = () => {
  const qc = useQueryClient(); const { toast } = useToast();
  return useMutation({
    mutationFn: async (cliente: Omit<ClienteInsert, 'user_id'>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Não autenticado');
      const { data, error } = await supabase.from('clientes').insert({ ...cliente, user_id: session.user.id }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast({ title: "Cliente cadastrado!" }); },
    onError: (e: Error) => { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  });
};
export const useUpdateCliente = () => {
  const qc = useQueryClient(); const { toast } = useToast();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: ClienteUpdate }) => clientesAPI.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast({ title: "Cliente atualizado!" }); }, onError: (e: Error) => { toast({ title: "Erro", description: e.message, variant: "destructive" }); } });
};
export const useDeleteCliente = () => {
  const qc = useQueryClient(); const { toast } = useToast();
  return useMutation({ mutationFn: clientesAPI.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast({ title: "Cliente removido!" }); }, onError: (e: Error) => { toast({ title: "Erro", description: e.message, variant: "destructive" }); } });
};