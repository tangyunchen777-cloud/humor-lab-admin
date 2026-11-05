"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Icon } from "./icons";

export function AdminShell({header,children}:{header:React.ReactNode;children:React.ReactNode}) {
  const overview=usePathname()==="/";
  return <div className={`admin-shell ${overview?"overview-shell":""}`}><Sidebar/><div className="admin-workspace">
    {header}<main className="admin-main">{children}</main>
    <footer className="admin-footer"><span>HUMOR LAB · CONTROL ROOM</span><span className="flex items-center gap-2"><Icon name="lock" className="h-3 w-3"/>Google login · Superadmin access</span></footer>
  </div></div>;
}
