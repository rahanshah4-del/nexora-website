/**
 * Intro videos for each Nexora module (the dark "futuristic" series).
 *
 * Each intro is a short silent animation with on-screen captions, drawn with
 * sample data by src/components/video/ModuleIntroStage.jsx and rendered to
 * public/videos/intros/<id>.mp4 / .webm / -poster.jpg by
 * scripts/render-module-intros.mjs. They are illustrations, not recordings of a
 * customer's account, and the page says so. Every claim in a caption comes from
 * the module's own product page.
 *
 * `solutionSlug` is the key SolutionPage.jsx uses for the product page.
 * To add an intro: add an entry here, a scene file in src/components/video/intros/,
 * register it in ModuleIntroStage.jsx, then run the render script.
 * `scenes` must be contiguous and end at `duration`.
 */
import { absoluteUrl, assetUrl } from './seoStructuredData.js'

export const MODULE_INTRO = Object.freeze({
  width: 1920,
  height: 1080,
  stageWidth: 1280,
  stageHeight: 720,
  fps: 30,
  uploadDate: '2026-10-21T09:00:00+05:00',
})
export const MODULE_INTRO_CAPTURE_PATH = '/module-intro-capture'
export const MODULE_INTRO_DIR = '/videos/intros'

export const MODULE_INTROS = Object.freeze({
  'restaurant-pos': {
    id: 'restaurant-pos',
    solutionSlug: 'pos',
    path: '/restaurant-pos',
    productName: 'Nexora Restaurant POS',
    accent: 'orange',
    duration: 28,
    posterT: 17.8,
    heading: 'Restaurant POS in 28 seconds',
    title: 'Nexora Restaurant POS in 28 seconds',
    description: 'A 28 second tour of Nexora Restaurant POS: a live table map, an order sent to the kitchen display as a KOT, split bills, billing that keeps working offline and a daily sales report.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The rush', caption: 'Paper orders, shouting to the kitchen and wrong bills slow a busy floor down.' },
      { id: 'tables', start: 4.5, end: 11, title: 'Tables', caption: 'Free, occupied and waiting-for-bill tables show on one live floor map.' },
      { id: 'order', start: 11, end: 18.5, title: 'Order to kitchen', caption: 'Tap the items, see the total and send the KOT to the kitchen display.' },
      { id: 'split', start: 18.5, end: 23.5, title: 'Split bills and offline', caption: 'Split a bill any way you like. Billing keeps working when the internet drops.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
})

export const ALL_INTROS = Object.freeze(Object.values(MODULE_INTROS))
export const getIntro = (id) => MODULE_INTROS[id] || null
export const introForPath = (path) => ALL_INTROS.find((intro) => intro.path === path) || null
export const introForSlug = (slug) => ALL_INTROS.find((intro) => intro.solutionSlug === slug) || null

export const introFiles = (id) => ({
  mp4: `${MODULE_INTRO_DIR}/${id}.mp4`,
  webm: `${MODULE_INTRO_DIR}/${id}.webm`,
  poster: `${MODULE_INTRO_DIR}/${id}-poster.jpg`,
})

export function introSchema(intro) {
  const files = introFiles(intro.id)
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${absoluteUrl(intro.path)}#intro-video`,
    name: intro.title,
    description: intro.description,
    thumbnailUrl: assetUrl(files.poster),
    contentUrl: assetUrl(files.mp4),
    uploadDate: MODULE_INTRO.uploadDate,
    duration: `PT${intro.duration}S`,
    width: MODULE_INTRO.width,
    height: MODULE_INTRO.height,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'Nexora Solution', url: absoluteUrl('/') },
  }
}
