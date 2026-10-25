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
  // No article about email or testing exists yet, so this page shows no blog section until one is written.
  if (path.includes('temp-mail')) return []
  if (path.includes('thermal')) return ['Retail POS', 'Restaurant POS']
  if (path.includes('quotation')) return ['CRM', 'Business Tips']
  return ['Business Tips', 'Retail POS']
}

/**
 * Up to `limit` posts from the wanted categories only, newest first. Nothing is
 * topped up from other categories: an unrelated article is worse than none, so a
 * page with no matching post simply shows no blog section.
 */
export function pickBlogPosts(categories = [], limit = 3, articles = blogArticles) {
  const wanted = new Set(categories)
  const byDate = (a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))
  return articles.filter((a) => wanted.has(a.category)).sort(byDate).slice(0, limit)
}
