import type { Snapshot } from "@/lib/types";
export function ActivityChart({daily}:{daily:Snapshot["daily"]}){
  const max=Math.max(1,...daily.flatMap(d=>[d.media,d.votes]));
  return <div><div className="mt-6 flex gap-5 text-[10px] text-[#82917f]"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#335b42]"/>Published captions</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#e7bc8f]"/>Votes cast</span></div>
    <svg role="img" aria-label="Published captions and votes cast each day over the last 14 days, in UTC" viewBox="0 0 680 200" className="mt-5 w-full">
      {[0,1,2,3].map(i=><g key={i}><line x1="30" x2="675" y1={20+i*48} y2={20+i*48} stroke="#edf0e7" strokeDasharray="3 5"/><text x="2" y={23+i*48} fill="#a0aa97" fontSize="9">{Math.round(max*(1-i/3))}</text></g>)}
      {daily.map((d,i)=>{const x=40+i*45; return <g key={d.day}><rect x={x} y={164-d.media/max*144} width="12" height={d.media/max*144} rx="3" fill="#335b42"/><rect x={x+15} y={164-d.votes/max*144} width="12" height={d.votes/max*144} rx="3" fill="#e7bc8f"/><text x={x+12} y="190" fill="#9aa58d" fontSize="9" textAnchor="middle">{d.day.slice(5).replace("-","/")}</text><title>{d.day}: {d.media} captions, {d.votes} votes</title></g>;})}
    </svg><p className="mt-1 text-[10px] text-[#a1a890]">Daily activity · UTC · Live database totals</p>
  </div>;
}
