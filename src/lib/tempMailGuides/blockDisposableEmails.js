/** Guide: block disposable email addresses. Angle: for site owners, a measured approach with trade-offs and a code sample. */
export default {
  slug: 'block-disposable-emails',
  path: '/tools/temp-mail/block-disposable-emails',
  breadcrumbName: 'Block disposable emails',
  seo: {
    title: 'How to Block Disposable Email Addresses on Your Website',
    description:
      'Should you block disposable email addresses at signup? Compare warnings, blocklists and verification, avoid false positives, and test your form.',
    keywords:
      'block disposable email addresses, disposable email detection, block temp mail signup, disposable email blocker, stop fake signups, email validation disposable domains, how to detect temporary email',
  },
  h1: 'How to Block Disposable Email Addresses on Your Website',
  eyebrow: 'Temp mail guide for website owners',
  lead: 'To block disposable email addresses, check the domain of each signup against a maintained list and decide what happens on a match: warn, ask for another address, or refuse. Pair it with email verification, since a list alone misses new domains.',
  sections: [
    {
      id: 'should-you',
      heading: 'First, Should You Block Them at All?',
      blocks: [
        { p: 'Block them only if they cause you measurable harm. Disposable addresses are used by two very different groups: people who want less spam, and people who abuse free trials, referral schemes or comment sections. A hard block stops both. If your problem is the second group and your product does not need a lasting relationship with the first, blocking is reasonable. If it is not, you may be turning away careful, honest customers.' },
        { p: 'Ask what a disposable signup actually costs you. For a SaaS with a free trial and expensive compute, repeat trials are a real cost. For a newsletter, a fake address is a bounced email and a worse sender reputation. For a one-time download, a disposable address may be exactly the lead quality you would get anyway. Put a number on it before you add friction.' },
        { callout: 'Honest framing: blocking disposable addresses reduces abuse and also reduces signups from privacy-minded people. It is a business decision, not a security fix.' },
      ],
    },
    {
      id: 'how-detect',
      heading: 'How Disposable Addresses Are Detected',
      tone: 'alt',
      blocks: [
        { p: 'Detection works on the domain part of the address, the bit after the @ sign. A disposable service owns a set of domains, so a list of those domains lets you recognise its addresses. There are four common methods, and most sites combine two.' },
        {
          table: {
            caption: 'Ways to detect a disposable email address',
            columns: ['Method', 'How it works', 'Strength', 'Weakness'],
            rows: [
              ['Domain blocklist', 'Compare the domain with a list of known disposable domains', 'Fast, simple, no network call', 'New domains appear constantly, so the list needs updating'],
              ['MX record check', 'Look up the domain\'s mail servers and compare them with known disposable hosts', 'Catches new domains that share infrastructure', 'Needs a DNS lookup and can be slow or fail'],
              ['Verification email', 'Send a link or code and require it before the account works', 'Proves the address receives mail', 'A disposable inbox passes it too'],
              ['Behaviour and rate limits', 'Limit signups per IP, device and time window', 'Targets the abuse, not the address type', 'Needs tuning, and shared networks cause false positives'],
            ],
          },
        },
        { p: 'Notice that only the first two can recognise a disposable address. The last two do not care what kind of address it is, which is often the better design. They deal with the behaviour you actually dislike, such as ten trials from one machine, whoever\'s inbox is used.' },
      ],
    },
    {
      id: 'options',
      heading: 'Four Ways to React When You Find One',
      blocks: [
        { p: 'Detection is only half the job. The other half is deciding what to do, and the answer should match how much you mind. Here are four responses, from lightest to strictest.' },
        { h3: '1. Warn and continue' },
        { p: 'Allow the signup but show a note, for example "This looks like a temporary address. You will not be able to reset your password if it expires." This is honest, costs you no signups, and quietly reduces support tickets. It does nothing against abuse, so it suits sites with low abuse.' },
        { h3: '2. Ask for another address' },
        { p: 'Refuse the address with a clear, kind message: "Please use an email address you will keep, so we can send receipts and password resets." People with a legitimate reason will switch. People who wanted to dodge you will go elsewhere, and you lose very little.' },
        { h3: '3. Limit what the account can do' },
        { p: 'Let it in but with restrictions: no free trial credits, no posting links, no referrals until the address is confirmed and has been active for a few days. This keeps the door open while removing the incentive for abuse.' },
        { h3: '4. Block outright' },
        { p: 'Reject the signup. It is the bluntest tool and the one most likely to create false positives, so use it where abuse is costly and the user can easily use another address.' },
      ],
    },
    {
      id: 'code',
      heading: 'A Minimal Check in JavaScript',
      tone: 'alt',
      blocks: [
        { p: 'The core logic is only a few lines. This example checks the domain against a set and also catches subdomains, such as mail.tempdomain.com when tempdomain.com is on the list. The three domains in it are placeholders for your own maintained list, not a real blocklist.' },
        {
          code: `// Replace these with a maintained list (loaded from a file or database).
const DISPOSABLE = new Set(['tempdomain.example', 'throwaway.example', 'burner.example'])

export function isDisposable(email) {
  const at = email.lastIndexOf('@')
  if (at < 1) return false
  const domain = email.slice(at + 1).trim().toLowerCase()
  const parts = domain.split('.')
  // check "a.b.c", then "b.c", then "c" so subdomains are caught
  for (let i = 0; i < parts.length - 1; i++) {
    if (DISPOSABLE.has(parts.slice(i).join('.'))) return true
  }
  return false
}`,
        },
        { p: 'Run this on the server, not only in the browser. A check in the front end is easily skipped, so it is a convenience for the user and no defence. Normalise the address first (trim and lower-case it), and keep the list in a file you can update without a deploy.' },
        { p: 'We use the same idea inside Nexora. Our own marketing emails skip addresses on a disposable list, because mail to those addresses is wasted and can hurt delivery for everyone else. A list like that is only as good as its upkeep, which is the next problem.' },
      ],
    },
    {
      id: 'upkeep',
      heading: 'The Upkeep Problem',
      blocks: [
        { p: 'A blocklist goes stale the day you write it, because new disposable domains appear all the time. Plan for updates from the start, either by pulling a community-maintained list on a schedule or by using a validation service that does it for you. Check the licence of any list you copy, and test that an update did not accidentally add a domain your real customers use.' },
        { p: 'Also plan for the reverse mistake. Lists sometimes include a domain that is not disposable, such as a small business or a privacy-focused provider that real people use. Give blocked users a way to tell you, for example a "contact us" link in the error message, and review those reports. A block with no escape hatch is how you quietly lose good customers.' },
      ],
    },
    {
      id: 'test',
      heading: 'How to Test Your Own Signup Form',
      tone: 'alt',
      blocks: [
        { p: 'Test with a real temporary inbox, because a mock only proves that your code ran. A real inbox proves that mail was delivered over the internet to an address you did not control. Use the free [Nexora Temp Mail tool](/tools/temp-mail) for this and use dummy data only.' },
        {
          steps: [
            { title: 'Check that your block works', text: 'Enter a temporary address from a domain you expect to block. Confirm the form shows your message and does not create the account.' },
            { title: 'Check the wording', text: 'Read the error as a customer would. It should say what to do, not just "invalid email".' },
            { title: 'Check the allowed path', text: 'Temporarily allow the domain in a staging copy, sign up, and confirm that the verification email really arrives and the link activates the account.' },
            { title: 'Check delivery time', text: 'Note how long the message took. If it is slow, users will give up, whatever kind of address they used.' },
            { title: 'Check the unhappy paths', text: 'Request a second code, enter a wrong one and let one expire. These flows break in production more than the first one does.' },
          ],
        },
        { p: 'Also note that a block on your side is the reason many visitors see "this email is not valid" on sites that use lists. That is why [temp mail for verification](/tools/temp-mail/temp-mail-for-verification) cannot work everywhere, and why we say so plainly in our own guides.' },
      ],
    },
    {
      id: 'better',
      heading: 'Better Ways to Stop Abuse Than Blocking Domains',
      blocks: [
        { p: 'Most abuse is about volume and behaviour, so measures that target those usually beat a domain list. Rate-limit signups per IP address and per device, require email confirmation before any benefit is granted, use a bot check such as a CAPTCHA on the signup form, and tie free-trial limits to something harder to fake than an email, such as a payment method on file or a phone number where that suits your market.' },
        { p: 'Watch your data for patterns instead of guessing. If most of your trial abuse comes through two or three domains, block those. If it comes through every domain, including Gmail, a domain list will not help and you need behavioural limits. Measure first, then act, and revisit the decision in a few months.' },
      ],
    },
    {
      id: 'privacy',
      heading: 'Respecting Privacy-Minded Visitors',
      tone: 'alt',
      blocks: [
        { p: 'Many people use a temporary address because they do not trust the form, not because they plan to cheat. They have been burned by spam before. If your signup makes a promise about how you treat their address, such as "no marketing without consent", say it near the field. A clear privacy note converts more of these visitors into real addresses than a block ever will.' },
        { p: 'Offer value before asking. Let people try something without an email where you can, and ask for one at the point where it clearly helps them, such as saving their work. When the ask feels fair, the right address tends to arrive on its own. For the visitor\'s side of this, see our guide to [disposable email addresses](/tools/temp-mail/disposable-email-address), and for how safe these inboxes are, [is temp mail safe](/tools/temp-mail/is-temp-mail-safe).' },
      ],
    },

    {
      id: 'worked-example',
      heading: 'A Worked Example With Made-Up Numbers',
      tone: 'alt',
      blocks: [
        { p: 'Numbers help decide whether blocking is worth it. The figures below are invented for illustration, so replace them with your own. Imagine a SaaS tool that gives every new account 100 free credits, each worth about 4 cents of compute, which is $4 per trial.' },
        { p: 'Suppose 1,000 people sign up in a month, and 8 percent of those use a disposable address. That is 80 signups. If a quarter of them are repeat trials from the same people, 20 trials are abuse, costing about $80 in credits. A block that removes most of them saves perhaps $60 a month. If the same block also turns away 15 honest privacy-minded users who would have converted at 5 percent into a $20 plan, you lose around $15 a month. The block wins, but not by much, and a gentler measure such as limiting credits until the address is verified might win by more.' },
        { p: 'The point is not the numbers. It is that the choice is a calculation about your own signups, and most sites never do it. Run the version for your product before you add a hard block.' },
      ],
    },
    {
      id: 'edge-cases',
      heading: 'Edge Cases That Trip Up Naive Checks',
      blocks: [
        { p: 'A simple domain check handles most traffic, but a few cases cause false positives or let abuse through. Test each one before you ship.' },
        {
          list: [
            '**Upper-case and spaces.** Normalise the address with trim and lower-case before you compare it, or "USER@TEMPDOMAIN.EXAMPLE" slips past.',
            '**Subdomains.** A disposable service may hand out addresses on many subdomains. Check each suffix of the domain, as the sample above does.',
            '**Plus tags and dots.** These do not matter for domain checks, but they matter for duplicates. Decide whether you treat john+a@ and john+b@ as the same person.',
            '**Company domains.** A small business domain can end up on a list by mistake. Provide a way to appeal.',
            '**International domains.** Addresses with non-Latin domains need a proper conversion to ASCII form before comparing.',
            '**Forwarding aliases.** Privacy aliases that forward to a real inbox are not disposable in the sense that matters to you. Blocking them hurts customers who simply value privacy.',
          ],
        },
      ],
    },
    {
      id: 'wording',
      heading: 'Wording That Keeps Good Users',
      tone: 'alt',
      blocks: [
        { p: 'The message you show on a block decides whether the visitor leaves or tries again. Three versions show the range, from worst to best.' },
        { p: 'The worst is "Invalid email address". It tells a person with a perfectly good address that they have made a mistake, and they will retype it and fail again. A better one is "Temporary email addresses are not allowed", which is accurate but a little cold. The best explains the benefit: "Please use an address you will keep, so we can send you receipts and password resets. If you are worried about spam, we only send what you ask for."' },
        { p: 'Keep it to two sentences, put it next to the field and leave the form data in place so the visitor does not have to start again.' },
      ],
    },
    {
      id: 'measure',
      heading: 'Measuring Whether It Worked',
      blocks: [
        { p: 'After you switch a block on, compare four numbers against the month before: signups, activated accounts, trial-to-paid conversion and support tickets about login problems. If signups fall but activations and conversions stay flat or rise, the block removed worthless traffic. If activations fall too, you removed real users and should soften the rule.' },
        { p: 'Keep a note of the date you made the change so you can read the trend later, and look at the list of blocked attempts now and then. A sudden spike in blocks from one domain is useful information, and so is a block on a domain you recognise as a real company. Revisit the policy every quarter. Abuse changes, lists change and so do your customers.' },
      ],
    },

    {
      id: 'server-rules',
      heading: 'Five Server-Side Rules of Thumb',
      tone: 'alt',
      blocks: [
        { p: 'If you are implementing this next week, these five habits will keep the work small and the results sane.' },
        {
          steps: [
            { title: 'Check on the server', text: 'Treat the browser check as a courtesy to the visitor and the server check as the real one.' },
            { title: 'Fail open on lookup errors', text: 'If a DNS lookup or a list service is down, let the signup through and flag it, rather than blocking real customers because of your own outage.' },
            { title: 'Log every block with the domain', text: 'You cannot tune what you cannot see. Store the domain, not the full address, to keep personal data out of your logs.' },
            { title: 'Keep the list outside the code', text: 'Load it from a file or table so a stale list is a data update and not a release.' },
            { title: 'Add an allow-list', text: 'Let your support team exempt a domain in minutes when a real customer is caught by mistake.' },
          ],
        },
        { p: 'None of this needs a large system. A single function, a list you refresh weekly and a log line per block will put you ahead of most signup forms.' },
      ],
    },
  ],
  faqHeading: 'Blocking Disposable Emails: Common Questions',
  faqs: [
    {
      question: 'Is it a good idea to block disposable email addresses?',
      answer: 'It depends on what they cost you. If you suffer repeat free trials or fake signups, a block or a limit can help. If not, a gentle warning is usually enough, and it keeps privacy-minded customers.',
    },
    {
      question: 'Can I rely on a blocklist alone?',
      answer: 'No. New disposable domains appear constantly, so a list always lags behind. Use it together with email verification, rate limits and checks on behaviour.',
    },
    {
      question: 'How do I tell if an address is disposable?',
      answer: 'Take the part after the @ sign and compare it with a maintained list of disposable domains. Some services also check the domain\'s mail servers. Always do the check on the server and not only in the browser.',
    },
    {
      question: 'Will blocking temp mail stop fake accounts?',
      answer: 'It will stop the laziest ones. Determined abusers can use a normal mailbox or buy addresses, so combine it with limits per device and network and with a bot check.',
    },
    {
      question: 'What should the error message say?',
      answer: 'Say what to do and why, for example "Please use an address you will keep so we can send receipts and password resets." Avoid a generic "invalid email", which makes honest users think they made a typo.',
    },
    {
      question: 'Can a verification email catch disposable addresses?',
      answer: 'It proves the address receives mail, but a disposable inbox receives mail too, so it passes. Verification stops typos and bots with fake addresses, not disposable ones.',
    },
    {
      question: 'How can I test my signup form for these addresses?',
      answer: 'Get a temporary address from Nexora Temp Mail, use dummy data, and check both the blocked path and the delivery of the confirmation email. The tool has no API, so for automated tests use a local mail catcher.',
    },
  ],
  related: ['disposable-email-address', 'temp-mail-for-verification', 'is-temp-mail-safe', 'temporary-email-address'],
}
