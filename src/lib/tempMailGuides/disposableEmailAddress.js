/** Guide: disposable email address. Angle: vocabulary and a decision guide between the look-alike options. */
export default {
  slug: 'disposable-email-address',
  path: '/tools/temp-mail/disposable-email-address',
  breadcrumbName: 'Disposable email address',
  seo: {
    title: 'Disposable Email Address: Free Account and Generator Guide',
    description:
      'What a disposable email address is, how it differs from an alias, burner or fake email, and which to pick. Includes a free disposable email generator.',
    keywords:
      'disposable email address, disposable email account, free disposable email, disposable email generator, temporary disposable email, disposable email vs alias, burner email, throwaway email address',
  },
  h1: 'Disposable Email Address: What It Is and Which Kind You Need',
  eyebrow: 'Temp mail guide',
  lead: 'A disposable email address is a mailbox made to be used briefly and then discarded. It receives real mail, needs no personal details, and protects your main inbox from spam, tracking and leaked databases.',
  sections: [
    {
      id: 'meaning',
      heading: 'What "Disposable" Means for an Email Address',
      blocks: [
        { p: 'Disposable means you can throw it away without losing anything. The address exists to serve one purpose, such as receiving a code, and once that purpose is done you walk away. If the address is later flooded with junk or ends up in a leaked list, it costs you nothing, because you were never going to look at it again.' },
        { p: 'That sounds like a small idea, but it changes how you treat the internet. Most of us hand out the same address to hundreds of websites and then wonder why it receives so much junk. Each signup is a copy of your address sitting in somebody\'s database, and databases leak. A disposable address breaks that chain at the first link. The site gets an address, you get what you came for, and the copy it holds points at nothing.' },
        { p: 'You will see the same idea sold under many names: disposable, temporary, throwaway, burner, one-time, 10-minute, anonymous. In everyday use they mean almost the same thing. The differences that matter are how long the address lives, whether you must make an account, and whether it can forward to you. The rest of this page sorts that out.' },
      ],
    },
    {
      id: 'kinds',
      heading: 'The Six Kinds of Throwaway Address',
      tone: 'alt',
      blocks: [
        { p: 'There are six common ways to keep your real address out of a form, and they are not interchangeable. The table gives the short version, and the sections after it explain where each one fits.' },
        {
          table: {
            caption: 'Ways to avoid giving a site your real email address',
            columns: ['Kind', 'Account needed', 'Lifespan', 'Receives real mail', 'Typical use'],
            rows: [
              ['Disposable inbox (temp mail)', 'No', 'Minutes to hours', 'Yes', 'Codes, downloads, tests'],
              ['Forwarding alias', 'Yes', 'Until you delete it', 'Yes, passed to you', 'Shops, newsletters you may keep'],
              ['Plus address (name+shop@...)', 'Your own mailbox', 'Permanent', 'Yes, to your inbox', 'Tracking who leaked your address'],
              ['Spare mailbox you made', 'Yes', 'Years', 'Yes', 'A second inbox for junk'],
              ['Fake address typed by hand', 'No', 'None', 'No', 'Forms that do not check'],
              ['Fake email generator', 'No', 'None', 'No', 'Sample data and mock-ups'],
            ],
          },
        },
        { h3: 'Disposable inbox' },
        { p: 'This is what Nexora Temp Mail gives you. A real inbox, no account, gone in an hour or two. It is the best option when you want nothing to be linked to you afterwards.' },
        { h3: 'Forwarding alias' },
        { p: 'An alias forwards mail to your real inbox. It is better than a disposable inbox when you want to keep hearing from a shop, because replies reach you. The price is that you need an account with the alias service, and your real mailbox sits behind it.' },
        { h3: 'Plus address' },
        { p: 'Many mail providers, Gmail included, ignore everything after a plus sign. Mail sent to you+shop@gmail.com lands in your normal inbox, and the tag shows you which site shared your address. It is a good detective tool, but it hides nothing: anyone can strip the tag and see your real address.' },
        { h3: 'Spare mailbox' },
        { p: 'A second Gmail or Outlook account for junk. It works, but it is a real account with a phone-number prompt, real storage and real data about you, so it is the least disposable of the lot.' },
        { h3: 'Hand-typed fake and fake email generators' },
        { p: 'Typing asdf@asdf.com or using a fake email generator gives you an address that looks right but receives nothing. That is fine for a form that never checks, and useless for anything that sends a code. A fake address and a disposable inbox solve different problems. If a site wants to email you, only the inbox works.' },
      ],
    },
    {
      id: 'free-account',
      heading: 'Disposable Email Account vs Disposable Email Address',
      blocks: [
        { p: 'People search for both phrases, and they point at slightly different things. A disposable email address is just the address. A disposable email account suggests something with a login, and some services do work that way: you sign up, get a dashboard and can create many aliases.' },
        { p: 'For the plain job of getting a code or a download link, you do not need an account, and an account is a small step back toward being identifiable. That is why we built Temp Mail without one. Open the page, use the address, close the tab. There is no username to forget and no profile to delete, because nothing was created in your name.' },
        { p: 'If you do want something that lasts, choose an account-based alias service on purpose and use it for the sites you expect to keep. Use the account-free inbox for the ones you do not. Using both is not overkill. It is the cheap way to match the tool to the stakes.' },
      ],
    },
    {
      id: 'generator',
      heading: 'What a Disposable Email Generator Does',
      tone: 'alt',
      blocks: [
        { p: 'A disposable email generator creates a new address at the press of a button, so you never have to think up a name. Ours picks ten random characters from letters and numbers, leaving out the ones that look alike (i, l, o, 0 and 1), which makes the address easier to read out and type correctly.' },
        { p: 'Random is the right default. A name like john.smith.2026 is easy to remember and just as easy for someone else to try, and anyone who guesses an exact address can read its inbox while it lives. If you want a readable name for a demo, use Customize and accept the trade. For everything else, keep the random one.' },
        { p: 'Generators differ in the domain they hand out. Some use a handful of shared domains that thousands of people use, and those get blocked quickly. Nexora Temp Mail uses a mail domain of its own, and the [guide for website owners](/tools/temp-mail/block-disposable-emails) explains how sites decide what to block, so you know why an address that works on one site is refused on another.' },
      ],
    },
    {
      id: 'free',
      heading: 'Is a Free Disposable Email Really Free?',
      blocks: [
        { p: 'Ours is. There is no signup, no payment and no trial. We run it as a free tool because it is useful on its own and because it sits next to the other free tools on the site, such as the invoice and quotation makers.' },
        { p: 'Be a little careful with the general question, though. Any free service has to pay for itself somehow, and for some temporary-mail sites the answer is heavy advertising, tracking or selling the mail that passes through. A fair check before you trust any of them: does it say how long mail is kept, does it say what it stores about you, and does it show you the message safely, without loading remote images that tell the sender you opened it? Our answers are on the page: mail is erased on expiry, the only IP data we hold is a salted, hashed value used to curb abuse, and scripts and remote images are stripped from the preview.' },
      ],
    },
    {
      id: 'choose',
      heading: 'Which One Should You Use? A Quick Decision Guide',
      tone: 'alt',
      blocks: [
        { p: 'Ask yourself one question: will I ever need to hear from this site again? If the answer is no, use a disposable inbox. If the answer is maybe, use an alias or a plus address. If the answer is yes, use your real address. Everything else follows from that.' },
        {
          steps: [
            { title: 'You only want a code or a file', text: 'Use a disposable inbox. You will never need the address again, and nothing is left behind.' },
            { title: 'You might want order updates or a reply', text: 'Use an alias. It forwards to you, and if the shop sells your details you switch the alias off.' },
            { title: 'You want to find out who leaked your address', text: 'Use plus addressing with a different tag per site, then watch which tag starts receiving junk.' },
            { title: 'The account matters (money, work, identity)', text: 'Use your real address, with a strong password and two-step sign-in. This is not the place to be clever.' },
            { title: 'You are testing your own signup flow', text: 'Use a disposable inbox. You want a clean address on each run, and you want to see real delivery.' },
          ],
        },
      ],
    },
    {
      id: 'examples',
      heading: 'Three Real Examples',
      blocks: [
        { p: 'Abstract advice is easy to nod at and forget, so here are three situations with the answer each one calls for.' },
        { h3: 'A recipe site wants your email before it shows the full page' },
        { p: 'You will read it once. Use a disposable inbox, take the link from the message, and close the tab. The site may mail the address for weeks, and every one of those messages goes nowhere.' },
        { h3: 'An online shop wants an account before checkout' },
        { p: 'You will want tracking numbers and maybe a return. A disposable inbox is risky here, because the order email will arrive after the address has expired. Use an alias, or your real address if you trust the shop.' },
        { h3: 'A SaaS trial for your team' },
        { p: 'If you are only looking, use a disposable inbox. If your team will actually adopt it, switch to a work address before you enter anything real, because the billing and reset emails will matter later. Many people lose a trial account this way: they sign up with a throwaway, like the product, and then cannot recover the login.' },
      ],
    },
    {
      id: 'sites',
      heading: 'Why Some Sites Refuse Disposable Addresses',
      tone: 'alt',
      blocks: [
        { p: 'Some websites check the domain of your address against a list of disposable domains and refuse a match. They do it to stop one person from creating dozens of free trials, to cut down on fake accounts and to keep their mailing list clean. It is a reasonable business choice, even though it is annoying when you are the one blocked.' },
        { p: 'There is no trick that makes a blocked address work, and we would not recommend hunting for one. If a site rejects a disposable address, take it as a sign that the site wants a real relationship. Decide whether the content is worth it, and if it is, give it an alias or your real address.' },
        { p: 'If you run a site, you face the same trade from the other side. A strict block stops abuse and also turns away privacy-minded customers. Our guide on [blocking disposable email addresses](/tools/temp-mail/block-disposable-emails) lays out options from soft warnings to hard blocks.' },
      ],
    },
    {
      id: 'habits',
      heading: 'Good Habits With Disposable Addresses',
      blocks: [
        { p: 'A few habits make disposable addresses much more useful. None of them is complicated.' },
        {
          list: [
            'Use one address per task. Do not paste the same temporary address into five sites and then wonder whose mail is whose.',
            'Copy the code or link before you close the tab. Once the address expires, the mail is gone for good.',
            'Keep the tab open while you wait. Alerts need the page loaded, and an idle tab is the main reason people miss a code.',
            'Never use one for something you must recover later. See the [safety guide](/tools/temp-mail/is-temp-mail-safe) for the list of things to avoid.',
            'Do not send sensitive information to it. Anyone who knows the exact address can read the inbox while it exists.',
          ],
        },
        { p: 'Get a disposable address now from the [Nexora Temp Mail tool](/tools/temp-mail). If you want to know exactly how the address is created and how long it lasts, read the guide to a [temporary email address](/tools/temp-mail/temporary-email-address).' },
      ],
    },

    {
      id: 'spam',
      heading: 'What a Disposable Address Changes About Spam',
      tone: 'alt',
      blocks: [
        { p: 'It changes where spam lands, not how much exists. Junk mail reaches your inbox through a short chain: you give an address to a site, the site keeps it, sometimes shares or sells it, and sooner or later it appears in a breach or a list. A disposable address cuts that chain at the first step by giving the site something that goes nowhere.' },
        { p: 'The effect builds up over time. If you use a disposable address for every download and every trial, the number of places that hold your real address stays small, and the junk that reaches it shrinks accordingly. You will not notice it in a week. Check again in a year, and the difference is usually clear.' },
        { p: 'What it cannot do is clean up the past. If your real address is already on a hundred lists, the junk keeps coming. For that, you need filters or a fresh primary address, and a disposable address only helps from now on.' },
      ],
    },
    {
      id: 'gmail-tricks',
      heading: 'Dots and Plus Signs: Gmail Tricks That Are Not Disposable',
      blocks: [
        { p: 'Gmail ignores dots in the name part of an address and everything after a plus sign. So j.o.h.n@gmail.com and john+shop@gmail.com both reach the account john@gmail.com. People sometimes call these "disposable" addresses, and that is not accurate, because every one of them lands in your real inbox and can be traced to it.' },
        { p: 'They are still useful, for a different job. A tagged address such as john+newsletter@gmail.com tells you who shared or sold your address when junk starts arriving with that tag. You can also set a filter to move or delete everything that carries it. Think of plus addressing as a label, and a disposable inbox as a wall. Use a label when you want to learn something, and a wall when you want to be left alone.' },
      ],
    },
    {
      id: 'who',
      heading: 'Who Gets the Most Out of a Disposable Address',
      tone: 'alt',
      blocks: [
        { p: 'Anyone who signs up for things they do not plan to keep benefits, but a few groups use it constantly. Students and researchers who read paywalled articles and download papers get through gated pages without joining ten mailing lists. Shoppers comparing prices avoid the marketing that follows a first visit. Small businesses and freelancers testing a competitor\'s product keep their identity out of the competitor\'s sales funnel.' },
        { p: 'Web developers and QA testers are the most intense users. They need a fresh, never-used address for each test and a way to see real mail arrive. If that is your job, the guide to [temp mail for verification codes](/tools/temp-mail/temp-mail-for-verification) has a section on testing your own flows, and the main [tool page](/tools/temp-mail) has a developer checklist.' },
      ],
    },
  ],
  faqHeading: 'Disposable Email Address: Common Questions',
  faqs: [
    {
      question: 'Is a disposable email address legal?',
      answer: 'Yes. Using one to avoid spam or to test your own website is ordinary and legal. What you do with it still has to be lawful, and breaking a site\'s rules, for example to abuse a free trial, can get you banned.',
    },
    {
      question: 'What is the difference between disposable and temporary email?',
      answer: 'In practice nothing. Both describe a short-lived inbox you use and discard. The words differ because different services picked different names, not because the product is different.',
    },
    {
      question: 'Can I send email from a disposable address?',
      answer: 'Not from ours. Nexora Temp Mail is receive only, which also keeps it from being used to send spam. If you need to reply to someone, use an alias or a normal mailbox.',
    },
    {
      question: 'Is a fake email generator the same as a disposable email generator?',
      answer: 'No. A fake generator only produces text that looks like an address, and nothing can be delivered to it. A disposable generator creates a real inbox that receives mail.',
    },
    {
      question: 'Will a disposable email address stop all spam?',
      answer: 'It stops spam reaching your real inbox from the sites you used it on. It does nothing about spam that is already coming to your real address, so use it before you sign up, not after.',
    },
    {
      question: 'Can I turn a disposable address into a permanent one?',
      answer: 'No. It lasts one hour, with one extra hour you can add once. If you want a lasting address, create an alias or a normal mailbox and move the account there.',
    },
    {
      question: 'Do I need to install anything?',
      answer: 'No. It runs in your browser. On supported browsers you can optionally install it as an app and turn on push alerts, but that is a convenience and not a requirement.',
    },
  ],
  related: ['temporary-email-address', 'is-temp-mail-safe', 'block-disposable-emails', '10-minute-mail-alternative'],
}
