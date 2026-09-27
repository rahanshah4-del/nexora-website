import Link from './AppLink.jsx'
import { AUTHOR_PAGE_PATH } from '../config/author.js'

/** Author name, role, photo/emoji and bio from src/config/author.js. */
export default function AuthorBox({ author, linkToProfile = true, as: Heading = 'p' }) {
  const initial = String(author.name || '?').trim().charAt(0).toUpperCase()
  // No photo: the configured emoji, else the name's initial. Either way the
  // circle is aria-hidden — the name in the heading below is the accessible
  // label, so a screen reader does not announce "writing hand" as the author.
  const avatarText = author.emoji || initial
  const name = linkToProfile
    ? <Link to={AUTHOR_PAGE_PATH} className="hover:text-blue-700">{author.name}</Link>
    : author.name
  return (
    <aside aria-label="About the author" className="flex gap-4 rounded-[1.35rem] border border-slate-200 bg-white p-5 sm:p-6">
      {author.photo ? (
        <img src={author.photo} alt={author.name} width="64" height="64" className="h-16 w-16 shrink-0 rounded-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-500">{avatarText}</span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Written by</p>
        <Heading className="mt-1 text-lg font-semibold text-slate-900">{name}</Heading>
        {author.role ? <p className="text-sm text-slate-500">{author.role}</p> : null}
        {author.bio ? <p className="mt-3 text-sm leading-6 text-slate-600">{author.bio}</p> : null}
      </div>
    </aside>
  )
}
