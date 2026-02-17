
-- Create profiles table for Kickstart Hub
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

-- Create app_role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'doorman');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create residents table
CREATE TABLE IF NOT EXISTS public.residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  block text NOT NULL,
  apartment text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view residents" ON public.residents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert residents" ON public.residents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update residents" ON public.residents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete residents" ON public.residents FOR DELETE TO authenticated USING (true);

-- Create packages table
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  carrier text,
  ocr_raw_text text,
  ai_suggestion jsonb,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  received_by uuid REFERENCES auth.users(id),
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  picked_up_at timestamp with time zone,
  picked_up_by text,
  signature_data text,
  pickup_confirmation_sent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view packages" ON public.packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert packages" ON public.packages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update packages" ON public.packages FOR UPDATE TO authenticated USING (true);

-- Create trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Create private storage bucket for package photos
INSERT INTO storage.buckets (id, name, public) VALUES ('package-photos', 'package-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for package-photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'package-photos');
CREATE POLICY "Authenticated users can view photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'package-photos');

-- Update timestamps trigger for new tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
