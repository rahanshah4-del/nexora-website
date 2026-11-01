import PageSkeleton from '../../../components/PageSkeleton.jsx'

/**
 * The loading screen for auth, workspace and app routes. It used to be its own logo/progress-bar card;
 * it now renders the same shimmer skeleton as the rest of the website. `stage` and `businessType` are
 * accepted so existing callers keep working, but the skeleton has no text to vary.
 */
export default function PageLoader() {
  return <PageSkeleton />
}
