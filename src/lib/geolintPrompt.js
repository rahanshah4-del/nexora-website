/**
 * GeoLint "Fix with AI": turns the measured audit result into a ready-to-paste prompt for an
 * AI coding tool. Pure functions, no network and no React. The prompt carries only what the
 * audit really measured (the page address, the evidence, the steps, the snippet) and tells the
 * tool not to invent facts, so a copied prompt cannot add made-up numbers to a website.
 */

import { PRIORITY_LABELS, solutionSteps } from './geolintReport.js'

/** Tools offered in the picker. `mark` is the key in AI_ENGINE_PATHS, or '' for a plain icon. */
export const FIX_PROMPT_TOOLS = Object.freeze([
  {
    id: 'claude',
    name: 'Claude Code',
    mark: 'claude',
    where: 'Paste in Claude Code, inside your website project folder.',
    intro: 'You are working inside my website project. Make the changes below directly in the source files, then show me a short summary of every file you changed.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT / Codex',
    mark: 'chatgpt',
    where: 'Paste in ChatGPT or Codex, together with the page source or the repository.',
    intro: 'Act as a senior web developer. Apply the fixes below to my website. If you cannot see my files, ask me for the page source first, then return the full corrected code for each file.',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    mark: '',
    where: 'Paste in Cursor chat (Agent mode), with your website project open.',
    intro: 'Use Agent mode. Edit the project files directly to apply the fixes below, keep the existing code style, and list the files you changed when you finish.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    mark: 'gemini',
    where: 'Paste in Gemini, together with the page source or the repository.',
    intro: 'Act as a senior web developer. Apply the fixes below to my website. If you cannot see my files, ask me for the page source first, then return the full corrected code for each file.',
  },
])

const RULES = [
  'Use only real, checkable facts that already exist on my site or that I give you. Never invent figures, prices, dates, sources or claims.',
  'Change only what each fix asks for. Do not redesign pages or remove existing content.',
  'Keep the page readable without JavaScript: the text must stay in the server HTML.',
  'When you finish, tell me how to confirm each fix, then I will run GeoLint again.',
]

const clip = (value, max) => {
  const text = String(value ?? '').replace(/\r/g, '').trim()
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

export function toolById(id) {
  return FIX_PROMPT_TOOLS.find((t) => t.id === id) || FIX_PROMPT_TOOLS[0]
}

function fixBlock(item, number) {
  const priority = (PRIORITY_LABELS[item?.priority] || PRIORITY_LABELS.medium).label
  const lines = [`## Fix ${number}: ${clip(item?.title, 200)} (${priority}${item?.upTo > 0 ? `, up to +${item.upTo} points` : ''})`]
  if (item?.problem) lines.push(`Problem: ${clip(item.problem, 500)}`)
  if (Array.isArray(item?.evidence) && item.evidence.length) {
    lines.push('What GeoLint measured:')
    for (const e of item.evidence.slice(0, 8)) lines.push(`- ${clip(e, 300)}`)
  }
  lines.push('What to do:')
  solutionSteps(item).slice(0, 8).forEach((s, i) => lines.push(`${i + 1}. ${clip(s, 400)}`))
  if (item?.snippet?.code) {
    lines.push(`Starting point (${clip(item.snippet.label || 'snippet', 80)}):`)
    lines.push('```' + (item.snippet.lang || ''))
    lines.push(clip(item.snippet.code, 1500))
    lines.push('```')
  }
  if (item?.verify) lines.push(`How to check it worked: ${clip(item.verify, 300)}`)
  return lines.join('\n')
}

function header(report, toolId, scopeLine) {
  const tool = toolById(toolId)
  const url = clip(report?.url || report?.page?.url || '', 300)
  const score = Number.isFinite(report?.score?.total) ? `${Math.round(report.score.total * 10) / 10}/100` : null
  return [
    tool.intro,
    '',
    `Page audited by GeoLint: ${url || '(address not recorded)'}`,
    score ? `Current GEO score: ${score}` : null,
    scopeLine,
    '',
    'Rules:',
    ...RULES.map((r) => `- ${r}`),
  ].filter((l) => l !== null).join('\n')
}

/** Prompt for one fix. */
export function buildFixPrompt(item, report, toolId = 'claude', number = 1) {
  return `${header(report, toolId, 'Apply the one fix below.')}\n\n${fixBlock(item, number)}\n`
}

/** One prompt that applies every fix, most important first (the order the report already uses). */
export function buildAllPrompt(report, toolId = 'claude') {
  const items = Array.isArray(report?.remediation) ? report.remediation : []
  if (!items.length) return ''
  const scope = `Apply all ${items.length} fixes below, in this order, one after the other.`
  return `${header(report, toolId, scope)}\n\n${items.map((item, i) => fixBlock(item, i + 1)).join('\n\n')}\n`
}
