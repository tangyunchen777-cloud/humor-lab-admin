import Link from "next/link";
import { Icon } from "./icons";
export function PageTitle({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:React.ReactNode}) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#899284]">{description}</p></div>{action}</div>;
}
export function NewMediaLink(){return <Link href="/media/new" className="btn btn-primary"><Icon name="plus"/>New media</Link>;}
export function dateLabel(value:string|null){return value?new Date(value).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}):"Never";}
export function fullName(first:string|null,last:string|null){return [first,last].filter(Boolean).join(" ")||"Unnamed member";}
export function Stat({label,value,note,icon,color="green"}:{label:string;value:number|string;note:string;icon:string;color?:string}){
  return <section className="panel p-6"><div className="flex items-center justify-between"><p className="text-[11px] font-medium text-[#7b8a7d]">{label}</p><span className={`rounded-lg p-2 ${color==="peach"?"bg-[#fbede3] text-[#be7a57]":color==="purple"?"bg-[#eeedf7] text-[#827caa]":"bg-[#edf3e5] text-[#7a9967]"}`}><Icon name={icon}/></span></div><p className="mt-4 font-mono text-3xl font-medium tracking-tight">{value}</p><p className="mt-3 text-[10px] text-[#99a18e]">{note}</p></section>;
}
