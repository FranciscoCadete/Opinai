/**
 * Converte texto formatado para WhatsApp/Messenger (markdown leve + emojis)
 * em texto plano para SMS e USSD.
 *
 * - Remove emojis Unicode comuns
 * - Remove asteriscos (markdown bold)
 * - Substitui marcadores tipográficos por equivalentes ASCII
 * - Trunca ao limite indicado (default 1500 — SMS Twilio aceita 1600 mas
 *   reservamos margem; USSD precisa muito menos, ver ussdScreen)
 */
export function toPlainText(input: string, maxLen = 1500): string {
  const noEmoji = input
    // emoji ranges (não exaustivo mas cobre os que usamos)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{1F000}-\u{1F2FF}]/gu, "")
    .replace(/[✓✗✅❌⚠⚡●○]/g, "")
    .replace(/[‍️]/g, "") // ZWJ + variation selector
    .replace(/\*([^*]+)\*/g, "$1") // *bold* -> bold
    .replace(/_([^_]+)_/g, "$1") // _italic_ -> italic
    .replace(/[•·]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // collapse multi-blanks
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (noEmoji.length <= maxLen) return noEmoji;
  return noEmoji.slice(0, maxLen - 3) + "...";
}

/**
 * Reduz uma resposta para uma única tela USSD.
 * USSD GSM 7-bit: ~182 chars; alguns operadores mais curto.
 * Truncamos a 160 para segurança e deixamos espaço para "CON " prefix.
 */
export function ussdScreen(input: string, maxLen = 156): string {
  return toPlainText(input, maxLen);
}

/**
 * Decide se uma resposta deve terminar a sessão USSD.
 * Heurística: se a resposta contém "MUL-XXXXXXXX-XXXX" (ticket criado)
 * ou começa por palavras que indicam fim, terminamos com "END".
 */
export function isFinalUssdReply(text: string): boolean {
  if (/MUL-\d{8}-\d{4}/.test(text)) return true;
  if (/Pedido em curso anulado/i.test(text)) return true;
  if (/Submiss[ãa]o cancelada/i.test(text)) return true;
  if (/Pedido .* não encontrado/i.test(text)) return true;
  return false;
}
