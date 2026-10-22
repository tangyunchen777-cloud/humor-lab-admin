import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoogleButton } from "./google-button";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{error?: string}> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");
  const {error} = await searchParams;
  return <main className="flex min-h-screen items-center justify-center px-6 py-16">
    <section className="panel w-full max-w-md p-9 sm:p-12">
      <div className="mb-12 text-sm font-black tracking-widest">HUMOR LAB<span className="text-[#df8064]"> /</span></div>
      <p className="eyebrow">The control room</p><h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">Good humor.<br/>In good hands.</h1>
      <p className="mt-6 text-sm leading-7 text-stone-500">A private workspace to understand your audience, curate AI captions, and keep the community running.</p>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">Google sign-in was not completed. Try again in this browser.</p>}
      <GoogleButton/><p className="mt-5 text-center text-xs leading-6 text-stone-500">Google sign-in and superadmin approval required.</p>
      <a className="mt-9 block border-t border-stone-200 pt-5 text-center text-xs text-stone-500 hover:underline" href="https://design-for-gen-ai-project.vercel.app/">Visit the public Humor Lab ↗</a>
    </section>
  </main>;
}
