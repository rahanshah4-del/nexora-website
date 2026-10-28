/** Guide: temp mail for verification codes. Angle: the practical walkthrough and troubleshooting when a code does not arrive. */
export default {
  slug: 'temp-mail-for-verification',
  path: '/tools/temp-mail/temp-mail-for-verification',
  breadcrumbName: 'Temp mail for verification codes',
  seo: {
    title: 'Temp Mail for Verification Codes (OTP): Step-by-Step Guide',
    description:
      'How to receive a verification code or OTP with a temporary email, why a code sometimes never arrives, and how to fix it. Includes a no-phone-number checklist.',
    keywords:
      'temp mail for verification code, temporary email for otp, temp email verification, receive otp online email, verification code without phone number, email verification code not arriving, temp mail otp',
  },
  h1: 'Temp Mail for Verification Codes: How to Receive an OTP Without Your Real Email',
  eyebrow: 'Temp mail guide',
  lead: 'To get a verification code with a temporary email, paste the temp address into the site, keep the inbox tab open, and copy the code when the message lands. It works whenever the code is sent by email, and fails when it is sent by SMS.',
  sections: [
    {
      id: 'how',
      heading: 'How to Receive a Verification Code With Temp Mail',
      blocks: [
        { p: 'The whole process takes about a minute, and the order of the steps matters more than people expect. The most common failure is not a technical one. It is closing the inbox tab, or letting the address expire, before the code has been used.' },
        {
          steps: [
            { title: 'Open the inbox first', text: 'Go to [Nexora Temp Mail](/tools/temp-mail) and leave that tab open. The address is created for you, so there is nothing to type. Copy it.' },
            { title: 'Enter it on the site', text: 'Switch to the signup or login form and paste the address. Double-check it before you submit. One wrong character sends the code to a stranger or nowhere.' },
            { title: 'Ask for the code', text: 'Press the button that sends it (usually "Send code" or "Continue"). Now go back to the inbox tab. For the first two minutes the inbox checks for mail every second.' },
            { title: 'Copy the code', text: 'When the message arrives you hear a short sound and the tab title changes if you are elsewhere. The code is shown above the message with a copy button.' },
            { title: 'Paste it and finish', text: 'Return to the site, paste the code, and complete the form. Codes are often valid for only a few minutes, so do this straight away.' },
          ],
        },
        { callout: 'Tip: if the site shows a countdown for the code, start the timer on the inbox side too. A one-hour address leaves plenty of room, but a code that expires in five minutes does not wait for you.' },
      ],
    },
    {
      id: 'how-it-finds',
      heading: 'How the Tool Finds the Code in the Message',
      tone: 'alt',
      blocks: [
        { p: 'Verification emails come in a hundred layouts, so the tool reads the text and looks for the pattern a human would look for: a short run of digits or letters sitting next to words like "code", "OTP", "passcode", "verification" or "confirm". It then shows that value above the message. It is a convenience, not a guarantee, so glance at the original message before you trust it.' },
        { p: 'It handles the common shapes: four to eight digits such as 482913, codes with letters and numbers such as K7X2M, and grouped codes such as ABC-123. It deliberately ignores long strings inside links, because those are tokens, not codes you type. If the message contains a button labelled "Verify my email", click that instead and the page does the rest.' },
        { p: 'Two situations can fool any code finder. A message may contain several numbers, such as an order number next to a code, and the tool picks the one that sits next to the key word. And a few senders spell the code out in an image, which the tool cannot read. In both cases, open the full message and copy the code by hand.' },
      ],
    },
    {
      id: 'email-vs-sms',
      heading: 'Email Codes vs SMS Codes: What Temp Mail Can and Cannot Do',
      blocks: [
        { p: 'Temp mail can only receive codes that are sent by email. If a service insists on a phone number and texts you the code, a temporary email address cannot help, and no email tool can. This is the single biggest source of "it doesn\'t work" reports, so it is worth stating plainly.' },
        {
          table: {
            caption: 'Where a temporary email helps with verification',
            columns: ['Situation', 'Works with temp mail?', 'Why'],
            rows: [
              ['Signup that emails a 6-digit code', 'Yes', 'The code arrives in the inbox'],
              ['Signup that emails a confirmation link', 'Yes', 'Open the message and click the link'],
              ['Magic-link login', 'Yes, if you stay within the timer', 'The link is delivered like any email'],
              ['Service that sends the code by SMS only', 'No', 'No email is sent'],
              ['Service that sends to email and SMS', 'Usually', 'Choose the email option'],
              ['Authenticator app codes', 'No', 'These are generated on your device, not mailed'],
              ['Site that blocks disposable domains', 'No', 'The site refuses the address before it sends anything'],
            ],
          },
        },
        { p: 'You will also see articles about getting a "temporary phone number" for SMS. That is a separate thing, and it comes with its own problems: shared numbers are widely blocked, and the messages on them are public. We do not offer it, and for anything important we would not suggest relying on it.' },
      ],
    },
    {
      id: 'no-phone',
      heading: 'Verifying an Account Without a Phone Number',
      tone: 'alt',
      blocks: [
        { p: 'You can verify an account without giving a phone number only if the service offers email verification as an option. Many do, because email is the cheapest way to confirm that a person exists. Others make a phone number mandatory for fraud control, and there is no honest way around that.' },
        { p: 'When email is offered, look for wording such as "Use email instead", "Verify by email" or a toggle between phone and email at the top of the form. Some sites hide it behind a small link. If the only visible field is a phone number, scroll, check the page footer of the form, and try the "Sign up with email" route from the homepage rather than the app.' },
        { p: 'One practical warning. Accounts verified with a temporary address are accounts you cannot recover. Once the inbox expires, "forgot password" has nowhere to send its link. That is acceptable for a throwaway look at a product. It is a bad idea for an account that holds your data, so read the section on what to avoid below before you choose.' },
      ],
    },
    {
      id: 'not-arriving',
      heading: 'Why Your Verification Code Never Arrives',
      blocks: [
        { p: 'If nothing shows up after a minute, it is almost always one of seven causes. Work through them in this order, from the cheapest check to the most involved.' },
        {
          steps: [
            { title: 'Wait a little longer', text: 'Most mail arrives in seconds, but some providers queue messages for a minute or two. Give it two minutes before you assume it failed.' },
            { title: 'Check the address for typos', text: 'Compare what you pasted with the address on the page, character by character. Random addresses are easy to mistype by hand.' },
            { title: 'Confirm the address is still alive', text: 'Look at the timer. If it reads zero, the inbox is closed and any mail sent since is rejected. Press New address and request the code again.' },
            { title: 'See whether the site blocks disposable domains', text: 'If you got an error such as "please use a valid email", that is the cause. The site never sent anything. Use another address for that service.' },
            { title: 'Look at the site\'s resend limit', text: 'Pressing "resend" five times in a row can lock you out for a while, and some sites will stop sending altogether. Wait the stated time and try once.' },
            { title: 'Try the other option on the page', text: 'If the form offers "email me a link" and "email me a code", try the other one. Sometimes only one template is working.' },
            { title: 'Give up on this site', text: 'If a service will not mail a temporary address after all that, it is telling you something. Use your regular address or leave it.' },
          ],
        },
        { p: 'If you run the website that is failing to send, this list is also a decent first debugging path. A message that never arrives at a clean, real inbox points toward your sender domain, SPF or DKIM records rather than toward the recipient. We write about that angle in the [guide for website owners](/tools/temp-mail/block-disposable-emails).' },
      ],
    },
    {
      id: 'timing',
      heading: 'Code Expiry, Resends and Timing',
      tone: 'alt',
      blocks: [
        { p: 'Most verification codes are valid for between five and fifteen minutes, so the clock that matters is the site\'s, not the inbox\'s. Our address lasts an hour, which is far longer than any code, but the code can expire while the address is still fine.' },
        { p: 'Each time you press "resend", a new code usually replaces the old one. Use the newest message and ignore the earlier ones, because the old code is dead the moment the new one is sent. This catches a lot of people: they paste the first code from the inbox, get "invalid code", and never notice a second message above it.' },
        { p: 'Keep the number of attempts low. Entering a wrong code several times may lock the form. If the first attempt fails, check that you copied every digit and that you are using the most recent message, then try again.' },
      ],
    },
    {
      id: 'security',
      heading: 'Security Points to Keep in Mind',
      blocks: [
        { p: 'A verification code proves you control an inbox, and that is all it proves. With a temporary address, "control" means "anyone who knows the exact address could also read it while it exists". For a throwaway signup that is harmless. For anything you care about, it is not.' },
        {
          list: [
            'Never use temp mail for banking, tax, government or health portals.',
            'Never use it for your main social, work or developer accounts, since you will need to recover them.',
            'Do not paste a code you receive into any page other than the one that asked for it.',
            'Treat any message that asks you to "confirm your password" or "send the code to support" as a scam, whatever inbox it landed in.',
            'Attachments are limited to 1 MB each here, and programs, scripts and HTML files are never kept. Even so, do not open files you were not expecting.',
          ],
        },
        { p: 'For a longer treatment, including what the tool does to protect you and where it cannot, read [is temp mail safe](/tools/temp-mail/is-temp-mail-safe).' },
      ],
    },
    {
      id: 'dev',
      heading: 'For Developers: Testing Your Own Verification Flow',
      tone: 'alt',
      blocks: [
        { p: 'The same inbox is a quick way to test your own signup and OTP emails on a real address. Register a fresh address on every run, request a code, and check four things: how long the email took, whether the subject and sender name look right, whether the code is readable and the right length, and whether the link goes to the right environment.' },
        { p: 'Then test the awkward cases. Request a second code and make sure the first stops working. Enter a wrong code and see the error. Let a code expire and see what the user is told. These are the paths real people hit, and they are the ones that tend to be untested. Use dummy data only, since the inbox is open to anyone who knows its address. For automated pipelines you will want a local mail catcher instead. This tool has no public API, so use it for the final human look.' },
      ],
    },

    {
      id: 'account-types',
      heading: 'How It Works for Different Kinds of Accounts',
      blocks: [
        { p: 'The method is the same, but the details change with the kind of site. Knowing the usual shape of each helps you decide how long to keep the inbox open.' },
        { h3: 'Newsletters and gated downloads' },
        { p: 'These are the easiest. You enter the address, a confirmation mail arrives, and you click one link. Some use "double opt-in", which means nothing is sent to you until you confirm, so if you skip the click you will never hear from them again, which is often what you want.' },
        { h3: 'Forums and communities' },
        { p: 'They usually send a link that activates the account, and sometimes hold you in a queue for manual approval. Approval can take a day, long after the inbox has expired, so a temporary address is a poor choice if you plan to take part.' },
        { h3: 'SaaS trials' },
        { p: 'A trial typically sends a welcome message and a verification link, and may add a "complete your profile" mail ten minutes later. If you are only taking a look, a temporary address works. If you will keep using the product, switch to a real address as soon as you are sure.' },
        { h3: 'Marketplaces and shops' },
        { p: 'Avoid temporary addresses here. Order confirmations, shipping updates and returns arrive after the inbox has gone, and a missed delivery notice costs real money.' },
      ],
    },
    {
      id: 'alerts',
      heading: 'Set Up Alerts So You Never Miss a Code',
      tone: 'alt',
      blocks: [
        { p: 'The most common reason people miss a code is that they are not looking at the inbox when it arrives. Three small settings fix this.' },
        {
          steps: [
            { title: 'Leave sound on', text: 'A short tone plays when new mail comes in while the page is open. Check that the sound button on the inbox is not muted.' },
            { title: 'Watch the tab title', text: 'The title of the browser tab changes when a message arrives, so you notice it even when the page is in the background.' },
            { title: 'Turn on push alerts if your browser supports them', text: 'This lets a notification reach you even when you are in another window. On supported browsers you can also install the tool as an app, which makes it easy to keep open next to your signup.' },
          ],
        },
        { p: 'Alerts depend on the page being loaded, so do not close the inbox while you wait. If you use two devices, such as signing up on a laptop and keeping the inbox open on your phone, make sure both are on a working connection.' },
      ],
    },
    {
      id: 'quick-fixes',
      heading: 'Quick Fixes at a Glance',
      blocks: [
        { p: 'If you only want the short version of the troubleshooting above, this table pairs each symptom with the first thing to try.' },
        {
          table: {
            caption: 'Symptoms and first fixes',
            columns: ['What you see', 'First thing to try'],
            rows: [
              ['Nothing after a minute', 'Wait up to two minutes, then check the address for typos'],
              ['Site says "invalid email"', 'The site blocks disposable domains. Use another address'],
              ['Code is rejected', 'Use the newest message; older codes stop working after a resend'],
              ['Inbox shows "expired"', 'Press New address and request the code again'],
              ['Message has no code, only a button', 'Click the button; the link finishes the verification'],
              ['Code is an image', 'Open the message and read the code by eye'],
            ],
          },
        },
        { p: 'If none of these helps, the cause is almost always on the website\'s side, and there is nothing a different inbox can fix.' },
      ],
    },
  ],
  faqHeading: 'Verification Codes and Temp Mail: Common Questions',
  faqs: [
    {
      question: 'Can I get an OTP with a temporary email?',
      answer: 'Yes, if the service sends the OTP by email. Paste the temporary address, request the code and it appears in the inbox. If the service sends it by SMS, a temporary email cannot receive it.',
    },
    {
      question: 'How fast does a verification email arrive?',
      answer: 'Usually within a few seconds. The inbox checks every second for the first two minutes after you act, so you see it as soon as it lands. Slower providers can take a minute or two.',
    },
    {
      question: 'Why does the site say the code is invalid when I copied it correctly?',
      answer: 'Most often a newer code has replaced the one you used, or the code expired on the site\'s side. Press resend, wait for the newest message, and use that one.',
    },
    {
      question: 'Does the tool pick out letter and number codes as well as digits?',
      answer: 'Yes. It recognises codes with four to eight digits, codes mixing letters and numbers, and grouped codes such as ABC-123. Always compare it with the original message.',
    },
    {
      question: 'Can I use temp mail for a Google or Microsoft account?',
      answer: 'Those services usually ask for a phone number and are not a good fit. More importantly, you could not recover the account once the inbox expired, so we would not use temp mail for either.',
    },
    {
      question: 'What if the verification link opens on my phone but the inbox is on my computer?',
      answer: 'Copy the link from the message and paste it into the browser where you want to finish. Many links work in any browser, though some are tied to the device that started the signup.',
    },
    {
      question: 'Is it safe to enter a code I got in a temporary inbox?',
      answer: 'Yes, when you requested it from a site you chose. The risk is not the code itself but what the account is for. Keep temporary addresses for low-stakes accounts only.',
    },
    {
      question: 'Will my verification email go to spam?',
      answer: 'There is no spam folder to check. Every message that is accepted appears in the inbox. If nothing appears, the site did not send it, the address expired, or the domain was blocked.',
    },
  ],
  related: ['temporary-email-address', 'is-temp-mail-safe', 'block-disposable-emails', '10-minute-mail-alternative'],
}
