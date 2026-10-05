import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BRAND, brandedEmail, brandedText } from '../functions/marketingEmailLayout.js'
import { TEMPLATE_SPECS } from '../functions/marketingTemplateSpecs.js'
import { AUTOMATION_SEQUENCES } from '../functions/marketingAutomationLogic.js'
import { MARKETING_TEMPLATES } from '../src/lib/marketingTemplates.js'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('the admin copy of the layout and the copy specs match the functions copy exactly', () => {
  assert.equal(read('src/lib/marketingEmailLayout.js'), read('functions/marketingEmailLayout.js'))
  assert.equal(read('src/lib/marketingTemplateSpecs.js'), read('functions/marketingTemplateSpecs.js'))
})

test('every template carries the logo, a button, an unsubscribe link and a plain-text twin', () => {
  assert.equal(MARKETING_TEMPLATES.length, TEMPLATE_SPECS.length)
  for (const tpl of MARKETING_TEMPLATES) {
    assert.ok(tpl.subject && tpl.name && tpl.group, `${tpl.id} has name, group, subject`)
    assert.ok(tpl.bodyHtml.includes(BRAND.logo), `${tpl.id} shows the logo`)
    assert.match(tpl.bodyHtml, /href="https:\/\/nexorasolution\.online[^"]*"[^>]*>[^<]*<\/a>\s*<\/td>/, `${tpl.id} has a button`)
    assert.ok(tpl.bodyHtml.includes('href="{{unsubscribe}}"'), `${tpl.id} html unsubscribe`)
    assert.ok(tpl.bodyText.includes('{{unsubscribe}}'), `${tpl.id} text unsubscribe`)
    assert.doesNotMatch(tpl.bodyText, /<[a-z]/i, `${tpl.id} text has no html`)
    assert.ok(tpl.bodyHtml.startsWith('<!doctype html>'))
  }
})

test('template ids are unique and every automation points at a real template', () => {
  const ids = TEMPLATE_SPECS.map((spec) => spec.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const sequence of AUTOMATION_SEQUENCES) assert.ok(ids.includes(sequence.templateId), sequence.id)
})

test('only the two supported placeholders are used', () => {
  for (const tpl of MARKETING_TEMPLATES) {
    const found = new Set((`${tpl.subject} ${tpl.bodyHtml} ${tpl.bodyText}`).match(/\{\{[^}]*\}\}/g) || [])
    for (const token of found) assert.ok(['{{name}}', '{{unsubscribe}}'].includes(token), `${tpl.id}: ${token}`)
  }
})

test('titles and preheaders are escaped, so copy cannot break the layout', () => {
  const html = brandedEmail({ title: 'A <b> & "q"', intro: '<p>x</p>', ctaText: 'Go <now>', preheader: '<script>', eyebrow: 'x&y' })
  assert.doesNotMatch(html, /<script>/)
  assert.ok(html.includes('A &lt;b&gt; &amp; &quot;q&quot;'))
  assert.match(brandedText({ title: 't', intro: '<p>Hello&nbsp;<b>you</b></p>', ctaText: 'Go' }), /Hello you/)
})
