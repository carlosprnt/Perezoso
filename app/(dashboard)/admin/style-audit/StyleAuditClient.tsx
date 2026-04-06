'use client'

// ─── Data ─────────────────────────────────────────────────────────────────────

const TEXT_COLORS = [
  { hex: '#121212', uses: 131, role: 'Primary text (light)', dark: false, issue: null },
  { hex: '#424242', uses: 34, role: 'Secondary text', dark: false, issue: null },
  { hex: '#616161', uses: 22, role: 'Muted text', dark: false, issue: null },
  { hex: '#737373', uses: 67, role: 'Grey text', dark: false, issue: null },
  { hex: '#F2F2F7', uses: 115, role: 'Primary text (dark)', dark: true, issue: null },
  { hex: '#AEAEB2', uses: 58, role: 'Secondary text (dark)', dark: true, issue: null },
  { hex: '#8E8E93', uses: 104, role: 'Muted text (dark)', dark: true, issue: null },
]

const BG_COLORS = [
  { hex: '#FFFFFF', uses: 20, role: 'Card surface', dark: false, issue: null },
  { hex: '#F7F8FA', uses: 24, role: 'Page background', dark: false, issue: 'Very close to #FAFAFA' },
  { hex: '#FAFAFA', uses: 7, role: 'Page background alt', dark: false, issue: 'Nearly identical to #F7F8FA — merge' },
  { hex: '#F5F5F5', uses: 36, role: 'Input / hover surface', dark: false, issue: 'Close to #F0F0F0' },
  { hex: '#F0F0F0', uses: 51, role: 'Skeleton / divider', dark: false, issue: 'Close to #F5F5F5' },
  { hex: '#1C1C1E', uses: 52, role: 'Card surface (dark)', dark: true, issue: null },
  { hex: '#2C2C2E', uses: 134, role: 'Secondary surface (dark)', dark: true, issue: 'Most used bg — needs token' },
  { hex: '#3A3A3C', uses: 42, role: 'Interactive / border (dark)', dark: true, issue: null },
]

const BORDER_COLORS = [
  { hex: '#D4D4D4', uses: 20, role: 'Primary border', dark: false, issue: null },
  { hex: '#E8E8E8', uses: 25, role: 'Subtle border', dark: false, issue: 'Too close to #E5E5E5, #E0E0E0' },
  { hex: '#E5E5E5', uses: 11, role: 'Subtle border alt', dark: false, issue: 'Too close to #E8E8E8' },
  { hex: '#E0E0E0', uses: 12, role: 'Subtle border alt 2', dark: false, issue: 'Too close to #E8E8E8' },
  { hex: '#EDEDED', uses: 5, role: 'Divider', dark: false, issue: 'Too close to #EFEFEF' },
  { hex: '#EFEFEF', uses: 21, role: 'Divider alt', dark: false, issue: 'Too close to #EDEDED' },
  { hex: '#2C2C2E', uses: 134, role: 'Border (dark)', dark: true, issue: 'Shared with bg — ambiguous' },
  { hex: '#3A3A3C', uses: 42, role: 'Accent border (dark)', dark: true, issue: null },
]

const ACCENT_COLORS = [
  { hex: '#3D3BF3', uses: 65, role: 'Primary action — brand indigo', issue: null },
  { hex: '#991B1B', uses: 10, role: 'Danger / error', issue: null },
  { hex: '#16A34A', uses: 9, role: 'Success', issue: null },
  { hex: '#92400E', uses: 3, role: 'Warning', issue: null },
]

const FONT_SIZES = [
  { size: '10px', cls: 'text-[10px]', uses: 4, role: 'Badge labels, tiny captions' },
  { size: '11px', cls: 'text-[11px]', uses: 39, role: 'Section headers (uppercase)' },
  { size: '12px', cls: 'text-xs', uses: 41, role: 'Small secondary text' },
  { size: '13px', cls: 'text-[13px]', uses: 53, role: 'Compact labels' },
  { size: '14px', cls: 'text-sm', uses: 70, role: 'Body text, menu items' },
  { size: '15px', cls: 'text-[15px]', uses: 17, role: 'Emphasis text' },
  { size: '16px', cls: 'text-base / text-[16px]', uses: 24, role: 'Default body' },
  { size: '17px', cls: 'text-[17px]', uses: 24, role: 'Card titles, headings' },
  { size: '22px', cls: 'text-[22px]', uses: 5, role: 'Modal title, large stat' },
  { size: '28px', cls: 'text-[28px]', uses: 4, role: 'Page title, hero stat' },
  { size: '45px', cls: 'text-[45px]', uses: 4, role: 'Empty-state hero headline' },
]

const RADIUS_VALUES = [
  { cls: 'rounded-md', px: '10px', uses: 23, role: 'Badges, small chips' },
  { cls: 'rounded-lg', px: '14px', uses: 13, role: 'Small containers' },
  { cls: 'rounded-xl', px: '18px', uses: 45, role: 'Inputs, buttons, cards' },
  { cls: 'rounded-2xl', px: '28px', uses: 60, role: 'Cards, modals' },
  { cls: 'rounded-3xl', px: '32px', uses: 3, role: 'Hero cards' },
  { cls: 'rounded-[16px]', px: '16px', uses: 8, role: 'Platform logo tiles (one-off)' },
  { cls: 'rounded-t-*', px: '32px top', uses: 4, role: 'Bottom sheets / half-modals' },
  { cls: 'rounded-full', px: '9999px', uses: 89, role: 'Pills, avatars, FABs, close buttons' },
]

const FINDINGS = [
  { severity: 'low', title: '#111111 merged into #121212 ✓', detail: '132 combined uses now under a single value. #111111 no longer appears anywhere in the codebase.' },
  { severity: 'low', title: 'Accent token aligned ✓', detail: '#5B21B6 fully removed. tokens.css --color-accent now matches the real brand indigo #3D3BF3 (66 uses across the app).' },
  { severity: 'low', title: 'Grey text values collapsed ✓', detail: '#888888, #999999, #666666 removed (0 uses). All muted-grey text is now #737373 (69 uses) + #616161 for slightly darker labels.' },
  { severity: 'high', title: 'CSS tokens defined but ignored', detail: 'globals.css defines --color-text-primary, --color-surface etc. Almost no component uses them — all hardcode raw hex. Next step: migrate components to var(--color-*).' },
  { severity: 'medium', title: '6 near-identical light border values', detail: '#E8E8E8 (25), #EFEFEF (21), #E0E0E0 (12), #E5E5E5 (11), #EDEDED (5), plus #F0F0F0 (51) as divider. Collapse to 2 tokens (subtle, default).' },
  { severity: 'medium', title: '3 near-identical light surface backgrounds', detail: '#F7F8FA (24), #FAFAFA (7), #F5F5F5 (36) used as page/section backgrounds. Consolidate to 2.' },
  { severity: 'medium', title: 'Custom pixel font sizes instead of scale', detail: '11 distinct px sizes (10→45). Mostly 1–2px apart. Should map to a named scale (xs, sm, md, lg, xl, 2xl, hero).' },
  { severity: 'medium', title: 'rounded-full has taken over (88 uses)', detail: 'After unifying close buttons, FABs, chips and avatars, rounded-full is the most-used radius by far. Should become the canonical pill/circle token.' },
  { severity: 'low', title: '#2C2C2E used for both bg AND border in dark mode', detail: '134 uses as background, also used as border. Makes intent unclear — different tokens needed.' },
  { severity: 'low', title: 'rounded-[16px] hard-coded in platform tiles', detail: '6 occurrences of rounded-[16px] on QuickAdd platform logos. Either promote to rounded-2xl (→18px) or introduce a dedicated tile radius.' },
  { severity: 'low', title: 'Shadows nearly absent', detail: 'Only shadow-sm and one custom box-shadow in use. Consider a consistent 2-level elevation system.' },
]

const PROPOSED_TOKENS = [
  { token: 'color.text.primary', light: '#121212', dark: '#F2F2F7', replaces: '#121212 (consolidated)' },
  { token: 'color.text.secondary', light: '#424242', dark: '#AEAEB2', replaces: '#424242' },
  { token: 'color.text.muted', light: '#737373', dark: '#8E8E93', replaces: '#737373, #616161 (consolidated)' },
  { token: 'color.surface.base', light: '#FFFFFF', dark: '#1C1C1E', replaces: '#FFFFFF / #1C1C1E' },
  { token: 'color.surface.raised', light: '#F7F8FA', dark: '#2C2C2E', replaces: '#F7F8FA, #FAFAFA / #2C2C2E' },
  { token: 'color.surface.subtle', light: '#F0F0F0', dark: '#3A3A3C', replaces: '#F5F5F5, #F0F0F0 / #3A3A3C' },
  { token: 'color.border.subtle', light: '#E8E8E8', dark: '#2C2C2E', replaces: '#E8E8E8, #E5E5E5, #E0E0E0, #EDEDED, #EFEFEF' },
  { token: 'color.border.default', light: '#D4D4D4', dark: '#3A3A3C', replaces: '#D4D4D4' },
  { token: 'color.accent', light: '#3D3BF3', dark: '#3D3BF3', replaces: '#3D3BF3 (brand indigo — already in tokens)' },
  { token: 'color.danger', light: '#991B1B', dark: '#F87171', replaces: '#991B1B' },
  { token: 'color.success', light: '#16A34A', dark: '#4ADE80', replaces: '#16A34A' },
]

// ─── Component ─────────────────────────────────────────────────────────────────

const SECTIONS = ['Colors', 'Typography', 'Spacing', 'Findings', 'Tokens']

function Swatch({ hex, dark }: { hex: string; dark?: boolean }) {
  return (
    <span
      className="inline-block w-8 h-8 rounded-lg border border-black/10 flex-shrink-0"
      style={{ backgroundColor: hex, boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,0.1)' : undefined }}
    />
  )
}

function Badge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-orange-100 text-orange-700',
    low: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[severity]}`}>
      {severity}
    </span>
  )
}

export default function StyleAuditClient() {
  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#999] bg-[#F0F0F0] dark:bg-[#2C2C2E] dark:text-[#8E8E93] px-2 py-0.5 rounded">Admin</span>
        </div>
        <h1 className="text-[28px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-tight">Style Audit</h1>
        <p className="text-[15px] text-[#737373] dark:text-[#8E8E93] mt-1">
          Análisis del sistema de diseño de Perezoso — basado en el código fuente real.
        </p>
        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            ['3', 'Fixes aplicados ✓'],
            ['6', 'Borders redundantes'],
            ['11', 'Font sizes distintos'],
            ['65', '#3D3BF3 hardcoded'],
          ].map(([n, label]) => (
            <div key={label} className="bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-xl px-4 py-2">
              <p className="text-[22px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-none">{n}</p>
              <p className="text-[12px] text-[#737373] dark:text-[#8E8E93] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky nav */}
      <div className="sticky top-0 z-10 bg-[#F7F8FA] dark:bg-[#121212] py-3 mb-6 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map(s => (
          <a key={s} href={`#${s.toLowerCase()}`}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium bg-white dark:bg-[#2C2C2E] border border-[#E8E8E8] dark:border-[#3A3A3C] text-[#424242] dark:text-[#AEAEB2] hover:bg-[#F0F0F0] dark:hover:bg-[#3A3A3C] transition-colors">
            {s}
          </a>
        ))}
      </div>

      {/* ── Colors ── */}
      <section id="colors" className="mb-12">
        <h2 className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7] mb-4">Colors</h2>

        <div className="mb-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#999] dark:text-[#8E8E93] mb-3">Text</h3>
          <div className="space-y-2">
            {TEXT_COLORS.map(c => (
              <div key={c.hex} className="flex items-center gap-3 bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-xl px-4 py-2.5">
                <Swatch hex={c.hex} dark={c.dark} />
                <code className="text-[13px] font-mono text-[#424242] dark:text-[#AEAEB2] w-24 flex-shrink-0">{c.hex}</code>
                <span className="text-[13px] text-[#737373] dark:text-[#8E8E93] flex-1">{c.role}</span>
                <span className="text-[11px] text-[#999] dark:text-[#8E8E93] w-10 text-right flex-shrink-0">{c.uses}×</span>
                {c.issue && <span className="text-[11px] text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-0.5 rounded-full flex-shrink-0 max-w-[180px] text-right leading-tight">{c.issue}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#999] dark:text-[#8E8E93] mb-3">Backgrounds</h3>
          <div className="space-y-2">
            {BG_COLORS.map(c => (
              <div key={c.hex + c.role} className="flex items-center gap-3 bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-xl px-4 py-2.5">
                <Swatch hex={c.hex} dark={c.dark} />
                <code className="text-[13px] font-mono text-[#424242] dark:text-[#AEAEB2] w-24 flex-shrink-0">{c.hex}</code>
                <span className="text-[13px] text-[#737373] dark:text-[#8E8E93] flex-1">{c.role}</span>
                <span className="text-[11px] text-[#999] dark:text-[#8E8E93] w-10 text-right flex-shrink-0">{c.uses}×</span>
                {c.issue && <span className="text-[11px] text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-0.5 rounded-full flex-shrink-0 max-w-[180px] text-right leading-tight">{c.issue}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#999] dark:text-[#8E8E93] mb-3">Borders</h3>
          <div className="space-y-2">
            {BORDER_COLORS.map(c => (
              <div key={c.hex + c.role} className="flex items-center gap-3 bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-xl px-4 py-2.5">
                <Swatch hex={c.hex} dark={c.dark} />
                <code className="text-[13px] font-mono text-[#424242] dark:text-[#AEAEB2] w-24 flex-shrink-0">{c.hex}</code>
                <span className="text-[13px] text-[#737373] dark:text-[#8E8E93] flex-1">{c.role}</span>
                <span className="text-[11px] text-[#999] dark:text-[#8E8E93] w-10 text-right flex-shrink-0">{c.uses}×</span>
                {c.issue && <span className="text-[11px] text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-0.5 rounded-full flex-shrink-0 max-w-[180px] text-right leading-tight">{c.issue}</span>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#999] dark:text-[#8E8E93] mb-3">Accent & Semantic</h3>
          <div className="space-y-2">
            {ACCENT_COLORS.map(c => (
              <div key={c.hex + c.role} className="flex items-center gap-3 bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-xl px-4 py-2.5">
                <Swatch hex={c.hex} />
                <code className="text-[13px] font-mono text-[#424242] dark:text-[#AEAEB2] w-24 flex-shrink-0">{c.hex}</code>
                <span className="text-[13px] text-[#737373] dark:text-[#8E8E93] flex-1">{c.role}</span>
                {c.issue && <span className="text-[11px] text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded-full flex-shrink-0 max-w-[200px] text-right leading-tight">{c.issue}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Typography ── */}
      <section id="typography" className="mb-12">
        <h2 className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7] mb-4">Typography</h2>

        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-2xl overflow-hidden mb-6">
          {FONT_SIZES.map((f, i) => (
            <div key={f.size} className={`flex items-baseline gap-4 px-5 py-3 ${i < FONT_SIZES.length - 1 ? 'border-b border-[#F0F0F0] dark:border-[#2C2C2E]' : ''}`}>
              <span style={{ fontSize: f.size }} className="font-medium text-[#121212] dark:text-[#F2F2F7] w-40 flex-shrink-0 leading-snug">
                Perezoso
              </span>
              <code className="text-[11px] text-[#999] dark:text-[#8E8E93] w-40 flex-shrink-0">{f.cls}</code>
              <span className="text-[11px] text-[#737373] dark:text-[#8E8E93] flex-1">{f.role}</span>
              <span className="text-[11px] text-[#bbb] dark:text-[#8E8E93]">{f.uses}×</span>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-2xl overflow-hidden mb-4">
          {[
            { w: 'font-normal', label: '400 Normal', uses: 5 },
            { w: 'font-medium', label: '500 Medium', uses: 51 },
            { w: 'font-semibold', label: '600 Semibold', uses: 84 },
            { w: 'font-bold', label: '700 Bold', uses: 50 },
            { w: 'font-extrabold', label: '800 Extrabold', uses: 4 },
          ].map((fw, i, arr) => (
            <div key={fw.w} className={`flex items-center gap-4 px-5 py-3 ${i < arr.length - 1 ? 'border-b border-[#F0F0F0] dark:border-[#2C2C2E]' : ''}`}>
              <span className={`${fw.w} text-[17px] text-[#121212] dark:text-[#F2F2F7] w-40 flex-shrink-0`}>Perezoso</span>
              <code className="text-[11px] text-[#999] dark:text-[#8E8E93] w-32 flex-shrink-0">{fw.w}</code>
              <span className="text-[11px] text-[#737373] dark:text-[#8E8E93] flex-1">{fw.label}</span>
              <span className="text-[11px] text-[#bbb] dark:text-[#8E8E93]">{fw.uses}×</span>
            </div>
          ))}
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-xl px-4 py-3 text-[13px] text-orange-800 dark:text-orange-300">
          ⚠️ <strong>11 font sizes</strong> de 10px a 45px. Recomendado: consolidar a ~6 tamaños con nombres semánticos (xs, sm, md, lg, xl, 2xl, hero).
        </div>
      </section>

      {/* ── Spacing & Radius ── */}
      <section id="spacing" className="mb-12">
        <h2 className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7] mb-4">Spacing & Radius</h2>

        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#999] dark:text-[#8E8E93] mb-3">Escala de espaciado usada</h3>
        <div className="flex flex-wrap gap-3 mb-6">
          {[4,8,10,12,16,20,24,28,32].map(px => (
            <div key={px} className="flex flex-col items-center gap-1.5">
              <div className="bg-[#3D3BF3]/20 border border-[#3D3BF3]/30 rounded" style={{ width: px, height: px }} />
              <span className="text-[10px] text-[#999] dark:text-[#8E8E93]">{px}</span>
            </div>
          ))}
        </div>

        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#999] dark:text-[#8E8E93] mb-3">Border Radius</h3>
        <div className="space-y-2 mb-4">
          {RADIUS_VALUES.map(r => (
            <div key={r.cls} className="flex items-center gap-3 bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-xl px-4 py-2.5">
              <div className="w-8 h-8 bg-[#3D3BF3]/15 border-2 border-[#3D3BF3]/30 flex-shrink-0" style={{ borderRadius: r.px.replace(' top', '') }} />
              <code className="text-[13px] font-mono text-[#424242] dark:text-[#AEAEB2] w-36 flex-shrink-0">{r.cls}</code>
              <span className="text-[12px] text-[#999] dark:text-[#8E8E93] w-14 flex-shrink-0">{r.px}</span>
              <span className="text-[13px] text-[#737373] dark:text-[#8E8E93] flex-1">{r.role}</span>
              <span className="text-[11px] text-[#bbb] dark:text-[#8E8E93]">{r.uses}×</span>
              {r.cls === 'rounded-[16px]' && (
                <span className="text-[11px] text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-0.5 rounded-full flex-shrink-0">override</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Findings ── */}
      <section id="findings" className="mb-12">
        <h2 className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7] mb-1">Findings</h2>
        <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mb-4">{FINDINGS.length} problemas detectados — ordenados por impacto</p>
        <div className="space-y-3">
          {FINDINGS.map((f, i) => (
            <div key={i} className="bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <Badge severity={f.severity} />
                <div>
                  <p className="text-[14px] font-semibold text-[#121212] dark:text-[#F2F2F7] leading-snug">{f.title}</p>
                  <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-1">{f.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Proposed Tokens ── */}
      <section id="tokens" className="mb-12">
        <h2 className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7] mb-1">Proposed Tokens</h2>
        <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mb-4">Sistema unificado propuesto basado en el uso real del código</p>
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-2xl overflow-hidden">
          {PROPOSED_TOKENS.map((t, i) => (
            <div key={t.token} className={`flex items-center gap-3 px-5 py-3 ${i < PROPOSED_TOKENS.length - 1 ? 'border-b border-[#F0F0F0] dark:border-[#2C2C2E]' : ''}`}>
              <div className="flex gap-1 flex-shrink-0">
                <span className="w-5 h-5 rounded-md border border-black/10" style={{ backgroundColor: t.light }} />
                <span className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: t.dark }} />
              </div>
              <code className="text-[12px] font-mono text-[#3D3BF3] dark:text-[#8B89FF] w-44 flex-shrink-0">{t.token}</code>
              <span className="text-[12px] text-[#737373] dark:text-[#8E8E93] flex-1 leading-tight">Reemplaza: <span className="text-[#424242] dark:text-[#AEAEB2]">{t.replaces}</span></span>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-[14px] font-semibold text-[#121212] dark:text-[#F2F2F7]">Plan de implementación</h3>
          {[
            {
              phase: 'Fase 1 — Quick wins ✓ completada',
              color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-800 dark:text-green-300',
              items: ['✓ Unificado #111111 → #121212', '✓ #5B21B6 eliminado; --color-accent ya es #3D3BF3', '✓ Grises #888888/#999999/#666666 colapsados en #737373', 'Pendiente: estandarizar rounded-[16px] en QuickAdd tiles'],
            },
            {
              phase: 'Fase 2 — Normalización media',
              color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300',
              items: ['Unificar 6 valores de border → 2 tokens (subtle, default)', 'Consolidar 3 superficies claras → 2 tokens (surface.base, surface.raised)', 'Adoptar escala tipográfica de 6 tamaños nombrados', 'Añadir token para #2C2C2E bg vs border en dark'],
            },
            {
              phase: 'Fase 3 — Adopción de tokens',
              color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40 text-purple-800 dark:text-purple-300',
              items: ['Migrar todos los componentes a CSS vars (var(--color-text-primary) etc.)', 'Reemplazar todos los hex hardcodeados por tokens en Tailwind config', 'Auditar componentes /ui/ para uso consistente de variantes', 'Documentar el sistema resultante'],
            },
          ].map(p => (
            <div key={p.phase} className={`border rounded-xl px-4 py-3 ${p.color}`}>
              <p className="text-[13px] font-semibold mb-2">{p.phase}</p>
              <ul className="space-y-1">
                {p.items.map(item => (
                  <li key={item} className="text-[12px] flex gap-2">
                    <span className="opacity-50 flex-shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
