import Anthropic from "@anthropic-ai/sdk";

/**
 * Classificação NLP com Claude Haiku 4.5.
 *
 * Best practices aplicadas:
 *  - Prompt caching ephemeral no system block (90% redução de custo em chamadas
 *    consecutivas dentro de 5min)
 *  - Tool use para forçar output estruturado e validado contra schema
 *  - Timeout estrito (5s) — devolve null se exceder, fallback para heurística
 *  - Modelo Haiku 4.5 — latência baixa (~1-3s), custo baixo (~$0.0002 / pedido)
 */

const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 5000;

export const NLP_CATEGORIES = [
  "Água e saneamento",
  "Electricidade e iluminação",
  "Estradas e vias públicas",
  "Recolha de lixo",
  "Segurança pública",
  "Saúde pública",
  "Educação",
  "Outra",
] as const;

export type NlpCategory = (typeof NLP_CATEGORIES)[number];
export type NlpPriority = "urgent" | "high" | "normal" | "low";

export type ClassificationResult = {
  priority: NlpPriority;
  category: NlpCategory;
  isCrisis: boolean;
  reasoning: string;
  modelUsed: string;
  latencyMs: number;
};

const SYSTEM_PROMPT = `És um classificador de pedidos cidadãos para a Administração Municipal dos Mulenvos (Luanda, Angola). Recebes um pedido e devolves uma classificação estruturada via tool 'classify_request'.

# Critérios de prioridade

- **urgent**: vida em perigo imediato — incêndio, ferido grave, criança/idoso em perigo, suspeita de surto de doença, catástrofe natural em curso, fuga de gás/água tóxica
- **high**: serviço básico em falta há ≥3 dias (água, electricidade), denúncia grave (corrupção, abuso de autoridade), escola/posto de saúde sem condições mínimas, lixo acumulado com risco sanitário
- **normal**: incomodo recorrente mas não crítico, problema localizado, sugestão pontual, manutenção habitual
- **low**: elogio, agradecimento, pedido informativo simples, situação resolvível com indicação de outro canal

# isCrisis

Marca **isCrisis: true** apenas quando há risco imediato a pessoas que justifique notificação de emergência fora do fluxo normal. Crisis ⇒ priority obrigatoriamente urgent ou high.

# Categoria

Escolhe a categoria mais específica entre as 8 disponíveis. Se nenhuma encaixa bem, usa "Outra".

# Reasoning

Frase curta em português (máx 200 caracteres) a justificar a classificação. Útil para auditoria e melhoria do classificador.`;

const TOOL = {
  name: "classify_request",
  description: "Classifica o pedido cidadão em prioridade, categoria e flag de crise",
  input_schema: {
    type: "object" as const,
    properties: {
      priority: {
        type: "string" as const,
        enum: ["urgent", "high", "normal", "low"],
        description: "Nível de prioridade conforme critérios",
      },
      category: {
        type: "string" as const,
        enum: [...NLP_CATEGORIES],
        description: "Categoria do serviço municipal",
      },
      isCrisis: {
        type: "boolean" as const,
        description: "True se requer escalonamento imediato",
      },
      reasoning: {
        type: "string" as const,
        description: "Justificação curta em português (≤200 chars)",
        maxLength: 200,
      },
    },
    required: ["priority", "category", "isCrisis", "reasoning"],
  },
};

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export async function classifyRequest(
  description: string,
  declaredType?: string,
): Promise<ClassificationResult | null> {
  const c = getClient();
  if (!c) return null;
  if (!description || description.trim().length < 5) return null;

  const start = Date.now();
  try {
    const resp = await c.messages.create(
      {
        model: MODEL,
        max_tokens: 300,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content:
              `Tipo declarado pelo cidadão: ${declaredType ?? "(não declarado)"}\n\n` +
              `Descrição do pedido:\n${description.slice(0, 4000)}`,
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "classify_request" },
      },
      { timeout: TIMEOUT_MS },
    );

    const toolUse = resp.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;

    const input = toolUse.input as Partial<ClassificationResult>;
    if (
      !input.priority ||
      !input.category ||
      typeof input.isCrisis !== "boolean"
    ) {
      return null;
    }

    return {
      priority: input.priority as NlpPriority,
      category: input.category as NlpCategory,
      isCrisis: input.isCrisis,
      reasoning: input.reasoning ?? "",
      modelUsed: MODEL,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[nlp] classify failed (${Date.now() - start}ms):`, msg);
    return null;
  }
}
