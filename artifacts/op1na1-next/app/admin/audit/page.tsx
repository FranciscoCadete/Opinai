import type { Metadata } from "next";
import { AuditClient } from "../AuditClient";

export const metadata: Metadata = { title: "Auditoria" };

export default function AuditPage() {
  return <AuditClient />;
}
