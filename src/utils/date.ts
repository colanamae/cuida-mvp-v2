export const today = () => new Date().toLocaleDateString("en-CA");
export const dateTime = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Sem prazo";
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
export const first = (name: string) => name.split(" ")[0] || "Você";
export function isoFromLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}
export function localInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}
