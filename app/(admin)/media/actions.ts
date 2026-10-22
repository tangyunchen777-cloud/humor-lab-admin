"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
export type ActionState={error?:string;success?:boolean};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function refresh(){["/","/media","/ratings","/profiles","/activity"].forEach(path=>revalidatePath(path));}
export async function saveMedia(_previous:ActionState,form:FormData):Promise<ActionState>{
  const {supabase}=await requireAdmin();
  const id=String(form.get("id")||"");
  const scene=String(form.get("scene")||"").trim();
  const caption=String(form.get("caption")||"").trim();
  const prompt=String(form.get("prompt")||"").trim();
  const model=String(form.get("model")||"").trim();
  const style=String(form.get("style")||"");
  const version=String(form.get("updated_at")||"");
  if((id&&!uuid.test(id))||scene.length<12||scene.length>500||prompt.length<20||prompt.length>2000||!caption||caption.length>280||!model||model.length>80||!["witty","deadpan","absurd"].includes(style))return {error:"Check the required fields and character limits before saving."};
  const {error}=await supabase.rpc("admin_save_media",{media_id:id||null,new_scene:scene,new_prompt:prompt,new_caption:caption,new_style:style,new_model:model,expected_updated_at:version||null});
  if(error){console.error("Admin save failed",error.code);return {error:error.message.includes("record changed")?"Another change was saved first. Refresh this page before editing again.":"The caption could not be saved. Please try again."};}
  refresh();redirect("/media?saved=1");
}
export async function deleteMedia(id:string,restore:boolean,_previous:ActionState):Promise<ActionState>{
  void _previous;
  const {supabase}=await requireAdmin();
  if(!uuid.test(id))return {error:"This caption is not valid."};
  const {error}=await supabase.rpc("admin_delete_media",{media_id:id,restore});
  if(error)return {error:"This caption could not be changed. Refresh and try again."};
  refresh();return {success:true};
}
