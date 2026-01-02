-- Update JWT metadata to include user role
-- This function is called via Supabase Auth hooks or can be used in triggers

CREATE OR REPLACE FUNCTION update_user_jwt_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's JWT metadata with role and approval status
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'role', NEW.role,
    'approved', NEW.approved
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update JWT metadata when user is updated
CREATE TRIGGER update_jwt_metadata_on_user_update
  AFTER UPDATE OF role, approved ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_jwt_metadata();

-- Also update on initial user creation
CREATE OR REPLACE FUNCTION handle_new_user_with_jwt()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  is_approved BOOLEAN;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  is_approved := CASE WHEN user_role = 'admin' THEN true ELSE false END;
  
  -- Create user record
  INSERT INTO public.users (id, role, approved)
  VALUES (NEW.id, user_role, is_approved)
  ON CONFLICT (id) DO NOTHING;
  
  -- Update JWT metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'role', user_role,
    'approved', is_approved
  )
  WHERE id = NEW.id;
  
  -- Create registration request (unless admin)
  IF user_role != 'admin' THEN
    INSERT INTO public.registration_requests (email, role, status)
    VALUES (NEW.email, user_role, 'pending')
    ON CONFLICT (email) DO UPDATE SET
      status = 'pending',
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_with_jwt();

