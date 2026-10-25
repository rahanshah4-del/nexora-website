/**
 * Copy, SEO and JSON-LD for /tools/geo-audit/ (the public GeoLint page).
 * Written answer-first on purpose: each section opens with a direct 30-60 word
 * answer, so the page passes its own audit. Block shapes match
 * pages/public/tools/ToolPageParts.jsx (p, steps, list, table, callout).
 */
import { absoluteUrl, createFAQPageSchema, createWebApplicationSchema, SITE_URL } from './seoStructuredData.js'
import { GEOLINT_PATH } from './geolintLaunch.js'

export const GEOLINT_LAST_UPDATED = '2026-10-25'

export const GEOLINT_SEO = Object.freeze({
  title: 'Free GEO Audit & AI Crawler Checker Tool | Nexora',
  description:
    'Free GEO audit and AI crawler checker: see if GPTBot, ClaudeBot and PerplexityBot can read your page, then fix it with ready code and AI prompts.',
  keywords:
    'free GEO audit tool, geo audit, geo audit checklist, how to conduct a geo audit, geo website audit, GEO audit vs SEO audit, AI citation readiness, AI crawler checker, AI bot checker, check if GPTBot can access my website, is GPTBot blocked, robots.txt checker for AI bots, GEO checker, AI search readiness checker, llms.txt checker, does ChatGPT read JavaScript',
})

export const GEOLINT_FAQS = Object.freeze([
  {
    question: 'What is a GEO audit?',
    answer:
      'A GEO (generative engine optimization) audit is a check of whether AI search tools can reach, read and quote a page. GeoLint tests four things: bot access, whether your text is in the HTML without JavaScript, answer-first structure under each heading, and facts with structured data.',
  },
  {
    question: 'Is GeoLint really free?',
    answer:
      'Yes, GeoLint is free: you paste a URL and get the full report with no account, no email address and no watermark. Each visitor can run a limited number of audits per minute so the service stays available for everyone, and it reads one page per audit.',
  },
  {
    question: 'Can ChatGPT read my website?',
    answer:
      'Only if the right bots are allowed. ChatGPT search uses OAI-SearchBot and live questions use ChatGPT-User. Check that robots.txt does not disallow them and that your firewall or CDN does not return 403 or 429 to them. GeoLint tests both layers for each bot.',
  },
  {
    question: 'Does robots.txt control AI bots?',
    answer:
      'robots.txt is a request that well-behaved crawlers follow. It is not access control. A bot allowed in robots.txt can still be blocked by a firewall, rate limit or challenge page, and that is a common reason a site is invisible to AI search even though its robots.txt looks fine.',
  },
  {
    question: 'What is llms.txt and do I need it?',
    answer:
      'llms.txt is an optional plain-text file at your site root that summarizes your key pages for AI tools. GeoLint reports whether it exists, but we do not claim it changes whether you are cited. Fix bot access, rendering and content first, then add it if you want.',
  },
  {
    question: 'Do AI crawlers run JavaScript?',
    answer:
      'Many AI crawlers are HTML-only, so text added in the browser by React, Vue or Angular may be missing for them. GeoLint compares your raw HTML with the rendered page and shows what share of the text is already in the HTML.',
  },
  {
    question: 'Is GEO different from SEO?',
    answer:
      'They are close relatives. SEO aims to rank links in search results; GEO aims to have your content quoted inside AI answers. Crawlable pages, clear headings, specific facts and structured data help both, but being cited also depends on authority and mentions elsewhere that no on-page tool can measure.',
  },
  {
    question: 'How often should I run an audit?',
    answer:
      'The right time is after any change to robots.txt, your firewall or CDN rules, your site framework, or a key page, and once a quarter otherwise. Bot rules are often changed by hosts and plugins without notice, so a quick check on your most important pages is cheap insurance.',
  },
  {
    question: 'How do I check if GPTBot is blocked on my website?',
    answer:
      'Paste your page URL into GeoLint. It reads robots.txt, then requests the page as GPTBot, OAI-SearchBot, ClaudeBot and PerplexityBot and reports which are allowed, which get a 403 or 429 from a firewall, and which are blocked by a Disallow rule.',
  },
  {
    question: 'What is an AI crawler checker?',
    answer:
      'An AI crawler checker tests whether the bots behind ChatGPT, Claude and Perplexity can fetch your page. GeoLint goes further than a robots.txt check: it sends real requests as each bot, compares raw HTML with the rendered page, and scores the result out of 100.',
  },
  {
    question: 'How do I conduct a GEO audit?',
    answer:
      'Check six things in order: whether AI bots can fetch the page, whether the text is in the HTML, whether each heading opens with an answer, facts and outside sources, structured data and llms.txt, and page health. GeoLint runs all six on one URL in about 20 seconds.',
  },
  {
    question: 'How is a GEO audit different from an SEO audit?',
    answer:
      'An SEO audit asks whether a page can rank as a link in search results. A GEO audit asks whether AI tools can fetch, read and quote it inside an answer. They share crawlability and clear structure, but GEO adds bot-by-bot access tests and answer-first openings.',
  },
  {
    question: 'Can AI fix the problems GeoLint finds?',
    answer:
      'Yes. Every report turns each issue into a prompt you copy into Claude Code, ChatGPT or Codex, Cursor or Gemini. The prompt holds what GeoLint measured, the steps and the code, and tells the tool not to invent facts. Always review the changes before you publish.',
  },
  {
    question: 'Can GeoLint audit my whole website?',
    answer:
      'Yes. After a one-page audit you can audit the whole site: GeoLint reads robots.txt and every sitemap, follows the links on each page and scores every page with the same checks. You get a site score, the problems that repeat, and a table of pages.',
  },
])

export const GEOLINT_PAGE = Object.freeze({
  path: GEOLINT_PATH,
  appName: 'GeoLint by Nexora',
  breadcrumbName: 'GeoLint GEO Audit',
  eyebrow: 'Free · No signup · Four checks AI search depends on',
  h1: 'Free GEO Audit Tool: Can AI Crawlers Read Your Website?',
  valueProp: 'Paste a page URL and see in about 20 seconds whether ChatGPT, Claude and Perplexity can reach it, read it and quote it.',
  lead: 'GeoLint is a free AI crawler checker and GEO audit in one. It loads your page the way AI crawlers do, once as plain HTML and once in a real browser, then scores bot access, JavaScript dependence, answer-first structure and structured data out of 100. It audits one page, lists what to fix first, gives you the fix as ready files and AI prompts, and does not keep a copy of your page.',
  trustChips: ['No signup', 'No email needed', 'One page per audit'],
  faqHeading: 'GEO Audit FAQ',
  faqs: GEOLINT_FAQS,
  sections: [
    {
      id: 'what-it-checks',
      heading: 'What a GEO Audit Checks',
      blocks: [
        { p: 'A GEO audit is a check of whether AI search tools can reach your page, read its content without running JavaScript, and find short answers backed by facts and structured data. GeoLint scores those four areas out of 100: bot access 30, JavaScript 25, answer structure 25, and facts and schema 20.' },
        {
          table: {
            caption: 'The four GeoLint checks and their points',
            columns: ['Check', 'Points', 'What it tests'],
            rows: [
              ['Bot access', '30', 'robots.txt and a live request as each search bot, including firewall blocks and challenge pages'],
              ['JavaScript', '25', 'How much of the page text is already in the raw HTML'],
              ['Answer structure', '25', 'Whether each H2 and H3 opens with a direct answer'],
              ['Facts and schema', '20', 'Numbers, outside sources and JSON-LD structured data'],
            ],
          },
        },
        { p: 'If a check cannot run, for example when the page blocks every bot, GeoLint says so and leaves it out of the score instead of counting it as zero.' },
      ],
    },
    {
      id: 'geo-audit-checklist',
      heading: 'GEO Audit Checklist: How to Conduct a GEO Audit',
      tone: 'alt',
      blocks: [
        { p: 'To conduct a GEO audit, check six things in order: bot access, text in the HTML, answer-first headings, facts and outside sources, structured data with llms.txt, and basic page health. GeoLint runs all six in about 20 seconds and scores the first five out of 100.' },
        {
          steps: [
            { title: 'Bot access', text: 'Confirm that robots.txt allows the search bots and that your firewall or CDN does not answer them with a 403 or 429. GeoLint sends a real request as each bot.' },
            { title: 'Text in the HTML', text: 'Compare the raw HTML with the rendered page. If most of the text only appears after JavaScript runs, many AI crawlers will not see it.' },
            { title: 'Answer-first headings', text: 'Read the first lines under each H2 and H3. Each should state the answer, the figure or the definition before any background.' },
            { title: 'Facts and outside sources', text: 'Count the specific numbers per 100 words and the links to studies, standards or official pages behind your claims.' },
            { title: 'Structured data and llms.txt', text: 'Check for JSON-LD that names your organization and the page type, FAQ markup where the page has questions, and an optional /llms.txt file.' },
            { title: 'Page health', text: 'Check the everyday basics next to the GEO score: titles, canonical, indexability, social tags, images, headers and broken links. They do not change the score.' },
          ],
        },
        { p: 'A GEO audit differs from an SEO audit in its goal. SEO asks whether a page can rank as a link. GEO asks whether an AI tool can fetch the page, read it without JavaScript and quote a short answer from it. Fix the SEO basics first, then run the GEO checks.' },
      ],
    },
    {
      id: 'ai-bots',
      heading: 'Which AI Bots Can Reach Your Site?',
      blocks: [
        { p: 'There are two kinds of AI crawler. Search bots such as OAI-SearchBot, Claude-SearchBot and PerplexityBot fetch pages for live answers, so blocking them hides your site from AI search. Training bots such as GPTBot and ClaudeBot collect data for models, and blocking them is a common choice.' },
        {
          table: {
            caption: 'Bots GeoLint tests and whether they affect the score',
            columns: ['Bot', 'Kind', 'Scored'],
            rows: [
              ['OAI-SearchBot', 'Search', 'Yes'],
              ['ChatGPT-User', 'Live answers', 'Yes'],
              ['Claude-SearchBot', 'Search', 'Yes'],
              ['PerplexityBot', 'Search', 'Yes'],
              ['GPTBot, ClaudeBot, CCBot', 'Training', 'No, reported only'],
              ['Google-Extended, Applebot-Extended', 'robots.txt opt-out tokens', 'No, reported only'],
            ],
          },
        },
        { p: 'Cloudflare measured AI crawling over the twelve months to mid-2025: about 80% was for model training, 18% for search and 2% for live user actions ([Cloudflare](https://blog.cloudflare.com/crawlers-click-ai-bots-training/)). That split is why GeoLint never lowers your score for blocking a training bot. OpenAI describes each of its crawlers in [its bots guide](https://platform.openai.com/docs/bots).' },
        { p: 'GeoLint works as an AI crawler checker and AI bot checker. To see whether GPTBot or any search bot is blocked, run one audit: the bot table shows allowed, blocked by robots.txt, or blocked by the server for each, with the exact fix.' },
        { callout: 'A bot allowed in robots.txt can still get a 403 or 429 from your firewall or CDN. GeoLint tests the real response for each bot, not only the file.' },
      ],
    },
    {
      id: 'javascript',
      heading: 'Does AI See Your Page Without JavaScript?',
      tone: 'alt',
      blocks: [
        { p: 'Often not fully, because many AI crawlers fetch the HTML and do not run JavaScript, so text that React, Vue or Angular adds after load is missing for them. GeoLint compares the raw HTML with the rendered page and reports how much of your text is already in the HTML.' },
        { p: 'A gap above 60% marks the page as client-side rendered. The fix is server-side rendering, static generation or prerendering, so the text is in the first response. Guides such as [LLM Pulse on AI bot access](https://llmpulse.ai/blog/website-ai-bot-access/) describe the same raw-versus-rendered check.' },
      ],
    },
    {
      id: 'answer-first',
      heading: 'Why Answer-First Content Gets Quoted',
      blocks: [
        { p: 'AI systems pull short passages from under a heading, so a section that opens with a clear 30 to 60 word answer is easier to quote than one that opens with background. That word range is a writing convention, not a measured rule, so GeoLint labels this check a heuristic.' },
        {
          list: [
            'Research is limited. A 2024 paper from Princeton, Georgia Tech, the Allen Institute for AI and IIT Delhi found that adding relevant statistics, quotations and citations together raised visibility in generative answers by up to 40% ([Search Engine Land](https://searchengineland.com/generative-engine-optimization-framework-introduced-research-paper-435855)).',
            'An analysis by Kevin Indig of 30 million ChatGPT citations found that 44.2% came from the first 30% of a page ([reported by Scalevise](https://scalevise.com/resources/llm-citation-study-front-load-content/)). It covers ChatGPT only and is not peer reviewed, so treat it as a hint, not proof.',
          ],
        },
        { p: 'GeoLint checks the first block under each H2 and H3. It rewards a direct statement, a number or a list, and flags filler openings, very short lines and very long paragraphs.' },
      ],
    },
    {
      id: 'facts-schema',
      heading: 'Facts, Sources and Structured Data',
      tone: 'alt',
      blocks: [
        { p: 'Specific numbers, named sources and JSON-LD are what give AI tools something checkable to quote. GeoLint counts numbers per 100 words, links to outside sources, valid schema types and a /llms.txt file. It also reports noindex tags, the canonical URL, FAQ schema and a last-updated date.' },
        { p: 'Full points need about two numeric facts per 100 words, links to three other sites, an entity type such as Organization plus a content type such as Article or Product, and an llms.txt file. These are targets for readable, citable pages, not guarantees of citation.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Score Does Not Tell You',
      blocks: [
        { p: 'A high score means AI crawlers can reach and read your page. It does not mean ChatGPT or Perplexity will cite you, because citations also depend on your authority, mentions on other sites and the question asked. GeoLint tests one page and uses crawler user-agents only.' },
        { p: 'Firewalls that verify a bot by its IP address, such as Cloudflare verified bots, cannot be simulated by changing a user-agent. A pass here is a strong sign your rules are fine, but only your server logs show what the real crawlers receive.' },
        { p: 'Want to see the method step by step? Watch the [52 second walkthrough of how GeoLint works](/tools/geo-audit/how-it-works). New to GEO? Start with [what GEO is](/geo/what-is-geo) or the guide to [robots.txt for AI bots](/geo/robots-txt-ai-bots).' },
      ],
    },
    {
      id: 'fix-first',
      heading: 'How to Fix the Most Common Problems',
      tone: 'alt',
      blocks: [
        { p: 'The right order is to let search bots in, put your text in the HTML, then improve the content. A page that AI crawlers cannot fetch gains nothing from better headings, so access comes first.' },
        {
          steps: [
            { title: 'Unblock search bots', text: 'Search bots are blocked by Disallow rules in robots.txt and by firewall or CDN rules, so remove both for OAI-SearchBot, Claude-SearchBot and PerplexityBot. Many hosts and security plugins block them by default.' },
            { title: 'Serve the text in HTML', text: 'The fix for a client-side rendered site is server-side rendering, static generation or prerendering for the pages you want cited.' },
            { title: 'Open each section with the answer', text: 'A direct 30 to 60 word answer is what belongs under every H2 and H3, before the background. Replace slogans with statements that name the thing and give a number.' },
            { title: 'Add facts and sources', text: 'Prices, counts, dates and percentages are the facts AI tools quote, so give them and link the studies or official pages behind them.' },
            { title: 'Add JSON-LD', text: 'JSON-LD is the markup that labels your Organization and the page itself as Article, Product or Service. Add FAQPage only where the page has visible questions and answers.' },
          ],
        },
        { p: 'You do not have to write these fixes yourself. Each report gives you a Fix Pack with a robots.txt block, an llms.txt file and JSON-LD built from your page, and a Fix with AI prompt for Claude Code, ChatGPT or Codex, Cursor and Gemini. Review what the tool changes before you publish.' },
      ],
    },
    {
      id: 'wordpress-plugin',
      heading: 'Apply the Fixes on WordPress',
      blocks: [
        { p: 'If your site runs on WordPress, the free GeoLint AI Visibility plugin applies the most common fixes from one settings page, so you do not have to edit files by hand.' },
        {
          list: [
            'Allow or block 12 AI crawlers in robots.txt, including OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, ClaudeBot, PerplexityBot and Google-Extended, with one click to allow the search and answer crawlers.',
            'Serve an llms.txt file at /llms.txt, generated from your site name, tagline, pages and latest posts, or written by you.',
            'Add Organization and WebSite JSON-LD to your home page, or leave it off if an SEO plugin already prints it.',
            'Check your live robots.txt and see what each AI crawler is allowed to do.',
          ],
        },
        { callout: 'Nothing changes until you click Apply recommended fixes or save the settings. llms.txt is a proposed convention, and no AI company guarantees that any setting changes how your site appears in AI answers. If your site has a real robots.txt or llms.txt file, the plugin shows you the rules to paste instead.' },
        { p: 'To install it, download the zip below, then open Plugins, Add New Plugin, Upload Plugin in your WordPress dashboard, and activate it. WordPress then opens the plugin settings, where one Apply recommended fixes button turns on the usual fixes. You can fine-tune everything under Settings, GeoLint AI Visibility.' },
      ],
    },
    {
      id: 'privacy',
      heading: 'What GeoLint Stores',
      tone: 'alt',
      blocks: [
        { p: 'GeoLint is built to read the page you submit without storing the page itself. When audit history is on, it keeps the URL, the scores, the report and a hashed form of your IP address for 90 days, to count audits and spot abuse. The saved report can quote short heading text. No account or email is needed.' },
        { p: 'To apply the daily limit of 500 pages per visitor, GeoLint also keeps a record of that hashed IP address with the number of pages you audited and the time. It is deleted 90 days after your last audit, and kept longer only if the address was blocked for abuse. The raw IP address is never stored.' },
      ],
    },
  ],
  cta: {
    heading: 'Need a website AI tools can read?',
    text: 'Nexora Solution is a software company in Multan, Pakistan that builds fast, server-rendered websites and business software. Tell us what you run and we will tell you what to fix first.',
    links: [
      { to: '/contact', label: 'Talk to Nexora', primary: true },
      { to: '/tools', label: 'More free tools' },
    ],
  },
})

export function geolintWebApplicationSchema() {
  return createWebApplicationSchema({
    name: GEOLINT_PAGE.appName,
    path: GEOLINT_PATH,
    description: GEOLINT_SEO.description,
    operatingSystem: 'Any (web browser)',
  })
}

export function geolintBreadcrumbSchema() {
  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools' },
    { name: GEOLINT_PAGE.breadcrumbName, path: GEOLINT_PATH },
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(GEOLINT_PATH)}#breadcrumb`,
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/** Page-level JSON-LD in output order: WebApplication, FAQPage (mirrors the visible FAQ), BreadcrumbList. */
export function geolintPageSchemas() {
  return [geolintWebApplicationSchema(), createFAQPageSchema({ path: GEOLINT_PATH, items: GEOLINT_FAQS }), geolintBreadcrumbSchema()]
}

export { SITE_URL }

/** "What's new" band on /tools/geo-audit/: the WordPress plugin and the report's Fix with WordPress flow. */
export const GEOLINT_WORDPRESS_FEATURES = Object.freeze({
  eyebrow: "What's new",
  heading: 'GeoLint for WordPress',
  lead: 'An audit tells you what is wrong. Now you can fix it without touching code: a free WordPress plugin applies them with one click after you activate it, and a picture guide walks you through the install.',
  items: Object.freeze([
    { title: 'Fix with WordPress button', text: 'Every audit report now has a Fix with WordPress button. It opens a guide for the site you just audited, so you go from findings to fixes in one click.' },
    { title: 'AI crawler rules', text: 'Allow or block 12 AI crawlers in robots.txt, including OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot and Google-Extended. One button allows the search and answer crawlers.' },
    { title: 'llms.txt, made for you', text: 'Serves /llms.txt, built from your site name, tagline, pages and latest posts. Prefer your own wording? Write the text yourself.' },
    { title: 'Organization schema', text: 'Adds Organization and WebSite JSON-LD to your home page: name, logo, description and profile links. Leave it off if an SEO plugin already prints it.' },
    { title: 'One-click fixes', text: 'Activate the plugin and its settings open with an Apply recommended fixes button. One click turns on the usual fixes, keeps anything you set before, and Check my site then shows what crawlers see.' },
    { title: 'Install guide with pictures', text: 'Five steps with real WordPress screenshots and the click targets outlined. An Open my WordPress button takes you straight to the upload screen of your own site.' },
  ]),
  note: 'Free. Needs WordPress 5.8+ and PHP 7.4+. Nothing changes on your site until you click Apply recommended fixes or save the settings.',
})

/**
 * "More than an audit" band on /tools/geo-audit/: everything GeoLint does after the score.
 * Every item is a feature that exists in the report or the site tools today. `icon` picks a drawing in GeoLintUpgrades.jsx.
 */
export const GEOLINT_UPGRADES = Object.freeze({
  eyebrow: "What's new in GeoLint",
  heading: 'More than an audit: fix, monitor and prove it',
  lead: 'GeoLint now takes you from a score to a finished fix. Copy a ready prompt for your AI coding tool, publish the files it builds from your page, audit your whole site, and get an email when something important changes.',
  items: Object.freeze([
    { icon: 'ai', badge: 'New', title: 'Fix with AI prompts', text: 'Every issue becomes a prompt for Claude Code, ChatGPT or Codex, Cursor or Gemini, with what GeoLint measured, the steps and the code. One prompt can fix all issues. It tells the tool not to invent facts.', tools: true },
    { icon: 'pack', title: 'Fix Pack files', text: 'Ready-to-publish robots.txt rules, an llms.txt guide, Article JSON-LD and FAQ JSON-LD, built from what your page really says. Copy them or download them.' },
    { icon: 'site', title: 'Whole-website audit', text: 'Audit every page found in your robots.txt, sitemaps and links. You get a site score, the problems that repeat across pages with one fix each, and a table of every page.' },
    { icon: 'watch', title: 'Free weekly watch', text: 'GeoLint re-audits up to 3 pages every week and emails you only when the score drops 5 points or more, or when AI bots lose access.' },
    { icon: 'health', title: 'Page health checks', text: 'Everyday SEO and technical checks next to your GEO score: metrics, content, indexability, structured data, social tags, images, HTTP headers and links, each with the fix.' },
    { icon: 'proof', title: 'A score you can trust', text: 'Every issue shows what was measured and how sure the check is: confirmed, likely or rule of thumb. Totals are re-added in your browser, so a wrong sum shows up instead of a confident score.' },
    { icon: 'report', title: 'PDF, JSON and a badge', text: 'Download the report as a PDF or JSON, and embed a small score badge on your site or in your README. The badge is drawn from the saved audit, so the number cannot be edited.' },
    { icon: 'done', wide: true, title: 'Want it done for you?', text: 'Order a GEO fix from $50 per website. We make the changes, run the audit again and show your score before and after. You can add competitors to compare.' },
  ]),
})
