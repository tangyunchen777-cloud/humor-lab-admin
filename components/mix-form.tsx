"use client";
import { useActionState } from "react";
import { updateMix } from "@/app/(admin)/manage/actions";
export function MixForm({id,weight,updated_at,name}:{id:string;weight:number;updated_at:string;name:string}){
 const [state,action,pending]=useActionState(updateMix,{});
 return <form action={action} className="space-y-3"><input type="hidden" name="id" value={id}/><input type="hidden" name="updated_at" value={updated_at}/><div className="flex items-end gap-3"><label className="text-xs font-medium">Relative weight<input className="field mt-2 max-w-32" aria-label={`Weight for ${name}`} name="weight" type="number" min={0} max={1000} step={1} required defaultValue={weight}/></label><button className="btn btn-primary" disabled={pending}>{pending?"Saving…":"Save weight"}</button></div>{state.error&&<p role="alert" className="text-xs text-red-700">{state.error}</p>}{state.success&&<p role="status" className="text-xs text-green-800">{state.success}</p>}</form>;
}
