function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function generateTicketId(prefix = "MUL"): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${day}-${rand}`;
}

const TICKET_RE = /^[A-Z]{2,5}-\d{8}-\d{4}$/;
export function isValidTicketId(id: string): boolean {
  return TICKET_RE.test(id);
}
