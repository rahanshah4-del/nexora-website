// Date rules for saving a blog post, decided from the document as stored in
// Firestore (read inside the save transaction in blogCms.js), never from the
// editor's draft:
//   - createdAt is set once, when the post is first created;
//   - publishDate is set once, on the first save with status 'published', and
//     then kept on every later save — including unpublish/republish and a
//     slug rename, where `stored` is the old document;
//   - updatedAt (set by the caller on every save) is what moves dateModified
//     and the sitemap lastmod when a published post is edited.
// SERVER_TIME marks "use serverTimestamp()"; the caller substitutes it.
// Exercised by tests/blog-post-dates.test.mjs.

export const SERVER_TIME = Symbol('serverTimestamp')

const present = (value) => value !== undefined && value !== null && value !== ''

export function planPostDates(stored, nextStatus) {
  return {
    createdAt: present(stored?.createdAt) ? stored.createdAt : SERVER_TIME,
    publishDate: present(stored?.publishDate)
      ? stored.publishDate
      : nextStatus === 'published' ? SERVER_TIME : null,
  }
}
