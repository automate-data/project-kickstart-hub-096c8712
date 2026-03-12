
-- Drop the incorrect trigger
DROP TRIGGER IF EXISTS update_residents_updated_at ON public.residents;

-- Recreate using the correct function that references updated_at
CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
