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
    related: ['gptbot', 'robots-txt-ai-bots', 'llms-txt', 'cloudflare-blocking-ai-bots', 'fix-my-website'],
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
              { title: 'Check your CDN and firewall', text: 'Look at bot-protection, managed rules and any setting that blocks AI crawlers in your CDN or hosting dashboard. Make sure they do not challenge or block the bots you want. If you use Cloudflare, follow the [Cloudflare checklist](/geo/cloudflare-blocking-ai-bots).' },
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
    related: ['claudebot', 'perplexitybot', 'robots-txt-ai-bots', 'cloudflare-blocking-ai-bots'],
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
          { p: 'That gap is a common reason a site is invisible to AI search even though its robots.txt looks fine. See [why a bot can still be blocked](/geo/gptbot), the [Cloudflare checklist](/geo/cloudflare-blocking-ai-bots) and test the real response with the [free GeoLint audit](/tools/geo-audit).' },
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
    related: ['gptbot', 'claudebot', 'perplexitybot', 'llms-txt', 'fix-my-website'],
    cta: CHECK_CTA,
  },
  {
    slug: 'claudebot',
    path: '/geo/claudebot',
    breadcrumbName: 'ClaudeBot and Claude bots',
    seo: {
      title: 'ClaudeBot, Claude-User & Claude-SearchBot Explained | Nexora',
      description:
        'Anthropic runs three bots: ClaudeBot, Claude-User and Claude-SearchBot. See what each one does and how to allow or block them in robots.txt.',
      keywords:
        'ClaudeBot, Claude-User, Claude-SearchBot, block ClaudeBot, allow ClaudeBot robots.txt, Anthropic crawler, Claude can\'t read my website',
    },
    h1: 'ClaudeBot, Claude-User and Claude-SearchBot: What Each Does',
    eyebrow: 'AI crawler guide',
    lead: 'Anthropic uses three user agents. ClaudeBot collects web content that may be used for model training, Claude-SearchBot improves the quality of search results in Claude, and Claude-User opens a page when a person asks Claude about it. Each can be allowed or blocked separately in robots.txt.',
    sections: [
      {
        id: 'what-each-does',
        heading: 'What Each Anthropic Bot Does',
        blocks: [
          { p: 'The three bots do different jobs, so blocking one does not block the others. If your goal is to be reachable when people use Claude, Claude-SearchBot and Claude-User matter most. Whether to allow ClaudeBot is a separate decision about training.' },
          {
            table: {
              caption: 'Anthropic crawlers and what each is for',
              columns: ['User agent', 'Used for', 'Common choice'],
              rows: [
                ['ClaudeBot', 'Collecting web content that may be used for model training', 'A policy choice: allow or block'],
                ['Claude-SearchBot', 'Improving the quality of search results for Claude users', 'Allow, if you want to be findable in Claude search'],
                ['Claude-User', 'Opening a page when a person asks Claude about it', 'Allow, if you want people to open your pages through Claude'],
              ],
            },
          },
          { p: 'These descriptions follow Anthropic\'s published crawler documentation, which can change. Check Anthropic\'s current page before you rely on the details, including how its bots treat robots.txt.' },
        ],
      },
      {
        id: 'allow-all',
        heading: 'How to Allow All Three Bots',
        tone: 'alt',
        blocks: [
          { p: 'To allow all three, add one group per bot to the robots.txt file at the root of your domain. If nothing in your file blocks them they are already allowed, and explicit rules just make your intent clear.' },
          { code: 'User-agent: ClaudeBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: Claude-User\nAllow: /' },
        ],
      },
      {
        id: 'block-training',
        heading: 'How to Block Training but Stay Reachable',
        blocks: [
          { p: 'To opt out of training while staying reachable, disallow ClaudeBot and allow the other two. Because each bot reads only its own group, one rule does not change the others.' },
          { code: 'User-agent: ClaudeBot\nDisallow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: Claude-User\nAllow: /' },
          { callout: 'Do not use a User-agent: * rule with Disallow: / to stop training. It blocks every crawler that has no group of its own, including the search bots you may want.' },
        ],
      },
      {
        id: 'still-blocked',
        heading: 'Why Claude Can Still Fail to Read Your Page',
        tone: 'alt',
        blocks: [
          { p: 'A page can be allowed in robots.txt and still be unreadable to Claude\'s bots, because a firewall or CDN rule can return a 403 or 429 error, and text that appears only after JavaScript runs looks empty to a crawler that reads raw HTML. Each cause needs a different fix.' },
          {
            list: [
              'robots.txt disallows the bot, or a wildcard rule blocks everything.',
              'A firewall, CDN or bot-protection rule challenges or blocks the bot.',
              'The text you want quoted exists only after JavaScript runs.',
            ],
          },
          { p: 'The [free GeoLint audit](/tools/geo-audit) separates these three causes by testing robots.txt, the real server response and the raw HTML. See also [robots.txt for AI bots](/geo/robots-txt-ai-bots).' },
        ],
      },
    ],
    faqHeading: 'ClaudeBot and Anthropic Crawlers: Common Questions',
    faqs: [
      {
        question: 'Should I block ClaudeBot?',
        answer:
          'That is a content-rights decision. As Anthropic describes it, ClaudeBot is for training data while Claude-SearchBot and Claude-User serve search and user requests, so you can block ClaudeBot and still allow the other two.',
      },
      {
        question: 'Does Anthropic say its bots follow robots.txt?',
        answer:
          'Anthropic\'s documentation says its crawlers follow robots.txt. Because policies change, read its current page, and use firewall rules too if you need a hard block.',
      },
      {
        question: 'How do I know if ClaudeBot is blocked on my website?',
        answer:
          'Check whether robots.txt disallows it and whether your server returns an error to it. GeoLint tests both layers for the main AI search bots and reports which one is the problem.',
      },
    ],
    related: ['gptbot', 'perplexitybot', 'robots-txt-ai-bots'],
    cta: CHECK_CTA,
  },
  {
    slug: 'perplexitybot',
    path: '/geo/perplexitybot',
    breadcrumbName: 'PerplexityBot and Perplexity-User',
    seo: {
      title: 'PerplexityBot vs Perplexity-User: What They Do | Nexora',
      description:
        'Perplexity uses two bots: PerplexityBot and Perplexity-User. See what each does, how to allow them, and why a firewall can still block you.',
      keywords:
        'PerplexityBot, Perplexity-User, allow PerplexityBot, block PerplexityBot, Perplexity can\'t read my website, Perplexity crawler robots.txt',
    },
    h1: 'PerplexityBot and Perplexity-User: What Each Does',
    eyebrow: 'AI crawler guide',
    lead: 'Perplexity uses two user agents. PerplexityBot builds the search index that Perplexity draws on, and Perplexity-User visits a page when a person asks a question that needs it. They behave differently, so allow each one deliberately and test the real response from your server.',
    sections: [
      {
        id: 'what-each-does',
        heading: 'What Each Perplexity Bot Does',
        blocks: [
          { p: 'PerplexityBot is the indexing bot, so blocking it can keep your pages out of Perplexity\'s search results. Perplexity-User is a user-triggered fetcher that opens a page during a live question.' },
          {
            table: {
              caption: 'Perplexity crawlers and what each is for',
              columns: ['User agent', 'Used for', 'Common choice'],
              rows: [
                ['PerplexityBot', 'Building the index that Perplexity search draws on', 'Allow, if you want to appear in Perplexity results'],
                ['Perplexity-User', 'Visiting a page when a person\'s question needs it', 'Allow in your firewall, so people can open your pages'],
              ],
            },
          },
          { p: 'These descriptions follow Perplexity\'s published bot documentation, which can change. That page also explains how each bot treats robots.txt and whether it publishes IP address lists. Read it before you write firewall rules.' },
        ],
      },
      {
        id: 'allow',
        heading: 'How to Allow Both Bots',
        tone: 'alt',
        blocks: [
          { p: 'To allow both, add a group for each bot to robots.txt. Allowing them in robots.txt is only the first layer, because a firewall can still block them.' },
          { code: 'User-agent: PerplexityBot\nAllow: /\n\nUser-agent: Perplexity-User\nAllow: /' },
        ],
      },
      {
        id: 'still-blocked',
        heading: 'Why a Firewall Can Block Perplexity Even When robots.txt Allows It',
        blocks: [
          { p: 'robots.txt is a request, while your firewall or CDN decides what a bot actually receives. Bot-protection rules, rate limits and challenge pages can return a 403 or 429 to AI crawlers even when robots.txt says yes.' },
          {
            steps: [
              { title: 'Read robots.txt', text: 'Confirm that neither bot is disallowed and that no User-agent: * group blocks the whole site.' },
              { title: 'Check your CDN and firewall', text: 'Look for bot-protection or managed rules that challenge or block these user agents, and allow the ones you want.' },
              { title: 'Test as the bot', text: 'Run the [free GeoLint audit](/tools/geo-audit) to see what robots.txt says and what the server returns for each AI search bot.' },
            ],
          },
          { p: 'For the access basics across all AI crawlers, read [robots.txt for AI bots](/geo/robots-txt-ai-bots).' },
        ],
      },
    ],
    faqHeading: 'PerplexityBot: Common Questions',
    faqs: [
      {
        question: 'Does blocking PerplexityBot remove me from Perplexity?',
        answer:
          'It can. PerplexityBot builds the index that Perplexity search draws on, so blocking it can keep your pages from appearing in results. Check Perplexity\'s current documentation for exactly how it is used.',
      },
      {
        question: 'What is Perplexity-User?',
        answer:
          'Perplexity describes Perplexity-User as the agent that visits a page when a person\'s question needs it. Because a person triggers it, Perplexity\'s documentation explains how it treats robots.txt, so read that page for the current rule.',
      },
      {
        question: 'How do I test if Perplexity can read my website?',
        answer:
          'Test two layers: what robots.txt says and what your server actually returns to the bot. GeoLint checks both and also tests whether your text is in the HTML without JavaScript.',
      },
    ],
    related: ['gptbot', 'claudebot', 'robots-txt-ai-bots'],
    cta: CHECK_CTA,
  },
  {
    slug: 'llms-txt',
    path: '/geo/llms-txt',
    breadcrumbName: 'llms.txt',
    seo: {
      title: 'What Is llms.txt? How to Create One (Free Guide) | Nexora',
      description:
        'llms.txt is a plain-text file that lists your key pages for AI tools. Learn what it is, see a copy-ready example, and decide whether it is worth adding.',
      keywords:
        'llms.txt, what is llms.txt, how to create llms.txt, llms.txt example, llms.txt generator, llms.txt for SEO, llms.txt checker',
    },
    h1: 'What Is llms.txt? A Plain-English Guide With an Example',
    eyebrow: 'GEO guide',
    lead: 'llms.txt is a proposed plain-text file, placed at yourdomain.com/llms.txt, that gives AI tools a short summary of your site and a list of your most useful pages. It is optional, support is not universal, and it works best after robots.txt and your page content are already in good shape.',
    sections: [
      {
        id: 'what-it-is',
        heading: 'What llms.txt Is',
        blocks: [
          { p: 'llms.txt is a Markdown file at the root of your site that describes what your website is and links to the pages an AI tool should read first. It was proposed in 2024 as a convention, not a formal standard, and it is separate from robots.txt, which controls access.' },
          { p: 'Think of robots.txt as the door rules and llms.txt as a short guide to what is inside. It does not let a blocked bot in, and it does not stop a bot from reading other pages.' },
        ],
      },
      {
        id: 'example',
        heading: 'A Copy-Ready llms.txt Example',
        tone: 'alt',
        blocks: [
          { p: 'A basic llms.txt has a title, a one-line summary and a few links with short descriptions. Replace the placeholders with your own business details and keep every sentence factual.' },
          { code: '# Example Bakery\n\n> Example Bakery is a family bakery in Springfield that sells fresh bread, cakes and catering platters, with delivery within the city.\n\n## Key pages\n\n- [Menu and prices](https://example.com/menu): Current bread, cake and catering prices\n- [Catering](https://example.com/catering): How to order platters for events\n- [Delivery areas](https://example.com/delivery): Which neighbourhoods we deliver to\n- [Contact](https://example.com/contact): Address, phone and opening hours' },
        ],
      },
      {
        id: 'add-it',
        heading: 'How to Add It to Your Website',
        blocks: [
          { p: 'To add llms.txt, create a plain-text file named llms.txt, write it in Markdown, and publish it so it loads at the root of your domain. It must return a normal 200 response, not an error or a redirect to your homepage.' },
          {
            steps: [
              { title: 'Write the file', text: 'Start with a title, a one-sentence summary and a short list of your most important pages, each with a one-line description.' },
              { title: 'Publish it at the root', text: 'Upload it so it opens at https://yourdomain.com/llms.txt. On most platforms that means placing it in the site\'s public or root folder.' },
              { title: 'Check it', text: 'Open the address in a browser and confirm it shows plain text. The [free GeoLint audit](/tools/geo-audit) reports whether your llms.txt is present.' },
            ],
          },
        ],
      },
      {
        id: 'worth-it',
        heading: 'Is llms.txt Worth Adding?',
        tone: 'alt',
        blocks: [
          { p: 'It is worth adding if it takes you a few minutes, but it is not a priority. No AI company has promised that it will use the file, so fix [bot access](/geo/robots-txt-ai-bots) and your page content first.' },
          { callout: 'An llms.txt file will not rescue a site whose pages bots cannot fetch or whose text appears only after JavaScript runs. Fix access first, then add the file as a low-effort extra.' },
        ],
      },
    ],
    faqHeading: 'llms.txt: Common Questions',
    faqs: [
      {
        question: 'Is llms.txt an official standard?',
        answer:
          'No. It is a proposed convention published in 2024, not a formal internet standard, and AI companies have not all confirmed that they read it. Treat it as optional.',
      },
      {
        question: 'Is llms.txt the same as robots.txt?',
        answer:
          'No. robots.txt tells crawlers which pages they may or may not fetch, while llms.txt is a short guide that points AI tools to your most useful pages. They do different jobs and you can have both.',
      },
      {
        question: 'Will llms.txt make ChatGPT cite my website?',
        answer:
          'No one can promise that. The file may help a tool find your key pages, but citations depend on many things, including whether the tool can reach and read your content in the first place.',
      },
      {
        question: 'How do I check if my llms.txt works?',
        answer:
          'Open yourdomain.com/llms.txt in a browser and confirm it returns plain text, not an error page. GeoLint also checks for the file as part of its facts and structure score.',
      },
    ],
    related: ['what-is-geo', 'robots-txt-ai-bots'],
    cta: CHECK_CTA,
  },
  {
    slug: 'fix-my-website',
    path: '/geo/fix-my-website',
    breadcrumbName: 'We fix your website',
    seo: {
      title: 'We Fix Your Website for AI Search, from $50 | Nexora',
      description:
        'Got a GeoLint report but no developer? Nexora makes the fixes for you: robots.txt, llms.txt, structured data and a before and after score, from $50 per website.',
      keywords:
        'fix my website for AI search, GEO fix service, AI search optimization service, fix GEO audit, make website visible to ChatGPT, GeoLint fix service',
    },
    h1: 'We Fix Your Website So AI Search Tools Can Read It',
    eyebrow: 'Done-for-you service',
    lead: 'If your GeoLint report shows problems and you would rather not fix them yourself, Nexora makes the changes for you. The GEO fix is $50 per website, covers every fix from your audit that can be changed on your site, and ends with a before and after score.',
    service: {
      name: 'GEO fix for AI search',
      serviceType: 'Generative engine optimization fix',
      description: 'Nexora makes the fixes from a GeoLint audit on the client\'s website, including robots.txt, llms.txt, structured data and answer-first page openings, then re-audits to show the score before and after.',
      price: '50',
      priceCurrency: 'USD',
    },
    sections: [
      {
        id: 'included',
        heading: 'What the GEO Fix Includes',
        blocks: [
          { p: 'The GEO fix covers every item from your GeoLint audit that can be changed on your website. It is built for site owners who have the report but not the coding skills to act on it.' },
          {
            list: [
              'Every fix from your GeoLint audit that can be changed on your site.',
              'robots.txt, llms.txt, meta tags and structured data (schema) set up correctly.',
              'Answer-first openings and server-readable text for key pages.',
              'A re-audit that shows your score before and after the work.',
            ],
          },
        ],
      },
      {
        id: 'how-it-works',
        heading: 'How the Service Works',
        tone: 'alt',
        blocks: [
          { p: 'You order online in a few steps, we do the work, and we run the audit again so you can see what changed. You never share a password: access is given by invitation.' },
          {
            steps: [
              { title: 'Sign in', text: 'Use Google or email, so your order and report stay together.' },
              { title: 'Enter your website', text: 'We read your site name, logo and platform for you and check your current score. You can add up to three competitors to compare against.' },
              { title: 'Choose your plan and pay', text: 'Pick the GEO fix or the full website SEO plan and pay by card, or by bank or mobile wallet. Your order starts once we confirm payment.' },
              { title: 'We fix it', text: 'We make the changes, run the audit again and show your score before and after.' },
            ],
          },
        ],
      },
      {
        id: 'plans',
        heading: 'GEO Fix or Full Website SEO',
        blocks: [
          { p: 'The GEO fix focuses on AI search readiness, while the full website SEO plan adds a complete SEO job on top of it. The order page shows the current price of each plan before you pay.' },
          {
            table: {
              caption: 'Plans compared',
              columns: ['', 'GEO fix', 'Full website SEO'],
              rows: [
                ['Price', '$50 per website', 'Shown on the order page'],
                ['AI search fixes from your audit', 'Included', 'Included'],
                ['Technical SEO: speed, indexing, sitemap, redirects, broken links', 'Not included', 'Included'],
                ['On-page SEO for the whole site', 'Not included', 'Included'],
                ['Keyword plan from your Search Console data and competitors', 'Not included', 'Included'],
                ['Before and after score', 'Included', 'Included'],
              ],
            },
          },
        ],
      },
      {
        id: 'limits',
        heading: 'What We Cannot Promise',
        tone: 'alt',
        blocks: [
          { p: 'We aim for a GeoLint score of 90 or more, but that is a target and not a guaranteed result. Some limits come from your website platform, and we say so in the report instead of hiding them.' },
          { callout: 'No one can guarantee that ChatGPT, Perplexity or any AI tool will cite your website. We fix the technical reasons you could be left out and show the measured result.' },
          { p: 'Check the [refund policy](/refund-policy) before you order. If you are unsure whether you need the service, [run the free audit](/tools/geo-audit) first and read what each fix means in the [GEO guides](/geo).' },
        ],
      },
    ],
    faqHeading: 'GEO Fix Service: Common Questions',
    faqs: [
      {
        question: 'How much does the GEO fix cost?',
        answer:
          'The GEO fix is $50 per website. The order page shows the current price of each plan before you pay, so check it when you place your order.',
      },
      {
        question: 'Do I need to give you my password?',
        answer:
          'No. We ask for access by invitation, such as adding us as a user, rather than your passwords. The order form lets you choose how you will give access.',
      },
      {
        question: 'Will my score reach 90?',
        answer:
          'Our target is 90 or more, but it is not guaranteed. The result depends on your website platform and on which fixes can be changed on your site. We show the score before and after so you see the real change.',
      },
      {
        question: 'Do I need to run the audit first?',
        answer:
          'Not necessarily. The order form checks your current score and attaches the report to your order. You can also run the free GeoLint audit yourself first to see what is wrong.',
      },
      {
        question: 'How do I pay?',
        answer:
          'You can pay by card, or by bank or mobile wallet. Your order starts once we confirm your payment.',
      },
    ],
    related: ['what-is-geo', 'robots-txt-ai-bots'],
    cta: {
      heading: 'Get your website fixed',
      text: 'Order the GEO fix online in a few minutes, or start with the free audit to see your score first.',
      links: [
        { to: '/tools/geo-audit/fix', label: 'Order the GEO fix', primary: true },
        { to: GEOLINT_PATH, label: 'Run the free audit first' },
      ],
    },
  },

  {
    slug: 'cloudflare-blocking-ai-bots',
    path: '/geo/cloudflare-blocking-ai-bots',
    breadcrumbName: 'Cloudflare blocking AI bots',
    seo: {
      title: 'Cloudflare Blocking AI Bots? How to Check and Fix | Nexora',
      description:
        'Cloudflare can block AI crawlers such as GPTBot through its AI bot policies, a managed robots.txt or per-crawler blocks. See where to look and how to fix it.',
      keywords:
        'Cloudflare blocking AI bots, Cloudflare block AI crawlers, allow GPTBot Cloudflare, Cloudflare managed robots.txt, Cloudflare AI Crawl Control, Cloudflare AI bot policies, ChatGPT can\'t read my website Cloudflare',
    },
    h1: 'Cloudflare Blocking AI Bots: How to Check and Fix It',
    eyebrow: 'AI crawler guide',
    lead: 'Cloudflare can keep AI crawlers away from your website in three places: its AI bot policies for Search, Agent and Training bots, a managed robots.txt that disallows AI crawlers, and per-crawler blocks or bot rules. Check all three, because fixing only robots.txt leaves a firewall block in place.',
    sections: [
      {
        id: 'why',
        heading: 'Why Cloudflare Can Block AI Bots',
        blocks: [
          { p: 'Cloudflare sits in front of your website and decides which requests reach it, so a rule there can stop an AI crawler even when your own robots.txt allows it. Some of these controls can be switched on without you noticing, for example by a developer, at setup, or by a default.' },
          { p: 'Cloudflare announced in July 2025 that it would block AI crawlers by default for the websites it hosts, and let owners allow or block bots case by case. Its July 2026 documentation says that from 15 September 2026 newly added domains get updated defaults: Training and Agent bots are blocked on pages that show ads, while Search bots stay allowed. An older website depends on the settings chosen earlier, and Cloudflare\'s defaults change over time, so check your own dashboard.' },
        ],
      },
      {
        id: 'three-places',
        heading: 'The Three Places to Check',
        tone: 'alt',
        blocks: [
          { p: 'Look at the AI bot policies, the robots.txt your site actually serves, and the per-crawler blocks and rules. Any one of them can block a bot you want, and fixing one does not undo the others.' },
          {
            table: {
              caption: 'Where Cloudflare can block AI crawlers',
              columns: ['Where', 'What it does', 'What to check'],
              rows: [
                ['AI bot policies: Search, Agent and Training (Security Settings, filtered by Bot traffic)', 'Each behaviour can be allowed, blocked, or blocked only on pages that show ads. Search covers crawlers that index content to answer questions, Agent covers fetches made in real time for a person, and Training covers collecting content to train models', 'Whether Search and Agent are blocked. Training is the one most owners choose to block'],
                ['Managed robots.txt (Bot Preference Sync)', 'Adds Disallow lines for AI crawlers, such as GPTBot and ClaudeBot, to the robots.txt your site serves, in front of your own file', 'Open /robots.txt and look for AI bot lines you did not write'],
                ['AI Crawl Control and custom rules', 'Sets Allow or Block for each crawler. A block creates a firewall rule that enforces it', 'Whether a crawler you want is set to Block, and whether any custom rule challenges AI user agents'],
              ],
            },
          },
          { p: 'These names follow Cloudflare\'s documentation in October 2026 and can change. Older accounts may still show the earlier single Block AI bots setting, which Cloudflare\'s documentation said was being retired, so use its current documentation to find the right screens.' },
        ],
      },
      {
        id: 'how-to-check',
        heading: 'How to Check What Cloudflare Is Doing',
        blocks: [
          { p: 'Check in three steps: read your live robots.txt, review Cloudflare\'s AI bot policies and crawler table, then test as the bot. The last step is the only proof of what a crawler actually receives.' },
          {
            steps: [
              { title: 'Read the live robots.txt', text: 'Open yourdomain.com/robots.txt in a browser. If it contains Disallow lines for AI bots that you never wrote, a managed robots.txt is probably adding them in front of your own file.' },
              { title: 'Review Cloudflare\'s AI settings', text: 'Open Security Settings, filter by Bot traffic and open the AI bot policies. Then open AI Crawl Control and check the crawler table for any crawler you want that is set to Block.' },
              { title: 'Test as the bot', text: 'Run the [free GeoLint audit](/tools/geo-audit). It requests your page as each AI search bot and shows what robots.txt says and what the server really returned, such as a 403, a 429 or a challenge page.' },
            ],
          },
        ],
      },
      {
        id: 'allow',
        heading: 'How to Allow the Bots You Want',
        tone: 'alt',
        blocks: [
          { p: 'To allow the bots you want, set the Search policy to allow, set Agent to allow if you want people to open your pages through AI assistants, and keep Training blocked if that is your policy. Then check that nothing in robots.txt or AI Crawl Control still blocks the specific crawlers.' },
          {
            list: [
              'In the AI bot policies, allow Search, and allow Agent if you want AI assistants to be able to open your pages for people. Block Training if you do not want your content used to train models.',
              'If Bot Preference Sync is on, remember that it writes the matching Disallow lines into your robots.txt, so a Search or Agent block shows up there too.',
              'In AI Crawl Control, set Allow on the specific crawlers you want and check for custom rules that challenge AI user agents.',
            ],
          },
          { callout: 'A user agent name can be faked by anyone. Do not create a rule that skips all protection for any request that merely claims to be GPTBot or ClaudeBot. Use the per-crawler controls Cloudflare provides, which are built on its own bot verification.' },
          { p: 'To decide which bots to allow, read [GPTBot, OAI-SearchBot and ChatGPT-User](/geo/gptbot), [ClaudeBot and its sister bots](/geo/claudebot), [PerplexityBot](/geo/perplexitybot) and [robots.txt for AI bots](/geo/robots-txt-ai-bots). Cloudflare decides how each bot is classified, so check its bot directory for the policy that covers a given crawler.' },
        ],
      },
      {
        id: 'retest',
        heading: 'Re-test After the Change',
        blocks: [
          { p: 'After changing a setting, wait a few minutes and run the audit again, because caching and rule updates are not always instant. A pass in GeoLint is a strong sign that your rules are right.' },
          { p: 'GeoLint cannot fully copy a firewall that verifies a bot by its network address, which is how Cloudflare recognises verified bots. For certainty, also check the AI Crawl Control view and Cloudflare\'s security events for real crawler requests and whether they were allowed.' },
        ],
      },
    ],
    faqHeading: 'Cloudflare and AI Bots: Common Questions',
    faqs: [
      {
        question: 'Does Cloudflare block AI bots by default?',
        answer:
          'Cloudflare announced in July 2025 that it would block AI crawlers by default for the websites it hosts. Its documentation says newly added domains get updated defaults from 15 September 2026, with Training and Agent bots blocked on pages that show ads and Search allowed. For an older website the result depends on the settings that were chosen, so check your dashboard.',
      },
      {
        question: 'Why does my robots.txt contain lines I did not write?',
        answer:
          'A managed robots.txt can add Disallow lines for AI crawlers in front of your own file. Cloudflare says it does this when you sync your AI bot preferences. Look for it in your AI bot policies, then decide which bots you want to keep blocking.',
      },
      {
        question: 'Will allowing AI bots expose my private pages?',
        answer:
          'Allowing a bot lets it read public pages it can reach, the same as any visitor. It does not unlock pages behind a login. If you do not want content used for training, allow Search and keep Training blocked.',
      },
      {
        question: 'How do I know the problem is fixed?',
        answer:
          'Run GeoLint on your page and check that each AI search bot is allowed in robots.txt and receives a normal response from the server. Then look at the AI Crawl Control view in Cloudflare over the following days for real crawler requests.',
      },
    ],
    related: ['gptbot', 'robots-txt-ai-bots', 'perplexitybot', 'fix-my-website'],
    cta: CHECK_CTA,
  },
])

/**
 * Short "is your website readable to AI search?" block shown on the market
 * landing pages (src/pages/public/GeoLintMarketSection.jsx). Keyed by the page
 * slug. Each entry is written for that market so the blocks are not copies:
 * who the page speaks to, and the facts that differ (language of the page is
 * English throughout; Germany is left out because its page is in German).
 * The fix price is the same everywhere and is in US dollars (GEO_FIX_PRICE_USD).
 */
export const GEO_FIX_PRICE_USD = 50

export const GEO_MARKETS = Object.freeze({
  usa: {
    heading: 'Can AI search tools read your US business website?',
    text: 'When a customer asks ChatGPT or Perplexity for a local shop, a freelancer or a contractor, the answer can only draw on pages the AI bots can fetch and read. GeoLint checks that for your site, free and with no signup, in about 20 seconds.',
    note: 'If you would rather not fix it yourself, the done-for-you GEO fix is $50 per website, priced in US dollars.',
  },
  uk: {
    heading: 'Can AI search tools read your UK business website?',
    text: 'AI tools now answer questions that used to be a Google search, and they only quote pages their crawlers can reach. GeoLint tests whether the main AI search bots can fetch your page and read its text, free and without an account.',
    note: 'The done-for-you GEO fix costs $50 per website. Prices are in US dollars, so your bank may convert it to pounds.',
  },
  uae: {
    heading: 'Can AI search tools read your UAE business website?',
    text: 'Customers in the UAE ask AI assistants for services and suppliers as well as searching. GeoLint shows whether those assistants\' crawlers can reach your website and read your English-language pages, free and in about 20 seconds.',
    note: 'If you would rather not fix it yourself, the done-for-you GEO fix is $50 per website, priced in US dollars.',
  },
  australia: {
    heading: 'Can AI search tools read your Australian business website?',
    text: 'If your customers ask AI tools before they call, your website has to be readable to the bots behind them. GeoLint tests access, JavaScript dependence and answer-first structure on any public page, free and with no signup.',
    note: 'The done-for-you GEO fix is $50 per website. Prices are in US dollars, not Australian dollars.',
  },
  india: {
    heading: 'Can AI search tools read your Indian business website?',
    text: 'More people now ask AI assistants for products and services, and those assistants only use pages their crawlers can fetch. GeoLint is a free check that shows what blocks them on your website, with no signup and no watermark.',
    note: 'The done-for-you GEO fix is $50 per website. Prices are in US dollars, and you can pay by card or by bank transfer or mobile wallet.',
  },
  pakistan: {
    heading: 'Can AI search tools read your Pakistani business website?',
    text: 'Nexora is built in Multan, and GeoLint answers a question every website owner can ask: can ChatGPT and other AI search tools reach my site? Paste your address and see what blocks them, free and with no signup.',
    note: 'The done-for-you GEO fix is $50 per website. Prices are in US dollars, and you can pay by card or by bank or mobile wallet.',
  },
})

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

/** Service JSON-LD for a page with a `service` object (the paid fix page); null otherwise. Price matches the visible copy. */
function serviceSchema(page) {
  if (!page.service) return null
  const url = absoluteUrl(page.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: page.service.name,
    serviceType: page.service.serviceType,
    description: page.service.description,
    url,
    provider: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      price: page.service.price,
      priceCurrency: page.service.priceCurrency,
      url: absoluteUrl('/tools/geo-audit/fix'),
    },
  }
}

/** Page-level JSON-LD in output order: Article, Service (fix page only), FAQPage (mirrors the visible FAQ), BreadcrumbList. */
export function geoPageSchemas(page) {
  const trail = [
    { name: 'Home', path: '/' },
    { name: GEO_HUB.breadcrumbName, path: GEO_HUB_PATH },
    { name: page.breadcrumbName, path: page.path },
  ]
  return [articleSchema(page), serviceSchema(page), createFAQPageSchema({ path: page.path, items: page.faqs }), breadcrumbSchema(trail, page.path)].filter(Boolean)
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
