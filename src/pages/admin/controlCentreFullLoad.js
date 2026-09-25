/**
 * Background full-collection loading for the Control Centre (read-only).
 *
 * The real-time listeners only cover the first records of each collection, so
 * KPIs and module counts are computed from a paged read of the whole
 * collection instead (ordered by document id — no composite index needed).
 */
import { collection, documentId, getCountFromServer, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore'
import { FULL_LOAD_MAX, FULL_LOAD_PAGE_SIZE, collectPages } from './controlCentreStats.js'

/** Server-side document count (1 read per 1,000 docs), or null if it fails. */
export async function countCollection(db, collectionName) {
  try {
    const snapshot = await getCountFromServer(collection(db, collectionName))
    return snapshot.data().count
  } catch {
    return null
  }
}

/**
 * Read a whole collection in pages of FULL_LOAD_PAGE_SIZE, up to FULL_LOAD_MAX
 * docs. Resolves { rows, capped, cancelled }.
 */
export function loadAllDocs(db, collectionName, { onPage, isCancelled, normalize = (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) } = {}) {
  const base = collection(db, collectionName)
  return collectPages(
    async (cursor, size) => {
      const constraints = [orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(size)]
      const snapshot = await getDocs(query(base, ...constraints))
      return { rows: snapshot.docs.map(normalize), cursor: snapshot.docs[snapshot.docs.length - 1] || null }
    },
    { pageSize: FULL_LOAD_PAGE_SIZE, max: FULL_LOAD_MAX, onPage, isCancelled },
  )
}
