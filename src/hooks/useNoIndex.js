import { useEffect } from 'react'

function ensureMeta(name, content) {
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
  return tag
}

export default function useNoIndex(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined
    const robots = ensureMeta('robots', 'noindex,nofollow,noarchive')
    const googleBot = ensureMeta('googlebot', 'noindex,nofollow,noarchive')
    return () => {
      robots.remove()
      googleBot.remove()
    }
  }, [enabled])
}

