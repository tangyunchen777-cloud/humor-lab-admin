import {getSnapshot} from "@/lib/admin";
import {PageTitle,NewMediaLink} from "@/components/common";
import {MediaTable} from "@/components/media-table";
export default async function MediaPage({searchParams}:{searchParams:Promise<{filter?:string;creator?:string;saved?:string}>}){
  const data=await getSnapshot();const params=await searchParams;
  return <><PageTitle eyebrow="The content desk" title="A home for every punchline." description="Review the original prompt, refine a caption, or make room for something better." action={<NewMediaLink/>}/>{params.saved&&<p role="status" className="mb-6 rounded-xl border border-[#dce7d1] bg-[#edf4e5] p-4 text-xs text-[#5b7c49]">Caption saved. It’s available in the public rating app.</p>}<MediaTable media={data.media} initialFilter={["unrated","deleted"].includes(params.filter||"")?params.filter:"active"} creatorId={params.creator}/></>;
}
