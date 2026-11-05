import { requireAdmin } from "@/lib/admin";
import { signOut } from "@/app/auth/actions";
import { AdminShell } from "@/components/admin-shell";
import { Icon } from "@/components/icons";
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const {profile}=await requireAdmin();
 return <AdminShell header={<header className="admin-header"><p className="text-xs text-[#849085]">Humor Lab <span className="mx-2 text-[#bec6b7]">/</span><span className="text-[#345041]">Control room</span></p><div className="flex items-center gap-4"><span className="pill hidden border border-[#dce5cf] bg-[#eef3e6] text-[#4b6844] sm:inline-block">Superadmin</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7d5bd] text-xs font-semibold" aria-label={`Signed in as ${profile.first_name||'Admin'}`}>{profile.first_name?.[0]||"A"}{profile.last_name?.[0]}</span><form action={signOut}><button className="rounded-lg p-2 text-stone-500 hover:bg-stone-200" title="Sign out" aria-label="Sign out"><Icon name="logout"/></button></form></div></header>}>{children}</AdminShell>;
}
