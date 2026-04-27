
CREATE OR REPLACE FUNCTION public.validate_custody_mode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.custody_mode NOT IN ('simple', 'simple_locker', 'multi_custody') THEN
    RAISE EXCEPTION 'Invalid custody_mode: %. Must be one of: simple, simple_locker, multi_custody', NEW.custody_mode;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_custody_mode_trigger ON public.condominiums;
CREATE TRIGGER validate_custody_mode_trigger
  BEFORE INSERT OR UPDATE OF custody_mode ON public.condominiums
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_custody_mode();
