"use client";
export default function ErrorPage({reset}:{reset:()=>void}) {
  return <main className="mx-auto max-w-lg px-6 py-24"><h1 className="text-3xl font-semibold">The workspace couldn’t load.</h1><p className="mt-5 text-sm text-stone-500">Please try again. If your access changed, sign in with an approved account.</p><button className="btn btn-primary mt-6" onClick={reset}>Try again</button><a href="/login" className="ml-5 text-sm underline">Sign-in page</a></main>;
}
