import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const today = () => format(new Date(), "yyyy-MM-dd");

export function useUser() {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    staleTime: 60_000,
  });
}

export function useProfile() {
  const { data: user } = useUser();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

type TableName =
  | "cycles"
  | "symptoms"
  | "moods"
  | "medications"
  | "medication_logs"
  | "pcos_logs"
  | "fertility_logs"
  | "pregnancy_logs"
  | "water_logs"
  | "sleep_logs"
  | "nutrition_logs"
  | "exercise_logs"
  | "appointments"
  | "reminders"
  | "reports"
  | "weight_history"
  | "health_notes"
  | "notifications"
  | "ai_chat_history";

export type { TableName };

export function useRows<T = Record<string, unknown>>(
  table: TableName,
  opts?: {
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    rangeStart?: string;
    rangeEnd?: string;
  },
) {
  const { data: user } = useUser();
  const orderBy = opts?.orderBy ?? "created_at";
  return useQuery({
    queryKey: [
      table,
      user?.id,
      orderBy,
      opts?.limit ?? 200,
      opts?.ascending ?? false,
      opts?.rangeStart,
      opts?.rangeEnd,
    ],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      let query = supabase.from(table).select("*").eq("user_id", user!.id);
      if (opts?.rangeStart) query = query.gte(orderBy, opts.rangeStart);
      if (opts?.rangeEnd) query = query.lte(orderBy, opts.rangeEnd);
      const { data, error } = await query
        .order(orderBy, { ascending: opts?.ascending ?? false })
        .order("created_at", { ascending: opts?.ascending ?? false })
        .limit(opts?.limit ?? 200);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useInsertRow(table: TableName, successMessage = "Saved") {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!user) throw new Error("You need to be signed in.");
      const { error } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...values, user_id: user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: [table] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!user) throw new Error("You need to be signed in.");
      const { error } = await supabase
        .from("profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(values as any)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRow(table: TableName) {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("You need to be signed in.");
      const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: [table] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateRow(table: TableName, successMessage = "Updated") {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      if (!user) throw new Error("You need to be signed in.");
      const { error } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ ...values, user_id: user.id } as any)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: [table] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/** Insert or update today's row for tables that hold one entry per day. */
export function useUpsertDaily(table: TableName, successMessage = "Saved") {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  return useMutation({
    mutationFn: async ({
      logDate,
      values,
    }: {
      logDate: string;
      values: Record<string, unknown>;
    }) => {
      if (!user) throw new Error("You need to be signed in.");
      const existing = await supabase
        .from(table)
        .select("id")
        .eq("user_id", user.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("log_date" as any, logDate)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data?.id) {
        const { error } = await supabase
          .from(table)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ ...values, user_id: user.id } as any)
          .eq("id", existing.data.id)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...values, log_date: logDate, user_id: user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(successMessage);
      return queryClient.invalidateQueries({ queryKey: [table] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useAvatarUpload() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("You need to be signed in.");
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
      if (file.size > 4 * 1024 * 1024) throw new Error("Images must be under 4 MB.");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const upload = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upload.error) throw upload.error;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avatar updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["avatar-url"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useAvatarUrl(path?: string | null) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: Boolean(path),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export async function exportAllData(userId: string) {
  const tables: TableName[] = [
    "cycles",
    "symptoms",
    "moods",
    "medications",
    "medication_logs",
    "pcos_logs",
    "fertility_logs",
    "pregnancy_logs",
    "water_logs",
    "sleep_logs",
    "nutrition_logs",
    "exercise_logs",
    "appointments",
    "reminders",
    "weight_history",
    "health_notes",
    "ai_chat_history",
    "reports",
    "notifications",
  ];
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
  const profile = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (profile.error) throw profile.error;
  out["profile"] = profile.data;
  for (const table of tables) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .order("id")
        .range(offset, offset + 999);
      if (error)
        throw new Error(
          `Could not export ${table}. Please retry; no incomplete file was downloaded.`,
        );
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    out[table] = rows;
  }
  return out;
}
