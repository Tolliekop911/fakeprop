import { supabase } from "@/integrations/supabase/client";

export const logAdminAction = async (
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_logs").insert([{
      admin_user_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId ?? undefined,
      details: (details as any) ?? undefined,
    }]);
  } catch (e) {
    console.error("Failed to log admin action:", e);
  }
};
