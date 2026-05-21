/**
 * contact.ts — Número institucional único do OP1NA1
 *
 * Princípio de Contacto Único: um único número (+244 958 746 812)
 * serve como porta de entrada universal para todos os canais.
 *
 * NUNCA hardcode estes valores noutros ficheiros — importe sempre daqui.
 */

/** Número base sem prefixo, sem espaços */
export const INST_NUMBER_BARE = "958746812";

/** Formato de apresentação ao cidadão */
export const INST_NUMBER_DISPLAY = "958 746 812";

/** Formato E.164 completo */
export const INST_NUMBER_E164 = "+244958746812";

/** Código de país Angola */
export const ANGOLA_CODE = "244";

// ── Deep links ────────────────────────────────────────────────────────────────

/**
 * WhatsApp: abre conversa com mensagem pré-preenchida.
 * O bot responde com o menu de atendimento.
 */
export const WA_DEEPLINK =
  `https://wa.me/${ANGOLA_CODE}${INST_NUMBER_BARE}` +
  `?text=${encodeURIComponent("Olá")}`;

/**
 * SMS: abre app de mensagens com número e texto pré-preenchido.
 * O sistema recebe e cria ticket automaticamente.
 *
 * Nota: iOS usa `&body=`, Android usa `?body=` — formato RFC 5724 usa `?body=`.
 * Alguns browsers aceitam ambos; usamos `?body=` por maior compatibilidade.
 */
export const SMS_DEEPLINK =
  `sms:${INST_NUMBER_E164}` +
  `?body=${encodeURIComponent("OP1NA1: ")}`;

/**
 * Chamada telefónica — abre marcador com número pré-preenchido.
 */
export const CALL_DEEPLINK = `tel:${INST_NUMBER_E164}`;

// ── Redes sociais institucionais ──────────────────────────────────────────────

/**
 * Página oficial do Município dos Mulenvos no Facebook.
 * Utilizado em: cards de mediadores, canal Messenger, contexto Web.
 */
export const FACEBOOK_PAGE = "https://www.facebook.com/luanda.municipiomulenvos";

/**
 * Messenger directo via m.me (redireciona para a página de Facebook acima).
 */
export const MESSENGER_DEEPLINK = "https://m.me/luanda.municipiomulenvos";

// ── URLs da aplicação ──────────────────────────────────────────────────────────

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://op1na1-next.vercel.app";
