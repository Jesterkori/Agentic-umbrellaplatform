export function fmt(n) {
  return "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 });
}

export function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
