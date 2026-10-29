import { requireAdmin } from "@/lib/admin";
import { PageTitle } from "@/components/common";
import { MixForm } from "@/components/mix-form";
type Chain={id:string;name:string;style:string;description:string};
type Step={id:string;chain_id:string;position:number;name:string;instruction:string};
type Mix={id:string;chain_id:string;weight:number;updated_at:string};
export default async function PipelinePage(){
 const {supabase}=await requireAdmin();
 const [chains,steps,mix]=await Promise.all([supabase.from("prompt_chains").select("*").order("style"),supabase.from("prompt_chain_steps").select("*").order("position"),supabase.from("prompt_chain_mix").select("*")]);
 if(chains.error||steps.error||mix.error)throw new Error("The prompt pipeline could not load.");
 const cs=chains.data as Chain[],ss=steps.data as Step[],ms=mix.data as Mix[];
 return <><PageTitle eyebrow="The creative engine" title="Prompt chains & mix" description="Read the exact ordered instructions and control how often each variation is selected. Steps are compiled into one LLM request, not separate model calls."/>
 <div className="mb-8 grid gap-4 sm:grid-cols-3">{[["Prompt chains",cs.length],["Ordered steps",ss.length],["Active variations",ms.filter(m=>m.weight>0).length]].map(([label,value])=><div className="panel p-5" key={label}><p className="eyebrow">{label}</p><p className="mt-3 font-mono text-3xl">{value}</p></div>)}</div>
 <p className="mb-7 rounded-xl bg-[#edf3e5] p-4 text-sm leading-6">Creators choose a humor style. Within that style, a chain is selected by relative weight. A weight of 0 pauses a variation; keep at least one positive weight per style. Changes affect new requests only.</p>
 {['witty','deadpan','absurd'].map(style=>{const group=cs.filter(c=>c.style===style),total=ms.filter(m=>group.some(c=>c.id===m.chain_id)).reduce((sum,m)=>sum+m.weight,0);return <section key={style} className="mb-9"><h2 className="mb-4 text-xl font-semibold capitalize">{style}</h2><div className="grid gap-5 xl:grid-cols-2">{group.map(chain=>{const row=ms.find(m=>m.chain_id===chain.id);return <article key={chain.id} className="panel p-6"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-stone-500">{chain.id}</p><h3 className="mt-2 font-semibold">{chain.name}</h3></div><span className="pill bg-[#edf3e5]">{row&&total?Math.round(row.weight/total*100):0}% of this style</span></div><p className="mt-3 text-xs leading-6 text-stone-500">{chain.description}</p><ol className="my-5 space-y-4">{ss.filter(s=>s.chain_id===chain.id).map(step=><li key={step.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-semibold">{step.position}. {step.name}</p><p className="mt-2 text-xs leading-6 text-stone-600">{step.instruction}</p><p className="mt-2 font-mono text-[9px] text-stone-400">{step.id}</p></li>)}</ol>{row&&<MixForm key={row.updated_at} {...row} name={chain.name}/>}</article>})}</div></section>})}</>;
}
