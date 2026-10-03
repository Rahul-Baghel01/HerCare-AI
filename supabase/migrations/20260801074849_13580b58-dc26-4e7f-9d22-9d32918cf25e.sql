ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS medical_conditions text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS pregnancy_due_date date,
  ADD COLUMN IF NOT EXISTS notify_period boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_ovulation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_medication boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_water boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_appointment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS share_anonymised_data boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  due_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.weight_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_history TO authenticated;
GRANT ALL ON public.weight_history TO service_role;
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight" ON public.weight_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.health_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_notes TO authenticated;
GRANT ALL ON public.health_notes TO service_role;
ALTER TABLE public.health_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health notes" ON public.health_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_due ON public.notifications(user_id, due_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_user_date ON public.weight_history(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_notes_user_date ON public.health_notes(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_cycles_user_start ON public.cycles(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_date ON public.symptoms(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_moods_user_date ON public.moods(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_medications_user ON public.medications(user_id, active);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date ON public.medication_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_pcos_user_date ON public.pcos_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_fertility_user_date ON public.fertility_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_pregnancy_user_date ON public.pregnancy_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_water_user_date ON public.water_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON public.sleep_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON public.nutrition_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_user_date ON public.exercise_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_user_time ON public.appointments(user_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user_created ON public.ai_chat_history(user_id, created_at);

CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);