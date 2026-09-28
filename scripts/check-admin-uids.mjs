#!/usr/bin/env node
/**
 * Admin UID guard. Platform admin access is by Firebase Auth UID, and the list
 * is repeated in every place that enforces or displays it. This checks that
 * all copies are identical, non-empty, free of the placeholder and shaped like
 * real Firebase Auth UIDs.
 *
 * Runs as a firebase.json predeploy hook for Firestore, Storage and Functions,
 * so rules that would lock every admin out (or that disagree with the UI)
 * cannot be deployed. Also imported by tests/rules/admin-uids.test.mjs.
 *
 *   node scripts/check-admin-uids.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const PLACEHOLDER = 'REPLACE_WITH_ADMIN_UID'

const LIST = /\[([^\]]*)\]/
export const SOURCES = [
  { file: 'firestore.rules', pattern: /function isAdmin\(\) \{\s*return request\.auth\s*!=\s*null\s*&&\s*request\.auth\.uid in (\[[^\]]*\])/ },
  { file: 'storage.rules', pattern: /function isAdmin\(\) \{\s*return request\.auth\s*!=\s*null\s*&&\s*request\.auth\.uid in (\[[^\]]*\])/ },
  { file: 'src/lib/adminUids.js', pattern: /ADMIN_UIDS = Object\.freeze\((\[[^\]]*\])\)/ },
  { file: 'functions/adminUids.js', pattern: /ADMIN_UIDS = Object\.freeze\((\[[^\]]*\])\)/ },
  { file: 'workers/nexora-payments-api/src/index.js', pattern: /ADMIN_UIDS = Object\.freeze\((\[[^\]]*\])\)/ },
  { file: 'workers/nexora-passkeys-api/src/index.js', pattern: /ADMIN_UIDS = Object\.freeze\((\[[^\]]*\])\)/ },
  { file: 'workers/nexora-email-api/src/index.js', pattern: /ADMIN_UIDS = Object\.freeze\((\[[^\]]*\])\)/ },
  { file: 'workers/nexora-releases-api/src/lib.js', pattern: /ADMIN_UIDS = Object\.freeze\((\[[^\]]*\])\)/ },
  { file: 'workers/nexora-ai-gateway/src/index.js', pattern: /ADMIN_UIDS = Object\.freeze\((\[[^\]]*\])\)/ },
]

/** The quoted strings in a `[...]` literal. */
export function parseList(literal) {
  const inner = LIST.exec(literal)?.[1] ?? ''
  return [...inner.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2])
}

export function readAdminUidLists(root = ROOT) {
  return SOURCES.map(({ file, pattern }) => {
    const text = readFileSync(resolve(root, file), 'utf8')
    const match = pattern.exec(text)
    return { file, uids: match ? parseList(match[1]) : null }
  })
}

// Password / Google accounts get 28 random letters and digits. Staff PIN
// logins use server-minted IDs like "CODE-CSH-AB12" (with hyphens), which must
// never be platform admins, so hyphens are rejected.
const UID_SHAPE = /^[A-Za-z0-9]{20,128}$/

/** @returns {string[]} problems; empty when every copy is valid and identical. */
export function adminUidProblems(lists = readAdminUidLists()) {
  const problems = []
  for (const { file, uids } of lists) {
    if (!uids) { problems.push(`${file}: admin UID list not found`); continue }
    if (!uids.length) problems.push(`${file}: admin UID list is empty (every admin would be locked out)`)
    if (uids.includes(PLACEHOLDER)) problems.push(`${file}: still contains the ${PLACEHOLDER} placeholder`)
    for (const uid of uids) {
      if (uid !== PLACEHOLDER && !UID_SHAPE.test(uid)) problems.push(`${file}: "${uid}" does not look like a Firebase Auth UID`)
    }
    if (new Set(uids).size !== uids.length) problems.push(`${file}: duplicate UIDs`)
  }
  const found = lists.filter((l) => l.uids)
  const reference = JSON.stringify([...(found[0]?.uids || [])].sort())
  for (const { file, uids } of found.slice(1)) {
    if (JSON.stringify([...uids].sort()) !== reference) problems.push(`${file}: differs from ${found[0].file}`)
  }
  return problems
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = adminUidProblems()
  if (problems.length) {
    console.error('✖ Admin UID check failed — refusing to deploy:')
    for (const p of problems) console.error(`  - ${p}`)
    console.error('\nPut the real admin UID(s) in every file listed above (Firebase Console → Authentication → Users → User UID).')
    process.exit(1)
  }
  console.log(`✔ Admin UIDs consistent across ${SOURCES.length} files`)
}
