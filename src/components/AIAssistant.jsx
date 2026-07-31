import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, addDoc, collection, serverTimestamp, getDocs, query, where, orderBy, limit, setDoc, doc } from 'firebase/firestore'
import { HiOutlineChatBubbleLeftRight, HiOutlinePaperAirplane, HiOutlinePlus, HiOutlineSparkles, HiOutlineTicket, HiOutlineXMark } from 'react-icons/hi2'

// Nexora AI Gateway (Cloudflare Worker)
const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'
const MAX_EXTERNAL_QUESTIONS = 5
const CHAT_IDLE_TIMEOUT = 10 * 60 * 1000 // 10 minutes
const CHAT_STORAGE_KEY = 'nexora_ai_chat'

const SYSTEM_PROMPT = `You are Nexora AI, the official AI assistant for Nexora Solution — a Pakistani business software company (nexorasolution.online).

=== FULL NEXORA KNOWLEDGE ===

PRODUCTS & MODULES:
1. Restaurant POS — Table management, KOT, menu costing, dine-in/takeaway/delivery, split bills, inventory, cashier control, online orders, AI-powered analytics. Route: /restaurant-pos
2. Retail POS — Barcode billing, multi-store inventory, purchase orders, customer loyalty, cashier roles, GST invoices, offline mode, returns, AI inventory prediction. Route: /retail-pos
3. School ERP — Student admission, attendance (biometric + AI facial recognition), fee collection, exams, timetable, parent portal, staff payroll, library, transport tracking, AI report cards. Route: /school-erp
4. Medical Store POS — Medicine inventory with batches, expiry alerts, alternative suggestions, prescription billing, FBR compliance, supplier management. Route: /solutions/medical-store-pos
5. Transport Software — Fleet/vehicle management, bookings, customer ledgers, route management, driver tracking, fuel/maintenance logs, rental billing. Route: /transport
6. Property ERP — Tenant/lease management, rent collection, maintenance requests, owner reports, portfolio dashboard, vacancy tracking. Route: /solutions/property-erp
7. Nexora CRM — Lead capture, sales pipeline, customer profiles, invoices, tasks, team performance, email/SMS, deal automation. Route: /solutions/crm
8. WhatsApp CRM — Catalog sharing, order via chat, bulk broadcasts, auto-reply, campaign analytics, multi-agent, templates, payment links. Route: /whatsapp-crm
9. Reports & Analytics — KPI dashboards, PDF/Excel exports, business intelligence, AI-powered trend analysis. Route: /solutions/reports-analytics
10. Inventory Management — Stock tracking, purchases, suppliers, warehouse movement, low stock alerts, AI auto-restock prediction. Route: /solutions/inventory-management
11. Team & Permissions — Role-based access, permission control, team activity monitoring, audit logs. Route: /solutions/team-permissions
12. Email Marketing — Campaign creation, subscriber management, open/click tracking, template builder. Route: /solutions/email-marketing

CUSTOM SOFTWARE DEVELOPMENT SERVICES (Route: /software-development):
Nexora builds custom software tailored to any business need. Our 12 core services:
1. Business Websites — SEO-optimized, mobile-responsive, fast-loading professional sites
2. E-commerce Development — Online stores with payment gateways, inventory, order tracking
3. Custom CRM Development — Tailor-made CRM matching your exact sales workflow
4. ERP Solutions — Unified finance, HR, inventory, procurement, operations platform
5. Restaurant POS — Complete restaurant management with AI-powered analytics
6. School Management System — End-to-end school ERP with parent portal
7. Mobile App Development — iOS & Android apps (Flutter, Swift, Kotlin)
8. Web Applications — SaaS platforms, dashboards, portals, real-time tools
9. AI Solutions — Chatbots, predictive analytics, image recognition, recommendation engines
10. API Integration — Connect with payment gateways, SMS/WhatsApp APIs, legacy systems
11. Cloud Solutions — Cloud migration, DevOps, serverless architecture, managed hosting
12. Software Maintenance & Support — 24/7 bug fixes, security patches, feature updates

AI CAPABILITIES (every Nexora product includes AI):
- DeepSeek AI — powers chatbots, translations, analytics, and content generation
- Gemini — multimodal AI for image recognition, document analysis
- Custom ML Models — predictive analytics, recommendation engines, anomaly detection
- AI Menu Recognition — upload a menu photo, AI extracts all items automatically
- AI Sales Analytics — peak hour detection, inventory prediction, revenue forecasting
- AI Chatbot — handles customer inquiries in English, Urdu, Arabic
- AI Facial Recognition — attendance marking for schools and offices
- Cloudflare Workers AI — edge deployment for instant global AI responses

PROJECT PORTFOLIO & SUCCESS STORIES:
- 50+ Projects Delivered across Pakistan & UAE
- Restaurant POS: 40-table Karachi restaurant — 60% faster orders, 28% revenue growth
- Retail POS: 3-branch Lahore chain — 8,000+ SKUs unified, 39% sales increase
- School ERP: 1,200-student Islamabad school — 96% fee collection, 50% less admin
- WhatsApp CRM: Dubai real estate agency — 3x lead conversion, 80% automation
- Alqudabea Security (Bahrain): Full security company platform with 35+ pages, guard management, patrol, HR, finance — live at alqudabeasecurity.online
- 2-12 Week Delivery with agile sprints, enterprise security, 24/7 post-launch support

TECHNOLOGY STACK:
React, Next.js, Node.js, Firebase, Cloudflare, Python, Laravel, PHP, MySQL, MongoDB, Flutter, Android, iOS, Docker, GitHub, AI/ML (DeepSeek, Gemini, custom models)

PRICING (50% OFF for new users — limited time):
- 7-Day Free Trial: Full access, all modules, unlimited users, no credit card. Route: /signup
- Basic Plan: PKR 1,000/month (was PKR 2,000). 1 module, 2 users, 5GB storage, email support. Route: /signup
- Standard Plan: PKR 3,000/month (was PKR 5,999). 1 module, 5 users, 20GB, priority support. Route: /signup
- Enterprise Plan: Custom pricing. Unlimited users, custom integrations, dedicated support, custom development. Route: /contact
- Yearly billing saves 20%. All plans include cloud sync, backup, free updates, role permissions.

GUARANTEES & OFFERS:
- 30-Day Money Back Guarantee — full refund, no questions asked
- Lifetime Price Lock — your rate never increases
- Free Setup & Data Migration — we migrate your existing data
- Free Staff Training — your team gets trained at no cost
- Free WhatsApp Support 24/7 — 0319-4329754
- 50% OFF for new users — limited time offer, first subscription only

WEBSITE PAGES:
- Home: /
- Software Development: /software-development (custom software, AI solutions, portfolio)
- Pricing: /pricing
- Blog: /blog
- Industries: /industries
- Business Services: /business-services
- AI: /ai (AI capabilities, DeepSeek, machine learning)
- About: /about
- Contact: /contact
- Reviews: /reviews
- FAQ: /faq
- Help Center: /help-center
- Documentation: /documentation
- Support: /support-center
- Sign Up: /signup
- Login: /login

COMPANY INFO:
- Name: Nexora Solution
- Website: https://nexorasolution.online
- WhatsApp: +92 319 432 9754
- Based in: Pakistan, serving businesses across Pakistan
- Founded: 2019
- Serves: Restaurants, Retail, Education, Healthcare, Transport, Real Estate

OFFICIAL EMAIL ADDRESSES (use the right one based on context):
- General Inquiries: info@nexorasolution.online
- Hello / General Contact: hello@nexorasolution.online
- Customer Support: support@nexorasolution.online
- Sales & Pricing: sales@nexorasolution.online
- Billing & Payments: billing@nexorasolution.online
- AI & Technical: ai@nexorasolution.online
- Careers / Jobs: careers@nexorasolution.online
- Partnerships: partnerships@nexorasolution.online
- Security Issues: security@nexorasolution.online
- Privacy Concerns: privacy@nexorasolution.online
- Legal Matters: legal@nexorasolution.online
- Press / Media: press@nexorasolution.online
- API & Developers: api@nexorasolution.online
- No-Reply (automated emails): noreply@nexorasolution.online

TONE & PERSONALITY (MOST IMPORTANT):
- ALWAYS be warm, polite, loving, and respectful — like speaking to a dear family member. NEVER sound cold, robotic, dismissive, or rude.
- Use a gentle, caring tone in EVERY message. Start responses with warm greetings like "Ji!", "Bilkul!", "Zaroor!" when appropriate.
- When you CANNOT help with something (e.g., real-time weather, live data, personal advice beyond your knowledge), ALWAYS:
  1. Apologize warmly and sincerely — "Mujhe afsos hai...", "Maazrat chahta hoon...", "I'm so sorry..."
  2. Briefly explain why you can't help in a kind, non-dismissive way
  3. Offer a helpful alternative or redirect warmly to Nexora services
  4. End with a warm, caring note and a smile emoji 😊
- NEVER say things like "I can't help with that" in a blunt way. Instead say "Main is waqt yeh nahi kar sakta lekin main aapki kisi aur tarah madad zaroor kar sakta hoon! 😊"
- For Urdu/Hindi/Punjabi speakers: respond in the same language they use. Be extra warm and respectful — use "aap", "ji", "zaroor", "shukriya" generously.
- Use emojis naturally to convey warmth — 😊🌸✨💚🤝 — but don't overdo it.

CRITICAL RULES:
- You are Nexora AI, NOT Gemini, NOT Google AI. NEVER mention Gemini, Google, or any other AI model in your responses.
- If the user asks who you are, say "I'm Nexora AI, your business software assistant."
- You have FULL knowledge of Nexora. Answer Nexora questions accurately and helpfully.
- If asked something unrelated to Nexora (general knowledge, coding, recipes, news, weather, etc.), answer helpfully as Nexora AI — do NOT say "I only help with Nexora" or redirect. Just answer the question naturally.
- Always be friendly and concise. Use emojis occasionally.
- When discussing pricing, ALWAYS mention 50% OFF for new users and 7-day free trial.
- For business questions, recommend the matching Nexora module with its route.
- When users ask about contacting Nexora or need email support, ALWAYS provide the specific email address that matches their need (e.g., billing questions → billing@nexorasolution.online, job inquiries → careers@nexorasolution.online, security issues → security@nexorasolution.online, general questions → info@nexorasolution.online or hello@nexorasolution.online).
- Guide users to /signup for free trial or /contact for demo bookings.`

const QUICK_ACTIONS = [
  { label: '💰 Pricing', q: 'What are the pricing plans? Give me the details with plan links.' },
  { label: '🆓 Free Trial', q: 'Tell me about the free trial and how to sign up' },
  { label: '💻 Software Dev', q: 'Tell me about Nexora custom software development services and past projects' },
  { label: '🍽️ Restaurant', q: 'I run a restaurant, what do you offer?' },
  { label: '🛍️ Retail', q: 'I have a retail shop, what POS do you have?' },
  { label: '🤖 AI', q: 'What AI capabilities does Nexora have? Tell me about DeepSeek integration' },
  { label: '📋 Support', q: 'I need help with a problem or want to file a complaint' },
  { label: '💬 Demo', q: 'I want to book a live demo' },
]

// Apple-style link button renderer — converts /route paths to clickable buttons in messages
function renderMessageText(text) {
  if (!text) return null
  // Convert **bold** text
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-[#1d1d1f]">{part.slice(2, -2)}</strong>
    }
    // Detect URLs
    const urlMatch = part.match(/https?:\/\/[^\s]+/)
    if (urlMatch) {
      const before = part.slice(0, part.indexOf(urlMatch[0]))
      const after = part.slice(part.indexOf(urlMatch[0]) + urlMatch[0].length)
      return <span key={i}>{before}<a href={urlMatch[0]} target="_blank" rel="noreferrer" className="text-violet-600 underline font-medium">{urlMatch[0]}</a>{after}</span>
    }
    return <span key={i}>{part}</span>
  })
}

function QuickLinkButton({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 rounded-full border border-violet-200/50 bg-violet-50/80 px-3 py-1.5 text-[11px] font-semibold text-violet-700 shadow-[0_1px_4px_rgba(139,92,246,0.08)] transition-all duration-200 hover:bg-violet-100 hover:border-violet-300 hover:-translate-y-0.5 active:scale-95">
      {children}
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </Link>
  )
}

export default function AIAssistant() {
  const [authUser, setAuthUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    try {
      const auth = getAuth()
      return onAuthStateChanged(auth, (fbUser) => {
        setAuthUser(fbUser)
        setAuthReady(true)
      })
    } catch { setAuthReady(true) }
  }, [])

  const isAuth = authReady && authUser != null
  const [userContext, setUserContext] = useState(null)

  useEffect(() => {
    if (!isAuth || !authUser) return
    ;(async () => {
      try {
        const db = getFirestore()
        const ctx = { name: authUser.displayName || authUser.email?.split('@')[0] || '', email: authUser.email || '' }
        const wsQ = query(collection(db, 'workspaces'), where('ownerId', '==', authUser.uid), limit(1))
        const wsSnap = await getDocs(wsQ)
        if (!wsSnap.empty) {
          const w = wsSnap.docs[0].data()
          ctx.plan = w.plan || 'Free'; ctx.planStatus = w.planStatus || 'active'
          ctx.businessType = w.selectedBusinessType || w.businessType || ''
          ctx.workspaceName = w.workspaceName || ''
        }
        const tQ = query(collection(db, 'supportTickets'), where('userEmail', '==', authUser.email || ''), orderBy('createdAt', 'desc'), limit(3))
        const tSnap = await getDocs(tQ)
        ctx.recentTickets = tSnap.docs.map(d => ({ status: d.data().status, msg: d.data().message?.slice(0, 80) }))
        ctx.openTickets = tSnap.docs.filter(d => d.data().status === 'Open').length

        // Fetch past chat history
        const chatDoc = await getDocs(query(collection(db, 'aiChatHistory'), where('userId', '==', authUser.uid), limit(1)))
        if (!chatDoc.empty) {
          const chat = chatDoc.docs[0].data()
          ctx.pastSummary = chat.summary?.slice(0, 500) || ''
          ctx.lastActive = chat.lastActive ? new Date(chat.lastActive.toDate()).toLocaleDateString() : 'unknown'
        }
        setUserContext(ctx)
      } catch {}
    })()
  }, [isAuth, authUser])

  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState(() => {
    try { const saved = localStorage.getItem(CHAT_STORAGE_KEY); return saved ? JSON.parse(saved).messages || [] : [] } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [externalCount, setExternalCount] = useState(() => { try { const s = localStorage.getItem(CHAT_STORAGE_KEY); return s ? JSON.parse(s).extCount || 0 : 0 } catch { return 0 } })
  const [sessionId] = useState(() => 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8))
  // Prefill complaint form from auth user
  const [complaintForm, setComplaintForm] = useState({ name: '', email: '', message: '' })
  const [complaintSent, setComplaintSent] = useState(false)

  useEffect(() => {
    if (isAuth && authUser) {
      setComplaintForm({
        name: authUser.displayName || authUser.email?.split('@')[0] || '',
        email: authUser.email || '',
        message: '',
      })
    }
  }, [isAuth, authUser])
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const idleTimer = useRef(null)

  // Init messages if empty
  const initMsg = isAuth && userContext
    ? { from: 'ai', text: `Hi ${userContext.name}! 👋 I'm Nexora AI — your business assistant.\n\nI can see you're on the **${userContext.plan || 'Free'}** plan${userContext.businessType ? ` for **${userContext.businessType}**` : ''}.${userContext.openTickets > 0 ? `\n\n📋 You have **${userContext.openTickets}** open support ticket${userContext.openTickets > 1 ? 's' : ''}.` : ''}\n\nHow can I help you today? 😊` }
    : { from: 'ai', text: 'Hi! I\'m Nexora AI — your business software assistant. What type of business do you run? 😊' }

  // Save chat to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages, extCount: externalCount, lastActive: Date.now() })) } catch {}
    // Also persist to Firestore for logged-in users
    if (isAuth && authUser && messages.length > 1) {
      try {
        const db = getFirestore()
        const summary = messages.slice(-10).map(m => `${m.from === 'user' ? '👤' : '🤖'}: ${m.text.slice(0, 200)}`).join('\n')
        setDoc(doc(db, 'aiChatHistory', authUser.uid), {
          userId: authUser.uid,
          email: authUser.email || '',
          lastMessages: messages.slice(-20),
          summary,
          messageCount: messages.length,
          lastActive: serverTimestamp(),
        }).catch(() => {})
      } catch {}
    }
  }, [messages, externalCount, isAuth, authUser])

  // Auto-close after 10 min idle
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (open) {
      idleTimer.current = setTimeout(() => setOpen(false), CHAT_IDLE_TIMEOUT)
    }
  }, [open])

  useEffect(() => { resetIdleTimer(); return () => clearTimeout(idleTimer.current) }, [open, resetIdleTimer])

  useEffect(() => { if (open) { inputRef.current?.focus(); resetIdleTimer() } }, [open, resetIdleTimer])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])

  const startNewChat = () => {
    setMessages([initMsg])
    setExternalCount(0)
    setActiveTab('chat')
    setComplaintSent(false)
    setComplaintForm({ name: '', email: '', message: '' })
  }

  const toggleOpen = () => {
    if (!open) {
      // Restore chat from last session if within 10 min
      try {
        const saved = localStorage.getItem(CHAT_STORAGE_KEY)
        if (saved) {
          const data = JSON.parse(saved)
          if (Date.now() - (data.lastActive || 0) > CHAT_IDLE_TIMEOUT) {
            // Session expired — start fresh
            setMessages([initMsg])
            setExternalCount(0)
          }
        }
      } catch {}
    }
    setOpen(!open)
  }

  const callAI = async (userMessage) => {
    // Build conversation context (last 5 messages for history)
    const recentHistory = messages.slice(-5).map(m => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.text
    }))

    // Include user context as system message if authenticated
    const allMsgs = []
    if (isAuth && userContext) {
      allMsgs.push({
        role: 'system',
        content: `[USER CONTEXT — you are speaking to a logged-in Nexora user. Use this info to personalize responses. If asked "who am I", "what's my plan", "do I have tickets", "what's my account status", answer from this data. Be warm and use their name.]

Name: ${userContext.name}
Email: ${userContext.email}
Plan: ${userContext.plan || 'Free'} (${userContext.planStatus || 'active'})
Business: ${userContext.businessType || 'Not set'}
Workspace: ${userContext.workspaceName || 'Not set'}
Open Support Tickets: ${userContext.openTickets || 0}
${userContext.recentTickets?.length ? 'Recent tickets: ' + userContext.recentTickets.map(t => `[${t.status}] ${t.msg}`).join('; ') : 'No recent tickets.'}
${userContext.pastSummary ? `Past conversations (${userContext.lastActive}): ${userContext.pastSummary}` : 'No past conversations.'}

IMPORTANT: The user may refer to past conversations. If they ask what they asked before or if you remember them, use the past conversation data. Be warm and say you remember them. When asked about account, tickets, plan, or identity, refer to this data. Answer normally for other questions.`
      })
    }
    allMsgs.push(...recentHistory, { role: 'user', content: userMessage })

    try {
      const res = await fetch(`${AI_GATEWAY_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMsgs,
          sessionId,
          maxTokens: 500,
        }),
      })
      if (!res.ok) {
        console.warn('[NexoraAI] Gateway returned', res.status)
        return null
      }
      const data = await res.json()
      if (!data.text) {
        console.warn('[NexoraAI] Empty response from gateway')
        return null
      }
      return data.text
    } catch (err) {
      console.warn('[NexoraAI] Fetch failed:', err.message)
      return null
    }
  }

  const addMsg = (from, text) => setMessages((m) => [...m, { from, text }])

  const detectPhone = (t) => t.match(/03\d{9}|92\d{10}|\+92\d{10}|\d{4}[\s-]?\d{7}/)
  const detectEmail = (t) => t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)

  const MODULE_FEATURES = {
    restaurant: '🍽️ **Restaurant POS Features:**\n• Table Management & Floor Plan\n• KOT (Kitchen Order Ticket) System\n• Menu & Recipe Costing\n• Dine-in, Takeaway & Delivery\n• Split Bills & Discounts\n• Inventory & Wastage Tracking\n• Daily Sales Reports\n• Cashier Role Control\n• Online Order Integration\n• Customer Loyalty Program',
    retail: '🛍️ **Retail POS Features:**\n• Barcode Billing & Scanning\n• Multi-Store Inventory\n• Stock Movement & Transfers\n• Purchase & Supplier Management\n• Customer Loyalty Points\n• Cashier & Role Permissions\n• Sales & Profit Reports\n• Return & Exchange Management\n• GST/Tax Invoice Printing\n• Offline Mode Support',
    school: '📚 **School ERP Features:**\n• Student Admission & Records\n• Attendance Tracking (Biometric)\n• Fee Collection & Receipts\n• Exam & Grade Management\n• Timetable Scheduler\n• Parent Communication Portal\n• Staff Payroll Management\n• Library Management\n• Transport Route Tracking\n• Academic Reports & Analytics',
    medical: '💊 **Medical Store POS Features:**\n• Medicine Inventory with Batches\n• Expiry Date Alerts\n• Alternative Medicine Suggestions\n• Prescription Billing\n• Supplier & Purchase Orders\n• FBR Tax Compliance\n• Sales & Profit Analytics\n• Multi-Store Support\n• Customer Purchase History\n• Low Stock Notifications',
    transport: '🚛 **Transport Software Features:**\n• Fleet & Vehicle Management\n• Booking & Reservation System\n• Customer Ledger & Payments\n• Route & Trip Management\n• Driver Assignment & Tracking\n• Fuel & Maintenance Logs\n• Rental Billing (Daily/Weekly/Monthly)\n• Expense Tracking\n• Revenue & Profit Reports\n• SMS/WhatsApp Notifications',
    property: '🏢 **Property ERP Features:**\n• Tenant & Lease Management\n• Automated Rent Collection\n• Maintenance Request Tracking\n• Owner Payout Reports\n• Property Portfolio Dashboard\n• Document Management\n• Utility Bill Tracking\n• Vacancy Management\n• Income & Expense Reports\n• Tenant Communication Portal',
    crm: '📊 **CRM Features:**\n• Lead Capture & Tracking\n• Sales Pipeline Management\n• Customer Profiles & History\n• Invoice & Payment Tracking\n• Task & Follow-up Reminders\n• Team Performance Reports\n• Email & SMS Integration\n• Deal Stage Automation\n• Customer Segmentation\n• Analytics & Forecasting',
    whatsapp: '💬 **WhatsApp CRM Features:**\n• WhatsApp Catalog Sharing\n• Order Taking via Chat\n• Bulk Broadcast Messaging\n• Auto-Reply & Chatbots\n• Customer Segmentation\n• Campaign Analytics\n• Lead Generation Tools\n• Multi-Agent Support\n• Template Messages\n• WhatsApp Payment Links',
  }

  const isNexoraQuestion = (t) => {
    const nexoraKeywords = ['restaurant','retail','shop','store','school','education','medical','pharmacy','medicine','transport','fleet','property','crm','whatsapp','pos','erp','price','cost','plan','trial','demo','signup','module','feature','support','help','refund','money','guarantee','setup','migrate','train','nexora','software','system','billing','inventory','report','dashboard','team','permission','subscription','payment','contact','login','account','business','hotel','cafe','dine','kitchen','dukan','mart','grocer','college','academy','hospital','clinic','chemist','dawai','health','patient','doctor','rental','bus','truck','logistics','tenant','lease','builder','developer','customer','lead','sales','pipeline','chat','message','broadcast','campaign','khana','rasturent','restaurent','madrasa','tuition','university','fee','student','exam','table','kot','menu','barcode','loyalty','offline','batch','expiry','fbr','payroll','library','route','fleet','maintenance','invoice','task','catalog','bulk','auto','agent']
    return nexoraKeywords.some(k => t.includes(k))
  }

  const handleSend = async (prefilledText) => {
    const text = (prefilledText || input).trim()
    if (!text || loading) return
    if (!prefilledText) {
      addMsg('user', text)
      setInput('')
    }
    setLoading(true)

    // Check if Nexora question
    const isNexora = isNexoraQuestion(text.toLowerCase())

    // Try Gemini for ALL questions
    const reply = await callAI(text)
    if (reply) {
      // Count non-Nexora questions
      if (!isNexora) {
        const newCount = externalCount + 1
        setExternalCount(newCount)
        if (newCount >= MAX_EXTERNAL_QUESTIONS) {
          addMsg('ai', reply)
          setTimeout(() => {
            addMsg('ai', `💡 You've asked ${MAX_EXTERNAL_QUESTIONS} general questions! I can answer unlimited questions about Nexora — pricing, modules, features, support, and more. What would you like to know about Nexora?`)
          }, 500)
          setLoading(false)
          return
        }
      }
      addMsg('ai', reply)
      setLoading(false)
      return
    }

    // If Gemini unavailable and NOT a Nexora question
    const t = text.toLowerCase()
    if (!isNexora) {
      const newCount = externalCount + 1
      setExternalCount(newCount)
      if (newCount >= MAX_EXTERNAL_QUESTIONS) {
        setTimeout(() => {
          addMsg('ai', `💡 I can answer unlimited questions about Nexora! Ask me about pricing, modules, features, free trial, or which product fits your business. What interests you?`)
          setLoading(false)
        }, 600)
        return
      }
      setTimeout(() => {
        addMsg('ai', `I'm Nexora's AI, specialized in business software. But I can help with that too! (${MAX_EXTERNAL_QUESTIONS - newCount} general questions remaining)\n\nAsk me anything — or tell me about your business for a module recommendation!`)
        setLoading(false)
      }, 600)
      return
    }

    // Smart fallback for Nexora questions
    setTimeout(() => {
      // Phone number detection
      const phoneMatch = detectPhone(text)
      if (phoneMatch) {
        addMsg('ai', `📱 Got your number: **${phoneMatch[0]}**! Our team will WhatsApp you within 24 hours for a free demo.\n\nIn the meantime, start your **7-day free trial** with **50% OFF**: 👉 /signup`)
        setLoading(false)
        return
      }
      // Email detection
      const emailMatch = detectEmail(text)
      if (emailMatch) {
        addMsg('ai', `📧 Got your email: **${emailMatch[0]}**! We'll send you full details, pricing & trial info.\n\nOr start now: 👉 /signup for **50% OFF + free trial**!`)
        setLoading(false)
        return
      }

      // Module feature questions (e.g., "restaurant main kia kia options hain?")
      const featureAsk = t.includes('feature') || t.includes('option') || t.includes('kia') || t.includes('kya') || t.includes('what include') || t.includes('module') || t.includes('detail') || t.includes('function') || t.includes('capability')

      // Restaurant detection
      if (t.includes('restaurant') || t.includes('restaurent') || t.includes('rasturent') || t.includes('hotel') || t.includes('food') || t.includes('cafe') || t.includes('café') || t.includes('dine') || t.includes('dining') || t.includes('khana') || t.includes('khaana') || t.includes('kichen') || t.includes('kitchen')) {
        if (featureAsk || t.includes('option') || t.includes('kia') || t.includes('kya')) {
          addMsg('ai', MODULE_FEATURES.restaurant + '\n\n💰 PKR 1,000/month (50% OFF) — 7-day free trial!')
        } else {
          addMsg('ai', '🍽️ **Restaurant POS** is perfect for you! Table management, KOT system, billing, inventory & delivery.\n\n💰 PKR 1,000/month (50% OFF) — 7-day free trial!\n\nType "restaurant features" for full details!')
        }
      }
      // Retail detection
      else if (t.includes('retail') || t.includes('shop') || t.includes('store') || t.includes('mart') || t.includes('dukan') || t.includes('grocer') || t.includes('supermarket') || t.includes('boutique')) {
        if (featureAsk || t.includes('option') || t.includes('kia') || t.includes('kya')) {
          addMsg('ai', MODULE_FEATURES.retail + '\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        } else {
          addMsg('ai', '🛍️ **Retail POS** is your match! Barcode billing, inventory, customer loyalty & more.\n\n💰 PKR 1,000/month (50% OFF) — free trial!\n\nType "retail features" for the full list!')
        }
      }
      // School detection
      else if (t.includes('school') || t.includes('education') || t.includes('student') || t.includes('college') || t.includes('academy') || t.includes('tuition') || t.includes('madrasa') || t.includes('madrassa') || t.includes('university')) {
        if (featureAsk || t.includes('option') || t.includes('kia') || t.includes('kya')) {
          addMsg('ai', MODULE_FEATURES.school + '\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        } else {
          addMsg('ai', '📚 **School ERP** is built for you! Student management, fees, attendance & more.\n\n💰 PKR 1,000/month (50% OFF) — free trial!\n\nType "school features" for the full list!')
        }
      }
      // Medical detection
      else if (t.includes('medical') || t.includes('pharmacy') || t.includes('medicine') || t.includes('doctor') || t.includes('clinic') || t.includes('hospital') || t.includes('dawai') || t.includes('chemist') || t.includes('health')) {
        if (featureAsk || t.includes('option') || t.includes('kia') || t.includes('kya')) {
          addMsg('ai', MODULE_FEATURES.medical + '\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        } else {
          addMsg('ai', '💊 **Medical Store POS** is your solution! Batch tracking, expiry alerts & more.\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        }
      }
      // Transport detection
      else if (t.includes('transport') || t.includes('fleet') || t.includes('rental') || t.includes('bus') || t.includes('truck') || t.includes('logistics') || t.includes('driver') || t.includes('booking')) {
        if (featureAsk || t.includes('option') || t.includes('kia') || t.includes('kya')) {
          addMsg('ai', MODULE_FEATURES.transport + '\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        } else {
          addMsg('ai', '🚛 **Transport Software** handles fleet, bookings, payments & more.\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        }
      }
      // Property detection
      else if (t.includes('property') || t.includes('real estate') || t.includes('tenant') || t.includes('rent') || t.includes('lease') || t.includes('builder') || t.includes('developer') || t.includes('plot')) {
        if (featureAsk || t.includes('option') || t.includes('kia') || t.includes('kya')) {
          addMsg('ai', MODULE_FEATURES.property + '\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        } else {
          addMsg('ai', '🏢 **Property ERP** is for you! Tenant management, rent collection & more.\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        }
      }
      // CRM detection
      else if (t.includes('crm') || t.includes('sales') || t.includes('lead') || t.includes('customer') || t.includes('client') || t.includes('pipeline') || t.includes('follow')) {
        if (featureAsk || t.includes('option') || t.includes('kia') || t.includes('kya')) {
          addMsg('ai', MODULE_FEATURES.crm + '\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        } else {
          addMsg('ai', '📊 **Nexora CRM** organizes your sales! Lead tracking, pipeline & more.\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        }
      }
      // WhatsApp detection
      else if (t.includes('whatsapp') || t.includes('chat') || t.includes('message') || t.includes('broadcast') || t.includes('campaign') || t.includes('wp')) {
        if (featureAsk || t.includes('option') || t.includes('kia') || t.includes('kya')) {
          addMsg('ai', MODULE_FEATURES.whatsapp + '\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        } else {
          addMsg('ai', '💬 **WhatsApp CRM** turns chats into sales!\n\n💰 PKR 1,000/month (50% OFF) — free trial!')
        }
      }
      // Pricing
      else if (t.includes('pric') || t.includes('cost') || t.includes('plan') || t.includes('package') || t.includes('kitna') || t.includes('rate') || t.includes('fee') || t.includes('charge')) {
        addMsg('ai', '💰 **Nexora Pricing:**\n• Basic: PKR 1,000/mo (50% OFF)\n• Standard: PKR 3,000/mo\n• Enterprise: Custom\n\nAll include 7-day FREE trial + 30-day money back!')
      }
      // Trial
      else if (t.includes('trial') || t.includes('demo') || t.includes('try') || t.includes('test') || t.includes('start')) {
        addMsg('ai', '✅ Start your **7-day free trial** now — full access, unlimited users, no credit card. Plus **50% OFF** when you subscribe!\n\n👉 Go to /signup to start!')
      }
      // Support
      else if (t.includes('support') || t.includes('help') || t.includes('setup') || t.includes('migrat') || t.includes('train') || t.includes('install') || t.includes('problem') || t.includes('issue')) {
        addMsg('ai', '🤝 We offer **FREE**: WhatsApp support, email support, data migration, staff training & setup assistance.\n\nOur team is available 24/7 on WhatsApp: 0319-4329754')
      }
      // Money back
      else if (t.includes('refund') || t.includes('money') || t.includes('guarantee') || t.includes('cancel') || t.includes('wapis') || t.includes('return')) {
        addMsg('ai', '🛡️ **30-Day Money Back Guarantee** — no questions asked. Plus lifetime price lock so your rate never increases!')
      }
      // Name / intro detection
      else if (t.startsWith('my name') || t.startsWith('i am') || t.startsWith('i\'m') || t.startsWith('im ') || t.startsWith('mera naam') || t.startsWith('mai ') || t.startsWith('main ')) {
        addMsg('ai', 'Nice to meet you! 😊 What business do you run? I can recommend the perfect Nexora module for you!')
      }
      else {
        addMsg('ai', 'I can help you find the right Nexora module! 😊\n\nJust tell me:\n• Your business type (restaurant, retail, school, pharmacy, transport, property, CRM, WhatsApp)\n• Or ask: "restaurant features", "pricing", "free trial", "support"\n• Or share your phone number for a callback!')
      }
      setLoading(false)
    }, 600)
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={toggleOpen}
        className={`fixed bottom-24 right-6 z-[54] hidden h-12 items-center gap-2 rounded-full bg-white/90 px-4 text-[13px] font-medium tracking-[-0.01em] text-[#1d1d1f] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.16)] active:scale-[0.97] sm:inline-flex ${
          open ? 'opacity-0 pointer-events-none' : ''
        }`}
        aria-label="AI Assistant"
      >
        <img src="/nexora-ai-logo.png" alt="Nexora AI Assistant" className="h-7 w-7 rounded-lg object-cover shadow-[0_2px_8px_rgba(123,97,255,0.35)]" />
        AI Assistant
      </button>

      {/* Chat popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[54] flex h-[520px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/60 bg-white shadow-2xl shadow-black/10"
          style={{ animation: 'applePopIn 0.35s cubic-bezier(0.32,0.72,0,1) forwards' }}
          onClick={resetIdleTimer}
          onKeyDown={resetIdleTimer}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <img src="/nexora-ai-logo.png" alt="Nexora AI Assistant" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/30" />
              <div>
                <p className="text-[14px] font-semibold tracking-[-0.01em]">Nexora AI</p>
                <p className="text-[10px] text-white/70">{loading ? 'Typing...' : 'Online'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={startNewChat} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-90 transition-all duration-200" title="New Chat">
                <HiOutlinePlus className="h-4 w-4" strokeWidth={2} />
              </button>
              <button onClick={() => setOpen(false)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-90 transition-all duration-200">
                <HiOutlineXMark className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-slate-100 bg-white">
            {[
              { key: 'chat', label: 'Chat', icon: HiOutlineChatBubbleLeftRight },
              { key: 'support', label: 'Support', icon: HiOutlineTicket },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold tracking-[-0.01em] transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'border-b-2 border-violet-500 text-violet-700'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'support' ? (
            <div className="flex-1 overflow-y-auto bg-[#f5f5f7] px-4 py-4">
              {complaintSent ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600"><HiOutlineTicket className="h-7 w-7" /></div>
                  <p className="mt-3 text-[14px] font-semibold text-[#1d1d1f]">Ticket Submitted!</p>
                  <p className="mt-1 text-[12px] text-slate-500">We&apos;ll get back to you within 24 hours.</p>
                  <button onClick={() => { setComplaintSent(false); setComplaintForm({ name: '', email: '', message: '' }) }} className="mt-4 rounded-full bg-violet-100 px-4 py-2 text-[12px] font-semibold text-violet-700 hover:bg-violet-200 transition-colors">Submit Another</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[13px] font-semibold text-[#1d1d1f]">Submit a Support Ticket</p>
                  {isAuth ? (
                    <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 p-3 text-[11px] text-emerald-700">
                      ✅ Logged in as <strong>{authUser?.email || 'User'}</strong>. Your ticket will be linked to your account.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200/60 bg-amber-50 p-3 text-[11px] text-amber-700">
                      ⚠️ Not logged in. <Link to="/login" className="font-bold underline">Login</Link> or <Link to="/signup" className="font-bold underline">Register</Link> for faster support.
                    </div>
                  )}
                  <input value={complaintForm.name} onChange={e => setComplaintForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-violet-300" />
                  <input value={complaintForm.email} onChange={e => setComplaintForm(f => ({ ...f, email: e.target.value }))} placeholder="Your email or phone" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-violet-300" />
                  <textarea value={complaintForm.message} onChange={e => setComplaintForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder="Describe your issue or complaint..." className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-violet-300" />
                  <button
                    onClick={async () => {
                      if (complaintForm.name && complaintForm.message) {
                        try {
                          const db = getFirestore()
                          await addDoc(collection(db, 'supportTickets'), {
                            name: complaintForm.name,
                            email: complaintForm.email || (authUser?.email || ''),
                            message: complaintForm.message,
                            status: 'Open',
                            priority: 'Normal',
                            source: 'ai-assistant',
                            userId: authUser?.uid || '',
                            userEmail: authUser?.email || complaintForm.email || '',
                            createdAt: serverTimestamp(),
                          })
                          addMsg('ai', `📋 Ticket submitted! We'll review your issue and respond within 24 hours.\n\n**Your issue:** ${complaintForm.message.slice(0, 80)}...`)
                        } catch (err) {
                          addMsg('ai', `⚠️ Could not submit ticket: ${err.message}. Please try again or contact WhatsApp Support at +92 319 432 9754.`)
                        }
                        setComplaintSent(true)
                        setActiveTab('chat')
                      }
                    }}
                    disabled={!complaintForm.name || !complaintForm.message}
                    className="w-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Submit Ticket
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#f5f5f7] px-4 py-4 space-y-3">
            {messages.map((msg, i) => {
              const isAi = msg.from !== 'user'
              const text = msg.text || ''
              // Detect if AI message mentions specific topics for quick links
              const showPricing = isAi && /pricing|plan|price|pkR|1,000|3,000/i.test(text)
              const showTrial = isAi && /free trial|signup|sign up|start free/i.test(text)
              const showDemo = isAi && /demo|book.*demo|contact/i.test(text)
              const showSupport = isAi && /support|complaint|ticket|whatsapp|help/i.test(text)

              return (
                <div key={i}>
                  <div className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.5] ${
                      msg.from === 'user'
                        ? 'bg-[#0071e3] text-white rounded-br-md'
                        : 'bg-white text-[#1d1d1f] shadow-sm rounded-bl-md'
                    }`}>
                      {isAi ? renderMessageText(text) : text}
                    </div>
                  </div>
                  {/* Apple-style action buttons below AI message */}
                  {isAi && (showPricing || showTrial || showDemo || showSupport) && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5 ml-0">
                      {showPricing && <QuickLinkButton to="/pricing">View Pricing</QuickLinkButton>}
                      {showTrial && <QuickLinkButton to="/signup">Start Free Trial</QuickLinkButton>}
                      {showDemo && <QuickLinkButton to="/contact">Book Demo</QuickLinkButton>}
                      {showSupport && <QuickLinkButton to="/support-center">Support Center</QuickLinkButton>}
                    </div>
                  )}
                </div>
              )
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Quick actions — chat tab only */}
          {activeTab === 'chat' && (
            <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {QUICK_ACTIONS.map(({ label, q }) => (
                  <button key={label} type="button" onClick={() => { addMsg('user', q); handleSend(q); resetIdleTimer() }}
                    className="shrink-0 rounded-full border border-slate-200/50 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50 hover:shadow-[0_2px_8px_rgba(139,92,246,0.1)] hover:-translate-y-0.5 active:scale-95"
                  >{label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Input — chat tab only */}
          {activeTab === 'chat' && (
            <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); resetIdleTimer() }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { handleSend(); resetIdleTimer() } }}
                  placeholder={messages.length > 1 ? 'Ask a follow-up...' : 'Ask me anything...'}
                  className="flex-1 rounded-full border border-slate-200/50 bg-[#f5f5f7] px-4 py-2 text-[13px] font-medium text-[#1d1d1f] outline-none placeholder:text-slate-400 focus:border-violet-300 focus:bg-white transition-all duration-200"
                  disabled={loading}
                />
                <button onClick={() => { handleSend(); resetIdleTimer() }} disabled={loading} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-[0_2px_8px_rgba(139,92,246,0.3)] transition-all duration-200 hover:shadow-[0_4px_14px_rgba(139,92,246,0.4)] hover:scale-105 active:scale-90 disabled:opacity-40 disabled:hover:scale-100">
                  <HiOutlinePaperAirplane className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2 flex items-center justify-center gap-4">
            <Link to="/signup" onClick={() => setOpen(false)} className="text-[11px] font-medium text-violet-600 hover:underline transition-colors">Free Trial</Link>
            <Link to="/contact" onClick={() => setOpen(false)} className="text-[11px] font-medium text-violet-600 hover:underline transition-colors">Book Demo</Link>
            <Link to="/pricing" onClick={() => setOpen(false)} className="text-[11px] font-medium text-violet-600 hover:underline transition-colors">Pricing</Link>
            <Link to="/reviews" onClick={() => setOpen(false)} className="text-[11px] font-medium text-violet-600 hover:underline transition-colors">Reviews</Link>
          </div>
        </div>
      )}
    </>
  )
}
