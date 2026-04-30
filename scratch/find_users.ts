import { createAdminClient } from "./src/lib/supabase/admin";

async function findUsers() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_settings")
    .select("user_id, display_name")
    .or("display_name.ilike.%test_tutor%,display_name.ilike.%trap_time%");

  if (error) {
    console.error(error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

findUsers();
