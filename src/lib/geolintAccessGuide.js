/**
 * "How to give us safe access": one guide per website platform or access method.
 * Plain data so the page and the tests share it. Menu names can differ a little between versions of each
 * product, so every guide says what to look for, not only where to click.
 */

export const ACCESS_EMAIL = 'support@nexorasolution.us'

export const ACCESS_RULES = Object.freeze([
  { title: 'Never send a password', text: 'Not in the chat, not by email, not on WhatsApp. We only ever work through an invite.' },
  { title: 'Invite, do not hand over', text: 'You add us as a separate user. Your own login stays private and yours.' },
  { title: 'Remove us when done', text: 'When the work is finished you delete our user. Every guide below shows where.' },
])

/** `tint` and `mark` draw a neutral tile when no logo file exists at /platform-logos/<id>.svg. */
export const ACCESS_GUIDES = Object.freeze([
  {
    id: 'wordpress', label: 'WordPress', mark: 'W', tint: '#21759b', platform: 'wordpress', access: 'invite-admin-user',
    role: 'Administrator (Editor is enough if you only want text and page changes)',
    steps: [
      'Sign in to your WordPress dashboard (yoursite.com/wp-admin).',
      'In the left menu open Users, then press Add New User.',
      `Username: nexora-support. Email: ${ACCESS_EMAIL}.`,
      'Role: choose Administrator. WordPress can then install our free plugin and edit robots.txt, llms.txt and schema.',
      'Tick "Send the new user an email about their account", then press Add New User.',
    ],
    remove: 'Users, hover over nexora-support, press Delete.',
    tip: 'Use a strong unique password if WordPress asks for one. We reset it through the email link, so you never need to tell us.',
  },
  {
    id: 'shopify', label: 'Shopify', mark: 'S', tint: '#5e8e3e', platform: 'shopify', access: 'invite-admin-user',
    role: 'Staff account with Themes, Online Store pages, Navigation and Preferences permissions',
    steps: [
      'Sign in to your Shopify admin.',
      'Open Settings (bottom left), then Users.',
      'Press Add users (or Add staff).',
      `Enter our email: ${ACCESS_EMAIL}.`,
      'Under permissions tick Themes, Pages, Navigation, Preferences and Online Store. Nothing else is needed, so we never see your orders or customers.',
      'Press Send invite. Shopify emails us and we accept it.',
    ],
    remove: 'Settings, Users, open our user, press Remove staff.',
    tip: 'If Shopify asks for a collaborator request code instead, tell us in the order chat and we send it.',
  },
  {
    id: 'wix', label: 'Wix', mark: 'W', tint: '#0c6efc', platform: 'wix', access: 'invite-admin-user',
    role: 'Admin, or the closest role that can edit pages and SEO settings',
    steps: [
      'Sign in to Wix and open your site dashboard.',
      'Go to Settings, then Roles & Permissions.',
      'Press Invite People.',
      `Enter our email: ${ACCESS_EMAIL}.`,
      'Choose the role Admin (or a role that can edit the site and its SEO settings).',
      'Press Send invite.',
    ],
    remove: 'Settings, Roles & Permissions, find our name, press the three dots, Remove.',
    tip: 'Wix may ask you to confirm the invite by email. Check your inbox once.',
  },
  {
    id: 'squarespace', label: 'Squarespace', mark: 'Sq', tint: '#222222', platform: 'squarespace', access: 'invite-admin-user',
    role: 'Administrator, or Website Editor if you want to limit it to pages',
    steps: [
      'Sign in to Squarespace and open your site.',
      'Go to Settings, then Permissions.',
      'Press Invite Contributor.',
      `Enter our email: ${ACCESS_EMAIL}.`,
      'Choose Administrator (or Website Editor) and send the invite.',
    ],
    remove: 'Settings, Permissions, press our name, then Remove contributor.',
    tip: 'Some Squarespace plans limit how many contributors you can add. If it shows a limit, tell us and we find another way.',
  },
  {
    id: 'webflow', label: 'Webflow', mark: 'Wf', tint: '#146ef5', platform: 'webflow', access: 'invite-admin-user',
    role: 'Can edit or Can design access to your site',
    steps: [
      'Sign in to Webflow and open your Workspace dashboard.',
      'Open Workspace settings, then Members (or share the single site with us as a guest).',
      'Press Invite.',
      `Enter our email: ${ACCESS_EMAIL}.`,
      'Give access to this one site only, with the permission to edit or design it.',
      'Send the invite.',
    ],
    remove: 'Workspace settings, Members, remove our user.',
    tip: 'Webflow may bill per extra seat on some plans. Check the line shown before you confirm.',
  },
  {
    id: 'nextjs', label: 'Next.js / React app', mark: 'N', tint: '#111827', platform: 'nextjs', access: 'git-repo-access',
    role: 'Write access to the code repository (and Member on Vercel or Netlify if you use them)',
    steps: [
      'Open your repository on GitHub, GitLab or Bitbucket.',
      'GitHub: Settings, Collaborators, Add people. GitLab: Manage, Members, Invite members.',
      `Invite our email: ${ACCESS_EMAIL}. If it asks for a username, tell us in the order chat and we send it.`,
      'Role: Write (GitHub) or Developer (GitLab). We work on a branch and you merge, or you let us merge.',
      'If you deploy on Vercel or Netlify, also invite us as a Member of the team, so we can see the build.',
    ],
    remove: 'Repository settings, Collaborators, press Remove next to our name.',
    tip: 'Never share a token or an .env file in chat. We do not need your secrets to change meta tags, schema or content.',
  },
  {
    id: 'custom', label: 'Custom code (HTML, PHP, other)', mark: '</>', tint: '#7c3aed', platform: 'custom', access: 'hosting-panel-invite',
    role: 'A separate user limited to your website files',
    steps: [
      'Sign in to your hosting panel (cPanel, Hostinger, GoDaddy, Namecheap or similar).',
      'Look for Users, Team, Collaborators or Share access. Most hosts have one of these.',
      `Invite our email: ${ACCESS_EMAIL} and give access to this website only.`,
      'No team feature? Tell us in the order chat. We will show you the safest way, such as a separate FTP user that only reaches your site folder.',
      'If your code lives on GitHub or GitLab, add us as a collaborator there instead (see the Next.js guide).',
    ],
    remove: 'Delete the user or revoke the invite in the same screen.',
    tip: 'Make a backup first. We keep a written list of every file we change.',
  },
  {
    id: 'cloudflare', label: 'Cloudflare', mark: 'Cf', tint: '#f38020', platform: '', access: 'cloudflare-invite',
    role: 'Access to your domain only, with the lowest role that lets us edit rules',
    steps: [
      'Sign in to the Cloudflare dashboard.',
      'Open Manage Account, then Members.',
      'Press Invite.',
      `Enter our email: ${ACCESS_EMAIL}.`,
      'Limit access to your domain if Cloudflare offers that, and pick the least powerful role that fits.',
      'Send the invite.',
    ],
    remove: 'Manage Account, Members, remove our user.',
    tip: 'Only needed if Cloudflare serves your site. Most clients do not need to do this.',
  },
  {
    id: 'unsure', label: 'Not sure', mark: '?', tint: '#64748b', platform: 'other', access: 'will-share-later',
    role: 'We will tell you',
    steps: [
      'That is fine. Choose "I am not sure yet, tell me what to do" in the order form.',
      'Place the order. Then write to us in the order chat with your website address.',
      'We look at your site, tell you which platform it uses, and send the exact steps for it.',
    ],
    remove: 'We will show you when we send the steps.',
    tip: 'Not sure what your site runs on? Look at the bottom of the page or at the login address. Or ask us.',
  },
])

export const guideById = (id) => ACCESS_GUIDES.find((g) => g.id === id) || null

/** The guide that fits a wizard platform value (wordpress, shopify, ...), or the first one. */
export function guideForPlatform(platform) {
  return ACCESS_GUIDES.find((g) => g.platform && g.platform === platform) || (platform === 'other' ? guideById('unsure') : null)
}

/** Where the Access step opens the guide, preselecting the platform the client chose. */
export function accessGuideHref(basePath, platform) {
  const g = guideForPlatform(platform)
  return g ? `${basePath}?p=${encodeURIComponent(g.id)}` : basePath
}
