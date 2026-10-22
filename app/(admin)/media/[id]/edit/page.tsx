import {notFound} from "next/navigation";
import {getSnapshot} from "@/lib/admin";
import {PageTitle} from "@/components/common";
import {MediaForm} from "@/components/media-form";
export default async function EditMediaPage({params}:{params:Promise<{id:string}>}){
  const data=await getSnapshot();const {id}=await params;const media=data.media.find(m=>m.id===id&&!m.deleted_at);
  if(!media)notFound();
  return <><PageTitle eyebrow="Media library / Edit caption" title="A little polish goes a long way." description="Refine the content while keeping the original image, creator, and ratings intact."/><MediaForm media={media}/></>;
}
