import { AI_ENGINE_PATHS } from './aiEngineMarks.js'

// Only engines whose crawlers GeoLint really tests or reports (see the bot table in the report).
const ENGINES = [
  { key: 'chatgpt', name: 'ChatGPT', bots: 'OAI-SearchBot · GPTBot' },
  { key: 'claude', name: 'Claude', bots: 'Claude-SearchBot · ClaudeBot' },
  { key: 'perplexity', name: 'Perplexity', bots: 'PerplexityBot' },
  { key: 'gemini', name: 'Google Gemini', bots: 'Google-Extended' },
  { key: 'apple', name: 'Apple Intelligence', bots: 'Applebot-Extended' },
]

/** "Checks the crawlers behind…" logo strip for the GeoLint hero. */
export default function AiEngineLogos() {
  return (
    <div className="mt-10" data-testid="ai-engine-logos">
      <p className="text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">Checks the crawlers behind the AI tools your customers use</p>
      <ul className="mx-auto mt-5 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="AI engines GeoLint checks">
        {ENGINES.map((e) => (
          <li key={e.key} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center transition hover:border-white/25 hover:bg-white/[0.08]">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-white/90" fill="currentColor" aria-hidden="true" focusable="false"><path d={AI_ENGINE_PATHS[e.key]} /></svg>
            <span className="text-[14px] font-semibold text-white">{e.name}</span>
            <span className="text-[11px] leading-4 text-slate-400">{e.bots}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[11px] text-slate-500">Logos belong to their owners and only identify the engines checked. No partnership or endorsement is implied.</p>
    </div>
  )
}
