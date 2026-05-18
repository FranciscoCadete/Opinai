import type { Metadata } from "next";
import RequestsClient from "../RequestsClient";

export const metadata: Metadata = { title: "Pedidos" };

export default function RequestsPage() {
  return <RequestsClient />;
}
