import type { Metadata } from "next";
import { ReportsClient } from "../ReportsClient";

export const metadata: Metadata = {
  title: "Relatórios",
  description: "Análise de pedidos e indicadores de desempenho do Município dos Mulenvos",
};

export default function ReportsPage() {
  return <ReportsClient />;
}
