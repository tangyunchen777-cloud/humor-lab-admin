"use client";
import { useActionState,useEffect,useRef,useId } from "react";
import { deleteMedia } from "@/app/(admin)/media/actions";
export function DeleteControl({id,caption,deleted}:{id:string;caption:string;deleted:boolean}){
  const [state,action,pending]=useActionState(deleteMedia.bind(null,id,deleted),{});
  const dialog=useRef<HTMLDialogElement>(null);const titleId=useId();
  useEffect(()=>{if(state.success)dialog.current?.close();},[state]);
  return <><button type="button" onClick={()=>dialog.current?.showModal()} className={`text-[11px] font-medium hover:underline ${deleted?"text-[#63834d]":"text-[#b47b69]"}`}>{deleted?"Restore":"Delete"}</button>
    <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[min(92vw,440px)] rounded-2xl border border-stone-200 bg-white p-7 shadow-xl backdrop:bg-[#152e29]/40">
      <h2 id={titleId} className="text-xl font-semibold">{deleted?"Restore this caption?":"Delete this caption?"}</h2><p className="mt-4 line-clamp-3 text-sm text-stone-600">“{caption}”</p><p className="mt-4 text-xs leading-6 text-stone-500">{deleted?"It will reappear in the public feed with its original votes.":"It will disappear from the public feed. You can restore it from Recently deleted; the image and votes are preserved."}</p>
      <form action={action}>{state.error&&<p role="alert" className="mt-4 text-xs text-red-700">{state.error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" className="btn btn-secondary" onClick={()=>dialog.current?.close()} disabled={pending}>Cancel</button><button className="btn btn-primary" disabled={pending}>{pending?"Saving…":deleted?"Restore caption":"Delete caption"}</button></div></form>
    </dialog>
  </>;
}
