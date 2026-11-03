/**
 * Saved replies for the Inbox. {{name}} becomes the customer's first name and {{ticket}} the ticket reference
 * when the template is inserted. No sign-off here: the branded email adds the "Nexora Support Team" signature.
 * Nothing in these texts promises a refund, a price or a time that the business has not agreed to.
 */
export const REPLY_TEMPLATES = [
  { id: 'ack', emoji: '👋', label: 'Acknowledged', text: 'Hi {{name}},\n\nThanks for reaching out! 😊 We have received your message ({{ticket}}) and our team is looking into it. You will hear from us shortly.' },
  { id: 'details', emoji: '🔍', label: 'Need details', text: 'Hi {{name}},\n\nThanks for your message. So we can help you accurately, could you share:\n\n- Your business name and the email you log in with\n- What you were doing when the problem appeared\n- A screenshot or the exact error message, if you have one' },
  { id: 'steps', emoji: '🛠️', label: 'Quick fix steps', text: 'Hi {{name}},\n\nPlease try these quick steps and tell us if it helps:\n\n- Refresh the page (Ctrl+F5) or sign out and sign in again\n- Try a different browser or a private window\n- Check that your internet connection is stable\n\nIf the problem is still there, reply with a screenshot and we will take it from there. 🙏' },
  { id: 'working', emoji: '⏳', label: 'Working on it', text: 'Hi {{name}},\n\nQuick update on {{ticket}}: our team is working on this right now. We will write to you again as soon as we have something to confirm. Thank you for your patience! 🙏' },
  { id: 'demo', emoji: '💼', label: 'Demo & pricing', text: 'Hi {{name}},\n\nThank you for your interest in Nexora! 🚀 You can see all modules and pricing here: https://nexorasolution.us/pricing\n\nTo prepare a short demo for you, please tell us:\n\n- Your business type\n- Number of branches and users\n- Your city and a good phone number' },
  { id: 'trial', emoji: '🎁', label: 'Free trial', text: 'Hi {{name}},\n\nYou can start your free trial in a few minutes from https://nexorasolution.us/pricing. No technical setup is needed. If you get stuck at any step, just reply here and we will help you. 😊' },
  { id: 'billing', emoji: '🧾', label: 'Billing received', text: 'Hi {{name}},\n\nThank you for your billing message ({{ticket}}). Our accounts team is checking the details and we will confirm as soon as it is done.\n\nIf you have not already, please send the invoice number or a screenshot of the payment.' },
  { id: 'payment', emoji: '💳', label: 'Payment confirmed', text: 'Hi {{name}},\n\n✅ We have confirmed your payment. Thank you! Your account is up to date. If you need a receipt or invoice copy, just reply and we will send it.' },
  { id: 'call', emoji: '📞', label: 'Call back', text: 'Hi {{name}},\n\nWe would be happy to talk this through. Please reply with the best phone number and a time that suits you, and we will call you. 📞' },
  { id: 'sorry', emoji: '🙏', label: 'Sorry for the delay', text: 'Hi {{name}},\n\nSorry for the delay in getting back to you, and thank you for waiting. We are on it now and will keep you updated on {{ticket}}.' },
  { id: 'follow', emoji: '🔁', label: 'Follow up', text: 'Hi {{name}},\n\nJust following up on your earlier message ({{ticket}}). Is there anything else you need from us, or is it all sorted? 😊' },
  { id: 'resolved', emoji: '✅', label: 'Resolved', text: 'Hi {{name}},\n\n✅ Good news: your request {{ticket}} has been resolved.\n\nIf anything still looks wrong, just reply to this email and we will reopen it right away.\n\nThank you for choosing Nexora! 🙏' },
]

export const RESOLVED_TEMPLATE = REPLY_TEMPLATES.find((t) => t.id === 'resolved')

export const QUICK_EMOJIS = ['👍', '✅', '🙏', '😊', '🎉', '🚀', '⚡', '📎', '📞', '❤️']

/** First name from "Ayesha Khan <a@b.c>", an address, or ''. */
export function firstName(value = '') {
  const label = String(value).replace(/<[^>]*>/g, '').replace(/["']/g, '').trim().split('@')[0]
  const first = label.split(/[\s._-]+/).filter(Boolean)[0] || ''
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'there'
}
