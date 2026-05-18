import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Iniciar sessão — OP1NA1",
  description: "Acesso institucional à plataforma OP1NA1 do Município dos Mulenvos.",
};

export default function LoginPage() {
  return <LoginClient />;
}
