/**
 * The footer link groups of the prerendered static HTML (scripts/prerender.mjs):
 * the crawlable twin of src/pages/public/PublicFooter.jsx. Both read
 * src/lib/footerColumns.js, so they cannot drift apart. The "Free Tools" group
 * appears only once the tools are launched (src/lib/toolsLaunch.js); tests pass
 * `toolsLaunched` to check both states.
 */
import { TOOLS_LAUNCHED } from '../../src/lib/toolsLaunch.js'
import { footerColumns } from '../../src/lib/footerColumns.js'

/** [{ heading, links: [[label, path]] }] for the given launch state. */
export function footerLinkGroups(toolsLaunched = TOOLS_LAUNCHED) {
  return footerColumns(toolsLaunched)
}
