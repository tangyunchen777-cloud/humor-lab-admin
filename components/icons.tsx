const paths: Record<string,string> = {
  overview:"M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  media:"M4 3h16v18H4z M4 15l5-5 5 5 3-3 3 3 M8 7h.01",
  users:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  ratings:"M7 10v11H3V10z M7 10l5-8c2 0 3 2 2 5l-1 3h6c2 0 2 1 2 3l-2 6c0 1-1 2-3 2H7",
  activity:"M3 12h4l3-8 4 16 3-8h4",
  arrow:"M5 12h14 M12 5l7 7-7 7",
  plus:"M12 5v14 M5 12h14",
  logout:"M9 21H4V3h5 M13 8l5 4-5 4 M9 12h9",
  search:"M21 21l-5-5 M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14",
  lock:"M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
};
export function Icon({name,className="h-4 w-4"}:{name:string;className?:string}) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.overview}/></svg>;
}
