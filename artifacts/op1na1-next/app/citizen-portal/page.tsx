import type { Metadata } from "next";
import { CitizenPortalClient } from "./CitizenPortalClient";

export const metadata: Metadata = {
  title: "Portal do Cidadão — OP1NA1",
  description:
    "Reporte problemas, faça sugestões e acompanhe as respostas do Município dos Mulenvos.",
};

export default function CitizenPortalPage() {
  return <CitizenPortalClient />;
}
