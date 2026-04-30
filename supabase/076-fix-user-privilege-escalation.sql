-- ============================================================
-- Fix C-01: Admin Privilege Escalation via public.users RLS
-- Fix C-02: Role Escalation via Signup Metadata
-- ============================================================

-- 1. Create a trigger function to protect sensitive user columns
CREATE OR REPLACE FUNCTION public.protect_user_sensitive_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If auth.uid() is null, it's the Service Role / Admin Client.
  -- We allow these updates as they come from trusted Server Actions.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- If role, approved, or is_blacklisted is being changed...
  IF (OLD.role IS DISTINCT FROM NEW.role OR 
      OLD.approved IS DISTINCT FROM NEW.approved OR 
      OLD.is_blacklisted IS DISTINCT FROM NEW.is_blacklisted) THEN
    
    -- ...and the person doing it is NOT a verified admin...
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles, approval status, or blacklist status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Attach the protection trigger to the users table
DROP TRIGGER IF EXISTS tr_protect_user_sensitive_columns ON public.users;
CREATE TRIGGER tr_protect_user_sensitive_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_sensitive_columns();

-- 3. Fix the signup trigger (C-02) to never trust role from client metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_with_jwt()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  is_approved BOOLEAN;
  auto_reg BOOLEAN;
  norm_email TEXT;
BEGIN
  -- NEVER trust 'admin' role from client metadata. 
  -- Force 'student' by default, or 'tutor' if they chose it (but it won't be approved yet).
  user_role := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', 'student')));
  
  -- Explicitly block 'admin' escalation via metadata
  IF user_role = 'admin' THEN
    user_role := 'student';
  END IF;

  -- Verify it's one of our allowed roles
  IF user_role NOT IN ('student', 'tutor') THEN
    user_role := 'student';
  END IF;

  -- Admins must be manually promoted; never auto-approve a role from metadata
  is_approved := false; 
  
  -- Check if global auto-approve is enabled for students
  IF user_role = 'student' THEN
    auto_reg := public.is_auto_approve_registrations();
    is_approved := auto_reg;
  END IF;

  INSERT INTO public.users (id, role, approved)
  VALUES (NEW.id, user_role, is_approved)
  ON CONFLICT (id) DO NOTHING;

  -- Sync back to auth metadata for UI consistency
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object('role', user_role, 'approved', is_approved)
  WHERE id = NEW.id;

  norm_email := NULLIF(trim(COALESCE(NEW.email, '')), '');

  IF norm_email IS NOT NULL THEN
    INSERT INTO public.registration_requests (email, role, status)
    VALUES (
      norm_email,
      user_role,
      CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
    )
    ON CONFLICT (email) DO UPDATE SET
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Explicitly deny-by-default for user-driven updates to sensitive columns
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);
  -- The trigger above provides the final line of defense for column-level security.
