import { Link } from 'react-router-dom'
import { canonicalPath } from '../lib/seoStructuredData.js'

const EXTERNAL_OR_SPECIAL = /^([a-z][a-z0-9+.-]*:)?\/\//i

// Every internal navigation link should render an <a href> that is already
// the page's final, canonical, trailing-slash path — the same one
// absoluteUrl()/canonicalPath() build for <link rel="canonical"> — so a
// crawler following it never needs a 307 hop, and the prerendered HTML never
// ships a redirecting href. Wrapping react-router's Link here means every
// caller gets that for free instead of re-normalizing (or forgetting to)
// at each call site.
export default function AppLink({ to, ...props }) {
  const isNormalizable = typeof to === 'string' && !EXTERNAL_OR_SPECIAL.test(to)
    && !to.startsWith('mailto:') && !to.startsWith('tel:') && !to.startsWith('#')
  return <Link to={isNormalizable ? canonicalPath(to) : to} {...props} />
}
