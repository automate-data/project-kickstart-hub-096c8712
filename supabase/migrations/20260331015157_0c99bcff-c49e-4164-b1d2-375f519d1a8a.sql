
-- 1. Add custody_mode to condominiums (defaults to 'simple', no breaking change)
ALTER TABLE condominiums 
ADD COLUMN IF NOT EXISTS custody_mode TEXT NOT NULL DEFAULT 'simple' 
CHECK (custody_mode IN ('simple', 'multi_custody'));

-- 2. Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('central', 'tower', 'locker')),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS for locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view locations of their condominiums"
ON locations FOR SELECT
TO authenticated
USING (
  condominium_id IN (
    SELECT condominium_id FROM user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage locations"
ON locations FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  AND condominium_id IN (
    SELECT condominium_id FROM user_roles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND condominium_id IN (
    SELECT condominium_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- 4. updated_at trigger for locations
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
