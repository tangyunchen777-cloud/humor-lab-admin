"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
const links = [["/","Overview","overview"],["/media","Media library","media"],["/profiles","Profiles","users"],["/ratings","Ratings","ratings"],["/activity","Activity log","activity"]];
export function Sidebar() {
  const path = usePathname();
  return <aside className="flex shrink-0 flex-col bg-[#152e29] text-[#c7d2c5] md:fixed md:inset-y-0 md:w-60">
    <Link href="/" className="flex items-center gap-3 px-7 pb-7 pt-9"><span className="flex h-9 w-9 rotate-[-8deg] items-center justify-center rounded-xl bg-[#d9e8be] text-xl font-black text-[#17392e]">h.</span><span className="text-sm font-bold tracking-[.14em] text-white">HUMOR LAB<span className="mt-1 block text-[9px] font-medium tracking-[.23em] text-[#92a793]">CONTROL ROOM</span></span></Link>
    <p className="mb-3 hidden px-8 text-[9px] font-semibold tracking-[.22em] text-[#769183] md:block">WORKSPACE</p>
    <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-5 md:block md:space-y-2 md:px-4">{links.map(([href,label,icon])=>{
      const active = href==="/" ? path==="/" : path.startsWith(href);
      return <Link key={href} href={href} aria-current={active?"page":undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-xs transition ${active?"bg-[#2e483b] font-semibold text-[#e1efbe]":"hover:bg-[#203c32] hover:text-white"}`}><Icon name={icon}/>{label}{active && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-[#d9e8be] md:block"/>}</Link>;
    })}</nav>
    <div className="mt-auto hidden p-5 md:block"><div className="rounded-xl border border-[#385042] p-4"><span className="flex items-center gap-2 text-[10px] font-medium text-[#cbdcbd]"><span className="h-1.5 w-1.5 rounded-full bg-[#b1d590]"/>CONNECTED TO HUMOR LAB</span><p className="mt-3 text-xs leading-5 text-[#8fa792]">One community.<br/>A thousand possible punchlines.</p><a href="https://design-for-gen-ai-project.vercel.app/" target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between border-t border-[#385042] pt-3 text-[10px] text-[#d9e8be]">Open rating app <Icon name="arrow" className="h-3 w-3"/></a></div></div>
  </aside>;
}
