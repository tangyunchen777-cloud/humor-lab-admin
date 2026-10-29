"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { catalogs } from "@/lib/catalog";
export type CatalogState={error?:string;success?:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function saveCatalog(_previous:CatalogState,form:FormData):Promise<CatalogState>{
  const {supabase,user}=await requireAdmin();
  const resource=String(form.get("resource")||""),config=catalogs[resource];
  if(!config||!Object.hasOwn(catalogs,resource))return {error:"Unknown collection."};
  const id=String(form.get("id")||""),version=String(form.get("updated_at")||""),mode=String(form.get("mode")||"save");
  if((id&&!uuid.test(id))||(id&&!Number.isFinite(Date.parse(version))))return {error:"Refresh this record before editing."};
  if(!["save","archive","restore"].includes(mode)||(!id&&mode!=="save"))return {error:"Invalid action."};
  const values:Record<string,string|number|boolean|null>={};
  if(mode!=="save") values.deleted_at=mode==="archive"?new Date().toISOString():null;
  else for(const field of config.fields){
    if(field.type==="file")continue;
    if(field.type==="checkbox"){values[field.key]=form.get(field.key)==="on";continue;}
    const raw=String(form.get(field.key)||"").trim();
    if(field.required&&!raw||raw.length>(field.max||2000))return {error:`Check ${field.label.toLowerCase()}.`};
    if(field.options&&!field.options.includes(raw))return {error:"Choose a listed option."};
    if(field.reference&&!uuid.test(raw))return {error:"Choose a provider first."};
    if(field.type==="number"){const n=Number(raw);if(!Number.isInteger(n)||n<0||n>1000)return {error:"Priority must be a whole number from 0 to 1000."};values[field.key]=n;}
    else values[field.key]=raw;
  }
  if(mode==="save"){
    if(resource==="models"&&!/^[a-zA-Z0-9._-]{1,100}$/.test(String(values.model_key)))return {error:"Use the model identifier, without a URL or API key."};
    if(resource==="signup-domains"){values.domain=String(values.domain).toLowerCase();if(!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(String(values.domain)))return {error:"Enter a domain without https:// or a path."};}
    if(resource==="whitelist"){values.email=String(values.email).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email)))return {error:"Enter a valid email address."};}
  }
  let uploaded:string|null=null;
  if(resource==="images"&&!id){
    const file=form.get("file");
    if(!(file instanceof File)||!file.size||file.size>4*1024*1024)return {error:"Choose an image under 4 MB."};
    const bytes=new Uint8Array(await file.arrayBuffer());
    const extension=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?"jpg":[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)?"png":new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP"?"webp":null;
    if(!extension)return {error:"The file must be a real JPG, PNG, or WebP image."};
    uploaded=`${user.id}/${crypto.randomUUID()}.${extension}`;
    const {error}=await supabase.storage.from("generation-images").upload(uploaded,bytes,{contentType:extension==="jpg"?"image/jpeg":`image/${extension}`,upsert:false});
    if(error)return {error:"The image could not be uploaded. Please try again."};
    values.storage_path=uploaded;values.creator_id=user.id;
  }
  const mutation=id?supabase.from(config.table).update(values).eq("id",id).eq("updated_at",version).select("id").maybeSingle():supabase.from(config.table).insert(values).select("id").single();
  const {data,error}=await mutation;
  if(error||!data){
    if(uploaded)await supabase.storage.from("generation-images").remove([uploaded]);
    return {error:error?.code==="23505"?"An active record with that value already exists.":!error?"This record changed. Refresh before saving.":"The change could not be saved. Check the fields and try again."};
  }
  revalidatePath(`/manage/${resource}`);revalidatePath("/activity");
  return {success:mode==="archive"?"Archived. You can restore it from Archived records.":mode==="restore"?"Restored.":"Saved successfully."};
}
export async function updateMix(_previous:CatalogState,form:FormData):Promise<CatalogState>{
  const {supabase}=await requireAdmin();
  const id=String(form.get("id")||""),version=String(form.get("updated_at")||""),weight=Number(form.get("weight"));
  if(!uuid.test(id)||!Number.isInteger(weight)||weight<0||weight>1000||!Number.isFinite(Date.parse(version)))return {error:"Use a whole weight from 0 to 1000."};
  const {data,error}=await supabase.from("prompt_chain_mix").update({weight}).eq("id",id).eq("updated_at",version).select("id").maybeSingle();
  if(error||!data)return {error:error?.message.includes("positive weight")?"Keep at least one positive weight in this style.":"The mix changed. Refresh and try again."};
  revalidatePath("/pipeline");revalidatePath("/activity");return {success:"Mix saved. New requests use this distribution."};
}
