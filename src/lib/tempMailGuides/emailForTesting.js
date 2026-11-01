/** Guide: temporary email for testing. Angle: a QA playbook (test matrix, naming, timing, stable accounts), not a feature tour. */
export default {
  slug: 'temporary-email-for-testing',
  path: '/tools/temp-mail/temporary-email-for-testing',
  breadcrumbName: 'Temporary email for testing',
  seo: {
    title: 'Temporary Email for Testing Signup and OTP Flows',
    description:
      'Use a temporary email to test signup, OTP and password-reset flows on real delivery. A QA test matrix, naming habits, timing checks and honest limits.',
    keywords:
      'temporary email for testing, test email address, email for testing signup, disposable email for QA, mailinator alternative, test OTP email, email verification testing, temp mail for developers, dummy email address for testing, dummy email for testing, test email generator',
  },
  h1: 'Temporary Email for Testing Signup, OTP and Reset Flows',
  eyebrow: 'Temp mail guide for developers and QA',
  lead: 'A temporary email lets you test the part of a signup flow that mocks cannot: a message that really crosses the internet and lands in an inbox. Make an address, submit it, and watch what arrives, how fast, and whether the link works.',
  sections: [
    {
      id: 'why-real-mail',
      heading: 'Why Use a Test Email Address That Really Receives Mail',
      blocks: [
        { p: 'Most email bugs do not live in your code. They live between your code and the inbox: a sender domain with no SPF record, a template that breaks on a long name, a link that points at the wrong environment, a provider that quietly delays the first message by a minute. A mock server cannot show you any of that, because nothing ever leaves your machine.' },
        { p: 'A temporary inbox closes the gap cheaply. You do not create a mailbox, ask IT for a test account, or share a password with the team. You open the [temp mail tool](/tools/temp-mail), take the address it gives you, and run the flow the way a stranger would. What comes back is the genuine article, with the same delays and the same formatting problems a customer would meet.' },
        { p: 'This guide treats it as a QA tool rather than a privacy tool. It covers what to check, how to organise the checks, where a free public inbox is the wrong choice, and what to use instead when you need something steadier.' },
      ],
    },
    {
      id: 'test-matrix',
      heading: 'A Test Matrix for Email Flows',
      tone: 'alt',
      blocks: [
        {
          table: {
            caption: 'What to check for each email your product sends',
            columns: ['Flow', 'What to confirm', 'A mistake worth trying'],
            rows: [
              ['Signup confirmation', 'Arrives, link activates the right account, link points at the right environment', 'Click the link twice'],
              ['One-time code', 'Code is present, readable, the expected length, accepted once', 'Enter it after it should have expired'],
              ['Password reset', 'Link works once, old links die when a new one is requested', 'Request three resets in a row'],
              ['Welcome sequence', 'Order, timing and wording of the first few messages', 'Sign up, then wait and watch the gaps'],
              ['Invites', 'Recipient name, inviter name and link all correct', 'Invite an address that already has an account'],
              ['Receipts and alerts', 'Amounts, dates and attachments match what the app shows', 'Trigger one with a long product name'],
            ],
          },
        },
        { p: 'The right-hand column matters most. Happy paths tend to be tested by the developer who wrote them. The bugs that reach production usually sit in the second click, the late code and the repeated request.' },
      ],
    },
    {
      id: 'workflow',
      heading: 'A Repeatable Workflow',
      blocks: [
        { p: 'Keep the routine short enough that people actually follow it. This is the version that works for a quick session on a staging site.' },
        {
          steps: [
            { title: 'Start from a clean address', text: 'Open the Temp Mail page and take the address it gives you. A fresh inbox means no leftovers from an earlier run, so any message you see is the one you just triggered.' },
            { title: 'Note the time, then submit', text: 'Write down the clock time when you press the button. You will use it in a moment to measure delivery.' },
            { title: 'Watch the inbox', text: 'The page checks for new mail every second just after you act. Glance at the time the message appears and subtract.' },
            { title: 'Read the message as a user', text: 'Check the sender name, the subject line, the greeting, the link text and the footer. Hover over the link to see where it really goes.' },
            { title: 'Complete the flow', text: 'Click the link or paste the detected code. Confirm the account moves to the verified state in your app, not only on the success page.' },
            { title: 'Break it', text: 'Repeat with a second request, a wrong code or an expired link. Record what the app says each time.' },
          ],
        },
      ],
    },
    {
      id: 'timing',
      heading: 'Reading Delivery Time as a Signal',
      tone: 'alt',
      blocks: [
        { p: 'How long a message takes is a measurement worth keeping. Verification mail that arrives within a few seconds feels instant to a user. At 20 or 30 seconds, people start pressing "resend", and you start sending duplicate codes. At a minute or more, a good share of them leave.' },
        { p: 'Record the gap on a few runs rather than one. A single slow message may be an unlucky moment on the provider\'s side. Three slow ones in a row point at something you control, such as a queue that batches sends, a throttled sending plan or a domain whose reputation is still new.' },
        { p: 'If a message never arrives, do not conclude it was lost on the way. Check three things first (our guide on [blocking disposable emails](/tools/temp-mail/block-disposable-emails) covers the reverse problem, when your own form rejects test addresses): that the address was typed correctly, that your app actually sent it, and that your sender domain has working SPF and DKIM records. A temporary inbox that receives nothing is a quick early warning, not a full deliverability audit, so treat it as the start of an investigation.' },
      ],
    },
    {
      id: 'public-inbox',
      heading: 'The Public Inbox Problem',
      blocks: [
        { p: 'A free temporary inbox has no password. Anyone who knows the exact address can read its mail while it exists. For testing, that has one consequence you must plan around: never send anything real to it.' },
        { p: 'That means dummy names, dummy passwords and test data only. No customer records, no production API keys, no real invoices. A password-reset link for a real account is also a bad idea, because whoever reads the message could use the link before you do.' },
        { callout: 'Rule for the team: if the message would be a problem on a public screen, it does not belong in a free temporary inbox.' },
        { p: 'The random address helps. Ours uses ten characters from 31 letters and digits, so nobody will guess it by accident. The risk is a custom name that others can guess, or an address pasted into a shared ticket where the whole company, and sometimes a vendor, can see it.' },
      ],
    },
    {
      id: 'mobile',
      heading: 'Testing on a Phone Without Retyping Anything',
      blocks: [
        { p: 'Mobile signup is where email flows fail most visibly. Links open in an in-app browser, codes get copied from a lock-screen banner, and a long address is miserable to type on a small keyboard. Testing on a real handset matters, and the QR button on the address makes it painless.' },
        { p: 'Press it on your laptop, scan the code with the phone, and the same address appears there to paste into the app under test. New mail then shows up on whichever screen you are watching, with a sound and a tab-title alert if the page is in the background.' },
        { p: 'While you are there, check the things phones expose. Does the verification link open the app, or a web page that asks you to log in again? Does the code survive being copied, or does the template wrap it across two lines? Does the preview text, the grey line under the subject in the inbox list, say something useful or just repeat "View this email in your browser"?' },
      ],
    },
    {
      id: 'test-data',
      heading: 'Test Data That Finds Bugs',
      tone: 'alt',
      blocks: [
        { p: 'The address is only half of a good test. The name you sign up with decides whether your template survives real life. Try the ordinary case first, then the awkward ones.' },
        {
          list: [
            'A very long first and last name, to see whether the greeting breaks the layout.',
            'A name with an apostrophe or an accent, such as O\'Brien or Zoë.',
            'A name written in a non-Latin script.',
            'A name that looks like markup, to confirm the template escapes it.',
            'An empty optional field, to catch a greeting that reads "Hello ,".',
          ],
        },
        { p: 'Names are only one of many places templates fail. Currency, dates and plurals are others. An order for one item should not say "1 items", and a date should make sense to someone in another time zone. None of that needs a special inbox. It needs a test run that triggers each message with unusual data and a person who reads every result.' },
      ],
    },
    {
      id: 'dummy-email',
      heading: 'Dummy Email Address for Testing, and a Test Email Generator',
      blocks: [
        { p: 'People search for a "dummy email address for testing" and a "test email generator" when they want an address to type into a form. There are two different needs hiding in that phrase, and they call for different tools.' },
        {
          list: [
            'An address that only has to look valid, such as test@example.com. Nothing is delivered, so it is fine for checking form validation and nothing more.',
            'An address that really receives mail. This is what you need the moment the test involves a confirmation link, a code or a reset message.',
          ],
        },
        { p: 'The [temp mail tool](/tools/temp-mail) is the second kind. Opening the page generates a working address straight away, so it doubles as a test email generator: copy it, submit it, and the message shows up in the inbox below. Use [custom names](/tools/temp-mail) such as signup-test-01 when you want to tell runs apart, and keep real customer data out of it, because anyone who knows the exact address can read the inbox.' },
      ],
    },
    {
      id: 'stable-accounts',
      heading: 'When You Need Test Addresses That Stay Put',
      tone: 'alt',
      blocks: [
        { p: 'A one-hour random inbox is perfect for exploratory sessions and awkward for anything that must be repeatable. If a test script, a shared test account or a demo environment needs the same address next week, the free inbox cannot give it to you.' },
        { p: 'Premium is the answer for that case, and the [burner email guide](/tools/temp-mail/burner-email) explains how named addresses are used outside testing. A Premium address lasts while your plan is paid, so you can hold up to 10 named addresses such as a name for each test persona, and they stay the same between sessions. Attachments up to 5 MB can be received, which covers most invoice, receipt and report templates.' },
        { p: 'Two more Premium features suit testers. Forwarding sends a copy of each message to a real inbox, so a QA lead can see what the team is triggering without opening the page. And custom domains let you connect a domain you own, such as a staging domain, by adding a DNS record, after which anything sent to any name at that domain is forwarded on. Up to three domains can be connected.' },
        { p: 'Premium costs $3.99 a month or $29 a year. It is a convenience for people who run the same checks often, not something a one-off test needs.' },
      ],
    },
    {
      id: 'automation',
      heading: 'What This Cannot Do: Automation and CI',
      blocks: [
        { p: 'Nexora Temp Mail is a web page for people, not an API for scripts. There are no webhooks, no endpoint to poll for messages and no way to read a code from a test runner. If your pipeline has to confirm an email automatically on every commit, use a tool designed for that.' },
        { p: 'Two common choices fit the gap. A local mail catcher, run on your machine or inside CI, receives whatever your app sends and lets a test read it, but it never touches the internet, so it cannot check delivery. A hosted email-testing service with an API can do both, usually for a fee. Pair either with a real inbox for the last, human look before a release.' },
        { p: 'Receive-only is a limit too. You cannot send from a temporary address, so tests that need a reply, such as inbound parsing or auto-responders, need another setup. Neither is there any SMS.' },
      ],
    },
    {
      id: 'checklist',
      heading: 'A Pre-Release Checklist',
      tone: 'alt',
      blocks: [
        { p: 'Run this list once before a release and again after any change to your email provider or templates.' },
        {
          list: [
            'Every transactional email arrives within a few seconds on a fresh address.',
            'Links point at the correct environment, never at localhost or a staging host.',
            'Codes are readable and work only once.',
            'A second reset request invalidates the first link.',
            'The subject line is meaningful on a phone lock screen.',
            'The footer names your company and says why the email was sent.',
            'Dark mode does not turn text into an unreadable colour.',
            'Images are optional, so the message still makes sense without them.',
          ],
        },
        { p: 'Previews here strip scripts and remote images, so confirm image layout in a real mail app too. The list takes ten minutes, and it catches the faults customers notice first.' },
      ],
    },
  ],
  faqs: [
    {
      question: 'Can I use a temporary email address for testing my website?',
      answer: 'Yes. It suits manual and exploratory testing of signup, verification, OTP and password-reset emails, because mail really travels to a real inbox.',
    },
    {
      question: 'Is there an API for automated tests?',
      answer: 'No. Nexora Temp Mail is a web page without an API or webhooks, so it is not suited to CI pipelines. Use a local mail catcher or an email-testing service for automation.',
    },
    {
      question: 'Is it safe to put test data in a free inbox?',
      answer: 'Only dummy data. A free inbox has no password, so anyone who knows the exact address can read it. Keep real customer data and secrets out.',
    },
    {
      question: 'How do I get the same test address every time?',
      answer: 'The free inbox is new each time. Premium gives you named addresses that last while your plan is active, so they stay the same between sessions.',
    },
    {
      question: 'Can I test on my own domain?',
      answer: 'Yes, with Premium. Connect a domain you own by adding a DNS record, and mail to any name at that domain is forwarded to a real inbox of yours.',
    },
    {
      question: 'How do I measure how fast my emails are delivered?',
      answer: 'Note the time you press submit and the time the message appears, and repeat it a few times. A single slow run proves little, a pattern of them points to a cause you can fix.',
    },
    {
      question: 'Does the preview show images exactly as users see them?',
      answer: 'No. Scripts and remote images are blocked in the preview for safety, so check image layout in a real mail client.',
    },
    {
      question: 'What should I do if the email never arrives?',
      answer: 'Check the address for typos, confirm your app sent the message, then look at your SPF and DKIM records. A missing message is an early warning, and a full deliverability audit is a separate job.',
    },
  ],
  related: ['temp-mail-for-verification', 'block-disposable-emails', 'disposable-email-address', 'burner-email'],
}
