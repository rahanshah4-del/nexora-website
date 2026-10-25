/** GeoLint "Fix with AI": prompt builder and report wiring. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FIX_PROMPT_TOOLS, buildAllPrompt, buildFixPrompt, toolById } from '../src/lib/geolintPrompt.js'

const report = {
  url: 'https://example.com/',
  score: { total: 82.7 },
  remediation: [
    { id: 'bluf', module: 'bluf', priority: 'high', title: '26 of 40 sections do not open with a direct answer', problem: 'AI tools quote the first sentences.', evidence: ['"CRM" (H3): 17 words'], steps: ['Rewrite the first paragraph.'], snippet: { label: 'Template', lang: 'html', code: '<p>X is Y.</p>' }, verify: 'Audit again', upTo: 11.3, confidence: 'likely' },
    { id: 'src', module: 'facts', priority: 'medium', title: 'Few outside sources are linked', problem: 'Link sources.', evidence: [], upTo: 4, confidence: 'heuristic' },
  ],
}

test('four tools are offered and Claude Code is the default', () => {
  assert.deepEqual(FIX_PROMPT_TOOLS.map((t) => t.id), ['claude', 'chatgpt', 'cursor', 'gemini'])
  assert.equal(toolById('nope').id, 'claude')
})

test('one prompt per fix carries the page, the evidence, the steps and the snippet', () => {
  const p = buildFixPrompt(report.remediation[0], report, 'claude', 1)
  assert.match(p, /https:\/\/example\.com\//)
  assert.match(p, /82\.7\/100/)
  assert.match(p, /17 words/)
  assert.match(p, /Rewrite the first paragraph/)
  assert.match(p, /<p>X is Y\.<\/p>/)
  assert.match(p, /up to \+11\.3 points/)
})

test('the all-in-one prompt lists every fix in report order and forbids invented facts', () => {
  const p = buildAllPrompt(report, 'cursor')
  assert.ok(p.indexOf('## Fix 1') < p.indexOf('## Fix 2'))
  assert.match(p, /Apply all 2 fixes/)
  assert.match(p, /Never invent figures/)
  assert.match(p, /Agent mode/)
})

test('a fix without steps still gets a default way out, and no remediation gives no prompt', () => {
  assert.match(buildFixPrompt(report.remediation[1], report, 'gemini', 2), /What to do:\n1\. /)
  assert.equal(buildAllPrompt({ remediation: [] }, 'claude'), '')
})

test('report page shows the all-in-one card and a prompt row in each fix', () => {
  const page = readFileSync(new URL('../src/pages/public/tools/GeoAuditReportPage.jsx', import.meta.url), 'utf8')
  assert.match(page, /<FixAllPromptPanel report=\{report\} \/>/)
  assert.match(page, /<FixPromptRow item=\{item\} report=\{report\} number=\{index \+ 1\} \/>/)
})
