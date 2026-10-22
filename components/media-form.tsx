"use client";
import Link from "next/link";
import { useActionState } from "react";
import { saveMedia } from "@/app/(admin)/media/actions";
import type { Media } from "@/lib/types";
export function MediaForm({media}:{media?:Media}){
  const [state,action,pending]=useActionState(saveMedia,{});
  return <form action={action} className="grid gap-7 xl:grid-cols-[1.6fr_1fr]">
    <input type="hidden" name="id" value={media?.id||""}/><input type="hidden" name="updated_at" value={media?.updated_at||""}/>
    <section className="panel space-y-6 p-6 sm:p-8"><h2 className="text-base font-semibold">The caption & its context</h2>
      <label className="block text-xs font-medium">Caption <span className="text-[#a7ad9d]">· up to 280 characters</span><textarea name="caption" defaultValue={media?.caption} required maxLength={280} rows={4} className="field mt-3" placeholder="Paste the AI-generated caption…"/></label>
      <label className="block text-xs font-medium">Scene <span className="text-[#a7ad9d]">· 12–500 characters</span><textarea name="scene" defaultValue={media?.scene} required minLength={12} maxLength={500} rows={3} className="field mt-3" placeholder="Describe the image or moment behind this caption."/></label>
      <label className="block text-xs font-medium">Original generation prompt <span className="text-[#a7ad9d]">· 20–2,000 characters</span><textarea name="prompt" defaultValue={media?.prompt} required minLength={20} maxLength={2000} rows={6} className="field mt-3 font-mono text-xs" placeholder="Keep the exact prompt that produced the caption for traceability."/></label>
    </section>
    <aside className="space-y-6"><section className="panel space-y-6 p-6"><h2 className="text-base font-semibold">Details</h2>
      <label className="block text-xs font-medium">Humor style<select name="style" defaultValue={media?.style||"witty"} className="field mt-3"><option value="witty">Witty</option><option value="deadpan">Deadpan</option><option value="absurd">Absurd</option></select></label>
      <label className="block text-xs font-medium">AI model <span className="text-[#a7ad9d]">· required</span><input name="model" defaultValue={media?.model} required maxLength={80} className="field mt-3" placeholder="e.g. gemini-3.1-flash-lite"/></label>
      <div className="rounded-xl bg-[#f4f6ee] p-4 text-xs leading-6 text-[#849279]">{media?"Your update keeps the original creator, image, and votes. The change will be recorded in the activity log.":"Add an existing AI-generated caption with its original prompt and model. Saving publishes it to the public rating app."}</div>
      {state.error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending?"Saving…":media?"Save changes":"Create & publish caption"}</button><Link href="/media" className="block text-center text-xs text-stone-500 hover:underline">Cancel</Link>
    </section>
    {media?.image_url&&<section className="panel overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.image_url} alt={media.scene} className="max-h-80 w-full object-contain bg-stone-100"/><p className="p-4 text-[11px] text-stone-500">Original image · Preserved when editing</p></section>}
    </aside>
  </form>;
}
