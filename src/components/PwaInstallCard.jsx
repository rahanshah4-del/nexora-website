import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'nexora-pwa-install-dismissed'

export default function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [canPrompt, setCanPrompt] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      if (isStandalone) {
        setInstalled(true)
        return
      }
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setInstallPrompt(event)
        setCanPrompt(true)
      }
    }

    const onAppInstalled = () => {
      window.localStorage.setItem(STORAGE_KEY, 'true')
      setInstalled(true)
      setCanPrompt(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return
    try {
      installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        window.localStorage.setItem(STORAGE_KEY, 'true')
      } else {
        window.localStorage.setItem(STORAGE_KEY, 'true')
      }
    } catch {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    }
    setCanPrompt(false)
    setInstallPrompt(null)
    setDismissed(true)
  }, [installPrompt])

  if (!canPrompt || dismissed || installed) {
    return null
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-400/5 backdrop-blur-md sm:max-w-xl">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-3xl bg-sky-50 text-sky-700 shadow-sm shadow-sky-400/10">
          <img src="/nexora-logo.jpg" alt="Nexora app icon" className="h-10 w-10 rounded-2xl object-cover" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-700">Install Nexora App</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Add to Chrome</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Install Nexora as a fast desktop and mobile app and open the website like native software.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex items-center justify-center rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-700/20 transition hover:bg-sky-800"
        >
          Install Nexora App
        </button>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, 'true')
            setDismissed(true)
            setCanPrompt(false)
          }}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Not now
        </button>
      </div>
    </section>
  )
}
