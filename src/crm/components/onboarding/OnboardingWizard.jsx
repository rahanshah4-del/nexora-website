import { AnimatePresence, motion } from 'framer-motion'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { db } from '../../lib/firebase.js'
import {
  businessTypes,
  getRecommendedModules,
  moduleCatalog,
  normalizeBusinessType,
} from '../../data/moduleAccess.js'
import { useUser } from '../../hooks/useUser.js'
import { clientSafeMessage } from '../../utils/messages.js'

function moduleLabel(key) {
  return moduleCatalog.find((module) => module.key === key)?.label || key
}

export default function OnboardingWizard({ open, onComplete }) {
  const { userId, workspaceId, userDoc, plan } = useUser()
  const initialBusinessType = normalizeBusinessType(userDoc?.businessType || userDoc?.profile?.businessType)
  const [businessType, setBusinessType] = useState(initialBusinessType)
  const [workspaceName, setWorkspaceName] = useState(
    userDoc?.workspaceName || userDoc?.company || userDoc?.companyName || `${userDoc?.name || 'Nexora'} Workspace`,
  )
  const [enabledModules, setEnabledModules] = useState(() => getRecommendedModules(initialBusinessType))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const recommended = useMemo(() => getRecommendedModules(businessType), [businessType])
  const selectableModules = useMemo(
    () => moduleCatalog.filter((module) => !module.alwaysEnabled && module.key !== 'payments'),
    [],
  )

  function toggleModule(key) {
    setEnabledModules((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return Array.from(next)
    })
  }

  function applyRecommendations() {
    setEnabledModules(recommended)
  }

  async function saveSetup() {
    setError('')
    if (!db || !userId || !workspaceId) {
      setError('Secure Cloud Sync is not available right now.')
      return
    }

    const cleanWorkspaceName = workspaceName.trim() || 'Nexora Workspace'
    const modules = Array.from(new Set([...enabledModules, 'dashboard', 'settings', 'subscriptions']))
    const selectedFeatures = modules.map(moduleLabel)
    const setup = {
      businessType,
      selectedFeatures,
      enabledModules: modules,
      onboardingCompleted: true,
      workspaceName: cleanWorkspaceName,
      plan: plan || 'Free',
      createdAt: userDoc?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    setSaving(true)
    try {
      await Promise.all([
        setDoc(
          doc(db, 'users', userId),
          {
            ...setup,
            name: userDoc?.name || userDoc?.fullName || cleanWorkspaceName,
          },
          { merge: true },
        ),
        setDoc(
          doc(db, 'workspaces', workspaceId),
          {
            ...setup,
            name: cleanWorkspaceName,
            ownerId: workspaceId,
            userId: workspaceId,
            workspaceId,
            lastAccessedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      ])
      onComplete?.()
    } catch (err) {
      setError(clientSafeMessage(err, 'Could not save your workspace setup.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="crm-modal-panel crm-modal-panel-wide"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
          >
            <Card className="rounded-3xl p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="purple">Workspace Setup</Badge>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    Set up your Nexora workspace
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Choose your business type and confirm the modules you want to start with.
                  </p>
                </div>
                <Badge variant="success">Secure Cloud Sync</Badge>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Workspace Name</span>
                  <Input className="mt-1.5" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Business Type</span>
                  <Select
                    className="mt-1.5"
                    value={businessType}
                    onChange={(event) => {
                      const nextType = event.target.value
                      setBusinessType(nextType)
                      setEnabledModules(getRecommendedModules(nextType))
                    }}
                  >
                    {businessTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Recommended modules</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">You can edit these before saving.</p>
                  </div>
                  <Button variant="subtle" className="rounded-2xl" type="button" onClick={applyRecommendations}>
                    Use Recommendations
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommended.map((key) => (
                    <Badge key={key} variant="info">
                      {moduleLabel(key)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectableModules.map((module) => (
                  <label
                    key={module.key}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 shadow-sm transition hover:border-sky-200"
                  >
                    <span className="min-w-0 text-sm font-semibold text-slate-800">{module.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600"
                      checked={enabledModules.includes(module.key)}
                      onChange={() => toggleModule(module.key)}
                    />
                  </label>
                ))}
              </div>

              {error ? <p className="mt-4 text-sm font-semibold text-rose-700">{error}</p> : null}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-5 text-slate-500">
                  Your setup is saved to your account and follows you across web and desktop.
                </p>
                <Button className="rounded-2xl" type="button" disabled={saving} onClick={saveSetup}>
                  {saving ? 'Saving…' : 'Save Workspace'}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
