"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export type ChainState = { error?: string; success?: string; updatedAt?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function savePromptChain(_previous: ChainState, form: FormData): Promise<ChainState> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? ""), version = String(form.get("updated_at") ?? "");
  const name = String(form.get("name") ?? "").trim(), description = String(form.get("description") ?? "").trim();
  const raw = String(form.get("steps") ?? "");
  if (!uuid.test(id) || !Number.isFinite(Date.parse(version))) return { error: "Refresh this chain before saving." };
  if (!name || name.length > 120 || !description || description.length > 1000) return { error: "Check the chain name and description." };
  if (raw.length > 20000) return { error: "The instructions are too long." };
  let steps: { id: string; name: string; instruction: string }[];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length || parsed.length > 20) throw new Error();
    steps = parsed.map((step: unknown) => {
      if (typeof step !== "object" || step === null || !("id" in step) || !("name" in step) || !("instruction" in step)) throw new Error();
      if (typeof step.id !== "string" || !uuid.test(step.id) || typeof step.name !== "string" || typeof step.instruction !== "string") throw new Error();
      const name = step.name.trim(), instruction = step.instruction.trim();
      if (!name || name.length > 120 || !instruction || instruction.length > 2000) throw new Error();
      return { id: step.id, name, instruction };
    });
    if (new Set(steps.map(step => step.id)).size !== steps.length || steps.reduce((sum, step) => sum + step.instruction.length, 0) > 8000) throw new Error();
  } catch {
    return { error: "Use a name and instruction for each step, with at most 8000 instruction characters in total." };
  }
  const { data, error } = await supabase.rpc("admin_save_prompt_chain", {
    chain_uuid: id, expected_updated_at: version, chain_name: name, chain_description: description, chain_steps: steps,
  });
  if (error || typeof data !== "string") return { error: error?.code === "40001"
    ? "Another admin changed this chain. Refresh the page before saving."
    : error?.code === "22023" ? "Check the instructions and include each existing step once."
    : "The prompt chain could not be saved. Please try again." };
  revalidatePath("/pipeline");
  revalidatePath("/activity");
  return { success: "Chain saved. New captions will use these instructions; previous requests stay unchanged.", updatedAt: data };
}
