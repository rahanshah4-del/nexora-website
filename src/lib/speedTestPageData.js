/**
 * Copy, SEO and JSON-LD for /tools/website-speed-test/ (free website speed test).
 * Pure data, so prerender.mjs (Node) and the page (Vite) read the same source.
 * Written answer-first: every section opens with a direct answer of 30-60 words.
 * Block shapes match pages/public/tools/ToolPageParts.jsx (p, h3, steps, list, table, callout).
 * Facts used here are Google's published thresholds and Lighthouse's published score weights;
 * nothing on this page is a made-up statistic.
 */
import { absoluteUrl, createFAQPageSchema, createWebApplicationSchema } from './seoStructuredData.js'

export const SPEED_TEST_PATH = '/tools/website-speed-test'
export const SPEED_TEST_LAST_UPDATED = '2026-11-05'

export const SPEED_TEST_SEO = Object.freeze({
  title: 'Free Website Speed Test: Check Page Speed | Nexora',
  description:
    'Free website speed test powered by Google PageSpeed. Test any URL on mobile and desktop, see Core Web Vitals and get the fixes that make it faster.',
  keywords:
    'free website speed test, website speed test, page speed test, test my website speed, test website speed, page load speed test, website page speed test, mobile page speed test, page speed tester, website speed checker, core web vitals test, check website speed, google pagespeed test, LCP INP CLS',
})

export const SPEED_TEST_FAQS = Object.freeze([
  {
    question: 'Is this website speed test really free?',
    answer:
      'Yes. You paste a URL and get the full result with no account, no email address and no watermark. The test runs on Google PageSpeed from your browser, so it is limited only by Google\'s own request limits, not by a Nexora paywall.',
  },
  {
    question: 'What is a good page speed score?',
    answer:
      'Google groups the performance score into three bands: 90 to 100 is good, 50 to 89 needs improvement, and 0 to 49 is poor. A perfect 100 is not required. Passing Core Web Vitals for real visitors matters more than the last few points of a lab score.',
  },
  {
    question: 'Why is my mobile score lower than my desktop score?',
    answer:
      'The mobile test simulates a mid-range phone on a slower connection, while the desktop test uses a fast computer and network. The same page does more work per second on the phone, so scripts, images and layout cost more. Most sites score lower on mobile, and mobile is the score to fix first.',
  },
  {
    question: 'Why does my score change every time I test?',
    answer:
      'A lab test is a single simulated load, and small differences in server response, network routing and third-party scripts move the result. Expect a few points of variation. Run the test two or three times and look at the pattern, not at one number.',
  },
  {
    question: 'What is the difference between lab data and real-user data?',
    answer:
      'Lab data comes from one controlled test run now. Real-user (field) data comes from Chrome users who visited the site over the last 28 days. Lab data is good for finding causes. Field data is what Google uses to judge Core Web Vitals, but it only exists for pages with enough traffic.',
  },
  {
    question: 'Does page speed affect Google rankings?',
    answer:
      'Yes, but modestly. Core Web Vitals are part of Google\'s page experience signals, and they act more like a tie-breaker than a main ranking factor. Relevant, helpful content still comes first. Speed also affects bounce rate and conversions directly, which is a good reason to fix it by itself.',
  },
  {
    question: 'How can I make my website faster?',
    answer:
      'Start with the biggest items in your results: compress and resize images, serve modern formats like WebP or AVIF, remove or delay third-party scripts, cache static files and use a CDN. Fix one thing, test again, and keep the change only if the score or the loading time improves.',
  },
  {
    question: 'Can I test a page that needs a login?',
    answer:
      'No. The test loads the page the way a first-time visitor would, so it can only read public pages. Pages behind a login, a paywall or a firewall that blocks Google\'s test servers return an error or a result for the login screen instead.',
  },
  {
    question: 'How often should I test my website speed?',
    answer:
      'Test after every release, plugin install or theme change, and at least once a month otherwise. New tracking scripts and larger images are the usual causes of a slow page that used to be fast.',
  },
])

export const SPEED_TEST_PAGE = Object.freeze({
  path: SPEED_TEST_PATH,
  appName: 'Nexora Website Speed Test',
  breadcrumbName: 'Website Speed Test',
  eyebrow: 'Free tool · Google PageSpeed · No signup',
  h1: 'Free Website Speed Test',
  lead:
    'Test the speed of any public web page on a phone and a desktop. You get Google PageSpeed scores, a Core Web Vitals verdict from real visitors, a screenshot of what loads first, and a plain list of the files and scripts that slow the page down.',
  badges: ['Free, no signup', 'Mobile and desktop', 'Core Web Vitals', 'Fix list included'],
  toolLabel: 'Page URL to test',
  jump: [
    ['What it is', 'what-is'],
    ['How to test', 'how-to-test'],
    ['Read your results', 'read-results'],
    ['Core Web Vitals', 'core-web-vitals'],
    ['Lab vs real users', 'lab-vs-field'],
    ['What slows a site', 'what-slows'],
    ['How to speed up', 'speed-up'],
    ['Limits', 'limits'],
    ['FAQ', 'faq'],
  ],
  sections: [
    {
      id: 'what-is',
      heading: 'What Is a Website Speed Test?',
      blocks: [
        { p: 'A website speed test loads a web page in a controlled browser, measures how quickly it becomes visible and usable, and reports the result as scores and timings. It tells you how fast a page feels to a visitor and which files or scripts are responsible when it feels slow.' },
        { p: 'This tool uses Google PageSpeed Insights, which runs Lighthouse, the open-source auditing engine built into Chrome. Using Google\'s own engine matters because the numbers match what Google reports in Search Console and what developers see in Chrome DevTools. You are not looking at an invented score from a third-party formula.' },
        { p: 'Speed matters for two reasons. First, people leave slow pages, and every second of waiting makes a sale, a call or a sign-up less likely. Second, Google measures loading, responsiveness and visual stability as part of its page experience signals. A fast page helps both the visitor and the search result.' },
      ],
    },
    {
      id: 'how-to-test',
      heading: 'How to Test Your Website Speed',
      tone: 'alt',
      blocks: [
        { p: 'Paste the full address of one public page, press the test button, and wait about 20 to 40 seconds. The tool tests the page twice, once as a phone and once as a desktop, so keep the tab open until both results appear.' },
        {
          steps: [
            { title: 'Enter one page', text: 'Type or paste a URL such as https://example.com/pricing. Test your homepage first, then your most visited page and your most important landing page. Speed differs from page to page, so one result never describes the whole site.' },
            { title: 'Run the test', text: 'The test asks Google to load the page from its servers. Nothing is installed and nothing is added to your site. Public pages only.' },
            { title: 'Check mobile first', text: 'Most visits come from phones, and the phone test is the stricter one. Read the mobile result first, then switch to desktop to compare.' },
            { title: 'Open the fix list', text: 'Press See all details to see the files and scripts behind a slow score. Each item says what to change and how much time it can save.' },
            { title: 'Change one thing and test again', text: 'Fix the biggest item, run the test again and compare. If you change five things at once you cannot tell which one helped.' },
          ],
        },
        { callout: 'Test the exact address people reach. https://example.com and https://www.example.com can behave differently if one redirects to the other, and a redirect adds time before the page even starts to load.' },
      ],
    },
    {
      id: 'read-results',
      heading: 'How to Read Your Speed Test Results',
      blocks: [
        { p: 'Your result has four parts: a performance score from 0 to 100, a Core Web Vitals verdict from real visitors, a list of timings, and a list of fixes. The performance score is a summary. The timings and the fix list tell you what to do about it.' },
        { table: {
          caption: 'Performance score bands used by Google PageSpeed',
          columns: ['Score', 'Rating', 'What it means'],
          rows: [
            ['90 to 100', 'Good', 'The page loads quickly in the test. Keep it this way when you add content or scripts.'],
            ['50 to 89', 'Needs improvement', 'The page works but feels slow in places. One or two fixes usually move it into the green.'],
            ['0 to 49', 'Poor', 'Visitors will notice the delay. Look for oversized images, heavy JavaScript and slow server response first.'],
          ],
        } },
        { p: 'Besides performance, the tool also reports Accessibility, Best Practices and SEO scores from the same Lighthouse run. These do not measure speed. They check things like readable text contrast, HTTPS and whether the page can be indexed, so treat them as a free quick check next to the speed result.' },
        { h3: 'What goes into the performance score' },
        { p: 'Lighthouse combines five timings into one score, and they do not count equally. According to Google\'s Lighthouse documentation, Total Blocking Time carries 30 percent, Largest Contentful Paint 25 percent, Cumulative Layout Shift 25 percent, First Contentful Paint 10 percent and Speed Index 10 percent. This is why one slow script or one oversized hero image can drag the whole score down.' },
        { list: [
          'Largest Contentful Paint (LCP): when the biggest visible element, often the main image or heading, finishes loading.',
          'Total Blocking Time (TBT): how long scripts keep the page from responding to a tap or click while it loads.',
          'Cumulative Layout Shift (CLS): how much the page jumps around while it loads.',
          'First Contentful Paint (FCP): when the first text or image appears.',
          'Speed Index: how quickly the visible part of the page fills in.',
        ] },
      ],
    },
    {
      id: 'core-web-vitals',
      heading: 'Core Web Vitals: The Three Numbers Google Judges',
      tone: 'alt',
      blocks: [
        { p: 'Core Web Vitals are three measurements of real visitor experience: loading (LCP), responsiveness (INP) and visual stability (CLS). A page passes when at least 75 percent of real visits fall in the good range for all three. The tool shows the share of visits that were good, needs-work and poor for each.' },
        { table: {
          caption: 'Core Web Vitals thresholds published by Google',
          columns: ['Metric', 'Good', 'Needs improvement', 'Poor'],
          rows: [
            ['LCP, Largest Contentful Paint', '2.5 s or less', '2.5 s to 4 s', 'Over 4 s'],
            ['INP, Interaction to Next Paint', '200 ms or less', '200 ms to 500 ms', 'Over 500 ms'],
            ['CLS, Cumulative Layout Shift', '0.1 or less', '0.1 to 0.25', 'Over 0.25'],
          ],
        } },
        { p: 'INP replaced First Input Delay as the responsiveness metric in March 2024. It looks at every tap, click and key press during a visit and reports one of the slowest, so a page that reacts late to a menu button or an add-to-cart click fails it even if the first interaction was fast.' },
        { p: 'If the tool shows no real-visitor verdict, that is not an error. Google only publishes this data for pages and sites with enough Chrome traffic. A new or low-traffic page has lab data only, which is still enough to find and fix the causes of slowness.' },
      ],
    },
    {
      id: 'lab-vs-field',
      heading: 'Lab Data vs Real-User Data',
      blocks: [
        { p: 'Lab data is one simulated page load made right now under fixed conditions. Real-user data (also called field data) is collected from actual Chrome visitors over the previous 28 days. They answer different questions, and a page can look fine in one and bad in the other.' },
        { table: {
          caption: 'Lab data compared with real-user data',
          columns: ['', 'Lab data', 'Real-user (field) data'],
          rows: [
            ['Source', 'One Lighthouse test run', 'Chrome visitors, last 28 days'],
            ['Best for', 'Finding causes and testing a fix', 'Judging how visitors really experience the page'],
            ['Available for', 'Every public page', 'Pages with enough traffic only'],
            ['Changes after a fix', 'Immediately', 'Slowly, as the 28-day window moves'],
          ],
        } },
        { p: 'This is why a fix can raise your lab score today and leave the Core Web Vitals verdict unchanged for weeks. The real-visitor numbers are a rolling average, so they only catch up as old visits drop out of the window.' },
      ],
    },
    {
      id: 'what-slows',
      heading: 'What Usually Makes a Website Slow',
      tone: 'alt',
      blocks: [
        { p: 'Most slow websites are slow for the same few reasons: images that are larger than they need to be, too much JavaScript, third-party scripts, render-blocking files and a slow server. Your fix list names the exact files, so use this section to understand what each one means.' },
        { h3: 'Oversized and old-format images' },
        { p: 'Images are usually the heaviest part of a page. A photo uploaded straight from a phone can be several megabytes when the screen only needs a few hundred kilobytes. Resize images to the size they are shown at, and use WebP or AVIF, which are typically much smaller than PNG or JPEG at similar quality.' },
        { h3: 'Too much JavaScript' },
        { p: 'JavaScript has to be downloaded, parsed and run, and a phone does that slowly. Large bundles, unused libraries and heavy page builders show up as high Total Blocking Time. Remove what you do not use and load the rest only on the pages that need it.' },
        { h3: 'Third-party scripts' },
        { p: 'Tag managers, chat widgets, ad pixels, heat maps and social embeds are each small, but together they often cost more time than your own code. Ask of each one whether you still use its data. If not, remove it.' },
        { h3: 'Render-blocking CSS and fonts' },
        { p: 'The browser will not paint the page until it has the stylesheets it needs. A large stylesheet, or several of them, delays the first paint. Web fonts can also hide text until they load, so set font-display: swap and load only the weights you use.' },
        { h3: 'Slow server response and no caching' },
        { p: 'If the server takes a long time to answer, nothing else can start. Cheap shared hosting, no page cache and long database queries are the usual causes. Cache headers also let returning visitors reuse files they already downloaded instead of fetching them again.' },
        { h3: 'Layout shifts' },
        { p: 'Images, ads and embeds without a set width and height make the page jump when they load, which raises CLS. Give every image and embed fixed dimensions so the browser reserves its space in advance.' },
      ],
    },
    {
      id: 'speed-up',
      heading: 'How to Make Your Website Faster, in Order',
      blocks: [
        { p: 'Fix the biggest problem first. A practical order is images, then scripts, then caching and hosting. Each step below is safe to try on its own, and the test tells you whether it worked.' },
        {
          steps: [
            { title: 'Compress and resize images', text: 'Resize each image to its display size, convert it to WebP or AVIF, and lazy-load images below the first screen. Never lazy-load the main image at the top, because it is the element LCP measures.' },
            { title: 'Remove or delay scripts you do not need', text: 'Delete unused plugins and tracking tags. Load chat widgets and analytics after the page is ready instead of at the start.' },
            { title: 'Cache files and use a CDN', text: 'Send long cache headers for images, fonts, CSS and JavaScript, and serve them from a content delivery network close to your visitors.' },
            { title: 'Turn on text compression', text: 'Enable Brotli or gzip on your server so HTML, CSS and JavaScript travel in a smaller form.' },
            { title: 'Reduce blocking CSS and fonts', text: 'Inline the small amount of CSS needed for the first screen, load the rest later, and limit fonts to the weights you use.' },
            { title: 'Check the server', text: 'If the first request is slow, look at hosting, page caching and slow database queries before anything else.' },
          ],
        },
        { callout: 'Speed work has a stopping point. Once your Core Web Vitals pass for real visitors, extra lab points rarely change what people experience, and time is better spent on content.' },
        { p: 'If you would rather not do this yourself, [Nexora builds fast, server-rendered websites](/contact) and can work from your fix list. You can also run a [free GEO audit](/tools/geo-audit) to check whether AI search tools can read the same page.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Speed Test Cannot Tell You',
      tone: 'alt',
      blocks: [
        { p: 'A speed test measures one public page at one moment from Google\'s servers. It cannot see your logged-in pages, your visitors\' real devices or the effect of a change you have not made yet, so use it as a guide and not as a guarantee.' },
        { list: [
          'It tests one URL at a time, not the whole site.',
          'The result varies between runs, so a few points of difference is normal.',
          'Lab conditions are simulated. Your real visitors may have faster or slower phones and connections.',
          'Pages behind a login, a paywall, or a firewall that blocks Google\'s test servers cannot be tested.',
          'Real-visitor data is shown only when Google has enough traffic data for the page or site.',
          'A high score does not prove good rankings. Speed is one signal among many.',
        ] },
        { p: 'The test does not store the page it loads. Your last results are kept only in your own browser, so you can compare the next test against them, and no account is needed.' },
      ],
    },
  ],
  cta: {
    heading: 'Want a faster website without the guesswork?',
    text: 'Nexora Solution is a software company in Multan, Pakistan that builds fast, server-rendered websites and business software. Send us your test result and we will tell you what to fix first.',
    links: [
      { to: '/contact', label: 'Talk to Nexora', primary: true },
      { to: '/tools', label: 'More free tools' },
    ],
  },
})

export function speedTestWebApplicationSchema() {
  return createWebApplicationSchema({
    name: SPEED_TEST_PAGE.appName,
    path: SPEED_TEST_PATH,
    description: SPEED_TEST_SEO.description,
    operatingSystem: 'Any (web browser)',
  })
}

export function speedTestBreadcrumbSchema() {
  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools' },
    { name: SPEED_TEST_PAGE.breadcrumbName, path: SPEED_TEST_PATH },
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(SPEED_TEST_PATH)}#breadcrumb`,
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/** Page-level JSON-LD in output order: WebApplication, FAQPage (mirrors the visible FAQ), BreadcrumbList. */
export function speedTestPageSchemas() {
  return [
    speedTestWebApplicationSchema(),
    createFAQPageSchema({ path: SPEED_TEST_PATH, items: SPEED_TEST_FAQS }),
    speedTestBreadcrumbSchema(),
  ]
}

/** Visible words (lead + sections + FAQ), used by the tests. */
export function speedTestWordCount() {
  const text = []
  const take = (v) => {
    if (typeof v === 'string') text.push(v)
    else if (Array.isArray(v)) v.forEach(take)
    else if (v && typeof v === 'object') Object.values(v).forEach(take)
  }
  take(SPEED_TEST_PAGE.lead)
  take(SPEED_TEST_PAGE.sections)
  take(SPEED_TEST_FAQS)
  return text.join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\s+/).filter(Boolean).length
}

