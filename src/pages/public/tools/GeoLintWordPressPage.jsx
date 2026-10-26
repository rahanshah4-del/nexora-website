import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { GEOLINT_PATH, GEOLINT_REPORT_PATH, GEOLINT_WORDPRESS_PATH } from '../../../lib/geolintLaunch.js'
import { wordpressOrigin, wordpressUploadUrl } from '../../../lib/geolintWordPress.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { WpMark } from './GeoLintWordPress.jsx'
import { ToolManualLink } from './ToolPageParts.jsx'
import './geolint.css'

const SHOTS = '/geolint-wp'

const btnBase = 'inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl px-6 text-[15px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300'

/** Download + "open my WordPress" buttons, sharing the site address typed once on the page. */
function ActionBar({ site, setSite, dark = false, downloadOnly = false, openOnly = false }) {
  const target = useMemo(() => wordpressUploadUrl(site), [site])
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {openOnly ? null : <a href="/nexora-ai-search-audit-tools.zip" download className={`${btnBase} ${dark ? 'bg-white text-slate-950 hover:bg-sky-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
          <WpMark tone={dark ? 'dark' : 'white'} className="h-6 w-6" />
          Download for WordPress
        </a>}
        {downloadOnly ? null : target ? (
          <a href={target} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white hover:brightness-110`}>
            <WpMark tone={target ? 'white' : 'dark'} className="h-6 w-6" />
            Open my WordPress
          </a>
        ) : (
          <span aria-disabled="true" className={`${btnBase} cursor-not-allowed ${dark ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
            <WpMark tone={dark ? 'white' : 'dark'} className="h-6 w-6 opacity-50" />
            Open my WordPress
          </span>
        )}
      </div>
      {downloadOnly ? null : (<>
      <label htmlFor={`wp-site-${dark ? 'hero' : 'step'}`} className={`mt-4 block text-[13px] font-semibold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Your WordPress site address</label>
      <input
        id={`wp-site-${dark ? 'hero' : 'step'}`}
        type="text"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="https://yoursite.com"
        value={site}
        onChange={(e) => setSite(e.target.value)}
        className={`mt-2 min-h-[48px] w-full max-w-md rounded-xl border px-4 text-[16px] focus:outline-none focus:ring-2 ${dark ? 'border-white/20 bg-slate-950/60 text-white placeholder:text-slate-500 focus:border-sky-400 focus:ring-sky-400/40' : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/30'}`}
      />
      <p className={`mt-2 max-w-xl text-[12.5px] leading-5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        "Open my WordPress" opens <code className="break-all">{target || 'your-site/wp-admin/plugin-install.php?tab=upload'}</code> in a new tab. Sign in as an administrator if WordPress asks. If your admin is at a custom address, open Plugins, Add Plugin, Upload Plugin by hand.
      </p>
      </>)}
    </div>
  )
}

function Shot({ file, width, height, alt }) {
  return (
    <figure className="mt-4">
      <img
        src={`${SHOTS}/${file}`}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        alt={alt}
        className="h-auto w-full max-w-[1060px] rounded-xl border border-slate-200 bg-slate-100 shadow-[0_18px_40px_-28px_rgba(15,23,42,.45)]"
      />
      <figcaption className="mt-2 text-[12.5px] text-slate-500">{alt}. The red outline shows where to click.</figcaption>
    </figure>
  )
}

const STEPS = [
  {
    title: 'Download the plugin',
    text: 'Click Download for WordPress above. You get one file, nexora-ai-search-audit-tools.zip. Keep it as a zip: do not unzip it.',
  },
  {
    title: 'Open your WordPress admin',
    text: 'Click Open my WordPress above and sign in as an administrator. It opens the upload screen for you. Or do it by hand: in your dashboard open Plugins, then click Add Plugin, then Upload Plugin.',
    shot: { file: '1-add-plugin.webp', width: 1060, height: 64, alt: 'Plugins page with the Add Plugin button' },
  },
  {
    title: 'Upload the zip',
    text: 'Click Choose File, pick nexora-ai-search-audit-tools.zip from your downloads, then click Install Now.',
    shot: { file: '2-upload.webp', width: 1060, height: 419, alt: 'Upload screen with the zip chosen' },
  },
  {
    title: 'Activate the plugin',
    text: 'When WordPress says "Plugin installed successfully", click Activate Plugin. Nothing on your site changes yet.',
    shot: { file: '3-activate.webp', width: 1060, height: 282, alt: 'Plugin installed, with the Activate Plugin button' },
  },
  {
    title: 'Click Apply recommended fixes',
    text: 'After you activate, WordPress opens the plugin settings for you. Click Apply recommended fixes. One click allows the AI search and answer crawlers, serves llms.txt and adds Organization schema (skipped if an SEO plugin already does it). Anything you set earlier is kept.',
    shot: { file: '5-apply.webp', width: 808, height: 254, alt: 'The Apply recommended fixes button on the plugin settings page' },
  },
]

const OPTIONAL_STEPS = [
  {
    title: 'Fine-tune the AI crawlers',
    text: 'Under "AI crawler access" choose Allow or Block for each crawler yourself. Block the training crawlers if you do not want your content used to train models.',
    shot: { file: '4-crawlers.webp', width: 1060, height: 211, alt: 'AI crawler access section with the recommended preset button' },
  },
  {
    title: 'Edit llms.txt',
    text: 'Choose "Use my own text" to write the llms.txt yourself instead of the automatic version. Untick "Serve /llms.txt" to turn it off.',
    shot: { file: '5-llms.webp', width: 1060, height: 191, alt: 'llms.txt section with the Serve /llms.txt checkbox' },
  },
  {
    title: 'Complete your organization details',
    text: 'The plugin fills in your site name and description. Add your logo address and profile links (LinkedIn, X) to make the schema richer.',
    shot: { file: '6-schema.webp', width: 1060, height: 156, alt: 'Organization schema section with its checkbox' },
  },
  {
    title: 'Save your changes',
    text: 'If you changed anything, click Save Changes at the bottom. Use "Check robots.txt and llms.txt now" on the same page to see what a crawler sees. If you use a cache plugin, allow a minute.',
    shot: { file: '7-save.webp', width: 1060, height: 84, alt: 'The Save Changes button' },
  },
]

/** /tools/geo-audit/wordpress/: screenshots-first guide to installing the plugin, opened from the report. */
export default function GeoLintWordPressPage() {
  const [params] = useSearchParams()
  const [site, setSite] = useState(() => wordpressOrigin(params.get('site')))

  return (
    <PublicPageShell>
      <PageSeo
        title="Install the GeoLint plugin on WordPress | GeoLint"
        description="Step-by-step guide with screenshots: install the free Nexora AI Search Audit Tools plugin and apply your audit fixes on WordPress."
        canonical={`https://nexorasolution.us${GEOLINT_WORDPRESS_PATH}/`}
        path={GEOLINT_WORDPRESS_PATH}
        robots="noindex,follow"
        ogLocale="en_US"
        ogLocaleAlternates={false}
        defaultSchemas={false}
      />

      <section className="gl-hero relative overflow-hidden px-4 pb-14 pt-24 text-white sm:px-6 sm:pt-28">
        <div aria-hidden="true" className="gl-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">GeoLint for WordPress</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">Fix your site on WordPress in 5 steps</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-7 text-slate-300">
            Install the free Nexora AI Search Audit Tools plugin, then click one button: it applies the robots.txt, llms.txt and schema fixes. No code to edit. Follow the pictures below.
          </p>
          <div className="mt-7"><ActionBar site={site} setSite={setSite} dark /></div>
          <div className="mt-7 flex flex-wrap gap-3 text-[14px]">
            <Link to={GEOLINT_REPORT_PATH} className="font-semibold text-sky-300 underline-offset-4 hover:underline">Back to my report</Link>
            <span aria-hidden="true" className="text-slate-600">|</span>
            <Link to={GEOLINT_PATH} className="font-semibold text-sky-300 underline-offset-4 hover:underline">Audit another page</Link>
            <ToolManualLink path={GEOLINT_WORDPRESS_PATH} tone="dark" />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 pt-12 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="gl-card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-950">Installed from this website</h2>
            <p className="mt-1.5 text-[14.5px] leading-7 text-slate-600">
              This plugin is not in the WordPress.org plugin directory, so you do not search for it inside WordPress. Download the zip here, then upload it yourself with Plugins, Add Plugin, Upload Plugin. It is free, needs no account and sends nothing from your site to us.
            </p>
            <p className="mt-2 text-[14.5px] leading-7 text-slate-600">
              WordPress will not update it for you. When we release a new version, download the zip again from this page and upload it the same way.
            </p>
          </div>
          <div className="gl-card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-950">Already have the older plugin?</h2>
            <p className="mt-1.5 text-[14.5px] leading-7 text-slate-600">
              Earlier downloads were called "GeoLint AI Visibility". This version has a new name, so WordPress treats it as a different plugin. Deactivate and delete the old one, install this zip, then click Apply recommended fixes again. Your old settings are not carried over.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-10 sm:px-6">
        <ol className="mx-auto max-w-4xl space-y-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="gl-card p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 font-display text-[15px] font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-950">{step.title}</h2>
                  <p className="mt-1.5 text-[15px] leading-7 text-slate-600">{step.text}</p>
                  {i === 0 ? <div className="mt-4"><ActionBar site={site} setSite={setSite} downloadOnly /></div> : null}
                  {i === 1 ? <div className="mt-4"><ActionBar site={site} setSite={setSite} openOnly /></div> : null}
                  {step.shot ? <Shot {...step.shot} /> : null}
                </div>
              </div>
            </li>
          ))}
          {OPTIONAL_STEPS.map((step) => (
            <li key={step.title} className="gl-card border-dashed p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <span className="flex h-9 shrink-0 items-center justify-center rounded-full bg-slate-200 px-3 text-[12px] font-bold uppercase tracking-wide text-slate-600">Optional</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-950">{step.title}</h2>
                  <p className="mt-1.5 text-[15px] leading-7 text-slate-600">{step.text}</p>
                  <Shot {...step.shot} />
                </div>
              </div>
            </li>
          ))}
          <li className="gl-card p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-display text-[15px] font-bold text-white">6</span>
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-slate-950">Run the audit again</h2>
                <p className="mt-1.5 text-[15px] leading-7 text-slate-600">Come back and audit the same page. The fixes you switched on should now show up in the score.</p>
                <Link to={GEOLINT_PATH} className={`${btnBase} mt-4 bg-slate-900 text-white hover:bg-slate-800`}>Run the audit again</Link>
              </div>
            </div>
          </li>
        </ol>
        <p className="mx-auto mt-8 max-w-4xl text-center text-[13px] leading-6 text-slate-500">
          Screenshots are from WordPress with the default admin theme; your screen may look a little different. The plugin sends nothing from your site to us.
        </p>
      </section>
    </PublicPageShell>
  )
}
