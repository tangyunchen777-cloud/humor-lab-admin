import type { Snapshot } from "@/lib/types";
export function ActivityChart({daily}:{daily:Snapshot["daily"]}){
 const max=Math.max(1,...daily.flatMap(d=>[d.media,d.votes]));
 return <div className="activity-chart"><div className="chart-legend"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#335b42]"/>Published captions</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#e7bc8f]"/>Votes cast</span></div>
 <svg role="img" aria-label="Published captions and votes cast each day over the last 14 days, in UTC" viewBox="0 0 680 154" preserveAspectRatio="none" className="chart-svg">
  {[0,1,2,3].map(i=><g key={i}><line x1="30" x2="675" y1={8+i*36} y2={8+i*36} stroke="#edf0e7" strokeDasharray="3 5"/><text x="2" y={12+i*36} fill="#8b9882" fontSize="12">{Math.round(max*(1-i/3))}</text></g>)}
  {daily.map((d,i)=>{const x=40+i*45;return <g key={d.day}><rect x={x} y={116-d.media/max*108} width="12" height={d.media/max*108} rx="3" fill="#335b42"/><rect x={x+15} y={116-d.votes/max*108} width="12" height={d.votes/max*108} rx="3" fill="#e7bc8f"/><text x={x+12} y="146" fill="#829176" fontSize="12" textAnchor="middle">{d.day.slice(5).replace("-","/")}</text><title>{d.day}: {d.media} captions, {d.votes} votes</title></g>;})}
 </svg><p className="chart-note">Daily activity · Live database totals</p></div>;
}
