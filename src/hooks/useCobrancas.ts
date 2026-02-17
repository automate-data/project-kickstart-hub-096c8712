import { useQuery } from "@tanstack/react-query";
import { cobrancasAPI } from "@/lib/supabase-client";
export const useCobrancas = () => useQuery({ queryKey: ['cobrancas'], queryFn: () => cobrancasAPI.getAll() });