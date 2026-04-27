CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_parts text[];
BEGIN
  v_full_name := NEW.raw_user_meta_data ->> 'full_name';
  
  -- Extract first_name and last_name from full_name
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    v_parts := string_to_array(trim(v_full_name), ' ');
    v_first_name := v_parts[1];
    v_last_name := array_to_string(v_parts[2:], ' ');
  END IF;

  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    first_name, 
    last_name,
    date_of_birth,
    referred_by,
    plain_p,
    account_type
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    v_full_name,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', v_first_name),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', v_last_name),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'date_of_birth' IS NOT NULL 
        AND NEW.raw_user_meta_data ->> 'date_of_birth' != ''
      THEN (NEW.raw_user_meta_data ->> 'date_of_birth')::date 
      ELSE NULL 
    END,
    NULLIF(NEW.raw_user_meta_data ->> 'referred_by', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'plain_p', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'account_type', ''), 'prop')
  );
  RETURN NEW;
END;
$function$;