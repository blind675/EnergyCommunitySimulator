export function fmt(n: number, dec = 1) { return n.toFixed(dec).replace(".", ","); }
export function fmtLei(n: number) { return fmt(n, 2) + " lei"; }
