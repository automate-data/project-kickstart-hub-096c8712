
-- 1. Add tower_doorman to the existing role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'tower_doorman';

-- 2. Add location_id to user_roles (nullable — only used for tower_doorman)
ALTER TABLE user_roles
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- 3. Add current_location_id to packages (nullable — only used in multi_custody mode)
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS current_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- 4. Create package_events table
CREATE TABLE IF NOT EXISTS package_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  transferred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_data TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS for package_events
ALTER TABLE package_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view events of their condominium packages"
ON package_events FOR SELECT
TO authenticated
USING (
  package_id IN (
    SELECT p.id FROM packages p
    JOIN residents r ON r.id = p.resident_id
    WHERE r.condominium_id IN (
      SELECT condominium_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Authenticated users can insert package events"
ON package_events FOR INSERT
TO authenticated
WITH CHECK (
  package_id IN (
    SELECT p.id FROM packages p
    JOIN residents r ON r.id = p.resident_id
    WHERE r.condominium_id IN (
      SELECT condominium_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
);
