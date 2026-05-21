/**
 * classifier.ts — Motor de Processamento e Classificação de Mensagens
 *
 * Camada de interpretação textual do OP1NA1.
 * Transforma texto livre (SMS/WhatsApp/Web) em metadados estruturados:
 *   – Categoria temática
 *   – Nível de prioridade
 *   – Localização extraída
 *   – Palavras-chave identificadas
 *
 * Não depende de serviços externos — opera puramente com regras lexicais
 * e padrões pré-definidos adaptados ao contexto dos Mulenvos / Luanda Sul.
 */

// ── Tipos de saída ────────────────────────────────────────────────────────────

export type Category =
  | "saneamento"
  | "energia"
  | "vias_publicas"
  | "seguranca"
  | "saude"
  | "agua"
  | "habitacao"
  | "educacao"
  | "outros";

export type Priority = "urgente" | "alto" | "normal" | "baixo";

export interface ClassificationResult {
  category:  Category;
  priority:  Priority;
  location:  string | null;   // bairro / zona extraída do texto
  keywords:  string[];        // termos relevantes identificados
  sentiment: "complaint" | "request" | "report" | "unknown";
  rawText:   string;
}

// ── Dicionários lexicais ──────────────────────────────────────────────────────

const CATEGORY_RULES: Array<{ category: Category; terms: string[] }> = [
  {
    category: "saneamento",
    terms: [
      "lixo", "lixeira", "entulho", "resíduos", "esgoto", "valeta", "cano",
      "canalizaçã", "fossa", "cheiro", "podre", "mosquito", "mosquitos",
      "saneamento", "higiene", "rato", "ratos", "barata", "inseto",
    ],
  },
  {
    category: "energia",
    terms: [
      "luz", "energia", "electricidade", "poste", "transformador", "apagão",
      "sem luz", "queimado", "fio", "cabo", "choque", "voltagem", "kwanza",
      "gerador", "corrente", "electrico", "elétrico", "lâmpada",
    ],
  },
  {
    category: "vias_publicas",
    terms: [
      "buraco", "estrada", "rua", "calçada", "passeio", "buracos", "asfalto",
      "via", "vias", "caminho", "sinalização", "sinal", "semáforo", "trânsito",
      "paralelepípedo", "alcatrão", "ponte", "valeta", "sarjeta", "km",
    ],
  },
  {
    category: "seguranca",
    terms: [
      "roubo", "assalto", "violência", "crime", "policia", "policia",
      "insegurança", "perigoso", "perigo", "bandido", "ladrão", "furto",
      "briga", "conflito", "tiro", "arma", "segurança",
    ],
  },
  {
    category: "saude",
    terms: [
      "hospital", "centro de saúde", "médico", "enfermeiro", "doente", "doença",
      "malária", "cólera", "água contaminada", "vacina", "farmácia", "urgência",
      "ambulância", "saúde", "morte", "criança doente",
    ],
  },
  {
    category: "agua",
    terms: [
      "água", "sem água", "falta de água", "torneira", "bomba d'água",
      "chafariz", "cisterna", "abastecimento", "tubagem", "encanamento",
    ],
  },
  {
    category: "habitacao",
    terms: [
      "casa", "habitação", "construção", "demolição", "imóvel", "bairro",
      "aluguer", "vizinho", "terreno", "licença", "construção ilegal",
    ],
  },
  {
    category: "educacao",
    terms: [
      "escola", "professor", "aluno", "sala de aula", "material escolar",
      "aula", "ensino", "educação", "diretor", "matrícula",
    ],
  },
];

const PRIORITY_RULES: Array<{ priority: Priority; terms: string[] }> = [
  {
    priority: "urgente",
    terms: [
      "urgente", "emergência", "perigo", "morte", "criança", "acidente",
      "inundação", "choque elétrico", "fogo", "incêndio", "explosão", "sangue",
      "socorro", "ajuda", "ferido",
    ],
  },
  {
    priority: "alto",
    terms: [
      "dias", "semanas", "semana", "há muito", "ninguém resolve",
      "já avisei", "reclamei", "sem resolução", "grave", "epidemia",
      "doença", "cólera", "contaminado",
    ],
  },
  {
    priority: "baixo",
    terms: [
      "informação", "pergunta", "quero saber", "gostaria", "sugestão",
      "elogio", "obrigado",
    ],
  },
];

const SENTIMENT_RULES: Array<{ sentiment: ClassificationResult["sentiment"]; terms: string[] }> = [
  {
    sentiment: "complaint",
    terms: [
      "reclamação", "reclamar", "insatisfeito", "absurdo", "vergonhoso",
      "inaceitável", "não suporto", "cansado", "sem solução",
    ],
  },
  {
    sentiment: "request",
    terms: [
      "pedido", "solicitar", "pedir", "gostaria", "preciso", "necesito",
      "quero", "solicito",
    ],
  },
  {
    sentiment: "report",
    terms: [
      "informo", "comunico", "existe", "há", "tem", "vejo", "encontrei",
      "verificar",
    ],
  },
];

// Bairros e zonas reconhecidas nos Mulenvos / Luanda Sul
const KNOWN_LOCATIONS: string[] = [
  "km 12", "km12", "km 11", "km11", "km 14", "km14",
  "capalanga", "boa-fé", "boa fé", "boafé", "cacuaco",
  "caop", "caop a", "caop b", "caop c",
  "mulenvos", "sambizanga", "morro bento", "mabor",
  "prenda", "marçal", "golfe", "gamek",
  "rua principal", "rua 1", "rua 2", "rua 3", "av",
  "avenida", "beco", "mercado",
];

// ── Motor principal ───────────────────────────────────────────────────────────

/**
 * Classifica uma mensagem de texto livre.
 * Opera em O(n·m) onde n = texto tokens, m = dicionário. Instantâneo em produção.
 */
export function classifyMessage(rawText: string): ClassificationResult {
  const text  = rawText.trim();
  const lower = text.toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos para matching

  // ── Categoria ──────────────────────────────────────────────────────────────
  let bestCategory: Category = "outros";
  let bestScore = 0;
  const foundKeywords: string[] = [];

  for (const rule of CATEGORY_RULES) {
    const hits = rule.terms.filter(t => lower.includes(t.normalize("NFD").replace(/[̀-ͯ]/g, "")));
    if (hits.length > bestScore) {
      bestScore    = hits.length;
      bestCategory = rule.category;
      foundKeywords.push(...hits);
    }
  }

  // ── Prioridade ─────────────────────────────────────────────────────────────
  let priority: Priority = "normal";
  for (const rule of PRIORITY_RULES) {
    const hit = rule.terms.some(t => lower.includes(t.normalize("NFD").replace(/[̀-ͯ]/g, "")));
    if (hit) {
      priority = rule.priority;
      break; // primeiro match (mais grave primeiro)
    }
  }

  // ── Sentimento ─────────────────────────────────────────────────────────────
  let sentiment: ClassificationResult["sentiment"] = "unknown";
  for (const rule of SENTIMENT_RULES) {
    const hit = rule.terms.some(t => lower.includes(t.normalize("NFD").replace(/[̀-ͯ]/g, "")));
    if (hit) { sentiment = rule.sentiment; break; }
  }

  // ── Localização ────────────────────────────────────────────────────────────
  let location: string | null = null;
  for (const loc of KNOWN_LOCATIONS) {
    if (lower.includes(loc.normalize("NFD").replace(/[̀-ͯ]/g, ""))) {
      location = loc
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }

  // Tenta extrair "KM\d+" que não esteja na lista
  if (!location) {
    const kmMatch = lower.match(/km\s*(\d+)/);
    if (kmMatch) location = `KM ${kmMatch[1]}`;
  }

  return {
    category: bestCategory,
    priority,
    location,
    keywords: [...new Set(foundKeywords)],
    sentiment,
    rawText: text,
  };
}

// ── Utilitários de apresentação ────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<Category, string> = {
  saneamento:   "🗑️ Saneamento",
  energia:      "⚡ Energia",
  vias_publicas:"🚧 Vias Públicas",
  seguranca:    "🔒 Segurança",
  saude:        "🏥 Saúde",
  agua:         "💧 Água",
  habitacao:    "🏠 Habitação",
  educacao:     "📚 Educação",
  outros:       "📋 Outros",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgente: "🔴 Urgente",
  alto:    "🟠 Alto",
  normal:  "🟡 Normal",
  baixo:   "🟢 Baixo",
};
