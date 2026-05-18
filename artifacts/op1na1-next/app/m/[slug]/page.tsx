import type { Metadata } from "next";
import { CitizenPortalSlugClient } from "./CitizenPortalSlugClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Capitalise slug for display (e.g. "mulenvos" → "Mulenvos")
  const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
  return {
    title: `Portal do Cidadão — ${name} · OP1NA1`,
    description: `Reporte problemas e acompanhe pedidos do Município de ${name}.`,
  };
}

export default async function MunicipalityPortalPage({ params }: Props) {
  const { slug } = await params;
  return <CitizenPortalSlugClient slug={slug} />;
}
