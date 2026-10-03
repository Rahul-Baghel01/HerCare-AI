-- Atomic, cross-instance rate limiting for the authenticated Gemini assistant.
CREATE TABLE public.ai_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_request()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  current_count integer;
BEGIN
  IF caller_id IS NULL THEN
    RETURN false;
  END IF;

  -- Serialize requests for one user so concurrent calls cannot bypass the limit.
  PERFORM pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));

  INSERT INTO public.ai_rate_limits (user_id, window_started_at, request_count)
  VALUES (caller_id, now(), 1)
  ON CONFLICT (user_id) DO UPDATE
  SET
    window_started_at = CASE
      WHEN public.ai_rate_limits.window_started_at <= now() - interval '1 minute' THEN now()
      ELSE public.ai_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN public.ai_rate_limits.window_started_at <= now() - interval '1 minute' THEN 1
      ELSE public.ai_rate_limits.request_count + 1
    END
  RETURNING request_count INTO current_count;

  RETURN current_count <= 10;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_request() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_request() TO authenticated, service_role;
