import Link from '../../components/AppLink.jsx'
import RelatedBlogSection from '../../components/RelatedBlogSection.jsx'
import { PILLAR_BLOG_TOPICS } from '../../lib/relatedBlog.js'
import PageSeo from '../../components/PageSeo.jsx'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'
import { PILLARS, featurePages } from '../../lib/featurePagesData.js'
import { HiOutlineCheck, HiOutlineChevronRight } from 'react-icons/hi2'
import './featurePageApple.css'

const sectionId = (heading) => heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Drawn product illustration (decorative, so hidden from assistive tech and crawlers). */
function Mock({ kind }) {
  if (kind === 'offline') {
    return (
      <figure className="ap-mock" aria-hidden="true">
        <div className="ap-mock-top">
          <span className="ap-dot is-off" /> <b>Counter 1</b>
          <span className="ap-pill is-warn">Offline</span>
        </div>
        <ul className="ap-mock-list">
          <li><span>Order #1042 · Table 4</span><em>Saved on device</em></li>
          <li><span>Order #1043 · Takeaway</span><em>Saved on device</em></li>
          <li><span>Order #1044 · Delivery</span><em>Saved on device</em></li>
        </ul>
        <div className="ap-mock-sync"><i /><span>Connection back · syncing 3 orders</span></div>
        <figcaption>Illustration with example orders</figcaption>
      </figure>
    )
  }
  return (
    <figure className="ap-mock" aria-hidden="true">
      <div className="ap-mock-top">
        <b>Quick bill</b>
        <span className="ap-pill">Counter</span>
      </div>
      <div className="ap-chips"><span className="is-on">Food</span><span>Drink</span><span>Combo</span><span>Add-on</span></div>
      <ul className="ap-mock-list">
        <li><span>2 × Zinger combo</span><em>Combo</em></li>
        <li><span>1 × Iced latte</span><em>Drink</em></li>
        <li><span>1 × Extra shot</span><em>Add-on</em></li>
      </ul>
      <div className="ap-mock-total"><span>Takeaway</span><b>Bill</b></div>
      <figcaption>Illustration with example items</figcaption>
    </figure>
  )
}

/** Apple-style layout for feature pages that set `design: 'apple'` in featurePagesData.js. Same data, light and spacious. */
export default function FeaturePageApple({ slug }) {
  const page = featurePages[slug]
  if (!page) return null
  const pillar = PILLARS[page.pillar]
  const path = `/${slug}`
  const sibling = page.sibling ? featurePages[page.sibling] : null
  const moreLinks = Object.entries(featurePages)
    .filter(([key, p]) => p.pillar === page.pillar && key !== slug)
    .slice(0, 6)

  return (
    <PublicPageShell backTo={pillar.to} backLabel={`Back to ${pillar.label}`} badge={page.badge} badgeIcon={page.icon}>
      <PageSeo
        title={page.seoTitle}
        description={page.seoDescription}
        canonical={absoluteUrl(path)}
        path={path}
        keywords={page.keyword}
        ogTitle={page.seoTitle}
        ogDescription={page.seoDescription}
        twitterCard="summary_large_image"
        faqItems={(page.faqs || []).map(([question, answer]) => ({ question, answer }))}
        softwareApplication={{ name: pillar.productName, applicationCategory: 'BusinessApplication', operatingSystem: 'Windows, Web' }}
      />
      <div className="ap-page">
        <header className="ap-hero">
          <nav aria-label="Breadcrumb" className="ap-crumbs">
            <Link to="/">Home</Link><HiOutlineChevronRight aria-hidden="true" />
            <Link to={pillar.to}>{pillar.label}</Link><HiOutlineChevronRight aria-hidden="true" />
            <span aria-current="page">{page.badge}</span>
          </nav>
          <p className="ap-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="ap-lead">{page.intro}</p>
          <div className="ap-cta">
            <Link to="/signup" className="ap-btn">Start free trial</Link>
            <Link to="/pricing" className="ap-link">View pricing <HiOutlineChevronRight aria-hidden="true" /></Link>
          </div>
          {page.mock ? <Mock kind={page.mock} /> : null}
        </header>

        <section className="ap-block ap-tint" aria-label="At a glance">
          <div className="ap-wrap">
            <div className="ap-bento">
              {page.capabilities.map(([title, text, CapIcon]) => (
                <article key={title}>
                  <span className="ap-ico"><CapIcon aria-hidden="true" /></span>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {page.steps?.length ? (
          <section className="ap-block" aria-labelledby="ap-steps-title">
            <div className="ap-wrap">
              <h2 id="ap-steps-title" className="ap-h2">How it works</h2>
              <ol className="ap-steps">
                {page.steps.map(([title, text], i) => (
                  <li key={title}>
                    <span className="ap-num">{i + 1}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {page.sections.map((sec, i) => (
          <section key={sec.heading} id={sectionId(sec.heading)} className={`ap-block ${i % 2 === 0 ? 'ap-tint' : ''}`}>
            <div className="ap-wrap ap-read">
              <h2 className="ap-h2">{sec.heading}</h2>
              {sec.paragraphs.map((text) => <p key={text.slice(0, 40)} className="ap-p">{text}</p>)}
              {sec.bullets ? (
                <ul className="ap-checks">
                  {sec.bullets.map((b) => <li key={b}><HiOutlineCheck aria-hidden="true" /><span>{b}</span></li>)}
                </ul>
              ) : null}
              {sec.links ? (
                <p className="ap-links">
                  {sec.links.map((l) => <Link key={l.to} to={l.to} className="ap-link">{l.text} <HiOutlineChevronRight aria-hidden="true" /></Link>)}
                </p>
              ) : null}
            </div>
          </section>
        ))}

        {page.compare ? (
          <section className="ap-block" aria-labelledby="ap-compare-title">
            <div className="ap-wrap">
              <h2 id="ap-compare-title" className="ap-h2">{page.compare.heading}</h2>
              <div className="ap-table-wrap">
                <table className="ap-table">
                  <caption className="sr-only">{page.compare.heading}</caption>
                  <thead>
                    <tr>{page.compare.columns.map((c, i) => <th key={c || 'blank'} scope="col" className={i === 2 ? 'is-us' : ''}>{c || <span className="sr-only">Situation</span>}</th>)}</tr>
                  </thead>
                  <tbody>
                    {page.compare.rows.map(([label, a, b]) => (
                      <tr key={label}><th scope="row">{label}</th><td>{a}</td><td className="is-us">{b}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {page.faqs?.length ? (
          <section className="ap-block ap-tint" aria-labelledby="feature-faq-title">
            <div className="ap-wrap ap-read">
              <h2 id="feature-faq-title" className="ap-h2">Frequently asked questions</h2>
              <div className="ap-faq">
                {page.faqs.map(([q, a]) => (
                  <details key={q}>
                    <summary><h3>{q}</h3><span aria-hidden="true" /></summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="ap-block" aria-labelledby="ap-more-title">
          <div className="ap-wrap">
            <h2 id="ap-more-title" className="ap-h2">Keep exploring {pillar.productName}</h2>
            <ul className="ap-more">
              <li><Link to={pillar.to}><b>{pillar.label}</b><span>The full product overview</span></Link></li>
              {moreLinks.map(([key, p]) => (
                <li key={key}><Link to={`/${key}`}><b>{p.badge}</b><span>{p.title}</span></Link></li>
              ))}
            </ul>
          </div>
        </section>

        <RelatedBlogSection topics={PILLAR_BLOG_TOPICS[page.pillar] || []} />

        <section className="ap-final">
          <h2>Try it on your own counter.</h2>
          <p>{sibling ? <>Every module has a free one-month trial. Next, see <Link to={`/${page.sibling}`}>{sibling.badge}</Link>.</> : 'Every module has a free one-month trial.'}</p>
          <div className="ap-cta">
            <Link to="/signup" className="ap-btn">Start free trial</Link>
            <Link to="/contact" className="ap-link">Talk to us <HiOutlineChevronRight aria-hidden="true" /></Link>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
