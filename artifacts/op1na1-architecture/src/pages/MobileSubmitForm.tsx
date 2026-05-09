import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

const CODE_FORM = `<!DOCTYPE html>
<html lang="pt" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="description" content="Submeta o seu relatório ao Município dos Mulenvos.">
  <meta name="theme-color" content="#1e2d4a">
  <title>Submeter Relatório — OP1NA1 | Mulenvos</title>
  <!-- All CSS and JS inline — zero external dependencies -->
  <!-- Full source at /submeter/index.html -->
</head>
<body>
  <a href="#main" class="skip-link">Saltar para o conteúdo principal</a>

  <!-- STEP 1: Type selector — works without JavaScript via CSS :checked -->
  <fieldset>
    <legend class="sr-only">Tipo de relatório</legend>
    <input type="radio" name="report_type" id="t-reclamacao"
           value="Reclamação" class="type-input" required>
    <label for="t-reclamacao" class="type-label">
      <span aria-hidden="true">🔴</span>
      <span class="type-name">Reclamação</span>
      <span class="type-desc">Problema ou falha num serviço municipal</span>
    </label>
    <!-- + Sugestão, Denúncia, Solicitação, Elogio -->
  </fieldset>

  <!-- STEP 2: Details (JS-enhanced) -->
  <!-- textarea + char counter + image upload + MediaRecorder audio -->
  <!-- GPS via navigator.geolocation + manual bairro select -->
  <!-- Anonymous toggle -->

  <!-- STEP 3: Confirmation (JS-generated) -->
  <!-- ticket-id: MUL-YYYYMMDD-XXXX -->
  <!-- WhatsApp share: wa.me/?text=... -->

  <script>
    // Step navigation, validation, GPS, MediaRecorder, FileReader, ticket ID
  </script>
</body>
</html>`;

const WCAG_CHECKS = [
  { criterion: "1.1.1 Non-text Content",     level: "A",  impl: "Todos os ícones têm aria-hidden; imagens têm alt descritivo" },
  { criterion: "1.3.1 Info and Relationships",level: "A",  impl: "fieldset + legend para radio group; labels para todos os inputs" },
  { criterion: "1.3.5 Identify Input Purpose",level: "AA", impl: "autocomplete attributes em campos de contacto" },
  { criterion: "1.4.3 Contrast (Minimum)",    level: "AA", impl: "Navy #1e2d4a sobre branco: ratio 13.6:1 ✓; Red #CC0000: 5.9:1 ✓" },
  { criterion: "2.1.1 Keyboard",             level: "A",  impl: "Todos os controlos acessíveis por teclado; Enter activa upload zone" },
  { criterion: "2.4.1 Bypass Blocks",        level: "A",  impl: "Skip link 'Saltar para conteúdo principal'" },
  { criterion: "2.4.3 Focus Order",          level: "A",  impl: "Focus gerido manualmente na transição entre passos" },
  { criterion: "2.4.7 Focus Visible",        level: "AA", impl: ":focus-visible com outline 3px red em todos os elementos interactivos" },
  { criterion: "3.1.1 Language of Page",     level: "A",  impl: "lang='pt' no html; dir='ltr' para RTL-ready" },
  { criterion: "4.1.1 Parsing",             level: "A",  impl: "HTML5 válido com roles e aria correcto" },
  { criterion: "4.1.2 Name, Role, Value",    level: "A",  impl: "aria-required, aria-invalid, aria-pressed, aria-live em todos os estados dinâmicos" },
  { criterion: "4.1.3 Status Messages",      level: "AA", impl: "aria-live='polite' no contador de caracteres e status do GPS; aria-live='assertive' em erros críticos" },
];

const WEIGHT_BREAKDOWN = [
  { file: "HTML (estrutura + semântica)", size: "~8 KB" },
  { file: "CSS inline (reset + components)", size: "~12 KB" },
  { file: "JS inline (validação + GPS + media)", size: "~9 KB" },
  { file: "Ícones (Unicode emoji — zero bytes)", size: "0 KB" },
  { file: "Fontes (system-ui stack)", size: "0 KB" },
  { file: "Imagens externas", size: "0 KB" },
  { file: "Total não-comprimido", size: "~29 KB", highlight: true },
  { file: "Target (150 KB)", size: "150 KB", highlight: true },
];

const FEATURES = [
  {
    title: "Passo 1 funciona sem JavaScript",
    desc: "Radio inputs com labels estilizados via CSS. Selecção visual controlada por input:checked + label. Nenhum JS necessário para escolher o tipo de relatório.",
    icon: "🔌",
  },
  {
    title: "GPS via navigator.geolocation",
    desc: "enableHighAccuracy=true, timeout=10s. Estados: loading → success (coordenadas) → error (com mensagem específica por código de erro). Deduplicação com maximumAge=60s.",
    icon: "📍",
  },
  {
    title: "Gravação de áudio — MediaRecorder API",
    desc: "Solicita permissão getUserMedia({ audio: true }). Limite de 2 minutos com countdown visual. Fallback gracioso em browsers sem suporte. Blob em audio/webm.",
    icon: "🎙️",
  },
  {
    title: "Upload de imagens com preview",
    desc: "FileReader para pré-visualização inline. Validação: máx 3 ficheiros, máx 5 MB cada, MIME whitelist (JPEG, PNG, WebP). Drag-and-drop + toque. Remoção individual.",
    icon: "📷",
  },
  {
    title: "Contador de caracteres em tempo real",
    desc: "aria-live='polite' para leitores de ecrã. Cores progressivas: normal → laranja (700+) → vermelho (900+). Bloqueio de submissão se <10 ou >1000 caracteres.",
    icon: "✍️",
  },
  {
    title: "Ticket ID gerado no cliente",
    desc: "Formato MUL-YYYYMMDD-XXXX. Em produção, o servidor retorna o ID real. Cliente usa ID temporário para o WhatsApp share enquanto aguarda confirmação assíncrona.",
    icon: "🎫",
  },
  {
    title: "WhatsApp share nativo",
    desc: "wa.me/?text=... com mensagem pré-formatada: tipo, bairro, ticket ID e link de acompanhamento. window.open com noopener para segurança. Zero dependência do SDK WhatsApp.",
    icon: "💬",
  },
  {
    title: "RTL-ready com propriedades lógicas CSS",
    desc: "margin-inline-start/end, padding-inline, inset-inline-start, border-inline. Mudar dir='rtl' no html adapta o layout automaticamente para árabe ou hebraico.",
    icon: "🌍",
  },
];

const BAIRROS = [
  "Rangel", "Palanca", "Camama", "Golf 2", "Benfica", "Kikolo",
  "Cazenga", "Hoji Ya Henda", "Viana", "Rocha Pinto", "São Paulo",
  "Terra Nova", "Prenda", "Mota", "Marçal",
];

const REPORT_TYPES = [
  { icon: "🔴", name: "Reclamação",  desc: "Problema ou falha num serviço municipal" },
  { icon: "💡", name: "Sugestão",    desc: "Ideia para melhorar o município" },
  { icon: "⚠️",  name: "Denúncia",   desc: "Irregularidade ou infracção a reportar" },
  { icon: "📋", name: "Solicitação", desc: "Pedido de serviço ou informação" },
  { icon: "⭐", name: "Elogio",      desc: "Reconhecer um bom serviço prestado" },
];

export default function MobileSubmitForm() {
  const [activeTab, setActiveTab] = useState("preview");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Formulário Móvel de Submissão
        </h1>
        <p className="text-muted-foreground">
          Pure HTML · CSS · Vanilla JS · WCAG 2.1 AA · 2G-ready · &lt;30 KB · Português Angolano
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["Zero dependências", "29 KB total", "WCAG 2.1 AA", "Funciona sem JS (passo 1)", "RTL-ready", "2G-ready"].map(t => (
          <span key={t} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium">{t}</span>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto p-1 bg-secondary flex flex-wrap gap-1 w-full mb-2">
          {[
            { id: "preview",  label: "Pré-visualização" },
            { id: "features", label: "Funcionalidades" },
            { id: "wcag",     label: "WCAG 2.1 AA" },
            { id: "weight",   label: "Peso & performance" },
            { id: "code",     label: "HTML (estrutura)" },
          ].map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs px-3 py-1.5 font-mono">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Preview ──────────────────────────────────────── */}
        <TabsContent value="preview" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">Formulário live — simulação de ecrã móvel</p>
              <a
                href="/submeter/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
              >
                Abrir em nova janela ↗
              </a>
            </div>
            <div className="flex justify-center">
              <div
                className="border-4 border-gray-800 rounded-[32px] overflow-hidden shadow-xl bg-gray-800"
                style={{ width: 375, height: 680 }}
              >
                <div className="bg-gray-800 h-6 flex items-center justify-center">
                  <div className="w-20 h-1.5 bg-gray-600 rounded-full"></div>
                </div>
                <iframe
                  src="/submeter/index.html"
                  title="Formulário de submissão OP1NA1"
                  className="w-full bg-white"
                  style={{ height: 640, border: "none" }}
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Step breakdown */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">3 passos do formulário</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: 1, title: "Tipo", desc: "5 tipos com ícone e descrição. Selecção via radio input. Funciona sem JS.", color: "border-l-blue-500 bg-blue-50" },
                { step: 2, title: "Detalhes", desc: "Texto + contador, 3 fotos, áudio 2min, GPS + bairro, toggle anónimo.", color: "border-l-amber-500 bg-amber-50" },
                { step: 3, title: "Confirmação", desc: "Ticket ID MUL-YYYYMMDD-XXXX, resumo, botão WhatsApp share.", color: "border-l-green-500 bg-green-50" },
              ].map(s => (
                <div key={s.step} className={cn("border-l-4 rounded-r-lg p-4", s.color)}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold">{s.step}</span>
                    <span className="font-bold text-foreground">{s.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Report types + bairros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">5 Tipos de relatório</h2>
              <div className="space-y-2">
                {REPORT_TYPES.map(t => (
                  <div key={t.name} className="flex items-center gap-3">
                    <span className="text-2xl shrink-0">{t.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {BAIRROS.length} bairros no dropdown
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {BAIRROS.map(b => (
                  <span key={b} className="text-xs bg-secondary px-2 py-0.5 rounded font-medium text-foreground">{b}</span>
                ))}
                <span className="text-xs bg-secondary px-2 py-0.5 rounded font-medium text-muted-foreground">+ Outro</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Features ────────────────────────────────────── */}
        <TabsContent value="features" className="space-y-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-card border border-border rounded-lg p-5 shadow-sm flex gap-4">
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── WCAG ───────────────────────────────────────── */}
        <TabsContent value="wcag">
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">♿</span>
              <div>
                <p className="font-semibold text-foreground text-sm">Conformidade WCAG 2.1 Nível AA</p>
                <p className="text-xs text-muted-foreground">12 critérios verificados</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-semibold text-foreground">Critério</th>
                    <th className="text-left py-2 pr-3 font-semibold text-foreground w-12">Nível</th>
                    <th className="text-left py-2 font-semibold text-foreground">Implementação</th>
                  </tr>
                </thead>
                <tbody>
                  {WCAG_CHECKS.map((c, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-mono text-foreground whitespace-nowrap">{c.criterion}</td>
                      <td className="py-2 pr-3">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-xs font-bold",
                          c.level === "AA" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        )}>{c.level}</span>
                      </td>
                      <td className="py-2 text-muted-foreground">{c.impl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Weight ─────────────────────────────────────── */}
        <TabsContent value="weight" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Análise de peso — 1 ficheiro HTML auto-contido
            </h2>
            <div className="space-y-2">
              {WEIGHT_BREAKDOWN.map((w, i) => (
                <div key={i} className={cn(
                  "flex justify-between text-sm",
                  w.highlight ? "font-bold text-foreground border-t border-border pt-2 mt-2" : "text-muted-foreground"
                )}>
                  <span>{w.file}</span>
                  <code className={cn("font-mono", w.highlight && w.size === "~29 KB" ? "text-green-600" : "")}>{w.size}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Optimizações 2G</h2>
            {[
              { t: "Zero fontes externas", d: "system-ui, -apple-system, Segoe UI, Roboto — fontes do sistema operativo. Zero pedidos de rede para tipografia." },
              { t: "Zero imagens estáticas", d: "Todos os ícones são emoji Unicode (U+26XX, U+1F4XX). Zero bytes de imagem no carregamento inicial." },
              { t: "Lazy loading do iframe", d: "O simulador móvel no portal usa loading='lazy'. A página real não tem iframes." },
              { t: "maximumAge=60s no GPS", d: "Reutiliza posição GPS cacheada de até 1 minuto. Evita re-request em 2G que pode demorar 5–10s." },
              { t: "CSS animations desactivadas com prefers-reduced-motion", d: "Utilizadores com sensibilidade a movimento têm animações desactivadas automaticamente." },
              { t: "touch-action: manipulation nos botões", d: "Elimina o delay de 300ms no toque em dispositivos móveis sem necessidade de FastClick ou outros hacks." },
            ].map(item => (
              <div key={item.t} className="border border-border rounded-lg p-4">
                <p className="font-semibold text-sm text-foreground mb-1">{item.t}</p>
                <p className="text-xs text-muted-foreground">{item.d}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Code ───────────────────────────────────────── */}
        <TabsContent value="code">
          <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-4 text-sm">
            <p className="font-semibold text-foreground mb-1">📄 Ficheiro completo</p>
            <p className="text-xs text-muted-foreground">
              O HTML completo está em <code className="bg-secondary px-1 rounded font-mono">public/submeter/index.html</code>.
              A estrutura abaixo mostra os padrões chave — radio CSS-only para o passo 1, aria attributes, e JS progressivo.
            </p>
          </div>
          <CodeBlock code={CODE_FORM} language="html" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
