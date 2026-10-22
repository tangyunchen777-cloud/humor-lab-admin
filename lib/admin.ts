import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Snapshot } from "@/lib/types";

// Request-scoped only. Every page and mutation calls this DAL, independently of layouts/proxy.
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: token } = await supabase.auth.getClaims();
  const amr: unknown = token?.claims?.amr;
  const oauth = Array.isArray(amr) && amr.some((entry: unknown) => typeof entry === "object" && entry !== null && "method" in entry && entry.method === "oauth");
  if (!oauth || !user.identities?.some(identity => identity.provider === "google")) redirect("/denied");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id, first_name, last_name, is_superadmin").eq("id", user.id).single();
  if (profileError || !profile?.is_superadmin) redirect("/denied");
  return { supabase, user, profile };
});

export const getSnapshot = cache(async (): Promise<Snapshot> => {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_snapshot");
  if (error) { console.error("Admin snapshot failed", error.code); throw new Error("The admin workspace could not load. Try again shortly."); }
  const snapshot = data as Snapshot;
  snapshot.media = snapshot.media.map(media => ({ ...media,
    image_url: media.image_path ? supabase.storage.from("generation-images").getPublicUrl(media.image_path).data.publicUrl : undefined,
  }));
  return snapshot;
});
