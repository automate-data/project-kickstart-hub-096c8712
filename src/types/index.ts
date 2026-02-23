export type AppRole = 'admin' | 'doorman';

export interface SensitiveRegion {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  rg: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Resident {
  id: string;
  full_name: string;
  phone: string;
  block: string;
  apartment: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  resident_id: string | null;
  photo_url: string;
  carrier: string | null;
  ocr_raw_text: string | null;
  ai_suggestion: AISuggestion | null;
  notes: string | null;
  status: 'pending' | 'picked_up';
  received_by: string | null;
  received_at: string;
  picked_up_at: string | null;
  picked_up_by: string | null;
  created_at: string;
  updated_at: string;
  resident?: Resident;
}

export interface AISuggestion {
  resident_name?: string;
  block?: string;
  apartment?: string;
  unit?: string;
  carrier?: string;
  marketplace?: string;
  tracking_code?: string;
  weight_kg?: number;
  logistics_origin?: string;
  confidence?: number;
}
