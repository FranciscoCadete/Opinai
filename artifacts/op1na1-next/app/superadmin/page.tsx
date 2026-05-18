import type { Metadata } from "next";
import { SuperAdminClient } from "./SuperAdminClient";

export const metadata: Metadata = {
  title: "OP1NA1 — Superadmin",
  description: "Gestão de municípios na plataforma OP1NA1",
  robots: { index: false, follow: false },
};

export default function SuperAdminPage() {
  return <SuperAdminClient />;
}
