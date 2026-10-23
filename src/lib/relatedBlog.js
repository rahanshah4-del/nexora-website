import { blogArticles } from './blogData.js'

/** Which blog categories belong with which module / tool page. Pure data. */
export const SOLUTION_BLOG_TOPICS = {
  pos: ['Restaurant POS'],
  'retail-pos': ['Retail POS'],
  'medical-store-pos': ['Pharmacy POS'],
  'school-erp': ['School ERP'],
  'transport-rental': ['Transport Software'],
  crm: ['CRM'],
  'whatsapp-crm': ['WhatsApp CRM', 'CRM'],
  'property-erp': ['Business Tips', 'CRM'],
  reports: ['Business Tips'],
  'reports-analytics': ['Business Tips', 'Technology'],
  'email-marketing': ['CRM', 'Business Tips'],
  'inventory-management': ['Retail POS', 'Business Tips'],
  'team-permissions': ['Business Tips', 'Technology'],
}

export const PILLAR_BLOG_TOPICS = {
  'restaurant-pos': ['Restaurant POS'],
  'retail-pos': ['Retail POS'],
  'pharmacy-pos': ['Pharmacy POS'],
  'school-erp': ['School ERP'],
  crm: ['CRM'],
  'transport-fleet': ['Transport Software'],
}

export function getToolBlogTopics(path = '') {
  if (path.includes('temp-mail')) return ['Technology', 'AI']
  if (path.includes('thermal')) return ['Retail POS', 'Restaurant POS']
  if (path.includes('quotation')) return ['CRM', 'Business Tips']
  return ['Business Tips', 'Retail POS']
}

/**
 * Up to `limit` posts: newest first within the wanted categories, then topped
 * up from the rest so the section never looks half empty.
 */
export function pickBlogPosts(categories = [], limit = 3, articles = blogArticles) {
  const wanted = new Set(categories)
  const byDate = (a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))
  const own = articles.filter((a) => wanted.has(a.category)).sort(byDate)
  const rest = articles.filter((a) => !wanted.has(a.category)).sort(byDate)
  return [...own, ...rest].slice(0, limit)
}
