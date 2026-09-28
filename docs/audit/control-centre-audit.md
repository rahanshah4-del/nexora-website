# Nexora Backend Control Centre — Read-only Audit

- Date: 2026-09-28 · Branch: `claude/brave-heisenberg-vkwcat` (HEAD `1c7b612`)
- Scope: `/admin/control-centre` aur us se juri har layer (React, Firestore, Storage, Cloud Functions, Cloudflare Workers, public website).
- Koi code change, commit ya deploy nahi kiya gaya. Sirf yeh file banayi gayi hai.
- Status legend: ✅ Working end-to-end · 🟡 Partial · 🔴 UI only / mock / dead / broken · ⚫ Missing

> **Kya verify nahi ho saka:** (a) Local dev server par Control Centre pages kholna aur console errors — admin UID (`oR66tNaNw5Z5kXYdTa2Egco9Uv22`) ke credentials is environment me nahi hain, is liye admin pages login ke baad render nahi kiye ja sakte. (b) Live deployed state (kaunsi functions deploy hain, kaunse Worker secrets set hain — `ADMIN_KEY`, `BLOG_SYNC_KEY`, `ADMIN_EMAILS`, Firebase ID token wagera). Neeche jahan claim live config par depend karta hai wahan yeh likha hai.

---

## 1. Summary

- **Kaam kar raha hai:** UID-based admin gate Firestore rules, Storage rules, har admin Cloud Function aur payments/passkeys Workers me server-side enforced hai. Plans/pricing, promo codes, payment accounts, maintenance mode, blog CMS, business services aur upgrade approval flow asli Firestore data par chalte hain aur public site tak pohanchte hain.
- **Adhoora / fake:** Roles & Permissions aur Staff Management sirf UI hain (koi enforcement nahi). `trialDays`, zyada tar feature flags, email templates aur AI Menu Import settings save hote hain lekin koi code unhein nahi padhta. Announcements ka schedule/expiry kabhi evaluate nahi hota. "WA Verify" asal verification ke bina `webhookVerified: true` likh deta hai. AI Dashboard ka data zyada tar khaali hai. Client Reviews pipeline public side par rules ki wajah se toota hua hai.
- **Top 5 risks:**
  1. Email Worker `/send-email` sirf `Origin` header check karta hai — koi bhi script Nexora domain se kisi bhi address par custom HTML email bhej sakti hai (open relay / phishing).
  2. AI Gateway ke admin endpoints `ADMIN_KEY` set na ho to **fail-open** hain, aur `/blog-knowledge/sync` ka key `VITE_BLOG_SYNC_KEY` client bundle me jata hai — public chatbot ka knowledge overwrite ho sakta hai.
  3. Normal signed-in user apna `users/{uid}` aur `workspaces/{uid}` **create** karte waqt `plan`/`subscriptionStatus`/`trialEndsAt` khud set kar sakta hai (update par protection hai, create par nahi) — billing bypass ka rasta.
  4. Email Worker aur Releases Worker abhi bhi **email + email_verified** par admin decide karte hain (UID par nahi); admin account ka email unverified ho to Email Marketing inbox/activity aur Desktop Releases admin ke liye kaam nahi karenge, aur email-api ki default list me ek doosra email (`rahanshah2@gmail.com`) bhi admin hai.
  5. Cloud Functions Node 20 par hain (`firebase.json:40`, `functions/package.json:6`) — Oct 2026 deprecation sirf ~1 mahina door hai.

---

## 2. Module table

Router: `src/AppRouter.jsx:760-767`. `/admin/control-centre` → `RequireAdmin` → `ControlCentre.jsx`. `/admin/{client-command-center,business-services,upgrade-requests}` → `RequireAdmin` → `AdminLayout`. Sidebar: `src/pages/admin/ControlCentre.jsx:223-266`. Saara data ek hi hook `useControlCentreData` (`ControlCentre.jsx:660-804`) se aata hai — 18 live `onSnapshot` listeners.

| # | Module (sidebar key) | File(s) | Reads | Writes | Status | Evidence / notes | Public website se juda? |
|---|---|---|---|---|---|---|---|
| 1 | Dashboard (`dashboard`) | `ControlCentre.jsx:2795-2943`, `controlCentreStats.js`, `controlCentreFullLoad.js` | `workspaces`, `users`, `platformPayments`, `upgradeRequests` (+ full paged load, `ControlCentre.jsx:602-658`), D1 upgrade requests via payments worker | — | 🟡 | KPIs asli data se. "Last 14 Days" button ka koi handler nahi (`:2812`). "Online Now" `clientSessions`/`userPresence` par depend karta hai jinhein **koi code nahi likhta** (src/functions/workers me writer nahi mila) — asal me `users.lastActiveAt` (`src/context/AuthProvider.jsx:35`) se kaam chal raha hai. | Nahi |
| 2 | Live Client Activity (`activity`) | `ControlCentre.jsx:4302` | `users` + `clientSessions` + `userPresence` merge (`:918-921`) | — | 🟡 | Upar wali wajah: do collections hamesha khaali. | Nahi |
| 3 | Clients / Workspaces (`clients`) | `ControlCentre.jsx:2618-2697, 3085-3117` | `workspaces`, `whatsappSettings` (collection group) | `workspaces`, `users` (subscription sync `:1955-1969`), `workspaces/{id}/whatsappSettings/config`, `backendActivityLogs`, workspace notifications | 🟡 | Block/Unblock/Plan/Mark Paid kaam karte hain. "Extend Trial" hamesha **30 din** hardcode (`:2667-2669`), Settings ka `trialDays` ignore. "View Summary" sirf toast (`:2660`). "WA Verify" bina check ke `webhookVerified: true` likhta hai (`:2280-2293`) — fake verification. Block sirf `status` field hai; enforcement rules (`firestore.rules:369-373`) aur client UI me. | Haan — blocked status CRM access rokta hai |
| 4 | Authentication / Users (`users`) | `ControlCentre.jsx:2699-2726, 3119-3148` | `users` | `users.status`, password reset email via Email Worker (`:2114-2123`) | 🟡 | Block/Unblock kaam karta hai (rules `userStatusActive`). Firebase Auth account disable nahi hota — sirf Firestore flag. "View User"/"View Workspace" sirf toast/tab switch (`:2717, :2722`). | Nahi |
| 5 | Upgrade Requests (`upgrades`) | `ControlCentre.jsx:2340-2533, 2740-2764, 4307-4321`; `src/lib/upgradeWorker.js` | Firestore `upgradeRequests` + D1 via payments worker (`upgradeWorker.js:40-52`) | `upgradeRequests`, `upgradeRequests/*/timeline`, `workspaces`, `users`, `platformPayments`, `platformSubscriptions`, `promoCodes.usedCount`, email, notification | 🟡 | Flow chalta hai lekin **client-side, ghair-atomic** ~8 alag writes (`:2386-2472`); beech me email fail ho to throw hota hai jab subscription pehle hi update ho chuki (`:2457-2458`). "Mark Paid" aur "Approve" same function (`:2758-2760`). Reject reason UI me dalne ki jagah nahi — `row.rejectionReason` hamesha khaali. | Haan — `/upgrade-business` se requests aati hain |
| 6 | Transactions (`transactions`) | `ControlCentre.jsx:2535-2616, 2766-2793, 3383-3436` | `platformPayments` | `platformPayments`, `upgradeRequests`, `workspaces`, `users` | 🟡 | Kaam karta hai. "Export CSV" file nahi banata, clipboard me copy karta hai (`:3416-3422`). Refund/credit-note flow nahi. | Nahi |
| 7 | Plans (`plans`) | `ControlCentre.jsx:3150-3276`; `src/lib/platformPlans.js` | `platformPlans` | `platformPlans/{id}` | ✅ | Save kaam karta hai (`:3244-3265`). Naya plan add / delete karne ka option nahi — sirf code me defined plans edit hote hain. | **Haan** — `/pricing` (`src/pages/public/PricingPage.jsx:45-60`), `/upgrade-business`, prerender (`scripts/prerender.mjs:1205-1315`, next build par) |
| 8 | Promo Codes (`promoCodes`) | `ControlCentre.jsx:3278-3381` | `promoCodes` | `promoCodes` | ✅ | Rules me schema validation (`firestore.rules:194-215, 1174-1208`). | Haan — checkout par code apply hota hai |
| 9 | Business Services (`businessServices`) | `src/pages/admin/BusinessServices.jsx`, `src/lib/businessServicesApi.js` | `businessServices`, `businessServiceRequests` (+timeline/comments) | same | ✅ | Rules me schema validation (`firestore.rules:266-346, 1322-1345`). | **Haan** — `BusinessServicesSection.jsx`, prerender (`scripts/prerender.mjs:1249-1258`) |
| 10 | WhatsApp Pricing (`whatsappPricing`) | `ControlCentre.jsx:3676-3745`; `src/crm/hooks/useWhatsappPricing.js` | `settings/whatsappPricing` | `settings/whatsappPricing` | 🔴 | Doc path `settings/whatsappPricing` hai (`src/crm/lib/whatsappPricing.js:12-13`) lekin rules me public read `match /whatsappPricing/{docId}` (`firestore.rules:1209-1212`) par hai — `settings` collection sirf catch-all admin rule (`:1460-1462`) me aati hai. Nateeja: **clients ko permission-denied milta hai aur hamesha code defaults dikhte hain**; admin ki edit kisi tak nahi pohanchti. | Hona chahiye tha (`WhatsappConnectPricing.jsx`) — abhi toota hua |
| 11 | Visitor Analytics (`visitorAnalytics`) | `ControlCentre.jsx:4056-4125` | `analyticsEvents` (100 latest), `userSessions` (80) | — | 🟡 | Sirf aakhri 100 events par KPI — "Total Visitors" asal me "events loaded" hai (`:1601`). Date range / pagination nahi. `analytics` collection (rules `:1435-1458`) Control Centre me kahin nahi padhi jati. | Haan — public pages events likhte hain |
| 12 | Behavior Interest (`behaviorInterest`) | `ControlCentre.jsx:1613-1719, 4127-4176` | same | — | 🟡 | Heuristic score, same 100-event limit. "Behavior score" button decorative (`:4139`). | Nahi |
| 13 | Security / Passkeys (`security`) | `ControlCentre.jsx:4228-4297`; Functions `adminListPasskeySecurity/adminUpdatePasskey/adminForceLogoutUser` (`functions/index.js:1097-1166`) | `userPasskeys`, `users`, `userSessions`, `loginHistory` (Function ke through) | `userPasskeys`, `users.forceLogoutAt`, refresh tokens revoke | ✅ | Teeno functions UID check karte hain. Har search keystroke par function call hota hai (`ControlCentre.jsx:1048-1071`, dependency `search`). | Nahi |
| 14 | Email Marketing (`emailMarketing`) | `EmailMarketing.jsx`, `EmailInbox.jsx`, `src/lib/marketing.js`; Function `sendMarketingCampaign`; Email Worker `/send-marketing`, `/inbox`, `/email-activity` | `marketingSubscribers`, `marketingCampaigns`, `marketingEmailLogs`, Resend API | same + emails | 🟡 | Callable function UID-gated ✅ (`functions/index.js:759`). "Import CSV" dead button (`EmailMarketing.jsx:179`). Inbox/activity Worker email+verified par gate hai (`workers/nexora-email-api/src/index.js:666-690`) — UID admin ka email unverified ho to 403. | Nahi |
| 15 | Blog CMS (`blogCms`) | `BlogManager.jsx`, `src/lib/blogCms.js`, `blogKnowledge.js`; Functions `blogPostsWritten/blogRedirectsWritten/blogRebuildTask` | `blogPosts`, `blogTranslations`, `blogRedirects`, `blogComments` | same + `aiKnowledge`, `public-blog/` storage, AI Gateway KV | ✅ | Publish → Function debounce → Cloudflare rebuild. Worker nayi post ko rebuild se pehle bhi serve karta hai (`worker/index.js:96-116`). Comment moderation ka UI Control Centre me nahi mila (rules me admin update allowed hai `firestore.rules:1268`). | **Haan** — `/blog/*`, sitemap, redirects |
| 16 | Announcements (`announcements`) | `ControlCentre.jsx:3438-3536` | `announcements` | `announcements`, workspace notifications | 🟡 | `scheduledAt`, `expiresAt`, `pinned` save hote hain lekin **koi reader nahi** — `announcements` collection sirf Control Centre padhta hai (src me koi aur reference nahi). "scheduled" status kabhi auto-publish nahi hota. Clients tak sirf publish ke waqt ki notification jati hai. Delete / edit button nahi. | Nahi (public read rule `firestore.rules:1230-1233` hai lekin use nahi hota) |
| 17 | Command Center (`commandCenter`) | `ClientCommandCenter.jsx` (+ route `/admin/client-command-center`), `commandCenterModules.js` | `workspaces`, `users`, `upgradeRequests`, `platformPayments`, `supportTickets` | same | 🟡 | Upgrade/approval logic ControlCentre ki **duplicate copy** hai (`ClientCommandCenter.jsx:1246-1348`) — do jagah maintain. Module access change fail ho to `window.alert` (`:1431`). | Nahi |
| 18 | AI Dashboard (`aiDashboard`) | `AIConversationDashboard.jsx` | AI Gateway `GET /admin/stats` (bina auth, `:288-290`) | — (feedback/flag sirf local state `:449-459`) | 🔴 | Gateway `FREE_PLAN="true"` (`workers/nexora-ai-gateway/wrangler.toml:20`) KV analytics writes band karta hai (`src/index.js:388`) — stats sirf in-memory buffer se. "Conversations" asal nahi, per-day `topQuestions` se banaye jate hain; user email hamesha `'—'` (`AIConversationDashboard.jsx:214-266`). `DEMO_USERS`/`DEMO_QUESTIONS` arrays file me pade hain (`:51-85`), error par "Showing demo data" message (`:556`). Retry button public `/chat` hit karta hai. | Nahi |
| 19 | Support Tickets (`support`) | `ControlCentre.jsx:3538-3674`; Function `notifySupportTicketEmail` (`functions/index.js:2433-2472`) | `collectionGroup('supportTickets')` (top-level + `workspaces/*/supportTickets`) | ticket status/comments, notifications | 🟡 | Create/reply/resolve kaam karte hain. "Assigned Staff" sirf display — assign karne ka control nahi (`:3625`). Email trigger sirf workspace sub-collection par, top-level `supportTickets` par nahi. SLA sirf label hai (`:3612`), koi timer/escalation nahi. | Haan — CRM `/app/support` |
| 20 | Client Reviews (`reviews`) | `src/crm/components/admin/ClientReviewsPanel.jsx`, `src/crm/data/reviewStorage.js` | `reviews` | `reviews.status` | 🔴 (end-to-end) | Admin panel padh/likh sakta hai, lekin `reviews` aur `customerReviews` (`src/lib/reviews.js:4`) ka **koi rule nahi** — dono catch-all admin-only me girte hain. Client ka `submitReview` aur public `loadPublicReviews` (`reviewStorage.js:85, 93-107`, `PublicTestimonials.jsx:68`) permission-denied; prerender khud log karta hai "reviews is not publicly readable" (`scripts/prerender.mjs` ~`:1240`). | Hona chahiye tha (homepage testimonials) — abhi khaali |
| 21 | System Health (`systemHealth`) | `ControlCentre.jsx:1186-1487, 2945-3083` | listener errors, `analyticsEvents` (frontend_* events), config | — | 🟡 | Client-side derived checks. **"Firestore rules audit" hamesha `healthy` hardcoded** (`:1317-1324`). Cloud Functions errors, Worker health, quotas, billing — kuch nahi. | Nahi |
| 22 | Maintenance Mode (`maintenance`) | `ControlCentre.jsx:3747-3854`; `src/hooks/usePlatformMaintenance.js`, `src/lib/maintenanceMode.js` | `platformSettings/main.maintenanceConfig` | same | ✅ | Public shell (`PublicPageShell.jsx:20`) aur CRM (`DashboardLayout.jsx:474`) dono padhte hain. Enforcement sirf UI hai (2 min session cache `usePlatformMaintenance.js:6`); API/rules level par koi block nahi. | **Haan** |
| 23 | Desktop App Releases (`desktopReleases`) | `DesktopReleases.jsx`; Worker `nexora-releases-api` | R2 via worker | R2 | 🟡 | Worker admin = email + `email_verified===true` (`workers/nexora-releases-api/src/lib.js:87-98`, `wrangler.toml:16`). UID hotfix ke baad bhi email-based; admin email unverified ho to upload 403. | Haan — download links |
| 24 | Settings (`settings`) | `ControlCentre.jsx:3856-4054` | `platformSettings/main` | `platformSettings/main` | 🟡 | ✅ `paymentAccounts`, `supportEmail`, `defaultCurrency` → `/upgrade-business` (`src/pages/UpgradeBusiness.jsx:337-442, 1176`). 🔴 `trialDays` koi nahi padhta — signup `CRM_TRIAL_DAYS = 30` (`src/pages/auth/WorkspaceSelection.jsx:114`) aur `BUSINESS_TRIAL_DAYS = 30` (`src/crm/data/moduleAccess.js:4`) constants use karta hai. 🔴 `featureFlags.{announcements,supportTickets,planUpgrades,maintenanceBanner}` ka koi reader nahi. 🔴 AI Menu Import settings: `resolveMenuImportSettings()` (`src/crm/data/menuImportSettings.js:45`) kahin call nahi hota; `useMenuImport.js:6` sirf defaults import karta hai. 🔴 Email templates (`welcomeTemplate` etc., `:4040`) ka koi reader nahi. `systemName`, `emailSenderName`, `emailReplyTo` bhi unused. | Partial |
| 25 | System Logs (`logs`) | `ControlCentre.jsx:4361`, `logActivity` `:1821-1831` | `backendActivityLogs` (80) | `backendActivityLogs` | 🟡 | Client-side audit log: admin chahe to khud edit/delete kar sakta hai (rules `firestore.rules:1353-1355` read,write). Har action log nahi hota (promo delete `:3374`, announcement publish/draft/expire `:3524-3529`, staff enable/disable, ticket reply). Filter/export nahi. | Nahi |
| 26 | Roles & Permissions (`roles`) | `ControlCentre.jsx:4206-4226` | — | — | 🔴 | Hardcoded `adminRoles` array (`:197`), checkboxes `disabled` (`:4217`). Koi data, koi enforcement nahi. | Nahi |
| 27 | Staff Management (`staff`) | `ControlCentre.jsx:4178-4204` | `backendStaff` | `backendStaff` | 🔴 | Doc save hota hai lekin **koi code `backendStaff` ko access ke liye nahi padhta** — admin sirf hardcoded UID hai. Added staff login nahi kar sakta. | Nahi |
| 28 | Notifications bell | `ControlCentre.jsx:1489-1579, 4485-4549` | derived + `backendNotificationStates` | `backendNotificationStates` | ✅ | Kaam karta hai. | Nahi |
| 29 | Header extras | `ControlCentre.jsx:4481-4482, 4550` | — | — | 🔴 | "Ctrl + K" sirf label (koi key handler nahi). Moon (dark mode) button ka `onClick` nahi (`:4550`). | Nahi |
| 30 | Legacy `/admin/upgrade-requests` | `src/pages/admin/UpgradeRequests.jsx` | `upgradeRequests` + D1 | same | 🟡 | Route reachable, lekin Control Centre ka purana duplicate. Production me bhi `console.log` admin email (`:87`). | Nahi |
| 31 | Free-tool template management | — | — | — | ⚫ | Neeche section 3.2 dekhein. | — |

### Dead code / unreachable
- `src/crm/pages/AdminUpgradeRequests.jsx` — kahin import nahi hota (grep: sirf apni definition `:103`); `src/crm/App.jsx:109-110` in routes ko redirect kar deta hai. Dead.
- `firestore.rules` me collections jin ka app me koi reader/writer nahi mila: `articles`, `categories`, `tags`, `comments`, `media`, `siteConfig`, `adminUsers`, `submissions`, `authors`, `blogBackups` (last wala rule me hi "Legacy" likha hai `:1302-1309`). `clientSessions`/`userPresence` ka koi writer nahi.
- `worker/index.js:41` ka comment abhi bhi `backendAdmin()` kehta hai — stale comment (logic sahi hai).
- Functions: `functions/index.js` + `blogRebuild.js` me 26 exports hain (23 + 3 blog); sab source me defined hain. Kaunse deploy hain — **verify nahi ho saka** (Firebase CLI access nahi).

---

## 3. Website ↔ Control Centre connection map

### 3.1 Control Centre se controlled (live)

| Control Centre module | Firestore path | Public/Client consumer | Refresh | Status |
|---|---|---|---|---|
| Plans | `platformPlans/*` | `/pricing` (`PricingPage.jsx:45-60`), `/upgrade-business`, crypto checkout, prerender | Client live; prerendered HTML next build par | ✅ |
| Settings → Payment accounts / support email / currency | `platformSettings/main` | `/upgrade-business` (`UpgradeBusiness.jsx:337, 427-442, 1176`) | Live | ✅ |
| Maintenance | `platformSettings/main.maintenanceConfig` | `PublicPageShell.jsx:20`, `DashboardLayout.jsx:474` | 2 min cache | ✅ |
| Promo codes | `promoCodes/*` | Upgrade checkout, payments worker | Live | ✅ |
| Business Services | `businessServices/*` | `BusinessServicesSection.jsx`, prerender | Live + build | ✅ |
| Blog CMS | `blogPosts`, `blogRedirects`, `blogTranslations` | `/blog/*`, sitemap, 301s, `worker/index.js` | Function-triggered rebuild | ✅ |
| Blog → AI knowledge | `aiKnowledge/**` + AI Gateway KV | Public AI chat | On save | 🟡 (sync key issue, section 4) |
| WhatsApp Pricing | `settings/whatsappPricing` | `WhatsappConnectPricing.jsx` | — | 🔴 rules mismatch |
| Client Reviews | `reviews` / `customerReviews` | Homepage testimonials, review form | — | 🔴 rules missing |
| Announcements | `announcements` | koi nahi (sirf notifications) | — | 🟡 |
| Feature flags / trialDays / email templates / AI import | `platformSettings/main` | koi nahi | — | 🔴 |

### 3.2 Public content jo abhi code me hardcoded hai (admin se control hona chahiye)

| Cheez | Kahan hardcoded | Admin toggle ka faida |
|---|---|---|
| Free tools launch switch `TOOLS_LAUNCHED = true` | `src/lib/toolsLaunch.js:17` (prerender, sitemap, nav, footers bhi yahi padhte hain) | Toggle **aqalmand hai lekin build-time** — noindex/sitemap prerender me bake hote hain, is liye Firestore flag ke saath rebuild trigger zaroori hoga (blog jaisa). Abhi build na karein. |
| Free tools templates (Invoice / Quotation / Thermal / Letterhead) | `src/tools/docs-studio/templates/builtin.js` (82 lines), `registry.js`, `specs.js`, `TemplateGallery.jsx` | **Template management module maujood nahi (⚫).** Zaroorat: `toolTemplates` collection + schema (tool type, paper size, spec JSON, preview image, status draft/published, order), admin-only write rules, Storage path `tool-templates/` (admin write, public read), Control Centre me upload/preview/publish UI, aur `registry.js` me built-in + remote merge with fallback. |
| Trial length (30 din) | `WorkspaceSelection.jsx:114`, `moduleAccess.js:4`, `ControlCentre.jsx:2667-2669` | Settings ka `trialDays` asli banana. |
| Signup/CRM feature switches | code constants | Existing `featureFlags` ko readers se jodna. |
| SEO meta / noindex list | `src/components/DefaultSeo.jsx:56`, `src/config/noindexPages.js` | Per-page SEO settings ka admin module ⚫. |
| Free-tools homepage section, footers, nav | `toolsLaunch.js:44-57` | Launch switch ke saath. |

---

## 4. Security findings

**UID hotfix — server-side enforcement ka natija:**

| Layer | Admin check | Result |
|---|---|---|
| `firestore.rules` | `isAdmin()` = `request.auth.uid in [...]` (`:13-15`); `marketingAdmin()` → `isAdmin()` (`:350-352`); `backendAdmin()` rules me **maujood nahi** | ✅ UID-only. Email check sirf staff-invite matching me hai (`:637-668, :701`) jo admin se unrelated hai. |
| `storage.rules` | `isAdmin()` UID (`:10-12`), `public-blog/` admin-only | ✅ |
| Cloud Functions | `isPlatformAdmin()` UID (`functions/index.js:65-67`) — `sendMarketingCampaign :759`, `adminListPasskeySecurity :1100`, `adminUpdatePasskey :1140`, `adminForceLogoutUser :1157` | ✅ Sab admin functions server-side UID check. |
| Payments worker | `ADMIN_UIDS` (`workers/nexora-payments-api/src/index.js:38-41`) | ✅ |
| Passkeys worker | `ADMIN_UIDS` (`workers/nexora-passkeys-api/src/index.js:349-352`) | ✅ |
| Email worker | email + `email_verified` + default list (`workers/nexora-email-api/src/index.js:604, 666-690, 905-932`) | ⚠️ Email-based |
| Releases worker | email + `email_verified` (`workers/nexora-releases-api/src/lib.js:87-98`, `wrangler.toml:16`) | ⚠️ Email-based |
| AI Gateway | static `ADMIN_KEY`, fail-open | ❌ |
| Client route guard | `RequireAdmin.jsx:53` + `ControlCentre.jsx:927` | UI only (theek hai, rules enforce karte hain) |
| Drift guard | `tests/rules/admin-uids.test.mjs`, `scripts/check-admin-uids.mjs` (firebase.json predeploy) | ✅ — lekin email/releases/ai workers is test me cover nahi |

**Normal signed-in user/tenant ke liye koi platform-admin collection (platformPlans, platformSettings, promoCodes, platformPayments, backendStaff, backendActivityLogs, announcements, blog*) likhna rules allow nahi karte.** Neeche wale findings admin gate ke bahar ke raste hain.

| # | Severity | Finding | Evidence | Fix suggestion (code change nahi kiya) |
|---|---|---|---|---|
| S1 | **Critical** | Email Worker `/send-email` open relay: sirf `Origin` header check (non-browser client ise spoof kar sakta hai), phir raw `subject`/`html` kisi bhi `to` par Nexora sender se bhejta hai. Koi auth ya rate limit nahi. | `workers/nexora-email-api/src/index.js:1100-1143`, `buildEmailPayload :559-571` | Firebase ID token lazmi karein; raw html sirf admin UID ke liye; non-admin ke liye sirf named templates + recipient = token ka email; per-IP/per-uid rate limit. Functions ka call `functions/index.js:561-579` bhi signed secret header se karein. |
| S2 | **High** | AI Gateway admin endpoints fail-open: `if (adminKey !== env.ADMIN_KEY && env.ADMIN_KEY)` — secret set na ho to koi bhi `/admin/knowledge` aur `/admin/blog-knowledge` POST kar ke public chatbot ka knowledge badal sakta hai. `ADMIN_KEY` set hai ya nahi — **verify nahi ho saka**. | `workers/nexora-ai-gateway/src/index.js:684-716, 725-769, 1396-1400` | Fail-closed banayein (`!env.ADMIN_KEY \|\| key !== env.ADMIN_KEY` → 401); behtar: Firebase ID token + UID check jaise payments worker. |
| S3 | **High** | `/blog-knowledge/sync` ka "secret" `VITE_BLOG_SYNC_KEY` client bundle me ship hota hai → public secret. Worker me `BLOG_SYNC_KEY` unset ho to koi bhi non-empty key chal jati hai. | `src/lib/blogKnowledge.js:207-217`, `workers/nexora-ai-gateway/src/index.js:787-816` | Sync ko Firebase ID token (admin UID) par shift karein, ya server-side (Cloud Function `blogPostsWritten`) se push karein; VITE_ var hata dein. |
| S4 | **High** | Self-provisioning billing bypass: `users/{uid}` create par `selfUserCreateSafe` sirf binding fields check karta hai — `plan`, `subscriptionStatus`, `trialEndsAt`, `role` free hain. `workspaces/{id}` create par sirf `ownerId/workspaceId/createdBy` check (`plan`, `subscriptionExpiresAt` free). `protectedWorkspaceFieldsUnchanged()` sirf update par lagta hai. | `firestore.rules:610-620, 676, 719-722, 519-521` | Create par bhi protected fields ko deny/whitelist karein (e.g. `plan in ['trial']`, `subscriptionStatus=='trial'`, `trialEndsAt <= request.time + 31d`) ya provisioning ko Cloud Function me le jayein. Emulator test add karein. |
| S5 | **High** | `upgradeRequests` create par koi field validation nahi — user `status:'approved'`, `paymentStatus:'paid'`, `automaticVerification:true`, `amount:0` ke saath request bana sakta hai. Admin UI isko "already approved"/paid dikha sakta hai (`isPaid(row)` check `ControlCentre.jsx:2342`) aur dashboard revenue fallback me gin sakta hai. | `firestore.rules:1142` | Create par `status=='pending'`, `approvalStatus=='pending'`, `paymentStatus=='pending'`, `automaticVerification` absent/false enforce karein; keys whitelist. |
| S6 | **High** | Email + Releases workers abhi bhi email-based admin: hotfix ke baad inconsistent. Email worker default list me doosra address `rahanshah2@gmail.com` bhi admin hai (verified email wala koi bhi account agar yeh email rakhta ho). Admin ka email unverified ho to Inbox/Activity/Releases admin ke liye toot jate hain. | `workers/nexora-email-api/src/index.js:604, 683, 930`; `workers/nexora-releases-api/src/lib.js:95-98`; `tests/releases-api.test.mjs:29-78` | Payments worker wala `ADMIN_UIDS` pattern copy karein aur `tests/rules/admin-uids.test.mjs` me in workers ko bhi shamil karein. |
| S7 | **Medium** | Admin actions ka audit log client likhta hai aur admin hi edit/delete kar sakta hai; kai actions log hi nahi hote (section 2 #25). Compromised admin session trail mita sakta hai. | `ControlCentre.jsx:1821-1831`; `firestore.rules:1353-1355` | Rules me `allow create` only, `update,delete: if false`; ya Firestore trigger function se server-side audit. |
| S8 | **Medium** | AI Gateway `/admin/stats` public: har din ke aakhri 5 user sawal (`topQuestions`) koi bhi padh sakta hai — user privacy leak. | `workers/nexora-ai-gateway/src/index.js:652-681`; client `AIConversationDashboard.jsx:288-290` bina auth | Admin auth lagayein; client se ID token bhejein. |
| S9 | **Medium** | `storage.rules` `menuImports/{workspaceId}`: koi bhi signed-in user kisi bhi workspace ke folder me upload aur har workspace ki files read kar sakta hai (cross-tenant). | `storage.rules:32-36` | `workspaceId == request.auth.uid` ya Firestore membership check (`firestore.get`) lagayein. |
| S10 | **Medium** | `blogComments` pending comments public readable — `authorEmail` bhi. | `firestore.rules:1265-1267, 1243` | Public read sirf `approved`; email alag private doc me. |
| S11 | **Medium** | Top-level `supportTickets` create: `activeSignedIn()` ke ilawa koi validation nahi — `createdBy` kisi aur ka UID, `status/priority` arbitrary. Creator baad me koi bhi field update kar sakta hai. | `firestore.rules:1346-1349` | `createdBy==request.auth.uid`, status `open`, keys whitelist; creator update sirf comment fields. |
| S12 | **Medium** | Admin approval flow client-side aur ghair-atomic (8+ writes). Beech me fail → workspace paid lekin payment record/email/log missing. | `ControlCentre.jsx:2340-2473`, `ClientCommandCenter.jsx:1246-1348` | Callable Cloud Function `adminApproveUpgrade` (UID check + transaction). |
| S13 | **Low** | `platformSettings/main` public read me `updatedByEmail` (admin email) bhi jata hai. | `ControlCentre.jsx:2084-2088`, `firestore.rules:1166-1169` | Admin metadata alag admin-only doc me. |
| S14 | **Low** | Production console logs admin email/uid: `RequireAdmin.jsx:96, 108`, `UpgradeRequests.jsx:87`, `ControlCentre.jsx:1962-1968, 2063-2072, 2373`. | same | `import.meta.env.DEV` guard. |
| S15 | **Low** | Non-admin callable functions raw `error.message` client ko lautate hain (`HttpsError('internal', error?.message …)`). Admin function `sendMarketingCampaign :858` bhi. | `functions/index.js:1424, 1658, 1876, 1970, 2211, 2264, 2317, 2428` | Generic message + `logger.error`. |
| S16 | **Low** | `blogLikes`, `blogViews`, `analytics`, `comments`, `submissions` unauthenticated create — spam/manipulation (no rate limit). | `firestore.rules:1271-1282, 1310-1321, 1391-1398, 1414-1458` | App Check ya Function/Worker ke through counters. |
| S17 | Info | Client bundle me hardcoded: admin UID (`src/lib/adminUids.js:12`), payment worker UID rules me (`firestore.rules:17`), Firebase web API key (`worker/index.js:53` — yeh public key hai, secret nahi). Koi private secret (Resend/OpenAI) bundle me nahi mila; `VITE_OPENAI_API_KEY` sirf opt-in demo path (`src/crm/lib/aiClient.js:8-11`) — deploy env me set hai ya nahi **verify nahi ho saka**. `VITE_BLOG_SYNC_KEY` (S3) asal masla hai. | — | UID public hona khatarnak nahi (rules enforce). |

### Cloud Functions runtime

- Node: `firebase.json:40` → `"runtime": "nodejs20"`; `functions/package.json:5-7` → `"engines": { "node": "20" }`.
- `firebase-functions` `^6.0.0` (lockfile me `6.6.0`, `functions/package-lock.json:1463-1464`); `firebase-admin` `^13.0.0` (lock `13.10.0`).
- **Node 20 deprecation (Oct 2026) — sirf ~1 mahina bacha hai.** Baad me badalne wali files: `firebase.json` (`runtime` → `nodejs22`), `functions/package.json` (`engines.node` → `"22"`), `functions/package-lock.json` (regenerate). Upgrade ke waqt `firebase-functions` ka latest supported major check karein; code v2 API (`firebase-functions/v2/*`) already use karta hai. Local dev machine par Node `v22.22.2` hai, to emulator test aasaan hoga.

---

## 5. Gap list (multi-tenant CRM/ERP/POS SaaS owner ke liye)

| Area | Status | Note | Priority (agar missing/partial) |
|---|---|---|---|
| Tenants/workspaces list & status | ✅/🟡 | List, filter, block, plan change hai; tenant detail page, suspend reason, delete/archive nahi | P1 |
| Users & roles (platform users) | 🟡 | Block/unblock; Auth account disable, role edit nahi | P1 |
| **Admin staff roles/RBAC** | 🔴 | Roles & Staff sirf UI; ek hardcoded UID | **P0** (support staff ko full admin diye bina kaam nahi ho sakta) |
| Plans / subscriptions / trials | 🟡 | Plan edit ✅; trialDays fake; plan add/delete nahi; renewal/expiry automation (scheduled function) nahi | **P0** (trialDays) / P1 |
| Payments / invoices | 🟡 | Manual approve + NOWPayments/Paddle; client ko invoice/receipt PDF, refunds, dunning nahi | P1 |
| Usage limits per plan | ⚫ | Plan features sirf text list; seats/branches/messages ki server-side enforcement nahi mili | P1 |
| Support tickets | 🟡 | Assign, SLA timer, canned replies, internal-only notes nahi | P1 |
| Announcements | 🟡 | Schedule/expiry/pin enforce nahi; in-app banner reader nahi | P2 |
| Blog / CMS | ✅ | Comment moderation UI nahi | P2 |
| SEO / meta settings | ⚫ | Sab code me | P2 |
| **Free-tool templates** | ⚫ | Section 3.2 | P1 (planned feature) |
| Feature flags | 🔴 | 4/5 flags ka koi reader nahi; launch switches code constants | P1 |
| **Audit log of admin actions** | 🟡 | Editable, incomplete (S7) | **P0** |
| Backups / exports | ⚫ | Firestore scheduled export / tenant data export nahi; CSV sirf clipboard | **P0** (backups) / P2 (exports) |
| System health (functions errors, quotas, workers) | 🟡 | Client-side derived; functions/worker errors, quotas, billing alerts nahi; rules-audit check fake | P1 |
| Email deliverability / templates | 🟡 | Template settings fake; Resend activity worker email-gated | P2 |
| WhatsApp pricing sync | 🔴 | Rules path mismatch | P1 |
| Client reviews | 🔴 | Rules missing | P2 |
| Security hardening (S1–S6) | — | — | **P0** |
| Node 20 → 22 | — | Deadline ~Oct 2026 | **P0** |

**Missing items business priority ke hisaab se:**
- **P0:** Email worker open relay band karna (S1); AI gateway fail-open + public sync key (S2, S3); self-provision / upgradeRequest validation (S4, S5); workers ko UID admin par lana (S6); Node 22 upgrade; tamper-proof audit log; Firestore scheduled backups; `trialDays` ko asli banana.
- **P1:** Admin RBAC (backendStaff ko rules/functions se jodna), server-side approve function, usage limits, feature flags readers, WhatsApp pricing rules fix, free-tool template module, support assign/SLA, system health (functions/worker errors), invoices/receipts.
- **P2:** SEO settings, announcements scheduler/banner, blog comment moderation, client reviews rules, CSV file export, dead code cleanup, header dead buttons.

---

## 6. Suggested build order (chhote, safe steps pehle)

Har step alag PR, emulator/rules tests ke saath.

1. **Worker hardening (config-only ya chhota diff):** AI Gateway `ADMIN_KEY` check fail-closed (3 jagah: `:686, :727, :1398`) aur `/admin/stats` par auth. Deploy se pehle confirm karein ke `ADMIN_KEY` secret set hai.
2. **Email worker `/send-email`:** Firebase ID token verify (function already file me hai `:621-652`) + raw html sirf admin UID; Cloud Functions ke calls ke liye shared secret header. Rate limit.
3. **Workers ko UID admin par:** email-api aur releases-api me payments worker ka `ADMIN_UIDS` pattern; `tests/rules/admin-uids.test.mjs` me in files ko add karein; `DEFAULT_ADMIN_EMAILS` hatayein.
4. **Blog sync key hatana:** `VITE_BLOG_SYNC_KEY` ki jagah admin ID token (ya `blogPostsWritten` function se server push).
5. **Rules tightening (ek PR, emulator tests pehle likhein):** `users`/`workspaces` create par plan/trial fields; `upgradeRequests` create validation; top-level `supportTickets` create; `blogComments` public read sirf approved; `menuImports` storage tenant scope; `backendActivityLogs` append-only.
6. **Chhote wiring fixes:** `whatsappPricing` rules path (`match /settings/whatsappPricing` public read, admin write); `reviews`/`customerReviews` rules (create validated, read approved+public); `trialDays` ko `WorkspaceSelection.jsx`/`moduleAccess.js` me `platformSettings` se padhna (fallback 30); "Extend Trial" me settings value.
7. **Node 22 upgrade:** `firebase.json`, `functions/package.json`, lockfile regenerate; emulator par functions test; deploy.
8. **Server-side approval:** `adminApproveUpgrade` / `adminRejectUpgrade` callable (UID check + Firestore transaction + audit write); ControlCentre, ClientCommandCenter aur legacy UpgradeRequests teeno isi ko call karein, duplicate logic hatayein.
9. **Backups:** Firestore scheduled export (Cloud Scheduler + function ya gcloud) + System Health me "last backup" check.
10. **Admin RBAC:** `backendStaff` ko custom claims ya rules `exists(backendStaff/{uid})` + role map se jodna; Roles UI ko asli data par; super-admin UID fallback rakhein.
11. **Feature flags wiring:** existing flags ke readers (ya unused flags hatayein); `resolveMenuImportSettings` ko `useMenuImport` me use karein; `TOOLS_LAUNCHED` ke liye flag + rebuild trigger (blog rebuild pattern reuse).
12. **Free-tool template module:** `toolTemplates` schema + rules + storage path → Control Centre upload/preview/publish → `docs-studio/templates/registry.js` me remote+builtin merge with safe fallback.
13. **Ops polish:** announcements scheduler/in-app banner, support assign + SLA, CSV download, dead buttons (Last 14 Days, Moon, Ctrl+K, Import CSV) implement ya hatayein, `src/crm/pages/AdminUpgradeRequests.jsx` aur unused rules collections cleanup, production console logs guard.
