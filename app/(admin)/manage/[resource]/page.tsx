import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { catalogs,type CatalogRow } from "@/lib/catalog";
import { PageTitle } from "@/components/common";
import { CatalogManager } from "@/components/catalog-manager";
export default async function CatalogPage({params}:{params:Promise<{resource:string}>}){
 const {supabase}=await requireAdmin(),{resource}=await params,config=catalogs[resource];
 if(!config||!Object.hasOwn(catalogs,resource))notFound();
 const [{data,error,count},{data:providers,error:providerError}]=await Promise.all([
  supabase.from(config.table).select("*",{count:"exact"}).order("updated_at",{ascending:false}).limit(500),
  supabase.from("llm_providers").select("id,name").is("deleted_at",null).order("name"),
 ]);
 if(error||providerError)throw new Error("This collection could not load. Please try again.");
 const rows=(data||[]) as CatalogRow[];
 if(resource==="images")rows.forEach(row=>{row.image_url=supabase.storage.from("generation-images").getPublicUrl(String(row.storage_path)).data.publicUrl;});
 return <><PageTitle eyebrow="Configuration & content" title={config.title} description={config.description}/><CatalogManager resource={resource} rows={rows} providers={providers||[]} total={count||0}/></>;
}
