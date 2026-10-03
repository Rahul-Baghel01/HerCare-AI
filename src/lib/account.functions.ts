import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently deletes the signed-in user's account and all of their data. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deleteAccountData } = await import("./account-deletion.server");
    try {
      await deleteAccountData(supabaseAdmin, userId);
    } catch (error) {
      const { logServerError } = await import("./logger.server");
      logServerError("account.delete_failed", error);
      throw new Error("Your account could not be deleted right now. Please try again.");
    }
    return { ok: true };
  });
