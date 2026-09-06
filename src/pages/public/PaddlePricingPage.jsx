import { useCallback, useEffect, useRef, useState } from 'react'
import Link from '../../components/AppLink.jsx'
import { useNavigate } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineCloud,
  HiOutlineDocumentChartBar,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import { initializePaddle } from '@paddle/paddle-js'

/* ───────────────────────────────────────────
   TIER CONFIGURATION — edit these to match
   your Paddle catalog. Price IDs come from
   Paddle after creating products & prices.
   ─────────────────────────────────────────── */

/**
 * @typedef {Object} Tier
 * @property {'Starter'|'Pro'|'Advanced'} name
 * @property {string} description
 * @property {string[]} features
 * @property {{ month: string, year: string }} priceId — Paddle price IDs (pri_...)
 * @property {boolean} [recommended]
 * @property {string} [tone] — Tailwind gradient classes
 */
const TIERS = [
  {
    name: 'Starter',
    description: 'Perfect for small businesses getting started with digital operations.',
    features: [
      'Choose any 1 Nexora module',
      'Up to 2 team members',
      '5 GB cloud storage',
      'Dashboard & reports',
      'Email support',
      'Free updates',
      '1-month free trial',
    ],
    priceId: {
      month: '', // ← Replace with Paddle monthly price ID (pri_...)
      year: '',  // ← Replace with Paddle yearly price ID (pri_...)
    },
    tone: 'from-sky-600 to-indigo-500',
    recommended: false,
  },
  {
    name: 'Pro',
    description: 'For growing businesses that need more modules, users, and priority support.',
    features: [
      'Choose any 1 Nexora module',
      'Up to 5 team members',
      '20 GB cloud storage',
      'Priority support',
      'Dashboard & reports',
      'Free updates',
      '1-month free trial',
    ],
    priceId: {
      month: '', // ← Replace with Paddle monthly price ID (pri_...)
      year: '',  // ← Replace with Paddle yearly price ID (pri_...)
    },
    tone: 'from-violet-600 to-purple-500',
    recommended: true,
  },
  {
    name: 'Advanced',
    description: 'Unlimited everything — built for large teams and enterprise operations.',
    features: [
      'All Nexora modules',
      'Unlimited team members',
      'Custom cloud storage',
      'Dedicated support',
      'Custom integrations',
      'Custom development',
      '1-month free trial',
    ],
    priceId: {
      month: '', // ← Replace with Paddle monthly price ID (pri_...)
      year: '',  // ← Replace with Paddle yearly price ID (pri_...)
    },
    tone: 'from-amber-600 to-orange-500',
    recommended: false,
  },
]

/* ───────────────────────────────────────────
   ENVIRONMENT — never silently defaults
   ─────────────────────────────────────────── */
const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENVIRONMENT
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN
const PAYMENTS_WORKER_URL =
  import.meta.env.VITE_PAYMENTS_WORKER_URL ||
  'https://nexora-payments-api.rahanshah4.workers.dev'

const toneMap = {
  'from-sky-600 to-indigo-500': 'sky',
  'from-violet-600 to-purple-500': 'violet',
  'from-amber-600 to-orange-500': 'amber',
}

const toneBadge = {
  sky: 'bg-sky-100/80 text-sky-700',
  violet: 'bg-violet-100/80 text-violet-700',
  amber: 'bg-amber-100/80 text-amber-700',
}

/* ───────────────────────────────────────────
   PADDLE PRICING PAGE
   ─────────────────────────────────────────── */
export default function PaddlePricingPage() {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState('month')
  const [countryCode, setCountryCode] = useState(null) // null = let Paddle auto-detect
  const [paddleReady, setPaddleReady] = useState(false)
  const [prices, setPrices] = useState({}) // { 'pri_xxx': { formattedTotals } }
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null) // which tier is loading
  const [error, setError] = useState('')
  const paddleRef = useRef(null) // Paddle instance
  const initRef = useRef(false)
  const seo = getSeoForPath('/pricing')

  /* ── Validate environment ── */
  if (!PADDLE_CLIENT_TOKEN) {
    throw new Error(
      'VITE_PADDLE_CLIENT_TOKEN is not set. ' +
      'Create a client-side token in the Paddle Dashboard and add it to your .env file.'
    )
  }
  if (!PADDLE_ENV) {
    throw new Error(
      'VITE_PADDLE_ENVIRONMENT is not set. ' +
      'Set it to "sandbox" or "production" in your .env file.'
    )
  }

  /* ── Detect country from Cloudflare Worker ── */
  useEffect(() => {
    let cancelled = false
    fetch(`${PAYMENTS_WORKER_URL}/api/client-ip`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.country) {
          setCountryCode(data.country)
        }
      })
      .catch(() => { /* auto-detect fallback */ })
    return () => { cancelled = true }
  }, [])

  /* ── Initialize Paddle.js ── */
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    initializePaddle({
      environment: PADDLE_ENV,
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          navigate('/welcome')
        }
      },
    }).then((instance) => {
      if (instance) {
        paddleRef.current = instance
        setPaddleReady(true)
      }
    }).catch((err) => {
      console.error('Paddle init failed:', err)
      setError('Failed to initialize Paddle checkout. Please refresh the page.')
    })
  }, [navigate])

  /* ── Fetch prices with PricePreview ── */
  const fetchPrices = useCallback(async () => {
    if (!paddleReady || !paddleRef.current?.PricePreview) return
    setLoadingPrices(true)

    const priceIds = TIERS.flatMap((t) =>
      billingCycle === 'month'
        ? [t.priceId.month]
        : [t.priceId.year]
    ).filter(Boolean)

    if (priceIds.length === 0) {
      setLoadingPrices(false)
      return
    }

    try {
      const query = { items: priceIds.map((id) => ({ priceId: id, quantity: 1 })) }
      // Only pass countryCode if we have a real ISO code
      if (countryCode && countryCode !== 'OTHERS') {
        query.customer = { countryCode }
      }

      const result = await paddleRef.current.PricePreview(query)
      if (result?.data?.details?.lineItems) {
        const map = {}
        for (const item of result.data.details.lineItems) {
          map[item.price?.id] = {
            formattedTotals: item.formattedTotals,
          }
        }
        setPrices(map)
      }
    } catch (err) {
      console.error('PricePreview failed:', err)
    } finally {
      setLoadingPrices(false)
    }
  }, [paddleReady, billingCycle, countryCode])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  /* ── Open checkout ── */
  const openCheckout = useCallback(
    async (tier) => {
      if (!paddleReady || !paddleRef.current?.Checkout) return
      setCheckoutLoading(tier.name)

      const priceId = billingCycle === 'month' ? tier.priceId.month : tier.priceId.year
      if (!priceId) {
        setError('Price ID not configured for this tier.')
        setCheckoutLoading(null)
        return
      }

      try {
        paddleRef.current.Checkout.open({
          settings: {
            displayMode: 'overlay',
            variant: 'one-page',
            theme: 'light',
          },
          items: [{ priceId, quantity: 1 }],
          customer: {
            // Prefill email if available from auth context
            ...(countryCode && countryCode !== 'OTHERS' ? { countryCode } : {}),
          },
        })
      } catch (err) {
        console.error('Checkout error:', err)
        setError('Failed to open checkout. Please try again.')
      } finally {
        setCheckoutLoading(null)
      }
    },
    [paddleReady, billingCycle, countryCode]
  )

  /* ── Derived display ── */
  const tiersWithPrices = TIERS.map((tier) => {
    const pid = billingCycle === 'month' ? tier.priceId.month : tier.priceId.year
    const priceData = pid ? prices[pid] : null
    return {
      ...tier,
      priceId: pid,
      formattedTotal: priceData?.formattedTotals?.total || null,
      formattedSubtotal: priceData?.formattedTotals?.subtotal || null,
    }
  })

  const noPriceIds = TIERS.every((t) => !t.priceId.month && !t.priceId.year)

  return (
    <PublicPageShell>
      <PageSeo {...seo} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-14 pt-16 sm:pb-18 sm:pt-22 lg:pb-22 lg:pt-26">
        <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
            <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
            Nexora Plans
          </span>
          <h1 className="mx-auto mt-5 max-w-5xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
            Start free, then pick the{' '}
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              plan that fits.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-500 sm:text-lg">
            Every plan includes a 1-month free trial. No credit card charged until trial ends.
            Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="inline-flex rounded-full border border-slate-200/60 bg-white/70 p-1 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              {[
                { key: 'month', label: 'Monthly' },
                { key: 'year', label: 'Yearly (Save ~17%)' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBillingCycle(key)}
                  className={`min-h-[38px] rounded-full px-5 text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 ${
                    billingCycle === key
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.2)]'
                      : 'text-slate-500 hover:text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {countryCode && (
              <span className="text-[11px] font-medium text-slate-400">
                Prices shown for {countryCode === 'GBR' ? '🇬🇧 UK' : countryCode === 'IRL' ? '🇮🇪 Ireland' : countryCode === 'AUS' ? '🇦🇺 Australia' : countryCode === 'USA' ? '🇺🇸 US' : countryCode}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Tier Cards ── */}
      <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          {error && (
            <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-rose-200/60 bg-rose-50 px-5 py-3 text-center text-[13px] font-semibold text-rose-700">
              {error}
            </div>
          )}

          {noPriceIds && (
            <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-amber-200/60 bg-amber-50 px-5 py-4 text-center">
              <p className="text-[14px] font-semibold text-amber-800">⚙️ Price IDs not configured</p>
              <p className="mt-1 text-[12px] text-amber-600">
                Add your Paddle price IDs (<code className="bg-amber-100 px-1 rounded">pri_...</code>) to the <code className="bg-amber-100 px-1 rounded">TIERS</code> config in <strong>PaddlePricingPage.jsx</strong>.
              </p>
            </div>
          )}

          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiersWithPrices.map((tier) => {
              const popular = tier.recommended
              const checkoutIdle = checkoutLoading !== tier.name
              const isThisLoading = checkoutLoading === tier.name
              const hasPrice = Boolean(tier.formattedTotal)

              return (
                <article
                  key={tier.name}
                  className={`relative flex flex-col overflow-hidden rounded-[1.35rem] border bg-white p-6 transition-all duration-300 hover:-translate-y-1 ${
                    popular
                      ? 'border-violet-200/70 ring-1 ring-violet-100/60 shadow-[0_12px_36px_-14px_rgba(139,92,246,0.18)] hover:shadow-[0_20px_48px_-18px_rgba(139,92,246,0.25)]'
                      : 'border-slate-200/60 shadow-[0_4px_24px_-10px_rgba(15,23,42,0.08)] hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.16)]'
                  }`}
                >
                  {popular && (
                    <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-violet-50 to-fuchsia-50 opacity-60 blur-xl" />
                  )}
                  {popular && (
                    <div className="relative mb-3 flex justify-center">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-[0.65rem] font-medium tracking-[-0.01em] text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <h2 className={`relative text-xl font-medium tracking-[-0.02em] ${popular ? 'text-violet-700' : 'text-slate-900'}`}>
                    {tier.name}
                  </h2>
                  <p className="relative mt-2 text-[13px] leading-[1.6] text-slate-500">
                    {tier.description}
                  </p>

                  {/* Price — Paddle's formatted string, no math */}
                  <div className="relative mt-5 text-center">
                    {loadingPrices ? (
                      <div className="h-10 w-24 mx-auto rounded-lg bg-slate-100 animate-pulse" />
                    ) : hasPrice ? (
                      <>
                        <p className="text-3xl font-medium tracking-[-0.02em] text-slate-900 sm:text-4xl">
                          {tier.formattedTotal}
                        </p>
                        {tier.formattedSubtotal && tier.formattedSubtotal !== tier.formattedTotal && (
                          <p className="mt-1 text-[12px] text-slate-400 line-through">
                            {tier.formattedSubtotal}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-2xl font-medium text-slate-300">—</p>
                    )}
                    <p className="mt-1 text-[13px] text-slate-400">
                      {billingCycle === 'month' ? 'per month' : 'per year'} &middot; 1-month free trial
                    </p>
                  </div>

                  {/* Features */}
                  <div className="relative mt-5 flex-1 space-y-2.5">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5 text-[13px] text-slate-500">
                        <HiOutlineCheckCircle className="mt-0.5 h-[17px] w-[17px] shrink-0 text-slate-400" />
                        <span className="leading-[1.55]">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Subscribe button */}
                  <button
                    type="button"
                    disabled={!paddleReady || isThisLoading || !tier.priceId}
                    onClick={() => openCheckout(tier)}
                    className={`relative mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full px-5 text-sm font-medium tracking-[-0.01em] transition-all duration-200 active:scale-[0.97] ${
                      popular
                        ? 'bg-slate-900 text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)]'
                        : 'border border-slate-200/60 bg-white text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                  >
                    {isThisLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                        Opening...
                      </>
                    ) : !tier.priceId ? (
                      'Configure Price ID'
                    ) : (
                      <>
                        Subscribe
                        <HiOutlineArrowRight className="h-[15px] w-[15px]" />
                      </>
                    )}
                  </button>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[1.8rem] border border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-4 flex gap-2.5 text-slate-400">
              <HiOutlineUserGroup className="h-7 w-7" strokeWidth={1.5} />
              <HiOutlineDocumentChartBar className="h-7 w-7" strokeWidth={1.5} />
            <HiOutlineCloud className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">
              Every plan starts with a 1-month free trial.
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-slate-500">
              No credit card charged until the trial ends. Cancel anytime from your account settings.
            </p>
          </div>
          <Link
            to="/signup"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]"
          >
            Start Free Trial
            <HiOutlineArrowRight className="h-[17px] w-[17px]" />
          </Link>
        </div>
      </section>
    </PublicPageShell>
  )
}
