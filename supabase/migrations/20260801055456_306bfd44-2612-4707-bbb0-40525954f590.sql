-- Lock down the SECURITY DEFINER helper
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- user_roles: own rows only for signed-in users; management via service role
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

-- articles
DROP POLICY IF EXISTS "read published articles" ON public.articles;
DROP POLICY IF EXISTS "admins write articles" ON public.articles;
CREATE POLICY "read published articles" ON public.articles
  FOR SELECT
  USING (
    published
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );
CREATE POLICY "admins write articles" ON public.articles
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  ));

-- faqs
DROP POLICY IF EXISTS "read faqs" ON public.faqs;
DROP POLICY IF EXISTS "admins write faqs" ON public.faqs;
CREATE POLICY "read faqs" ON public.faqs
  FOR SELECT
  USING (
    published
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );
CREATE POLICY "admins write faqs" ON public.faqs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  ));

-- announcements
DROP POLICY IF EXISTS "admins write announcements" ON public.announcements;
CREATE POLICY "admins write announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  ));