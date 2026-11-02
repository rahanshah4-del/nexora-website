/**
 * Additional long-form sections, inserted before the closing "Read Next" section of each
 * platform article (see helpCenterData.js). Same accuracy rule as helpPlatformExtras.js.
 */

export const PLATFORM_MORE_SECTIONS = {
  'inventory-management': [
    {
      id: 'pricing-margin',
      heading: 'Pricing, Margin and Why Cost Price Matters',
      blocks: [
        { p: 'Selling price tells you what comes in. Cost price tells you what is left. Many small businesses track the first carefully and guess the second. When you enter cost price for every product, Nexora can show margin per item, and that changes how you look at the shelf.' },
        { p: 'A simple example: a product that sells ten units a day at a small margin may earn less over a month than a slower product with a healthy margin. Product Profitability puts both side by side so you can decide what deserves more shelf space, a better supplier price or a small price rise.' },
        { p: 'Cost prices also move. When a supplier raises a price, update the cost on the next purchase so your margins stay honest instead of quietly shrinking.' },
      ],
    },
    {
      id: 'seasonal-planning',
      heading: 'Planning Stock for Busy Seasons',
      blocks: [
        { p: 'Every business has peaks. Retail sees festival and wedding seasons, schools see term starts and stationery rush, restaurants see weekends and holidays, pharmacies see seasonal illness. The Stock Movement report from last year is the best forecast you have.' },
        {
          steps: [
            { title: 'Look back', text: 'Run Stock Movement for the same period last year and note which products moved fastest.' },
            { title: 'Raise alerts early', text: 'Increase minimum stock alerts a few weeks before the peak so low stock warnings arrive in time.' },
            { title: 'Order in two rounds', text: 'Place a first order for the expected demand and keep a smaller second order ready for fast sellers.' },
            { title: 'Reset afterwards', text: 'After the peak, lower alerts and review leftover stock so money is not locked up on the shelf.' },
          ],
        },
      ],
    },
  ],

  'team-permissions': [
    {
      id: 'multi-business-access',
      heading: 'Access When You Run More Than One Business Type',
      blocks: [
        { p: 'Some owners run a restaurant and a retail counter, or a school with a transport service, under one account. Nexora keeps permissions aware of the business type, so a person can have one level of access in one module group and a different level in another.' },
        { p: 'In practice this means a cashier at your restaurant counter does not automatically see your school fee screens, and your school accountant does not automatically see restaurant takings. Check each member’s permissions after you enable a new module, so you know exactly who can open it.' },
      ],
    },
    {
      id: 'approval-example',
      heading: 'A Worked Example: Expense Approval',
      blocks: [
        { p: 'Here is how roles, approvals and logs work together in a normal week at a small shop.' },
        {
          steps: [
            { title: 'A manager records an expense', text: 'The shop buys cleaning supplies and the manager enters the expense with the amount and payment method.' },
            { title: 'It waits for approval', text: 'Because expenses can require sign-off, the entry appears in the Approval Center for someone with the approve permission.' },
            { title: 'The accountant or owner reviews it', text: 'They check the amount against the receipt and approve or reject it.' },
            { title: 'The activity log keeps the trail', text: 'The log shows who entered it, who approved it and when. Months later, the question "who agreed to this?" has a clear answer.' },
          ],
        },
        { p: 'Nothing about this slows the manager down. They record the expense in the moment, and the owner reviews it at a convenient time.' },
      ],
    },
    {
      id: 'offboarding',
      heading: 'Offboarding Checklist When Someone Leaves',
      blocks: [
        {
          steps: [
            { title: 'Remove access the same day', text: 'Open Team Management and remove or disable the member. Do this before the farewell conversation, not after.' },
            { title: 'Check what they owned', text: 'Look for open tasks, follow-ups or approvals assigned to them and reassign them.' },
            { title: 'Review recent activity', text: 'Filter the Activity Logs by that user for the last week to be sure nothing unusual happened.' },
            { title: 'Change shared secrets', text: 'If they knew any shared passwords, such as a Wi-Fi or a payment terminal, change them.' },
            { title: 'Keep the history', text: 'Do not worry about deleted staff leaving gaps. Records they created stay in your workspace.' },
          ],
        },
      ],
    },
    {
      id: 'permission-mistakes',
      heading: 'Mistakes to Avoid',
      blocks: [
        {
          list: [
            { title: 'Making everyone an admin', text: 'It is fast on day one and costly later. Admins can delete, so give that role to very few people.' },
            { title: 'Sharing the owner login', text: 'It destroys accountability. Create a login per person.' },
            { title: 'Forgetting export rights', text: 'Delete is not the only risk. A full customer list can leave the business through one export click.' },
            { title: 'Never reviewing roles', text: 'Staff change jobs. Review the list each quarter.' },
            { title: 'Trusting without testing', text: 'After setting up a role, log in as that role once and confirm what it can see.' },
          ],
        },
      ],
    },
    {
      id: 'growing-team-tips',
      heading: 'Growing From Two People to Twenty',
      blocks: [
        { p: 'Access rules that work for a two-person shop will not survive a team of twenty. The good news is that you can grow into structure gradually. Begin with the presets. When you notice the same adjustments again and again, such as always switching off delete for managers, write that decision down so every new hire is set up the same way.' },
        { p: 'Pair every new role with a short written note: what this person may do, what they should ask about first, and who approves their work. A one-page note removes most of the confusion that creates permission requests, and it makes training a new colleague much faster. When a plan limit is reached, upgrade the plan or review who really needs a login, because seats are tied to the plan you choose.' },
        { p: 'Finally, treat permissions as part of onboarding rather than an afterthought. A new cashier who logs in on day one to a screen that shows only billing is more confident than one who is told "don’t touch that" about a dozen buttons.' },
      ],
    },
  ],

  reports: [
    {
      id: 'read-profit-loss',
      heading: 'How to Read a Profit & Loss Report',
      blocks: [
        { p: 'The Profit & Loss report is the most important page in your accounts, and it is simpler than it looks. It adds up the money that came in from sales and other income, subtracts approved expenses for the same period, and shows what is left.' },
        {
          steps: [
            { title: 'Start with income', text: 'See the total and the sources: invoices paid, payments received and point-of-sale sales.' },
            { title: 'Look at expenses by category', text: 'The biggest categories are where small savings add up. Rent, salaries and stock purchases usually lead.' },
            { title: 'Read the bottom line', text: 'A positive figure is profit for the period. A negative figure is a loss and a prompt to look back at the categories above.' },
            { title: 'Compare with the previous period', text: 'Run the same report for last month. Look for what changed, not just the final number.' },
          ],
        },
        { callout: 'Only approved expenses appear in expense totals. If your profit looks too good, check the Approval Center for expenses still waiting.' },
      ],
    },
    {
      id: 'sales-patterns',
      heading: 'Finding Patterns in Sales Reports',
      blocks: [
        { p: 'Sales reports answer questions that feel like gut instinct until you look at the data.' },
        {
          list: [
            { title: 'Which days are strongest?', text: 'Daily Sales across a month shows your weekly rhythm. Staff the busy days and plan promotions for the quiet ones.' },
            { title: 'Which products drive revenue?', text: 'Sales by Product shows the few items that make most of your money. Never let those run out.' },
            { title: 'Who are your best customers?', text: 'Top Customers and Sales by Customer show who deserves a thank-you, a discount or a phone call.' },
            { title: 'Which staff sell the most?', text: 'Sales by Staff helps you reward good performance and coach where needed.' },
            { title: 'How do customers pay?', text: 'Sales by Payment Method shows the cash, card and wallet split, which helps with cash planning.' },
          ],
        },
      ],
    },
    {
      id: 'ledgers-dues',
      heading: 'Customer and Supplier Ledgers: Managing Money Owed',
      blocks: [
        { p: 'Cash flow problems are often really collection problems. The Customer Ledger and Customer Balance reports show who owes you money and how much, and the Supplier Due and Supplier Statement reports show what you owe. A weekly ten-minute look keeps both sides under control.' },
        {
          list: [
            { title: 'Chase the oldest balances first', text: 'Sort by balance and contact the largest or oldest dues personally.' },
            { title: 'Send statements', text: 'A printed or PDF statement makes a payment conversation factual and polite.' },
            { title: 'Plan supplier payments', text: 'Supplier Due lets you prioritise who to pay first without hurting important relationships.' },
          ],
        },
      ],
    },
    {
      id: 'month-end',
      heading: 'A Month-End Reporting Checklist',
      blocks: [
        {
          steps: [
            { title: 'Clear pending approvals', text: 'Approve or reject waiting expenses and payments so totals are complete.' },
            { title: 'Reconcile cash and bank', text: 'Compare Cash Balance and Bank Balance with the real drawer and bank statement.' },
            { title: 'Run Profit & Loss', text: 'Export the PDF for your records and Excel for your accountant.' },
            { title: 'Check inventory value', text: 'Run Inventory Value and compare with last month’s figure.' },
            { title: 'Review dues', text: 'Export Customer Balance and Supplier Due and plan collections and payments.' },
            { title: 'Save the pack', text: 'Keep all exports in one folder named by month so next year’s comparison is easy.' },
          ],
        },
      ],
    },
    {
      id: 'school-fleet-reports',
      heading: 'Reports for Schools and Fleet Businesses',
      blocks: [
        { p: 'Reports are not only for shops. For schools, Fee Collection and Outstanding Fees show how much has been collected and who still owes, while Attendance and Student Summary support class management. For fleet and rental operators, Trip Revenue, Vehicle Profit, Fuel and Driver Performance show which vehicles and drivers earn their keep.' },
        {
          links: [
            { to: '/school-erp', label: 'School ERP' },
            { to: '/transport-fleet', label: 'Fleet and rental software' },
          ],
        },
      ],
    },
    {
      id: 'decisions-from-reports',
      heading: 'Five Decisions Reports Make Easier',
      blocks: [
        {
          list: [
            { title: 'What to reorder', text: 'Low Stock and Stock Summary turn "I think we are low" into a clear list with quantities.' },
            { title: 'What to promote', text: 'Product Profitability shows which items earn the most margin and deserve the front shelf or the menu highlight.' },
            { title: 'Who to chase', text: 'Customer Balance ranks dues so your follow-up time goes to the biggest amounts first.' },
            { title: 'Whether to hire', text: 'Peak days and staff sales show whether you are stretched or just busy on a few days.' },
            { title: 'Whether prices need to change', text: 'Cost against selling price over time shows when supplier increases have eaten your margin.' },
          ],
        },
        { p: 'Reports are valuable only when they lead to action. After each review, write down one decision, do it, and check the next report to see whether it worked.' },
      ],
    },
  ],

  'email-marketing': [
    {
      id: 'channel-comparison',
      heading: 'Email, WhatsApp and SMS: Choosing the Right Channel',
      blocks: [
        { p: 'No channel wins every time. The best choice depends on the message and the audience.' },
        {
          list: [
            { title: 'Email', text: 'Best for longer content, receipts, newsletters and anything people may want to keep or search for later. Slower to be read, but low cost.' },
            { title: 'WhatsApp', text: 'Best for quick, personal messages, reminders and conversation. Read within minutes, but it needs the person’s consent and a short, relevant message.', to: '/whatsapp-crm' },
            { title: 'SMS', text: 'Works without internet and suits one-line alerts such as an OTP or a due date. Limited length and usually a per-message cost.' },
            { title: 'In-app notifications', text: 'Best for your own team and for customers using a portal.' },
          ],
        },
        { p: 'Many businesses use two together, for example WhatsApp for a short reminder and email for the full detail.' },
      ],
    },
    {
      id: 'anatomy-email',
      heading: 'The Anatomy of a Good Marketing Email',
      blocks: [
        {
          steps: [
            { title: 'Sender name', text: 'Use your business name or a real person’s name. People open email from names they recognise.' },
            { title: 'Subject and preview', text: 'Together they have a few seconds to earn the open. Be clear about the benefit.' },
            { title: 'Opening line', text: 'Say why you are writing in one sentence.' },
            { title: 'The body', text: 'Two or three short paragraphs or a few bullets. Include a photo only when it helps.' },
            { title: 'One call to action', text: 'A single button such as "Visit the shop", "Book a demo" or "Pay fees".' },
            { title: 'Footer', text: 'Your business name, address or phone and a visible unsubscribe link.' },
          ],
        },
      ],
    },
    {
      id: 'campaign-calendar',
      heading: 'A Simple Yearly Campaign Calendar',
      blocks: [
        { p: 'Planning twelve months of themes in one sitting makes sending easy. Adapt the calendar to your own business and local events.' },
        {
          list: [
            { title: 'Start of year', text: 'A welcome-back or new-season message with your best offer or updated timetable.' },
            { title: 'Spring and summer', text: 'Seasonal products, camps, short courses or outdoor menus.' },
            { title: 'Religious and national festivals', text: 'Greetings with a modest offer or store hours. Keep wishes sincere rather than salesy.' },
            { title: 'Back-to-school and exam periods', text: 'Stationery offers, fee reminders and schedules.' },
            { title: 'Year end', text: 'A thank-you note, a loyalty summary or an invitation to the next year’s plans.' },
          ],
        },
      ],
    },
    {
      id: 'deliverability',
      heading: 'Deliverability: Making Sure Emails Reach the Inbox',
      blocks: [
        { p: 'A beautiful email is useless in the spam folder. Inbox providers judge senders on reputation, so a few basics protect you.' },
        {
          list: [
            { title: 'Send from a domain you own', text: 'A business address on your own domain looks more trustworthy than a free mailbox.' },
            { title: 'Authenticate the domain', text: 'Your domain provider can set up SPF, DKIM and DMARC records that prove emails really come from you.' },
            { title: 'Keep the list clean', text: 'Remove bounces and people who never open after several months.' },
            { title: 'Avoid spammy wording', text: 'Excess capitals, many exclamation marks and misleading subjects raise spam scores.' },
            { title: 'Warm up gradually', text: 'Start with small sends and increase as engagement stays healthy.' },
          ],
        },
      ],
    },
    {
      id: 'privacy-consent',
      heading: 'Privacy, Consent and Trust',
      blocks: [
        { p: 'Customers share their email because they trust you. Protect that trust. Use contacts only for what you told them, give a simple way to leave, and do not share lists with third parties. Rules differ by country, so follow the privacy and anti-spam laws where your customers live.' },
        { p: 'Inside Nexora, workspace data is kept separate for each workspace and access is controlled by roles. Only team members you authorise can open customer lists.' },
        { links: [{ to: '/privacy-policy', label: 'Privacy policy' }] },
      ],
    },
    {
      id: 'prepare-now',
      heading: 'Prepare Now: A Checklist Before Email Campaigns Open',
      blocks: [
        {
          steps: [
            { title: 'Clean your contact data', text: 'Fix spelling in names and emails inside your CRM and customer records.' },
            { title: 'Decide your segments', text: 'List the two or three groups you would message differently, such as customers, leads and parents.' },
            { title: 'Write a welcome email', text: 'Draft a short message to greet new subscribers and explain what to expect.' },
            { title: 'Pick a sender name', text: 'Choose the name and reply-to address people will see.' },
            { title: 'Practise on WhatsApp', text: 'Use broadcasts and loyalty campaigns now to learn what your audience responds to.' },
          ],
        },
      ],
    },
    {
      id: 'measure-improve',
      heading: 'Testing and Improving Over Time',
      blocks: [
        { p: 'The first campaign is a starting point, not a verdict. Change one thing at a time so you know what made the difference. Try two subject lines on two halves of the list, or two send times in alternate weeks, and compare click rates rather than opens alone.' },
        { p: 'Keep a simple log: date, audience, subject, result and what you learned. After a few months you will see patterns, for example that offers on Thursday work better than Monday, or that short messages beat long ones. This habit is more valuable than any template.' },
        { p: 'Finally, read the replies. People often answer marketing emails with questions, and those questions are the best source of content ideas for your next message, your FAQ page and your product descriptions.' },
      ],
    },
  ],
}
