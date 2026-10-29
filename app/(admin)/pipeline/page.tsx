import { requireAdmin } from "@/lib/admin";
import { PageTitle } from "@/components/common";
import { PromptChainCard, type PromptChain, type PromptStep, type PromptMix } from "@/components/prompt-chain-card";

export default async function PipelinePage() {
  const { supabase } = await requireAdmin();
  const [chains, steps, mix] = await Promise.all([
    supabase.from("prompt_chains").select("id,name,style,description,updated_at").order("style").order("created_at"),
    supabase.from("prompt_chain_steps").select("id,chain_id,position,name,instruction").order("position"),
    supabase.from("prompt_chain_mix").select("id,chain_id,weight,updated_at"),
  ]);
  if (chains.error || steps.error || mix.error) throw new Error("The prompt pipeline could not load.");
  const cs = chains.data as PromptChain[], ss = steps.data as PromptStep[], ms = mix.data as PromptMix[];
  return <>
    <PageTitle eyebrow="The creative engine" title="Prompt chains & mix" description="Edit each chain’s name, description, and ordered instructions, then control how often it is selected. Steps are compiled into one LLM request." />
    <div className="mb-8 grid gap-4 sm:grid-cols-3">{[["Prompt chains", cs.length], ["Ordered steps", ss.length], ["Active variations", ms.filter(m => m.weight > 0).length]].map(([label, value]) => <div className="panel p-5" key={label}><p className="eyebrow">{label}</p><p className="mt-3 font-mono text-3xl">{value}</p></div>)}</div>
    <p className="mb-7 rounded-xl bg-[#edf3e5] p-4 text-sm leading-6">Creators choose a humor style. Within that style, a chain is selected by relative weight. A weight of 0 pauses a variation; keep at least one positive weight per style. Saved instructions affect new requests only. Existing captions and prompt snapshots stay unchanged.</p>
    {["witty", "deadpan", "absurd"].map(style => {
      const group = cs.filter(c => c.style === style);
      const total = ms.filter(m => group.some(c => c.id === m.chain_id)).reduce((sum, m) => sum + m.weight, 0);
      return <section key={style} className="mb-9"><h2 className="mb-4 text-xl font-semibold capitalize">{style}</h2><div className="grid items-start gap-5 xl:grid-cols-2">{group.map(chain => {
        const row = ms.find(m => m.chain_id === chain.id);
        return <PromptChainCard key={chain.id} chain={chain} steps={ss.filter(step => step.chain_id === chain.id)} mix={row} percentage={row && total ? Math.round(row.weight / total * 100) : 0} />;
      })}</div></section>;
    })}
  </>;
}
