import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight } from 'react-icons/hi2'
import { NEXORA_PRODUCTS } from '../../lib/nexoraProducts.js'

/**
 * "Everything Nexora makes" — one list of every product and service, shown on
 * each themed landing page so a visitor from any city can see the whole range.
 * Colours come from the page's own theme, so it never looks pasted in.
 */

/**
 * @param {{ theme: { bg?: string, card?: string, border: string, accent: string, heading: string, body: string, serif?: object, eyebrow?: string }, heading?: string, intro?: string }} props
 */
export default function AllProducts({ theme, heading = 'Everything Nexora makes', intro = 'One company, one login for the platform modules, plus custom software and free tools. Pick what fits and add more later.' }) {
  const serif = theme.serif || {}
  return (
    <section className="py-16 sm:py-20" style={{ backgroundColor: theme.bg || 'transparent' }} aria-labelledby="all-nexora-products">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accent }}>All products</p>
          <h2 id="all-nexora-products" className="mx-auto mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl" style={{ ...serif, color: theme.heading }}>{heading}</h2>
          <p className="mx-auto mt-5 max-w-3xl text-[16px] leading-[1.8]" style={{ color: theme.body }}>{intro}</p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NEXORA_PRODUCTS.map((p) => (
            <li key={p.to}>
              <Link
                to={p.to}
                className="group flex h-full flex-col rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{ borderColor: theme.border, backgroundColor: theme.card || '#fff' }}
              >
                <span className="text-[16px] font-bold" style={{ ...serif, color: theme.heading }}>{p.label}</span>
                <span className="mt-1.5 flex-1 text-[13.5px] leading-[1.7]" style={{ color: theme.body }}>{p.text}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2" style={{ color: theme.accent }}>
                  Explore <HiOutlineArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
