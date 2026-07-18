-- P#036 Wrapped OG slides: image_url is an array of 5 slide URLs.

ALTER TABLE public.wrapped_reports
  ALTER COLUMN image_url TYPE jsonb
  USING CASE
    WHEN image_url IS NULL THEN NULL
    WHEN left(btrim(image_url), 1) = '[' THEN image_url::jsonb
    ELSE jsonb_build_array(image_url)
  END;

COMMENT ON COLUMN public.wrapped_reports.image_url IS
  'Array of 5 OG slide URLs for /api/og/wrapped?token=&slide=1..5';
