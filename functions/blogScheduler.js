// Publishes scheduled blog posts. Runs every 5 minutes (Cloud Scheduler), finds
// blogPosts with status 'scheduled' whose scheduledAt has arrived (see
// blogSchedulerLogic.js) and flips them to 'published'. The write fires the
// existing blogPostsWritten trigger, which rebuilds the site (BLOG_AUTO_REBUILD
// must be 'live' for the post to reach the public pages).

import admin from 'firebase-admin'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { selectDuePosts } from './blogSchedulerLogic.js'

export const publishScheduledBlogPosts = onSchedule(
  { region: 'us-central1', schedule: 'every 5 minutes', timeZone: 'Asia/Karachi', timeoutSeconds: 120, memory: '256MiB' },
  async () => {
    const db = getFirestore()
    // Equality only, so no composite index is needed; due-ness is checked in code.
    const snap = await db.collection('blogPosts').where('status', '==', 'scheduled').get()
    const due = selectDuePosts(snap.docs.map((d) => ({ slug: d.id, data: d.data() })), Date.now())
    logger.info('publishScheduledBlogPosts', { scheduled: snap.size, due: due.length })
    for (const { slug, scheduledAtMs } of due) {
      const ref = db.collection('blogPosts').doc(slug)
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref)
        // The author may have edited or unscheduled it since the query ran.
        if (!fresh.exists || fresh.data().status !== 'scheduled') return
        const stored = fresh.data()
        tx.update(ref, {
          status: 'published',
          // publishDate is the time the author chose, so the article date,
          // schema datePublished and sitemap lastmod match the schedule.
          publishDate: stored.publishDate || Timestamp.fromMillis(scheduledAtMs),
          publishedBySchedulerAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      })
      logger.info('publishScheduledBlogPosts: published', { slug })
    }
  },
)
