"use client";

import { useActionState, useId, useState } from "react";
import { savePromptChain } from "@/app/(admin)/pipeline/actions";
import { MixForm } from "@/components/mix-form";

export type PromptChain = { id: string; name: string; style: string; description: string; updated_at: string };
export type PromptStep = { id: string; chain_id: string; position: number; name: string; instruction: string };
export type PromptMix = { id: string; chain_id: string; weight: number; updated_at: string };

function ChainEditor({ chain, steps, onClose }: { chain: PromptChain; steps: PromptStep[]; onClose: () => void }) {
  const [draft, setDraft] = useState(steps.map(step => ({ id: step.id, name: step.name, instruction: step.instruction })));
  const [state, action, pending] = useActionState(savePromptChain, {});
  const formId = useId();
  function move(index: number, direction: -1 | 1) {
    setDraft(previous => {
      const next = [...previous];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }
  return <form action={action} className="mt-5 space-y-5" aria-label={`Edit ${chain.name}`}>
    <input type="hidden" name="id" value={chain.id} />
    <input type="hidden" name="updated_at" value={state.updatedAt ?? chain.updated_at} />
    <input type="hidden" name="steps" value={JSON.stringify(draft)} />
    <fieldset disabled={pending} className="space-y-5">
      <div><label htmlFor={`${formId}-name`} className="text-xs font-semibold">Chain name</label><input id={`${formId}-name`} name="name" className="field mt-2" required maxLength={120} defaultValue={chain.name} /></div>
      <div><label htmlFor={`${formId}-description`} className="text-xs font-semibold">Description</label><textarea id={`${formId}-description`} name="description" className="field mt-2 min-h-24" required maxLength={1000} defaultValue={chain.description} /></div>
      <p className="text-xs leading-6 text-stone-500">Instructions run from top to bottom. Move a step to change its order. Keep the same steps so existing references remain intact.</p>
      <ol className="space-y-4">{draft.map((step, index) => <li key={step.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold">Step {index + 1}</p><div className="flex gap-2">
          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${step.name || `step ${index + 1}`} up`} className="btn btn-secondary text-xs disabled:opacity-40">↑ Up</button>
          <button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label={`Move ${step.name || `step ${index + 1}`} down`} className="btn btn-secondary text-xs disabled:opacity-40">↓ Down</button>
        </div></div>
        <label htmlFor={`${formId}-${step.id}-name`} className="text-xs font-semibold">Step {index + 1} name</label>
        <input id={`${formId}-${step.id}-name`} className="field mt-2 mb-4" required maxLength={120} value={step.name} onChange={event => setDraft(previous => previous.map(item => item.id === step.id ? { ...item, name: event.target.value } : item))} />
        <label htmlFor={`${formId}-${step.id}-instruction`} className="text-xs font-semibold">Step {index + 1} instruction</label>
        <textarea id={`${formId}-${step.id}-instruction`} className="field mt-2 min-h-32" required maxLength={2000} value={step.instruction} onChange={event => setDraft(previous => previous.map(item => item.id === step.id ? { ...item, instruction: event.target.value } : item))} />
      </li>)}</ol>
    </fieldset>
    <div className="flex flex-wrap gap-3"><button className="btn btn-primary" disabled={pending}>{pending ? "Saving chain…" : "Save chain"}</button><button type="button" className="btn btn-secondary" onClick={onClose} disabled={pending}>{state.success ? "Done" : "Cancel"}</button></div>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="text-sm text-green-800">{state.success}</p>}
  </form>;
}

export function PromptChainCard({ chain, steps, mix, percentage }: { chain: PromptChain; steps: PromptStep[]; mix?: PromptMix; percentage: number }) {
  const [editing, setEditing] = useState(false);
  return <article className="panel p-6">
    <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-stone-500">{chain.id}</p><h3 className="mt-2 font-semibold">{chain.name}</h3></div><span className="pill bg-[#edf3e5]">{percentage}% of this style</span></div>
    {editing ? <ChainEditor chain={chain} steps={steps} onClose={() => setEditing(false)} /> : <>
      <p className="mt-3 text-xs leading-6 text-stone-500">{chain.description}</p>
      <ol className="my-5 space-y-4">{steps.map(step => <li key={step.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-semibold">{step.position}. {step.name}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-stone-600">{step.instruction}</p><p className="mt-2 font-mono text-[9px] text-stone-400">{step.id}</p></li>)}</ol>
      <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary" aria-label={`Edit chain ${chain.name}`}>Edit chain</button>
    </>}
    {mix && <div className="mt-6 border-t border-stone-200 pt-5"><MixForm key={mix.updated_at} {...mix} name={chain.name} /></div>}
  </article>;
}
