import { requireAdmin } from "@/lib/admin";
import { signOut } from "@/app/auth/actions";
import { Sidebar } from "@/components/sidebar";
import { Icon } from "@/components/icons";
export default async function AdminLayout({children}:{children:React.ReactNode}) {
  const {profile} = await requireAdmin();
  return <div className="min-h-screen"><Sidebar/><div className="md:ml-60">
    <header className="flex items-center justify-between gap-4 border-b border-[#e1e5db] px-6 py-5 sm:px-10"><p className="text-xs text-[#849085]">Workspace <span className="mx-2 text-[#bec6b7]">/</span><span className="text-[#345041]">Administration</span></p><div className="flex items-center gap-4"><span className="pill hidden border border-[#dce5cf] bg-[#eef3e6] text-[#4b6844] sm:inline-block">Superadmin</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7d5bd] text-xs font-semibold" aria-label={`Signed in as ${profile.first_name || 'Admin'}`}>{profile.first_name?.[0] || "A"}{profile.last_name?.[0]}</span><form action={signOut}><button className="rounded-lg p-2 text-stone-500 hover:bg-stone-200" title="Sign out" aria-label="Sign out"><Icon name="logout"/></button></form></div></header>
    <main className="mx-auto max-w-[1450px] px-6 py-9 sm:px-10 sm:py-11">{children}</main>
    <footer className="mx-6 flex flex-wrap justify-between gap-3 border-t border-[#e1e5db] py-6 text-[10px] text-[#8c958a] sm:mx-10"><span>HUMOR LAB · MADE FOR THE PEOPLE BEHIND THE PUNCHLINES</span><span className="flex items-center gap-2"><Icon name="lock" className="h-3 w-3"/>Google login · Database-enforced access</span></footer>
  </div></div>;
}
