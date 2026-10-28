/** Guide: is temp mail safe. Angle: an honest threat model (who can see what), not a sales page. */
export default {
  slug: 'is-temp-mail-safe',
  path: '/tools/temp-mail/is-temp-mail-safe',
  breadcrumbName: 'Is temp mail safe',
  seo: {
    title: 'Is Temp Mail Safe? Risks, Privacy and What to Avoid',
    description:
      'Is temp mail safe to use? Yes for low-stakes signups and testing, no for anything you must recover or keep private. See who can read the inbox and the rules.',
    keywords:
      'is temp mail safe, are temporary emails safe, is temporary email safe, temp mail privacy, temp mail risks, disposable email security, is temp mail legal, temp mail scam',
  },
  h1: 'Is Temp Mail Safe? An Honest Look at the Risks',
  eyebrow: 'Temp mail guide',
  lead: 'Temp mail is safe for low-stakes jobs such as a one-off code, a download or testing your own site. It is not safe for anything you must recover or keep private, because anyone who knows the exact address can read its inbox.',
  sections: [
    {
      id: 'short-answer',
      heading: 'The Short Answer: Safe for What, Exactly?',
      blocks: [
        { p: '"Is it safe?" is really three questions. Is it safe for my device, is it safe for my data, and is it safe to rely on. The honest answers are: usually yes, mostly yes if you use it as intended, and no. Different parts of a temp-mail service are exposed to different risks, so a single yes or no would mislead you.' },
        {
          table: {
            caption: 'Is temp mail safe? It depends on the job',
            columns: ['What you are doing', 'Safe?', 'Why'],
            rows: [
              ['Getting a one-time code for a throwaway signup', 'Yes', 'Nothing of value is attached to the address'],
              ['Downloading a free file you do not need to hear about again', 'Yes', 'You take the file and leave'],
              ['Testing your own signup or email flow with dummy data', 'Yes', 'Real delivery, no real data'],
              ['Creating an account you want to keep', 'No', 'You cannot recover it once the inbox is gone'],
              ['Anything involving money, health, government or work', 'No', 'You need a private mailbox you control'],
              ['Receiving private documents or personal details', 'No', 'The inbox is open to anyone who knows the address'],
            ],
          },
        },
        { callout: 'Rule of thumb: if losing the account would hurt, or someone reading the message would hurt, do not use a temporary address.' },
      ],
    },
    {
      id: 'who-reads',
      heading: 'Who Can Read a Temporary Inbox?',
      tone: 'alt',
      blocks: [
        { p: 'Anyone who knows the exact address can open its inbox while it exists. There is no password, because the point is that you need nothing to use it. That is the central trade-off, and it is the reason temp mail is wrong for private mail.' },
        { p: 'In practice the risk is small for a random address. Ours is ten characters drawn from 31 letters and numbers, which gives roughly 820 trillion possible names, so a stranger will not stumble on yours by chance. The risk rises in two cases. If you pick a short, readable name through Customize, someone can guess it. And if you post your address publicly, anyone who sees it can read the mail.' },
        { p: 'The sensible habits follow from this. Keep the random address unless you have a reason not to. Do not share it. Do not put it in a screenshot you will post. And remember that the people running a temp-mail service can technically read the mail that passes through, which is true of any email provider. On Nexora Temp Mail, messages are held only until the address expires and are then erased, and the preview strips scripts and remote images.' },
      ],
    },
    {
      id: 'device',
      heading: 'Is It Safe for Your Device?',
      blocks: [
        { p: 'Opening a message in a temp inbox is no riskier than opening one in any webmail, and in a few ways it is safer. Mail is shown sanitised: scripts are removed and remote images are not loaded. That stops two common tricks, code running in the page and "tracking pixels" that tell the sender you opened the message and from where.' },
        { p: 'Attachments are the real hazard in any mailbox. On our tool, files up to 1 MB each can be downloaded as plain files, and programs, scripts and HTML files are never kept. That removes the most obvious danger types, but it does not make every file safe. A PDF or a document can still carry something nasty. Only open a file you were expecting, from a sender you triggered, and scan it if you are unsure.' },
        { h3: 'Links inside messages' },
        { p: 'Treat links in temp mail the way you treat links anywhere. Hover to see the real address, prefer messages that you asked for, and be suspicious of anything that arrives unprompted. Since the address is new and was never given to anyone, a message you did not trigger is almost certainly spam or a phishing attempt, and it is safest to ignore it.' },
      ],
    },
    {
      id: 'data',
      heading: 'What Happens to Your Data',
      tone: 'alt',
      blocks: [
        { p: 'We keep the minimum needed to run the service. There is no account, so there is no profile. Messages and attachments live only until the address expires, then they are erased automatically. For abuse protection we store a salted, hashed form of your IP address, not the address itself, so we can limit repeat abuse without keeping a readable log of who you are.' },
        { p: 'You should ask these questions of any temp-mail service, ours included, and look for the answer on the page rather than taking anyone\'s word for it.' },
        {
          list: [
            'How long is mail kept, and is it really deleted afterwards?',
            'Does the service store your IP address, and in what form?',
            'Does it show you messages safely, with scripts and remote images blocked?',
            'Is there a way to report abuse?',
            'Does it say plainly what it cannot do?',
          ],
        },
        { p: 'A service that cannot answer these in plain language is one to be wary of. Free tools are sometimes paid for with advertising and tracking, and the more aggressive the page, the less you should put through it.' },
      ],
    },
    {
      id: 'recovery',
      heading: 'The Risk People Miss: You Cannot Get the Account Back',
      blocks: [
        { p: 'The most common way temp mail "goes wrong" is not a hack. It is losing an account. Password resets, security alerts and billing notices all go to the address on file. Once the inbox is erased, they go nowhere, and the account is effectively yours only until you close the tab.' },
        { p: 'That is fine for something you wanted to look at. It is painful for something you came to rely on. We hear a version of this story often: someone signs up for a tool with a throwaway, uses it for a week, and cannot log back in. If there is any chance you will want an account later, give it an address you control from day one. The guide to the [differences between disposable, alias and real addresses](/tools/temp-mail/disposable-email-address) will help you choose.' },
      ],
    },
    {
      id: 'misuse',
      heading: 'Misuse, Abuse and the Legal Side',
      tone: 'alt',
      blocks: [
        { p: 'Using a temporary email address is legal almost everywhere, and there is nothing shady about wanting less spam. The legal and ethical line is about what you do with it. Using one to register fake accounts at scale, to dodge a ban, to defraud a free trial or to harass someone is misuse, and it can break a site\'s rules and the law.' },
        { p: 'Because of that, temp-mail services need defences, and ours has them. Addresses are receive only, so they cannot be used to send spam. We rate-limit how many addresses one network can create, we ban senders that abuse the service, and anyone can report an abusive message from the inbox. These controls are there to protect both the service and the sites that receive its signups.' },
        { p: 'If you run a site and you are worried about abuse through disposable addresses, read the [guide on blocking disposable email addresses](/tools/temp-mail/block-disposable-emails). It covers sensible ways to deal with it that do not turn away honest users.' },
      ],
    },
    {
      id: 'checklist',
      heading: 'A Safe-Use Checklist',
      blocks: [
        { p: 'Follow these seven rules and you will avoid nearly every problem people have with temporary email.' },
        {
          steps: [
            { title: 'Use it for low-stakes jobs only', text: 'A code, a download, a trial you will not keep, a test of your own site.' },
            { title: 'Keep the random address', text: 'Choose a custom name only for demos, and never for something you care about.' },
            { title: 'Never send sensitive data', text: 'No passwords, ID numbers, card details, medical or work documents.' },
            { title: 'Do not use it for accounts you want back', text: 'If a reset email might matter later, use a real or alias address.' },
            { title: 'Only open mail you triggered', text: 'A message you did not ask for in a brand new inbox is spam or a scam.' },
            { title: 'Be careful with attachments and links', text: 'Open only what you expected, and check the real destination of links.' },
            { title: 'Copy what you need, then walk away', text: 'The inbox will be erased. Do not rely on it as storage.' },
          ],
        },
      ],
    },
    {
      id: 'better',
      heading: 'When Something Else Is Better',
      tone: 'alt',
      blocks: [
        { p: 'Sometimes a different tool is the safer answer. If you want to hide your address but keep the relationship, use a forwarding alias. If you want a private place to receive documents, use a real mailbox with two-step sign-in. If you want to test an application in an automated pipeline, use a local mail catcher or a dedicated email-testing service, since our tool has no public API.' },
        { p: 'Temp mail is the right answer to a narrow, common question: "I need an address for five minutes and never want to hear from this site again." For that question it is simple, private enough and free. For every other question, the honest advice is to pick a better fit. You can try it any time with the [Nexora Temp Mail tool](/tools/temp-mail), and the guide to [receiving verification codes](/tools/temp-mail/temp-mail-for-verification) shows the safest way to use it.' },
      ],
    },

    {
      id: 'myths',
      heading: 'Six Myths About Temp Mail',
      tone: 'alt',
      blocks: [
        { p: 'Much of the confusion about safety comes from a handful of ideas that sound right and are not. Here are the six we hear most, with the short, honest answer to each.' },
        { h3: '"It makes me anonymous."' },
        { p: 'It does not. It hides your email address from the site. Your IP address, browser and behaviour are still visible to that site, and a determined party could link visits together without ever seeing an email.' },
        { h3: '"Nobody can read my messages."' },
        { p: 'Anyone who knows the exact address can read them while the inbox exists. That is the design, and it is why nothing private belongs there.' },
        { h3: '"It is only for people doing something wrong."' },
        { p: 'Most users want to avoid spam or test a website. Wanting to keep your main address out of a marketing database is ordinary and sensible.' },
        { h3: '"It works on every website."' },
        { p: 'It does not. Many sites block disposable domains, and any that need an SMS code are out of reach.' },
        { h3: '"A longer address is a safer address."' },
        { p: 'Length matters for guessing, but only for random names. A short readable name is easy to guess, however long the timer.' },
        { h3: '"Deleted means gone forever, everywhere."' },
        { p: 'Mail is erased from our inbox when the address expires. It cannot be erased from the site that sent it, or from anywhere you forwarded or copied it. Deletion covers our copy, and not yours or theirs.' },
      ],
    },
    {
      id: 'phishing',
      heading: 'Spotting Phishing and Junk in a Temporary Inbox',
      blocks: [
        { p: 'A brand-new temporary inbox should be empty until you give the address to a site. So any message you did not trigger is suspect, and the odds that it is junk or a scam are very high. Random addresses can still receive unsolicited mail, because senders sometimes try thousands of guesses, but a message with no connection to anything you did is not one to trust.' },
        { p: 'Even for messages you asked for, check three things before you click. Does the sender name match the site you used? Does the link, when you hover over it, lead to that site\'s real domain? Is the message asking for more than it should, such as a password, a card number or a code sent on to "support"? A real verification email asks for none of that. If it does, close it and report it.' },
        { p: 'If a message looks abusive, use Report in the inbox. Reports help us block repeat senders and keep the service clean for everyone.' },
      ],
    },
    {
      id: 'shared',
      heading: 'Shared and Public Computers',
      tone: 'alt',
      blocks: [
        { p: 'On a computer other people use, a temporary inbox is a decent choice and a few habits make it a better one. The page remembers your current address in the browser so you can return to it, which is helpful at home and not helpful on a library machine. When you finish, close the inbox and clear the site\'s data in your browser, or use a private window from the start.' },
        { p: 'Do not install the tool as an app, or turn on push alerts, on a computer you do not own. Those features are meant for your own device. And never sign in to anything important from a shared computer, with a temporary address or otherwise.' },
      ],
    },
    {
      id: 'behind',
      heading: 'What the Service Does to Protect Itself and You',
      blocks: [
        { p: 'A temporary inbox invites abuse by its nature, so a responsible service has to defend itself. Ours limits how many addresses one network can create in a short time, which blunts scripts that try to mass-produce them. It keeps addresses receive only, so they cannot be used to send spam. It blocks senders that repeatedly abuse it, and it removes mail on a fixed schedule so nothing builds up.' },
        { p: 'These controls exist for a reason that benefits you directly: a service that attackers can use freely quickly lands on every blocklist, and then its addresses stop working anywhere. Keeping the service clean is what keeps the addresses useful. If you notice something off while using it, tell us through the Report button.' },
      ],
    },

    {
      id: 'kids',
      heading: 'A Note for Parents and Schools',
      blocks: [
        { p: 'Temporary email is not designed for children, and a service for adults is not the place for a young person to hand out their details. If a young person uses the internet on your device, give them an account they can recover and that you can help with. Disposable addresses make it harder for a parent to step in when something goes wrong, because there is no account history to look at and no way to reset a password.' },
      ],
    },
  ],
  faqHeading: 'Is Temp Mail Safe? Common Questions',
  faqs: [
    {
      question: 'Is temp mail safe on a public computer?',
      answer: 'It can be, if you close the inbox and clear the site\'s data when you finish, or use a private window. The page remembers your current address in the browser, so do not leave it open on a machine other people use.',
    },
    {
      question: 'Is temp mail safe to use?',
      answer: 'Yes for low-stakes tasks such as a one-time code, a download or testing your own site. It is not safe for accounts you want to keep or for private information, because the inbox is open to anyone who knows the address.',
    },
    {
      question: 'Can someone steal my emails from a temp inbox?',
      answer: 'Only by knowing or guessing the exact address while it is active. Random addresses are very hard to guess, but you should never put anything private in one. Mail is erased when the address expires.',
    },
    {
      question: 'Is it safe to open links and attachments?',
      answer: 'Treat them as you would anywhere. Scripts and remote images are removed from the preview, and programs, scripts and HTML files are never kept as attachments. Even so, open only files you expected and check where links lead.',
    },
    {
      question: 'Can temp mail give me a virus?',
      answer: 'Reading a message in the preview will not run code in the page. A downloaded file is the risk, as with any email. Files are limited to 1 MB each and dangerous file types are not kept, but you should still scan anything you are unsure about.',
    },
    {
      question: 'Is it legal to use a temporary email address?',
      answer: 'Yes, in most places. What you do with it is what counts. Fake registrations at scale, ban evasion and fraud are misuse and can break a site\'s rules or the law.',
    },
    {
      question: 'Does Nexora keep my emails or personal data?',
      answer: 'Mail and attachments are erased when the address expires. There is no account, and for abuse protection we keep a salted, hashed form of your IP address rather than the address itself.',
    },
    {
      question: 'Why would a site be wary of temporary emails?',
      answer: 'Because they are used for fake signups and repeat free trials, so many sites block known disposable domains. That is the site\'s decision, and for those sites you should use a regular address.',
    },
    {
      question: 'What should I never use temp mail for?',
      answer: 'Banking, tax, government, health and work accounts, anything you must recover later, and any message with private details. Use a real mailbox with two-step sign-in for those.',
    },
  ],
  related: ['temporary-email-address', 'disposable-email-address', 'temp-mail-for-verification', 'block-disposable-emails'],
}
