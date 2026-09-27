# AdSense "Low value content" audit — nexorasolution.online

**Status:** Step 1 (audit only). No code, content, `ads.txt` or AdSense meta tag was changed.
**Audited build:** `claude/happy-volta-05ur36` @ `9853a78`, built locally on 2026-09-27 with `npm run build` (includes the 45 published Firestore CMS posts, so the blog matches production).

---

## Summary

Of the **137 URLs in `sitemap.xml`, 98 have a problem** a reviewer would count as thin, duplicate or broken. Only 39 are clean: 29 site pages and 10 blog posts.

Main causes, most important first:

| # | Finding | Pages affected | Why AdSense cares |
|---|---|---|---|
| 1 | **22 of 23 CMS-only blog posts redirect to `/blog` once JavaScript runs.** The embedded article "seed" is read during a React render that gets thrown away (a lazy-loaded chunk suspends it), so later renders find no seed. If Firestore is slow or unreachable, the article can't be found and `<Navigate to="/blog">` fires. The rendered page then shows the blog index with `canonical=/blog/`. | 22 posts, including your 3 newest and 2 longest | A crawler that renders JS sees 22 copies of `/blog/` instead of 22 articles. |
| 2 | **20 of 52 blog posts come from one template** (`buildSections()` in `src/lib/blogData.js`). Each is about 1,500 words but shares **88–90 %** of its text with sibling posts; only about 110–145 words per post are unique. 13 of them were later copied into the Firestore CMS unchanged. | 20 posts | This is the classic "scaled / templated content" pattern behind "Low value content". |
| 3 | **Prerendered HTML is discarded on boot.** `src/main.jsx` uses `createRoot().render()` rather than `hydrateRoot`, and for most non-blog pages the prerender only writes a title and one sentence. **50 indexable pages ship fewer than 60 words of body text in their HTML**; everything else appears only after JS runs. | 50 pages (products, features, compare, support) | Any crawler or reviewer that doesn't run JS fully sees near-empty pages. Every page also depends on the JS render succeeding. |
| 4 | **Static HTML and rendered DOM disagree on 23 pages.** `/ur/`, `/hi/`, `/ar/`, the 10 `/blog/category/*`, the 8 `/blog/page/N/`, `/author/nexora/` and `/search/` are prerendered as real pages, but React has no route for them. After JS they render **"Error 404 – Page not found" with `noindex,nofollow`**. `/ur/`, `/hi/` and `/ar/` are also in the sitemap and in the homepage's hreflang. | 23 pages | These are soft-404s, and 3 of them are in the sitemap. |
| 5 | **Thin product surface.** All 26 feature sub-pages have 150–370 rendered words. The 13 solution pages share 40–51 % of their text with each other through one template, leaving about 200–260 unique words each. Support pages have 55–80 words. | 51 pages under 300 unique words | Many near-identical short product pages dilute the site's overall quality. |
| 6 | **Weak trust (E-E-A-T) signals on every post.** The author is a generic "Editorial Team" with no bio (`/author/nexora/` 404s after JS). Every post carries a "**Nexora AI – Enhanced: Key business insights automatically highlighted by AI**" badge. Every post shows the same filler sentence 3× ("A simple operating rule that keeps the article practical…") and empty "No comments yet / No reviews yet" widgets. | All 52 posts | The AI badge tells a manual reviewer the content is AI-processed, and the filler plus empty widgets look auto-generated. |
| 7 | **Unverifiable or conflicting claims.** "SOC 2 infrastructure" and "30-Day Guarantee – Full refund, no questions asked" appear on all 12 country pages (`CountryPage.jsx:116-117`), but `/refund-policy/` says refunds are case-by-case. The homepage meta description says "Pakistan's #1…". | 12 country pages, `/erp-development/`, homepage meta | A reviewer reads these as low-trust or misleading. |
| 8 | **Sitemap `lastmod` is the build date for every non-blog page on every build**, with `changefreq: daily`. The sitemap also lists the 3 soft-404 language pages and the 22 redirecting posts. | 85 sitemap entries | Google stops trusting the sitemap's dates, and it points crawlers at broken pages. |

What is **not** a problem: no ad slots are rendered anywhere, so there are no ads without content around them. There are **no broken internal links**. `robots.txt` is correct, and utility/app routes get `noindex` from the worker without being blocked. Every indexable page has a title and a meta description. The 8 service pages and 4 comparison pages are substantial and original.

### How this was measured (and its limits)

- **Static HTML words** is the text inside `<body>` of the file the server sends, with `header`, `nav`, `footer`, `script`, `style` and `svg` removed.
- **Rendered words** is the text inside `<main>` after the page loads in headless Chromium (Googlebot user-agent, 1.5 s plus network-idle), again without header, nav, footer and dialogs. For blog posts this leaves out the article's own `<header>` (title and byline). The homepage places most sections outside `<main>`, so it was measured on the whole body (~1,340 words, marked `*`).
- **Unique words** is how many of a page's words fall in 8-word sequences that appear on no other page. **Max overlap** is the share of a page's 8-word sequences that also appear on its most similar page.
- Pages were served locally by a script that copies `worker/index.js`: real 404s, SPA shell plus `noindex` for app routes, trailing-slash redirects.
- **Limits.** The live site `nexorasolution.online` is blocked by this environment's egress policy, so I audited the local build, not production. Chromium here doesn't trust the egress proxy's CA, so **Firestore calls from the browser failed**. That matches the "Firestore slow or unreachable" case for finding #1. The seed bug itself was confirmed with instrumentation (seed found → removed → two later lookups find nothing) and doesn't depend on Firestore. With a working Firestore connection the posts would probably recover once the listener answers, but whether a crawler's renderer waits for that stream is outside our control. One CMS-only post (`advanced-restaurant-pos-billing-software`) rendered correctly in this run, so the outcome depends on timing.

---

## 1. Every public route

¹ Rendered titles are unique across indexable pages, except that the 22 redirecting posts inherit `/blog/`'s title. The static `<title>` differs from the rendered one on 30 pages ("differs from static"): `prerender.mjs` hardcodes its own titles instead of using `seoMetadata.js`. Google uses the rendered title, so this only costs consistency.

#### A. Core marketing

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/` | 307 | ~1,340* | ~1,000* | (only the noindexed `/features` alias) | partial (hero only) | yes | yes | yes | OK — but see §3.6 ("#1" claim, demo dashboard) |
| `/about/` | 237 | 208 | 224 |  | yes | yes (differs from static) | yes | yes | THIN (<300 unique words) |
| `/ai/` | 51 | 404 | 434 |  | shell only | yes | yes | yes | content JS-only |
| `/business-services/` | 30 | 323 | 366 |  | shell only | yes | yes | yes | content JS-only |
| `/download/restaurant-pos/` | 478 | 472 | 511 |  | yes | yes | yes | yes | OK |
| `/industries/` | 25 | 265 | 268 |  | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); content JS-only |
| `/pricing/` | 120 | 681 | 563 |  | partial | yes (differs from static) | yes | yes | OK |
| `/projects/` | 27 | 67 | 71 |  | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); content JS-only |
| `/reviews/` | 28 | 186 | 24 | 87% w/ `/pricing/` | shell only | yes | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |

#### B. Product / solution landing pages

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/crm/` | 55 | 437 | 259 | 44% w/ `/transport-fleet/` | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |
| `/pharmacy-pos/` | 66 | 475 | 267 | 44% w/ `/restaurant-pos/` | partial | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template |
| `/restaurant-pos/` | 110 | 535 | 348 | 40% w/ `/retail-pos/` | partial | yes | yes | yes | NEAR-DUP template |
| `/retail-pos/` | 77 | 511 | 317 | 42% w/ `/restaurant-pos/` | partial | yes | yes | yes | NEAR-DUP template |
| `/school-erp/` | 61 | 431 | 251 | 47% w/ `/solutions/email-marketing/` | partial | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template |
| `/solutions/email-marketing/` | 28 | 389 | 207 | 51% w/ `/school-erp/` | shell only | yes | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |
| `/solutions/inventory-management/` | 24 | 392 | 229 | 47% w/ `/pharmacy-pos/` | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |
| `/solutions/property-erp/` | 27 | 396 | 220 | 48% w/ `/school-erp/` | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |
| `/solutions/reports-analytics/` | 25 | 399 | 210 | 49% w/ `/crm/` | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |
| `/solutions/reports/` | 29 | 403 | 245 | 46% w/ `/solutions/reports-analytics/` | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |
| `/solutions/team-permissions/` | 23 | 401 | 228 | 48% w/ `/solutions/email-marketing/` | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |
| `/transport-fleet/` | 54 | 450 | 245 | 46% w/ `/pharmacy-pos/` | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |
| `/whatsapp-crm/` | 28 | 384 | 218 | 48% w/ `/solutions/reports/` | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); NEAR-DUP template; content JS-only |

#### C. Product feature sub-pages

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/crm/customers/` | 43 | 187 | 171 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/crm/invoices/` | 35 | 187 | 171 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/crm/leads-and-pipeline/` | 38 | 247 | 237 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/crm/tasks-and-follow-ups/` | 40 | 177 | 171 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/pharmacy-pos/batch-and-expiry-tracking/` | 40 | 202 | 191 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/pharmacy-pos/billing/` | 39 | 192 | 177 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/pharmacy-pos/medicine-inventory/` | 40 | 186 | 188 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/pharmacy-pos/supplier-purchases/` | 39 | 176 | 151 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/restaurant-pos/billing-and-receipts/` | 42 | 272 | 252 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/restaurant-pos/inventory/` | 43 | 260 | 260 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/restaurant-pos/kot-and-kitchen-display/` | 46 | 370 | 370 |  | shell only | yes | yes | yes | content JS-only |
| `/restaurant-pos/menu-management/` | 44 | 266 | 263 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/restaurant-pos/table-management/` | 41 | 267 | 253 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/retail-pos/billing-and-checkout/` | 41 | 247 | 242 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/retail-pos/customer-records/` | 44 | 244 | 238 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/retail-pos/discounts-and-offers/` | 42 | 183 | 169 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/retail-pos/inventory-control/` | 42 | 207 | 182 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/retail-pos/store-reports/` | 45 | 264 | 251 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/school-erp/admissions-and-students/` | 43 | 211 | 208 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/school-erp/attendance/` | 40 | 222 | 206 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/school-erp/fee-management/` | 38 | 188 | 178 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/school-erp/payroll/` | 35 | 192 | 189 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/transport-fleet/customer-ledger/` | 40 | 182 | 168 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/transport-fleet/fleet-management/` | 38 | 182 | 169 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/transport-fleet/payments-and-dues/` | 41 | 224 | 215 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |
| `/transport-fleet/rental-bookings/` | 44 | 220 | 213 |  | shell only | yes | yes | yes | THIN (<300 unique words); content JS-only |

#### D. Comparison pages

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/compare/cloud-vs-offline-pos/` | 52 | 416 | 433 |  | shell only | yes | yes | yes | content JS-only |
| `/compare/crm-vs-spreadsheets/` | 54 | 430 | 443 |  | shell only | yes | yes | yes | content JS-only |
| `/compare/pos-software-buying-checklist/` | 46 | 488 | 483 |  | shell only | yes | yes | yes | content JS-only |
| `/compare/school-erp-buying-checklist/` | 48 | 463 | 463 |  | shell only | yes | yes | yes | content JS-only |

#### E. Service pages

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/api-integration/` | 255 | 383 | 412 |  | yes | yes | yes | yes | OK |
| `/cloud-solutions/` | 218 | 358 | 387 |  | yes | yes | yes | yes | OK |
| `/crm-development/` | 254 | 396 | 427 |  | yes | yes | yes | yes | OK |
| `/ecommerce-development/` | 277 | 398 | 451 |  | yes | yes | yes | yes | OK |
| `/erp-development/` | 286 | 387 | 430 |  | yes | yes | yes | yes | OK |
| `/mobile-app-development/` | 421 | 686 | 753 |  | yes | yes | yes | yes | OK |
| `/seo-services/` | 437 | 647 | 696 |  | yes | yes | yes | yes | OK |
| `/software-development/` | 318 | 3001 | 3249 |  | yes | yes | yes | yes | OK |

#### F. Country pages

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/australia/` | 320 | 423 | 301 | 34% w/ `/canada/` | yes | yes | yes | yes | OK |
| `/bahrain/` | 309 | 414 | 265 | 40% w/ `/oman/` | yes | yes | yes | yes | THIN (<300 unique words); NEAR-DUP template |
| `/canada/` | 320 | 423 | 307 | 35% w/ `/kuwait/` | yes | yes | yes | yes | OK |
| `/india/` | 393 | 494 | 392 | 28% w/ `/uae/` | yes | yes | yes | yes | OK |
| `/kuwait/` | 287 | 391 | 234 | 46% w/ `/qatar/` | yes | yes | yes | yes | THIN (<300 unique words); NEAR-DUP template |
| `/oman/` | 265 | 372 | 218 | 45% w/ `/bahrain/` | yes | yes | yes | yes | THIN (<300 unique words); NEAR-DUP template |
| `/pakistan/` | 396 | 497 | 388 | 26% w/ `/bahrain/` | yes | yes | yes | yes | OK |
| `/qatar/` | 298 | 455 | 297 | 40% w/ `/kuwait/` | yes | yes | yes | yes | THIN (<300 unique words); NEAR-DUP template |
| `/saudi-arabia/` | 392 | 536 | 430 | 27% w/ `/kuwait/` | yes | yes | yes | yes | OK |
| `/uae/` | 383 | 484 | 347 | 32% w/ `/bahrain/` | yes | yes (differs from static) | yes | yes | OK |
| `/uk/` | 405 | 508 | 387 | 28% w/ `/usa/` | yes | yes | yes | yes | OK |
| `/usa/` | 416 | 519 | 404 | 27% w/ `/uk/` | yes | yes | yes | yes | OK |

#### G. Language homepages

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/ar/` | 19 | **404 page** | — |  | shell only | **404 title** | yes | yes | renders 404 + noindex after JS |
| `/hi/` | 25 | **404 page** | — |  | shell only | **404 title** | yes | yes | renders 404 + noindex after JS |
| `/ur/` | 23 | **404 page** | — |  | shell only | **404 title** | yes | yes | renders 404 + noindex after JS |

#### H. Support / legal

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/contact/` | 39 | 72 | 78 |  | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); content JS-only |
| `/documentation/` | 25 | 70 | 79 |  | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); content JS-only |
| `/faq/` | 28 | 208 | 225 |  | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); content JS-only |
| `/help-center/` | 23 | 56 | 55 |  | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); content JS-only |
| `/privacy-policy/` | 950 | 898 | 932 |  | yes | yes (differs from static) | yes | yes | OK |
| `/refund-policy/` | 148 | 159 | 171 |  | partial | yes (differs from static) | yes | yes | THIN (<300 unique words) |
| `/sitemap/` | 27 | 274 | 266 |  | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); content JS-only |
| `/support-center/` | 23 | 73 | 75 |  | shell only | yes (differs from static) | yes | yes | THIN (<300 unique words); content JS-only |
| `/terms/` | 489 | 465 | 474 |  | yes | yes (differs from static) | yes | yes | OK |

#### I. Blog index & archive pages

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/author/nexora/` | 88 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/` | 1610 | 257 (6 cards/page) | 154 | — | yes (all 52 cards) | yes¹ (differs from static) | yes | yes | OK as a listing — see §4 |
| `/blog/category/ai/` | 106 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/business-tips/` | 150 | **404 page** | — |  | yes | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/crm/` | 60 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/pharmacy-pos/` | 75 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/restaurant-pos/` | 171 | **404 page** | — |  | yes | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/retail-pos/` | 50 | **404 page** | — |  | shell only | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/school-erp/` | 115 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/technology/` | 64 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/transport-software/` | 90 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/category/whatsapp-crm/` | 59 | **404 page** | — |  | shell only | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/page/2/` | 58 | **404 page** | — |  | shell only | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/page/3/` | 101 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/page/4/` | 96 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/page/5/` | 104 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/page/6/` | 92 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/page/7/` | 86 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/page/8/` | 77 | **404 page** | — |  | partial | **404 title** | yes | no | renders 404 + noindex after JS |
| `/blog/page/9/` | 52 | **404 page** | — |  | shell only | **404 title** | yes | no | renders 404 + noindex after JS |
| `/search/` | 30 | **404 page** | — |  | shell only | **404 title** | yes | no | renders 404 + noindex after JS |

#### K. App / auth routes (not public content)

| Route | Static HTML words | Rendered words | Unique words | Max overlap with another page | Prerendered content | Unique title | Meta desc | In sitemap | Verdict |
|---|---:|---:|---:|---|---|---|---|---|---|
| `/app/dashboard` | 307 | 79 | 0 | 100% w/ `/pricing-paddle` | SPA shell (noindex) | n/a | yes | no | OK |
| `/features` | 307 | 106 | 0 | 100% w/ `/` | SPA shell (noindex) | n/a | yes | no | OK |
| `/login` | 307 | 79 | 81 |  | SPA shell (noindex) | n/a | yes | no | OK |
| `/pricing-paddle` | 307 | **crash** | 0 | 100% w/ `/app/dashboard` | SPA shell (noindex) | n/a | yes | no | OK |
| `/signup` | 307 | 36 | 35 |  | SPA shell (noindex) | n/a | yes | no | OK |

---

## 2. Thin and near-duplicate pages

**Near-duplicates, grouped by the template that produces them:**

| Template | Pages | Shared text | Source |
|---|---|---|---|
| Blog article generator | 20 posts (§3, rows 33–52) | 88–90 % | `buildSections()` / `buildFaqs()` in `src/lib/blogData.js`; 13 were copied unchanged into Firestore |
| Solution landing page | `/crm/`, `/pharmacy-pos/`, `/restaurant-pos/`, `/retail-pos/`, `/school-erp/`, `/transport-fleet/`, `/whatsapp-crm/`, `/solutions/{email-marketing, inventory-management, property-erp, reports, reports-analytics, team-permissions}/` | 40–51 % | `src/pages/public/SolutionPage.jsx` |
| Country page | Worst are `/bahrain/`, `/kuwait/`, `/oman/`, `/qatar/`; the other 8 share 26–35 % | 40–46 % | `src/pages/public/CountryPage.jsx` + `src/lib/countries.js` |
| Testimonials block | `/reviews/` | 87 % shared with `/pricing/`; only 24 unique words | shared reviews component |
| Near-identical pair | `/solutions/reports/` ↔ `/solutions/reports-analytics/` | 46 % | Two indexable URLs for the same product |

**Thin pages (under 300 unique words) that are in the sitemap:**

- **Feature sub-pages (25 of 26):** every `/restaurant-pos/*`, `/retail-pos/*`, `/pharmacy-pos/*`, `/school-erp/*`, `/crm/*` and `/transport-fleet/*` child page except `kot-and-kitchen-display` (370). Range 151–263 unique words. The text is original, just short.
- **Solution pages:** 11 of 13 are between 207 and 267 unique words.
- **Support and company:** `/help-center/` (55), `/projects/` (71), `/support-center/` (75), `/contact/` (78), `/documentation/` (79), `/refund-policy/` (171), `/about/` (224), `/faq/` (225), `/industries/` (268), `/sitemap/` (266).
- **Language homepages:** `/ur/`, `/hi/`, `/ar/` have 19–25 words of static HTML and render a 404.

Suggested handling for Step 2:
- **Legal and contact pages** (`/contact/`, `/refund-policy/`) should stay indexable. AdSense expects them, and short is normal for them.
- **Pure hubs** (`/help-center/`, `/support-center/`, `/documentation/`, `/sitemap/`) are candidates for merging or `noindex`.
- **Candidates for `noindex` as pure duplicates:** `/solutions/reports-analytics/` (keep `/solutions/reports/`), `/reviews/`, and the language homepages until they have real content.

---

## 3. Blog posts (all 52)

"Links in body" counts unique `/blog/…` and product-page links inside the article in the prerendered HTML. The "+N auto" figure is the number of `auto-internal-link` anchors `blogInternalLinks.js` inserts by keyword. Every post already has a related-articles block (6–7 blog links); the gap is **product page → blog** links, which don't exist yet.

| # | Slug | Words | Published | Updated | Source | Author visible | Featured image | Links in body (blog / product) | Unique-text % | Renders after JS | Verdict |
|---:|---|---:|---|---|---|---|---|---|---:|---|---|
| 1 | `pharmacy-pos-software-pakistan` | 1504 | 2026-09-23 | 2026-09-23 | CMS only | **no — redirects** | unique | 6 / 4 (+70 auto) | 97% | no — /blog | **redirects to /blog after JS**, over-linked (70 auto-links) |
| 2 | `restaurant-pos-system-complete-guide-to-smarter-restaurant-management` | 2226 | 2026-09-23 | 2026-09-23 | CMS only | **no — redirects** | unique | 7 / 8 (+83 auto) | 97% | no — /blog | **redirects to /blog after JS**, over-linked (83 auto-links) |
| 3 | `transport-billing-software-pakistan-bilty-invoicing` | 878 | 2026-09-23 | 2026-09-24 | CMS only | **no — redirects** | unique | 7 / 5 (+20 auto) | 95% | no — /blog | **redirects to /blog after JS** |
| 4 | `pharmacy-management-software-in-pakistan-complete-guide` | 1768 | 2026-09-20 | 2026-09-20 | CMS (overrides static) | yes (byline + dates) | unique | 6 / 9 (+49 auto) | 88% | yes | over-linked (49 auto-links) |
| 5 | `pharmacy-pos-software-pakistan-guide` | 1215 | 2026-09-07 | 2026-09-07 | CMS (overrides static) | yes (byline + dates) | unique | 5 / 6 (+20 auto) | 87% | yes | OK |
| 6 | `pharmacy-batch-expiry-management-guide` | 747 | 2026-09-07 | 2026-09-07 | CMS (overrides static) | yes (byline + dates) | unique | 6 / 1 (+1 auto) | 86% | yes | OK |
| 7 | `what-is-pos-software` | 812 | 2026-09-07 | 2026-09-07 | CMS (overrides static) | yes (byline + dates) | unique | 7 / 3 (+23 auto) | 86% | yes | OK |
| 8 | `what-is-school-erp-software` | 796 | 2026-09-07 | 2026-09-07 | CMS (overrides static) | yes (byline + dates) | unique | 7 / 6 (+24 auto) | 84% | yes | OK |
| 9 | `fbr-pos-integration-guide-pakistan` | 859 | 2026-09-07 | 2026-09-07 | CMS (overrides static) | yes (byline + dates) | unique | 7 / 2 (+18 auto) | 87% | yes | OK |
| 10 | `pos-software-cost-pakistan` | 783 | 2026-09-07 | 2026-09-07 | CMS (overrides static) | yes (byline + dates) | unique | 7 / 4 (+15 auto) | 85% | yes | OK |
| 11 | `school-erp-implementation-checklist` | 812 | 2026-09-07 | 2026-09-07 | CMS (overrides static) | yes (byline + dates) | unique | 7 / 6 (+12 auto) | 84% | yes | OK |
| 12 | `fleet-management-cost-pakistan` | 602 | 2026-09-07 | 2026-09-07 | CMS (overrides static) | yes (byline + dates) | unique | 7 / 2 (+10 auto) | 82% | yes | OK |
| 13 | `restaurant-pos-software-pakistan-multan-lahore-karachi` | 611 | 2026-09-05 | 2026-09-05 | CMS only | **no — redirects** | unique | 7 / 5 (+21 auto) | 91% | no — /blog | **redirects to /blog after JS** |
| 14 | `ai-powered-pos-software-the-modern-futuristic-way-to-run-your-business-in-pakistan` | 681 | 2026-09-01 | 2026-09-01 | CMS only | **no — redirects** | unique | 7 / 3 (+4 auto) | 94% | no — /blog | **redirects to /blog after JS** |
| 15 | `best-school-erp-software-pakistan-2026-jazzcash-biometric-attendance-whatsapp-alerts` | 1070 | 2026-08-31 | 2026-08-31 | CMS only | **no — redirects** | unique | 6 / 5 (+22 auto) | 95% | no — /blog | **redirects to /blog after JS** |
| 16 | `best-school-erp-software-in-pakistan-2026-complete-guide-for-schools` | 764 | 2026-08-27 | 2026-08-27 | CMS only | **no — redirects** | unique | 6 / 6 (+23 auto) | 93% | no — /blog | **redirects to /blog after JS** |
| 17 | `why-every-restaurant-needs-a-smart-pos-system-in-2026-the-complete-guide` | 666 | 2026-08-27 | 2026-08-27 | CMS only | **no — redirects** | unique | 6 / 2 (+24 auto) | 89% | no — /blog | **redirects to /blog after JS** |
| 18 | `restaurant-pos-system-guide-2026` | 691 | 2026-08-20 | 2026-08-20 | CMS only | **no — redirects** | unique | 6 / 4 (+23 auto) | 88% | no — /blog | **redirects to /blog after JS** |
| 19 | `the-complete-guide-to-school-erp-systems-in-2026` | 632 | 2026-08-20 | 2026-08-20 | CMS only | **no — redirects** | unique | 7 / 6 (+24 auto) | 91% | no — /blog | **redirects to /blog after JS** |
| 20 | `whatsapp-business-automation-is-coming-to-nexora` | 560 | 2026-08-20 | 2026-08-20 | CMS only | **no — redirects** | unique | 7 / 3 (+6 auto) | 93% | no — /blog | **redirects to /blog after JS** |
| 21 | `nexora-restaurant-pos-backend-frontend-live` | 662 | 2026-08-18 | 2026-08-18 | CMS only | **no — redirects** | unique | 6 / 5 (+17 auto) | 91% | no — /blog | **redirects to /blog after JS** |
| 22 | `restaurant-point-of-sale-software` | 637 | 2026-07-31 | 2026-07-31 | CMS only | **no — redirects** | unique | 7 / 4 (+18 auto) | 92% | no — /blog | **redirects to /blog after JS** |
| 23 | `transport-management-system` | 1214 | 2026-07-28 | 2026-07-28 | CMS only | **no — redirects** | unique | 7 / 5 (+46 auto) | 95% | no — /blog | **redirects to /blog after JS**, over-linked (46 auto-links), no FAQ |
| 24 | `advanced-restaurant-pos-billing-software` | 522 | 2026-07-27 | 2026-07-27 | CMS only | yes (byline + dates) | unique | 6 / 3 (+20 auto) | 78% | yes | no FAQ |
| 25 | `restaurant-pos-software-pakistan` | 510 | 2026-07-26 | 2026-07-26 | CMS only | **no — redirects** | unique | 7 / 3 (+14 auto) | 87% | no — /blog | **redirects to /blog after JS**, no FAQ |
| 26 | `nexora-ai-restaurant-reports` | 414 | 2026-07-25 | 2026-07-25 | CMS only | **no — redirects** | unique | 6 / 2 (+9 auto) | 89% | no — /blog | **redirects to /blog after JS**, short (<500 words), no FAQ |
| 27 | `ai-menu-recognition-restaurant-pos-system` | 371 | 2026-07-24 | 2026-07-24 | CMS only | **no — redirects** | unique | 6 / 1 (+5 auto) | 87% | no — /blog | **redirects to /blog after JS**, short (<500 words) |
| 28 | `nexora-ai-menu-management-upload-restaurant-menu-in-1-minute` | 231 | 2026-07-24 | 2026-07-24 | CMS only | **no — redirects** | unique | 6 / 1 (+1 auto) | 82% | no — /blog | **redirects to /blog after JS**, **THIN (<300 words)**, no FAQ |
| 29 | `warehouse-management-software-pakistan` | 239 | 2026-07-20 | 2026-07-20 | CMS only | **no — redirects** | unique | 6 / 3 (+11 auto) | 85% | no — /blog | **redirects to /blog after JS**, **THIN (<300 words)**, no FAQ |
| 30 | `customer-loyalty-program-software-pakistan` | 292 | 2026-07-19 | 2026-07-19 | CMS only | **no — redirects** | unique | 6 / 1 (+3 auto) | 86% | no — /blog | **redirects to /blog after JS**, **THIN (<300 words)**, no FAQ |
| 31 | `restaurant-billing-software-pakistan` | 1002 | 2026-07-18 | 2026-07-18 | CMS only | **no — redirects** | unique | 7 / 7 (+65 auto) | 93% | no — /blog | **redirects to /blog after JS**, over-linked (65 auto-links), no FAQ |
| 32 | `blog-inventory-management-software-pakistan` | 256 | 2026-07-15 | 2026-07-15 | CMS only | **no — redirects** | unique | 7 / 6 (+19 auto) | 82% | no — /blog | **redirects to /blog after JS**, **THIN (<300 words)**, no FAQ |
| 33 | `restaurant-pos-software-pakistan-guide` | 1490 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 7 / 9 (+29 auto) | 7% | yes | **NEAR-DUP (90% shared)** |
| 34 | `restaurant-kot-table-management-best-practices` | 1481 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 10 (+31 auto) | 7% | yes | **NEAR-DUP (90% shared)** |
| 35 | `retail-pos-inventory-control-guide` | 1488 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 10 (+31 auto) | 7% | yes | **NEAR-DUP (90% shared)** |
| 36 | `retail-cashier-permissions-pos-security` | 1495 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 9 (+28 auto) | 7% | yes | **NEAR-DUP (90% shared)** |
| 37 | `school-erp-software-pakistan-guide` | 1488 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 7 / 8 (+29 auto) | 6% | yes | **NEAR-DUP (90% shared)** |
| 38 | `school-fee-attendance-management-system` | 1484 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 9 (+29 auto) | 7% | yes | **NEAR-DUP (90% shared)** |
| 39 | `transport-rental-software-fleet-guide` | 1484 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 8 (+28 auto) | 6% | yes | **NEAR-DUP (90% shared)** |
| 40 | `vehicle-rental-booking-payment-workflow` | 1490 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 8 (+27 auto) | 8% | yes | **NEAR-DUP (90% shared)** |
| 41 | `crm-software-lead-management-guide` | 1484 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 8 (+28 auto) | 7% | yes | **NEAR-DUP (89% shared)** |
| 42 | `crm-pipeline-follow-up-system` | 1480 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 5 / 8 (+27 auto) | 8% | yes | **NEAR-DUP (90% shared)** |
| 43 | `whatsapp-crm-for-sales-teams` | 1488 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 5 / 8 (+29 auto) | 7% | yes | **NEAR-DUP (89% shared)** |
| 44 | `whatsapp-broadcast-follow-up-strategy` | 1487 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 9 (+26 auto) | 8% | yes | **NEAR-DUP (88% shared)** |
| 45 | `small-business-software-stack-pakistan` | 1492 | 2026-07-07 | 2026-07-07 | CMS copy of template | yes (byline + dates) | unique | 6 / 8 (+23 auto) | 7% | yes | **NEAR-DUP (89% shared)** |
| 46 | `business-automation-checklist-for-growing-teams` | 1527 | 2026-07-07 | 2026-07-07 | `blogData.js` template | yes (byline + dates) | **generic logo** | 5 / 9 (+22 auto) | 8% | yes | **NEAR-DUP (89% shared)**, logo image |
| 47 | `ai-in-business-management-software` | 1529 | 2026-07-07 | 2026-07-07 | `blogData.js` template | yes (byline + dates) | **generic logo** | 6 / 9 (+22 auto) | 7% | yes | **NEAR-DUP (88% shared)**, logo image |
| 48 | `ai-crm-lead-scoring-explained` | 1521 | 2026-07-07 | 2026-07-07 | `blogData.js` template | yes (byline + dates) | **generic logo** | 6 / 8 (+28 auto) | 7% | yes | **NEAR-DUP (90% shared)**, logo image |
| 49 | `cloud-business-software-security-basics` | 1526 | 2026-07-07 | 2026-07-07 | `blogData.js` template | yes (byline + dates) | **generic logo** | 5 / 8 (+24 auto) | 7% | yes | **NEAR-DUP (89% shared)**, logo image |
| 50 | `saas-vs-desktop-pos-software` | 1527 | 2026-07-07 | 2026-07-07 | `blogData.js` template | yes (byline + dates) | **generic logo** | 5 / 9 (+27 auto) | 7% | yes | **NEAR-DUP (89% shared)**, logo image |
| 51 | `pos-reporting-kpis-business-owners` | 1523 | 2026-07-07 | 2026-07-07 | `blogData.js` template | yes (byline + dates) | **generic logo** | 6 / 9 (+27 auto) | 6% | yes | **NEAR-DUP (88% shared)**, logo image |
| 52 | `customer-data-management-for-service-businesses` | 1527 | 2026-07-07 | 2026-07-07 | `blogData.js` template | yes (byline + dates) | **generic logo** | 5 / 9 (+24 auto) | 7% | yes | **NEAR-DUP (90% shared)**, logo image |

**Blog summary:**

- **Clean (10):** posts 4–12 and 24. Original, 522–1,768 words, own image, byline and dates, and an FAQ on all but #24.
- **Redirect to `/blog` after JS (22):** every CMS-only post except #24. Their content is original and mostly solid; the problem is purely technical (finding #1).
- **Template duplicates (20):** posts 33–52. Posts 33–45 are CMS copies of the template (fixing them means editing Firestore); posts 46–52 come straight from `blogData.js`.
- **Thin (4):** posts 28–30 and 32 (231–292 words). All four are also in the redirecting group.
- **Generic logo as featured image (7):** posts 46–52 use `/nexora-brand-logo.png`, the default in `blogData.js:21`. Every other post has its own Firebase Storage image. **The repo has no suitable unique images** (only logos, favicons, PWA icons and `src/assets/hero.png`), so Step 2 would add a TODO slot for each of these 7 posts.
- **Author and dates.** The rendered article shows the author name and both Published and Updated dates; the prerendered HTML shows the author and Published date only. There is **no author bio box**. The author is "Nexora Solution Editorial Team" on every post, and `/author/nexora/` 404s after JS.
- **Structured data.** Article, BreadcrumbList and FAQPage JSON-LD already exist, but **each rendered post carries two copies**: the prerender's `<head>` block is never removed when `PageSeo` adds its own. That needs deduplicating, not adding.
- **Over-linking.** Four posts get 46–83 automatic keyword links each (e.g. every "POS" links to `/restaurant-pos/`), which reads as spammy. The React render has far fewer (about 23 internal links in `<main>` in total), so the prerendered HTML and the rendered page also disagree.
- **"Coming soon" post.** Post 20 (`whatsapp-business-automation-is-coming-to-nexora`) announces a feature that isn't available yet.
- **Wrong reading times.** Category and pagination archives show "1 min read" for every post.

---

## 4. `/blog` listing

- **Initial HTML: pass.** The prerendered `dist/blog/index.html` contains **all 52 article cards** (title link, category, excerpt; 1,610 words) and no "Loading articles…".
- **After JS: partial.** Because of `createRoot`, React replaces that markup. It first renders the **29 static articles** from `blogData.js` with the status line "Loading articles...", then swaps in the merged 52 when the Firestore listener answers. If Firestore doesn't answer, the 23 CMS-only posts (the newest) **disappear from the listing**.
- **Pagination is JS-only.** The rendered page shows 6 cards per page, and pagination is `<button onClick>` updating `?page=`, so rendered links reach only 6 posts from `/blog/`. The prerendered `/blog/page/2/ … /9/` pages exist but render 404 after JS (finding #4).
- **Conclusion:** the listing HTML is fine. The Step 2 fix should make React start from the full prerendered list (embed it the same way article seeds are embedded), remove the "Loading articles…" state, and use real `<a href="/blog/?page=N">` links (or keep all cards in the DOM and filter client-side).

---

## 5. `sitemap.xml` and `robots.txt`

**robots.txt: fine.** It allows everything. App and auth routes are deliberately left crawlable so the worker's injected `noindex` can be seen; the reasoning is documented in the file. The `Host:` line is non-standard but harmless. No change needed.

**sitemap.xml** (generated by `scripts/generate-sitemap.mjs`; 137 URLs: 82 site pages, 3 language homepages, 52 posts):

| Check | Result |
|---|---|
| All real indexable pages included | Yes, all 82 site pages and 52 posts |
| Utility pages excluded (login, signup, app, admin, workspace, `/features`, `/pricing-paddle`) | Yes, none listed |
| Category / pagination / author / search archives | Not listed (correct), but they are still generated as static pages with no `noindex` in their HTML |
| **Soft-404 pages listed** | **`/ur/`, `/hi/`, `/ar/`**: render a 404 with `noindex` after JS |
| **Pages that redirect after JS** | **22 CMS-only posts** (until finding #1 is fixed) |
| Thin or duplicate pages listed | Everything flagged in §1–§3 |
| `lastmod` accuracy | **Posts:** real `updatedDate` (good). **All 85 other entries:** the build date, so every build marks every page "modified today" (`generate-sitemap.mjs:177,200`) |
| `changefreq` / `priority` | `daily` / `0.6` on every static page. Google ignores these, but `daily` on legal pages is not accurate |
| Image sitemap / RSS | Present (`generate-image-sitemap.mjs`, `rss.xml`) |

---

## 6. Placeholders, "coming soon", broken links and ad slots

| Check | Result |
|---|---|
| Ad slots (`ins.adsbygoogle`, `data-ad-slot`) | **None on any page.** Only the verification meta tag is present, so there are no ads without content around them |
| Broken internal links (static HTML and rendered `<main>`, 162 pages) | **None.** Every internal `href` resolves to a prerendered page, an app route or a `_redirects` 301 |
| "Coming soon" | Blog post 20 (announces WhatsApp automation that isn't live yet). The private `/app/coming-soon/:moduleId` route is behind auth and doesn't matter here |
| Empty sections on every post | "Comments & Reviews — No reviews yet / No comments yet"; a "Key takeaways" box with the same filler sentence 3× (`BlogArticlePage.jsx:415`) |
| Placeholder-style case studies | `/projects/` shows 3 anonymous one-line stories ("A restaurant chain improved…", 71 words total) |
| Runtime crash | `/pricing-paddle` renders "Application could not render — VITE_PADDLE_CLIENT_TOKEN is not set" in this local build. It is `noindex`, and production presumably has the token set, so this is only worth checking |
| Unverifiable claims | "SOC 2 infrastructure" on the country pages and `/erp-development/`; "30-Day Guarantee… No questions asked" (conflicts with `/refund-policy/`); "Pakistan's #1" in the homepage meta description; "PIPEDA compliant" on `/canada/` |
| AI-content signal | "Nexora AI – Enhanced: Key business insights automatically highlighted by AI" badge on all 52 posts |

---

## 7. What Step 2 should cover (please confirm)

Your Step 2 list covers findings #5, #6 and #8 and part of #3. **The two causes most likely behind the rejection, #1 and #2, aren't on it**, and #4 isn't either. Here is how I would change the plan. Everything stays out of the backend, `firestore.rules` and the Cloudflare Worker files.

**A. Keep your Step 2 items as written**, with these adjustments:
1. **Blog listing:** embed the full prerendered article list for React to start from, drop the "Loading articles…" state, and make pagination real `<a href>` links. The HTML cards already exist.
2. **Byline, bio and dates:** add the bio box to both the prerendered HTML and the React page. Show "Updated" in the prerendered HTML too. **Remove the duplicate JSON-LD** rather than adding a third copy. The author name and bio need your input, so they'll be TODO placeholders.
3. **Featured images:** add a TODO slot for the 7 posts using the logo. There are no suitable images in the repo.
4. **Related articles:** already present on every post. The new work is linking blog posts from the product and feature pages (Pharmacy POS ↔ pharmacy posts, and so on), in both the prerendered HTML and React.
5. **Thin product pages:** `noindex` `/solutions/reports-analytics/` (duplicate of `/solutions/reports/`) and `/reviews/`. Add Features / Use cases for Pakistani businesses / FAQ sections with FAQPage schema to the 7 main solution pages, with TODO markers wherever business facts are needed.
6. **Sitemap:** list only indexable pages, give non-blog pages a stable `lastmod` from git history instead of the build date, and drop the language homepages and any `noindex` page.

**B. Add these to Step 2 (recommended):**
7. **Fix the CMS-post redirect (#1).** Read the seed once at module level so a discarded render can't consume it, and never redirect a prerendered post to `/blog` just because Firestore hasn't answered yet. Small frontend change in `blogPostSeed.js` / `usePublishedBlogArticles.js` / `BlogArticlePage.jsx`.
8. **Resolve the soft-404s (#4).** Stop generating the static `/blog/category/*`, `/blog/page/N/`, `/author/nexora/` and `/search/` pages, or give them real React routes. I recommend removing them, since `/blog/` already filters by `?category=`. For `/ur/`, `/hi/`, `/ar/`, remove them from the sitemap and homepage hreflang (or tell me you want them kept as real translated pages).
9. **Put real content in the prerendered HTML for solution and feature pages (#3).** `prerender.mjs` already imports `featurePagesData.js` and `comparePagesData.js`, so it can write the same sections React renders. That way crawlers get the content without depending on JS.

**C. Decisions only you can make:**
10. **The 20 template posts (#2):** (a) `noindex` them and drop them from the sitemap until they're rewritten; (b) delete them and 301 each to its closest real post (e.g. `restaurant-pos-software-pakistan-guide` → `restaurant-pos-system-complete-guide-to-smarter-restaurant-management`); or (c) you rewrite them. I recommend (a) now, then (b) or (c). I won't write replacement articles or invent facts, and 13 of them live in Firestore, which I won't edit.
11. **Trust signals (#6, #7):** should I remove or tone down the "AI Enhanced" badge, the filler "Key takeaways" box and the empty comments widget on posts? Should the SOC 2, 30-day guarantee and "#1" claims stay? I won't edit claims without your go-ahead.
12. **Merging support pages:** fold `/help-center/`, `/support-center/` and `/documentation/` into one real page, or `noindex` two of them?

Once you confirm (and answer 10–12), I'll implement Step 2 on `claude/happy-volta-05ur36` and send a diff summary.
