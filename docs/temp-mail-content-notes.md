# Temp Mail guide pages: content notes (for people and for LLMs editing this section)

These pages live in `src/lib/tempMailGuides/*.js` and render at `/tools/temp-mail/<slug>/`.
They exist to rank for the keywords around the free tool, and to be useful to a real reader.

## Keyword map (one primary keyword per page, never shared)
| Page | Primary keyword (Semrush US volume, Oct 2026) | Also covers |
|---|---|---|
| `/tools/temp-mail` (the tool) | temp mail, temporary email generator (8.1K), temporary email (90.5K) | 10 minute mail alternative, fake email generator |
| `/tools/temp-mail/temporary-email-address` | temporary email address (4.4K), temporary email addresses (3.6K) | email temporary (2.4K) |
| `/tools/temp-mail/disposable-email-address` | disposable email address (2.4K), disposable email account (3.6K) | free disposable email (1.9K), disposable email generator (2.9K), temporary disposable email (2.4K) |
| `/tools/temp-mail/temp-mail-for-verification` | temp mail for verification code / OTP | email without phone number |
| `/tools/temp-mail/10-minute-mail-alternative` | 10 minute mail, 10 minute email | timer based inboxes |
| `/tools/temp-mail/is-temp-mail-safe` | is temp mail safe, are temporary emails safe | privacy, risks |
| `/tools/temp-mail/block-disposable-emails` | block disposable email addresses | disposable email detection, for site owners |

Semrush's free quota allowed only a few lookups, so volumes for the long-tail rows are not measured. Do not invent numbers.

## How to write (the "does not read like AI" rules)
1. Start every page with a 30 to 60 word direct answer (`lead`). Every section opens with its own answer too.
2. Write like a person who has actually used the tool: concrete examples, real numbers, an occasional opinion, short and long sentences mixed.
3. Banned: "in today's digital world", "delve", "landscape", "crucial", "seamless", "robust", "leverage", "game-changer", "unlock", "it is important to note", "whether you are X or Y", rule-of-three padding, a summary paragraph that repeats the page.
4. No two pages may share a paragraph, a table, a FAQ answer or an example. Each page has its own angle (see the table). When a fact must repeat (for example, an address lasts one hour), word it differently and keep it short.
5. Facts only. Product facts must match `src/lib/tempMailData.js` (1 hour, one extra hour once, receive only, attachments up to 1 MB, scripts and remote images stripped, salted hashed IP, custom names 3 to 32 characters). Do not make claims about named competitors, and do not promise that a site will accept the address.
6. Say what the tool cannot do (no SMS, no sending, no API, some sites block disposable domains). The honest limits are what make the page trustworthy.
7. Length: 2,500 to 3,000 words per page including the FAQ. `tests/temp-mail-guides.test.mjs` enforces it, plus title/description limits, unique slugs, no repeated paragraphs and inbound links.
8. Internal links use markdown `[text](/path)`. Every guide links to the tool and to at least two sibling guides.

## Wiring (already done)
Route in `src/AppRouter.jsx`, SEO in `src/lib/seoMetadata.js`, prerender in `scripts/prerender.mjs`, sitemap in `scripts/generate-sitemap.mjs`, JSON-LD (Article, FAQPage, BreadcrumbList) in `src/lib/tempMailGuides.js`.
