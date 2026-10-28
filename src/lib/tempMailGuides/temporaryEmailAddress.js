/** Guide: temporary email address. Angle: what the address actually is and how mail reaches it. */
export default {
  slug: 'temporary-email-address',
  path: '/tools/temp-mail/temporary-email-address',
  breadcrumbName: 'Temporary email address',
  seo: {
    title: 'Temporary Email Address: How It Works and How to Get One',
    description:
      'A temporary email address is a real inbox that deletes itself. See how mail reaches it, how long it lasts, what it cannot do, and how to get one in seconds.',
    keywords:
      'temporary email address, temporary email addresses, email temporary, how to get a temporary email address, temporary email address free, what is a temporary email address, temp email address',
  },
  h1: 'Temporary Email Address: How It Works and How to Get One',
  eyebrow: 'Temp mail guide',
  lead: 'A temporary email address is a working inbox that exists for a short time and then deletes itself, along with every message in it. You use it where a site wants an email, and you keep your real address out of the exchange.',
  sections: [
    {
      id: 'what-it-is',
      heading: 'What a Temporary Email Address Really Is',
      blocks: [
        { p: 'It is an ordinary email address with an expiry date. Nothing about the address itself is fake: it has a name, an @ sign and a domain, and any mail server in the world can deliver to it. What makes it temporary is what happens afterwards. When the timer runs out, the mailbox is closed and the messages are erased, so there is nothing left to leak, sell or get breached.' },
        { p: 'People often mix up three different things, so it helps to separate them. A **temporary address** is a separate inbox that lives for minutes or hours. A **throwaway account** is a normal mailbox you made in a hurry and then ignored, which still sits on a company server for years. An **alias** is a forwarding address that sends mail to your real inbox until you switch it off. Only the first one disappears completely, and only the first one asks nothing of you at all.' },
        { p: 'You do not own a temporary address the way you own a Gmail account. You borrow it. That is the whole trade: no signup, no password, no recovery, and in return nothing lasts. If you understand that trade, you will use these addresses well. If you expect one to behave like a real account, you will be disappointed within the hour.' },
        { callout: 'Short version: a temporary email address is for things you only need once, such as a code, a download link or a form that will not let you in without an email.' },
      ],
    },
    {
      id: 'anatomy',
      heading: 'The Parts of the Address',
      tone: 'alt',
      blocks: [
        { p: 'Every email address has two halves, split by the @ sign. The part on the left is the local part, which names a mailbox. The part on the right is the domain, which tells the internet which server is in charge of that mailbox. In a temporary address both halves are chosen for you, although you can usually pick the left one.' },
        { code: 'x7k2mq9d  @  mail.example.com\n└─ local part      └─ domain (who receives the mail)' },
        { p: 'The local part on our tool is random by default, ten characters of letters and numbers, because a name nobody can guess keeps strangers out of your inbox. If you press Customize you can type your own name between 3 and 32 characters. That is handy for a demo or a screenshot. It is a bad idea for anything you care about, because a readable name is also a guessable one.' },
        { p: 'The domain is more interesting. Mail only reaches a domain if its DNS records say where to send it, and those records belong to whoever runs the service. Nexora Temp Mail runs on a mail domain of our own, pointed at our own receiving server. That matters later, when we talk about why some websites refuse temporary addresses.' },
      ],
    },
    {
      id: 'delivery',
      heading: 'How a Message Gets to Your Temporary Inbox',
      blocks: [
        { p: 'A message travels in four hops: the sender hands it to its own mail server, that server looks up where the domain wants mail delivered, the message is passed to the receiving server, and the receiving server stores it until your browser asks for it. The whole trip usually takes a second or two, and it is the same path a message to any other address takes.' },
        {
          steps: [
            { title: 'The site sends the email', text: 'You press "Sign up" and the website asks its mail provider to send a confirmation. The provider opens a connection to the domain in your address.' },
            { title: 'DNS points to the receiving server', text: 'The provider looks up the domain\'s MX record, which is a line of DNS that says "mail for this domain goes to that server". No MX record, no delivery.' },
            { title: 'Our server accepts and checks it', text: 'The receiving server takes the message, rejects mail for addresses that do not exist or have expired, and applies size and abuse limits.' },
            { title: 'It is stored against your address', text: 'The message is kept in the inbox tied to your address, with its attachments (up to 1 MB each) and the code, if there is one, pulled out of the text.' },
            { title: 'Your browser fetches it', text: 'The page asks for new mail every second for the first two minutes after you act, then more gently. The message appears, with a sound and a tab-title alert if you are in another tab.' },
          ],
        },
        { p: 'Because delivery is real, a temporary inbox also tells you something an offline mock cannot: whether a site\'s email actually leaves its server and arrives. People who build websites use that all the time, and we cover it in the [temp mail for verification codes](/tools/temp-mail/temp-mail-for-verification) guide.' },
      ],
    },
    {
      id: 'lifespan',
      heading: 'How Long a Temporary Email Address Lasts',
      tone: 'alt',
      blocks: [
        { p: 'On Nexora Temp Mail an address lasts one hour, and you can add one extra hour a single time, for two hours in total. After that the inbox closes and its mail is deleted. A visible timer shows what is left, so you are never surprised.' },
        { p: 'Why an hour and not ten minutes or a week? Ten minutes is too short for a slow sender, and plenty of services queue their mail for longer than that. A week is too long, because the longer an address exists, the more likely a stranger finds it or a site adds it to a list. An hour covers nearly any one-off task, and it is still brief enough that the address is gone before it can become clutter. If you are curious how this compares with timer-based services, see our [10 minute mail alternative](/tools/temp-mail/10-minute-mail-alternative) comparison.' },
        { h3: 'What happens when the timer ends' },
        { p: 'The address stops accepting mail, the stored messages and attachments are erased. If a site sends something to it afterwards, the mail is rejected. Nothing is forwarded anywhere, because there is nowhere to forward it.' },
        { h3: 'Can you get the same address back?' },
        { p: 'No, and you should not plan around it. A temporary address is built for a single sitting. If you need to be reachable at the same address next week, you want an alias or a real mailbox, not a temporary one.' },
      ],
    },
    {
      id: 'compare',
      heading: 'Temporary Address, Alias or Real Mailbox?',
      blocks: [
        { p: 'Pick a temporary address when you want no trace, an alias when you want to keep the relationship but hide your real address, and a real mailbox for anything you will need to recover later. Here is how the three differ in practice.' },
        {
          table: {
            caption: 'Three kinds of address compared',
            columns: ['', 'Temporary address', 'Alias or forwarder', 'Real mailbox'],
            rows: [
              ['Needs an account', 'No', 'Usually yes', 'Yes'],
              ['How long it lasts', 'One to two hours here', 'Until you delete it', 'Years'],
              ['Where mail ends up', 'A short-lived inbox, then erased', 'Forwarded to your real inbox', 'Stored with the provider'],
              ['Can you send from it', 'No, receive only', 'Sometimes', 'Yes'],
              ['Can you recover an account with it', 'No', 'Yes, while it exists', 'Yes'],
              ['Good for', 'One-off codes, downloads, tests', 'Shops and newsletters you may keep', 'Banking, work, anything important'],
            ],
          },
        },
        { p: 'Notice the row about recovery. Almost every "forgot password" flow works by emailing the address on file. If that address is gone, so is your way back in. That single fact decides most of the choices on this page.' },
      ],
    },
    {
      id: 'when-to-use',
      heading: 'When a Temporary Email Address Is the Right Tool',
      tone: 'alt',
      blocks: [
        { p: 'Use one when the thing you want is smaller than the relationship the site wants you to have. These are the situations where it earns its place.' },
        {
          list: [
            '**A one-time verification code.** You need to prove you are a person, once, to read an article or open a tool.',
            '**A free download or a PDF.** The site gates the file behind an email. You take the file and skip the drip campaign.',
            '**A free trial you only want to look at.** You want to see the dashboard, not receive eleven "we miss you" emails.',
            '**Checking your own site.** You built a signup form and you want to see the confirmation email the way a stranger would.',
            '**A public Wi-Fi moment.** You are about to type an email on a screen you do not fully trust, and you would rather it not be your real one.',
            '**A demo or a recording.** You are filming a tutorial and do not want your personal address on screen.',
          ],
        },
        { p: 'Developers lean on the fourth item more than anyone, and it deserves its own detail: a clean, never-used address per test run is the quickest way to catch broken verification emails before customers do. The main tool page has a [full developer section](/tools/temp-mail) with steps and a checklist.' },
      ],
    },
    {
      id: 'when-not',
      heading: 'When You Should Not Use One',
      blocks: [
        { p: 'Do not use a temporary email address for anything you will need again. That rules out banking, tax, government portals, work accounts, domain registrations, app stores and every service that will ask you to confirm a password reset later. The risk is not that the address is unsafe at the moment of use. The risk is that it will not exist when you come back.' },
        { p: 'There is also a privacy point that surprises people. Whoever has the exact address can open its inbox until it closes. Random names make that very unlikely, but it is a different security model from a password-protected mailbox, so a temporary address is wrong for anything private. Our [safety guide](/tools/temp-mail/is-temp-mail-safe) goes through the risks one by one.' },
        { p: 'Finally, some websites simply do not accept them. Many sites keep a list of known disposable domains and refuse them on sight, usually to stop fake signups and trial abuse. If a site rejects your temporary address, that is the site\'s choice. Use a different address there, such as your regular one, or skip the service.' },
      ],
    },
    {
      id: 'get-one',
      heading: 'How to Get a Temporary Email Address in Three Steps',
      tone: 'alt',
      blocks: [
        { p: 'Open the [Nexora Temp Mail tool](/tools/temp-mail) and an address is already waiting for you. There is nothing to fill in.' },
        {
          steps: [
            { title: 'Copy the address', text: 'Press the copy button next to it. If you want a name you can read out loud, press Customize, type 3 to 32 characters and create it. If the name is taken or reserved you will be asked for another.' },
            { title: 'Paste it where the site asks for email', text: 'Use it in the signup or download form. Leave the tab open. You will see new mail arrive by itself, so there is no refresh button to hunt for.' },
            { title: 'Read the message and copy the code', text: 'Open the message. One-time codes are found for you and shown above the text with a copy button. Click the verification link, finish what you came to do, and close the tab when you are done.' },
          ],
        },
        { p: 'If you need more time, add one extra hour from the timer. If you want a clean slate, press New address and you get a fresh inbox with nothing in it.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What a Temporary Address Cannot Do',
      blocks: [
        { p: 'Be clear about the limits before you rely on one. It cannot send mail, because temporary addresses on our tool are receive only. It cannot receive text messages, so a service that only sends codes by SMS is out of reach. It cannot be recovered after expiry. And it cannot get past a site that has blocked disposable domains.' },
        { p: 'It also cannot make you anonymous. It hides your address from the site, which is useful, but your IP address, browser and everything else you do on that site are still visible to it. On our side the only thing kept for abuse control is a salted, hashed IP value, never the plain address. Think of a temporary address as removing one identifier from the picture, not all of them.' },
      ],
    },

    {
      id: 'site-sees',
      heading: 'What the Website Sees When You Use One',
      tone: 'alt',
      blocks: [
        { p: 'The site sees an address on an unfamiliar domain, and nothing else about your email life. It does not see your real name, your other addresses or whether you own a mailbox elsewhere. That is the part a temporary address protects.' },
        { p: 'What it still sees is everything the browser normally tells a website: your IP address, your device and browser type, the time you signed up and what you did after. A temporary address does not touch any of that. If a site wanted to link two visits together, it could do so from those details alone, so treat the address as one layer of privacy and not as a cloak.' },
        { p: 'A site may also recognise the domain. Sites that maintain lists of disposable domains will spot ours if it is on theirs, and respond by refusing the address or by limiting what the account can do. Neither is a sign that something is wrong with your inbox. It is simply the site\'s policy at work.' },
      ],
    },
    {
      id: 'example',
      heading: 'A Worked Example: From Signup Form to Code',
      blocks: [
        { p: 'Say you want to read a long article behind a "sign up to continue" wall. You open the temp mail tab, and an address like k4tq9xm2we is already there with a timer showing one hour. You copy it and paste it into the article site\'s form. You press Continue.' },
        { p: 'Back in the inbox tab, a message arrives within about five seconds. Its subject says "Confirm your email", and the body has a button. You click the button, the article opens, and you read it. The whole thing took under two minutes. Over the next few days the site mails that address twice with "recommended for you" messages. Both are rejected after the address expires, and you never see them. That is the outcome a temporary address is for.' },
        { p: 'Now the same story with a mistake. You paste the address, switch to another tab for ten minutes and forget the inbox. The mail arrives, the sound plays in a tab you cannot hear, and you come back to a form still waiting. Nothing is lost, because the address lasts an hour, but if you had waited two hours the inbox would be gone and you would start again with a new address. The lesson is simply to keep the inbox tab where you can see it.' },
      ],
    },
    {
      id: 'mistakes',
      heading: 'Mistakes That Make Temporary Addresses Fail',
      tone: 'alt',
      blocks: [
        { p: 'Most failures trace back to a short list of avoidable habits. Fix these and temporary addresses will work far more often than people expect.' },
        {
          list: [
            '**Typing the address by hand.** A single wrong character sends the message elsewhere. Always use the copy button.',
            '**Reusing yesterday\'s address.** It has expired. Check the timer or get a new one.',
            '**Signing up before opening the inbox.** If you do it in the other order you can miss the first seconds, and some alerts depend on the page being loaded.',
            '**Assuming it will work everywhere.** Some sites block disposable domains. The block happens before any email is sent, so waiting longer does not help.',
            '**Using it for an account that matters.** This is the costly one, and the reason the earlier section on recovery is worth rereading.',
          ],
        },
      ],
    },
  ],
  faqHeading: 'Temporary Email Address: Common Questions',
  faqs: [
    {
      question: 'Is a temporary email address a real email address?',
      answer: 'Yes. It has a normal name and domain and receives mail from any sender, exactly like Gmail or Outlook would. The difference is that it is closed and erased after a short time instead of being kept for years.',
    },
    {
      question: 'How do I get a temporary email address for free?',
      answer: 'Open Nexora Temp Mail. An address is created for you as the page loads, with no signup and no payment. Copy it, use it, and it deletes itself when the timer ends.',
    },
    {
      question: 'Can I use the same temporary email address again?',
      answer: 'Not after it expires. The inbox is closed and the mail is erased. You can add one extra hour once while it is active, but you cannot reopen an expired address, so use something else if you need a lasting address.',
    },
    {
      question: 'Do I need an account or a password?',
      answer: 'No. There is nothing to register and nothing to remember. That also means there is no recovery, so anything you use it for should be something you can afford to lose.',
    },
    {
      question: 'Can two people see the same temporary inbox?',
      answer: 'Whoever has the exact address can open the inbox until it expires. Random names are hard to guess, though you should still keep one out of public view and away from private mail.',
    },
    {
      question: 'Why does a site say my temporary email is not valid?',
      answer: 'It probably keeps a list of disposable domains and blocks them. Some do it to stop repeat free trials, others to cut fake signups. Try your regular email on that site instead.',
    },
    {
      question: 'Is there a difference between "email temporary" and "temporary email"?',
      answer: 'No. People type both. They mean the same service: a short-lived inbox that you use once and let go.',
    },
    {
      question: 'Can I use a temporary email address on my phone?',
      answer: 'Yes. The tool works in a mobile browser, and on supported browsers you can install it as an app and turn on push alerts, so a code does not get missed while you are in another app.',
    },
  ],
  related: ['disposable-email-address', 'temp-mail-for-verification', '10-minute-mail-alternative', 'is-temp-mail-safe'],
}
