import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

const DELETION_FAILED = "Your account could not be deleted right now. Please try again.";

/** Storage-owned objects must be removed before Supabase Auth can delete their owner. */
export async function deleteAccountData(admin: SupabaseClient<Database>, userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error(DELETION_FAILED);
  }
  const avatars = admin.storage.from("avatars");
  for (let batch = 0; ; batch += 1) {
    if (batch >= 100) throw new Error(DELETION_FAILED);
    const { data, error } = await avatars.list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) throw new Error(DELETION_FAILED);
    if (!data.length) break;
    // The application stores flat avatar files only. Unexpected folders fail closed.
    if (
      data.some(
        (file) =>
          !file.id ||
          !file.name ||
          file.name === "." ||
          file.name === ".." ||
          /[/\\]/.test(file.name),
      )
    ) {
      throw new Error(DELETION_FAILED);
    }
    const removed = await avatars.remove(data.map((file) => `${userId}/${file.name}`));
    if (removed.error) throw new Error(DELETION_FAILED);
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(DELETION_FAILED);
}
