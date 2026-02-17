import { useQuery } from "@tanstack/react-query";
import { cobrancasAPI } from "@/lib/supabase-client";
export const useCobrancasLixeira = () => useQuery({ queryKey: ['cobrancas-lixeira'], queryFn: () => cobrancasAPI.getAllDeleted() });