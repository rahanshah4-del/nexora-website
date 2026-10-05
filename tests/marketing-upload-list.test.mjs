import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extractEmails, emailsFromFile } from '../src/lib/emailExtract.js'
import { cleanUploadedEmails, MAX_UPLOAD_EMAILS } from '../functions/marketingUploadList.js'

test('extractEmails keeps only addresses, lower-cased and de-duplicated', () => {
  const text = 'Ali Khan 0300-1234567 Ali.Khan@Gmail.com; sara_k@school.edu.pk, <info@shop.co>.\nDuplicate: ali.khan@gmail.com  not-an-email  user@@x'
  assert.deepEqual(extractEmails(text), ['ali.khan@gmail.com', 'sara_k@school.edu.pk', 'info@shop.co'])
  assert.deepEqual(extractEmails(''), [])
})

test('cleanUploadedEmails drops invalid, duplicate, opted-out and admin addresses', () => {
  const result = cleanUploadedEmails(['a@x.com', 'A@x.com', 'bad', 'b@y.org', 'admin@nexora.com', 'c@z.com'], new Set(['b@y.org']))
  assert.deepEqual(result.emails, ['a@x.com', 'c@z.com'])
  assert.equal(result.invalid, 2)
  assert.equal(result.duplicates, 1)
  assert.equal(result.optedOut, 1)
  assert.equal(cleanUploadedEmails('nope').emails.length, 0)
})

test('cleanUploadedEmails caps the list size', () => {
  const many = Array.from({ length: MAX_UPLOAD_EMAILS + 5 }, (_, index) => `u${index}@x.com`)
  const result = cleanUploadedEmails(many)
  assert.equal(result.emails.length, MAX_UPLOAD_EMAILS)
  assert.equal(result.tooMany, true)
})

test('emailsFromFile reads a real .docx and a text file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'docx-'))
  const docx = join(dir, 'list.docx')
  execFileSync('python3', ['-c', `
import zipfile,sys
z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)
z.writestr('[Content_Types].xml','<Types/>')
z.writestr('word/document.xml','<w:document><w:body><w:p><w:r><w:t>Name Ali </w:t></w:r><w:r><w:t>ali@</w:t></w:r><w:r><w:t>shop.com</w:t></w:r></w:p><w:p><w:r><w:t>sara@school.pk</w:t></w:r></w:p></w:body></w:document>')
z.close()`, docx])
  const file = new File([readFileSync(docx)], 'list.docx')
  assert.deepEqual(await emailsFromFile(file), ['ali@shop.com', 'sara@school.pk'])
  assert.deepEqual(await emailsFromFile(new File(['x a@b.co y'], 'l.txt')), ['a@b.co'])
})
