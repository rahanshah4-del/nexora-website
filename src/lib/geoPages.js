/**
 * Copy, SEO and JSON-LD for the /geo/ guide section (the GEO / AI-crawler
 * guides that sit next to the free GeoLint audit at /tools/geo-audit/).
 *
 * To add a guide: add one object to GEO_PAGES. The route, SEO metadata, sitemap
 * entry, prerender route, hub card and JSON-LD all read this array
 * (src/AppRouter.jsx, src/lib/seoMetadata.js, scripts/generate-sitemap.mjs,
 * scripts/prerender.mjs, pages/public/GeoPage.jsx).
 *
 * Written answer-first: every page opens with a direct 30-60 word answer and
 * each section starts with its own answer. Block shapes match
 * pages/public/tools/ToolPageParts.jsx (p, h3, steps, list, table, callout, code).
 *
 * Only facts that are true. Bot names and purposes below come from each
 * company's published crawler documentation, which can change; the pages say so.
 */
import { absoluteUrl, assetUrl, createFAQPageSchema, SITE_URL } from './seoStructuredData.js'
import { GEOLINT_HOW_PATH, GEOLINT_PATH } from './geolintLaunch.js'
import { author } from '../config/author.js'

export const GEO_HUB_PATH = '/geo'
export const GEO_LAST_UPDATED = '2026-10-14'
export const GEO_OG_IMAGE_PATH = '/og-geolint.png'

const CHECK_CTA = Object.freeze({
  heading: 'Check your own website for free',
  text: 'GeoLint asks each AI search bot for your page, loads it with and without JavaScript and shows what is blocking you. It is free, needs no signup and takes about 20 seconds.',
  links: [
    { to: GEOLINT_PATH, label: 'Run the free GEO audit', primary: true },
    { to: GEOLINT_HOW_PATH, label: 'How GeoLint works' },
  ],
})

export const GEO_HUB = Object.freeze({
  path: GEO_HUB_PATH,
  breadcrumbName: 'GEO guides',
  seo: Object.freeze({
    title: 'GEO Guides: Make Your Site Readable to AI Search | Nexora',
    description:
      'Plain-English guides to generative engine optimization: what AI crawlers do, how to allow the right ones in robots.txt, and how to check your site for free.',
    keywords: 'GEO guides, generative engine optimization, AI crawler guide, AI search optimization, robots.txt for AI bots, GeoLint',
  }),
  h1: 'GEO Guides: Make Your Website Readable to AI Search',
  eyebrow: 'Generative engine optimization',
  lead: 'These guides explain generative engine optimization (GEO) in plain English: what AI search bots are, how to allow the ones you want, and how to check your own site. Each guide ends with the free GeoLint audit so you can test what you read.',
  faqHeading: 'GEO Guides: Common Questions',
  faqs: Object.freeze([
    {
      question: 'What are these guides for?',
      answer:
        'They help website owners understand how AI search tools reach and read their pages, and what to change if those tools cannot. They cover the technical access layer first, because a page that AI bots cannot fetch cannot be quoted.',
    },
    {
      question: 'Do I need technical skills?',
      answer:
        'No. Each guide gives copy-ready examples, such as a robots.txt snippet, and says who can make the change. If you would rather not do it yourself, Nexora can fix the issues GeoLint finds for a fixed fee per website.',
    },
  ]),
  cta: CHECK_CTA,
})

export const GEO_PAGES = Object.freeze([
  {
    slug: 'what-is-geo',
    path: '/geo/what-is-geo',
    breadcrumbName: 'What is GEO',
    seo: {
      title: 'What Is GEO? Generative Engine Optimization Guide | Nexora',
      description:
        'GEO (generative engine optimization) makes your pages easy for AI search tools to reach, read and quote. See how it differs from SEO and where to start.',
      keywords:
        'what is GEO, generative engine optimization, GEO vs SEO, AI search optimization, how to get cited by ChatGPT, AI crawler readiness',
    },
    h1: 'What Is GEO? Generative Engine Optimization Explained',
    eyebrow: 'GEO guide',
    lead: 'Generative engine optimization (GEO) is the work of making your pages easy for AI answer tools, such as ChatGPT search and Perplexity, to reach, read and quote. It starts with technical access, then moves to how your content is written and backed up with facts.',
    sections: [
      {
        id: 'meaning',
        heading: 'What GEO Means',
        blocks: [
          { p: 'GEO means preparing your website so that AI tools which write answers in sentences can find your page, read its text and use it as a source. Instead of ranking in a list of ten links, your page competes to be one of the few sources an AI answer draws on.' },
          { p: 'The work has two layers. The first is access: can the AI tool\'s crawler fetch your page, and is your text in the HTML it receives. The second is quality: does the page answer a question directly, with specific facts a tool can quote.' },
          { callout: 'No one can promise that an AI tool will cite you. GEO removes the technical reasons you would be left out and makes your pages easier to quote. It does not control what an AI tool chooses to say.' },
        ],
      },
      {
        id: 'geo-vs-seo',
        heading: 'GEO vs SEO: The Differences That Matter',
        tone: 'alt',
        blocks: [
          { p: 'SEO aims to rank your page in a list of search results, while GEO aims to get your page used inside an AI-written answer. They overlap heavily, because both need pages that crawlers can fetch, read and understand.' },
          {
            table: {
              caption: 'GEO compared with SEO',
              columns: ['Question', 'SEO', 'GEO'],
              rows: [
                ['What is the goal?', 'Rank in a list of links', 'Be used as a source inside an answer'],
                ['Who reads your page?', 'Search engine crawlers', 'AI search bots and live-answer bots'],
                ['What do you fix first?', 'Indexing, links, relevance', 'Bot access, text in the HTML, answer-first writing'],
                ['How do you check?', 'Rankings and clicks in Search Console', 'Whether bots can fetch the page and see its text'],
                ['What do they share?', 'Crawlable pages, clear structure, structured data', 'Crawlable pages, clear structure, structured data'],
              ],
            },
          },
          { p: 'GEO does not replace SEO. A page that a bot cannot fetch can do neither job, so fixing access helps both.' },
        ],
      },
      {
        id: 'four-checks',
        heading: 'The Four Things to Check First',
        blocks: [
          { p: 'Start with four checks in this order: can AI bots reach your page, is your text present without JavaScript, does each section answer directly, and are your facts specific and marked up. The first two decide whether AI tools can read you at all.' },
          {
            steps: [
              { title: 'Bot access', text: 'Check that robots.txt and your firewall let AI search bots in. See [GPTBot, OAI-SearchBot and ChatGPT-User](/geo/gptbot) and [robots.txt for AI bots](/geo/robots-txt-ai-bots).' },
              { title: 'Text without JavaScript', text: 'Many crawlers read only the raw HTML. If your text appears only after scripts run, those crawlers see an empty page.' },
              { title: 'Answer-first structure', text: 'Open each section with the direct answer, then add detail. A tool quoting you needs a clean sentence to lift.' },
              { title: 'Facts and structure', text: 'Specific numbers, named sources and JSON-LD structured data make a page easier to check and quote. An llms.txt file is an optional extra.' },
            ],
          },
          { p: 'You can test all four on any public page with the [free GeoLint audit](/tools/geo-audit). [How GeoLint works](/tools/geo-audit/how-it-works) shows exactly how each part is measured.' },
        ],
      },
      {
        id: 'limits',
        heading: 'What GEO Cannot Do',
        tone: 'alt',
        blocks: [
          { p: 'GEO cannot guarantee citations, rankings or traffic. AI tools choose sources in ways their makers do not fully publish, and answers change between runs. What you can control is whether your page is reachable, readable and quotable.' },
          { p: 'Treat any service that promises a fixed result from AI tools with caution. A sound GEO audit reports what it measured and what it could not verify.' },
        ],
      },
    ],
    faqHeading: 'GEO: Common Questions',
    faqs: [
      {
        question: 'What does GEO stand for?',
        answer:
          'GEO stands for generative engine optimization. It is the practice of making web pages easy for generative AI tools, which write answers instead of listing links, to find, read and quote.',
      },
      {
        question: 'Is GEO replacing SEO?',
        answer:
          'No. The two share the same foundation of crawlable, clearly structured pages. SEO targets rankings in a list of results and GEO targets being used as a source inside an AI answer, so most sites need both.',
      },
      {
        question: 'Do I need an llms.txt file?',
        answer:
          'It is optional. llms.txt is a proposed plain-text file at the root of your site that lists your key pages for AI tools. Not every AI tool is confirmed to read it, so treat it as a low-effort extra after robots.txt and your page content are right.',
      },
      {
        question: 'How do I check if my site is ready for AI search?',
        answer:
          'Run a GEO audit. GeoLint is free and needs no signup: paste a URL and it tests bot access, JavaScript dependence, answer-first structure and facts, then lists the fixes in order of impact.',
      },
    ],
    related: ['gptbot', 'robots-txt-ai-bots'],
    cta: CHECK_CTA,
  },
  {
    slug: 'gptbot',
    path: '/geo/gptbot',
    breadcrumbName: 'GPTBot and ChatGPT bots',
    seo: {
      title: 'GPTBot vs OAI-SearchBot vs ChatGPT-User Explained | Nexora',
      description:
        'OpenAI runs three crawlers: GPTBot, OAI-SearchBot and ChatGPT-User. See what each does, how to allow or block them, and why a firewall can still block them.',
      keywords:
        'GPTBot, OAI-SearchBot, ChatGPT-User, is GPTBot blocked, allow GPTBot robots.txt, block GPTBot, ChatGPT can\'t read my website, OpenAI crawler',
    },
    h1: 'GPTBot, OAI-SearchBot and ChatGPT-User: What Each Does',
    eyebrow: 'AI crawler guide',
    lead: 'OpenAI uses three user agents. GPTBot gathers content that may be used to train models, OAI-SearchBot finds pages for ChatGPT search results, and ChatGPT-User fetches a page when a person asks ChatGPT to open it. You can set a rule for each one separately.',
    sections: [
      {
        id: 'what-each-does',
        heading: 'What Each OpenAI Bot Does',
        blocks: [
          { p: 'The three bots have different jobs, so allowing or blocking them has different effects. If you want to appear in ChatGPT search, OAI-SearchBot is the one that matters most. Whether to allow GPTBot is a separate choice about model training.' },
          {
            table: {
              caption: 'OpenAI crawlers and what each is for',
              columns: ['User agent', 'Used for', 'Common choice'],
              rows: [
                ['GPTBot', 'Collecting content that may be used to train OpenAI models', 'A policy choice: allow or block'],
                ['OAI-SearchBot', 'Finding and listing pages in ChatGPT search results', 'Allow, if you want to appear in ChatGPT search'],
                ['ChatGPT-User', 'Fetching a page when a person asks ChatGPT to open it', 'Allow, if you want people to open your pages through ChatGPT'],
              ],
            },
          },
          { p: 'These descriptions follow OpenAI\'s published crawler documentation, which can change. Check OpenAI\'s current bot page before you rely on the details.' },
        ],
      },
      {
        id: 'allow-all',
        heading: 'How to Allow All Three Bots',
        tone: 'alt',
        blocks: [
          { p: 'To allow all three, add one group per bot to the robots.txt file at the root of your domain. If your robots.txt has no rule blocking these bots, they are already allowed by default, and an explicit Allow just makes your intent clear.' },
          { code: 'User-agent: GPTBot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /' },
          { p: 'Save the file as robots.txt in the root of your site, for example https://example.com/robots.txt. Rules only apply to the host that serves the file.' },
        ],
      },
      {
        id: 'block-training',
        heading: 'How to Block Training but Stay in ChatGPT Search',
        blocks: [
          { p: 'To opt out of model training while staying eligible for ChatGPT search, disallow GPTBot and allow OAI-SearchBot. Because the bots are separate, one rule does not affect the other.' },
          { code: 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /' },
          { callout: 'Blocking GPTBot is a content-rights decision, not a visibility fix. If your goal is to appear in ChatGPT search, check OAI-SearchBot first.' },
        ],
      },
      {
        id: 'still-blocked',
        heading: 'Why a Bot Can Still Be Blocked When robots.txt Allows It',
        tone: 'alt',
        blocks: [
          { p: 'A bot can be allowed in robots.txt and still be blocked, because robots.txt is a request and your firewall or CDN decides what actually happens. Bot-protection rules, rate limits and challenge pages can return a 403 or 429 error to AI crawlers even when robots.txt says yes.' },
          {
            steps: [
              { title: 'Read your robots.txt', text: 'Open /robots.txt on your domain and confirm that no User-agent: * group disallows the whole site and that none of the three bot names is disallowed.' },
              { title: 'Check your CDN and firewall', text: 'Look at bot-protection, managed rules and any setting that blocks AI crawlers in your CDN or hosting dashboard. Make sure they do not challenge or block the bots you want.' },
              { title: 'Test the real response', text: 'The only reliable proof is a request made as the bot. [GeoLint](/tools/geo-audit) tests both layers for each bot and reports what robots.txt says and what the server returned.' },
            ],
          },
        ],
      },
    ],
    faqHeading: 'GPTBot and ChatGPT Crawlers: Common Questions',
    faqs: [
      {
        question: 'Should I block GPTBot?',
        answer:
          'That depends on whether you are comfortable with your content being used to train models. According to OpenAI\'s description, GPTBot is separate from OAI-SearchBot, which is used for ChatGPT search, so blocking GPTBot is a different decision from staying visible in search.',
      },
      {
        question: 'Does ChatGPT-User follow robots.txt?',
        answer:
          'OpenAI describes ChatGPT-User as a fetcher that acts when a person asks ChatGPT to open a page. How it treats robots.txt is set by OpenAI and can change, so check its current documentation. Allowing it in both robots.txt and your firewall is the safe way to let people open your pages.',
      },
      {
        question: 'How do I know if GPTBot is blocked on my website?',
        answer:
          'Check two things: whether robots.txt disallows it, and whether your server or firewall returns an error to it. GeoLint tests both for each OpenAI bot and tells you which layer is the problem.',
      },
      {
        question: 'Why can ChatGPT not read my website?',
        answer:
          'The usual causes are a robots.txt rule that blocks the bot, a firewall or CDN rule that returns 403 or 429, or text that only appears after JavaScript runs. Each has a different fix, so test before changing anything.',
      },
    ],
    related: ['robots-txt-ai-bots', 'what-is-geo'],
    cta: CHECK_CTA,
  },
  {
    slug: 'robots-txt-ai-bots',
    path: '/geo/robots-txt-ai-bots',
    breadcrumbName: 'robots.txt for AI bots',
    seo: {
      title: 'robots.txt for AI Bots: GPTBot, ClaudeBot & More | Nexora',
      description:
        'How to control AI crawlers in robots.txt: bot names for OpenAI, Anthropic, Perplexity and Google-Extended, copy-ready examples, common mistakes and its limits.',
      keywords:
        'robots.txt AI bots, robots.txt GPTBot ClaudeBot, block AI crawlers robots.txt, allow AI crawlers, Google-Extended robots.txt, PerplexityBot robots.txt, AI bot user agents',
    },
    h1: 'robots.txt for AI Bots: GPTBot, ClaudeBot, PerplexityBot and More',
    eyebrow: 'AI crawler guide',
    lead: 'To control AI crawlers, add a User-agent group for each bot to the robots.txt file at the root of your domain, then use Allow or Disallow lines. Each AI company publishes its own bot names, so you list GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and Google-Extended separately.',
    sections: [
      {
        id: 'bot-names',
        heading: 'The AI Bot Names to Know',
        blocks: [
          { p: 'Most AI companies run more than one crawler, and each has a different purpose. Training crawlers collect content for models, search crawlers build an index for AI search, and user-triggered fetchers open a page when a person asks for it.' },
          {
            table: {
              caption: 'Common AI crawler user agents',
              columns: ['User agent', 'Company', 'Used for'],
              rows: [
                ['GPTBot', 'OpenAI', 'Collecting content that may be used for model training'],
                ['OAI-SearchBot', 'OpenAI', 'Listing pages in ChatGPT search'],
                ['ChatGPT-User', 'OpenAI', 'Opening a page when a person asks ChatGPT to'],
                ['ClaudeBot', 'Anthropic', 'Collecting content that may be used for model training'],
                ['Claude-SearchBot', 'Anthropic', 'Improving search result quality in Claude'],
                ['Claude-User', 'Anthropic', 'Opening a page when a person asks Claude to'],
                ['PerplexityBot', 'Perplexity', 'Building the Perplexity search index'],
                ['Perplexity-User', 'Perplexity', 'Opening a page when a person asks Perplexity to'],
                ['Google-Extended', 'Google', 'A robots.txt token that controls whether content Google crawls can be used for its Gemini AI models'],
              ],
            },
          },
          { p: 'Names and purposes follow each company\'s published crawler documentation and can change. Google-Extended is not a separate crawler and does not change how Googlebot indexes your site for normal search. Check each vendor\'s current page before relying on this table.' },
        ],
      },
      {
        id: 'search-not-training',
        heading: 'Example: Allow AI Search, Block Model Training',
        tone: 'alt',
        blocks: [
          { p: 'To stay visible in AI search while opting out of training, allow the search bots and disallow the training bots and the Google-Extended token. Keep each bot in its own group so the rules do not collide.' },
          { code: 'User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /' },
          { callout: 'This is one policy, not the only right one. Whether to allow training crawlers is a business decision about how your content may be used.' },
        ],
      },
      {
        id: 'allow-everything',
        heading: 'Example: Allow Every Bot',
        blocks: [
          { p: 'To allow every crawler, use a single wildcard group with an empty Disallow line, or leave robots.txt without any blocking rules. Both mean the same thing to a well-behaved bot.' },
          { code: 'User-agent: *\nDisallow:\n\nSitemap: https://example.com/sitemap.xml' },
        ],
      },
      {
        id: 'mistakes',
        heading: 'Common robots.txt Mistakes That Block AI Bots',
        tone: 'alt',
        blocks: [
          { p: 'Most accidental blocks come from five mistakes, and the first is the most damaging: a leftover rule that disallows everything.' },
          {
            list: [
              'A User-agent: * group with Disallow: / blocks every crawler that has no group of its own.',
              'A misspelled bot name, so the rule never matches the bot you meant.',
              'The file in the wrong place. It must be at /robots.txt on the exact host, and a subdomain needs its own file.',
              'A staging robots.txt that blocks everything being copied to the live site.',
              'Assuming robots.txt enforces the rule. It is a request that well-behaved bots follow.',
            ],
          },
        ],
      },
      {
        id: 'not-access-control',
        heading: 'robots.txt Is Not Access Control',
        blocks: [
          { p: 'robots.txt tells well-behaved crawlers what you want, but it cannot stop a bot or let one in. Your firewall, CDN and server decide what actually happens, so a bot allowed in robots.txt can still receive a 403 or a challenge page.' },
          { p: 'That gap is a common reason a site is invisible to AI search even though its robots.txt looks fine. See [why a bot can still be blocked](/geo/gptbot) and test the real response with the [free GeoLint audit](/tools/geo-audit).' },
        ],
      },
    ],
    faqHeading: 'robots.txt and AI Crawlers: Common Questions',
    faqs: [
      {
        question: 'Where does the robots.txt file go?',
        answer:
          'It goes in the root of the host it controls, for example https://example.com/robots.txt. Rules apply only to that host, so a subdomain such as blog.example.com needs its own robots.txt file.',
      },
      {
        question: 'Does blocking GPTBot hide my site from ChatGPT?',
        answer:
          'Not by itself, according to OpenAI\'s description of its bots. GPTBot is separate from OAI-SearchBot, which is used for ChatGPT search. To check whether ChatGPT search can reach you, look at OAI-SearchBot and at your firewall.',
      },
      {
        question: 'Do all AI bots obey robots.txt?',
        answer:
          'Not necessarily. robots.txt is voluntary, and reputable companies say their crawlers follow it, but it cannot force a bot to comply. If you need to keep a bot out, use your firewall or server rules as well.',
      },
      {
        question: 'How do I test my robots.txt for AI bots?',
        answer:
          'Open yourdomain.com/robots.txt to read the rules, then test what each bot actually receives. GeoLint does both for the main AI search bots and shows any difference between the two.',
      },
    ],
    related: ['gptbot', 'what-is-geo'],
    cta: CHECK_CTA,
  },
])

export const GEO_PATHS = Object.freeze([GEO_HUB_PATH, ...GEO_PAGES.map((page) => page.path)])

export function getGeoPage(slug) {
  return GEO_PAGES.find((page) => page.slug === slug) || null
}

function breadcrumbSchema(trail, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

function articleSchema(page) {
  const url = absoluteUrl(page.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    headline: page.h1,
    description: page.seo.description,
    image: assetUrl(GEO_OG_IMAGE_PATH),
    datePublished: GEO_LAST_UPDATED,
    dateModified: GEO_LAST_UPDATED,
    inLanguage: 'en',
    author: { '@type': 'Person', name: author.name, jobTitle: author.jobTitle, worksFor: { '@id': `${SITE_URL}/#organization` } },
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

/** Page-level JSON-LD in output order: Article, FAQPage (mirrors the visible FAQ), BreadcrumbList. */
export function geoPageSchemas(page) {
  const trail = [
    { name: 'Home', path: '/' },
    { name: GEO_HUB.breadcrumbName, path: GEO_HUB_PATH },
    { name: page.breadcrumbName, path: page.path },
  ]
  return [articleSchema(page), createFAQPageSchema({ path: page.path, items: page.faqs }), breadcrumbSchema(trail, page.path)].filter(Boolean)
}

/** Hub JSON-LD: CollectionPage listing the guides, FAQPage, BreadcrumbList. */
export function geoHubSchemas() {
  const url = absoluteUrl(GEO_HUB_PATH)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#webpage`,
      url,
      name: GEO_HUB.h1,
      description: GEO_HUB.seo.description,
      inLanguage: 'en',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: GEO_PAGES.map((page, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(page.path),
          name: page.h1,
        })),
      },
    },
    createFAQPageSchema({ path: GEO_HUB_PATH, items: GEO_HUB.faqs }),
    breadcrumbSchema([{ name: 'Home', path: '/' }, { name: GEO_HUB.breadcrumbName, path: GEO_HUB_PATH }], GEO_HUB_PATH),
  ].filter(Boolean)
}
