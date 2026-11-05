"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
const links=[
 ["/","Overview","overview"],["/media","AI media","media"],["/profiles","Profiles","users"],["/ratings","Ratings","ratings"],
 ["/pipeline","Prompt chains & mix","chain"],["/requests","Generation requests","requests"],["/responses","LLM responses","responses"],
 ["/manage/images","Images","image"],["/manage/terms","Terms","terms"],["/manage/examples","AI examples","examples"],
 ["/manage/models","LLM models","models"],["/manage/providers","LLM providers","providers"],["/manage/signup-domains","Signup domains","domains"],
 ["/manage/whitelist","Email whitelist","mail"],["/activity","Activity log","activity"]
];
export function Sidebar(){
 const path=usePathname();
 return <aside className="admin-rail"><Link href="/" className="rail-brand" aria-label="Humor Lab overview" title="Humor Lab">h.</Link>
 <nav className="rail-nav" aria-label="Admin navigation">{links.map(([href,label,icon])=>{
  const active=href==="/"?path==="/":path.startsWith(href);
  return <Link key={href} href={href} aria-label={label} aria-current={active?"page":undefined} title={label} className={`rail-link ${active?"is-active":""}`}><Icon name={icon} className="h-[19px] w-[19px]"/><span className="rail-tooltip" aria-hidden="true">{label}</span></Link>;
 })}</nav><a href="https://design-for-gen-ai-project.vercel.app/" target="_blank" rel="noreferrer" className="rail-link rail-external" aria-label="Open rating app" title="Open rating app"><Icon name="external" className="h-[19px] w-[19px]"/><span className="rail-tooltip" aria-hidden="true">Open rating app</span></a></aside>;
}
