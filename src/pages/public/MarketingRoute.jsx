import { useLocation } from 'react-router-dom'
import App from '../../App.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'

export default function MarketingRoute({ sectionId = '' }) {
  const location = useLocation()
  const seo = getSeoForPath(location.pathname)

  return (
    <>
      <PageSeo {...seo} />
      <App initialSectionId={sectionId} />
    </>
  )
}

