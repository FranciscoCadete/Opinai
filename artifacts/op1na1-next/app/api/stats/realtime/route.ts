import { ok, err } from "@/lib/server/response";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function GET() {
  if (DEMO_MODE) {
    return ok({
      resolvedThisMonth: 124,
      inProgress: 37,
      averageResponseHours: 18.4,
      activeMediators: 3,
      bairrosCovered: 10,
      channelsAvailable: 5,
      byCategory: [
        { label: "Infraestrutura", pct: 38 },
        { label: "Ambiente",       pct: 24 },
        { label: "Segurança",      pct: 19 },
        { label: "Serviços",       pct: 12 },
        { label: "Outros",         pct: 7  },
      ],
      byBairro: [
        { name: "CAOP C",           estrato: "C", count: 42 },
        { name: "Capalanga",        estrato: "C", count: 38 },
        { name: "CAOP A",           estrato: "C", count: 31 },
        { name: "Boa-Fé",           estrato: "B", count: 24 },
        { name: "Mulenvos de Cima", estrato: "B", count: 19 },
      ],
    });
  }

  try {
    const { db } = await import("@workspace/db");
    // Real aggregation queries would go here
    void db;
    return ok({});
  } catch (e) {
    console.error("[stats/realtime]", e);
    return err("Erro interno", 500);
  }
}

export const revalidate = 30;
