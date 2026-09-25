/**
 * Copy for /download/restaurant-pos — plain text only (no JSX, no icons) so
 * the React page and scripts/prerender.mjs (buildDownloadRestaurantPosContent)
 * render exactly the same words. Icons are mapped by `icon` key in the page.
 *
 * Keep claims factual: only list what the desktop app actually does.
 */

export const WHATSAPP_URL = 'https://wa.me/923194329754'
export const PHONE_DISPLAY = '03194329754'
export const PHONE_TEL = 'tel:03194329754'

export const HERO = {
  eyebrow: 'Windows desktop app',
  title: 'Nexora Restaurant POS',
  subtitle: 'Fast billing, kitchen tickets and tables for your restaurant — works offline and syncs with Nexora on the web.',
  trust: ['Free download', 'Windows 10/11 (64-bit)', 'Works offline', 'Syncs with Nexora web'],
}

export const INSTALL_STEPS = [
  {
    title: 'Download',
    detail: 'Click “Download for Windows” and save the Nexora POS installer (.exe) to your computer.',
  },
  {
    title: 'Open the installer',
    detail: 'Double-click the downloaded file. If Windows shows “Windows protected your PC”, click More info → Run anyway.',
    note: 'This message appears because the app is new and not yet code-signed. It is a standard Windows check, not an error.',
  },
  {
    title: 'Install and open',
    detail: 'Follow the setup wizard, then open Nexora Restaurant POS from your desktop or Start menu.',
  },
  {
    title: 'Log in',
    detail: 'Sign in with your Nexora business account — the same account you use on the web.',
  },
]

export const FEATURES = [
  { icon: 'billing', title: 'Fast billing & order management', detail: 'Dine-in, takeaway and delivery orders with quick billing, discounts and taxes.' },
  { icon: 'kitchen', title: 'Kitchen display & KOT', detail: 'Send orders to the kitchen instantly and print kitchen order tickets.' },
  { icon: 'tables', title: 'Table management', detail: 'See which tables are free, occupied or waiting for the bill at a glance.' },
  { icon: 'wallet', title: 'Customer wallet & loyalty', detail: 'Keep customer balances and reward your regulars.' },
  { icon: 'expenses', title: 'Expenses & cash sessions', detail: 'Record expenses and open and close cash sessions for every shift.' },
  { icon: 'reports', title: 'Reports & sales dashboard', detail: 'Daily sales, order types, categories and payment methods in one view.' },
  { icon: 'offline', title: 'Works offline, syncs to cloud', detail: 'Keep billing when the internet drops — data syncs when you are back online.' },
  { icon: 'printer', title: 'Network (LAN) thermal receipt printers', detail: 'Print receipts and kitchen tickets on network ESC/POS thermal printers.' },
]

export const REQUIREMENTS = [
  { icon: 'os', label: 'Operating system', value: 'Windows 10 or 11 (64-bit)' },
  { icon: 'memory', label: 'Memory', value: '4 GB RAM (8 GB recommended)' },
  { icon: 'disk', label: 'Disk space', value: '~500 MB free' },
  { icon: 'internet', label: 'Internet', value: 'Needed for first login and sync' },
  { icon: 'printer', label: 'Printer', value: 'Optional network thermal printer' },
]

export const FAQS = [
  {
    question: 'Is it free to download?',
    answer: 'Yes. The Windows installer is free to download, and you can create a free Nexora account to get started.',
  },
  {
    question: 'Do I need an account?',
    answer: 'Yes. You log in with your Nexora business account. If you do not have one yet, create a free account first.',
  },
  {
    question: 'Does it work without internet?',
    answer: 'Yes. After your first login you can keep taking orders and billing offline. Your data syncs to Nexora when the connection is back.',
  },
  {
    question: 'Can I use it on more than one computer?',
    answer: 'Yes. Install it on each PC and log in with your account — your data syncs through Nexora.',
  },
  {
    question: 'Which printers are supported?',
    answer: 'Network (LAN) ESC/POS thermal receipt printers.',
  },
  {
    question: 'How do I update?',
    answer: 'Download the latest installer from this page and install it over the old version. Your data stays.',
  },
]

export const HELP = {
  title: 'Need help setting up?',
  detail: 'Our team can help you install the app, connect your printer and set up your menu.',
}
