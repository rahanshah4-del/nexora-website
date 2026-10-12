/**
 * "Countries We Serve" footer, grouped by region. One list feeds both the
 * React footer (PublicFooter.jsx) and the static footer baked in by
 * scripts/prerender.mjs, so they cannot drift apart. Every country or city
 * landing page needs a crawlable link from here.
 */
export const FOOTER_REGIONS = [
  {
    heading: 'Pakistan',
    links: [
      { to: '/pakistan', label: 'Pakistan', icon: '🇵🇰' },
      { to: '/multan', label: 'Multan (HQ)', icon: '📍' },
      { to: '/lahore', label: 'Lahore', icon: '📍' },
      { to: '/karachi', label: 'Karachi', icon: '📍' },
      { to: '/islamabad', label: 'Islamabad', icon: '📍' },
      { to: '/peshawar', label: 'Peshawar', icon: '📍' },
      { to: '/abbottabad', label: 'Abbottabad', icon: '📍' },
    ],
  },
  {
    heading: 'South Asia',
    links: [
      { to: '/india', label: 'India', icon: '🇮🇳' },
      { to: '/coimbatore', label: 'Coimbatore', icon: '📍' },
      { to: '/dhaka', label: 'Dhaka', icon: '🇧🇩' },
    ],
  },
  {
    heading: 'Middle East',
    links: [
      { to: '/uae', label: 'UAE', icon: '🇦🇪' },
      { to: '/saudi-arabia', label: 'Saudi Arabia', icon: '🇸🇦' },
      { to: '/bahrain', label: 'Bahrain', icon: '🇧🇭' },
    ],
  },
  {
    heading: 'Asia-Pacific',
    links: [
      { to: '/indonesia', label: 'Indonesia', icon: '🇮🇩' },
      { to: '/thailand', label: 'Thailand', icon: '🇹🇭' },
      { to: '/australia', label: 'Australia', icon: '🇦🇺' },
    ],
  },
  {
    heading: 'Europe',
    links: [
      { to: '/uk', label: 'United Kingdom', icon: '🇬🇧' },
      { to: '/germany', label: 'Deutschland', icon: '🇩🇪' },
      { to: '/sevilla', label: 'Sevilla', icon: '🇪🇸' },
    ],
  },
  {
    heading: 'Americas',
    links: [
      { to: '/usa', label: 'United States', icon: '🇺🇸' },
      { to: '/texas', label: 'Texas', icon: '📍' },
      { to: '/venezuela', label: 'Venezuela', icon: '🇻🇪' },
      { to: '/toronto', label: 'Toronto', icon: '🇨🇦' },
      { to: '/mexico', label: 'México', icon: '🇲🇽' },
    ],
  },
  {
    heading: 'Africa',
    links: [
      { to: '/nigeria', label: 'Nigeria', icon: '🇳🇬' },
    ],
  },
]
