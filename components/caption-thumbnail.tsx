"use client";
import { useState } from "react";
import { Icon } from "./icons";

export function CaptionThumbnail({src,scene="Source photo",label="Written scene",compact=false}:{src?:string;scene?:string;label?:string;compact?:boolean}) {
  const [failed,setFailed]=useState(false);
  const size=compact?"h-10 w-10":"h-16 w-16";
  if(!src||failed)return <span className={`${size} flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-stone-200 bg-stone-50 text-stone-500`} title={failed?"Source image unavailable":label} role="img" aria-label={failed?"Source image unavailable":label}><Icon name={src?"image":"text"} className="h-4 w-4"/><span className="text-[8px] leading-3">{src?"Unavailable":label==="Written scene"?"Text":label==="Photo not retained"?"No preview":"No image"}</span></span>;
  return <a href={src} target="_blank" rel="noreferrer" className={`${size} block shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50`} aria-label={`Open source image: ${scene}`} title="Open full source image">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={scene} className="h-full w-full object-contain" onError={()=>setFailed(true)}/>
  </a>;
}
