import { classifyRequest, type ClassificationResult } from "./nlp";

/**
 * Heurística determinística baseada em palavras-chave + tipo declarado.
 * É o fallback quando Claude não está disponível ou demora demais.
 */
const URGENT_KEYWORDS = [
  "urgente",
  "emergência",
  "emergencia",
  "fogo",
  "ferido",
  "perigo",
  "criança",
  "crianca",
  "morre",
  "morrer",
  "sangrar",
  "ataque",
];

export function classifyHeuristic(
  type: string,
  description: string,
): "low" | "normal" | "high" | "urgent" {
  if (type === "urgente") return "urgent";
  const lower = description.toLowerCase();
  if (URGENT_KEYWORDS.some((kw) => lower.includes(kw))) return "high";
  if (type === "denuncia") return "high";
  if (type === "elogio") return "low";
  return "normal";
}

export type FinalClassification = {
  priority: "low" | "normal" | "high" | "urgent";
  category: string;
  isCrisis: boolean;
  nlp: {
    used: boolean;
    priority?: string;
    category?: string;
    isCrisis?: boolean;
    reasoning?: string;
    modelUsed?: string;
    latencyMs?: number;
    error?: string;
  };
};

/**
 * Classificação final usando NLP quando disponível, com fallback para heurística.
 *
 * - Se Claude responder dentro do timeout, sobrescreve priority + category com
 *   o resultado do modelo
 * - Se a heurística for `urgent` (ex.: type='urgente' explícito), nunca baixa
 *   abaixo de high mesmo que o modelo subestime
 * - Audit-friendly: devolve ambas as classificações para análise posterior
 */
export async function finalClassification(
  type: string,
  description: string,
  declaredCategory: string,
): Promise<FinalClassification> {
  const heuristic = classifyHeuristic(type, description);

  let nlp: ClassificationResult | null = null;
  let nlpError: string | undefined;
  try {
    nlp = await classifyRequest(description, type);
  } catch (e) {
    nlpError = e instanceof Error ? e.message : String(e);
  }

  if (!nlp) {
    return {
      priority: heuristic,
      category: declaredCategory,
      isCrisis: heuristic === "urgent",
      nlp: {
        used: false,
        ...(nlpError ? { error: nlpError } : {}),
      },
    };
  }

  // Safety floor: se a heurística diz urgent (type='urgente' explícito ou
  // múltiplas keywords), nunca aceitar low/normal do modelo.
  let priority = nlp.priority;
  if (heuristic === "urgent" && (priority === "low" || priority === "normal")) {
    priority = "high";
  }

  return {
    priority,
    category: nlp.category,
    isCrisis: nlp.isCrisis,
    nlp: {
      used: true,
      priority: nlp.priority,
      category: nlp.category,
      isCrisis: nlp.isCrisis,
      reasoning: nlp.reasoning,
      modelUsed: nlp.modelUsed,
      latencyMs: nlp.latencyMs,
    },
  };
}
