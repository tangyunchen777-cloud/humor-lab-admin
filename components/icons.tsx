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
  image:"M3 3h18v18H3z M3 16l6-6 5 5 3-3 4 4 M8 7h.01",
  text:"M4 5h16 M12 5v15 M8 20h8",
  chain:"M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
  requests:"M5 3h14v18H5z M8 7h8 M8 11h5 M8 15h8",
  responses:"M3 4h18v13H9l-5 4v-4H3z M7 8h10 M7 12h6",
  terms:"M4 4h6v16H4z M14 4h6v16h-6z M7 8h.01 M17 8h.01",
  examples:"M8 3h12v14H8z M4 7v14h12 M11 7h6 M11 11h4",
  models:"M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4",
  providers:"M3 4h18v6H3z M3 14h18v6H3z M7 7h.01 M7 17h.01 M11 7h6 M11 17h6",
  domains:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2c6 5 6 15 0 20 M12 2c-6 5-6 15 0 20",
  mail:"M3 5h18v14H3z M3 5l9 7 9-7",
  external:"M14 3h7v7 M21 3L10 14 M10 3H3v18h18v-7",
};
export function Icon({name,className="h-4 w-4"}:{name:string;className?:string}) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.overview}/></svg>;
}
