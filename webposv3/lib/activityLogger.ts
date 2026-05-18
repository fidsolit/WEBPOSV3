import { supabase } from "@/lib/supabaseClient";

export async function logUserActivity(activityType: "login" | "logout") {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("branch_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.warn("Unable to load profile for activity log:", profileError.message);
    return;
  }

  const { error } = await supabase.from("user_activity_logs").insert([
    {
      user_id: user.id,
      branch_id: profile?.branch_id ?? null,
      activity_type: activityType,
    },
  ]);

  if (error) {
    console.warn("Unable to write user activity log:", error.message);
  }
}
