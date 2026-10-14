/**
 * Copy, scene timeline, SEO and JSON-LD for /tools/geo-audit/how-it-works/.
 * Answer-first like the main GeoLint page. The scene list is shared by the
 * animated player (pages/public/tools/GeoLintExplainer.jsx) and the page text,
 * so the transcript under the video always matches what the video shows.
 */
import { absoluteUrl, assetUrl, createFAQPageSchema } from './seoStructuredData.js'
import { GEOLINT_HOW_PATH, GEOLINT_PATH } from './geolintLaunch.js'
import { GEOLINT_LAST_UPDATED } from './geolintPageData.js'

export const GEOLINT_HOW_VIDEO = Object.freeze({
  mp4: '/geolint-how-it-works.mp4',
  poster: '/geolint-how-it-works-poster.jpg',
  width: 1280,
  height: 720,
})

export const GEOLINT_HOW_SEO = Object.freeze({
  title: 'How GeoLint Works: Free GEO Audit Explained | Nexora',
  description:
    'See how the free GeoLint GEO audit tests AI crawler access, JavaScript, answer-first content and facts, and how each score and fix is checked.',
  keywords: 'how GeoLint works, GEO audit explained, AI crawler audit methodology, GEO score calculation, GeoLint scoring',
})

/**
 * Timeline in seconds. `points` is the module's maximum in the 100-point score;
 * the example numbers inside the video (79.9 out of 100) add up from these.
 */
export const GEOLINT_SCENES = Object.freeze([
  { id: 'intro', start: 0, end: 7, title: 'The question', caption: 'AI tools now answer questions your customers used to search for. The first question is whether their crawlers can read your site.' },
  { id: 'bots', start: 7, end: 16, title: 'Bot access', points: 30, caption: 'GeoLint asks each AI search bot for your page and reads both robots.txt and the real server response.' },
  { id: 'javascript', start: 16, end: 24, title: 'JavaScript test', points: 25, caption: 'It loads the page twice, once as raw HTML and once after JavaScript runs, and measures how much text only appears after scripts run.' },
  { id: 'answer', start: 24, end: 31, title: 'Answer-first content', points: 25, caption: 'It reads the first block under each heading and rewards a direct answer with a number over a slow introduction.' },
  { id: 'facts', start: 31, end: 37.5, title: 'Facts and structure', points: 20, caption: 'It counts specific facts, outside sources, JSON-LD structured data and the llms.txt file.' },
  { id: 'verify', start: 37.5, end: 44, title: 'Verification', caption: 'Before showing a score it re-checks its own sums, separates a bot block from a site outage and leaves unverified checks out.' },
  { id: 'result', start: 44, end: 52, title: 'Score and fixes', caption: 'You get one score out of 100, a confidence level and a ranked fix list with the points each fix can add.' },
])

export const GEOLINT_HOW_DURATION = 52
/** Frame shown before playing and used as the poster: the finished result. */
export const GEOLINT_HOW_POSTER_T = 51

export const GEOLINT_HOW_FAQS = Object.freeze([
  {
    question: 'How does GeoLint calculate the score?',
    answer:
      'GeoLint adds four parts to reach 100: bot access 30, JavaScript differential 25, answer-first content 25 and facts and structure 20. Each part is computed from measured data on your page, and an integrity check re-adds the parts before the report is shown.',
  },
  {
    question: 'Why does GeoLint load my page twice?',
    answer:
      'Many AI crawlers read only the raw HTML, while a browser also runs JavaScript. Loading the page both ways shows how much of your text exists only after scripts run, which is the text those crawlers cannot see.',
  },
  {
    question: 'What happens if my site blocks GeoLint?',
    answer:
      'GeoLint sends one extra request that looks like a normal browser. If the browser is allowed and the bot is not, the block is specific to bots and is scored. If both fail, the site itself was unreachable, so those checks are left out of the score instead of counted as zero.',
  },
  {
    question: 'Are the results guaranteed to be right?',
    answer:
      'No tool can promise that. GeoLint reports a confidence level and lists its limits, for example that firewalls which verify bots by IP address cannot be simulated. It measures whether AI crawlers can reach and read your page, not whether an AI tool will cite you.',
  },
  {
    question: 'Does GeoLint store my page?',
    answer:
      'GeoLint reads your page to run the audit and does not store the page itself. When history is on it keeps the URL, scores and report, plus a hashed form of your IP address, for a limited time.',
  },
])

export const GEOLINT_HOW_PAGE = Object.freeze({
  path: GEOLINT_HOW_PATH,
  breadcrumbName: 'How it works',
  eyebrow: 'Methodology · 52 second walkthrough',
  valueProp: 'GeoLint tests four things and shows its working: can AI bots reach you, can they read your text, is it quotable, and is it checkable.',
  lead: 'Watch the walkthrough below, then read the same steps in text. The example site in the video is made up, so you can see how a score is built before you run your own.',
  sections: [
    {
      id: 'pipeline',
      heading: 'What Happens When You Press Run',
      blocks: [
        { p: 'GeoLint runs five stages in about 20 seconds: it fetches robots.txt and your page as each AI bot, loads the page in a real browser, reads the content, adds up the score and then verifies the result. Nothing is guessed from a database of other sites. You can [run the free audit](/tools/geo-audit) on any public page.' },
        {
          steps: [
            { title: 'Check every AI bot', text: 'Four search and live-answer bots are asked for your page. GeoLint records what robots.txt says and what the server actually returns.' },
            { title: 'Load the page two ways', text: 'The page is fetched as raw HTML and rendered in Chromium with JavaScript on, using the same bot identity for both.' },
            { title: 'Read the content', text: 'The first block under each heading, the numbers, the outside links, the JSON-LD and llms.txt are measured on the page the AI would read.' },
            { title: 'Score by fixed rules', text: 'Points follow published rules, not opinion. The same page gives the same score.' },
            { title: 'Verify, then show', text: 'The sums are re-added, unverified checks are removed from the total, and a confidence level is attached.' },
          ],
        },
      ],
    },
    {
      id: 'scoring',
      heading: 'Where the 100 Points Come From',
      tone: 'alt',
      blocks: [
        { p: 'The score is 30 for bot access, 25 for the JavaScript test, 25 for answer-first content and 20 for facts and structure. Bot access carries the most weight because a page an AI search bot cannot reach cannot be quoted at all.' },
        {
          table: {
            caption: 'GeoLint score breakdown',
            columns: ['Part', 'Points', 'What it measures'],
            rows: [
              ['Bot access', '30', 'robots.txt and the real HTTP response for each search bot'],
              ['JavaScript differential', '25', 'Share of text that only appears after JavaScript runs'],
              ['Answer-first content', '25', 'Whether the first block under each heading answers directly'],
              ['Facts and structure', '20', 'Numbers, outside sources, JSON-LD and llms.txt'],
            ],
          },
        },
        { p: 'Training bots such as GPTBot and ClaudeBot are reported but not scored, because blocking them is a legitimate choice and does not stop search tools from quoting you.' },
      ],
    },
    {
      id: 'accuracy',
      heading: 'How GeoLint Avoids False Results',
      blocks: [
        { p: 'GeoLint treats a wrong score as worse than no score, so it measures what it can prove and leaves out what it cannot. A check that could not be verified is removed from both the points earned and the maximum, instead of being counted as a failure.' },
        {
          list: [
            'A control request that looks like a normal browser tells a bot-specific block apart from a site that is simply down.',
            'Each failed request is retried once before it is recorded.',
            'If the rendered page holds less than half the text of the raw HTML, the render is treated as failed and the raw HTML is analysed instead.',
            'The report carries an integrity check that re-adds every module and compares it with the total.',
            'A confidence level and a list of limits come with every report.',
          ],
        },
        { callout: 'GeoLint shows what AI crawlers can reach and read. It cannot show whether ChatGPT or Perplexity will actually cite you, and the report says so.' },
      ],
    },
    {
      id: 'report',
      heading: 'What You Get in the Report',
      tone: 'alt',
      blocks: [
        { p: 'The report gives one score out of 100, the four part scores, a confidence level and a ranked list of fixes. Each fix names the problem, shows the exact change to make and states the most points it can add.' },
        {
          list: [
            'A score with the reasoning behind every part.',
            'Fixes ordered by points gained, with copy-ready code where it applies, such as a robots.txt line or a JSON-LD block.',
            'A domain card with domain age and popularity rank, shown for context and never added to the score.',
            'A PDF you can download and send to a developer.',
            'The [GEO guides](/geo) explain each fix in plain English, and more [free business tools](/tools) from Nexora are one click away. [Talk to us](/contact) if you want the fixes done for you.',
          ],
        },
      ],
    },
  ],
  faqHeading: 'How GeoLint Works: Common Questions',
  cta: {
    heading: 'Try it on your own website',
    text: 'The audit is free, needs no signup and takes about 20 seconds. If the report shows problems you would rather not fix yourself, Nexora Solution builds server-rendered websites that AI tools can read.',
    links: [
      { to: GEOLINT_PATH, label: 'Run the free audit', primary: true },
      { to: '/contact', label: 'Talk to Nexora' },
    ],
  },
})

export function geolintHowBreadcrumbSchema() {
  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools' },
    { name: 'GeoLint', path: GEOLINT_PATH },
    { name: GEOLINT_HOW_PAGE.breadcrumbName, path: GEOLINT_HOW_PATH },
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(GEOLINT_HOW_PATH)}#breadcrumb`,
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function geolintHowVideoSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${absoluteUrl(GEOLINT_HOW_PATH)}#video`,
    name: 'How GeoLint works: a 52 second walkthrough',
    description: GEOLINT_HOW_SEO.description,
    thumbnailUrl: assetUrl(GEOLINT_HOW_VIDEO.poster),
    contentUrl: assetUrl(GEOLINT_HOW_VIDEO.mp4),
    uploadDate: GEOLINT_LAST_UPDATED,
    duration: 'PT52S',
    width: GEOLINT_HOW_VIDEO.width,
    height: GEOLINT_HOW_VIDEO.height,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'Nexora Solution', url: absoluteUrl('/') },
  }
}

/** Page-level JSON-LD in output order: VideoObject, FAQPage (mirrors the visible FAQ), BreadcrumbList. */
export function geolintHowPageSchemas() {
  return [geolintHowVideoSchema(), createFAQPageSchema({ path: GEOLINT_HOW_PATH, items: GEOLINT_HOW_FAQS }), geolintHowBreadcrumbSchema()]
}
