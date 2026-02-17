-- Drop the broken trigger
DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;

-- Create a dedicated function for English-named tables
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger using the correct function
CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();