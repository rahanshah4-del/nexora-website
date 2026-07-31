import { useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { HiOutlineLanguage, HiOutlinePhoto, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import { blogCategories, mergeBlogArticles } from '../../lib/blogData.js'
import {
  deleteBlogPost,
  listenAdminBlogPosts,
  saveBlogPost,
  uploadBlogImage,
} from '../../lib/blogCms.js'
import { auth, firestoreDb } from '../../lib/firebase.js'
import { getBlogViewCount } from '../../lib/blogViews.js'

const emptyDraft = {
  title: '',
  slug: '',
  seoTitle: '',
  metaDescription: '',
  excerpt: '',
  category: 'Business Tips',
  tagsText: '',
  keywordsText: '',
  status: 'draft',
  featuredImage: '/nexora-brand-logo.png',
  featuredImageAlt: '',
  contentHeading: 'Article guide',
  content: '',
  faqsText: '',
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function dateLabel(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '-'
}

function imageUploadErrorMessage(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  if (code === 'storage/unauthorized') return 'Image upload denied. Firebase Storage rules are not deployed or this admin email is not allowed.'
  if (code === 'storage/canceled') return 'Image upload timed out. Firebase Storage bucket setup/rules check karein.'
  if (message.includes('timed out')) return message
  return message || 'Unable to upload image.'
}

function parseFaqs(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question, ...answerParts] = line.split('|')
      return [String(question || '').trim(), answerParts.join('|').trim()]
    })
    .filter(([question, answer]) => question && answer)
}

function draftFromArticle(article) {
  return {
    title: article.title || '',
    slug: article.slug || '',
    seoTitle: article.seoTitle || '',
    metaDescription: article.metaDescription || '',
    excerpt: article.excerpt || '',
    category: article.category || 'Business Tips',
    tagsText: (article.tags || []).join(', '),
    keywordsText: (article.keywords || []).join(', '),
    status: article.status || 'draft',
    featuredImage: article.featuredImage || '/nexora-brand-logo.png',
    featuredImageAlt: article.featuredImageAlt || '',
    contentHeading: article.sections?.[0]?.heading || 'Article guide',
    content: (article.sections || []).flatMap((section) => section.paragraphs || []).join('\n\n'),
    faqsText: (article.faqs || []).map(([question, answer]) => `${question} | ${answer}`).join('\n'),
    createdAt: article.createdAt,
    source: article.source || 'cms',
  }
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-xs font-black text-slate-600 ${className}`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export default function BlogManager() {
  const [cmsPosts, setCmsPosts] = useState([])
  const [draft, setDraft] = useState(emptyDraft)
  const [editingSlug, setEditingSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [viewCounts, setViewCounts] = useState({})
  const [retranslating, setRetranslating] = useState({}) // slug → 'translating' | 'done' | 'error: ...'
  const [republishingState, setRepublishingState] = useState(null) // null | { mode, current, total, step, failed[], completed }
  const [selectedPosts, setSelectedPosts] = useState(new Set())

  useEffect(() => listenAdminBlogPosts(setCmsPosts, (loadError) => {
    setError(loadError?.message || 'Unable to load blog posts.')
  }), [])

  const posts = useMemo(() => mergeBlogArticles(cmsPosts), [cmsPosts])

  /* Load view counts for all posts */
  useEffect(() => {
    const slugs = [...new Set(posts.map((p) => p.slug).filter(Boolean))]
    if (!slugs.length) return
    let cancelled = false
    Promise.all(slugs.map(async (slug) => {
      const count = await getBlogViewCount(slug)
      if (!cancelled) setViewCounts((prev) => ({ ...prev, [slug]: count }))
    })).catch(() => {})
    return () => { cancelled = true }
  }, [posts])

  const stats = useMemo(() => ({
    total: posts.length,
    published: posts.filter((post) => post.status === 'published').length,
    drafts: posts.filter((post) => post.status !== 'published').length,
  }), [posts])

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-400'

  const updateDraft = (key, value) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === 'title' && !editingSlug ? { slug: slugify(value) } : {}),
    }))
  }

  const reset = () => {
    setDraft(emptyDraft)
    setEditingSlug('')
    setError('')
    setNotice('')
  }

  const edit = (post) => {
    setDraft(draftFromArticle(post))
    setEditingSlug(post.slug)
    setNotice('')
    setError('')
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const slug = slugify(draft.slug || draft.title)
      if (!slug) throw new Error('Slug is required.')
      if (!draft.title.trim()) throw new Error('Title is required.')
      if (!draft.metaDescription.trim()) throw new Error('Meta description is required.')
      const tags = draft.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20)
      const keywords = draft.keywordsText.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 20)
      const paragraphs = draft.content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
      if (!paragraphs.length) throw new Error('Article content is required.')

      const articleData = {
        title: draft.title.trim(),
        seoTitle: draft.seoTitle.trim() || `${draft.title.trim()} | Nexora Solution Blog`,
        metaDescription: draft.metaDescription.trim().slice(0, 180),
        excerpt: draft.excerpt.trim() || draft.metaDescription.trim(),
        category: draft.category,
        tags,
        keywords,
        status: draft.status,
        featuredImage: draft.featuredImage.trim() || '/nexora-brand-logo.png',
        featuredImageAlt: draft.featuredImageAlt.trim() || `${draft.title.trim()} featured image`,
        sections: [{
          id: slugify(draft.contentHeading || 'article-guide') || 'article-guide',
          heading: draft.contentHeading.trim() || 'Article guide',
          paragraphs,
        }],
        faqs: parseFaqs(draft.faqsText).map(([question, answer]) => ({ question, answer })),
        author: {
          name: 'Nexora Solution Editorial Team',
          url: 'https://nexorasolution.online',
        },
        publishDate: draft.status === 'published' ? serverTimestamp() : draft.publishDate || null,
        createdAt: draft.createdAt || serverTimestamp(),
        createdBy: auth?.currentUser?.uid || '',
        createdByEmail: auth?.currentUser?.email || '',
      }

      await saveBlogPost(slug, articleData)
      if (editingSlug && editingSlug !== slug && draft.source === 'cms') await deleteBlogPost(editingSlug)
      setEditingSlug(slug)

      // ── Translate to all languages SYNCHRONOUSLY before showing "published" ──
      // This ensures Firestore has translations before any client visits the blog.
      let translationMessage = ''
      if (draft.status === 'published') {
        setNotice('Blog post saved. Translating to all languages…')
        try {
          const { translateAndPublishAllLanguages } = await import('../../lib/blogTranslate.js')
          const { results } = await translateAndPublishAllLanguages({
            slug,
            title: draft.title.trim(),
            excerpt: draft.excerpt.trim() || draft.metaDescription.trim(),
            seoTitle: draft.seoTitle.trim() || `${draft.title.trim()} | Nexora Solution Blog`,
            metaDescription: draft.metaDescription.trim().slice(0, 180),
            sections: [{ heading: draft.contentHeading?.trim() || 'Article guide', paragraphs }],
            faqs: parseFaqs(draft.faqsText),
          }, { firestoreDb })
          const completed = Object.entries(results || {}).filter(([, r]) => r?.status === 'completed')
          const failed = Object.entries(results || {}).filter(([, r]) => r?.status !== 'completed')
          if (completed.length > 0) {
            translationMessage = ` • Translated: ${completed.map(([c]) => c).join(', ')}`
          }
          if (failed.length > 0) {
            const failedLangs = failed.map(([code, r]) => `${code} (${r?.reason || 'unknown'})`).join(', ')
            translationMessage += ` • Failed: ${failedLangs}`
            console.warn(`[Blog Manager] ⚠ Translation partial for [${slug}]: ${failedLangs}`)
          }
        } catch (transErr) {
          translationMessage = ` • Translation failed: ${transErr?.message || 'Unknown error'}`
          console.error(`[Blog Manager] ✗ Translation pipeline failed for [${slug}]:`, transErr)
        }
      }

      setNotice(`Blog post ${draft.status === 'published' ? 'published' : 'saved'}.${translationMessage}`)
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save blog post.')
    } finally {
      setSaving(false)
    }
  }

  const retranslatePost = async (post) => {
    if (!post?.slug || retranslating[post.slug] === 'translating') return
    const slug = post.slug
    setRetranslating((prev) => ({ ...prev, [slug]: 'translating' }))
    try {
      const { translateAndPublishAllLanguages } = await import('../../lib/blogTranslate.js')
      const paragraphs = (post.sections || []).flatMap((s) => s.paragraphs || [])
      const faqs = (post.faqs || []).map((f) => [f.question || f[0] || '', f.answer || f[1] || ''])
      const { results } = await translateAndPublishAllLanguages({
        slug,
        title: post.title || '',
        excerpt: post.excerpt || post.metaDescription || '',
        seoTitle: post.seoTitle || post.title || '',
        metaDescription: post.metaDescription || '',
        sections: post.sections || [],
        faqs,
      }, { firestoreDb })
      const completed = Object.entries(results || {}).filter(([, r]) => r?.status === 'completed')
      const failed = Object.entries(results || {}).filter(([, r]) => r?.status !== 'completed')
      if (completed.length > 0 && failed.length === 0) {
        setRetranslating((prev) => ({ ...prev, [slug]: 'done' }))
        setNotice(`✓ Translation complete for "${post.title?.slice(0, 40)}…" — ${completed.map(([c]) => c).join(', ')}`)
      } else if (completed.length > 0) {
        setRetranslating((prev) => ({ ...prev, [slug]: `error: ${failed.length} failed` }))
        setError(`⚠ Partial translation: ${completed.map(([c]) => c).join(', ')} done, ${failed.map(([c, r]) => `${c}(${r?.reason})`).join(', ')} failed`)
      } else {
        setRetranslating((prev) => ({ ...prev, [slug]: 'error: all failed' }))
        setError(`✗ Translation failed for all languages for "${post.title?.slice(0, 40)}…"`)
      }
      setTimeout(() => { setRetranslating((prev) => { const n = {...prev}; delete n[slug]; return n }) }, 4000)
    } catch (err) {
      setRetranslating((prev) => ({ ...prev, [slug]: `error: ${err?.message || 'Unknown'}` }))
      setError(`✗ Translation error: ${err?.message || 'Unknown error'}`)
      setTimeout(() => { setRetranslating((prev) => { const n = {...prev}; delete n[slug]; return n }) }, 6000)
    }
  }

  const republishCurrentPost = async (post) => {
    if (!post?.slug || republishingState) return
    const slug = post.slug
    setRepublishingState({ mode: 'single', current: 1, total: 1, step: 'Starting…', failed: [], completed: 0 })
    try {
      const { republishSinglePost } = await import('../../lib/blogRepublish.js')
      const result = await republishSinglePost(post, {
        firestoreDb,
        onProgress: ({ step, stepIndex }) => {
          setRepublishingState((prev) => prev ? { ...prev, step: `Step ${stepIndex + 1}/9: ${step}` } : null)
        },
      })
      if (result.status === 'completed') {
        setRepublishingState({ mode: 'single', current: 1, total: 1, step: 'Complete', failed: [], completed: 1 })
        setNotice(`✓ Republished "${post.title?.slice(0, 40)}…" — ${result.languages?.length || 0} languages`)
      } else {
        setRepublishingState({ mode: 'single', current: 1, total: 1, step: 'Failed', failed: [result], completed: 0 })
        setError(`✗ Republish failed: ${result.reason || 'Unknown'}`)
      }
    } catch (err) {
      setRepublishingState({ mode: 'single', current: 1, total: 1, step: 'Error', failed: [{ slug, reason: err.message }], completed: 0 })
      setError(`✗ Republish error: ${err.message}`)
    }
    setTimeout(() => setRepublishingState(null), 5000)
  }

  const republishAllPublished = async () => {
    if (republishingState) return
    const published = posts.filter((p) => p.status === 'published')
    if (!published.length) { setError('No published posts to republish.'); return }
    if (!window.confirm(`Republish ALL ${published.length} published posts? This may take several minutes.`)) return
    setRepublishingState({ mode: 'all', current: 0, total: published.length, step: 'Starting…', failed: [], completed: 0 })
    try {
      const { republishAllPosts } = await import('../../lib/blogRepublish.js')
      const { tracker } = await republishAllPosts(published, {
        firestoreDb,
        onProgress: ({ step, current, total }) => {
          setRepublishingState((prev) => prev ? { ...prev, current, total, step, completed: tracker?.completed || prev.completed } : null)
        },
      })
      setRepublishingState((prev) => prev ? { ...prev, step: 'Complete', completed: tracker?.completed || 0, failed: tracker?.failed || [] } : null)
      setNotice(`✓ Republished ${tracker?.completed || 0}/${published.length} posts`)
    } catch (err) {
      setRepublishingState((prev) => prev ? { ...prev, step: 'Error' } : null)
      setError(`✗ Republish All error: ${err.message}`)
    }
    setTimeout(() => setRepublishingState(null), 8000)
  }

  const uploadImage = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    setError('')
    try {
      const url = await uploadBlogImage(draft.slug || draft.title || 'blog', file, setUploadProgress)
      updateDraft('featuredImage', url)
      setNotice('Image uploaded and attached.')
    } catch (uploadError) {
      setError(imageUploadErrorMessage(uploadError))
    } finally {
      setUploading(false)
      window.setTimeout(() => setUploadProgress(0), 1200)
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Total Posts', stats.total],
          ['Published', stats.published],
          ['Drafts', stats.drafts],
        ].map(([label, value]) => (
          <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="text-sm font-black text-slate-950">{editingSlug ? 'Edit Blog Post' : 'Create Blog Post'}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Firestore: blogPosts · Public reads only published posts</p>
          </div>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
            <HiOutlinePlus className="h-4 w-4" />
            New Post
          </button>
        </div>

        <form className="mt-4 grid gap-3 lg:grid-cols-4" onSubmit={save}>
          <Field label="Title" className="lg:col-span-2"><input className={inputClass} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></Field>
          <Field label="Slug"><input className={inputClass} value={draft.slug} onChange={(event) => updateDraft('slug', slugify(event.target.value))} /></Field>
          <Field label="Status"><select className={inputClass} value={draft.status} onChange={(event) => updateDraft('status', event.target.value)}><option value="draft">draft</option><option value="published">published</option></select></Field>
          <Field label="SEO Title" className="lg:col-span-2"><input className={inputClass} value={draft.seoTitle} onChange={(event) => updateDraft('seoTitle', event.target.value)} /></Field>
          <Field label="Category"><select className={inputClass} value={draft.category} onChange={(event) => updateDraft('category', event.target.value)}>{blogCategories.map((category) => <option key={category}>{category}</option>)}</select></Field>
          <Field label="Tags"><input className={inputClass} value={draft.tagsText} placeholder="POS, CRM, AI" onChange={(event) => updateDraft('tagsText', event.target.value)} /></Field>
          <Field label="Keywords (SEO)"><input className={inputClass} value={draft.keywordsText} placeholder="restaurant software, POS Pakistan" onChange={(event) => updateDraft('keywordsText', event.target.value)} /></Field>
          <Field label="Meta Description" className="lg:col-span-2"><textarea className={`${inputClass} min-h-24`} value={draft.metaDescription} onChange={(event) => updateDraft('metaDescription', event.target.value)} /></Field>
          <Field label="Excerpt" className="lg:col-span-2"><textarea className={`${inputClass} min-h-24`} value={draft.excerpt} onChange={(event) => updateDraft('excerpt', event.target.value)} /></Field>
          <Field label="Featured Image URL" className="lg:col-span-2"><input className={inputClass} value={draft.featuredImage} onChange={(event) => updateDraft('featuredImage', event.target.value)} /></Field>
          <Field label="Image Alt"><input className={inputClass} value={draft.featuredImageAlt} onChange={(event) => updateDraft('featuredImageAlt', event.target.value)} /></Field>
          <Field label="Upload Image">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700">
              <HiOutlinePhoto className="h-5 w-5" />
              {uploading ? `Uploading ${uploadProgress || 1}%` : 'Choose Image'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  uploadImage(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
          </Field>
          <Field label="Content Heading" className="lg:col-span-4"><input className={inputClass} value={draft.contentHeading} onChange={(event) => updateDraft('contentHeading', event.target.value)} /></Field>
          <Field label="Article Content (blank line = new paragraph)" className="lg:col-span-4"><textarea className={`${inputClass} min-h-64`} value={draft.content} onChange={(event) => updateDraft('content', event.target.value)} /></Field>
          <Field label="FAQs (one per line: Question | Answer)" className="lg:col-span-4"><textarea className={`${inputClass} min-h-28`} value={draft.faqsText} onChange={(event) => updateDraft('faqsText', event.target.value)} /></Field>
          <div className="flex flex-wrap justify-end gap-2 lg:col-span-4">
            <button type="submit" disabled={saving || uploading} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Blog Post'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-950">Blog Posts</p>
          {posts.some((p) => p.status === 'published') ? (
            <button
              type="button"
              disabled={!!republishingState}
              onClick={republishAllPublished}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition disabled:opacity-50"
            >
              <HiOutlineLanguage className="h-4 w-4" />
              Republish All Published
            </button>
          ) : null}
        </div>
        {/* Progress indicator */}
        {republishingState ? (
          <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <p className="text-xs font-bold text-blue-700">
                {republishingState.mode === 'all'
                  ? `Republishing ${republishingState.current}/${republishingState.total} — ${republishingState.step}`
                  : republishingState.step}
              </p>
              {republishingState.total > 1 ? (
                <span className="text-xs text-blue-500">
                  {republishingState.completed} done · {republishingState.failed?.length || 0} failed
                </span>
              ) : null}
            </div>
            {republishingState.total > 1 ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.round((republishingState.current / republishingState.total) * 100)}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {!posts.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No blog posts found.</p> : (
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => (
                  <tr key={post.slug} className="align-top hover:bg-slate-50/80">
                    <td className="px-4 py-3"><p className="font-black text-slate-950">{post.title}</p><p className="text-xs text-slate-500">/blog/{post.slug}</p></td>
                    <td className="px-4 py-3">{post.category}</td>
                    <td className="px-4 py-3"><span className="font-bold text-slate-950">{viewCounts[post.slug]?.toLocaleString?.('en-PK') || '0'}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{post.status}</span></td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{post.source === 'cms' ? 'CMS' : 'Static'}</span></td>
                    <td className="px-4 py-3">{dateLabel(post.updatedAt || post.publishDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => edit(post)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Edit</button>
                        {post.status === 'published' ? (
                          <>
                          <button
                            type="button"
                            disabled={retranslating[post.slug] === 'translating'}
                            onClick={() => retranslatePost(post)}
                            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              retranslating[post.slug] === 'done' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                              retranslating[post.slug]?.startsWith('error') ? 'border-rose-200 bg-rose-50 text-rose-700' :
                              retranslating[post.slug] === 'translating' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                              'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                            }`}
                          >
                            <HiOutlineLanguage className="h-4 w-4" />
                            {retranslating[post.slug] === 'translating' ? 'Translating…' :
                             retranslating[post.slug] === 'done' ? 'Done ✓' :
                             retranslating[post.slug]?.startsWith('error') ? 'Retry' :
                             'Translate'}
                          </button>
                          <button
                            type="button"
                            disabled={!!republishingState}
                            onClick={() => republishCurrentPost(post)}
                            className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
                          >
                            <HiOutlineLanguage className="h-4 w-4" />
                            Republish
                          </button>
                          </>
                        ) : null}
                        {post.source === 'cms' ? (
                          <button type="button" onClick={() => window.confirm(`Delete ${post.title}?`) && deleteBlogPost(post.slug)} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">
                            <HiOutlineTrash className="h-4 w-4" />
                            Delete
                          </button>
                        ) : (
                          <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-400">Save edit to CMS</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
