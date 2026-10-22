import { useMemo, useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import { wordpressGuidePath, wordpressOrigin, wordpressUploadUrl } from '../../../lib/geolintWordPress.js'

/** The WordPress mark as supplied by the site owner (wordpress.org/about/logos). 'white' for dark or gradient buttons, 'dark' for light ones. */
export function WpMark({ tone = 'white', className = 'h-5 w-5' }) {
  return <img src={`/geolint-wp/wp-mark-${tone}.png`} width="128" height="128" alt="" aria-hidden="true" className={`${className} shrink-0`} />
}

const STEPS = [
  'Download the plugin zip below. Do not unzip it.',
  'Open your WordPress admin with the button below and sign in if asked. It opens the Upload Plugin screen.',
  'Click Choose File, pick geolint-ai-visibility.zip, then Install Now and Activate.',
  'WordPress opens the plugin settings. Click Apply recommended fixes: one click turns on the usual fixes.',
  'Come back here and run the audit again. The score should go up.',
]

/** Report section: turns the findings into the next action for WordPress sites (download, guide, jump to the admin). */
export default function WordPressFixPanel({ auditedUrl }) {
  const [site, setSite] = useState(() => wordpressOrigin(auditedUrl))
  const target = useMemo(() => wordpressUploadUrl(site), [site])

  return (
    <div className="gl-card p-5 sm:p-6">
      <p className="text-[14.5px] leading-7 text-slate-700">
        If this site runs on WordPress, the free GeoLint AI Visibility plugin applies the robots.txt, llms.txt and schema fixes for you. Nothing changes until you click Apply recommended fixes or switch a feature on.
      </p>
      <Link to={wordpressGuidePath(auditedUrl)} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 text-[14px] font-semibold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <WpMark tone="dark" className="h-5 w-5" />
        Open the step-by-step guide with pictures
      </Link>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[14px] leading-6 text-slate-700">
        {STEPS.map((step) => <li key={step}>{step}</li>)}
      </ol>

      <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <a
          href="/geolint-ai-visibility.zip"
          download
          className="inline-flex min-h-[46px] w-max items-center rounded-full bg-slate-900 px-6 text-[14px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <WpMark tone="white" className="mr-2.5 h-5 w-5" />
          1. Download the plugin (zip, 12 KB)
        </a>

        <div>
          <label htmlFor="geolint-wp-site" className="text-[13px] font-semibold text-slate-700">Your WordPress site address</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="geolint-wp-site"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://yoursite.com"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="min-h-[46px] flex-1 rounded-xl border border-slate-300 bg-white px-4 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {target ? (
              <a
                href={target}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 text-[14px] font-semibold text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <WpMark tone="white" className="mr-2.5 h-5 w-5" />
                2. Open my WordPress plugin upload page
              </a>
            ) : (
              <span aria-disabled="true" className="inline-flex min-h-[46px] cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-6 text-[14px] font-semibold text-slate-500">
                2. Open my WordPress plugin upload page
              </span>
            )}
          </div>
          <p className="mt-2 text-[12.5px] leading-5 text-slate-500">
            Opens {target ? <code className="break-all rounded bg-white px-1 py-0.5 text-slate-700">{target}</code> : 'your-site/wp-admin/plugin-install.php?tab=upload'} in a new tab. You have to be signed in as an administrator. If your admin lives at a custom address, open Plugins, then Add New, then Upload Plugin yourself.
          </p>
        </div>
      </div>
    </div>
  )
}
