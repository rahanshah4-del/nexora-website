/** Guide: burner email. Angle: the habit of burning an address (when, how, what to do before and after), not a definition list. */
export default {
  slug: 'burner-email',
  path: '/tools/temp-mail/burner-email',
  breadcrumbName: 'Burner email',
  seo: {
    title: 'Burner Email Address: What It Is and How to Use One',
    description:
      'A burner email address is one you make to use once and drop. See how it differs from an alias, when to burn it and how to get a free one in seconds.',
    keywords:
      'burner email, burner email address, free burner email, burner email generator, burner mail, what is a burner email, throwaway email address, burner email vs temp mail',
  },
  h1: 'Burner Email Address: What It Is and How to Use One',
  eyebrow: 'Temp mail guide',
  lead: 'A burner email is an address you create for one purpose and abandon afterwards. Nothing in it points back to you, so if the site leaks or sells it, only a dead inbox is exposed. A free temp mail inbox does the job in one click.',
  sections: [
    {
      id: 'what-it-is',
      heading: 'What a Burner Email Actually Is',
      blocks: [
        { p: 'A burner email is a habit more than a product. You make an address, use it for a single job, and stop caring about it. The name comes from burner phones, the cheap handsets people bought for one conversation and then threw away. The idea is the same: the address has no history, no link to your name, and no value to anyone once the job is done.' },
        { p: 'That job is nearly always small. A site wants an email before it will show you a price list. A forum wants a confirmation click before you can read a thread. A wifi portal wants a code. In each case the site does not need to know you for long, and you do not want it to know you at all. A burner gives it just enough to let you through.' },
        { p: 'What makes an address a burner is not the technology behind it. It is that you decided in advance it was disposable. The same inbox that is a burner for a coupon site would be a terrible choice for your bank. So before anything else, a burner needs a clear answer to one question: what happens if I never see this inbox again? If the honest answer is "nothing", you have found a good use for one.' },
      ],
    },
    {
      id: 'burner-or-temp',
      heading: 'Burner Email or Temp Mail: Is There a Difference?',
      tone: 'alt',
      blocks: [
        { p: 'In everyday use the two overlap heavily, and the words get swapped constantly. If you want a precise split, think of "temp mail" as describing the inbox (it expires by itself) and "burner" as describing your intent (you plan to abandon it). A temp mail address is the easiest way to run a burner, because the cleanup happens without you.' },
        {
          table: {
            caption: 'Burner email compared with nearby ideas',
            columns: ['', 'What it is', 'Who can link it to you', 'Typical lifespan'],
            rows: [
              ['Burner email (the habit)', 'Any address you create to drop after one use', 'Nobody, if it is not tied to your details', 'One task'],
              ['Temp mail inbox', 'A web inbox that deletes itself on a timer', 'Nobody, there is no account', 'An hour here, plus one extra hour'],
              ['Forwarding alias', 'A masked address that passes mail on to your real one', 'The alias provider, who holds your real address', 'Until you switch it off'],
              ['A second Gmail or Outlook account', 'A full mailbox you now have to look after', 'The provider, and often your phone number', 'Indefinite'],
            ],
          },
        },
        { p: 'The last two rows are the ones people mistake for burners. An alias is excellent for accounts you will keep, because mail still reaches you and you can mute a leaky address later. A spare webmail account is a lot of effort for a one-off job and usually asks for a phone number. For a true one-and-done signup, an inbox that disappears is the lighter choice.' },
      ],
    },
    {
      id: 'get-one',
      heading: 'How to Get a Free Burner Email in About Ten Seconds',
      blocks: [
        { p: 'Open the [Nexora Temp Mail](/tools/temp-mail) page and an address is already waiting. There is no form, no password and no verification step, which is the whole point. Here is the quick routine.' },
        {
          steps: [
            { title: 'Copy the address', text: 'Press the copy button next to the address. On a phone, the QR button lets you scan it into another device instead of retyping it.' },
            { title: 'Paste it into the site', text: 'Use it exactly as shown. If the form rejects it, the site probably blocks throwaway domains, and you should try a different approach rather than a different trick.' },
            { title: 'Keep the tab open', text: 'New mail appears by itself. The inbox looks for it every second right after you act, so you will see the message land and hear a short chime.' },
            { title: 'Take what you need', text: 'Codes are picked out of the message and shown with a copy button. Click the link or paste the code and you are through.' },
            { title: 'Walk away', text: 'Close the tab. When the timer runs out, the address and everything in it are erased. You have nothing to delete.' },
          ],
        },
        { p: 'If you want a name that is easier to read aloud, Customize lets you choose your own, from 3 to 32 characters. Random names are harder to guess, though, so keep the random one when the signup has any value at all.' },
      ],
    },
    {
      id: 'when-to-burn',
      heading: 'When Burning an Address Makes Sense',
      tone: 'alt',
      blocks: [
        { p: 'Burn an address when the account has no lasting value and the sender has no business knowing who you are. The more a signup looks like a toll booth, the better a candidate it is.' },
        {
          list: [
            'A free download, template or PDF behind an email wall.',
            'A coupon or first-order discount you will use once.',
            'Reading a forum thread or article that wants an "account" first.',
            'A free trial you intend to cancel before it renews.',
            'A wifi or event signup that sends a login code.',
            'A contest entry or survey where winning is unlikely.',
            'A group chat or club sheet where someone collects everyone\'s email.',
          ],
        },
        { p: 'Notice what is missing: anything involving money, identity, health, or a login you will use again. Those need an address you own, can recover, and will still have in a year. The next section is about the line between the two, and our guide to [using a temp mail for verification codes](/tools/temp-mail/temp-mail-for-verification) covers the most common burner job in detail.' },
      ],
    },
    {
      id: 'dont-burn',
      heading: 'When You Should Not Burn One',
      blocks: [
        { p: 'Do not burn an address for any account you might need to get back into. A burner has no recovery path. If the site asks to confirm a password reset, the message goes to an inbox that has already been erased, and the account is gone with it.' },
        { p: 'That rule has a few less obvious cases. Online shops you will buy from need an address for order updates and returns. Anything with a subscription needs a place for billing notices. Software with a licence key sends the key by email, and losing it can mean paying twice. Even a game account can matter more than it seems on day one, when you have not yet spent a year levelling it.' },
        { callout: 'A useful test: imagine the account six months from now. If you would be annoyed to lose it, use your real address, or one that forwards to it.' },
      ],
    },
    {
      id: 'rules',
      heading: 'Five Habits That Keep a Burner Clean',
      tone: 'alt',
      blocks: [
        { p: 'A burner only protects you if you do not wire it back to yourself. Most privacy leaks from throwaway addresses are not technical, they are careless.' },
        { h3: 'Use a different one each time' },
        { p: 'Reusing one burner across several sites lets those sites, or a data broker, see that the same person signed up in all of them. One address per signup keeps the trail broken. Opening a new address on this page costs nothing.' },
        { h3: 'Keep your name out of it' },
        { p: 'If you customise the name, do not use your real name, your usual handle or your birth year. Pick something unremarkable. A random address wins here, because it carries no information at all.' },
        { h3: 'Do not put personal details in the inbox' },
        { p: 'Anyone who knows an exact address can open its inbox, so never receive documents, invoices or personal messages there. Treat the inbox as a postbox on a public street.' },
        { h3: 'Copy first, expire second' },
        { p: 'Take the code, the file or the link before the timer ends. Once the address expires, there is no archive to go back to.' },
        { h3: 'Do not rely on it for a second visit' },
        { p: 'If a site might email you something later, such as a shipping update or a security notice, a burner will miss it. Decide at the start whether you need that, and if you do, pick another route.' },
      ],
    },
    {
      id: 'trace-leaks',
      heading: 'Using Burners to Find Out Who Leaks Your Address',
      blocks: [
        { p: 'A burner has a second use that people overlook: it tells you who sold you out. If every site gets its own address, then spam that arrives at one of them can only have come from that one. With a single shared address you never learn which signup was the leak.' },
        { p: 'On the free inbox this is mostly academic, since the address expires before any spam would arrive. It becomes practical with Premium, where addresses last. Name each one after the site, such as a short shop or forum label, and keep a note of which is which. When junk shows up at one of them, you know the source, and you can delete just that address without touching the others.' },
        { p: 'There is a trade-off. A readable, site-based name is easier to guess than a random one, so anything with real value should still sit behind a random name. Pick between convenience and secrecy for each address instead of using one rule for all of them.' },
      ],
    },
    {
      id: 'longer-burner',
      heading: 'A Burner That Lasts: Premium Addresses and Forwarding',
      blocks: [
        { p: 'Sometimes you want the privacy of a burner without the one-hour clock. Nexora Temp Mail Premium covers that middle ground. A Premium address stays alive for as long as your plan is paid, so it can sit behind an account you do plan to keep, while still not being your real mailbox.' },
        { p: 'You can hold up to 10 addresses at once, choose their names, receive attachments up to 5 MB, and set a Premium address to forward its mail to your own inbox. Forwarding needs a one-time check, a code sent to the destination, so nobody can aim mail at an address that is not theirs. Plans cost $3.99 a month or $29 a year.' },
        { p: 'This is a different tool from the free inbox. If the job is a one-off, stay with the free address and let it expire. If you want a handful of long-lived masks, one per service, Premium is the closer fit, and you can switch any of them off by deleting the address.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What a Burner Cannot Do',
      tone: 'alt',
      blocks: [
        { p: 'A burner is not an invisibility cloak. It hides your email address and little else. The site still sees your IP address, your browser and anything you type into the form, and your payment details, if any, tell it far more than an email ever would.' },
        { p: 'Some sites also refuse throwaway domains outright. Banks, government portals and a fair number of subscription services check signups against lists of known disposable providers. When that happens, no amount of cleverness with the address will help, and you will have to decide whether the site deserves your real one.' },
        { p: 'And this tool only receives. You cannot send mail from a temporary address, and there are no text messages, so a service that insists on a phone number is out of reach. Being clear about those limits will save you time, and the [temp mail safety guide](/tools/temp-mail/is-temp-mail-safe) goes through the risks in more depth.' },
      ],
    },
  ],
  faqs: [
    {
      question: 'What is a burner email address?',
      answer: 'It is an address you create for a single purpose and abandon afterwards, so nothing connects it to your real identity. A temporary inbox that deletes itself is the simplest way to have one.',
    },
    {
      question: 'Is a burner email legal to use?',
      answer: 'Yes. Using a separate address to keep your own inbox clean is ordinary privacy practice. It stops being fine when you use it to break a site\'s rules or to dodge the law, but that comes from what you do with it, not from the address.',
    },
    {
      question: 'Can I get a burner email without signing up?',
      answer: 'Yes. Open the Nexora Temp Mail page and an inbox is ready at once. There is no account, no password and no personal detail to give.',
    },
    {
      question: 'How long does a free burner address last here?',
      answer: 'One hour, with a single extra hour you can add. After that the inbox closes and its messages are erased.',
    },
    {
      question: 'Can I send email from a burner address?',
      answer: 'No. Free temporary addresses receive mail only. If you need to reply to someone, use an address you own.',
    },
    {
      question: 'Will a burner email work for every website?',
      answer: 'No. Most sites accept it, but some block known throwaway domains. If a site refuses the address, the choice is to skip the site or use a real address.',
    },
    {
      question: 'What happens if I lose access to a burner address?',
      answer: 'You lose whatever depended on it. That is the trade-off, and the reason to keep burners for accounts you can afford to lose.',
    },
    {
      question: 'Is a burner email the same as an alias?',
      answer: 'Not quite. An alias forwards to your real inbox and lasts until you turn it off. A burner is meant to be abandoned. Premium addresses with forwarding sit between the two. The full comparison is in [email alias vs temp mail](/tools/temp-mail/email-alias-vs-temp-mail).',
    },
  ],
  related: ['disposable-email-address', 'temp-mail-for-verification', 'is-temp-mail-safe', 'email-alias-vs-temp-mail'],
}
