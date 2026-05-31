import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineArrowRight,
  HiOutlineBell,
  HiOutlineBriefcase,
  HiOutlineBuildingLibrary,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineCog6Tooth,
  HiOutlineGlobeAlt,
  HiOutlineHomeModern,
  HiOutlineInformationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineBars3,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2'
import { FiLogOut } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import logoUrl from '../../assets/logo/nexora-logo.svg'
import useAuth from '../../context/useAuth.js'
import { auth, db } from '../../lib/firebase.js'
import { packageNameForPlan } from '../../crm/data/moduleAccess.js'

const moduleAccess = [
  { name: 'Nexora CRM', icon: HiOutlineUserGroup, color: 'bg-blue-600', active: true },
  { name: 'School ERP', icon: HiOutlineBuildingLibrary, color: 'bg-emerald-500', disabled: true },
  { name: 'Property ERP', icon: HiOutlineBuildingOffice2, color: 'bg-violet-600', disabled: true },
  { name: 'POS System', icon: HiOutlineBriefcase, color: 'bg-amber-500', disabled: true },
  { name: 'WhatsApp CRM', icon: HiOutlineChatBubbleLeftRight, color: 'bg-green-500', disabled: true },
  { name: 'Reports & Analytics', icon: HiOutlineChartBarSquare, color: 'bg-cyan-500', disabled: true },
  { name: 'HRM', icon: HiOutlineUsers, color: 'bg-rose-500', disabled: true },
  { name: 'Accounting', icon: HiOutlineChartBarSquare, color: 'bg-indigo-500', disabled: true },
]

const workspaces = [
  {
    name: 'Nexora CRM',
    id: 'CRM-0001',
    plan: 'Current Package',
    planTone: 'bg-blue-50 text-blue-700',
    status: 'Active',
    statusTone: 'bg-emerald-50 text-emerald-700',
    icon: HiOutlineBuildingOffice2,
    iconTone: 'bg-blue-50 text-blue-600',
    active: true,
    route: '/app/dashboard',
  },
  {
    name: 'School ERP',
    id: 'SCHOOL-0001',
    status: 'Coming Soon',
    statusTone: 'bg-slate-100 text-slate-600',
    icon: HiOutlineBuildingLibrary,
    iconTone: 'bg-emerald-50 text-emerald-600',
  },
  {
    name: 'Property ERP',
    id: 'PROPERTY-0001',
    status: 'Coming Soon',
    statusTone: 'bg-slate-100 text-slate-600',
    icon: HiOutlineHomeModern,
    iconTone: 'bg-violet-50 text-violet-600',
  },
  {
    name: 'POS System',
    id: 'POS-0001',
    status: 'Coming Soon',
    statusTone: 'bg-slate-100 text-slate-600',
    icon: HiOutlineBriefcase,
    iconTone: 'bg-orange-50 text-orange-500',
  },
  {
    name: 'WhatsApp CRM',
    id: 'WHATSAPP-0001',
    status: 'Coming Soon',
    statusTone: 'bg-slate-100 text-slate-600',
    icon: HiOutlineChatBubbleLeftRight,
    iconTone: 'bg-green-50 text-green-600',
  },
  {
    name: 'Reports & Analytics',
    id: 'REPORTS-0001',
    status: 'Coming Soon',
    statusTone: 'bg-slate-100 text-slate-600',
    icon: HiOutlineChartBarSquare,
    iconTone: 'bg-cyan-50 text-cyan-600',
  },
  {
    name: 'HRM',
    id: 'HRM-0001',
    status: 'Coming Soon',
    statusTone: 'bg-slate-100 text-slate-600',
    icon: HiOutlineUsers,
    iconTone: 'bg-rose-50 text-rose-600',
  },
  {
    name: 'Accounting',
    id: 'ACCOUNTING-0001',
    status: 'Coming Soon',
    statusTone: 'bg-slate-100 text-slate-600',
    icon: HiOutlineChartBarSquare,
    iconTone: 'bg-indigo-50 text-indigo-600',
  },
]

const languageOptions = ['English', 'Urdu', 'Arabic', 'Hindi', 'Bengali']
const regionOptions = ['Pakistan', 'India', 'Bangladesh', 'Middle East', 'Europe']
const CRM_TRIAL_DAYS = 7

const featureStrip = [
  {
    title: 'Centralized Access',
    text: 'Access all your workspaces from one place',
    icon: HiOutlineUsers,
  },
  {
    title: 'Secure & Private',
    text: 'Your data is 100% secure and private',
    icon: HiOutlineCog6Tooth,
  },
  {
    title: 'Multiple Modules',
    text: 'Use only the modules you need',
    icon: HiOutlineSquares2X2,
  },
  {
    title: 'Real-time Sync',
    text: 'All data is synced in real-time',
    icon: HiOutlineChartBarSquare,
  },
]

const sampleNotifications = [
  {
    title: 'CRM workspace active',
    text: 'Nexora CRM Workspace is ready to use.',
    tone: 'text-emerald-600 bg-emerald-50',
    icon: HiOutlineCheckCircle,
  },
  {
    title: 'Trial expires in 7 days',
    text: 'Your workspace trial period is 7 days from activation.',
    tone: 'text-amber-600 bg-amber-50',
    icon: HiOutlineBell,
  },
  {
    title: 'Other modules coming soon',
    text: 'School ERP, Property ERP, POS, and more will be available soon.',
    tone: 'text-blue-600 bg-blue-50',
    icon: HiOutlineInformationCircle,
  },
]

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function timestampToDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000)
}

function formatDate(value) {
  const date = timestampToDate(value)
  if (!date) return 'Not set'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function daysUntil(value) {
  const date = timestampToDate(value)
  if (!date) return 0
  return Math.max(Math.ceil((date.getTime() - Date.now()) / 86400000), 0)
}

function initialsFor(name, email) {
  const source = cleanString(name) || cleanString(email) || 'Nexora User'
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return initials || 'NU'
}

function SidebarItem({ icon: Icon, label, active = false, muted = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 w-full items-center justify-between rounded-lg px-3 text-left text-[13px] font-semibold transition ${
        active
          ? 'bg-blue-600 text-white shadow-[0_10px_24px_-14px_rgba(37,99,235,0.85)]'
          : muted
            ? 'text-slate-300 hover:bg-white/7 hover:text-white'
            : 'text-slate-200 hover:bg-white/7 hover:text-white'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <HiOutlineChevronRight className="h-4 w-4 shrink-0 opacity-80" />
    </button>
  )
}

function NotificationDropdown({ notifications, onClose }) {
  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-xl shadow-slate-950/10">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
        <div>
          <p className="text-sm font-bold text-slate-950">Notifications</p>
          <p className="mt-0.5 text-xs text-slate-500">{notifications.length} workspace updates</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close notifications"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 space-y-1">
        {notifications.map((notification) => {
          const Icon = notification.icon
          return (
            <div key={notification.title} className="flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{notification.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{notification.text}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WorkspaceCard({ workspace, index }) {
  const navigate = useNavigate()
  const Icon = workspace.icon
  const disabled = !workspace.active

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease: 'easeOut' }}
      className={`rounded-lg border bg-white p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.42)] ${
        workspace.active ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${workspace.iconTone}`}>
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="truncate text-[15px] font-bold leading-5 text-slate-950">{workspace.name}</h2>
            <p className="mt-1 text-xs text-slate-500">Workspace ID: {workspace.id}</p>
            {workspace.plan ? (
              <p className="mt-1 text-xs text-slate-500">
                Plan:{' '}
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${workspace.planTone}`}>
                  {workspace.plan}
                </span>
              </p>
            ) : null}
          </div>
        </div>
        {workspace.active ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <HiOutlineArrowRight className="h-4 w-4 rotate-[-45deg]" />
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <HiOutlineChartBarSquare className="h-4 w-4" />
          Status
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${workspace.statusTone}`}>
            {workspace.status}
          </span>
        </span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (workspace.route) navigate(workspace.route)
        }}
        className={`mt-4 flex h-10 w-full items-center justify-center gap-3 rounded-lg border text-[13px] font-bold transition ${
          workspace.active
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'cursor-not-allowed border-slate-200 bg-white text-slate-700 opacity-70'
        }`}
      >
        {workspace.active ? 'Enter Workspace' : 'Coming Soon'}
        <HiOutlineArrowRight className="h-4 w-4" />
      </button>
    </motion.article>
  )
}

function CreateWorkspaceCard({ disabled, message, onOpen }) {
  return (
    <article
      className={`rounded-lg border p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.42)] ${
        disabled ? 'border-slate-200 bg-white' : 'border-blue-100 bg-blue-50/35'
      }`}
    >
      <div className="flex min-h-[110px] items-center gap-4">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'}`}>
          <HiOutlinePlus className="h-7 w-7" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-slate-950">Create New Workspace</h2>
          <p className="mt-1.5 text-sm leading-5 text-slate-600">
            {disabled ? 'CRM workspace is already available on this account.' : 'Start a 7-day Nexora CRM trial workspace.'}
          </p>
          {message ? <p className="mt-2 text-xs font-bold text-amber-700">{message}</p> : null}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className={`mt-4 flex h-10 w-full items-center justify-center gap-3 rounded-lg border text-[13px] font-bold transition ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : 'border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white'
        }`}
      >
        {disabled ? 'Workspace Exists' : 'Create Workspace'}
        <HiOutlineArrowRight className="h-4 w-4" />
      </button>
    </article>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      <span className="max-w-[210px] text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  )
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <motion.section
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.section>
    </div>
  )
}

function CreateWorkspaceModal({ creating, hasWorkspace, message, profile, onCreate, onClose }) {
  return (
    <ModalShell title="Create New Workspace" onClose={onClose}>
      <div className="px-5 py-4">
        {hasWorkspace ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            You already have a CRM workspace.
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-bold text-slate-950">Nexora CRM</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                Creates one CRM workspace for {profile.name}. Trial access lasts 7 days.
              </p>
            </div>
            {message ? <p className="mt-3 text-sm font-semibold text-amber-700">{message}</p> : null}
            <button
              type="button"
              disabled={creating}
              onClick={onCreate}
              className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {creating ? 'Creating...' : 'Create Workspace'}
            </button>
          </>
        )}
      </div>
    </ModalShell>
  )
}

function SettingsModal({ profile, selectedLanguage, selectedRegion, onLanguageChange, onRegionChange, onLogout, loggingOut, onClose }) {
  return (
    <ModalShell title="Settings" onClose={onClose}>
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
            {profile.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{profile.name}</p>
            <p className="truncate text-xs text-slate-500">{profile.email}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 px-3">
          <DetailRow label="Plan" value={profile.planLabel} />
          <DetailRow label="Trial" value={profile.trialLabel} />
          <DetailRow label="Language" value={selectedLanguage} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Language</span>
            <select
              value={selectedLanguage}
              onChange={(event) => onLanguageChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {languageOptions.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Region</span>
            <select
              value={selectedRegion}
              onChange={(event) => onRegionChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={loggingOut}
          onClick={onLogout}
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-65"
        >
          <FiLogOut className="h-4 w-4" />
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </ModalShell>
  )
}

export default function WorkspaceSelection() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [selectedRegion, setSelectedRegion] = useState('Pakistan')
  const [languageOpen, setLanguageOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createMessage, setCreateMessage] = useState('')
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [workspaceView, setWorkspaceView] = useState('enter')
  const [accountData, setAccountData] = useState(null)
  const [workspaceData, setWorkspaceData] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadAccount() {
      if (!db || !user?.uid) {
        if (!cancelled) {
          setAccountData(null)
          setWorkspaceData(null)
        }
        return
      }

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const nextAccount = userSnap.exists() ? userSnap.data() : null
      const workspaceId = cleanString(nextAccount?.workspaceId) || user.uid
      const workspaceSnap = await getDoc(doc(db, 'workspaces', workspaceId))

      if (!cancelled) {
        setAccountData(nextAccount)
        setWorkspaceData(workspaceSnap.exists() ? workspaceSnap.data() : null)
      }
    }

    loadAccount().catch(() => {
      if (!cancelled) {
        setAccountData(null)
        setWorkspaceData(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const profile = useMemo(() => {
    const email = cleanString(accountData?.email) || cleanString(user?.email) || 'No email available'
    const name =
      cleanString(accountData?.fullName) ||
      cleanString(accountData?.name) ||
      cleanString(user?.displayName) ||
      cleanString(email.split('@')[0]) ||
      'Nexora User'
    const plan = cleanString(workspaceData?.plan) || cleanString(accountData?.plan) || 'Free'
    const status = cleanString(workspaceData?.planStatus) || cleanString(accountData?.planStatus) || 'trial'
    const trialEndsAt = workspaceData?.trialEndsAt || accountData?.trialEndsAt || addDays(new Date(), CRM_TRIAL_DAYS)
    const remainingDays = daysUntil(trialEndsAt)
    const isTrial = status.toLowerCase().includes('trial') || Boolean(workspaceData?.isTrialActive || accountData?.isTrialActive)
    const trialExpired = isTrial && remainingDays <= 0
    const packageName = packageNameForPlan(plan)

    return {
      name,
      email,
      initials: initialsFor(name, email),
      role: cleanString(accountData?.role) || 'owner',
      planLabel: `${packageName}${status ? ` · ${trialExpired ? 'expired' : status}` : ''}`,
      trialLabel: trialExpired
        ? `Expired on ${formatDate(trialEndsAt)}`
        : isTrial
          ? `${remainingDays} days left · ends ${formatDate(trialEndsAt)}`
          : `Ends ${formatDate(trialEndsAt)}`,
      trialExpired,
      workspaceId: cleanString(workspaceData?.workspaceId) || cleanString(accountData?.workspaceId) || user?.uid || '',
    }
  }, [accountData, user, workspaceData])

  const hasCrmWorkspace = Boolean(workspaceData || accountData?.workspaceId)
  const visibleWorkspaces = workspaces
  const notificationCount = sampleNotifications.length
  const createDisabled = hasCrmWorkspace || creatingWorkspace
  const createWorkspaceMessage = hasCrmWorkspace ? 'You already have a CRM workspace.' : createMessage

  const handleLogout = useCallback(async () => {
    if (loggingOut) return

    setLoggingOut(true)
    try {
      if (auth) {
        await signOut(auth)
      }
    } finally {
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }, [loggingOut, navigate])

  const handleOpenCreate = useCallback(() => {
    if (hasCrmWorkspace) {
      setCreateMessage('You already have a CRM workspace.')
      return
    }
    setCreateMessage('')
    setCreateOpen(true)
  }, [hasCrmWorkspace])

  const handleCreateWorkspace = useCallback(async () => {
    if (!db || !user?.uid || creatingWorkspace) return
    if (hasCrmWorkspace) {
      setCreateMessage('You already have a CRM workspace.')
      return
    }

    setCreatingWorkspace(true)
    setCreateMessage('')
    try {
      const uid = user.uid
      const email = cleanString(user.email).toLowerCase()
      const name = cleanString(user.displayName) || cleanString(email.split('@')[0]) || 'Nexora User'
      const now = serverTimestamp()
      const trialEndsAt = addDays(new Date(), CRM_TRIAL_DAYS)
      const userRef = doc(db, 'users', uid)
      const workspaceRef = doc(db, 'workspaces', uid)
      const [userSnap, workspaceSnap] = await Promise.all([getDoc(userRef), getDoc(workspaceRef)])

      if (workspaceSnap.exists() || cleanString(userSnap.data()?.workspaceId)) {
        const nextAccount = userSnap.exists() ? userSnap.data() : null
        setAccountData(nextAccount)
        setWorkspaceData(workspaceSnap.exists() ? workspaceSnap.data() : null)
        setCreateMessage('You already have a CRM workspace.')
        return
      }

      const userPayload = {
        uid,
        ownerId: uid,
        userId: uid,
        workspaceId: uid,
        fullName: name,
        name,
        email,
        role: 'owner',
        plan: 'Free',
        planStatus: 'trial',
        billingCycle: 'monthly',
        trialStartedAt: now,
        trialEndsAt,
        isTrialActive: true,
        enabledModules: ['crm'],
        selectedFeatures: ['Nexora CRM'],
        workspaceName: 'Nexora CRM',
        updatedAt: now,
        lastLoginAt: now,
      }
      const workspacePayload = {
        ownerId: uid,
        userId: uid,
        workspaceId: uid,
        name: 'Nexora CRM',
        workspaceName: 'Nexora CRM',
        email,
        plan: 'Free',
        planStatus: 'trial',
        billingCycle: 'monthly',
        trialStartedAt: now,
        trialEndsAt,
        isTrialActive: true,
        enabledModules: ['crm'],
        selectedFeatures: ['Nexora CRM'],
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        lastAccessedAt: now,
      }

      await Promise.all([
        setDoc(userRef, userPayload, { merge: true }),
        setDoc(workspaceRef, workspacePayload, { merge: true }),
      ])
      setAccountData(userPayload)
      setWorkspaceData(workspacePayload)
      setCreateOpen(false)
      setCreateMessage('You already have a CRM workspace.')
    } catch {
      setCreateMessage('Could not create workspace right now.')
    } finally {
      setCreatingWorkspace(false)
    }
  }, [creatingWorkspace, hasCrmWorkspace, user])

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="bg-[#061a35] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-[250px] lg:overflow-y-auto">
          <div className="flex min-h-full flex-col px-4 py-5">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <img src={logoUrl} alt="Nexora" className="h-10 w-10 rounded-xl" />
                  <p className="text-2xl font-extrabold tracking-[0.08em] text-white">NEXORA</p>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-300">
                  Business Suite
                </p>
              </div>
            </div>

            <div className="relative mt-6">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]"
                aria-expanded={profileOpen}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                    {profile.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{authLoading ? 'Loading...' : profile.name}</span>
                    <span className="mt-0.5 block truncate text-xs capitalize text-slate-300">{profile.role}</span>
                  </span>
                  <HiOutlineChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
                </span>
              </button>

              {profileOpen ? (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-lg border border-white/10 bg-white p-3 text-slate-900 shadow-xl shadow-slate-950/25">
                  <p className="truncate text-sm font-bold">{profile.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{profile.email}</p>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-bold text-slate-700">{profile.planLabel}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{profile.trialLabel}</p>
                  </div>
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiLogOut className="h-4 w-4" />
                    {loggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              ) : null}
            </div>

            <nav className="mt-4 space-y-2">
              <SidebarItem
                icon={HiOutlineSquares2X2}
                label="Enter Workspace"
                active={workspaceView === 'enter'}
                onClick={() => setWorkspaceView('enter')}
              />
              <SidebarItem
                icon={HiOutlineSquares2X2}
                label="All Workspaces"
                active={workspaceView === 'all'}
                onClick={() => setWorkspaceView('all')}
              />
              <button
                type="button"
                disabled={createDisabled}
                onClick={handleOpenCreate}
                className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition ${
                  createDisabled
                    ? 'cursor-not-allowed text-slate-400 opacity-80'
                    : 'text-slate-200 hover:bg-white/7 hover:text-white'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-white/15">
                  <HiOutlinePlus className="h-4 w-4" />
                </span>
                Create New Workspace
              </button>
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Your Module Access
              </p>
              <div className="mt-3 space-y-2">
                {moduleAccess.map((module) => {
                  const Icon = module.icon

                  return (
                    <div
                      key={module.name}
                      className={`flex h-9 items-center gap-3 rounded-lg px-2 text-[13px] font-semibold ${
                        module.active ? 'text-white' : 'text-slate-300 opacity-75'
                      }`}
                      aria-disabled={module.disabled ? 'true' : undefined}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${module.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                      <span className="truncate">{module.name}</span>
                      {module.disabled ? (
                        <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                          Soon
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <SidebarItem icon={HiOutlineCog6Tooth} label="Settings" muted onClick={() => setSettingsOpen(true)} />

            <div className="mt-auto pt-6">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20">
                    <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-slate-200" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white">Need Help?</span>
                    <span className="block truncate text-[11px] text-slate-300">Contact our support team</span>
                  </span>
                </span>
                <HiOutlineChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-x-clip lg:ml-[250px]">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-5">
              <button type="button" className="text-slate-700">
                <HiOutlineBars3 className="h-6 w-6" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-6 text-slate-950">
                  {workspaceView === 'all' ? 'All Workspaces' : 'Enter Workspace'}
                </h1>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {workspaceView === 'all' ? 'All Nexora modules on one page' : 'Select a workspace to continue'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  aria-label="Open workspace notifications"
                  aria-expanded={notificationsOpen}
                >
                  <HiOutlineBell className="h-5 w-5" />
                  <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {notificationCount}
                  </span>
                </button>
                {notificationsOpen ? (
                  <NotificationDropdown notifications={sampleNotifications} onClose={() => setNotificationsOpen(false)} />
                ) : null}
              </div>
              <span className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div className="relative hidden md:block">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700"
                  onClick={() => setLanguageOpen((open) => !open)}
                  aria-expanded={languageOpen}
                >
                  <HiOutlineGlobeAlt className="h-5 w-5" />
                  {selectedLanguage}
                  <HiOutlineChevronDown className="h-4 w-4" />
                </button>
                {languageOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-xl shadow-slate-950/10">
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Language
                    </p>
                    <div className="space-y-1">
                      {languageOptions.map((language) => (
                        <button
                          key={language}
                          type="button"
                          className={`flex h-8 w-full items-center rounded-md px-2 text-left text-xs font-semibold ${
                            selectedLanguage === language ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            setSelectedLanguage(language)
                            setLanguageOpen(false)
                          }}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 border-t border-slate-100 px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Region
                    </p>
                    <div className="space-y-1">
                      {regionOptions.map((region) => (
                        <button
                          key={region}
                          type="button"
                          className={`flex h-8 w-full items-center rounded-md px-2 text-left text-xs font-semibold ${
                            selectedRegion === region ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                          onClick={() => setSelectedRegion(region)}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <span className="hidden h-8 w-px bg-slate-200 md:block" />
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiLogOut className="h-5 w-5" />
                <span className="hidden sm:inline">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          </header>

          <div className="px-5 py-5 lg:px-6">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative min-h-[150px] rounded-lg border border-slate-200 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 px-7 py-6 shadow-sm"
            >
              <div className="max-w-[520px]">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Welcome back, {profile.name.split(' ')[0]}.</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                  Select a workspace to access your business data and modules.
                </p>
              </div>

              <div className="pointer-events-none absolute bottom-0 right-8 hidden h-[145px] w-[360px] lg:block">
                <div className="absolute bottom-2 right-28 h-16 w-16 rounded-full bg-blue-600 shadow-[0_18px_35px_-22px_rgba(37,99,235,0.9)]" />
                <div className="absolute bottom-0 right-0 h-24 w-16 rounded-t-full bg-gradient-to-b from-emerald-200 to-slate-100" />
                <div className="absolute bottom-3 right-36 h-14 w-14 rounded-b-3xl rounded-t-lg bg-gradient-to-b from-blue-700 to-blue-500" />
                <div className="absolute bottom-4 right-40 h-5 w-10 rounded-full border-4 border-blue-700" />
                <div className="absolute bottom-0 right-44 h-4 w-20 rounded-full bg-slate-300/60 blur-sm" />
                <div className="absolute bottom-0 right-3 h-4 w-28 rounded-full bg-slate-300/50 blur-sm" />
                <div className="absolute bottom-5 right-11 h-14 w-12 rounded-b-lg bg-slate-200" />
                <div className="absolute bottom-[70px] right-10 h-16 w-3 rotate-[-18deg] rounded-full bg-emerald-300" />
                <div className="absolute bottom-[72px] right-23 h-16 w-3 rotate-[24deg] rounded-full bg-emerald-300" />
                <div className="absolute bottom-[72px] right-16 h-20 w-3 rounded-full bg-emerald-400" />
                <div className="absolute bottom-6 right-52 h-[110px] w-[150px] rounded-t-lg border-[10px] border-slate-800 bg-white shadow-xl">
                  <div className="grid h-full grid-cols-[42px_1fr] gap-2 bg-slate-50 p-2">
                    <div className="space-y-1.5">
                      <span className="block h-2 rounded bg-slate-200" />
                      <span className="block h-2 rounded bg-blue-100" />
                      <span className="block h-2 rounded bg-slate-200" />
                      <span className="block h-2 rounded bg-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <span className="block h-2 rounded bg-slate-200" />
                      <div className="flex items-end gap-1">
                        <span className="h-8 w-2 rounded bg-blue-500" />
                        <span className="h-12 w-2 rounded bg-blue-600" />
                        <span className="h-6 w-2 rounded bg-blue-300" />
                        <span className="h-10 w-2 rounded bg-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {profile.trialExpired ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                Your 7-day workspace trial has expired. Upgrade your package to continue using paid workspace features.
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-slate-950">
                {workspaceView === 'all' ? 'All Workspaces' : 'Your Workspaces'}
              </h2>
              <div className="flex items-center gap-3">
                <label className="relative block w-full sm:w-[270px]">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search workspace..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <div className="flex h-10 rounded-lg border border-slate-200 bg-white p-0.5">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-blue-300 text-blue-600">
                    <HiOutlineSquares2X2 className="h-5 w-5" />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500">
                    <HiOutlineBars3 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleWorkspaces.map((workspace, index) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} index={index} />
              ))}
              <CreateWorkspaceCard disabled={createDisabled} message={createWorkspaceMessage} onOpen={handleOpenCreate} />
            </div>

            <section className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
              {featureStrip.map((feature) => {
                const Icon = feature.icon

                return (
                  <div key={feature.title} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-bold text-blue-700">{feature.title}</h3>
                      <p className="mt-1 text-xs leading-4 text-slate-600">{feature.text}</p>
                    </div>
                  </div>
                )
              })}
            </section>

            <footer className="py-6 text-center text-xs font-medium text-slate-500">
              © 2025 Nexora Solutions. All rights reserved.
            </footer>
          </div>
        </section>
      </div>
      {createOpen ? (
        <CreateWorkspaceModal
          creating={creatingWorkspace}
          hasWorkspace={hasCrmWorkspace}
          message={createMessage}
          profile={profile}
          onCreate={handleCreateWorkspace}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsModal
          profile={profile}
          selectedLanguage={selectedLanguage}
          selectedRegion={selectedRegion}
          onLanguageChange={setSelectedLanguage}
          onRegionChange={setSelectedRegion}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </main>
  )
}
