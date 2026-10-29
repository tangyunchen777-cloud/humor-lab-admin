import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { PageTitle,dateLabel } from "@/components/common";
export default async function ResponsesPage({searchParams}:{searchParams:Promise<{request?:string;page?:string}>}){
 const {supabase}=await requireAdmin(),p=await searchParams,page=Math.max(0,Math.min(10000,Number(p.page)||0)),request=/^[0-9a-f-]{36}$/i.test(p.request||'')?p.request!:'';
 let query=supabase.from("llm_responses").select("*",{count:"exact"}).order("created_at",{ascending:false}).range(page*25,page*25+24);
 if(request)query=query.eq("request_id",request);
 const {data,error,count}=await query;if(error)throw new Error("LLM responses could not load.");
 const href=(n:number)=>`/responses?${new URLSearchParams({page:String(n),request})}`;
 return <><PageTitle eyebrow="Model observability" title="Inside the response." description="Actual model attempts, returned text, safe error messages, HTTP status, latency, and token usage when supplied by the provider. Missing historical measurements are shown as unavailable."/>
 <form className="mb-5 flex flex-wrap gap-3"><input name="request" className="field max-w-lg" aria-label="Request ID" placeholder="Filter by full request UUID" defaultValue={request}/><button className="btn btn-primary">Filter</button>{request&&<Link className="btn btn-secondary" href="/responses">Clear filter</Link>}</form>
 <p className="mb-4 text-xs text-stone-500">{count||0} matching model responses · page {page+1}</p>
 <div className="space-y-5">{data?.map(row=><article key={row.id} className="panel p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] text-stone-500">{row.id}</p><h2 className="mt-2 text-lg font-semibold">{row.model_key}</h2></div><span className={`pill ${row.success?'bg-green-50 text-green-800':'bg-red-50 text-red-700'}`}>{row.success?'Returned caption':'Failed attempt'}</span></div><div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-xs text-stone-500"><span>Attempt {row.attempt}</span><span>HTTP {row.http_status??'Unavailable'}</span><span>{row.latency_ms===null?'Latency unavailable':`${row.latency_ms} ms`}</span><span>Tokens {row.input_tokens??'—'} in / {row.output_tokens??'—'} out</span><span>{dateLabel(row.created_at)}</span></div>{row.output_text&&<p className="mt-5 whitespace-pre-wrap rounded-xl bg-stone-50 p-5 text-sm leading-7">{row.output_text}</p>}{row.error_message&&<p className="mt-4 text-sm text-red-700">{row.error_message}</p>}<Link className="mt-5 inline-block text-xs font-semibold underline" href={`/requests?q=${row.request_id}`}>View request {row.request_id.slice(0,8)} →</Link></article>)}</div>
 {!data?.length&&<div className="panel p-10 text-center text-sm text-stone-500">No responses match this request. Pending requests may not have an attempt yet.</div>}
 <div className="mt-5 flex justify-between text-xs">{page>0?<Link href={href(page-1)}>← Previous</Link>:<span/>}{(page+1)*25<(count||0)&&<Link href={href(page+1)}>Next →</Link>}</div></>;
}
