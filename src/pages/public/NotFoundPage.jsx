import Link from '../../components/AppLink.jsx'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineChatBubbleLeftRight,
  HiOutlineMagnifyingGlass,
  HiOutlineSparkles,
  HiOutlineUsers,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'

/**
 * 404 catch-all page for unknown/stale paths (e.g. bare /bn, /hi).
 * Replaces the old <Navigate to="/"> so those URLs return a real 404
 * (noindex) instead of silently redirecting to the homepage — which
 * Google was flagging as "Page with redirect".
 *
 * Visual: a dark "signal lost" scene — drifting aurora orbs, a faint grid,
 * a glowing 404 whose zero is a radar sweep, and quick links to the places
 * people most often want. Pure CSS animation; all of it stops for visitors
 * who prefer reduced motion.
 */

const QUICK_LINKS = [
  { to: '/restaurant-pos', label: 'Restaurant POS', text: 'KOT, tables and billing', Icon: HiOutlineBuildingStorefront },
  { to: '/retail-pos', label: 'Retail POS', text: 'Barcode billing and stock', Icon: HiOutlineBanknotes },
  { to: '/crm', label: 'CRM', text: 'Leads, customers, invoices', Icon: HiOutlineUsers },
  { to: '/whatsapp-crm', label: 'WhatsApp CRM', text: 'Chats into follow-ups', Icon: HiOutlineChatBubbleLeftRight },
  { to: '/tools', label: 'Free tools', text: 'Invoices and quotations', Icon: HiOutlineWrenchScrewdriver },
  { to: '/ai', label: 'Nexora AI', text: 'AI inside every module', Icon: HiOutlineSparkles },
]

const CSS = `
.nf-root{position:relative;isolation:isolate;overflow:hidden;background:#050b1a;color:#e6ecff}
.nf-grid{position:absolute;inset:0;z-index:-2;opacity:.5;background-image:linear-gradient(rgba(120,140,255,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(120,140,255,.09) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse at 50% 35%,#000 20%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 35%,#000 20%,transparent 72%);animation:nf-grid 22s linear infinite}
.nf-orb{position:absolute;z-index:-1;border-radius:9999px;filter:blur(70px);opacity:.55;will-change:transform}
.nf-orb-a{width:420px;height:420px;left:-120px;top:-80px;background:#5b5bff;animation:nf-float-a 16s ease-in-out infinite}
.nf-orb-b{width:380px;height:380px;right:-100px;top:60px;background:#a24bff;animation:nf-float-b 19s ease-in-out infinite}
.nf-orb-c{width:320px;height:320px;left:35%;bottom:-160px;background:#1ec8ff;opacity:.35;animation:nf-float-c 21s ease-in-out infinite}
.nf-code{display:flex;align-items:center;justify-content:center;gap:clamp(.25rem,2vw,1.25rem);font-weight:900;line-height:1;letter-spacing:-.04em;font-size:clamp(5.5rem,22vw,13rem)}
.nf-digit{background:linear-gradient(180deg,#fff 0%,#a9b8ff 55%,#6b6bff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 28px rgba(110,110,255,.45));animation:nf-rise .9s cubic-bezier(.2,.8,.2,1) both}
.nf-digit-2{animation-delay:.25s}
.nf-ring{position:relative;display:inline-block;width:.78em;height:.78em;border-radius:9999px;border:.07em solid rgba(160,175,255,.75);box-shadow:0 0 40px rgba(110,110,255,.5),inset 0 0 40px rgba(110,110,255,.25);animation:nf-rise .9s cubic-bezier(.2,.8,.2,1) .12s both,nf-pulse 3.2s ease-in-out 1s infinite}
.nf-ring::before{content:"";position:absolute;inset:0;border-radius:9999px;background:conic-gradient(from 0deg,rgba(130,150,255,0) 0deg,rgba(130,150,255,0) 250deg,rgba(150,170,255,.85) 360deg);animation:nf-spin 3.4s linear infinite}
.nf-ring::after{content:"";position:absolute;left:50%;top:50%;width:.09em;height:.09em;margin:-.045em 0 0 -.045em;border-radius:9999px;background:#fff;box-shadow:0 0 14px 3px rgba(190,200,255,.9)}
.nf-blip{position:absolute;width:.05em;height:.05em;border-radius:9999px;background:#7df9ff;box-shadow:0 0 10px 2px rgba(125,249,255,.8);animation:nf-blip 3.4s ease-in-out infinite}
.nf-fade{animation:nf-fade .8s ease-out both}
.nf-d1{animation-delay:.3s}.nf-d2{animation-delay:.45s}.nf-d3{animation-delay:.6s}.nf-d4{animation-delay:.75s}
.nf-card{position:relative;display:flex;gap:.9rem;align-items:center;padding:.95rem 1.05rem;border-radius:1rem;border:1px solid rgba(150,165,255,.18);background:rgba(255,255,255,.04);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:transform .25s ease,border-color .25s ease,background .25s ease,box-shadow .25s ease}
.nf-card:hover,.nf-card:focus-visible{transform:translateY(-3px);border-color:rgba(160,175,255,.55);background:rgba(255,255,255,.08);box-shadow:0 14px 34px -16px rgba(100,110,255,.7);outline:none}
.nf-card:hover .nf-arrow,.nf-card:focus-visible .nf-arrow{transform:translateX(4px);opacity:1}
.nf-arrow{margin-left:auto;opacity:.45;transition:transform .25s ease,opacity .25s ease}
.nf-search{display:flex;align-items:center;gap:.6rem;padding:.35rem .4rem .35rem 1.1rem;border-radius:9999px;border:1px solid rgba(150,165,255,.3);background:rgba(255,255,255,.06);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:border-color .2s ease,box-shadow .2s ease}
.nf-search:focus-within{border-color:rgba(170,185,255,.8);box-shadow:0 0 0 4px rgba(110,110,255,.22)}
.nf-input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font-size:.95rem;padding:.55rem 0}
.nf-input::placeholder{color:rgba(200,210,255,.55)}
.nf-btn-primary{position:relative;display:inline-flex;min-height:46px;align-items:center;gap:.5rem;padding:0 1.5rem;border-radius:9999px;font-size:.875rem;font-weight:600;color:#fff;background:linear-gradient(135deg,#5b5bff,#a24bff);box-shadow:0 10px 28px -10px rgba(120,90,255,.9);overflow:hidden;transition:transform .2s ease,box-shadow .2s ease}
.nf-btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 34px -10px rgba(120,90,255,1)}
.nf-btn-primary::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.35) 50%,transparent 65%);transform:translateX(-120%);animation:nf-shine 4.5s ease-in-out 1.5s infinite}
.nf-btn-ghost{display:inline-flex;min-height:46px;align-items:center;gap:.5rem;padding:0 1.5rem;border-radius:9999px;font-size:.875rem;font-weight:600;color:#dfe5ff;border:1px solid rgba(150,165,255,.3);background:rgba(255,255,255,.04);transition:background .2s ease,border-color .2s ease,transform .2s ease}
.nf-btn-ghost:hover{background:rgba(255,255,255,.1);border-color:rgba(170,185,255,.6);transform:translateY(-2px)}
.nf-path{display:inline-flex;max-width:100%;align-items:center;gap:.5rem;padding:.4rem .85rem;border-radius:.6rem;border:1px solid rgba(150,165,255,.2);background:rgba(8,14,34,.7);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.78rem;color:#aab6ff}
.nf-path b{font-weight:600;color:#ff8fa3}
.nf-caret{display:inline-block;width:.45em;height:1em;background:#aab6ff;animation:nf-blink 1s steps(1) infinite}
@keyframes nf-rise{from{opacity:0;transform:translateY(28px) scale(.94)}to{opacity:1;transform:none}}
@keyframes nf-fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes nf-spin{to{transform:rotate(360deg)}}
@keyframes nf-pulse{0%,100%{box-shadow:0 0 40px rgba(110,110,255,.5),inset 0 0 40px rgba(110,110,255,.25)}50%{box-shadow:0 0 64px rgba(130,120,255,.8),inset 0 0 52px rgba(110,110,255,.4)}}
@keyframes nf-blip{0%,100%{opacity:0;transform:scale(.4)}40%{opacity:1;transform:scale(1)}70%{opacity:.2}}
@keyframes nf-grid{to{background-position:56px 56px,56px 56px}}
@keyframes nf-float-a{0%,100%{transform:translate(0,0)}50%{transform:translate(90px,60px)}}
@keyframes nf-float-b{0%,100%{transform:translate(0,0)}50%{transform:translate(-80px,70px)}}
@keyframes nf-float-c{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-60px)}}
@keyframes nf-shine{0%,60%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@keyframes nf-blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){
  .nf-root *,.nf-root *::before,.nf-root *::after{animation:none!important;transition:none!important}
}
`

export default function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const lost = `${location?.pathname || '/'}`.slice(0, 80)

  const onSearch = (event) => {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <PublicPageShell>
      <PageSeo
        title="Page Not Found | Nexora Solution"
        description="The page you requested could not be found. Visit the Nexora Solution homepage, pricing or contact pages."
        robots="noindex,nofollow"
      />
      <style>{CSS}</style>
      <section className="nf-root">
        <div className="nf-grid" aria-hidden="true" />
        <div className="nf-orb nf-orb-a" aria-hidden="true" />
        <div className="nf-orb nf-orb-b" aria-hidden="true" />
        <div className="nf-orb nf-orb-c" aria-hidden="true" />

        <div className="mx-auto max-w-4xl px-5 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28">
          <p className="nf-fade text-xs font-extrabold uppercase tracking-[0.28em]" style={{ color: '#8f9cff' }}>Error 404 · Signal lost</p>

          <div className="nf-code mt-5" role="img" aria-label="404">
            <span className="nf-digit" aria-hidden="true">4</span>
            <span className="nf-ring" aria-hidden="true">
              <i className="nf-blip" style={{ left: '66%', top: '28%' }} />
              <i className="nf-blip" style={{ left: '30%', top: '62%', animationDelay: '1.1s' }} />
            </span>
            <span className="nf-digit nf-digit-2" aria-hidden="true">4</span>
          </div>

          <h1 className="nf-fade nf-d1 mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">This page drifted off the map</h1>
          <p className="nf-fade nf-d2 mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: '#aab4de' }}>
            The page you requested doesn&rsquo;t exist or may have moved. Search for what you need, or jump to one of the places below.
          </p>

          <p className="nf-fade nf-d2 mt-5">
            <span className="nf-path" title={lost}>
              <span aria-hidden="true">$</span>
              <span className="truncate">GET <b>{lost}</b> → 404</span>
              <span className="nf-caret" aria-hidden="true" />
            </span>
          </p>

          <form onSubmit={onSearch} role="search" className="nf-fade nf-d3 mx-auto mt-8 max-w-xl">
            <div className="nf-search">
              <HiOutlineMagnifyingGlass className="h-5 w-5 shrink-0" style={{ color: '#9aa7ff' }} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, tools and guides"
                aria-label="Search Nexora"
                className="nf-input"
              />
              <button type="submit" className="nf-btn-primary">Search</button>
            </div>
          </form>

          <div className="nf-fade nf-d3 mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="nf-btn-primary">Go to Homepage <HiOutlineArrowRight className="text-lg" /></Link>
            <Link to="/pricing" className="nf-btn-ghost">View Pricing</Link>
            <Link to="/contact" className="nf-btn-ghost">Contact Us</Link>
          </div>

          <div className="nf-fade nf-d4 mt-14 text-left">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: '#7f8cc9' }}>Popular destinations</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_LINKS.map(({ to, label, text, Icon }) => (
                <li key={to}>
                  <Link to={to} className="nf-card">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(91,91,255,.35),rgba(162,75,255,.35))', color: '#dfe5ff' }}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-white">{label}</span>
                      <span className="block truncate text-[12.5px]" style={{ color: '#97a3d6' }}>{text}</span>
                    </span>
                    <HiOutlineArrowRight className="nf-arrow h-4 w-4 shrink-0" style={{ color: '#aab6ff' }} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
