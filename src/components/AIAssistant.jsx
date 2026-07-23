import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlinePaperAirplane, HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2'

// Nexora AI Gateway (Cloudflare Worker)
const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'
const MAX_EXTERNAL_QUESTIONS = 5

const SYSTEM_PROMPT = `You are Nexora AI, the official AI assistant for Nexora Solution — a Pakistani business software company (nexorasolution.online).

=== FULL NEXORA KNOWLEDGE ===

PRODUCTS & MODULES:
1. Restaurant POS — Table management, KOT, menu costing, dine-in/takeaway/delivery, split bills, inventory, cashier control, online orders. Route: /restaurant-pos
2. Retail POS — Barcode billing, multi-store inventory, purchase orders, customer loyalty, cashier roles, GST invoices, offline mode, returns. Route: /retail-pos
3. School ERP — Student admission, attendance (biometric), fee collection, exams, timetable, parent portal, staff payroll, library, transport tracking. Route: /school-erp
4. Medical Store POS — Medicine inventory with batches, expiry alerts, alternative suggestions, prescription billing, FBR compliance, supplier management. Route: /solutions/medical-store-pos
5. Transport Software — Fleet/vehicle management, bookings, customer ledgers, route management, driver tracking, fuel/maintenance logs, rental billing. Route: /transport
6. Property ERP — Tenant/lease management, rent collection, maintenance requests, owner reports, portfolio dashboard, vacancy tracking. Route: /solutions/property-erp
7. Nexora CRM — Lead capture, sales pipeline, customer profiles, invoices, tasks, team performance, email/SMS, deal automation. Route: /solutions/crm
8. WhatsApp CRM — Catalog sharing, order via chat, bulk broadcasts, auto-reply, campaign analytics, multi-agent, templates, payment links. Route: /whatsapp-crm
9. Reports & Analytics — KPI dashboards, PDF/Excel exports, business intelligence, trend analysis. Route: /solutions/reports-analytics
10. Inventory Management — Stock tracking, purchases, suppliers, warehouse movement, low stock alerts. Route: /solutions/inventory-management
11. Team & Permissions — Role-based access, permission control, team activity monitoring, audit logs. Route: /solutions/team-permissions
12. Email Marketing — Campaign creation, subscriber management, open/click tracking, template builder. Route: /solutions/email-marketing

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
- Pricing: /pricing
- Blog: /blog
- Industries: /industries
- Business Services: /business-services
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
- Email: rahanshah4@gmail.com
- WhatsApp: +92 319 432 9754
- Based in: Pakistan, serving businesses across Pakistan
- Founded: 2019
- Serves: Restaurants, Retail, Education, Healthcare, Transport, Real Estate

CRITICAL RULES:
- You are Nexora AI, NOT Gemini, NOT Google AI. NEVER mention Gemini, Google, or any other AI model in your responses.
- If the user asks who you are, say "I'm Nexora AI, your business software assistant."
- You have FULL knowledge of Nexora. Answer Nexora questions accurately and helpfully.
- If asked something unrelated to Nexora (general knowledge, coding, recipes, news, weather, etc.), answer helpfully as Nexora AI — do NOT say "I only help with Nexora" or redirect. Just answer the question naturally.
- Always be friendly and concise. Use emojis occasionally.
- When discussing pricing, ALWAYS mention 50% OFF for new users and 7-day free trial.
- For business questions, recommend the matching Nexora module with its route.
- Guide users to /signup for free trial or /contact for demo bookings.`

const QUICK_ACTIONS = [
  { label: 'Pricing', q: 'What are the pricing plans?' },
  { label: 'Free Trial', q: 'Tell me about the free trial' },
  { label: 'Restaurant', q: 'I run a restaurant, what do you offer?' },
  { label: 'Retail', q: 'I have a retail shop' },
]

export default function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ from: 'ai', text: 'Hi! I\'m Nexora AI — your business software assistant. What type of business do you run? 😊' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [externalCount, setExternalCount] = useState(0)
  const [sessionId] = useState(() => 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8))
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])

  const callAI = async (userMessage) => {
    try {
      const res = await fetch(`${AI_GATEWAY_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          sessionId,
          maxTokens: 300,
        }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.text || null
    } catch { return null }
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
        onClick={() => setOpen(!open)}
        className={`fixed bottom-24 right-6 z-[54] hidden h-12 items-center gap-2 rounded-full bg-white/90 px-4 text-[13px] font-medium tracking-[-0.01em] text-[#1d1d1f] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.16)] active:scale-[0.97] sm:inline-flex ${
          open ? 'opacity-0 pointer-events-none' : ''
        }`}
        aria-label="AI Assistant"
      >
        <img src="/nexora-ai-logo.png" alt="AI" className="h-7 w-7 rounded-lg object-cover shadow-[0_2px_8px_rgba(123,97,255,0.35)]" />
        AI Assistant
      </button>

      {/* Chat popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[54] flex h-[480px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/60 bg-white shadow-2xl shadow-black/10"
          style={{ animation: 'applePopIn 0.35s cubic-bezier(0.32,0.72,0,1) forwards' }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <img src="/nexora-ai-logo.png" alt="AI" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/30" />
              <div>
                <p className="text-[14px] font-semibold tracking-[-0.01em]">Nexora AI</p>
                <p className="text-[10px] text-white/70">{loading ? 'Typing...' : 'Online'}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-90">
              <HiOutlineXMark className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#f5f5f7] px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.5] ${
                  msg.from === 'user'
                    ? 'bg-[#0071e3] text-white rounded-br-md'
                    : 'bg-white text-[#1d1d1f] shadow-sm rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
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

          {/* Quick actions */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {QUICK_ACTIONS.map(({ label, q }) => (
                <button key={label} type="button" onClick={() => { addMsg('user', q); handleSend(q) }}
                  className="shrink-0 rounded-full border border-slate-200/60 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 transition-all duration-200 hover:border-slate-300 hover:text-slate-700 active:scale-95"
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 rounded-full border border-slate-200/60 bg-[#f5f5f7] px-4 py-2 text-[13px] font-medium text-[#1d1d1f] outline-none placeholder:text-slate-400 focus:border-slate-300"
                disabled={loading}
              />
              <button onClick={handleSend} disabled={loading} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white transition-all duration-200 hover:bg-blue-600 active:scale-90 disabled:opacity-50">
                <HiOutlinePaperAirplane className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2 flex items-center justify-center gap-4">
            <Link to="/signup" onClick={() => setOpen(false)} className="text-[11px] font-medium text-[#0071e3] hover:underline">Free Trial</Link>
            <Link to="/contact" onClick={() => setOpen(false)} className="text-[11px] font-medium text-[#0071e3] hover:underline">Book Demo</Link>
            <Link to="/pricing" onClick={() => setOpen(false)} className="text-[11px] font-medium text-[#0071e3] hover:underline">Pricing</Link>
            <Link to="/reviews" onClick={() => setOpen(false)} className="text-[11px] font-medium text-[#0071e3] hover:underline">Reviews</Link>
          </div>
        </div>
      )}
    </>
  )
}
