/** Guide: email alias vs temp mail. Angle: a decision framework built on recovery and trust, not a product comparison. */
export default {
  slug: 'email-alias-vs-temp-mail',
  path: '/tools/temp-mail/email-alias-vs-temp-mail',
  breadcrumbName: 'Email alias vs temp mail',
  seo: {
    title: 'Email Alias vs Temp Mail: Which One Should You Use?',
    description:
      'Email alias or temp mail? An alias forwards to your real inbox and suits accounts you keep. Temp mail is a throwaway inbox for one-offs. Pick with one question.',
    keywords:
      'email alias vs temp mail, temporary email vs alias, email masking vs disposable email, disposable email vs email alias, hide my email alternative, email forwarding alias, temp mail or alias',
  },
  h1: 'Email Alias vs Temp Mail: Which One Should You Use?',
  eyebrow: 'Temp mail guide',
  lead: 'An email alias forwards mail to your real inbox, so it suits accounts you keep. Temp mail is a separate throwaway inbox that disappears, so it suits one-off signups. Choose by asking whether you will ever need to get back into the account.',
  sections: [
    {
      id: 'one-question',
      heading: 'One Question Settles Most Cases',
      blocks: [
        { p: 'Ask yourself: will I need to get back into this account later? If yes, use an alias. If no, use temp mail. Nearly every other consideration in this guide is a refinement of that single test.' },
        { p: 'The two tools get compared as if they were rivals, but they solve neighbouring problems. Both keep your real address out of a stranger\'s database. They differ in what happens next. An alias keeps a live line to you, so the site can still reach you and you can still reach it. A temporary inbox cuts the line as soon as the timer ends.' },
        { p: 'Knowing which behaviour you want is most of the decision. The rest of the page fills in the details, shows where each one fails, and describes a middle option for the cases that sit between.' },
      ],
    },
    {
      id: 'how-alias-works',
      heading: 'What Is an Email Alias and How Does It Work?',
      tone: 'alt',
      blocks: [
        { p: 'An email alias is an extra address that points at your real mailbox. Mail sent to it is passed on to you, and a good alias service lets you reply without revealing the real address. You can create many, usually one per website, and switch any of them off individually.' },
        { p: 'That design has real strengths. You can sign up for a service, receive its order updates and security notices, recover the account with a password reset, and still not hand over the address you use for friends and work. When one alias starts getting spam, you disable it and carry on, and you also learn which site leaked it.' },
        { p: 'It also carries a built-in cost: trust. The alias provider sits in the middle and must know your real address, because that is where it delivers. If the provider is breached, or hands records over, the masks can be traced back to you. You are swapping the exposure to hundreds of sites for exposure to one company.' },
      ],
    },
    {
      id: 'how-temp-works',
      heading: 'How Temp Mail Works',
      blocks: [
        { p: 'Temp mail is not connected to your real address at all. You get a standalone inbox that exists only on the web page, receives mail for a short time, and is then erased. There is no account to create and no forwarding destination to give, so there is nothing for the service to link back to you.' },
        { p: 'On [Nexora Temp Mail](/tools/temp-mail) an address lasts one hour, with one optional extra hour. Messages are shown with scripts and remote images removed, codes are picked out for you, and the inbox is wiped automatically at the end. Free addresses can only receive mail.' },
        { p: 'The price of that independence is permanence. Nothing is recoverable. If the site later sends a password reset, a receipt or a security alert, it goes to an address that no longer exists. For the right kind of signup that is a feature, because it also means no newsletters ever reach you.' },
      ],
    },
    {
      id: 'side-by-side',
      heading: 'Side by Side',
      tone: 'alt',
      blocks: [
        {
          table: {
            caption: 'Alias or temp mail: how they differ in practice',
            columns: ['', 'Email alias', 'Temp mail'],
            rows: [
              ['Where mail ends up', 'In your real inbox', 'In a throwaway inbox on a web page'],
              ['Link to your real address', 'Held by the alias provider', 'None'],
              ['Account needed', 'Yes, with the alias service', 'No'],
              ['Lifespan', 'Until you switch it off', 'Short, then erased'],
              ['Password reset works later', 'Yes', 'No'],
              ['Spam control', 'Disable the one alias', 'Inbox expires by itself'],
              ['Sending from it', 'Often possible', 'Not on free addresses'],
              ['Typical use', 'Shops, subscriptions, long-term accounts', 'Downloads, trials, one-time codes'],
            ],
          },
        },
        { p: 'Read the table by the rows that matter to you. If recovery is the deciding factor, only the alias fits. If minimising what anyone knows about you is the deciding factor, temp mail wins. Most people care about both at different times, which is why the answer is rarely "always one".' },
      ],
    },
    {
      id: 'scenarios',
      heading: 'Scenarios: Which One for What',
      blocks: [
        { p: 'Here is how the choice plays out for the signups people make most often.' },
        {
          steps: [
            { title: 'A free PDF or template behind an email wall', text: 'Use temp mail. You take the file and never return, and no mailing list should follow you home.' },
            { title: 'An online shop you will buy from', text: 'Use an alias. You need order updates, a delivery notice and a return process, and the shop will email you about them.' },
            { title: 'A free trial you plan to cancel', text: 'Either works. Temp mail is lighter, but a trial that bills a card may email a reminder you want to see, so an alias is safer if you might forget.' },
            { title: 'A one-time code for a wifi login or a coupon', text: 'Use temp mail. The code arrives within seconds, and the address is no longer needed. The [verification code guide](/tools/temp-mail/temp-mail-for-verification) has the details.' },
            { title: 'A bank, a tax office, a doctor, an employer', text: 'Use your real address, not either tool. These need a mailbox you own and can always recover.' },
          ],
        },
      ],
    },
    {
      id: 'blocking',
      heading: 'Which Gets Blocked More Often',
      tone: 'alt',
      blocks: [
        { p: 'Temp mail is blocked more often, a topic covered from the site owner\'s side in [how to block disposable email addresses](/tools/temp-mail/block-disposable-emails). Sites that want to stop abuse keep lists of known disposable domains, and a temporary-inbox address matches the list. An alias looks like an ordinary address on an ordinary domain, so it usually passes.' },
        { p: 'That gap is wider than it sounds for the sites that matter. Banks, government portals and many subscription services check signups. If you are turned away at a form, the site has told you something about how it sees throwaway mail, and a different address is the only fix. Do not try to disguise the domain.' },
        { p: 'Most sites do not check at all. For the downloads, forums and trial signups where temp mail shines, a block is the exception, and you can switch to another address in seconds when it happens.' },
      ],
    },
    {
      id: 'breach',
      heading: 'What Happens When Something Goes Wrong',
      blocks: [
        { p: 'Compare the failure modes, because that is where the two designs differ most. When a site you used is breached, an alias leaks a masked address. That is better than your real one, and the damage is limited to that alias, which you can switch off. A temp mail address leaks too, but it is dead by the time anyone tries it.' },
        { p: 'When the alias provider itself is the problem, the picture changes. A breach there can expose the list of every alias together with the real address behind each. Because the provider is a single point, the loss is bigger and more personal. Temp mail has no such list, since there is no account and nothing to tie addresses together.' },
        { p: 'The other kind of failure is human. You forget which alias belongs to which service, or you lose access to the alias dashboard and cannot reach accounts that depend on it. With temp mail the mistake is simpler: you needed the inbox after it had expired. Neither is solved by a better product. Both are solved by deciding up front which accounts matter.' },
      ],
    },
    {
      id: 'effort',
      heading: 'Effort and Cost in Real Life',
      tone: 'alt',
      blocks: [
        { p: 'Temp mail costs the least attention. You open a page and use it, and there is no dashboard to maintain, no list of aliases to prune and no subscription to forget. If you sign up for ten small things a month, that saving is the main reason to prefer it.' },
        { p: 'An alias costs a little attention for each signup, because you create the mask, name it and later decide whether to keep it. Free plans from alias services typically cap how many you may hold, and paying lifts the cap. That is a fair price for a service that sits in front of your accounts, but it is a recurring one.' },
        { p: 'Premium on Nexora Temp Mail sits between the two on effort and cost: you keep a few addresses alive on purpose, rather than all of them or none. Because the free inbox is still there for the small stuff, you spend money only on the addresses that deserve it.' },
      ],
    },
    {
      id: 'myths',
      heading: 'Three Myths Worth Dropping',
      blocks: [
        { p: 'Advice about these two tools is full of half-truths that make the choice harder than it is. These are the ones worth setting aside.' },
        { h3: '"An alias makes me anonymous"' },
        { p: 'It does not. It hides one identifier from one site. The site may still know your name, your card, your address and your IP. Aliases reduce spam and tracking by address, and they stop there.' },
        { h3: '"Temp mail is only for people hiding something"' },
        { p: 'Most users are tired of promotions, or want to check a site before trusting it. Developers use it daily to test their own signup pages. Wanting a clean inbox is not suspicious.' },
        { h3: '"I should pick one and stick with it"' },
        { p: 'The people who manage this well use both, with a rule for each. Choosing per signup takes seconds once the question in the first section becomes a habit.' },
      ],
    },
    {
      id: 'middle-way',
      heading: 'A Middle Option: Long-Lived Addresses That Forward',
      blocks: [
        { p: 'Sometimes neither pure form fits. You want an address that is not your real one, that survives for months, and that still lets you recover an account. Nexora Temp Mail Premium is built for that gap.' },
        { p: 'A Premium address lasts as long as your plan is paid. You can keep up to 10, pick their names, receive attachments up to 5 MB and forward each one to your own inbox after confirming that inbox with a one-time code. In effect you get alias-like behaviour on an address that is not tied to a provider account for your personal mail.' },
        { p: 'Premium also lets you connect up to three domains you own, so mail sent to any name at that domain is forwarded to you. For a small business that is a cheaper route to catch-all addressing than buying mailboxes. Prices are $3.99 a month or $29 a year, and the free inbox stays free either way.' },
      ],
    },
    {
      id: 'mix',
      heading: 'Using Both Without Making a Mess',
      tone: 'alt',
      blocks: [
        { p: 'You do not have to choose once. A sensible setup uses three layers. Your real address stays for the accounts that matter. Aliases or long-lived forwarding addresses cover the services you keep but do not trust. Temp mail covers everything else.' },
        { p: 'Write the rule down so you apply it without thinking: keep it, alias it; try it, burn it; trust it, use the real one. The common failure is drift. A throwaway signup turns into an account you love, and months later you cannot recover it. When that happens, change the email on the account straight away, while you still have access, rather than waiting until it matters.' },
        { p: 'Another failure goes the other way: giving aliases to sites that will never matter, then paying for a plan to keep a long list alive. Free temporary inboxes exist so you can stop managing the trivial ones.' },
      ],
    },
  ],
  faqHeading: 'Email Alias vs Temp Mail: Common Questions',
  faqs: [
    {
      question: 'Is an email alias better than temp mail?',
      answer: 'Neither is better in general. An alias is better for accounts you will keep, because mail still reaches you. Temp mail is better for one-off signups, because nothing links back to you.',
    },
    {
      question: 'Can I recover an account if I signed up with temp mail?',
      answer: 'No. The inbox is erased when the timer ends, so a password reset has nowhere to go. Use an alias or your real address for anything you want to recover.',
    },
    {
      question: 'Does an alias hide my real email completely?',
      answer: 'It hides it from the website, but the alias provider knows it, because that is where mail is delivered. Temp mail does not involve your real address at all.',
    },
    {
      question: 'Which is harder for a website to block?',
      answer: 'Aliases, as a rule. They sit on ordinary domains, while temporary inboxes use domains that blocklists often include.',
    },
    {
      question: 'Do I need an account for temp mail?',
      answer: 'No. Open the page and the inbox is ready. Premium addresses need a sign-in, but the free inbox does not.',
    },
    {
      question: 'Can a temporary address forward mail to my inbox?',
      answer: 'Free addresses cannot. Premium addresses can forward to an inbox of yours after you confirm it with a code.',
    },
    {
      question: 'Is it safe to use an alias for banking?',
      answer: 'Banks and similar services are best given your real address, which you control and can always recover. An alias adds a middleman you may not want on those accounts.',
    },
    {
      question: 'How many aliases or temporary addresses can I have?',
      answer: 'Each free address is new, so you can make another when you need one, within the limits that stop abuse. Premium allows up to 10 named addresses at once.',
    },
  ],
  related: ['burner-email', 'disposable-email-address', 'is-temp-mail-safe', 'temp-mail-for-verification'],
}
