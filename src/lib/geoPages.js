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
export const GEO_LAST_UPDATED = '2026-10-27'
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
    related: ['gptbot', 'robots-txt-ai-bots', 'llms-txt', 'cloudflare-blocking-ai-bots', 'why-chatgpt-cant-see-my-website', 'fix-my-website'],
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
    related: ['gptbot', 'claudebot', 'perplexitybot', 'llms-txt', 'check-ai-crawler-access', 'fix-my-website'],
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
  {
    slug: 'shopify-allow-ai-bots',
    path: '/geo/shopify-allow-ai-bots',
    breadcrumbName: 'Shopify and AI bots',
    seo: {
      title: 'Shopify and AI Bots: Edit robots.txt.liquid | Nexora',
      description:
        'Does Shopify block ChatGPT, Claude and Perplexity? See what the default robots.txt says, how to check it and how to allow AI search bots with robots.txt.liquid.',
      keywords:
        'Shopify allow GPTBot, Shopify robots.txt AI bots, Shopify block AI crawlers, robots.txt.liquid AI bots, Shopify ChatGPT visibility, Shopify GEO',
    },
    h1: 'Shopify and AI Bots: Check and Edit Your robots.txt',
    eyebrow: 'Platform guide',
    lead: 'Shopify creates your robots.txt for you, and a store owner changes it by adding a robots.txt.liquid template to the theme. Open yourstore.com/robots.txt first to see whether any AI bot is blocked. If nothing blocks them, you may not need to edit anything at all.',
    sections: [
      {
        id: 'default',
        heading: 'What Shopify\'s Default robots.txt Does',
        blocks: [
          { p: 'Shopify generates a robots.txt for every store. Its default rules mainly keep crawlers out of non-content paths such as the cart, checkout and account pages. Third-party guides report that the default file does not name AI search bots, but you should read your own file rather than trust a guide.' },
          { p: 'In 2025 Shopify added a comment to the default file saying that scraping bots and automated buying agents are not allowed to complete purchases without a human check. A Shopify engineer quoted by Modern Retail said the change added no new bot rules and only points developers to Shopify\'s Checkout Kit. Some blog posts describe that comment as a block on AI crawlers. It is a note for developers, not a rule that stops a search bot reading your product pages.' },
        ],
      },
      {
        id: 'check',
        heading: 'How to Check Your Store',
        tone: 'alt',
        blocks: [
          { p: 'Check your store in two steps: read the robots.txt it serves, then test what each AI bot actually receives. The first shows the rules and the second shows the real response.' },
          {
            steps: [
              { title: 'Read your robots.txt', text: 'Open yourstore.com/robots.txt. Look for User-agent lines naming GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot or PerplexityBot, followed by Disallow: /. If a line like that exists, someone added it or an app did.' },
              { title: 'Test as each bot', text: 'Run the [free GeoLint audit](/tools/geo-audit) on a product or collection page. It requests the page as each AI search bot and shows the status code, so you can see a firewall or app block that robots.txt does not show.' },
            ],
          },
        ],
      },
      {
        id: 'edit',
        heading: 'How to Edit robots.txt on Shopify',
        blocks: [
          { p: 'To edit robots.txt on Shopify, create a template named robots.txt.liquid in your theme\'s Templates folder. According to Shopify\'s developer documentation, this template replaces the file Shopify generates, so keep a copy of the current output and compare before you publish.' },
          {
            list: [
              'In the theme code editor, open the Templates folder and add a new file named robots.txt.liquid.',
              'Use the Liquid objects Shopify provides, such as robots.default_groups, so the default rules are kept. Shopify advises against pasting plain text, because the rendered output may differ from the default.',
              'Add custom rules outside the default loop, for example a User-agent group for a bot you want to allow or block.',
              'Save, then open /robots.txt again and compare it with the copy you kept.',
            ],
          },
          { callout: 'Edit a copy of your theme first if you can. A mistake in this template changes what every crawler sees, search engines included. Shopify\'s documentation also covers rules for stores using Markets, so read it before adding host-specific rules.' },
        ],
      },
      {
        id: 'which-bots',
        heading: 'Which AI Bots to Allow on a Store',
        tone: 'alt',
        blocks: [
          { p: 'Most stores that want to be found in AI answers allow the search and user-fetch bots, and treat training bots as a separate choice. Keep cart, checkout and account paths blocked either way.' },
          { p: 'Search bots such as OAI-SearchBot and PerplexityBot build the indexes AI answers draw on. User bots such as ChatGPT-User open a page when a person asks. Training bots such as GPTBot and ClaudeBot collect content for models, and blocking them is a policy choice. [The GPTBot guide](/geo/gptbot) and [the robots.txt guide](/geo/robots-txt-ai-bots) explain each bot and give copy-ready rules.' },
          { p: 'Remember that robots.txt is only half of access. A store behind Cloudflare or a security app can still block a bot, which is covered in [Cloudflare blocking AI bots](/geo/cloudflare-blocking-ai-bots).' },
        ],
      },
    ],
    faqHeading: 'Shopify and AI Bots: Common Questions',
    faqs: [
      {
        question: 'Does Shopify block ChatGPT?',
        answer:
          'Third-party guides report that the default Shopify robots.txt does not name AI search bots, and a Shopify engineer said its 2025 note about automated buying agents added no new rules. Your own file may differ if an app or a theme edit changed it, so open your robots.txt and test the page.',
      },
      {
        question: 'Do I need robots.txt.liquid to be visible in AI search?',
        answer:
          'Not if nothing blocks the bots. You only need the template to remove a rule that blocks a bot you want, or to add rules for a bot you want to restrict.',
      },
      {
        question: 'Can I block AI training but stay visible in AI answers?',
        answer:
          'Often yes, because the bots have separate user agents. Allow search and user bots and disallow the training bots in robots.txt. Check each company\'s current documentation, since purposes and names change.',
      },
      {
        question: 'Why does GeoLint show a block when my robots.txt allows the bot?',
        answer:
          'Something outside robots.txt is refusing the request, such as a CDN or firewall rule, a security app or a rate limit. The audit reports the status code the bot actually received.',
      },
    ],
    related: ['wordpress-allow-ai-bots', 'robots-txt-ai-bots', 'gptbot', 'fix-my-website'],
    cta: CHECK_CTA,
  },
  {
    slug: 'wordpress-allow-ai-bots',
    path: '/geo/wordpress-allow-ai-bots',
    breadcrumbName: 'WordPress and AI crawlers',
    seo: {
      title: 'WordPress robots.txt for AI Bots: Allow or Block | Nexora',
      description:
        'Find where your WordPress robots.txt comes from, edit it in Yoast, Rank Math or AIOSEO, and check the security plugin or host that can still block ChatGPT.',
      keywords:
        'WordPress robots.txt, WordPress allow GPTBot, WordPress block AI crawlers, WordPress ClaudeBot, Yoast robots.txt AI bots, Rank Math robots.txt, WordPress ChatGPT visibility, WordPress GEO',
    },
    h1: 'WordPress robots.txt for AI Crawlers: How to Allow or Block Them',
    eyebrow: 'Platform guide',
    lead: 'WordPress usually serves a virtual robots.txt that it or an SEO plugin generates, so there may be no file to edit. Read yourdomain.com/robots.txt to see the live rules, then check the places that can block AI bots even when robots.txt allows them.',
    sections: [
      {
        id: 'where',
        heading: 'Where Your WordPress robots.txt Comes From',
        blocks: [
          { p: 'Your robots.txt comes from one of three places: a physical file in the site\'s root folder, a virtual file that WordPress generates, or one managed by an SEO plugin. A physical file takes priority over a virtual one, and a plugin can overwrite manual edits, so find out which applies before you change anything.' },
          { p: 'Open yourdomain.com/robots.txt in a browser. That is the file crawlers read. Editing something else, such as a copy that your SEO plugin no longer serves, changes nothing. This is the most common reason people say "I edited it and nothing happened".' },
          { p: 'A fresh WordPress install with no plugin serves a very short virtual file: it blocks /wp-admin/ and allows admin-ajax.php. It does not name any AI bot, so by default none is blocked from this file.' },
        ],
      },
      {
        id: 'blockers',
        heading: 'What Can Block AI Bots on WordPress',
        tone: 'alt',
        blocks: [
          { p: 'Five places can block an AI bot on a WordPress site, and robots.txt is only the first. Check them in order.' },
          {
            table: {
              caption: 'Where a WordPress site can block AI crawlers',
              columns: ['Where', 'How it blocks', 'How to check'],
              rows: [
                ['robots.txt', 'Disallow lines for named bots, or for everyone', 'Open /robots.txt and read it'],
                ['Search engine visibility setting', 'The Discourage search engines option in Settings, Reading adds a noindex signal and can change robots.txt. It is meant for sites under construction', 'Check that it is unticked on a live site'],
                ['SEO or AI-blocking plugin', 'Some plugins add AI bot rules to robots.txt or headers with one switch', 'Review the plugin\'s bot or crawler settings'],
                ['Security plugin or firewall', 'Rate limits or bot rules can return 403 or 429 to crawlers', 'Test as the bot to see the status code'],
                ['Host or CDN', 'Hosting firewalls and CDNs such as Cloudflare can block by user agent', 'See [Cloudflare blocking AI bots](/geo/cloudflare-blocking-ai-bots)'],
              ],
            },
          },
        ],
      },
      {
        id: 'plugins',
        heading: 'Editing robots.txt in Yoast, Rank Math and AIOSEO',
        blocks: [
          { p: 'Each big SEO plugin has its own robots.txt editor, and they are in different places. If one of them is active on your site, edit it there and nowhere else.' },
          { table: {
            caption: 'Where the common plugins keep the robots.txt editor',
            columns: ['Plugin', 'Where to look'],
            rows: [
              ['Yoast SEO', 'Yoast SEO, Tools, File editor'],
              ['Rank Math', 'Rank Math, General Settings, Edit robots.txt'],
              ['All in One SEO', 'All in One SEO, Tools, Robots.txt Editor'],
              ['No SEO plugin', 'Upload a robots.txt file to the site root with your host\'s file manager or SFTP'],
            ],
          } },
          { p: 'Plugin menus move between versions, so treat these paths as a starting point and search the plugin\'s own documentation if you do not see them. After saving, reload yourdomain.com/robots.txt. If the new rules are not there, a cache plugin or a physical file is getting in the way. Clear the cache first.' },
        ],
      },
      {
        id: 'edit',
        heading: 'How to Allow the AI Bots You Want',
        tone: 'alt',
        blocks: [
          { p: 'Remove any rule that blocks a bot you want, using the same tool that created it. For visibility in AI search, the bots that matter are the search ones. Add them explicitly if you like, so the intent is clear to whoever edits the file next.' },
          { code: 'User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /' },
          { p: 'Keep wp-admin and other private paths blocked for all bots. [The robots.txt guide](/geo/robots-txt-ai-bots) explains how Allow and Disallow groups combine and which bots do what, and [the GPTBot guide](/geo/gptbot) covers OpenAI\'s three crawlers.' },
        ],
      },
      {
        id: 'training',
        heading: 'Blocking Training Bots Without Hiding From AI Search',
        blocks: [
          { p: 'Many WordPress owners want to be found in ChatGPT or Claude answers but do not want their writing used for model training. Those are separate bots, so you can treat them separately.' },
          { code: 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /' },
          { p: 'Several plugins offer an "AI bots" toggle that adds rules like these. It is convenient, but open the resulting robots.txt and read it. A toggle that is too broad can shut out the search bots too. Remember that robots.txt is a request. Well-behaved crawlers follow it, and it does not remove anything already collected.' },
        ],
      },
      {
        id: 'security',
        heading: 'Security Plugins and Hosts That Say No',
        tone: 'alt',
        blocks: [
          { p: 'Security plugins such as Wordfence, and the firewalls many hosts run, look at traffic patterns. A crawler that requests many pages quickly can look like an attack and get a 403 or 429 response. Your robots.txt can say yes while the server says no.' },
          { list: [
            'Check the plugin\'s rate limiting and "block fake crawlers" style settings and loosen them for known search bots.',
            'Ask your host whether a server-level bot filter is on. Some managed hosts enable one by default.',
            'If the domain uses Cloudflare, look at its AI crawler controls too. Cloudflare began blocking known AI crawlers by default for new domains in July 2025, and owners can change that.',
          ] },
          { p: 'Do not allow-list by trusting the user agent alone, because anyone can fake it. Where the bot publishes IP ranges, allow those.' },
        ],
      },
      {
        id: 'verify',
        heading: 'Verify With a Real Request',
        blocks: [
          { p: 'After changing anything, run the [free GeoLint audit](/tools/geo-audit) on your homepage. A clean robots.txt is not proof that a security plugin or your host lets the bot through, and the audit shows the real status code for each AI search bot.' },
          { p: 'Run it again after plugin updates, since a new version can reset settings. If the audit finds a block you cannot locate, or you would rather not edit server rules yourself, see [what the done-for-you fix includes](/geo/fix-my-website).' },
        ],
      },
    ],
    faqHeading: 'WordPress and AI Crawlers: Common Questions',
    faqs: [
      {
        question: 'Does WordPress block AI bots by default?',
        answer:
          'WordPress itself does not name AI bots in its default robots.txt. A plugin, a security setting, the Discourage search engines option or your host can still block them, so read your live robots.txt and test the page.',
      },
      {
        question: 'Why is my WordPress robots.txt not changing when I edit it?',
        answer:
          'Another source is probably serving it. A physical file overrides the virtual one, and an SEO plugin can regenerate its own. A cache can also serve the old copy. Find which one produces the file at /robots.txt and edit that.',
      },
      {
        question: 'Where do I edit robots.txt in Yoast or Rank Math?',
        answer:
          'In Yoast it is under Tools, File editor. In Rank Math it is under General Settings, Edit robots.txt. Menus change between versions, so check the plugin documentation if you cannot find it.',
      },
      {
        question: 'Is there a plugin to block AI crawlers?',
        answer:
          'Yes, several plugins add AI bot rules with one setting. Be careful that they do not also block the search bots you want. Check the resulting robots.txt after enabling one.',
      },
      {
        question: 'Does the Discourage search engines setting block AI bots?',
        answer:
          'It asks search engines not to index the site, and it can change robots.txt. It is meant for sites under construction. On a live site it should be off if you want to be found by search or AI tools.',
      },
      {
        question: 'My robots.txt allows the bots but they still cannot read my site. Why?',
        answer:
          'A security plugin, host firewall or CDN is likely returning 403 or 429. Test the page as each bot and read the status code. That shows which layer is refusing the request.',
      },
      {
        question: 'Can I block AI training but stay visible in AI search?',
        answer:
          'Yes. Disallow training bots such as GPTBot and ClaudeBot, and allow search bots such as OAI-SearchBot and Claude-SearchBot. Robots.txt is a request that polite crawlers follow, not a technical barrier.',
      },
    ],
    related: ['wordpress-ai-visibility', 'shopify-allow-ai-bots', 'wix-ai-crawlers', 'robots-txt-ai-bots', 'cloudflare-blocking-ai-bots'],
    cta: CHECK_CTA,
  },
  {
    slug: 'wordpress-ai-visibility',
    path: '/geo/wordpress-ai-visibility',
    breadcrumbName: 'WordPress AI visibility',
    seo: {
      title: 'WordPress AI Visibility: Get Found by ChatGPT & Claude',
      description:
        'A step-by-step WordPress guide: audit your site, allow AI search bots in robots.txt, add llms.txt and Organization schema, or apply them in one click.',
      keywords:
        'WordPress AI visibility, WordPress GEO, WordPress llms.txt, allow GPTBot WordPress, WordPress ClaudeBot robots.txt, WordPress Organization schema, GEO plugin WordPress, WordPress ChatGPT visibility',
    },
    h1: 'WordPress AI Visibility: How to Get Found by ChatGPT, Claude and Perplexity',
    eyebrow: 'WordPress guide',
    lead: 'To be quoted by AI search tools, a WordPress site needs four things: robots.txt rules that let the search bots in, nothing else blocking them, an optional llms.txt file, and clear Organization schema. This guide covers each fix, by hand or with one click.',
    sections: [
      {
        id: 'what-it-means',
        heading: 'What AI Visibility Means for a WordPress Site',
        blocks: [
          { p: `AI visibility means that tools such as ChatGPT search, Claude and Perplexity can reach your WordPress pages, read their text and use them as a source when they write an answer. It is the WordPress side of generative engine optimization, covered in general terms in [What is GEO](/geo/what-is-geo).` },
          { p: `WordPress is a good starting point because it already serves normal HTML from the server, so most themes do not hide their text behind JavaScript. The usual problems are smaller and easier to fix: a robots.txt that names the wrong bots, a security or SEO plugin that blocks crawlers, no summary file for AI tools, and thin organization data.` },
          { callout: `No one can promise that an AI tool will mention your site. These steps remove technical reasons you could be left out. They do not control what an AI tool decides to say.` },
          { h3: 'Search bots, user bots and training bots' },
          { p: `AI companies run three kinds of crawler, and the difference decides what you allow. Search bots index pages so an AI product can show and cite them. User bots fetch one page when a person asks about it. Training bots collect content to train models. Many site owners allow the first two to be found and decide the third separately.` },
        ],
      },
      {
        id: 'audit-first',
        heading: 'Step 1: Audit Your Site Before You Change Anything',
        tone: 'alt',
        blocks: [
          { p: `Start by measuring, because a clean-looking robots.txt does not prove a bot can reach your pages. Run the [free GeoLint audit](/tools/geo-audit) on your homepage: it asks each AI search bot for the page, reads your robots.txt and shows the real status code each one receives.` },
          {
            steps: [
              { title: 'Run the audit', text: `Paste your homepage address into GeoLint. It takes about 20 seconds and needs no signup.` },
              { title: 'Note the four scores', text: `The report splits the score into bot access, JavaScript dependence, answer-first content, and facts and structure. See [how GeoLint works](/tools/geo-audit/how-it-works) for what each one measures.` },
              { title: 'Read the fix list', text: `Each fix is ranked by the points it can add. The robots.txt, llms.txt and schema fixes in this guide are the ones a WordPress plugin can apply.` },
              { title: 'Save the result', text: `Keep the report so you can run the audit again after the changes and compare.` },
            ],
          },
        ],
      },
      {
        id: 'robots',
        heading: 'Step 2: Allow the AI Search Bots in robots.txt',
        blocks: [
          { p: `WordPress usually generates robots.txt on the fly instead of keeping a file, and an SEO plugin may take over that output. Open yourdomain.com/robots.txt to see what crawlers read, then make sure the bots you want are allowed. The full background is in [WordPress and AI crawlers](/geo/wordpress-allow-ai-bots) and [robots.txt for AI bots](/geo/robots-txt-ai-bots).` },
          {
            table: {
              caption: 'Common AI crawlers and what each one does',
              columns: ['Bot', 'Company', 'What it does', 'Usual choice'],
              rows: [
                ['OAI-SearchBot', 'OpenAI', 'Lets ChatGPT search show and cite your pages', 'Allow'],
                ['ChatGPT-User', 'OpenAI', 'Fetches a page when a ChatGPT user asks about it', 'Allow'],
                ['GPTBot', 'OpenAI', 'Collects content to train OpenAI models', 'Your choice'],
                ['Claude-SearchBot', 'Anthropic', 'Improves search result quality in Claude', 'Allow'],
                ['Claude-User', 'Anthropic', 'Fetches a page when a Claude user asks about it', 'Allow'],
                ['ClaudeBot', 'Anthropic', 'Collects content to train Claude models', 'Your choice'],
                ['PerplexityBot', 'Perplexity', 'Indexes pages for Perplexity answers', 'Allow'],
                ['Perplexity-User', 'Perplexity', 'Fetches a page when a Perplexity user asks about it', 'Allow'],
                ['Google-Extended', 'Google', 'Control token for use of your content in Gemini AI', 'Your choice'],
                ['Applebot-Extended', 'Apple', 'Control token for use of your content in Apple AI', 'Your choice'],
                ['CCBot', 'Common Crawl', 'Open web archive that many AI models train on', 'Your choice'],
                ['Meta-ExternalAgent', 'Meta', 'Collects content for Meta AI models', 'Your choice'],
              ],
            },
          },
          { p: `Bot names and purposes come from each company's published documentation, which can change, so check the vendor's page if a rule matters to you. To allow the search and user bots by hand, add groups like these through your SEO plugin's robots.txt editor, or in a physical robots.txt file:` },
          { code: 'User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: Claude-User\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Perplexity-User\nAllow: /' },
          { p: `Keep /wp-admin/ and other private paths blocked for everyone. For GPTBot, ClaudeBot and the other training bots, choose Allow or Disallow on purpose: blocking them does not stop the search bots above from citing you. The [GPTBot guide](/geo/gptbot) and [ClaudeBot guide](/geo/claudebot) explain each company's crawlers.` },
        ],
      },
      {
        id: 'other-blockers',
        heading: 'Step 3: Check What Else Can Block AI Bots',
        tone: 'alt',
        blocks: [
          { p: `Robots.txt is only one of five places that can stop an AI bot on WordPress. If the audit still reports a block after your robots.txt is correct, look at these in order.` },
          {
            list: [
              `Settings, Reading, "Discourage search engines from indexing this site": it is meant for sites under construction and should be off on a live site.`,
              `An SEO or "block AI bots" plugin: some add a one-switch rule for AI crawlers that also catches the search bots you want.`,
              `A security plugin or web application firewall: rate limits and bot rules can return 403 or 429 to crawlers even when robots.txt allows them.`,
              `Your host: managed hosts sometimes filter by user agent before WordPress runs.`,
              `A CDN such as Cloudflare: see [Cloudflare blocking AI bots](/geo/cloudflare-blocking-ai-bots).`,
            ],
          },
          { p: `Only a real request shows which of these is acting, which is why the audit in Step 1 reports status codes rather than just reading robots.txt.` },
        ],
      },
      {
        id: 'llms-txt',
        heading: 'Step 4: Add an llms.txt File',
        blocks: [
          { p: `llms.txt is an optional plain-text file at yourdomain.com/llms.txt that gives AI tools a short summary of your site and a list of your most useful pages. It is a proposed convention, not a formal standard, and support varies, so treat it as a helpful extra after robots.txt. The format is explained in [What is llms.txt](/geo/llms-txt).` },
          { p: `On WordPress you can upload a text file named llms.txt to the site's root folder, or let a plugin serve one. If a real llms.txt file exists in the root, the web server returns it before WordPress runs, so a plugin will not override your file. A basic version looks like this:` },
          { code: '# Example Studio\n\n> A small design studio in Austin that builds websites for local shops.\n\n## Main pages\n- [Services](https://example.com/services/): What we build and what it costs\n- [Portfolio](https://example.com/portfolio/): Recent client work\n- [Contact](https://example.com/contact/): How to reach us\n\n## Latest posts\n- [How long a new website takes](https://example.com/blog/how-long-a-website-takes/)' },
          { p: `Keep it short and keep it current. A file that lists pages you have since deleted is worse than no file.` },
        ],
      },
      {
        id: 'schema',
        heading: 'Step 5: Add Organization and WebSite Schema',
        tone: 'alt',
        blocks: [
          { p: `Organization schema is JSON-LD in your page head that states who runs the site: its name, address, logo and official profiles. It gives AI tools and search engines a clean, machine-readable answer to "who is this?", and it helps them connect your site to your profiles on other sites. See the [GEO audit explainer](/tools/geo-audit/how-it-works) for how structured data is checked.` },
          { code: '{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Example Studio",\n  "url": "https://example.com/",\n  "logo": "https://example.com/logo.png",\n  "description": "A small design studio in Austin that builds websites for local shops.",\n  "sameAs": ["https://www.linkedin.com/company/example-studio"]\n}' },
          { p: `If an SEO plugin such as Yoast or Rank Math already outputs Organization data, do not add a second copy. Two conflicting blocks are worse than one complete block. Check your page source for "@type":"Organization" before adding anything.` },
        ],
      },
      {
        id: 'one-click',
        heading: 'The One-Click Way: The Nexora AI Search Audit Tools Plugin',
        blocks: [
          { p: `The free Nexora AI Search Audit Tools plugin applies Steps 2, 4 and 5 for you. It adds robots.txt rules for twelve AI crawlers, serves an automatic llms.txt, and outputs Organization and WebSite schema, with one button called Apply recommended fixes. You install it by uploading a zip file, and nothing changes until you activate it and click the button.` },
          {
            steps: [
              { title: 'Download the plugin', text: `Get the zip from the GeoLint WordPress guide. Do not unzip it.` },
              { title: 'Upload it in WordPress', text: `In your dashboard open Plugins, Add Plugin, Upload Plugin, choose the zip and click Install Now.` },
              { title: 'Activate', text: `WordPress opens the plugin settings page after activation.` },
              { title: 'Click Apply recommended fixes', text: `This allows the six search and user bots, turns on llms.txt and, if no SEO plugin already does it, adds Organization schema.` },
              { title: 'Audit again', text: `Run the [GeoLint audit](/tools/geo-audit) once more to confirm the fixes are live. If you use a cache plugin, allow a minute first.` },
            ],
          },
          { p: `The recommended preset leaves the training bots alone, so GPTBot, ClaudeBot and the rest stay as you set them, and any choice you made earlier is kept. You can change any bot between Allow and Block on the same page. The plugin sends nothing from your site to us, and removing it deletes its saved settings.` },
        ],
      },
      {
        id: 'limits',
        heading: 'What a Plugin Cannot Fix',
        tone: 'alt',
        blocks: [
          { p: `A plugin fixes access and markup, not your writing, so do not expect a perfect score from installing one. Two of the four GeoLint scores depend on things only you can change.` },
          {
            table: {
              caption: 'What the plugin changes and what it does not',
              columns: ['Area', 'Plugin can help', 'Needs you'],
              rows: [
                ['Bot access', 'Yes, through robots.txt rules', 'Firewall, host or CDN blocks outside WordPress'],
                ['JavaScript dependence', 'No', 'Choose a theme or builder that puts text in the HTML'],
                ['Answer-first content', 'No', 'Open each section with the direct answer'],
                ['Facts and structure', 'Partly, with Organization schema', 'Specific facts, sources and page-level schema'],
              ],
            },
          },
          { p: `For the writing side, start with [What is GEO](/geo/what-is-geo). If you would rather hand the technical part over, [the done-for-you fix](/geo/fix-my-website) covers it for a fixed fee per website.` },
        ],
      },
      {
        id: 'checklist',
        heading: 'Your WordPress AI Visibility Checklist',
        blocks: [
          { p: `Work through this list once and your site will have no technical reason to be skipped by AI search tools.` },
          {
            list: [
              `Run the audit and save the report.`,
              `Read yourdomain.com/robots.txt and allow the search and user bots.`,
              `Turn off "Discourage search engines" on a live site.`,
              `Check your security plugin, host and CDN for bot rules.`,
              `Add llms.txt, by file or by plugin, and keep it current.`,
              `Output one complete Organization schema block, not two.`,
              `Run the audit again and compare.`,
            ],
          },
        ],
      },
    ],
    faqHeading: 'WordPress AI Visibility: Common Questions',
    faqs: [
      {
        question: 'How do I make my WordPress site visible to ChatGPT?',
        answer:
          'Let OpenAI\'s search and user bots, OAI-SearchBot and ChatGPT-User, reach your pages. Allow them in robots.txt, make sure no plugin, firewall or CDN returns an error to them, and test with a real request using the free GeoLint audit.',
      },
      {
        question: 'Should I allow GPTBot and ClaudeBot on WordPress?',
        answer:
          'GPTBot and ClaudeBot are training crawlers, so allowing them is a choice about model training, not about being cited in search answers. Blocking them does not stop the separate search bots from reading your pages, so decide based on how you feel about your content being used for training.',
      },
      {
        question: 'Does WordPress have an llms.txt by default?',
        answer:
          'No. WordPress does not create an llms.txt file on its own. You can upload one to the root folder or use a plugin that serves one, and a real file in the root takes priority over a plugin.',
      },
      {
        question: 'Is llms.txt required for AI search?',
        answer:
          'No. It is an optional proposed convention and support varies between tools. Fix robots.txt and any blocks first, then add llms.txt as an extra.',
      },
      {
        question: 'Will an SEO plugin like Yoast or Rank Math already do this?',
        answer:
          'Partly. They can edit robots.txt and output Organization schema, but they do not always set rules for AI crawlers or serve llms.txt. Check your live robots.txt and page source, and avoid adding a second schema block.',
      },
      {
        question: 'Is the Nexora AI Search Audit Tools plugin free?',
        answer:
          'Yes. It is a free plugin you install by uploading a zip file from the GeoLint WordPress guide, with no account and no data sent from your site to us.',
      },
      {
        question: 'Will installing the plugin give me a perfect GeoLint score?',
        answer:
          'Not on its own. It improves bot access and adds schema and llms.txt, but JavaScript dependence and answer-first writing depend on your theme and content, so the score may rise without reaching the maximum.',
      },
    ],
    related: ['wordpress-ai-plugins-compared', 'wordpress-allow-ai-bots', 'llms-txt', 'robots-txt-ai-bots', 'check-ai-crawler-access'],
    cta: {
      heading: 'Check your WordPress site, then fix it in one click',
      text: 'Run the free GeoLint audit to see what blocks AI search bots on your site, then follow the WordPress guide to install the plugin and apply the fixes.',
      links: [
        { to: GEOLINT_PATH, label: 'Run the free GEO audit', primary: true },
        { to: '/tools/geo-audit/wordpress', label: 'Install the WordPress plugin' },
      ],
    },
  },
  {
    slug: 'wordpress-ai-plugins-compared',
    path: '/geo/wordpress-ai-plugins-compared',
    breadcrumbName: 'WordPress AI plugins compared',
    poster: {
      src: '/geo/wordpress-ai-plugins-compared.jpg',
      width: 1920,
      height: 1080,
      alt: 'Nexora poster: WordPress AI plugins compared, showing the Nexora AI Search Audit Tools one-click fix screen',
    },
    seo: {
      title: 'WordPress AI Visibility Plugins Compared (2026)',
      description:
        'Yoast, All in One SEO, Better Robots.txt, llemmy, Teun.ai GEO and GeoLint compared on robots.txt AI rules, llms.txt, schema, price and accounts.',
      keywords:
        'WordPress GEO plugin comparison, free GEO plugin WordPress, llms.txt plugin WordPress, WordPress AI crawler plugin, Yoast llms.txt, AIOSEO llms.txt, Better Robots.txt AI bots, llemmy plugin, WordPress AI visibility plugin',
    },
    h1: 'WordPress AI Visibility Plugins Compared: What Each One Really Changes',
    eyebrow: 'Plugin comparison',
    lead: 'We compared six WordPress plugins that touch AI search, including our own Nexora AI Search Audit Tools. Most do one or two jobs well. Few cover the three that matter first: robots.txt rules for AI bots, llms.txt and Organization schema. Here is who does what, and who should pick what.',
    sections: [
      {
        id: 'short-version',
        heading: 'The Short Version',
        blocks: [
          { p: `If you already run Yoast or All in One SEO, you may have half of this done and not know it. Both can publish an llms.txt file for free, and both already output schema. What they don't clearly do is give you per-bot control in robots.txt, which is the part that decides whether ChatGPT and Claude can read you at all.` },
          { p: `If robots.txt is your main worry, Better Robots.txt is the most mature of the AI-focused plugins here, with the biggest install base among them. The catch is that per-bot rules and llms.txt sit behind its paid tiers. If you want numbers on who is crawling you, llemmy and Teun.ai GEO lean that way. And if you want all three basics from a free plugin with no account, that is the gap we built Nexora AI Search Audit Tools for. We'll be straight about where it falls short further down.` },
          { callout: `We make GeoLint, so weigh our opinion accordingly. Every fact about the other plugins comes from their own WordPress.org pages and public announcements, read on 22 October 2026. Plugins change fast, so check the current listing before you decide.` },
        ],
      },
      {
        id: 'table',
        heading: 'Side by Side',
        tone: 'alt',
        blocks: [
          {
            table: {
              caption: 'Six WordPress plugins compared on the AI visibility basics, as of 22 October 2026',
              columns: ['Plugin', 'AI bot rules in robots.txt', 'llms.txt', 'Organization schema', 'Account needed', 'Free or paid'],
              rows: [
                ['Yoast SEO', 'Not stated in what we read', 'Yes, one click, free', 'Yes', 'No', 'Free, with a premium version'],
                ['All in One SEO', 'Not stated, general robots.txt editor', 'Listed as free; llms-full.txt reported as Pro', 'Yes', 'No', 'Free, with Pro'],
                ['Better Robots.txt', 'Yes: training and search bots in separate groups; per-bot rules are Pro', 'Pro', 'Not mentioned', 'Not stated; licensing runs through Freemius', 'Free, Pro and Premium'],
                ['llemmy', 'Yes: Allow rules for major AI crawlers', 'Yes', 'Yes, switched off if another SEO plugin does it', 'Only for its online dashboard', 'Free core, paid drafting tools'],
                ['Teun.ai GEO', 'Tracks AI bots; no allow or block control stated', 'Not stated', 'Checks for it; creation not stated', 'No for the free version', 'Free, with Premium'],
                ['Nexora AI Search Audit Tools', 'Yes: 12 crawlers, Allow, Block or Leave as is', 'Yes, automatic or your own text', 'Yes, skipped if an SEO plugin does it', 'No', 'Free'],
              ],
            },
          },
          { p: `"Not stated" means we could not find it on the plugin's own page, not that the feature is missing. If one of those cells matters to you, test the plugin on a staging site first.` },
        ],
      },
      {
        id: 'how-we-compared',
        heading: 'How We Judged Them',
        blocks: [
          { p: `We kept the test narrow on purpose. For a site that wants to be found by AI search tools, three technical things come before anything about writing style, and they are all small files or tags. Can AI search bots read your pages, does a summary file exist for them, and does your site say clearly who runs it?` },
          { p: `That is why this table has no row for AI content writing, rank tracking or prompt ideas. Several of these plugins offer those, and some may be useful. They just aren't the first thing standing between your site and an AI answer. The general background is in [What is GEO](/geo/what-is-geo) if you want the bigger picture.` },
          { p: `We also looked at two things people rarely check: whether you need an account, and what the plugin sends off your site. A plugin you can install and forget is a different product from one that needs a login and a dashboard.` },
        ],
      },
      {
        id: 'yoast-aioseo',
        heading: 'Yoast and All in One SEO: Probably Already Installed',
        tone: 'alt',
        blocks: [
          { p: `Most WordPress sites already run one of these two, which is the best reason to start here. Yoast announced a free llms.txt generator in June 2025, and you switch it on with one click in the settings. It builds a Markdown summary of your key content and keeps it updated as you publish.` },
          { p: `All in One SEO lists an llms.txt generator among its free features too, though the details are muddier. Its plugin page says one thing about what is free, and a WordPress guide we read says the larger llms-full.txt and automatic Markdown versions of posts need the Pro plan. Look at the plan you're on before you count on either.` },
          { p: `Where both stay quiet is AI crawler rules. They have a robots.txt editor, so you can write the rules yourself, but nothing on the pages we read describes a switch for GPTBot or ClaudeBot. That is a fine trade if you're comfortable editing robots.txt and know the bot names. It isn't if you're not. The [robots.txt guide](/geo/robots-txt-ai-bots) covers what to write.` },
          { p: `Their real strength is schema, and it is a big one. If either plugin already outputs your Organization data, you should not add a second source of it. That single point decides how you use the other plugins in this list.` },
        ],
      },
      {
        id: 'better-robots',
        heading: 'Better Robots.txt: Strong on Control, Paid for the Detail',
        blocks: [
          { p: `Better Robots.txt, from Pagup, is the one built around exactly this problem, and it shows. It sorts AI bots into training crawlers such as GPTBot and ClaudeBot, search crawlers such as OAI-SearchBot and PerplexityBot, and user-action fetchers such as ChatGPT-User. That split is the right way to think about it, and it lets you block training while still allowing search.` },
          { p: `It has more than 5,000 installs and a rating of about 4.5 stars, so it is by far the best tested of the AI-focused plugins here, and it was updated days before we looked. The free version gives you a guided setup and one global allow-or-block choice for AI search crawlers. Per-bot rules, custom user agents and llms.txt are listed under the paid Pro tier.` },
          { p: `It bundles the Freemius SDK for licensing and loads some outside resources on its page, which some site owners will care about. It doesn't mention schema at all, so you'd pair it with an SEO plugin. If robots.txt control is your whole job and a paid plan is fine, it is the safe choice.` },
        ],
      },
      {
        id: 'llemmy-teun',
        heading: 'llemmy and Teun.ai GEO: More About Measuring',
        tone: 'alt',
        blocks: [
          { p: `llemmy and Teun.ai GEO both put analytics at the front. llemmy gives you a 0 to 100 readiness score, one-click fixes for the gaps, Allow rules for major AI crawlers, an llms.txt file, Organization and Article schema, and optional tracking of AI bot visits. A fresh install makes no outside requests until you connect an account or switch a tracker on. The deeper dashboard needs a llemmy account, and drafting tools are paid.` },
          { p: `llemmy is also very new, with fewer than ten installs and two reviews when we looked, so treat it as promising rather than proven. That is not a criticism of the code. It is just a small sample.` },
          { p: `Teun.ai GEO scores each page for AI readiness inside the editor and tracks both AI bot crawls and visitors arriving from ChatGPT, Perplexity, Claude and others. Its page doesn't say it writes robots.txt rules, llms.txt or schema, so think of it as a gauge, not a fixer. The free plugin runs locally. Premium scans whether your pages show up in ChatGPT and Perplexity answers and may send page details to its servers. It had 100 or more installs, no reviews yet, and its last update was about eight months back.` },
        ],
      },
      {
        id: 'geolint',
        heading: 'Nexora AI Search Audit Tools: The Free Three-in-One, With Limits',
        blocks: [
          { p: `Nexora AI Search Audit Tools is our plugin, and it does the three basics and not much else. It writes robots.txt rules for twelve AI crawlers, with Allow, Block or Leave as is for each one. It serves an llms.txt built from your site name, main pages and latest posts, or your own text if you prefer. And it adds Organization and WebSite schema, unless an SEO plugin is already doing that.` },
          { p: `The part we cared about most is the first minute. After you activate it, the settings page opens and one button, Apply recommended fixes, turns on the sensible defaults. That allows the six search and user bots, leaves training bots exactly as you had them, and keeps any choice you made earlier. No account, nothing sent from your site to us, and uninstalling deletes its settings. The [WordPress install guide](/geo/wordpress-ai-visibility) walks through it with screenshots.` },
          { h3: 'Where it falls short' },
          { p: `It isn't in the WordPress.org directory yet. You install it by uploading a zip, which is one extra step compared with searching for it. It doesn't track which bots visit you, so it can't show you numbers the way llemmy or Teun.ai GEO can. It has no content tools. And it can't fix what lives outside WordPress: a firewall, a host or a CDN that blocks bots will still block them. For that you need the audit, which shows the real response each bot gets.` },
        ],
      },
      {
        id: 'overlap',
        heading: 'The Problem Nobody Mentions: Overlap',
        tone: 'alt',
        blocks: [
          { p: `The risk with this whole category is not picking the wrong plugin, it's running two that do the same job. Install Yoast with llms.txt on, then a second plugin that also serves llms.txt, and one of them wins quietly while you wonder why your edits don't show up. Do the same with schema and you can end up with two Organization blocks that disagree about your logo.` },
          {
            list: [
              `One owner for each job. Pick which plugin handles robots.txt rules, which serves llms.txt and which outputs schema, and switch the others off.`,
              `A real llms.txt file in your site's root folder usually beats any plugin, because the server returns the file before WordPress loads.`,
              `View the page source and search for "Organization" to count how many schema blocks you really have.`,
              `After every change, load yourdomain.com/robots.txt and yourdomain.com/llms.txt in a browser and read what comes back.`,
            ],
          },
          { p: `A sensible combination for many sites is simple: keep your SEO plugin for schema and sitemaps, and add one small tool for the AI bot rules. If your SEO plugin already makes llms.txt, leave that switch on and don't duplicate it.` },
        ],
      },
      {
        id: 'which',
        heading: 'So Which One Should You Pick?',
        blocks: [
          { p: `It depends on what you're missing, so find your situation below. None of these promises that an AI tool will mention you. They only clear the technical obstacles.` },
          {
            list: [
              `You run Yoast or All in One SEO and want the least change: turn on their llms.txt feature, then check your robots.txt by hand.`,
              `You need fine control over which bots get in and don't mind paying: Better Robots.txt.`,
              `You want to see AI traffic and bot visits in numbers: llemmy or Teun.ai GEO, knowing both are young.`,
              `You want robots.txt, llms.txt and schema in one free plugin with no account: Nexora AI Search Audit Tools, accepting the zip upload.`,
              `You don't know what's wrong yet: skip the plugins and run the free audit first.`,
            ],
          },
          { p: `That last one is honestly the best first move. A plugin fixes a problem you've named. The [GeoLint audit](/tools/geo-audit) names it, and takes about 20 seconds.` },
        ],
      },
      {
        id: 'verify',
        heading: 'Check That It Worked',
        tone: 'alt',
        blocks: [
          { p: `Whatever you install, test the result with a real request, because a tidy settings page doesn't prove a bot gets through. Run the audit before the change and again after, and compare. The [how it works page](/tools/geo-audit/how-it-works) explains the four scores.` },
          { p: `Expect the score to move, not to hit the top. Plugins touch bot access and some markup. Whether your text sits in the HTML and whether each section answers the question quickly are down to your theme and your writing, and no plugin on this list changes that. The [GEO basics guide](/geo/what-is-geo) is the place to start on the writing side.` },
        ],
      },
    ],
    faqHeading: 'WordPress AI Plugins: Common Questions',
    faqs: [
      {
        question: 'What is the best WordPress plugin for AI search visibility?',
        answer:
          'There is no single best one. Yoast and All in One SEO suit sites that want an llms.txt file and schema from a plugin they already run. Better Robots.txt suits fine control over AI bots. Nexora AI Search Audit Tools suits a free, no-account setup of robots.txt rules, llms.txt and schema in one place.',
      },
      {
        question: 'Do I need a plugin to allow AI crawlers on WordPress?',
        answer:
          'No. You can edit robots.txt through your SEO plugin or a physical file, and upload an llms.txt by hand. A plugin just saves the editing and the guesswork about bot names.',
      },
      {
        question: 'Can I use more than one of these plugins together?',
        answer:
          'Yes, if each one has a separate job. Problems start when two plugins both serve llms.txt or both output Organization schema. Give each job to one plugin and turn the duplicates off.',
      },
      {
        question: 'Is the Nexora AI Search Audit Tools plugin in the WordPress plugin directory?',
        answer:
          'Not yet. You install it by uploading the zip file from the GeoLint WordPress guide. It is free, needs no account and sends nothing from your site to us.',
      },
      {
        question: 'Will any of these plugins get me cited by ChatGPT or Claude?',
        answer:
          'No plugin can promise that. They remove technical reasons you could be left out, such as blocked bots or missing structure. Whether an AI tool uses your page is its own decision.',
      },
    ],
    related: ['wordpress-ai-visibility', 'wordpress-allow-ai-bots', 'llms-txt', 'robots-txt-ai-bots'],
    cta: {
      heading: 'Find out what is actually wrong first',
      text: 'The free GeoLint audit shows what blocks AI search bots on your site and which fixes are worth making. Then install a plugin, ours or someone else\'s, and run it again to see the difference.',
      links: [
        { to: GEOLINT_PATH, label: 'Run the free GEO audit', primary: true },
        { to: '/geo/wordpress-ai-visibility', label: 'WordPress step-by-step guide' },
      ],
    },
  },
  {
    slug: 'wix-ai-crawlers',
    path: '/geo/wix-ai-crawlers',
    breadcrumbName: 'Wix and AI crawlers',
    seo: {
      title: 'Wix AI Crawlers: Edit robots.txt for AI Search | Nexora',
      description:
        'Wix has a robots.txt editor in its SEO tools. See how to read your rules, allow AI search bots and test what ChatGPT, Claude and Perplexity can reach.',
      keywords:
        'Wix AI crawlers, Wix robots.txt AI bots, Wix allow GPTBot, Wix block AI crawlers, Wix ChatGPT visibility, Wix GEO',
    },
    h1: 'Wix and AI Crawlers: Edit robots.txt and Test Access',
    eyebrow: 'Platform guide',
    lead: 'Wix lets you edit robots.txt in its Robots.txt Editor, found under SEO and GEO in Tools and settings. Open yourdomain.com/robots.txt first to read the live rules, then add or remove User-agent lines for the AI bots you care about.',
    sections: [
      {
        id: 'read',
        heading: 'Read What Your Wix Site Serves Now',
        blocks: [
          { p: 'Open yourdomain.com/robots.txt in a browser. Wix generates a default file, and anything you add in the editor appears there. If you see Disallow lines for GPTBot, ChatGPT-User or other AI bots that you did not add, a teammate or an earlier setup probably did.' },
        ],
      },
      {
        id: 'edit',
        heading: 'How to Edit robots.txt on Wix',
        tone: 'alt',
        blocks: [
          { p: 'Wix\'s help article on AI crawlers describes the Robots.txt Editor under SEO and GEO in Tools and settings, where you add a User-agent line and a Disallow rule for each bot. To allow a bot, remove the Disallow rule you added for it or add an explicit Allow group.' },
          { code: 'User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /' },
          { callout: 'Menu names on Wix change from time to time. If you cannot find the editor, search Wix\'s help centre for robots.txt rather than guessing. Publish the site after you save so the live file updates.' },
        ],
      },
      {
        id: 'limits',
        heading: 'What the Wix Help Article Warns About',
        blocks: [
          { p: 'Wix says some crawlers may ignore robots.txt, so blocking is not airtight. It also notes that blocking AI crawlers can limit NLWeb functionality on your site, and offers a page-level robots meta setting of nosnippet to keep a page out of AI overviews.' },
          { p: 'That help article focuses on blocking. If you want to be found, the useful step is the reverse: make sure no rule blocks the search bots, then confirm the pages actually load for them. [The robots.txt guide](/geo/robots-txt-ai-bots) explains which bots are for search and which are for training.' },
        ],
      },
      {
        id: 'test',
        heading: 'Test What the Bots Receive',
        tone: 'alt',
        blocks: [
          { p: 'Run the [free GeoLint audit](/tools/geo-audit) on your homepage. It requests the page as each AI search bot and shows whether robots.txt allows it and what the server returned. On a hosted builder you cannot change the server layer yourself, so the audit tells you whether the problem is in your robots.txt, which you can fix, or elsewhere.' },
          { p: 'If the audit shows a block that your robots.txt does not explain, contact Wix support with the result, or see [the done-for-you fix](/geo/fix-my-website).' },
        ],
      },
    ],
    faqHeading: 'Wix and AI Crawlers: Common Questions',
    faqs: [
      {
        question: 'Can I edit robots.txt on Wix?',
        answer:
          'Yes. Wix documents a Robots.txt Editor under SEO and GEO in Tools and settings. Menu names can change, so check Wix\'s current help article.',
      },
      {
        question: 'Does Wix block ChatGPT by default?',
        answer:
          'Wix\'s help article describes how to block AI crawlers, which implies they are not blocked unless you add rules. Read your live robots.txt to be sure, since a previous editor may have added lines.',
      },
      {
        question: 'Will blocking AI crawlers hurt my Google ranking?',
        answer:
          'Blocking GPTBot or other AI user agents does not change how Googlebot indexes your site. Google-Extended is a separate token for Gemini training. Check Google\'s current documentation before changing it.',
      },
      {
        question: 'Can I add an llms.txt file to Wix?',
        answer:
          'That depends on what Wix lets you publish at the site root. See the [llms.txt guide](/geo/llms-txt) for what the file is and why it is optional.',
      },
    ],
    related: ['wordpress-allow-ai-bots', 'webflow-ai-crawlers', 'robots-txt-ai-bots', 'llms-txt'],
    cta: CHECK_CTA,
  },
  {
    slug: 'webflow-ai-crawlers',
    path: '/geo/webflow-ai-crawlers',
    breadcrumbName: 'Webflow and AI crawlers',
    seo: {
      title: 'Webflow robots.txt for AI Crawlers: Allow or Block | Nexora',
      description:
        'Edit robots.txt in Webflow (Site settings, SEO, Indexing), allow ChatGPT, Claude and Perplexity search bots, and check if Cloudflare still blocks them.',
      keywords:
        'Webflow robots.txt, Webflow AI crawlers, Webflow allow GPTBot, Webflow block AI bots, Webflow ChatGPT visibility, Webflow Content-Signal, Webflow GEO',
    },
    h1: 'Webflow robots.txt for AI Crawlers: How to Allow, Block and Test',
    eyebrow: 'Platform guide',
    lead: 'In Webflow you edit robots.txt under Site settings, SEO, Indexing, then publish. For AI search, make sure nothing there blocks the search bots, and test the live domain afterwards, because a CDN such as Cloudflare in front of the site can refuse them even when robots.txt says yes.',
    sections: [
      {
        id: 'settings',
        heading: 'Where robots.txt Lives in Webflow',
        blocks: [
          { p: 'Webflow keeps it in one place: Site settings, then the SEO tab, then the Indexing section. You add rules there, save, and publish the site. That last part trips people up. A rule you saved but did not publish is not on the live site yet, so the file at yourdomain.com/robots.txt still shows the old version.' },
          { p: 'Each rule is a User-agent line plus an Allow or Disallow path. A star in the user-agent line means every bot, and a named bot such as Googlebot means only that one. Webflow also adds a link to your sitemap at the bottom of the file by default, and there is a toggle in the same section if you want that line gone.' },
          { steps: [
            { title: 'Open Indexing', text: 'In the project, go to Site settings, then SEO, then the Indexing section.' },
            { title: 'Add your rules', text: 'Write the rules you want, one user agent at a time.' },
            { title: 'Save', text: 'Save the changes in Site settings.' },
            { title: 'Publish', text: 'Publish to your custom domain, not only the webflow.io address.' },
            { title: 'Read the live file', text: 'Open yourdomain.com/robots.txt in a browser and check what is actually live.' },
          ] },
          { p: 'Menu names move around when Webflow updates its designer, so if you cannot find the section, search Webflow\'s help center for "Set robots.txt rules". The steps above match their documentation at the time of writing.' },
        ],
      },
      {
        id: 'default',
        heading: 'What Happens If You Never Touch It',
        tone: 'alt',
        blocks: [
          { p: 'If robots.txt has no rule against a bot, that bot is allowed. So a Webflow site with an empty Indexing section is not blocking ChatGPT, Claude or Perplexity on its own. Most owners who think Webflow is hiding them from AI have a different problem: a leftover Disallow from launch day, a noindex setting on the pages they care about, or a CDN in front of the site.' },
          { p: 'That is why the useful first step is reading the live file, not rewriting it. Take two minutes, open the URL, and look for a line that says Disallow: / under User-agent: *. If it is there, every bot is shut out, including Googlebot.' },
        ],
      },
      {
        id: 'allow',
        heading: 'Allow the AI Search Bots on Webflow',
        blocks: [
          { p: 'Allowing the search bots is the part that decides whether you can show up in AI answers. Each assistant has a separate bot for search, and they are not the same as the bots that collect training data.' },
          { table: {
            caption: 'AI search bots worth allowing',
            columns: ['User agent', 'Company', 'What it does'],
            rows: [
              ['OAI-SearchBot', 'OpenAI', 'Finds pages for ChatGPT search results'],
              ['Claude-SearchBot', 'Anthropic', 'Finds pages for Claude search results'],
              ['PerplexityBot', 'Perplexity', 'Finds pages for Perplexity answers'],
            ],
          } },
          { p: 'To make that explicit, add one rule per bot in the Indexing section:' },
          { code: 'User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /' },
          { p: 'None of these rules is strictly needed if nothing blocks them. Writing them just removes any doubt for the next person who opens the settings. Bot names and purposes come from each company\'s own crawler documentation and do change, so see our guides to [GPTBot and the other OpenAI bots](/geo/gptbot), [ClaudeBot and its sister bots](/geo/claudebot) and [PerplexityBot](/geo/perplexitybot).' },
        ],
      },
      {
        id: 'training',
        heading: 'If You Want to Opt Out of AI Training',
        tone: 'alt',
        blocks: [
          { p: 'Plenty of site owners are happy to be found in AI search but would rather not have their content used to train models. These are two separate decisions. Blocking a training bot does not stop the search bot, as long as you write the rules separately.' },
          { code: 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /' },
          { p: 'Two honest limits. A robots.txt rule only works on crawlers that choose to follow it, and it does not pull back content a bot has already collected. Treat it as a request, not a lock.' },
          { p: 'Webflow\'s Indexing section also has a Content-Signal option. It adds an HTTP header that states what your content may be used for, with three values: ai-train, search and ai-input, for example ai-train=no, search=yes. It is a proposed extension to the robots.txt standard rather than an accepted one, so support from crawlers is uneven. Reasonable to set, but do not count on it alone.' },
        ],
      },
      {
        id: 'mistakes',
        heading: 'Five Webflow Mistakes That Hide a Site from AI',
        blocks: [
          { p: 'These are the ones we see most often when a Webflow site is invisible to AI tools.' },
          { list: [
            'A Disallow: / rule left over from the build stage and never removed.',
            'Saving robots.txt rules but forgetting to publish.',
            'Page-level settings that exclude the page from search results, which can keep it out of AI tools that lean on search indexes.',
            'Testing the webflow.io staging address instead of the custom domain people actually visit.',
            'Content that only appears after custom JavaScript or an embedded app loads. Most of a published Webflow page is plain HTML, but anything injected later may not be seen by a bot that does not run scripts.',
          ] },
          { p: 'Pages behind a password or a login are also invisible to bots, which is usually what you want, but worth remembering if a page you expected to be found sits behind one.' },
        ],
      },
      {
        id: 'cdn',
        heading: 'When Cloudflare Sits in Front of Webflow',
        tone: 'alt',
        blocks: [
          { p: 'If your domain\'s DNS goes through Cloudflare with the proxy switched on, Cloudflare sees every request before Webflow does. Its AI crawler settings then apply to your site. Cloudflare announced in July 2025 that it would block known AI crawlers by default for newly added domains, and site owners can change that.' },
          { p: 'In the Cloudflare dashboard, AI Crawl Control lets you set Allow or Block for each crawler separately. Choosing Block creates a firewall rule on your zone, and that rule wins over a friendly robots.txt. So a Webflow owner can have a perfect robots.txt and still be turned away at the door.' },
          { p: 'We cover the three places to look in [Cloudflare blocking AI bots](/geo/cloudflare-blocking-ai-bots).' },
        ],
      },
      {
        id: 'test',
        heading: 'Test the Published Site',
        blocks: [
          { p: 'Settings screens tell you what you intended. A test tells you what happens. Run the [free GeoLint audit](/tools/geo-audit) on your published domain. It asks for your page as each AI search bot, then shows whether robots.txt allowed it and which status code the server actually returned. A 403 with a clean robots.txt almost always means a CDN or firewall rule.' },
          { p: 'Do it again after every change and after you republish, because it is easy to fix one layer and break another.' },
        ],
      },
      {
        id: 'expect',
        heading: 'What to Expect Afterwards',
        tone: 'alt',
        blocks: [
          { p: 'Allowing the bots makes your Webflow site readable to AI search. It does not guarantee a mention. Whether an assistant names you depends on your content, how clear your pages are, and what else exists about your business online. What you control is the access layer, and for many sites that is where the problem was.' },
        ],
      },
    ],
    faqHeading: 'Webflow and AI Crawlers: Common Questions',
    faqs: [
      {
        question: 'Where do I edit robots.txt in Webflow?',
        answer:
          'In Site settings, under the SEO tab, in the Indexing section. Add your rules, save, then publish the site. The rules do not change on the live site until you publish.',
      },
      {
        question: 'Does Webflow block ChatGPT or other AI bots by default?',
        answer:
          'Not through robots.txt. A bot with no rule against it is allowed. If AI tools still cannot read your site, look at a leftover Disallow rule, page-level noindex settings, or a CDN or firewall in front of the site.',
      },
      {
        question: 'How do I allow GPTBot and the other AI bots on Webflow?',
        answer:
          'Add an Allow rule for each bot in the Indexing section, then publish. For search visibility, the bots that matter most are OAI-SearchBot, Claude-SearchBot and PerplexityBot. GPTBot is a separate bot for training data, so allowing it is a policy choice.',
      },
      {
        question: 'Can I block AI training but still appear in AI search?',
        answer:
          'Yes. Write separate rules: disallow the training bots such as GPTBot and ClaudeBot, and allow the search bots such as OAI-SearchBot and Claude-SearchBot. Remember that robots.txt is a request that well-behaved bots follow, not a technical barrier.',
      },
      {
        question: 'What is the Content-Signal setting in Webflow?',
        answer:
          'It is an option in the Indexing settings that adds an HTTP header saying whether your content may be used for AI training, search or AI-generated answers. It is a proposed extension, not an accepted standard, so not every crawler honours it.',
      },
      {
        question: 'Why can AI bots not read my Webflow site when robots.txt allows them?',
        answer:
          'Something in front of Webflow is probably refusing the request, usually a CDN, firewall or rate limit. An audit shows the status code the bot received, which tells you which layer is responsible.',
      },
      {
        question: 'Does a noindex page affect AI search?',
        answer:
          'It can. Some AI search tools use search indexes, so a page you hide from search may be hidden from them too. Remove the exclusion from pages you want found.',
      },
      {
        question: 'Should I test the webflow.io address or my own domain?',
        answer:
          'Your own domain. That is the address bots and customers use, and it is the one that may sit behind Cloudflare or another CDN.',
      },
    ],
    related: ['wix-ai-crawlers', 'shopify-allow-ai-bots', 'robots-txt-ai-bots', 'cloudflare-blocking-ai-bots'],
    cta: CHECK_CTA,
  },
  {
    slug: 'why-chatgpt-cant-see-my-website',
    path: '/geo/why-chatgpt-cant-see-my-website',
    breadcrumbName: 'Why ChatGPT cannot see my website',
    seo: {
      title: 'Why ChatGPT Can\'t See Your Website: 6 Causes | Nexora',
      description:
        'AI tools can miss a website for six technical reasons: robots.txt, firewall blocks, JavaScript, noindex, login walls and slow servers. How to check each.',
      keywords:
        'why ChatGPT cant see my website, ChatGPT cannot access my website, website not showing in ChatGPT, AI cannot read my website, why is my site not in AI search',
    },
    h1: 'Why ChatGPT Can\'t See Your Website: 6 Technical Causes',
    eyebrow: 'Troubleshooting guide',
    lead: 'When ChatGPT or another AI tool cannot see your website, the cause is usually technical: robots.txt blocks the bot, a firewall refuses it, the content only appears after JavaScript runs, or the page is marked noindex. Work through six causes in order and test each one.',
    sections: [
      {
        id: 'first',
        heading: 'Separate Two Problems First',
        blocks: [
          { p: 'There are two different problems: the AI cannot reach your page, or it can reach it but does not choose to mention you. This guide covers the first, which is technical and fixable. Whether an AI recommends you also depends on your content, reputation and what it knows, and no tool can promise a mention.' },
        ],
      },
      {
        id: 'causes',
        heading: 'The Six Technical Causes',
        tone: 'alt',
        blocks: [
          {
            table: {
              caption: 'Why an AI bot may not reach or read your page',
              columns: ['Cause', 'What happens', 'How to check'],
              rows: [
                ['robots.txt blocks the bot', 'The bot reads your rules and stays away', 'Open /robots.txt and look for Disallow rules for AI bots. See [robots.txt for AI bots](/geo/robots-txt-ai-bots)'],
                ['Firewall, CDN or host block', 'The server answers 403 or 429, or a challenge page, even though robots.txt allows the bot', 'Test as the bot. See [Cloudflare blocking AI bots](/geo/cloudflare-blocking-ai-bots)'],
                ['Content needs JavaScript', 'Some crawlers read the raw HTML only, so a page that fills in after scripts run looks empty', 'View the page source and search for your text'],
                ['noindex or canonical issues', 'The page tells search systems to leave it out', 'Check the robots meta tag and X-Robots-Tag header'],
                ['Login, cookie or popup wall', 'The bot lands on a gate instead of your content', 'Open the page in a private window'],
                ['Slow or failing server', 'Timeouts and errors mean the bot gives up', 'Check the status code and response time'],
              ],
            },
          },
        ],
      },
      {
        id: 'js',
        heading: 'The JavaScript Problem in Plain Words',
        blocks: [
          { p: 'If you right-click your page, choose View Source and cannot find your main text in it, a crawler that does not run JavaScript will not find it either. Some bots may render pages and some do not, and vendors do not always say which, so the safe approach is to make the important content available in the HTML the server sends. Server-side rendering or pre-rendering does this.' },
        ],
      },
      {
        id: 'test',
        heading: 'Test All Six in One Run',
        tone: 'alt',
        blocks: [
          { p: 'The [free GeoLint audit](/tools/geo-audit) tests the first five at once: it reads robots.txt for each AI search bot, requests your page as each bot, loads it with and without JavaScript and checks noindex signals. [How GeoLint works](/tools/geo-audit/how-it-works) explains the checks.' },
          { p: 'After fixing, give crawlers time. Even when the page is reachable, it can take a while before a change shows up in AI answers, and nobody can guarantee a mention. If you want help, see [the done-for-you fix](/geo/fix-my-website). To learn the wider topic, read [what GEO is](/geo/what-is-geo).' },
        ],
      },
    ],
    faqHeading: 'ChatGPT and Your Website: Common Questions',
    faqs: [
      {
        question: 'Why does ChatGPT say it cannot access my website?',
        answer:
          'The page may be blocked by robots.txt, refused by a firewall or CDN, or hidden behind a login. It may also load slowly or fail. Test the page as an AI bot to see which one applies.',
      },
      {
        question: 'Is my site invisible to ChatGPT if it is built with React or another JavaScript framework?',
        answer:
          'Not necessarily, but content that only appears after scripts run is a risk for crawlers that read raw HTML. Server-side rendering or pre-rendering removes the risk.',
      },
      {
        question: 'Do I need an llms.txt file to be seen?',
        answer:
          'No. It is an optional convention, not a switch that makes AI tools see you. Access, readable HTML and useful content matter more. See the [llms.txt guide](/geo/llms-txt).',
      },
      {
        question: 'How long until ChatGPT shows my site after I fix this?',
        answer:
          'Nobody can promise a time. Fixing access removes a blocker. Whether and when an AI tool mentions you depends on its own indexing and on your content.',
      },
    ],
    related: ['check-ai-crawler-access', 'what-is-geo', 'robots-txt-ai-bots', 'fix-my-website'],
    cta: CHECK_CTA,
  },
  {
    slug: 'check-ai-crawler-access',
    path: '/geo/check-ai-crawler-access',
    breadcrumbName: 'Check AI crawler access',
    seo: {
      title: 'Is Your Website Blocking AI Crawlers? How to Check | Nexora',
      description:
        'Check whether GPTBot, ClaudeBot and PerplexityBot can reach your website: read robots.txt, test the server response and run a free automated AI crawler audit.',
      keywords:
        'check if website blocks AI crawlers, AI crawler checker, is my website blocking GPTBot, test AI bot access, robots.txt AI checker, AI crawlability test',
    },
    h1: 'Is Your Website Blocking AI Crawlers? How to Check',
    eyebrow: 'How-to guide',
    lead: 'To check whether your website blocks AI crawlers, read your robots.txt for AI bot names, then request a page as each bot and look at the status code. A 200 response and no Disallow rule means access is open. A 403, a 429 or a challenge page means a block.',
    sections: [
      {
        id: 'manual',
        heading: 'Check by Hand in Four Steps',
        blocks: [
          { p: 'You can check by hand in four steps: read robots.txt, request a page as the bot, view the page source and look for noindex signals. Each step answers a different question, so do all four.' },
          {
            steps: [
              { title: 'Read robots.txt', text: 'Open yourdomain.com/robots.txt. Search for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot and Google-Extended. A User-agent line followed by Disallow: / blocks that bot. A User-agent: * group with Disallow: / blocks everyone.' },
              { title: 'Request a page as the bot', text: 'From a terminal, run curl -I -A "OAI-SearchBot" https://yourdomain.com/ and read the first line. Use each bot\'s current user-agent string from its vendor\'s documentation. A 200 is good. A 403 or 429 means the server refused it.' },
              { title: 'View the page source', text: 'Check that your main text is in the HTML the server sends, not only added by JavaScript afterwards.' },
              { title: 'Check noindex signals', text: 'Look for a robots meta tag or an X-Robots-Tag header with noindex on pages you want found.' },
            ],
          },
          { callout: 'A request from your own computer is not the same as a request from the vendor. Some firewalls verify real bots by network address, so a fake user agent can pass or fail differently. Treat a hand test as a strong hint, not final proof.' },
        ],
      },
      {
        id: 'read',
        heading: 'How to Read the Results',
        tone: 'alt',
        blocks: [
          {
            table: {
              caption: 'What each result means',
              columns: ['You see', 'It means', 'Next step'],
              rows: [
                ['200 and no Disallow rule', 'The bot can reach the page', 'Check that the content is in the HTML'],
                ['Disallow rule in robots.txt', 'You or a tool told the bot to stay away', 'Remove or narrow the rule if you want that bot'],
                ['403 Forbidden', 'The server or a firewall refused the request', 'Look at firewall, CDN and security plugin rules'],
                ['429 Too Many Requests', 'A rate limit is triggered', 'Raise the limit for known crawlers'],
                ['A challenge or CAPTCHA page', 'Bot protection treats the bot as suspicious', 'See [Cloudflare blocking AI bots](/geo/cloudflare-blocking-ai-bots) if you use Cloudflare'],
              ],
            },
          },
        ],
      },
      {
        id: 'auto',
        heading: 'Check Automatically',
        blocks: [
          { p: 'The [free GeoLint audit](/tools/geo-audit) does all of this for you. Enter a page URL and it reads robots.txt, requests the page as each AI search bot, loads it with and without JavaScript and reports what is blocking you. No signup is needed. [How GeoLint works](/tools/geo-audit/how-it-works) lists every check.' },
          { p: 'If you use a hosted platform, the platform guides cover where to change settings: [Shopify](/geo/shopify-allow-ai-bots), [WordPress](/geo/wordpress-allow-ai-bots), [Wix](/geo/wix-ai-crawlers) and [Webflow](/geo/webflow-ai-crawlers). For the full list of causes, read [why ChatGPT cannot see your website](/geo/why-chatgpt-cant-see-my-website).' },
        ],
      },
    ],
    faqHeading: 'Checking AI Crawler Access: Common Questions',
    faqs: [
      {
        question: 'How do I know if GPTBot is blocked on my site?',
        answer:
          'Open your robots.txt and look for a GPTBot group with Disallow: /. Then request a page with the bot\'s user agent and look at the status code. A 403 or 429 means the server blocks it even if robots.txt does not.',
      },
      {
        question: 'Is there a free AI crawler checker?',
        answer:
          'Yes. The GeoLint audit on this site is free, needs no signup and tests each AI search bot against your page.',
      },
      {
        question: 'Does robots.txt allowing a bot guarantee access?',
        answer:
          'No. A firewall, CDN or rate limit can refuse the bot even though robots.txt allows it. That is why you test the response as well as the file.',
      },
      {
        question: 'Should I allow every AI crawler?',
        answer:
          'It is your policy choice. Many owners allow search and user bots and decide separately about training bots. See the [robots.txt guide](/geo/robots-txt-ai-bots).',
      },
    ],
    related: ['why-chatgpt-cant-see-my-website', 'robots-txt-ai-bots', 'gptbot', 'fix-my-website'],
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
    image: assetUrl(page.poster ? page.poster.src : GEO_OG_IMAGE_PATH),
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
