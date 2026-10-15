/**
 * Product loop videos shown on the product pages (src/pages/public/SolutionPage.jsx).
 *
 * Each clip is a short, silent, looping animation of one workflow, drawn with
 * sample data by src/components/product/ProductClipStage.jsx and rendered to
 * public/videos/products/<id>.mp4 / .webm / -poster.jpg by
 * scripts/render-product-clips.mjs. They are illustrations, not recordings of a
 * customer's account, and the page says so.
 *
 * To add a clip: add an entry here, a scene in ProductClipStage.jsx, then run the
 * render script. `steps[].at` is the second the step becomes active.
 */
import { absoluteUrl, assetUrl } from './seoStructuredData.js'

export const PRODUCT_CLIP = Object.freeze({ width: 1280, height: 960, duration: 12, fps: 30, posterT: 9.5, uploadDate: '2026-10-14T09:00:00+05:00' })
export const PRODUCT_CAPTURE_PATH = '/product-clip-capture'
export const PRODUCT_VIDEO_DIR = '/videos/products'

export const PRODUCT_VIDEOS = Object.freeze({
  crm: {
    path: '/crm',
    productName: 'Nexora CRM',
    heading: 'See Nexora CRM at Work',
    intro: 'Three short loops show the everyday jobs: moving a deal, clearing follow-ups and billing a customer. They use sample data.',
    clips: [
      {
        id: 'crm-pipeline',
        title: 'Move every deal through one pipeline',
        description: 'A sales pipeline in Nexora CRM: a deal is dragged to the next stage and the stage totals update.',
        steps: [
          { at: 0, title: 'See every deal at a glance', text: 'Each opportunity is a card with the customer and the value, grouped by stage.' },
          { at: 3, title: 'Drag a deal to the next stage', text: 'Move a card when the conversation moves on, without opening a form.' },
          { at: 6.4, title: 'Stage totals update', text: 'The count and the value of each stage change straight away.' },
        ],
      },
      {
        id: 'crm-followups',
        title: 'Clear today\'s follow-ups',
        description: 'The follow-up list in Nexora CRM: tasks are ticked off, a new one is added and the due-today count changes.',
        steps: [
          { at: 0, title: 'See what is due today', text: 'Calls, quotes and visits are listed with the time and the customer.' },
          { at: 2.2, title: 'Tick it off when it is done', text: 'Finished follow-ups drop out of the due count.' },
          { at: 8.2, title: 'Add the next one', text: 'Plan the next follow-up while the customer is still on your mind.' },
        ],
      },
      {
        id: 'crm-invoice',
        title: 'Bill the customer from the CRM',
        description: 'Creating an invoice inside Nexora CRM: items are added, the invoice is sent and then marked paid.',
        steps: [
          { at: 0, title: 'Add the items', text: 'Pick the customer and list what they are paying for.' },
          { at: 5.4, title: 'Create and send', text: 'The invoice is created from the same record as the deal.' },
          { at: 8.4, title: 'Track the payment', text: 'The status moves from sent to paid, so sales and billing agree.' },
        ],
      },
    ],
  },
  pos: {
    path: '/restaurant-pos',
    productName: 'Nexora Restaurant POS',
    heading: 'See Nexora Restaurant POS at Work',
    intro: 'Three short loops show a busy counter: taking an order and sending the KOT, opening a table and closing the day. They use sample data.',
    clips: [
      {
        id: 'pos-billing',
        title: 'Take an order and send the KOT',
        description: 'Billing in Nexora Restaurant POS: items are tapped onto a table bill and the kitchen order ticket is sent.',
        steps: [
          { at: 0, title: 'Tap the items', text: 'Each tap adds the dish to the table\'s bill.' },
          { at: 5.4, title: 'Quantities and total', text: 'Repeat a tap to raise the quantity. The total follows.' },
          { at: 7.8, title: 'Send the KOT', text: 'One button sends the kitchen order ticket from the counter.' },
        ],
      },
      {
        id: 'pos-tables',
        title: 'See which tables are free',
        description: 'Table management in Nexora Restaurant POS: a free table is opened for an order and the counts change.',
        steps: [
          { at: 0, title: 'Read the floor at a glance', text: 'Free, occupied and waiting-for-bill tables have their own colours.' },
          { at: 2.8, title: 'Pick a free table', text: 'Tap a table to see its seats and status.' },
          { at: 5.4, title: 'Open the order', text: 'The table turns occupied and the counts update.' },
        ],
      },
      {
        id: 'pos-reports',
        title: 'Close the day with one report',
        description: 'The daily report in Nexora Restaurant POS: sales by order type, payments and cashiers.',
        steps: [
          { at: 0, title: 'Total sales for the day', text: 'One figure for everything sold across the shift.' },
          { at: 3, title: 'Split by order type', text: 'Dine-in, takeaway and delivery side by side.' },
          { at: 6.5, title: 'Payments and cashiers', text: 'See how it was paid and who rang it up.' },
        ],
      },
    ],
  },
})

export const clipFiles = (id) => ({
  mp4: `${PRODUCT_VIDEO_DIR}/${id}.mp4`,
  webm: `${PRODUCT_VIDEO_DIR}/${id}.webm`,
  poster: `${PRODUCT_VIDEO_DIR}/${id}-poster.jpg`,
})

export const ALL_CLIPS = Object.freeze(Object.values(PRODUCT_VIDEOS).flatMap((group) => group.clips))
export const getClip = (id) => ALL_CLIPS.find((clip) => clip.id === id) || null

/** One VideoObject per clip. */
export function productVideoSchemas(slug) {
  const group = PRODUCT_VIDEOS[slug]
  if (!group) return []
  return group.clips.map((clip) => ({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${absoluteUrl(group.path)}#video-${clip.id}`,
    name: `${clip.title} | ${group.productName}`,
    description: clip.description,
    thumbnailUrl: assetUrl(clipFiles(clip.id).poster),
    contentUrl: assetUrl(clipFiles(clip.id).mp4),
    uploadDate: PRODUCT_CLIP.uploadDate,
    duration: `PT${PRODUCT_CLIP.duration}S`,
    width: PRODUCT_CLIP.width,
    height: PRODUCT_CLIP.height,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'Nexora Solution', url: absoluteUrl('/') },
  }))
}
