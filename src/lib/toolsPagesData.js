/**
 * Content of the free tools pages (/tools/ and the tool landing pages).
 * Imported by the React pages (src/pages/public/tools/*) and, for titles, meta
 * descriptions, FAQ and schema, by src/lib/seoMetadata.js, src/lib/toolPages.js
 * and scripts/prerender.mjs — one source, so the server HTML, the hydrated page
 * and the JSON-LD can never disagree.
 *
 * Rules this copy follows (Step 7 brief): every claim is true of the Docs
 * Studio code in src/tools/docs-studio; no user counts, ratings or awards;
 * tax/legal statements stay general; each page has its own purpose, examples
 * and FAQ (tests/tools-pages.test.mjs checks that no paragraph or question
 * repeats across pages).
 *
 * Inline links use [label](/path/) and are rendered as internal links.
 *
 * Block types: { p }, { h3 }, { steps: [{ title, text }] },
 * { list: [string | { title, text }] }, { table: { caption, columns, rows } },
 * { callout }, { diagram: 'safe-area' }.
 */

/** Shown as "Last updated" on every tools page. Bump when the copy changes. */
export const TOOLS_LAST_UPDATED = '2026-10-24'

export const TRUST_CHIPS = Object.freeze(['No signup', 'No watermark', 'Your data stays on your device'])

/** The hub's tool cards and the homepage section's cards (benefit lines). */
export const TOOL_CARDS = Object.freeze([
  {
    key: 'invoice',
    path: '/tools/invoice-generator',
    title: 'Free Invoice Generator',
    text: 'A PDF or Excel invoice in three steps, with taxes, discounts, partial payments and 160+ currencies.',
  },
  {
    key: 'gst',
    path: '/tools/gst-invoice-generator',
    title: 'GST Invoice Generator',
    text: 'A GST tax invoice with GSTIN, CGST, SGST or IGST, lakh and crore amounts and a UPI QR code.',
  },
  {
    key: 'contractor',
    path: '/tools/contractor-invoice-generator',
    title: 'Contractor Invoice Generator',
    text: 'Bill hours and materials, add sales tax to the lines that need it, and download a PDF or Excel file.',
  },
  {
    key: 'cis',
    path: '/tools/cis-invoice-generator',
    title: 'CIS Invoice Generator',
    text: 'UK invoices in pounds with VAT and the CIS deduction shown before you send.',
  },
  {
    key: 'uae',
    path: '/tools/uae-vat-invoice-generator',
    title: 'UAE VAT Invoice Generator',
    text: 'A Tax Invoice in dirhams with your TRN, 5% VAT and IBAN details for UAE businesses.',
  },
  {
    key: 'thermal',
    path: '/tools/thermal-receipt-generator',
    title: 'Thermal Receipt Generator',
    text: 'Till-style receipts sized for 58mm and 80mm rolls, printed straight from your browser.',
  },
  {
    key: 'letterhead',
    path: '/tools/invoice-on-letterhead',
    title: 'Invoice on Letterhead',
    text: 'Upload your letterhead as PNG, JPG or PDF and the invoice fits inside its margins.',
  },
  {
    key: 'quotation',
    path: '/tools/quotation-generator',
    title: 'Quotation Generator',
    text: 'Quotes with a validity date and deposit that turn into an invoice in one click.',
  },
  {
    key: 'paystub',
    path: '/tools/pay-stub-generator',
    title: 'Pay Stub Generator',
    text: 'Payslips with overtime, deductions, year-to-date totals and net pay in words, in any currency.',
  },
  {
    key: 'pakistan',
    path: '/tools/pakistan-invoice-generator',
    title: 'Pakistan Invoice Generator',
    text: 'A sales tax invoice in rupees with NTN, STRN and totals in words with lakh and crore.',
  },
  {
    key: 'proforma',
    path: '/tools/proforma-invoice-generator',
    title: 'Proforma Invoice Generator',
    text: 'A priced preview of the sale with a validity date and deposit that converts into an invoice.',
  },
  {
    key: 'purchaseorder',
    path: '/tools/purchase-order-generator',
    title: 'Purchase Order Generator',
    text: 'A numbered order for your supplier with items, delivery date, ship-to address and terms.',
  },
  {
    key: 'deliverynote',
    path: '/tools/delivery-note-generator',
    title: 'Delivery Note Generator',
    text: 'A numbered note that travels with the goods, listing items and quantities without prices.',
  },
])

const hub = {
  path: '/tools',
  breadcrumbName: 'Free Tools',
  seo: {
    title: 'Free Business Tools — No Signup, 100% Private | Nexora',
    description: 'Free business tools: invoice, quotation, receipt and pay stub generators, plus free temp mail (temporary email). No signup, no watermark, 100% private.',
    keywords: 'free business tools, free invoice and receipt tools, no signup business tools, temp mail, temporary email generator, disposable email address, free temporary email',
  },
  eyebrow: 'Nexora Free Tools',
  h1: 'Free Business Tools — No Signup, 100% Private',
  valueProp: 'Invoices, quotes and receipts in minutes — made in your browser, kept on your device.',
  lead: 'These free business tools create the documents a small business sends every week: invoices, quotations, POS receipts, pay stubs and invoices printed on your own letterhead. There is no account to create and no watermark on the result. What you type is saved in your own browser rather than on our servers, so you can close the tab and carry on later on the same device.',
  cardsHeading: 'Free Invoice, Receipt and Pay Stub Tools',
  cardsIntro: 'Eleven of them open the same document editor with a different starting point, and the pay stub generator has an editor of its own. Pick the one that matches the document in front of you; in the document editor you can switch document type later without losing anything.',
  sections: [
    {
      id: 'why-different',
      heading: 'Why Our Tools Are Different',
      tone: 'alt',
      blocks: [
        { p: 'Most online invoice makers are the front end of someone else’s database. You sign up, your clients and amounts are stored on the provider’s servers, and the free plan ends in a watermark or an upgrade screen. These tools are built the other way round, and it is worth being precise about what that means.' },
        {
          list: [
            { title: 'The editor runs in your browser.', text: 'The page downloads the app once. After that, typing, calculating totals and drawing the preview all happen on your own computer or phone.' },
            { title: 'Documents are stored on your device.', text: 'Your business details, saved clients, logos, letterheads, documents and pay stub drafts live in your browser’s own storage for this site. We hold no copy, which also means we cannot recover them for you — use Export JSON backup when you want a file to keep.' },
            { title: 'Files are generated locally.', text: 'PDF and Excel downloads are built on the device. Nothing is uploaded to be converted and sent back.' },
            { title: 'Sharing is an action you take.', text: 'WhatsApp and email open your own app with a message you can edit first. A share link carries the document in the part of the address after the # sign, which browsers do not send to a web server — but anyone you give the link to can open it, so treat it like the document itself.' },
          ],
        },
        { p: 'What the page itself loads: the site, its web fonts and our standard page analytics, which count visits to the page. Clicks and typing inside the editor are excluded from that analytics. And because storage is local, clearing your browser’s site data deletes the documents saved there as well.' },
      ],
    },
    {
      id: 'which-tool',
      heading: 'Which Tool Do You Need?',
      blocks: [
        { p: 'The document you need depends on where you are in the sale, or in the pay cycle. Five quick questions cover almost every case:' },
        {
          list: [
            { title: 'The client has not agreed a price yet → a quotation.', text: 'It states what you will do, for how much, and how long the offer stands. Use the [quotation generator](/tools/quotation-generator/).' },
            { title: 'The work is delivered and you want to be paid → an invoice.', text: 'It carries a due date, payment terms and the balance owed. Use the [free invoice generator](/tools/invoice-generator/).' },
            { title: 'The customer has just paid at a counter → a receipt.', text: 'Short, printed on a roll and handed over on the spot. Use the [thermal receipt generator](/tools/thermal-receipt-generator/).' },
            { title: 'You already own branded stationery → letterhead mode.', text: 'Any page document can sit inside your own letterhead design. Start from [invoice on letterhead](/tools/invoice-on-letterhead/).' },
            { title: 'You are paying an employee → a pay stub.', text: 'It shows earnings, deductions and net pay for one pay period. Use the [free pay stub generator](/tools/pay-stub-generator/).' },
          ],
        },
        { p: 'Because every tool shares one editor, the first choice never locks you in. An accepted quotation converts into an invoice, an invoice can produce a receipt, delivery note or credit note, and the document type can be changed in step two of the wizard.' },
      ],
    },
    {
      id: 'temp-mail',
      heading: 'Free Temp Mail: Temporary Email Address in One Click',
      tone: 'alt',
      blocks: [
        { p: 'Not every free tool is about paperwork. [Nexora Temp Mail](/tools/temp-mail/) is a free temporary email generator: it gives you a real disposable email address the moment the page opens, with no signup. Use it when a website wants an email for a verification code (OTP), a free trial or a download, and you would rather keep your real inbox free of promotions.' },
        {
          list: [
            { title: 'A 10 minute mail alternative that lasts longer.', text: 'An address stays open for one hour, and you can add one extra hour. That is enough time to finish a signup and copy the code.' },
            { title: 'Verification codes are found for you.', text: 'One-time codes are detected and shown above the message with a copy button.' },
            { title: 'Built for testers too.', text: 'Developers and QA use it to check signup, password-reset and notification emails on a real address, as a temp mail alternative to a fake email generator that cannot receive anything.' },
            { title: 'Erased automatically.', text: 'When the timer ends, the inbox closes and its mail is deleted. Temporary addresses are receive-only.' },
          ],
        },
        { p: 'Open the [free temp mail generator](/tools/temp-mail/) in a new tab whenever a form asks for an email you do not want to share.' },
      ],
    },
  ],
  faqHeading: 'Free Business Tools: Frequently Asked Questions',
  faqs: [
    { question: 'Are these business tools really free?', answer: 'Yes. There is no trial period, no paid tier of the tools and no watermark added to your documents. Nexora Solution sells separate business software (POS, CRM and ERP); the free tools stand on their own and do not require it.' },
    { question: 'Is there a free temporary email (temp mail) tool?', answer: 'Yes. Nexora Temp Mail creates a free disposable email address in one click, with no signup. It receives mail and shows verification codes, lasts one hour (plus one optional extra hour) and erases the inbox automatically. Open it at /tools/temp-mail/.' },
    { question: 'Do I need to create an account?', answer: 'No. They are no signup business tools by design: there is no login, and no email address is asked for. Open a tool and start typing.' },
    { question: 'Where are my documents saved?', answer: 'In your browser’s storage on the device you are using. They do not sync to other devices or browsers. To move them, use Export JSON backup in the editor’s menu to save a file, then Import JSON on the other device.' },
    { question: 'Can I use the tools on my phone?', answer: 'Yes. The editor adapts to small screens, and on phones whose browser can share files, the WhatsApp and email buttons attach the PDF directly through the share sheet.' },
    { question: 'What happens if I clear my browser data?', answer: 'Documents, saved clients, logos and letterheads stored by the tools are deleted with the rest of the site data. Export a JSON backup first if you want to keep them.' },
    { question: 'Which currencies and languages are supported?', answer: 'The interface is in English. Documents can use more than 160 ISO currency codes, with the correct decimals and number format for each. PDF downloads cannot yet include Arabic, Urdu or Hebrew text; for those, the tool offers Print → Save as PDF instead.' },
    { question: 'Are the documents valid for tax purposes?', answer: 'The tools give you the fields most tax systems ask for, such as tax numbers, tax rates and sequential numbering, but the rules differ by country and business type. Check your local tax rules, or ask your accountant, before relying on a document for tax.' },
  ],
  cta: {
    heading: 'When documents become daily operations',
    text: 'The free tools cover single documents. Nexora’s paid platform adds cloud sync, stock that updates with every sale, customer records and multi-user access for restaurants, retail stores and service businesses.',
    links: [
      { label: 'Explore Nexora', to: '/', primary: true },
      { label: 'See pricing', to: '/pricing' },
    ],
  },
}

const thermal = {
  path: '/tools/thermal-receipt-generator',
  appName: 'Nexora Thermal Receipt Generator',
  breadcrumbName: 'Thermal Receipt Generator',
  seo: {
    title: 'Thermal Receipt Generator & 58mm Receipt Template | Nexora',
    description: 'Free thermal receipt generator with a 58mm receipt template and 80mm layout. Make a POS receipt and print it on any thermal printer, or save it as a PDF.',
    keywords: 'thermal receipt generator, 58mm receipt template, thermal printer receipt generator, 80mm receipt maker, 58mm receipt generator, POS receipt maker online, print receipt from browser',
  },
  eyebrow: 'Free · 58mm & 80mm · Prints from your browser',
  h1: 'Free Thermal Receipt Generator (58mm & 80mm)',
  valueProp: 'Make a POS receipt and print it on your receipt printer — no POS software needed.',
  lead: 'This thermal receipt generator lays out a till-style receipt at the exact width of a 58mm or 80mm paper roll and sends it to your thermal printer through the browser’s normal print dialog. Add your logo, items, tax and how the customer paid, then print it or keep a PDF copy. It suits market stalls, pop-up shops, repair counters and anyone who needs a proper receipt without installing POS software.',
  preset: { type: 'receipt', paperSize: 'Thermal80', paperToggle: true },
  toolLabel: 'the thermal receipt generator',
  sections: [
    {
      id: 'how-to-print',
      heading: 'How to Print a Thermal Receipt from Your Browser',
      blocks: [
        {
          steps: [
            { title: 'Pick the paper width', text: 'Use the 58mm / 80mm switch above the editor. Match it to the roll in your printer rather than the printer’s name: many 80mm printers take 58mm rolls with a spacer.' },
            { title: 'Enter your business once', text: 'Name, address, phone and an optional logo. They are remembered on this device, so the next receipt starts with them filled in.' },
            { title: 'Add the items and the payment', text: 'Quantity, price and tax for each line; under More options, record what the customer paid and how. Totals and tax are worked out as you type.' },
            { title: 'Print, or save a PDF', text: 'Print opens your browser’s print dialog. The receipt is sent as one continuous page exactly as long as its content, so it never breaks across A4-sized sheets. Download PDF keeps the same layout for your records.' },
          ],
        },
        { p: 'If you are printing dozens of receipts a day, a generator is the wrong tool. Our guide to [what POS software is](/blog/what-is-pos-software/) explains what a till system adds: stock that updates with each sale, cashier sessions and a daily closing report.' },
      ],
    },
    {
      id: 'paper-sizes',
      heading: '58mm vs 80mm: Which Paper Size Do You Need?',
      tone: 'alt',
      blocks: [
        { p: 'Both widths use the same monochrome receipt layout. The differences are how much fits on a line and how large the text and logo can be:' },
        {
          table: {
            caption: '58mm and 80mm receipts compared',
            columns: ['', '58mm roll', '80mm roll'],
            rows: [
              ['Text width in this tool', '53mm (2.5mm side margins)', '72mm (4mm side margins)'],
              ['Base text size', '7pt', '8pt'],
              ['Largest logo', '34 × 12mm', '44 × 16mm'],
              ['Typical printers', 'Handheld, Bluetooth and card-terminal printers', 'Countertop printers in shops, cafés and restaurants'],
              ['Works best for', 'Short receipts: a few items, parking, deliveries', 'Itemised bills with tax lines and longer product names'],
            ],
          },
        },
        { p: 'Not sure which roll you have? Measure it. Rolls sold as 57mm belong with 58mm, and 79mm or 3⅛-inch rolls belong with 80mm. On narrow paper, long item names wrap onto a second line instead of being cut off, so a 58mm receipt simply runs a little longer.' },
      ],
    },
    {
      id: 'what-to-include',
      heading: 'What to Include on a POS Receipt',
      blocks: [
        { p: 'A good receipt answers the questions a customer, or a tax inspector, asks later: who sold what, when, for how much and how it was paid. The receipt layout has a place for each of these:' },
        {
          list: [
            { title: 'Business name and contact details', text: 'at the top, with your address and phone number, and your logo if you add one.' },
            { title: 'Receipt number and date', text: 'numbered automatically in sequence (RCT-2026-0001, RCT-2026-0002…) so you can find a sale later.' },
            { title: 'Items, quantities and prices', text: 'one line per product or service, with the line total.' },
            { title: 'Tax', text: 'the rate and amount if you are registered for VAT, GST or sales tax. Choose tax-inclusive pricing if your shelf prices already include tax, as is usual in the UK, EU and UAE, or tax-exclusive if tax is added at the till, as in most US states.' },
            { title: 'Payment', text: 'the amount paid and the method, such as cash or card.' },
            { title: 'A footer note', text: 'your returns policy, opening hours or a thank-you line.' },
          ],
        },
        { p: 'As an example, a café in Dubai selling two coffees at AED 18.00 each with 5% VAT included would show a total of AED 36.00, of which AED 1.71 is VAT. Some countries also require a tax registration number or specific wording on receipts, so check your local tax rules.' },
      ],
    },
    {
      id: 'printer-setup',
      heading: 'Printer Setup Tips: Margins, Scaling & Paper Cut',
      tone: 'alt',
      blocks: [
        { p: 'Nearly every thermal printing problem comes from the print dialog assuming you are printing on A4 or Letter paper. These settings fix it, and browsers remember them for each printer.' },
        { h3: 'Chrome and Microsoft Edge' },
        {
          list: [
            'Destination: choose your receipt printer, not “Save as PDF”.',
            'More settings → Paper size: pick the roll size your printer driver offers, such as “80 x 297 mm” or “Roll paper 58 mm”.',
            'Margins: None. The receipt already has its own small side margins.',
            'Scale: Default, or Custom at 100. Avoid “Fit to printable area”, which shrinks the text.',
            'Headers and footers: off. Otherwise the date, page title and web address print above and below the receipt.',
          ],
        },
        { h3: 'Safari on a Mac' },
        {
          list: [
            'Open the print dialog with ⌘P and choose the receipt printer.',
            'Paper Size: choose the printer’s roll size; add it under “Manage Custom Sizes” if it is missing.',
            'Scale: 100%.',
            'Untick “Print headers and footers”.',
          ],
        },
        { p: 'On an iPhone or iPad, Safari can only print to AirPrint printers, which few receipt printers support. On Android, printing depends on the manufacturer’s print-service app. Where direct printing is not possible, download the PDF and print it from the printer’s own app.' },
        { h3: 'Paper cut and feed' },
        { p: 'Because the receipt is one page exactly as long as its content, a printer set to cut at the end of each page or document makes a single cut after the footer. If yours cuts in the middle, or feeds out a long blank tail, the paper size in the driver is a fixed length: switch it to a roll or receipt size, or lower the feed length in the printer’s settings utility.' },
        { callout: 'A pale or blotchy logo is normal on thermal paper, which prints black dots with no greys. A simple, high-contrast black-and-white logo prints far more cleanly than a photo or gradient.' },
        { p: 'One practical limit: a browser can only reach printers your computer has a driver for. Printers that work only through the vendor’s own phone app, which is common with low-cost Bluetooth models, cannot be selected from a web page.' },
      ],
    },
    {
      id: 'receipt-vs-invoice',
      heading: 'Receipt vs Invoice',
      blocks: [
        { p: 'An invoice asks to be paid; a receipt confirms that payment has been received. At a shop counter, where the customer pays on the spot, the receipt is usually the only document needed. When a business customer pays later, by bank transfer for example, you send an invoice first and issue a receipt once the money arrives.' },
        { p: 'Both are made in the same editor. An unpaid invoice can be converted into a receipt when it is settled, carrying over the items and the client, so you never type the sale twice. For sales on credit, start with the [free invoice generator](/tools/invoice-generator/) instead, which adds due dates and payment terms.' },
      ],
    },
    {
      id: 'privacy',
      heading: 'Why Your Data Stays Private',
      tone: 'alt',
      blocks: [
        { p: 'Receipts often carry a customer’s name or phone number. Here they are saved only in the browser on the device you are using at the counter; they are not sent to Nexora or anywhere else, and printing goes straight from the browser to your printer.' },
        { p: 'That makes the device itself the thing to protect. If several staff share one tablet or computer, everyone using the same browser profile can see saved receipts. Give the till its own browser profile, and use Clear all data in the editor’s menu before a device is handed on or sold.' },
      ],
    },
  ],
  faqHeading: 'Thermal Receipt Generator FAQ',
  faqs: [
    { question: 'Is there a free 58mm receipt template I can use?', answer: 'Yes. Switch the paper toggle to 58mm and the editor lays the receipt out at that width, with 2.5mm side margins and 7pt text. Fill in your items and print it, or download the PDF. No file to download or edit by hand.' },
    { question: 'Will it work with my receipt printer?', answer: 'If the printer is installed on your computer and appears in the browser’s print dialog, you can print to it. We have not tested every model, so print one test receipt with the settings above before you serve a queue of customers.' },
    { question: 'Why does my receipt print on A4, or with wide margins?', answer: 'The print dialog is still using a page-sized paper setting. Choose the roll paper size from your printer’s driver, set Margins to None and Scale to 100%.' },
    { question: 'Can I add my logo to a thermal receipt?', answer: 'Yes. Upload it in step one and it prints in black and white at the top, up to 44 × 16mm on 80mm paper or 34 × 12mm on 58mm. Simple, high-contrast logos print best.' },
    { question: 'Can a receipt show VAT or GST?', answer: 'Yes. Add one or more taxes, choose whether prices include tax or have it added, and the receipt lists each tax with its amount. Whether you must show a tax number depends on local rules.' },
    { question: 'Can I keep a digital copy of each receipt?', answer: 'Every receipt is saved in your browser on that device, and Download PDF keeps a file at the same width as the printed copy. Export JSON backup saves all of them to a single file.' },
    { question: 'Can I print receipts from my phone?', answer: 'Only where the phone can reach the printer through the system print dialog: AirPrint on iPhone, or the printer maker’s print service on Android. Otherwise, download the PDF and print it from the printer’s app.' },
    { question: 'Is this a replacement for a POS system?', answer: 'No. It makes one receipt at a time and does not track stock, cash drawers or daily sales totals. For a busy counter, a POS system such as Nexora Retail POS or Restaurant POS does those automatically.' },
  ],
  related: ['/tools/invoice-generator', '/tools/quotation-generator'],
  cta: {
    heading: 'Printing receipts all day? Try Nexora POS',
    text: 'Nexora Restaurant POS and Retail POS print itemised receipts from every sale and keep stock, cashier sessions and daily reports in step. Every plan starts with a 1-month free trial.',
    links: [
      { label: 'Restaurant POS', to: '/restaurant-pos', primary: true },
      { label: 'Retail POS', to: '/retail-pos' },
      { label: 'Billing & receipts', to: '/restaurant-pos/billing-and-receipts' },
    ],
  },
}

const letterhead = {
  path: '/tools/invoice-on-letterhead',
  appName: 'Nexora Invoice on Letterhead',
  breadcrumbName: 'Invoice on Letterhead',
  seo: {
    title: 'Invoice on Letterhead – Letterhead Invoice Maker | Nexora',
    description: 'Create an invoice on letterhead: upload your company letterhead as PNG, JPG or PDF, set safe margins and download a print-ready letterhead invoice PDF.',
    keywords: 'invoice on letterhead, letterhead invoice, company letterhead invoice, invoice and letterhead, print invoice on company letterhead, upload letterhead invoice maker, letterhead invoice PDF',
  },
  eyebrow: 'Free · PNG, JPG & PDF letterheads · No signup',
  h1: 'Create an Invoice on Your Own Letterhead',
  valueProp: 'Keep your own stationery design — the invoice fits inside it.',
  lead: 'Put an invoice on letterhead you already own instead of rebuilding your branding in a template. Upload the letterhead file your designer or print shop gave you, mark where its header and footer end, and the invoice flows into the space between. Download a PDF with the letterhead built in, or print just the text onto sheets that already carry it.',
  preset: { type: 'invoice', brandMode: 'letterhead' },
  toolLabel: 'the letterhead invoice maker',
  sections: [
    {
      id: 'how-it-works',
      heading: 'How It Works: Upload, Set Margins, Download',
      blocks: [
        {
          steps: [
            { title: 'Upload your letterhead', text: 'In step one, “My letterhead” is already selected. Drop in the file or tap to choose it. It is kept on this device and reused for every document you make.' },
            { title: 'Set the safe area', text: 'Drag the blue guide lines on the preview to where the letterhead’s header ends and its footer begins, or type the distances in millimetres.' },
            { title: 'Add the client and items', text: 'Step two takes the client, line items, taxes and discount. The totals update as you type.' },
            { title: 'Choose a design and download', text: 'Each of the four templates has a letterhead version that keeps its fonts and table style but leaves the branding to your letterhead. Then download the PDF, print it, or export to Excel.' },
          ],
        },
        { p: 'This is the quickest way to print an invoice on company letterhead without a word processor: no text boxes to nudge, and the totals are always right.' },
      ],
    },
    {
      id: 'formats',
      heading: 'Supported Letterhead Formats (PNG, JPG, PDF)',
      tone: 'alt',
      blocks: [
        { p: 'The upload accepts PNG, JPG and PDF files, plus WebP, up to 10 MB. Each format is handled a little differently:' },
        {
          table: {
            caption: 'How each letterhead format is used',
            columns: ['Format', 'Best for', 'What the tool does'],
            rows: [
              ['PNG', 'Designs with crisp text and flat colours, exported from Canva, Illustrator or Word', 'Scales it to the page at 2480 pixels wide, the width of A4 at 300 dpi'],
              ['JPG', 'Letterheads with photos or textured backgrounds', 'The same as PNG; a smaller file for the same page'],
              ['PDF', 'The file most print shops and designers supply', 'Uses the first page. The preview shows a picture of it; the downloaded PDF places the original page under the invoice, so lines and small text stay sharp at any zoom'],
            ],
          },
        },
        { p: 'Upload a full page, A4 or US Letter, with the unused middle left blank. If the file’s proportions differ from the paper by more than about 3%, the tool fits it without stretching and shows a notice, rather than distorting your logo.' },
      ],
    },
    {
      id: 'safe-area',
      heading: 'Setting the Safe Area: Top & Bottom Margins Explained',
      blocks: [
        { p: 'The safe area is the rectangle the invoice is allowed to use. Everything outside it belongs to your letterhead, so the invoice text never runs over your logo, address block or footer.' },
        { diagram: 'safe-area' },
        {
          list: [
            { title: 'Top (0–150mm, 45mm to start):', text: 'from the top edge of the sheet to just below the lowest part of your header, plus about 5mm of breathing space.' },
            { title: 'Bottom (0–120mm, 25mm to start):', text: 'the height of the footer, which often holds bank details, a registration number or a coloured band.' },
            { title: 'Left and right (0–60mm, 18mm to start):', text: 'widen these if the design has a side stripe or a column of contact details down one edge.' },
          ],
        },
        { p: 'The easiest way to measure is to lay a ruler on a printed sheet of the letterhead. Long invoices continue onto more pages: choose whether the letterhead appears on all pages or only the first. With “First page only”, later pages use the template’s normal margins, and the page number sits inside the bottom safe area so it never lands on your footer.' },
      ],
    },
    {
      id: 'letterhead-vs-logo',
      heading: 'Letterhead vs Logo: Which Should You Use?',
      tone: 'alt',
      blocks: [
        {
          table: {
            caption: 'Logo mode and letterhead mode compared',
            columns: ['', 'Logo', 'Letterhead'],
            rows: [
              ['What you upload', 'Just your logo', 'A full-page design'],
              ['Who designs the page', 'The template: four layouts and your accent colour', 'You: the invoice sits inside your artwork'],
              ['Business name and address', 'Printed by the template', 'Usually already on the letterhead, so hidden by default'],
              ['Best when', 'You have no stationery yet, or want a clean modern look', 'Your brand guidelines, or a client, expect your official paper'],
            ],
          },
        },
        { p: 'Letterhead mode is easy to undo. In step one, choose Logo and remove the letterhead, and the four template designs return; the invoice content itself is untouched either way.' },
      ],
    },
    {
      id: 'pre-printed',
      heading: 'Printing on Pre-Printed Letterhead Paper',
      blocks: [
        { p: 'Many offices keep a stack of professionally printed letterhead paper. In that case you only want the invoice text to print. Upload a scan or the original file of the same letterhead, then turn on “My paper is already printed”. The preview keeps showing the letterhead so you can line the text up, but printing and the PDF leave it out and keep the same safe area, so the text lands in the blank space on your sheets.' },
        { p: 'The other setting to know is “Hide my business header block”. It is on by default in letterhead mode because a letterhead normally shows your name and address already, and printing them twice looks careless. Turn it off if your letterhead is purely graphic, with no contact details, and the invoice will print them for you.' },
        { h3: 'Before you print a batch' },
        {
          list: [
            'Print one copy on plain paper and hold it against a letterhead sheet in front of a light to check the alignment.',
            'Keep Scale at 100% and Margins at Default in the print dialog; changing either moves the text away from the safe area.',
            'Check which way up your printer’s tray expects letterhead: it differs between models, and the printer manual shows the orientation.',
            'Most office printers cannot print the last 4–5mm at each edge, so keep side margins above that.',
          ],
        },
      ],
    },
  ],
  faqHeading: 'Invoice on Letterhead FAQ',
  faqs: [
    { question: 'My letterhead is a Word or Google Docs file. How do I use it?', answer: 'Export it as a PDF first: in Word use File → Save As → PDF, and in Google Docs File → Download → PDF document. Upload the PDF and the tool uses its first page.' },
    { question: 'Can I use a letterhead that only has a header?', answer: 'Yes. Export the design as a full page with the rest left blank, upload it, and set a small bottom margin such as 15mm so the invoice can use most of the sheet.' },
    { question: 'Will the letterhead appear on every page?', answer: 'You choose: all pages, or the first page only. With first page only, later pages fall back to the template’s own margins.' },
    { question: 'Why is the downloaded PDF sharper than the preview?', answer: 'For a PDF letterhead, the preview shows a picture of its first page, but the download places the original PDF page under the invoice, so its vector lines and text stay sharp.' },
    { question: 'Is my letterhead uploaded to your servers?', answer: 'No. It is processed and stored in your browser on this device. Share links also leave it out: they carry the document’s text only, not your letterhead or logo.' },
    { question: 'Can I use my letterhead for quotations and other documents?', answer: 'Yes. It applies to every page-sized document: quotations, proforma invoices, delivery notes, credit notes and purchase orders. Thermal receipts use their own narrow layout and do not use a letterhead.' },
    { question: 'What is a letter-headed invoice, and is it the same as an invoice header?', answer: 'A letter-headed invoice is an invoice printed on your company letterhead: the design that carries your logo, trading name, address and registration details, usually at the top and sometimes in a footer as well. An invoice header is only that top band. Either works here. Upload the full page or just the header image, set the margins so the invoice starts below it, and every page of the PDF carries it.' },
    { question: 'Which paper sizes work with a letterhead?', answer: 'A4 and US Letter. Choose the one your letterhead was designed for in the design step.' },
  ],
  related: ['/tools/invoice-generator', '/tools/quotation-generator'],
  cta: {
    heading: 'Invoicing more than once a week?',
    text: 'Nexora CRM keeps invoices next to your customer records, with statuses from draft to paid and more than one person on the team able to work on them.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'About Nexora CRM', to: '/crm' },
    ],
  },
}

const quotation = {
  path: '/tools/quotation-generator',
  appName: 'Nexora Free Quotation Generator',
  breadcrumbName: 'Quotation Generator',
  seo: {
    title: 'Free Quotation Generator & Online Quote Maker | Nexora',
    description: 'Free quotation generator and online quotation maker, no software to install: add a validity date, terms and a deposit, then turn the quote into an invoice.',
    keywords: 'quotation generator, quotation generator free, online quotation maker, quotation maker online free, free quotation software, quotation software online, quotation generator no signup, convert quote to invoice, quotation maker PDF, free estimate generator',
  },
  eyebrow: 'Free · No signup · Quote to invoice in one click',
  h1: 'Free Quotation Generator & Maker — Convert Quotes to Invoices in One Click',
  valueProp: 'Price the job, set how long the offer stands, and invoice it when the client says yes.',
  lead: 'This quotation generator turns your prices into a clear, numbered quote that a client can say yes to. Set how long the price holds, spell out the terms and ask for a deposit if the job needs one. When the client accepts, the same document becomes an invoice in one click, with the items, taxes, discount and any deposit carried across, so nothing is retyped.',
  preset: { type: 'quotation' },
  toolLabel: 'the quotation generator',
  sections: [
    {
      id: 'how-to',
      heading: 'How to Create a Quotation',
      blocks: [
        {
          steps: [
            { title: 'Add your business', text: 'Name, address, tax number and logo, entered once and remembered on this device.' },
            { title: 'Add the client and the items', text: 'The document type is already set to Quotation. Choose the client’s currency, for example EUR for a client in Germany, and add a line for each item or stage of work. Rows copied from Excel or Google Sheets paste straight into the items list.' },
            { title: 'Check the validity date and terms', text: 'The quote is valid for 30 days from today unless you change it. Add terms and a deposit if the job needs them.' },
            { title: 'Design, download and send', text: 'Pick a template, then download the quotation as a PDF or send it by WhatsApp or email with a message you can edit.' },
          ],
        },
        { p: 'Quotations are numbered separately from invoices (QUO-2026-0001, QUO-2026-0002…), so a quote that is never accepted leaves no gap in your invoice sequence. That separation is one reason to use a quotation maker with PDF output rather than an invoice with the word “quote” typed on top.' },
      ],
    },
    {
      id: 'quote-estimate-proforma',
      heading: 'Quote vs Estimate vs Proforma Invoice',
      tone: 'alt',
      blocks: [
        { p: 'These three documents are often confused, and the difference matters when a client later disputes a price:' },
        {
          table: {
            caption: 'Quote, estimate and proforma invoice compared',
            columns: ['', 'Quote', 'Estimate', 'Proforma invoice'],
            rows: [
              ['What it is', 'A fixed price for a defined scope', 'An informed guess at the cost', 'A preview of the final invoice, issued before delivery'],
              ['Can the price change?', 'Not within the validity period, once accepted', 'Yes, as the real work becomes clear', 'Only if the order changes'],
              ['Typical use', 'Projects with a clear specification', 'Repairs, renovations, open-ended work', 'Advance payment, customs, letters of credit'],
              ['Requests payment?', 'No, though it can ask for a deposit', 'No', 'Yes, usually payment in advance'],
              ['In this tool', 'Quotation', 'Quotation, with an “estimate” note in the terms', 'Proforma Invoice'],
            ],
          },
        },
        { p: 'If your trade gives estimates, the quotation works as a free estimate generator: state in the terms that the final price may vary, and by how much. How binding each document is depends on your contract and country, so check local rules for anything high-value.' },
      ],
    },
    {
      id: 'what-to-include',
      heading: 'What to Include: Validity Date, Terms & Deposits',
      blocks: [
        { h3: 'Validity date' },
        { p: 'A validity date protects you when your own costs move. A contractor buying materials, or a consultant quoting in USD to a client who pays in INR, cannot hold a price forever. Thirty days is the default; shorten it when supplier prices are volatile, and lengthen it for public-sector tenders with long approval cycles.' },
        { h3: 'Terms' },
        { p: 'Good terms answer the questions that cause disputes: what is included and what is not, when work starts, how many revisions are covered, how payment is staged and what happens after the quote expires. Short, specific sentences beat a page of boilerplate nobody reads.' },
        { h3: 'Deposits' },
        { p: 'Ask for a deposit as a percentage or a fixed amount. On a GBP 4,800 website project, a 30% deposit is GBP 1,440, and the quotation shows it clearly. When the client pays, record the amount and date on the quote; converting it to an invoice then carries the deposit over as a payment, so the invoice shows only the balance still due.' },
      ],
    },
    {
      id: 'convert',
      heading: 'Convert an Accepted Quote into an Invoice',
      tone: 'alt',
      blocks: [
        {
          steps: [
            { title: 'Mark the quote as accepted', text: 'Open the quotation in the advanced editor and set its status to Accepted with the status button in the toolbar.' },
            { title: 'Create the invoice', text: 'Use Create invoice in the toolbar, shown on wider screens once a quote is accepted, or open the document menu and choose Convert to… → Invoice.' },
            { title: 'Check the new invoice', text: 'It gets the next invoice number, today’s date and a due date from your payment terms (14 days unless you change them). Items, taxes, discount and client carry over unchanged.' },
          ],
        },
        { p: 'The original quotation is kept and marked Converted, so you can always see what was offered and what was billed. If the client needs a document to arrange payment before delivery, convert to a Proforma Invoice first, and convert that to the final invoice when the goods ship.' },
      ],
    },
  ],
  faqHeading: 'Quotation Generator FAQ',
  faqs: [
    { question: 'Is this online quotation maker really free?', answer: 'Yes. There is no signup, no paid tier and no watermark on the PDF. Your quotes are stored in your own browser, not on a Nexora server.' },
    { question: 'Is a quotation legally binding?', answer: 'In many countries an accepted quotation can form a contract, which is why the validity date and terms matter. The exact position depends on your jurisdiction and on what both sides signed, so take local advice for large jobs.' },
    { question: 'How long should a quotation be valid?', answer: 'Thirty days is common and is the default here. Use a shorter period when your costs change quickly and a longer one when the client’s approval process is slow.' },
    { question: 'Can I quote in a different currency?', answer: 'Yes. Choose any of more than 160 currencies, such as AED, EUR or INR, before adding prices. Amounts are entered in that currency; the tool does not apply exchange rates.' },
    { question: 'Can my client accept the quote online?', answer: 'Not yet. The share link lets the client view, download and print the quote, but acceptance happens the way you agree it, for example by email, and you then mark the quote as accepted.' },
    { question: 'What is the difference between converting to an invoice and to a proforma?', answer: 'An invoice requests payment for work that is done or goods that are delivered. A proforma invoice comes before delivery, often to arrange advance payment or customs paperwork, and is converted to the final invoice later.' },
    { question: 'Do I need to install quotation software to use it?', answer: 'No. The quotation maker runs in your browser on a computer or a phone, so there is nothing to install and no account to create. Each quote downloads as a PDF or an Excel file. There is no Word export, but the Excel file opens in Excel and Google Sheets if you want to edit it further. Quotes stay on your device; when a sales team needs to share and track quotes together, Nexora CRM does that in the cloud.' },
    { question: 'Can I reuse an old quotation for a new client?', answer: 'Yes. Duplicate it: the copy gets a new quotation number and today’s dates, while the items and terms stay, ready to edit for the new client.' },
  ],
  related: ['/tools/invoice-generator', '/tools/invoice-on-letterhead'],
  cta: {
    heading: 'Tracking quotes across a sales team?',
    text: 'Nexora CRM follows each lead from first contact to won deal, with follow-up reminders so an unanswered quote does not go cold.',
    links: [
      { label: 'Leads & pipeline', to: '/crm/leads-and-pipeline', primary: true },
      { label: 'About Nexora CRM', to: '/crm' },
    ],
  },
}

const invoice = {
  path: '/tools/invoice-generator',
  appName: 'Nexora Free Invoice Generator',
  breadcrumbName: 'Free Invoice Generator',
  seo: {
    title: 'Free Invoice Generator, No Watermark: PDF & Excel | Nexora',
    description: 'Free invoice generator, no watermark or signup: create an invoice as PDF or Excel with taxes, discounts and 160+ currencies. Data stays in your browser.',
    keywords: 'free invoice generator no watermark, invoice maker without watermark, free online invoice generator, create free invoice, create invoice, free invoice creator, invoice generator pdf, free invoice generator, invoice generator no signup, invoice generator excel download, private invoice generator, invoice maker PDF',
  },
  eyebrow: 'Free · No signup · PDF & Excel',
  h1: 'Free Invoice Generator with No Watermark — Create Invoice as PDF or Excel',
  valueProp: 'A professional invoice in three short steps, with the maths done for you.',
  lead: 'This free invoice generator builds a professional invoice in three short steps and gives it to you as a PDF, an Excel workbook or a printout. It takes care of the parts that go wrong in a word-processor template, such as tax on some lines but not others, discounts, part payments and currency formatting. It runs entirely in your browser, with no signup and nothing uploaded.',
  preset: { type: 'invoice' },
  toolLabel: 'the free invoice generator',
  sections: [
    {
      id: 'three-steps',
      heading: 'How to Create an Invoice in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Your business', text: 'Your name, address, tax number, and a logo or your own letterhead. It is saved on this device, so the next invoice starts here already filled in.' },
            { title: 'Client and items', text: 'Type the client or pick a saved one, then add the items. Set taxes, a discount or shipping if you need them; the totals update as you type.' },
            { title: 'Design', text: 'Choose a template and colour, A4 or US Letter, and press Create. The result screen offers PDF, Excel, Print, WhatsApp, Email and a share link.' },
          ],
        },
        { p: 'Nothing on the way asks for an email address or a password. It is an invoice generator with no signup because there is no server-side account to sign up to: the invoice lives on your device.' },
      ],
    },
    {
      id: 'features',
      heading: 'Invoice and Bill Generator Features',
      tone: 'alt',
      blocks: [
        { h3: 'PDF & Excel export' },
        { p: 'The PDF is built in the browser with real, selectable text, and prints at the paper size you chose. The Excel file is a proper workbook rather than a CSV: amounts are numbers with a currency format, and dates are dates.' },
        { h3: 'WhatsApp & email sharing' },
        { p: 'On a phone that can share files, WhatsApp and Email attach the PDF through the share sheet. On a computer, the PDF downloads and WhatsApp or your mail app opens with a ready message. You can change that message template to say {client}, {number} and {total} in your own words.' },
        { h3: '160+ currencies' },
        { p: 'Every currency uses its own decimals, such as 0 for JPY, 2 for USD and 3 for KWD, and the number format of your locale, so a German client sees 1.234,50 €. The amount can also be written out in words, in Western style or in lakh and crore, which suits invoices in INR and PKR.' },
        { h3: 'Multiple taxes' },
        { p: 'Add up to 20 taxes and choose which apply to each line. Prices can include tax or have it added on top; a tax can be compound, calculated on top of another tax, or a withholding tax that the client deducts before paying.' },
        { h3: 'Templates' },
        { p: 'Four page designs, Classic, Modern, Minimal and Corporate, each with your choice of accent colour, plus a narrow receipt layout for till printers.' },
        { h3: 'Letterhead' },
        { p: 'Prefer your own stationery? Upload it and the invoice sits inside its margins. The [invoice on letterhead](/tools/invoice-on-letterhead/) guide covers formats and margins in detail.' },
        { h3: 'Thermal receipts' },
        { p: 'The same editor prints 58mm and 80mm receipts for counter sales. See the [thermal receipt generator](/tools/thermal-receipt-generator/) for printer settings.' },
        { h3: 'Computer-generated invoices' },
        { p: 'Each document is numbered, dated and totalled by the software, which is what people mean by a computer-generated invoice or bill. If your client expects the usual line saying it needs no signature, add it under Notes & terms and it prints on every copy.' },
      ],
    },
    {
      id: 'what-to-include',
      heading: 'What to Include on an Invoice',
      blocks: [
        { p: 'An invoice that gets paid quickly is one the client’s accounts team can process without emailing you back. Check that yours has:' },
        {
          list: [
            { title: 'Your details and tax number', text: 'legal business name, address and, if you are registered, your VAT, GST or sales-tax number.' },
            { title: 'The client’s details', text: 'the company name and address exactly as their accounts department uses them.' },
            { title: 'A unique invoice number', text: 'sequential and never reused. The tool numbers invoices INV-2026-0001, INV-2026-0002 and so on.' },
            { title: 'Issue date and due date', text: 'with payment terms such as Net 14 or Due on receipt.' },
            { title: 'Itemised lines', text: 'a description, quantity, unit price and line total for each item.' },
            { title: 'Tax and total', text: 'the subtotal, each tax rate with its amount, and the total due, for example GBP 1,200.00 + VAT 20% = GBP 1,440.00.' },
            { title: 'How to pay', text: 'bank details, an IBAN or a payment link, and the reference the client should quote.' },
          ],
        },
        { p: 'Some tax systems add their own requirements, such as the words “reverse charge” on certain EU cross-border invoices, or product codes on GST invoices in India. The fields here cover the common ground; check your local tax rules for the rest.' },
      ],
    },
    {
      id: 'invoice-quote-receipt',
      heading: 'Invoice vs Quotation vs Receipt',
      tone: 'alt',
      blocks: [
        {
          table: {
            caption: 'Invoice, quotation and receipt compared',
            columns: ['', 'Quotation', 'Invoice', 'Receipt'],
            rows: [
              ['Purpose', 'Offers a price', 'Requests payment', 'Confirms payment'],
              ['When', 'Before the work', 'After delivery', 'When the money arrives'],
              ['Key date', 'Valid until', 'Due date', 'Date paid'],
              ['Converts into', 'Invoice or proforma', 'Receipt, delivery note or credit note', '—'],
            ],
          },
        },
        { p: 'Start with the [quotation generator](/tools/quotation-generator/) when the client still has to agree the price, and use the [thermal receipt generator](/tools/thermal-receipt-generator/) for sales paid on the spot.' },
      ],
    },
    {
      id: 'country-versions',
      heading: 'Invoice Generators for Other Countries and Documents',
      blocks: [
        { p: 'If your invoices follow a particular tax system, start from the version set up for it: the [GST invoice generator](/tools/gst-invoice-generator/) for India, the [UAE VAT invoice generator](/tools/uae-vat-invoice-generator/), the [CIS invoice generator](/tools/cis-invoice-generator/) for UK construction, and the [Pakistan invoice generator](/tools/pakistan-invoice-generator/) for rupee invoices with sales tax. For orders before the sale is final, use the [proforma invoice generator](/tools/proforma-invoice-generator/), and the [purchase order generator](/tools/purchase-order-generator/) when you are the one buying. Shipping goods? The same editor turns a finished invoice into a delivery note, with prices and taxes taken out, or into a credit note, in one click.' },
      ],
    },
    {
      id: 'usa-invoicing',
      heading: 'Invoicing in the USA',
      blocks: [
        { p: 'US freelancers and small businesses can set the currency to USD, choose US Letter paper and add sales tax to only the lines that are taxable. Our page on the [free invoice generator for US small businesses](/usa/) covers the US setup, and the [Texas invoicing guide](/texas/) covers sales tax on invoices for Texas sellers.' },
        { p: 'New to billing clients? Read [how to create an invoice in the USA](/blog/how-to-create-an-invoice-usa/) for what to include, or see the [free invoice generator guide for the USA](/blog/free-invoice-generator-usa/) and the [guide for small businesses](/blog/free-invoice-generator-small-business-usa/). Paying staff instead? Use the [free pay stub generator](/tools/pay-stub-generator/), and for hourly or materials billing try the [contractor invoice generator](/tools/contractor-invoice-generator/).' },
      ],
    },
    {
      id: 'excel',
      heading: 'Download Your Invoice as Excel',
      blocks: [
        { p: 'Press Excel on the result screen to get a file named like Invoice-INV-2026-0001.xlsx. The first sheet is laid out like the invoice, with your header, a styled items table, totals, the amount in words and your notes. The second sheet, Items (raw), lists one plain row per item, which is useful for your bookkeeping and pastes straight back into the editor. It is the easiest invoice generator Excel download for anyone who reconciles in a spreadsheet: [open the generator](#tool) and create an invoice to try it.' },
      ],
    },
    {
      id: 'privacy',
      heading: 'Why Your Data Stays Private',
      tone: 'alt',
      blocks: [
        { p: 'Invoices hold commercially sensitive information: who your clients are, what you charge them and when they pay. This private invoice generator keeps all of it in your browser’s storage on your device. Because there is no copy on our servers, there is no account of yours to hack and no database of your invoices to leak.' },
        { p: 'The trade-off is that your invoices do not follow you to another computer by themselves. Export JSON backup saves everything to a single file that you can import elsewhere. If you need invoices shared across a team, [Nexora CRM invoicing](/crm/invoices/) is the cloud-based alternative.' },
      ],
    },
  ],
  faqHeading: 'Free Invoice Generator FAQ',
  faqs: [
    { question: 'Is the invoice generator really free, with no watermark?', answer: 'Yes. There is no paid tier, no trial that runs out, and no watermark or Nexora logo on your documents.' },
    { question: 'Can I download an invoice in Excel?', answer: 'Yes. The result screen has an Excel button next to Download PDF. The workbook has a formatted invoice sheet and a plain Items (raw) sheet.' },
    { question: 'How are invoice numbers created?', answer: 'Each new invoice takes the next number in the sequence on your device, such as INV-2026-0007. You can type your own number instead, which is useful if you are continuing a sequence from another system.' },
    { question: 'Can I add VAT or GST at my own rate?', answer: 'Yes. Name the tax and set its rate, for example VAT at 20% or GST at 18%, and choose which lines it applies to. You can add several taxes to one invoice.' },
    { question: 'Can I record a partial payment?', answer: 'Yes. Add each payment with its date and method; the invoice shows what was paid and the balance still due, and Mark as paid settles the rest in one step.' },
    { question: 'Why does the tool suggest Print instead of Download PDF for some invoices?', answer: 'PDF downloads cannot yet include Arabic, Urdu or Hebrew text. When an invoice contains it, the tool offers your browser’s Print → Save as PDF, which renders those scripts correctly.' },
    { question: 'Can I edit an invoice after I have downloaded it?', answer: 'Yes. Your invoices stay in the browser: reopen one from the documents list, change it and download it again. Duplicating is quicker for a repeat invoice to the same client.' },
    { question: 'Will my client see any Nexora branding?', answer: 'No. The invoice shows only your business details and design. The PDF file’s properties record the app that produced it, as most PDF software does.' },
  ],
  related: ['/tools/gst-invoice-generator', '/tools/quotation-generator', '/tools/invoice-on-letterhead'],
  cta: {
    heading: 'Need invoices your whole team can see?',
    text: 'Nexora CRM keeps invoices with your customer records, tracks them from draft to paid, and works from any device your team signs in on.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'See pricing', to: '/pricing' },
    ],
  },
}

const gst = {
  path: '/tools/gst-invoice-generator',
  appName: 'Nexora Free GST Invoice Generator',
  breadcrumbName: 'GST Invoice Generator',
  seo: {
    title: 'Free GST Invoice Generator — Excel & PDF, UPI QR | Nexora',
    description: 'Free GST invoice generator: make a tax invoice with GSTIN, CGST/SGST/IGST, lakh and crore amounts and a UPI QR code. Excel and PDF, no signup.',
    keywords: 'gst invoice generator, free gst invoice generator, gst invoice format in excel, invoice generator with gst, gst bill generator, tax invoice with cgst sgst, invoice with upi qr code',
  },
  eyebrow: 'Free · GSTIN · CGST / SGST / IGST · UPI QR',
  h1: 'Free GST Invoice Generator — Tax Invoice in Excel & PDF',
  valueProp: 'A GST tax invoice with ₹ amounts, your GSTIN and a UPI QR code, ready in three steps.',
  lead: 'This GST invoice generator opens already set up for India: rupee amounts with lakh and crore grouping (₹1,25,000), GSTIN fields for you and your client, the title Tax Invoice and GST at 18% that you can change per line. Add your items, split the tax into CGST and SGST or charge IGST, attach a UPI QR code so the client can pay by scanning, and download the result as a PDF or an Excel workbook. It runs in your browser, with no signup and nothing uploaded.',
  preset: { type: 'invoice', region: { code: 'IN', registered: true } },
  toolLabel: 'the GST invoice generator',
  sections: [
    {
      id: 'three-steps',
      heading: 'GST Invoice Generator: How It Works in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Your business and GSTIN', text: 'Enter your business name, address and 15-character GSTIN, and add a logo if you have one. They are saved on this device, so the next invoice starts already filled in.' },
            { title: 'Client, items and GST', text: 'Add the client and their GSTIN if they are registered, then the items. GST at 18% is added for you; change the rate, or replace it with CGST and SGST (or IGST) under Taxes.' },
            { title: 'Design and payment', text: 'Pick a template, then under How to pay add your bank details and a UPI ID for the QR code. Press Create for the PDF, Excel, print, WhatsApp or email options.' },
          ],
        },
        { p: 'Because this is a GST bill generator with no signup, there is no account to create first. Your business details and invoices stay in your browser’s storage on this device.' },
      ],
    },
    {
      id: 'cgst-sgst-igst',
      heading: 'CGST, SGST and IGST on One Invoice',
      tone: 'alt',
      blocks: [
        { p: 'Which GST lines appear depends on where the goods or services are supplied. A sale inside one state carries central and state GST, each half of the rate. A sale to another state carries a single integrated GST line at the full rate. The tool does not decide this for you, so you choose the lines that match your sale.' },
        {
          table: {
            caption: 'How the tax lines differ for a ₹10,000 sale at an 18% rate',
            columns: ['', 'Within one state', 'To another state'],
            rows: [
              ['Tax lines on the invoice', 'CGST and SGST', 'IGST'],
              ['Taxes to add in the tool', 'Two taxes at 9% each', 'One tax at 18%'],
              ['Tax amounts', '₹900 + ₹900', '₹1,800'],
              ['Invoice total', '₹11,800', '₹11,800'],
            ],
          },
        },
        { p: 'You can add up to 20 taxes and choose which lines each one applies to, so mixed invoices work too, for example one item at 18% and another at 5%. Prices can be entered with GST included or added on top.' },
      ],
    },
    {
      id: 'sample',
      heading: 'A Worked GST Invoice Example',
      blocks: [
        { p: 'This is how a simple same-state service invoice adds up. The taxable value is the sum of the lines, and each tax is calculated on it.' },
        {
          table: {
            caption: 'Sample GST invoice, CGST 9% and SGST 9%',
            columns: ['Line', 'Qty', 'Rate', 'Amount'],
            rows: [
              ['Website design', '1', '₹25,000', '₹25,000'],
              ['Hosting setup', '1', '₹7,500', '₹7,500'],
              ['Taxable value', '', '', '₹32,500'],
              ['CGST at 9%', '', '', '₹2,925'],
              ['SGST at 9%', '', '', '₹2,925'],
              ['Total', '', '', '₹38,350'],
            ],
          },
        },
        { p: 'Switch on Show amount in words under Notes & terms and the total is also written out in the Indian system, so 1,47,500 reads as One Lakh Forty-Seven Thousand Five Hundred, the form many Indian clients expect to see on a bill.' },
      ],
    },
    {
      id: 'igst-example',
      heading: 'A Worked IGST Example for a Sale to Another State',
      blocks: [
        { p: 'For a sale to a client in another state, the whole tax goes on one IGST line at the full rate. Here the same two services are sold across a state border, so there is no split.' },
        {
          table: {
            caption: 'Sample GST invoice, IGST 18%',
            columns: ['Line', 'Amount'],
            rows: [
              ['Website design', '₹25,000'],
              ['Hosting setup', '₹7,500'],
              ['Taxable value', '₹32,500'],
              ['IGST at 18%', '₹5,850'],
              ['Total', '₹38,350'],
            ],
          },
        },
        { p: 'The total matches the same-state example, because 9% plus 9% equals 18%. Only the way the tax is shown changes. Check the place of supply for your sale, since it decides which version applies.' },
      ],
    },
    {
      id: 'gstin-and-codes',
      heading: 'GSTIN, HSN and SAC Codes in Plain Words',
      tone: 'alt',
      blocks: [
        { p: 'A GSTIN is 15 characters long. The first two digits are the state code, the next ten are the holder’s PAN, and the rest are an entity number, a letter and a check character. That makes it easy to confirm that the state code on a client’s GSTIN matches the state you are invoicing.' },
        { p: 'HSN codes classify goods and SAC codes classify services. Type the code into the item description, as in the example above. How many digits you must show depends on your business, so check the current rule on the GST portal.' },
      ],
    },
    {
      id: 'what-to-include',
      heading: 'What a GST Tax Invoice Normally Shows',
      tone: 'alt',
      blocks: [
        { p: 'A GST-registered business issuing a tax invoice generally includes the details below. Rules differ by business type and turnover, so confirm your own requirements with your accountant or the GST portal.' },
        {
          list: [
            { title: 'Supplier details', text: 'your name, address and GSTIN, which the tool places in the header.' },
            { title: 'Invoice number and date', text: 'a sequential number of up to 16 characters. The tool’s default format, such as INV-2026-0001, fits.' },
            { title: 'Recipient details', text: 'the client’s name and address, plus their GSTIN when they are registered.' },
            { title: 'Item details', text: 'a description, quantity and taxable value for each line. Type the HSN or SAC code into the description, for example “Steel brackets, HSN 7326”.' },
            { title: 'Tax rate and amount', text: 'each of CGST, SGST or IGST with its rate and amount, as separate lines.' },
            { title: 'Place of supply', text: 'the state of supply, which you can add under Notes & terms.' },
            { title: 'Signature', text: 'draw or upload one in the design step, with the signatory’s name and title.' },
          ],
        },
        { p: 'If you are not registered for GST, or you pay tax under the composition scheme, you do not charge GST on your invoices and you issue a bill of supply instead of a tax invoice. Turn off the GST-registered option under Where is your business?, and rename the document title in the details step.' },
      ],
    },
    {
      id: 'excel',
      heading: 'GST Invoice Format in Excel and PDF',
      tone: 'alt',
      blocks: [
        { p: 'Press Excel on the result screen to get a workbook named like Invoice-INV-2026-0001.xlsx. Its first sheet is laid out like the invoice, with your GSTIN, the items, each GST line and the total. The second sheet lists one plain row per item, so it pastes straight into your bookkeeping sheet. Amounts are real numbers with a currency format, not text, so you can add them up and filter them.' },
        { p: 'The PDF uses real, selectable text and carries the ₹ symbol, so it prints and shares cleanly. If the font cannot load on a slow connection, the tool falls back to the currency code INR and tells you so.' },
      ],
    },
    {
      id: 'upi',
      heading: 'Add a UPI QR Code to Your Invoice',
      blocks: [
        { p: 'Under How to pay, set QR code on the document to UPI (India) and type your UPI ID, in the form name@bank, into the Wallet ID box. For invoices in INR the QR code carries your UPI ID, your business name and the amount, so the client scans it with any UPI app and the amount is already filled in.' },
        { p: 'Nothing is sent anywhere to make the code. It is drawn on your device from the details you typed, and the same code appears in the preview, the PDF and the printout.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Tool Does Not Do',
      tone: 'alt',
      blocks: [
        { callout: 'This is an invoice maker, not GST compliance software. It does not generate an e-invoice reference number (IRN) or e-way bill, file GST returns, look up HSN or SAC codes, or work out the place of supply for you. If your turnover requires e-invoicing through the government portal, use that system for the invoice itself and check the current rules with your accountant.' },
      ],
    },
  ],
  faqHeading: 'GST Invoice Generator FAQ',
  faqs: [
    { question: 'Is this GST invoice generator really free?', answer: 'Yes. There is no signup, no trial that expires and no watermark. The invoices you make carry only your business details and design.' },
    { question: 'GST bill kaise banaye?', answer: 'Open the generator, enter your business name and GSTIN, add the client and the items, check the GST lines, and press Create. You then download the PDF or Excel file. Hinglish mein: apni details aur items daaliye, GST rate check kijiye, aur bill download kar lijiye.' },
    { question: 'Can I split the tax into CGST, SGST and IGST?', answer: 'Yes. Under Taxes, add two taxes at half the rate each for a sale within one state, or a single tax at the full rate for a sale to another state, and name them CGST, SGST or IGST yourself.' },
    { question: 'Can I add an HSN or SAC code to each item?', answer: 'The item rows have a description box, so type the code there, for example “Consulting services, SAC 9983”. There is no separate HSN column or HSN summary table.' },
    { question: 'Can I download the GST invoice format in Excel?', answer: 'Yes. The Excel button on the result screen gives a workbook with a formatted invoice sheet and a plain items sheet, and the amounts are numbers you can calculate with.' },
    { question: 'Does it create e-invoices, IRNs or e-way bills?', answer: 'No. It makes the invoice document only. Businesses that must generate e-invoices or e-way bills do that through the government’s own systems.' },
    { question: 'How do I put a UPI QR code on my invoice?', answer: 'Choose UPI (India) as the QR code type under How to pay and enter your UPI ID in the Wallet ID box. On INR invoices the amount is added to the code automatically.' },
    { question: 'Are my GSTIN and client details stored on your servers?', answer: 'No. They are saved in your browser on this device and nothing is uploaded. Because of that, clearing your browser data removes them, so keep a JSON backup from the editor menu.' },
  ],
  related: ['/tools/invoice-generator', '/tools/quotation-generator', '/tools/invoice-on-letterhead'],
  cta: {
    heading: 'Outgrowing one-off invoices?',
    text: 'Nexora’s cloud platform keeps customers, invoices and stock together for your whole team, and every plan starts with a free one-month trial.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'Explore Nexora', to: '/' },
    ],
  },
}

const contractor = {
  path: '/tools/contractor-invoice-generator',
  appName: 'Nexora Free Contractor Invoice Generator',
  breadcrumbName: 'Contractor Invoice Generator',
  seo: {
    title: 'Free Contractor Invoice Generator — PDF & Excel | Nexora',
    description: 'Free contractor invoice generator with no signup: bill hours and materials, add sales tax to chosen lines, and download a PDF or Excel file. No watermark.',
    keywords: 'contractor invoice generator, free contractor invoice generator, contractor invoice template, invoice generator for contractors, freelance invoice generator, invoice with sales tax',
  },
  eyebrow: 'Free · Hours + materials · Sales tax on chosen lines',
  h1: 'Free Contractor Invoice Generator — Bill Hours and Materials',
  valueProp: 'Invoice a job in minutes: labor by the hour, materials at cost, and tax only where it applies.',
  lead: 'This contractor invoice generator is built around how trades and independent contractors actually bill: hours at a rate, materials at cost, tax on some lines but not others, and a balance that shrinks as payments arrive. It opens set up for the United States, with dollars and an EIN field for your tax number. Add your lines, then download a PDF or Excel file or send it by WhatsApp or email. There is no signup and no watermark, and nothing is uploaded.',
  preset: { type: 'invoice', region: { code: 'US' } },
  toolLabel: 'the contractor invoice generator',
  sections: [
    {
      id: 'three-steps',
      heading: 'Contractor Invoice Generator: How It Works in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Your business', text: 'Add your company name, address, phone and, if you want it shown, your EIN or license number. A logo is optional. Everything is saved on this device for your next job.' },
            { title: 'Client and job lines', text: 'Enter the client, then add a line for each block of labor and each material. Quantities accept decimals, so 7.5 hours works. A tax you add applies to every line at first, and the advanced editor lets you switch it off for individual lines.' },
            { title: 'Design and payment', text: 'Pick a template, then under How to pay add your bank details, Zelle, Venmo or PayPal. Press Create to get the PDF, Excel, print, WhatsApp and email options.' },
          ],
        },
        { p: 'Nothing here asks for an account. Your business details, clients and invoices stay in your browser’s storage, so the next job’s invoice starts filled in.' },
      ],
    },
    {
      id: 'hours-and-materials',
      heading: 'Billing Hours and Materials on One Invoice',
      tone: 'alt',
      blocks: [
        { p: 'A typical job invoice has two kinds of lines. Labor is priced per hour or per day, and materials are priced per item or as a lump sum. Put each on its own line with a clear description, and the amount for every row is quantity times price. Here is a small example with an assumed 7% sales tax applied to materials only.' },
        {
          table: {
            caption: 'Sample contractor invoice, sales tax on materials only',
            columns: ['Line', 'Qty', 'Rate', 'Amount'],
            rows: [
              ['Labor, framing (hours)', '12.5', '$85.00', '$1,062.50'],
              ['Materials, lumber and hardware', '1', '$480.00', '$480.00'],
              ['Subtotal', '', '', '$1,542.50'],
              ['Sales tax 7% on materials', '', '', '$33.60'],
              ['Total', '', '', '$1,576.10'],
            ],
          },
        },
        { p: 'Some states tax materials but not labor, some tax both and some tax neither, and city or county rates can add to the state rate. In the advanced editor, each line has a switch for every tax, so you can leave labor untaxed and tax the materials. The tool does not look up rates for you.' },
      ],
    },
    {
      id: 'deposits-and-payments',
      heading: 'Deposits, Progress Payments and Balance Due',
      blocks: [
        { p: 'Large jobs are rarely paid in one go. Ask for a deposit on the estimate, convert the accepted estimate into an invoice, and then record each payment as it arrives with its date and method. The invoice shows what has been paid and the balance still owed, and Mark as paid settles whatever is left in one step.' },
        { p: 'For payment terms, choose Due on receipt, Net 30 or any number of days. Put late-fee wording in the Terms box so it prints on the invoice, for example “1.5% per month after 30 days”, if that is your policy and your state allows it.' },
      ],
    },
    {
      id: 'what-to-include',
      heading: 'What a Contractor Invoice Should Include',
      tone: 'alt',
      blocks: [
        { p: 'A clear invoice gets paid sooner because the client does not have to call you with questions. Before you send one, check that it has:' },
        {
          list: [
            { title: 'Your business details', text: 'name, address, phone and email, plus a license or registration number if your trade or state expects one.' },
            { title: 'The client and the job', text: 'who is being billed, with the job site or project name in the Reference field.' },
            { title: 'A unique invoice number', text: 'sequential and never reused. The tool numbers them INV-2026-0001, INV-2026-0002 and so on.' },
            { title: 'Dates and terms', text: 'the issue date, the due date and the terms, such as Net 30.' },
            { title: 'Itemized labor and materials', text: 'a description, quantity, rate and amount for every line, so nothing looks like a lump sum.' },
            { title: 'Tax and total', text: 'the subtotal, each tax with its amount, and the total due.' },
            { title: 'How to pay', text: 'your bank account and routing number, a Zelle, Venmo or PayPal handle, or a payment link.' },
          ],
        },
        { p: 'If a client treats you as an independent contractor, they may ask you for a W-9 and may report what they pay you to the IRS. This tool does not make those forms. Ask your accountant about them, and about estimated taxes.' },
      ],
    },
    {
      id: 'estimate-to-invoice',
      heading: 'From Estimate to Invoice',
      blocks: [
        { p: 'Start with the [quotation generator](/tools/quotation-generator/) before the work begins. Change the document title to Estimate in the details step if that is the word your clients use, add the deposit you want, and send it. When the client says yes, convert it into an invoice without retyping the lines.' },
        { p: 'Quotes and invoices share one editor, so your business details, clients and items carry across. The [free invoice generator](/tools/invoice-generator/) covers the general case if you invoice outside the trades.' },
      ],
    },
    {
      id: 'get-paid',
      heading: 'Get Paid by Zelle, Venmo, PayPal or Bank Transfer',
      tone: 'alt',
      blocks: [
        { p: 'Under How to pay, fill in your bank name, account name and account number, and set the code type to Routing No (ABA) for the routing number. For Zelle, Venmo or PayPal, choose the wallet and type your handle, and paste a payment link if you have one. A QR code can point to that link so a client at the job site can scan it.' },
        { p: 'The invoice only shows these details. It does not process or move any money, so you collect payment through your own bank or app.' },
      ],
    },
    {
      id: 'excel',
      heading: 'Download as PDF or Excel',
      blocks: [
        { p: 'The PDF has selectable text and prints at US Letter or A4. The Excel button gives you a workbook with the invoice laid out on the first sheet and one plain row per line on the second, with amounts stored as numbers. That is handy when you keep a running job log or hand your bookkeeper a spreadsheet at the end of the month.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Tool Does Not Do',
      tone: 'alt',
      blocks: [
        { callout: 'This is an invoice maker, not accounting or tax software. It does not look up sales tax rates, calculate what you owe the IRS, take payments, or produce W-9, lien waiver or contract forms. Check the rules for your state and trade with your accountant before relying on any figure.' },
      ],
    },
  ],
  faqHeading: 'Contractor Invoice Generator FAQ',
  faqs: [
    { question: 'Is this contractor invoice generator really free?', answer: 'Yes. It has no signup, no trial that runs out and no watermark, and the invoices carry only your own business details and design.' },
    { question: 'Can I bill by the hour and for materials on the same invoice?', answer: 'Yes. Add one line for labor with the hours as the quantity, for example 12.5, and another for materials. Every line is priced separately and the totals update as you type.' },
    { question: 'How do I charge sales tax only on materials?', answer: 'Add a sales tax under Taxes, create the invoice, then choose Open the advanced editor and switch the tax off on the labor lines. Materials keep it. Check with your accountant which of your lines your state taxes.' },
    { question: 'Can I ask the client for a deposit?', answer: 'Yes, on the estimate. Add a deposit amount or percentage to the quotation, send it, and convert it to an invoice once it is accepted.' },
    { question: 'Can clients pay me through Zelle, Venmo or PayPal?', answer: 'You can print your Zelle, Venmo or PayPal handle, or a payment link and QR code, on the invoice. The client pays through their own app; this tool does not handle the payment.' },
    { question: 'Do I have to put my EIN on the invoice?', answer: 'No. The tax number field is optional. Leave it empty if you do not want a number shown, or fill it in if your client asks for one.' },
    { question: 'Can I turn an estimate into an invoice?', answer: 'Yes. Build the estimate in the quotation generator, then use the convert action once the client agrees. The lines come across so you do not retype them.' },
    { question: 'Where is my job and client information stored?', answer: 'In your browser on this device. Nothing is uploaded, which also means clearing your browser data removes it, so save a JSON backup from the editor menu.' },
  ],
  related: ['/tools/quotation-generator', '/tools/invoice-generator', '/tools/invoice-on-letterhead'],
  cta: {
    heading: 'Running a crew, not just a job?',
    text: 'Nexora’s cloud platform keeps customers, invoices and staff roles in one place, and every plan starts with a free one-month trial.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'Explore Nexora', to: '/' },
    ],
  },
}

const cis = {
  path: '/tools/cis-invoice-generator',
  appName: 'Nexora Free CIS Invoice Generator',
  breadcrumbName: 'CIS Invoice Generator',
  seo: {
    title: 'Free CIS Invoice Generator UK — PDF & Excel | Nexora',
    description: 'Free CIS invoice generator for UK subcontractors: bill labour and materials in pounds, add VAT, deduct CIS, then download a PDF or Excel. No signup.',
    keywords: 'CIS invoice generator, CIS invoice template, free CIS invoice, construction industry scheme invoice, subcontractor invoice UK, free invoice generator UK, sole trader invoice template',
  },
  eyebrow: 'Free · Pounds sterling · VAT and CIS deduction',
  h1: 'Free CIS Invoice Generator for UK Subcontractors',
  valueProp: 'Bill labour and materials, add VAT where it applies, and show the CIS deduction before you send.',
  lead: 'This CIS invoice generator is made for subcontractors in the Construction Industry Scheme, and it works for any UK sole trader or small firm. It opens in pounds with British dates and a VAT number field. Add labour and materials as separate lines, switch VAT on if you are registered, and record the CIS deduction as a withholding so the invoice shows the amount payable. Download a PDF or Excel file with no signup and no watermark.',
  preset: { type: 'invoice', region: { code: 'GB' } },
  toolLabel: 'the CIS invoice generator',
  sections: [
    {
      id: 'three-steps',
      heading: 'How to Make a CIS Invoice in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Your business', text: 'Enter your trading name, address, phone and email. Add your VAT number only if you are VAT-registered, and your UTR if you want it printed. Details are saved on this device for next time.' },
            { title: 'Client and job lines', text: 'Add the contractor you are billing, then one line for labour and one for materials. Open the advanced editor to set VAT on both lines and the CIS deduction on the labour line only.' },
            { title: 'Design and payment', text: 'Choose a template, add your account name, sort code and account number under How to pay, and press Create for PDF, Excel, print, WhatsApp or email.' },
          ],
        },
        { p: 'There is no account to create. Your details and invoices stay in this browser, so the next invoice starts filled in.' },
      ],
    },
    {
      id: 'what-is-cis',
      heading: 'What the Construction Industry Scheme Means for Your Invoice',
      tone: 'alt',
      blocks: [
        { p: 'Under the Construction Industry Scheme, a contractor deducts money from what it pays a subcontractor and passes it to HMRC. The deduction counts towards the subcontractor’s tax and National Insurance bill. According to GOV.UK, the rate is 20% for a registered subcontractor, 30% for one who is not registered, and 0% for gross payment status.' },
        { p: 'The deduction is taken from the labour part of the payment, not from materials and not from VAT. That is why a CIS invoice is easier to read when labour and materials sit on separate lines. Your contractor then issues a payment and deduction statement, and your invoice only needs to show what was billed.' },
      ],
    },
    {
      id: 'worked-example',
      heading: 'A Worked Example With VAT and a 20% Deduction',
      blocks: [
        { p: 'Here is a small job with an assumed £400 of labour and £250 of materials, VAT at 20% on both lines and a 20% CIS deduction on labour. We checked these figures in the tool itself.' },
        {
          table: {
            caption: 'Sample CIS invoice, VAT on both lines, deduction on labour',
            columns: ['Line', 'Amount'],
            rows: [
              ['Labour', '£400.00'],
              ['Materials', '£250.00'],
              ['VAT at 20%', '£130.00'],
              ['Invoice total', '£780.00'],
              ['CIS deduction at 20% of labour', '−£80.00'],
              ['Amount payable', '£700.00'],
            ],
          },
        },
        { p: 'Your own mix of lines, rates and VAT status will differ, so treat the table as an illustration of how the pieces fit, not as advice on what you owe.' },
      ],
    },
    {
      id: 'set-up-deduction',
      heading: 'Setting Up the Deduction in the Editor',
      tone: 'alt',
      blocks: [
        { p: 'In the editor, open the advanced options and add a tax called CIS with the rate that applies to you. Tick the option marked Withholding (deducted), which subtracts it from the amount payable instead of adding it to the total. Then switch it on for the labour line and off for materials.' },
        { p: 'Add VAT as a second tax and switch it on for the lines it applies to. If you are not registered, leave VAT out; the tool only adds it when you tell it to.' },
      ],
    },
    {
      id: 'vat-and-reverse-charge',
      heading: 'VAT, the Threshold and the Reverse Charge',
      blocks: [
        { p: 'You must register for VAT when your taxable turnover goes over the registration threshold, which GOV.UK lists as £90,000. Below it, registration is optional. A VAT-registered business shows its VAT number and a tax invoice; an unregistered sole trader simply leaves VAT off.' },
        { callout: 'Some construction work between VAT-registered CIS businesses falls under the domestic reverse charge, where the customer accounts for the VAT and you do not charge it. The tool cannot tell which of your jobs qualify, so confirm the treatment with HMRC guidance or your accountant before you add VAT to a line.' },
      ],
    },
    {
      id: 'what-to-include',
      heading: 'What Your Invoice Should Include',
      tone: 'alt',
      blocks: [
        { p: 'A clear invoice is paid sooner. Before sending, check that it shows:' },
        {
          list: [
            { title: 'Your details', text: 'business name, address and contact details, plus your VAT number if registered.' },
            { title: 'The customer and the job', text: 'who is being billed and the site address or job name in the Reference field.' },
            { title: 'A unique number and the dates', text: 'sequential numbering, the issue date, and the date the invoice falls due.' },
            { title: 'Labour and materials', text: 'separate lines with a description, quantity, rate and amount, so the labour figure is plain.' },
            { title: 'VAT and the deduction', text: 'the VAT amount, the invoice total, the CIS deduction and the amount payable.' },
            { title: 'How to pay', text: 'account name, sort code and account number, or a payment link.' },
          ],
        },
      ],
    },
    {
      id: 'late-payment',
      heading: 'Chasing Late Payment',
      blocks: [
        { p: 'Say the payment terms on the invoice, such as 30 days. For business-to-business debts, GOV.UK explains that you can charge statutory interest at 8% above the Bank of England base rate, plus a fixed sum that depends on the size of the debt, if the contract does not set its own terms. Put your wording in the Terms box so it prints on every invoice.' },
        { p: 'Start with the [quotation generator](/tools/quotation-generator/) when you price a job, and the [free invoice generator](/tools/invoice-generator/) covers work outside construction.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Tool Does Not Do',
      tone: 'alt',
      blocks: [
        { callout: 'This is an invoice maker, not accounting or tax software. It does not submit anything to HMRC, file CIS returns, make Making Tax Digital submissions, verify subcontractors or give tax advice. Rates and thresholds change, so check GOV.UK or ask your accountant before relying on a figure.' },
      ],
    },
  ],
  faqHeading: 'CIS Invoice Generator FAQ',
  faqs: [
    { question: 'Is this CIS invoice generator really free?', answer: 'Yes. There is no signup, no trial that runs out and no watermark. The invoices carry only your own details and design.' },
    { question: 'Does the CIS deduction apply to materials?', answer: 'No. As GOV.UK explains, the deduction is taken from the labour element, not from materials or VAT. Keep them on separate lines.' },
    { question: 'Can a sole trader who is not in CIS use it?', answer: 'Yes. Leave the CIS deduction out and use it as a plain UK invoice with pounds, British dates and an optional VAT number.' },
    { question: 'Do I have to charge VAT?', answer: 'Only if you are VAT-registered, which is required above the turnover threshold. If you are not registered, leave VAT off the invoice.' },
    { question: 'Where do I enter my sort code?', answer: 'Under How to pay, add your bank details and set the code type to Sort code. The invoice prints them for the customer.' },
    { question: 'Does it send anything to HMRC?', answer: 'No. It makes the document only. You still file your own returns, and your contractor handles the deduction statements.' },
    { question: 'Can I download an Excel copy?', answer: 'Yes. The workbook holds the invoice on one sheet and a plain row per line on another, with amounts stored as numbers for your bookkeeper.' },
    { question: 'Where is my information stored?', answer: 'In your browser on this device only. Nothing is uploaded, so export a JSON backup from the editor menu before clearing your browser data.' },
  ],
  related: ['/tools/contractor-invoice-generator', '/tools/quotation-generator', '/tools/invoice-generator'],
  cta: {
    heading: 'Running a team, not just a job?',
    text: 'Nexora’s cloud platform keeps customers, invoices and staff in one place, and every plan starts with a free one-month trial.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'Explore Nexora', to: '/' },
    ],
  },
}

const uae = {
  path: '/tools/uae-vat-invoice-generator',
  appName: 'Nexora Free UAE VAT Invoice Generator',
  breadcrumbName: 'UAE VAT Invoice Generator',
  seo: {
    title: 'Free UAE VAT Invoice Generator — AED, TRN | Nexora',
    description: 'Free UAE VAT invoice generator: make a Tax Invoice in dirhams with your TRN, 5% VAT and bank details, then download a PDF or Excel. No signup needed.',
    keywords: 'UAE VAT invoice generator, tax invoice UAE, free invoice generator UAE, VAT invoice template UAE, invoice in AED, tax invoice with TRN, Dubai invoice template',
  },
  eyebrow: 'Free · Dirhams (AED) · TRN · 5% VAT',
  h1: 'Free UAE VAT Invoice Generator — Tax Invoice in AED',
  valueProp: 'A Tax Invoice in dirhams with your TRN, 5% VAT and bank details, ready in three steps.',
  lead: 'This UAE VAT invoice generator opens already set up for the Emirates: amounts in AED, the title Tax Invoice, a TRN field for you and for your client, and VAT at the standard 5%. Add your lines, check the totals, and download a PDF or Excel file. It suits freelancers, trading companies and shops in Dubai, Abu Dhabi, Sharjah and the other emirates. There is no account to create.',
  preset: { type: 'invoice', region: { code: 'AE', registered: true } },
  toolLabel: 'the UAE VAT invoice generator',
  sections: [
    {
      id: 'three-steps',
      heading: 'UAE VAT Invoice Generator: How It Works in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Your business and TRN', text: 'Enter your trade name, address, phone and email, then your 15-digit Tax Registration Number. Details are saved on this device, so the next invoice starts filled in.' },
            { title: 'Client and lines', text: 'Add the customer, with their TRN if they are VAT-registered, then each product or service with a quantity and a price in dirhams. VAT at 5% is added for you.' },
            { title: 'Payment and download', text: 'Add your IBAN and bank name under How to pay, pick a template, and press Create for PDF, Excel, print, WhatsApp or email.' },
          ],
        },
        { p: 'Your information stays in this browser. Nothing is uploaded, so the tool works for a one-off bill as easily as for a regular customer.' },
      ],
    },
    {
      id: 'what-a-tax-invoice-shows',
      heading: 'What a UAE Tax Invoice Normally Shows',
      tone: 'alt',
      blocks: [
        { p: 'A VAT-registered business in the UAE issues a Tax Invoice for taxable supplies. According to summaries of the Federal Tax Authority’s rules, the document should carry the words Tax Invoice and these details:' },
        {
          list: [
            { title: 'Supplier details', text: 'your name, address and TRN.' },
            { title: 'Customer details', text: 'the buyer’s name and address, and their TRN when they are registered.' },
            { title: 'Each item', text: 'a description, the quantity and the unit price.' },
            { title: 'VAT figures', text: 'the rate, the taxable amount and the VAT amount, shown in AED.' },
            { title: 'Number and dates', text: 'a unique sequential invoice number, the invoice date and the date of supply when it differs.' },
          ],
        },
        { callout: 'We could not open the Federal Tax Authority’s own guide while writing this page, so the list above follows secondary summaries. Check the current requirements on the FTA website or with your tax agent before you rely on it.' },
      ],
    },
    {
      id: 'worked-example',
      heading: 'A Worked Example at 5% VAT',
      blocks: [
        { p: 'Here is a small order with an assumed AED 2,000 of services and VAT at the standard 5%. The tool does the same sum for you.' },
        {
          table: {
            caption: 'Sample Tax Invoice, standard-rated at 5%',
            columns: ['Line', 'Amount'],
            rows: [
              ['Consulting services', 'AED 2,000.00'],
              ['VAT at 5%', 'AED 100.00'],
              ['Invoice total', 'AED 2,100.00'],
            ],
          },
        },
        { p: 'Your own mix of items will differ, so treat the table as an illustration of how the pieces fit, not as advice on what you owe.' },
      ],
    },
    {
      id: 'zero-rated-and-exempt',
      heading: 'Zero-Rated, Exempt and Mixed Invoices',
      tone: 'alt',
      blocks: [
        { p: 'Not every line carries 5%. Some supplies are zero-rated and some are exempt, and an invoice can mix them with standard-rated items. Open the advanced editor to switch VAT off for a single line or to add a second tax at 0%, so each line is taxed the way you intend.' },
        { p: 'The tool applies the rate you choose; it does not decide which treatment a supply deserves. If you are unsure, ask your tax agent or read the FTA guidance for the product or service in question.' },
      ],
    },
    {
      id: 'simplified-invoices',
      heading: 'Simplified Tax Invoices and Credit Notes',
      blocks: [
        { p: 'Summaries of the rules describe a simplified Tax Invoice for retail sales and for smaller business-to-business sales, where the buyer’s details can be left out. Because the buyer is not named, such an invoice generally cannot support the customer’s claim for input VAT. For a business customer who needs to recover VAT, issue a full Tax Invoice with their TRN.' },
        { p: 'If you must correct or cancel a sale, you normally issue a credit note with its own sequential number that refers to the original invoice and gives the reason. Switch the document type to a credit note inside the editor and keep the numbering tidy. Timing rules also apply to when an invoice must be issued, so confirm the current deadline with the FTA.' },
      ],
    },
    {
      id: 'bank-details',
      heading: 'Bank Details, IBAN and Getting Paid',
      tone: 'alt',
      blocks: [
        { p: 'Add your account name, bank, IBAN and SWIFT code under How to pay so customers can transfer without asking. UAE IBANs are printed exactly as you type them. State your payment terms, such as 30 days, on the invoice, and keep one sequential series so your records match what you send.' },
        { p: 'Quote a job first with the [quotation generator](/tools/quotation-generator/), and use the [free invoice generator](/tools/invoice-generator/) when you bill in another currency.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Tool Does Not Do',
      blocks: [
        { callout: 'This is an invoice maker, not accounting or tax software. It does not connect to the Federal Tax Authority, file VAT returns, issue structured e-invoices through an accredited provider or give tax advice. Rules and deadlines change, so confirm them with the FTA or a registered tax agent.' },
      ],
    },
  ],
  faqHeading: 'UAE VAT Invoice Generator FAQ',
  faqs: [
    { question: 'Is this UAE VAT invoice generator free to use?', answer: 'Yes, with no signup, no time limit and no watermark. Your invoices show only your own details and chosen design.' },
    { question: 'Where do I put my TRN?', answer: 'In the seller section of the editor, in the field labelled TRN. The client has a matching TRN field for VAT-registered customers.' },
    { question: 'Is VAT in the UAE always 5%?', answer: 'The standard rate is 5%, but some supplies are zero-rated or exempt. Switch VAT off for a line, or set 0%, when that applies to you.' },
    { question: 'Can I invoice if I am not VAT-registered?', answer: 'Yes. A business that is not registered should not charge VAT. Untick the VAT-registered option and the document is issued as a plain invoice.' },
    { question: 'Can I add an IBAN and SWIFT code?', answer: 'Yes. Add them under How to pay and the invoice prints them for the customer.' },
    { question: 'Does it submit invoices to the FTA?', answer: 'No. It makes the document only. You still file your own returns and follow whatever e-invoicing rules apply to your business.' },
    { question: 'Can my accountant get the figures in a spreadsheet?', answer: 'Yes. Choose Excel when you create the file and each line arrives as a row with numeric amounts, ready to sort or total.' },
    { question: 'Do you keep a copy of my invoices?', answer: 'No. Invoices live in this browser only, so export a JSON backup from the editor menu before you clear site data or change device.' },
  ],
  related: ['/tools/invoice-generator', '/tools/quotation-generator', '/tools/gst-invoice-generator'],
  cta: {
    heading: 'Running a business, not just invoices?',
    text: 'Nexora’s cloud platform keeps customers, invoices and staff in one place, and every plan starts with a free one-month trial.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'Explore Nexora', to: '/' },
    ],
  },
}

const pakistan = {
  path: '/tools/pakistan-invoice-generator',
  appName: 'Nexora Free Pakistan Invoice Generator',
  breadcrumbName: 'Pakistan Invoice Generator',
  seo: {
    title: 'Free Pakistan Invoice Generator — PKR, NTN, STRN | Nexora',
    description: 'Free Pakistan invoice generator: make a sales tax invoice in PKR with your NTN and STRN, then download a PDF or Excel file. No signup, no watermark.',
    keywords: 'pakistan invoice generator, sales tax invoice pakistan, invoice format in pakistan, invoice generator pakistan free, invoice in pkr, ntn strn invoice, freelancer invoice pakistan',
  },
  eyebrow: 'Free · Rupees (PKR) · NTN · STRN · Sales tax',
  h1: 'Free Pakistan Invoice Generator — Sales Tax Invoice in PKR',
  valueProp: 'A sales tax invoice in rupees with your NTN and STRN, ready in three steps.',
  lead: 'This Pakistan invoice generator opens already set up for rupees: amounts in PKR, the title Sales Tax Invoice, an NTN field for you and your client, sales tax at the standard 18% that you can change per line, and totals written out in words with lakh and crore. Add your items, check the tax, and download a PDF or an Excel file. It runs in your browser, with no signup and nothing uploaded.',
  preset: { type: 'invoice', region: { code: 'PK', registered: true } },
  toolLabel: 'the Pakistan invoice generator',
  sections: [
    {
      id: 'three-steps',
      heading: 'Pakistan Invoice Generator: How It Works in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Your business, NTN and STRN', text: 'Enter your business name, address and NTN, and your sales tax registration number if you have one. Add a logo if you like. Details are kept on this device, so the next invoice starts filled in.' },
            { title: 'Customer and items', text: 'Add the customer, with their NTN when they are registered, then each item with a quantity and a price in rupees. Sales tax at 18% is added for you; change the rate or switch it off for a line.' },
            { title: 'Payment and download', text: 'Add your bank, account title and IBAN under How to pay, choose a design, and press Create for PDF, Excel, print, WhatsApp or email.' },
          ],
        },
        { p: 'If you are not registered for sales tax, untick the registered option. The document then loses the Sales Tax Invoice title and the tax line, and becomes a plain invoice.' },
      ],
    },
    {
      id: 'what-it-shows',
      heading: 'What a Sales Tax Invoice Normally Shows',
      tone: 'alt',
      blocks: [
        { p: 'Section 23 of the Sales Tax Act, 1990 says a registered person making a taxable supply of goods issues a serially numbered tax invoice. The version of the Act we could open is a compilation current to October 2009, and it lists these particulars:' },
        {
          list: [
            { title: 'Supplier', text: 'your name, address and registration number.' },
            { title: 'Recipient', text: 'the buyer’s name, address and registration number.' },
            { title: 'Date and number', text: 'the date of issue and a serial number that runs in order.' },
            { title: 'Goods', text: 'a description and the quantity.' },
            { title: 'Values', text: 'the value without tax, the amount of sales tax and the value with tax.' },
          ],
        },
        { callout: 'The Act has been amended many times since that compilation, and FBR can prescribe other formats for particular groups of sellers. Treat this list as a starting point and confirm the current rules on the FBR website or with your tax adviser.' },
      ],
    },
    {
      id: 'worked-example',
      heading: 'A Worked Example at 18%',
      blocks: [
        { p: 'Take an order of three office chairs at PKR 25,000 each. The tool does this sum for every line, and the table shows the result.' },
        {
          table: {
            caption: 'Sample sales tax invoice at an 18% rate',
            columns: ['Line', 'Amount'],
            rows: [
              ['3 office chairs at PKR 25,000', 'PKR 75,000'],
              ['Sales tax at 18%', 'PKR 13,500'],
              ['Invoice total', 'PKR 88,500'],
            ],
          },
        },
        { p: 'The total is also printed in words with lakh and crore, such as eighty-eight thousand five hundred rupees, so the figure is clear on a printed copy. Your own rate and items will differ, so read the table as an illustration, not as advice on what you owe.' },
      ],
    },
    {
      id: 'digital-invoicing',
      heading: 'FBR Digital Invoicing: What This Tool Is Not',
      tone: 'alt',
      blocks: [
        { p: 'FBR’s own FAQ says electronic invoicing is mandatory for registered persons under S.R.O. 709 of 2025. A digital invoice has to be created in the specified structure and sent through a licensed integrator that connects your POS, ERP or other invoicing system to FBR. A PDF, a scan or a copy of a document does not count.' },
        { p: 'This tool makes a document. It does not connect to FBR, fetch a fiscal invoice number or add an FBR QR code. If you are required to issue digital invoices, use your integrated system for those sales. This page remains useful for drafts, for quotations and proforma documents, and for businesses that do not charge sales tax.' },
        { p: 'Check FBR’s current notifications for who must integrate and by when, because the dates and groups have changed more than once.' },
      ],
    },
    {
      id: 'services-and-provinces',
      heading: 'Goods, Services and Provincial Sales Tax',
      blocks: [
        { p: 'The default rate in the tool is the standard 18% on goods, which you can change. Sales tax on services is generally charged under provincial law, with its own authorities, such as the Punjab Revenue Authority, the Sindh Revenue Board, the Khyber Pakhtunkhwa Revenue Authority and the Balochistan Revenue Authority. Their rates and registration rules differ from the federal ones.' },
        { p: 'So a service business should confirm which authority it reports to and which rate applies before it sends an invoice. If you sell both goods and services, open the advanced editor to give each line its own rate.' },
      ],
    },
    {
      id: 'freelancers',
      heading: 'Freelancers, Dollar Invoices and Bank Details',
      tone: 'alt',
      blocks: [
        { p: 'Freelancers and agencies who bill clients abroad can switch the currency from PKR to USD, GBP or any of the other codes without redoing the invoice. How exported services are taxed is a question for your accountant, and the tool simply applies the rate you set, including 0% where that is correct for you.' },
        { p: 'Add your bank, account title and IBAN so the client can pay without asking. A Pakistani IBAN is 24 characters long, starting with PK, and the invoice prints it exactly as you type it. Quote the work first with the [quotation generator](/tools/quotation-generator/), and use the [free invoice generator](/tools/invoice-generator/) for clients who want another format.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Tool Does Not Do',
      blocks: [
        { callout: 'This is an invoice maker, not accounting or tax software. It does not file returns, register you for sales tax, issue FBR digital invoices or give tax advice. Rules and deadlines change, so confirm them with FBR, your provincial authority or a tax adviser.' },
      ],
    },
  ],
  faqHeading: 'Pakistan Invoice Generator FAQ',
  faqs: [
    { question: 'Is this Pakistan invoice generator free?', answer: 'Yes, with no signup, no time limit and no watermark. Your invoices show only your own details and the design you choose.' },
    { question: 'What is the difference between NTN and STRN?', answer: 'The NTN is the National Tax Number used for income tax. A sales tax registration number, often called the STRN, identifies a business registered for sales tax. The tool has fields for both, and you fill in the ones that apply to you.' },
    { question: 'Is this the same as an FBR digital invoice?', answer: 'No. FBR’s digital invoicing is created through an integrated system and carries FBR’s own details. This tool makes a PDF or Excel document and does not connect to FBR.' },
    { question: 'Is sales tax always 18%?', answer: 'The standard federal rate on goods is 18%, but some supplies are taxed differently or exempt, and services follow provincial rules. Change the rate per line, or switch tax off.' },
    { question: 'Can I invoice without a sales tax registration?', answer: 'Yes. Untick the registered option and the document is issued as a plain invoice with no tax line. An unregistered business should not charge sales tax.' },
    { question: 'Can I make an invoice in US dollars?', answer: 'Yes. Change the currency in the editor and the formatting follows. Keep one numbering series for all your invoices so your records match.' },
    { question: 'Are amounts shown in words with lakh and crore?', answer: 'Yes. The total can be written in words using the lakh and crore system, which many Pakistani buyers expect on a printed invoice.' },
    { question: 'Can I download the invoice as an Excel file?', answer: 'Yes. Choose Excel when you create the file and every item arrives as a row with numeric amounts, so a bookkeeper can sort and total them.' },
  ],
  related: ['/tools/invoice-generator', '/tools/quotation-generator', '/tools/proforma-invoice-generator'],
  cta: {
    heading: 'Running a shop or a restaurant, not just invoices?',
    text: 'Nexora’s cloud platform keeps customers, stock, invoices and staff in one place, and every plan starts with a free one-month trial.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'Explore Nexora', to: '/' },
    ],
  },
}

const proforma = {
  path: '/tools/proforma-invoice-generator',
  appName: 'Nexora Free Proforma Invoice Generator',
  breadcrumbName: 'Proforma Invoice Generator',
  seo: {
    title: 'Free Proforma Invoice Generator — PDF & Excel | Nexora',
    description: 'Free proforma invoice generator, no signup: set a validity date and a deposit, download a PDF or Excel file and turn it into a final invoice later.',
    keywords: 'proforma invoice generator, free proforma invoice generator, proforma invoice maker, proforma invoice template, create proforma invoice, proforma invoice pdf, proforma invoice no signup',
  },
  eyebrow: 'Free · No signup · Deposit and validity date',
  h1: 'Free Proforma Invoice Generator — Preview a Sale Before You Bill It',
  valueProp: 'A priced preview of the sale, with a deposit and an expiry date, ready to turn into an invoice.',
  lead: 'This proforma invoice generator builds a priced preview of a sale before the goods ship or the work starts. Add the items, taxes and shipping, set how long the figures hold and ask for a deposit if you need one. Download the result as a PDF or an Excel file. When the buyer pays or confirms, the same document converts into a final invoice without retyping a line.',
  preset: { type: 'proforma' },
  toolLabel: 'the proforma invoice generator',
  sections: [
    {
      id: 'how-to',
      heading: 'How to Make a Proforma Invoice in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Seller, buyer and items', text: 'Enter your details and the buyer’s, then each item with a quantity and unit price. Totals, discounts, taxes and shipping are calculated as you type.' },
            { title: 'Validity and deposit', text: 'Set how long the figures stand, with 30 days offered by default, and add a deposit amount or percentage if you want money up front.' },
            { title: 'Download and send', text: 'Pick a design and press Create for a PDF, an Excel workbook, a printout, or a WhatsApp or email message you can edit before it goes.' },
          ],
        },
      ],
    },
    {
      id: 'what-it-is',
      heading: 'What a Proforma Invoice Is',
      tone: 'alt',
      blocks: [
        { p: 'A proforma invoice is a document that looks like an invoice but is issued before the sale is final. It tells the buyer exactly what they would pay for exactly which goods, so they can approve it, arrange payment or sort out paperwork. It is not usually a demand for payment on its own, and it is generally not the document your tax rules count as the invoice for the sale.' },
        { p: 'Because it is a preview, the numbers can change. If the order changes, make a new proforma with its own number and a fresh date instead of editing one the buyer already holds.' },
      ],
    },
    {
      id: 'when-to-use',
      heading: 'When a Proforma Invoice Helps',
      blocks: [
        {
          list: [
            { title: 'Payment before delivery', text: 'A buyer who must pay in advance, or a seller who wants a deposit, has a document to pay against.' },
            { title: 'Export and import orders', text: 'Buyers, banks and customs offices often ask for a proforma to open a letter of credit, arrange a transfer or declare goods. Ask the party what they need, because requirements differ.' },
            { title: 'Internal approval', text: 'A larger company may need a priced document to approve a purchase before it can raise an order.' },
            { title: 'Made-to-order work', text: 'When materials are bought for one customer, a proforma with a deposit protects the seller.' },
          ],
        },
      ],
    },
    {
      id: 'compare',
      heading: 'Proforma Invoice vs Quotation vs Invoice',
      tone: 'alt',
      blocks: [
        { p: 'The three documents sit at different points in a sale, and mixing them up causes confusion about who owes what and when.' },
        {
          table: {
            caption: 'How the three documents differ',
            columns: ['Document', 'When it is sent', 'What it asks of the buyer'],
            rows: [
              ['Quotation', 'Before the buyer has agreed', 'A decision. It is an offer'],
              ['Proforma invoice', 'After agreement, before delivery', 'Approval or an advance payment'],
              ['Invoice', 'When the sale is made or delivered', 'Payment of the amount due'],
            ],
          },
        },
        { p: 'If the buyer is still deciding, start with the [quotation generator](/tools/quotation-generator/). When the work is finished and you want to be paid, issue a final document from the [free invoice generator](/tools/invoice-generator/).' },
      ],
    },
    {
      id: 'convert',
      heading: 'Turn the Proforma Into a Final Invoice',
      blocks: [
        { p: 'Once the buyer has paid or confirmed, use the convert option in the editor. The items, taxes, discount, shipping and any deposit carry across into a new invoice with its own number, so nothing is retyped and the two documents agree. Your proforma is kept as it was sent.' },
        { p: 'Numbering helps here. Proformas start with the PRO prefix and invoices with INV, each in its own running series such as PRO-2026-0001, so a proforma is never mistaken for a bill.' },
      ],
    },
    {
      id: 'tax-and-limits',
      heading: 'Tax, Currency and What This Tool Does Not Do',
      tone: 'alt',
      blocks: [
        { p: 'You can show taxes and shipping on a proforma so the buyer sees the full cost, in any of more than 160 currencies. Whether a proforma counts as a tax document, and whether you must charge tax at this stage, depends on your country and your supply, so ask your tax adviser before you rely on one for that.' },
        { callout: 'This is a document maker, not accounting software. It does not record payments in a ledger, file returns or give tax or customs advice.' },
      ],
    },
  ],
  faqHeading: 'Proforma Invoice Generator FAQ',
  faqs: [
    { question: 'Is this proforma invoice generator free?', answer: 'Yes, with no signup, no time limit and no watermark. The document carries only your own details and the design you choose.' },
    { question: 'Is a proforma invoice a real invoice?', answer: 'Not usually. It is a preview of the sale issued before delivery or final agreement. The final invoice is what you normally issue for the sale itself, so keep the two clearly separate.' },
    { question: 'Can I ask for a deposit on it?', answer: 'Yes. Add a deposit as an amount or a percentage and the document shows what is due now and what remains.' },
    { question: 'How long is a proforma invoice valid?', answer: 'You choose. The editor starts at 30 days and shows the expiry date on the document, so the buyer knows how long the figures hold.' },
    { question: 'Can I convert it to an invoice later?', answer: 'Yes. Use the convert option and the items, taxes and deposit carry over into a new invoice with its own number.' },
    { question: 'Do customs offices accept a document from this tool?', answer: 'Requirements differ by country and by shipment, so ask the customs office or your freight agent what they need. The tool gives you the items, values and party details such documents usually include.' },
  ],
  related: ['/tools/quotation-generator', '/tools/invoice-generator', '/tools/purchase-order-generator'],
  cta: {
    heading: 'Need more than one-off documents?',
    text: 'Nexora’s cloud platform keeps customers, quotes, invoices and stock in one place, and every plan starts with a free one-month trial.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'Explore Nexora', to: '/' },
    ],
  },
}

const purchaseOrder = {
  path: '/tools/purchase-order-generator',
  appName: 'Nexora Free Purchase Order Generator',
  breadcrumbName: 'Purchase Order Generator',
  seo: {
    title: 'Free Purchase Order Generator – PO in PDF & Excel | Nexora',
    description: 'Free purchase order generator, no signup: list the items you are buying, add a delivery date, payment terms and ship-to address, then get a PDF or Excel.',
    keywords: 'purchase order generator, free purchase order generator, purchase order generator excel, free po generator, purchase order template, create purchase order, purchase order maker, purchase order pdf, online purchase order software',
  },
  eyebrow: 'Free · No signup · Delivery date and terms',
  h1: 'Free Purchase Order Generator — Order From a Supplier in Minutes',
  valueProp: 'A numbered purchase order with items, prices, delivery date and terms, ready to send to your supplier.',
  lead: 'This purchase order generator writes down what you are buying, from whom, at what price and by when. Enter your supplier, add the items and unit prices, set the delivery date and payment terms, and name the address the goods should go to. Download a PDF or an Excel file for the supplier. Everything runs in your browser, with no signup and nothing uploaded.',
  preset: { type: 'purchase_order' },
  toolLabel: 'the purchase order generator',
  sections: [
    {
      id: 'how-to',
      heading: 'How to Create a Purchase Order in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Buyer and vendor', text: 'Enter your business as the buyer and your supplier as the vendor. Both are saved on this device, so repeat orders start filled in.' },
            { title: 'Items, delivery and terms', text: 'Add each item with a quantity and an agreed unit price, then the delivery date, the ship-to address and the payment terms, which start at 30 days.' },
            { title: 'Number and send', text: 'The order gets the next number in your PO series. Press Create for a PDF, an Excel workbook, a printout, or a WhatsApp or email message.' },
          ],
        },
      ],
    },
    {
      id: 'what-it-is',
      heading: 'What a Purchase Order Does',
      tone: 'alt',
      blocks: [
        { p: 'A purchase order is the buyer’s written instruction to a supplier to deliver certain goods or services at agreed prices. Once the supplier accepts it, it normally becomes the record both sides check against: what was ordered, what arrived, and what was billed.' },
        { p: 'It protects the buyer from paying for something never ordered, and it protects the supplier from a dispute about quantity or price. That is why many companies will not pay an invoice that does not quote a PO number.' },
      ],
    },
    {
      id: 'what-to-include',
      heading: 'What to Put on a Purchase Order',
      blocks: [
        {
          list: [
            { title: 'A unique PO number', text: 'The tool numbers orders for you, such as PO-2026-0001, and keeps the series running.' },
            { title: 'Both parties', text: 'The buyer’s and the vendor’s names, addresses and contact details.' },
            { title: 'Item lines', text: 'A clear description, the quantity and the agreed unit price for each line.' },
            { title: 'Delivery', text: 'The date you need the goods and the address they should reach, if it differs from your office.' },
            { title: 'Terms', text: 'Payment terms, tax, shipping charges and any note the supplier must follow.' },
          ],
        },
        { callout: 'A purchase order is only as clear as its descriptions. Include model numbers, sizes and units so that the supplier ships exactly what you meant.' },
      ],
    },
    {
      id: 'three-way',
      heading: 'Purchase Order, Delivery Note and Invoice',
      tone: 'alt',
      blocks: [
        { p: 'Finance teams often compare three documents before paying: the purchase order says what was ordered, the delivery note says what arrived, and the invoice says what is being billed. If the three agree, the invoice is paid. If they differ, someone asks why.' },
        {
          table: {
            caption: 'The three documents in a purchase',
            columns: ['Document', 'Written by', 'Answers'],
            rows: [
              ['Purchase order', 'The buyer', 'What did we ask for, and at what price?'],
              ['Delivery note', 'The supplier', 'What was actually sent?'],
              ['Invoice', 'The supplier', 'What are we being asked to pay?'],
            ],
          },
        },
        { p: 'A supplier who receives a PO can turn it into an invoice in the editor, so the items and prices on the bill match the order. If you sell rather than buy, the [free invoice generator](/tools/invoice-generator/) is the starting point, and the [delivery note generator](/tools/delivery-note-generator/) makes the slip that goes with the goods.' },
      ],
    },
    {
      id: 'before-the-order',
      heading: 'Before You Place the Order',
      blocks: [
        { p: 'A PO usually follows a price you have already agreed. If you have a supplier’s offer, check it against the order line by line. If a supplier needs payment first, they may send you a [proforma invoice](/tools/proforma-invoice-generator/) to approve before they ship.' },
        { p: 'Keep a copy of every order you send, and export a JSON backup from the editor menu now and then. The tool stores documents only in your own browser, so clearing site data would remove them.' },
        { p: 'Agree changes in writing. If the quantity, the price or the delivery date moves after the order is sent, issue a revised purchase order with a new number or a clear revision note, and tell the supplier which one replaces the earlier order. That keeps both sides working from the same page, and it gives your finance team one document to match against the invoice.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Tool Does Not Do',
      tone: 'alt',
      blocks: [
        { callout: 'This is a document maker, not procurement software. It does not track deliveries, approve spending, match invoices automatically or send orders to your supplier’s system. A signed or accepted PO can have legal effect, so use wording your business is comfortable with.' },
      ],
    },
  ],
  faqHeading: 'Purchase Order Generator FAQ',
  faqs: [
    { question: 'Is this purchase order generator free?', answer: 'Yes, with no signup, no time limit and no watermark. The order shows only your own details and the design you choose.' },
    { question: 'What is a PO number for?', answer: 'It is the reference both sides quote on later documents. Suppliers print it on the delivery note and the invoice, and the buyer’s finance team uses it to match the bill to the order.' },
    { question: 'Who writes the purchase order, the buyer or the seller?', answer: 'The buyer. The supplier answers it with an acceptance, a delivery note and finally an invoice.' },
    { question: 'Can I add tax and shipping to a PO?', answer: 'Yes. Add tax at the rate that applies, plus shipping or other fees, and the order total includes them so the supplier sees the full amount.' },
    { question: 'Can a supplier turn my PO into an invoice?', answer: 'Yes. The editor can convert a purchase order into an invoice, carrying the items and prices across so the bill matches the order.' },
    { question: 'Can I send the order as a spreadsheet?', answer: 'Yes. Choose Excel when you create the file and every line arrives as a row with numeric quantities and prices.' },
    { question: 'Is this purchase order software, or just a template?', answer: 'It sits in between. Unlike a blank purchase order template, it numbers each PO, adds up line totals, tax and shipping for you, and remembers the parties you have used before on this device. Unlike online purchase order software, it has no approval workflow, supplier portal or stock update: each PO is a PDF or Excel file that you send to the supplier yourself.' },
    { question: 'Is a purchase order legally binding?', answer: 'It can be, once the supplier accepts it, and the rules depend on your country and your terms. If the order is large, have its wording checked by someone qualified.' },
  ],
  related: ['/tools/proforma-invoice-generator', '/tools/invoice-generator', '/tools/quotation-generator'],
  cta: {
    heading: 'Buying and selling every day?',
    text: 'Nexora’s cloud platform tracks stock, suppliers, customers and invoices in one place, and every plan starts with a free one-month trial.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'Explore Nexora', to: '/' },
    ],
  },
}

const deliveryNote = {
  path: '/tools/delivery-note-generator',
  appName: 'Nexora Free Delivery Note Generator',
  breadcrumbName: 'Delivery Note Generator',
  seo: {
    title: 'Free Delivery Note Generator – Delivery Note PDF | Nexora',
    description: 'Free delivery note generator, no signup: list the goods and quantities, add the delivery address, date and order number, then download a PDF or Excel.',
    keywords: 'delivery note generator, free delivery note generator, delivery note template, delivery note maker, delivery note pdf, delivery note download pdf, goods delivery note, delivery challan, delivery receipt template, proof of delivery form',
  },
  eyebrow: 'Free · No signup · Quantities only, no prices',
  h1: 'Free Delivery Note Generator — Send Goods With a Clear Paper Trail',
  valueProp: 'A numbered delivery note that lists what is in the shipment, where it is going and which order it belongs to.',
  lead: 'This delivery note generator makes the slip that travels with your goods. Enter the customer, the delivery address and the order number, list each item with its quantity, and add the delivery date. The note shows no prices, so the person receiving the boxes sees only what they should count. Download a PDF to print for the driver or an Excel file for the warehouse, with no signup and nothing uploaded.',
  preset: { type: 'delivery_note' },
  toolLabel: 'the delivery note generator',
  sections: [
    {
      id: 'how-to',
      heading: 'How to Make a Delivery Note in 3 Steps',
      blocks: [
        {
          steps: [
            { title: 'Your business', text: 'Add your company name, address, phone and logo once. They are remembered in this browser, so the next note starts ready.' },
            { title: 'Customer and goods', text: 'Choose who receives the shipment, then type each item with its quantity. Price fields are hidden for this document type, and units such as pcs, cartons or kg can be added in the full editor.' },
            { title: 'Design and download', text: 'Pick a template and a colour, set the delivery date and the order number, then create a PDF, an Excel sheet or a printout, or share it on WhatsApp or by email.' },
          ],
        },
      ],
    },
    {
      id: 'what-it-is',
      heading: 'What Is a Delivery Note?',
      tone: 'alt',
      blocks: [
        { p: 'A delivery note is a short document that goes with a shipment and says what is inside it. The seller or the carrier prints it, the receiver checks the goods against it, and both sides keep a copy. It is also called a goods delivery note, a delivery docket, a dispatch note or, in parts of South Asia, a delivery challan.' },
        { p: 'Its job is counting, not billing. Because it carries no prices, it can be handed to a driver, a store keeper or a site supervisor without showing them what the customer paid. The money side stays on the invoice, which is sent separately to the person who pays it.' },
      ],
    },
    {
      id: 'fields',
      heading: 'What This Delivery Note Template Includes',
      blocks: [
        {
          list: [
            { title: 'A running number', text: 'Each note is numbered in its own series, such as DN-2026-0001, separate from your invoices.' },
            { title: 'Sender and receiver', text: 'Your business under From and the customer under Deliver to, with a separate drop-off address when the goods go somewhere else, such as a branch or a building site.' },
            { title: 'Order number', text: 'A reference field labelled Order no., for the customer’s purchase order or your own sales order number.' },
            { title: 'Delivery date', text: 'The date the goods leave or are due to arrive, printed in the header.' },
            { title: 'Item lines', text: 'Description, quantity and unit for every line. No unit price, tax or total is shown.' },
            { title: 'Notes and sign-off', text: 'Handling instructions in the notes, plus a drawn signature, a company stamp and a signatory name if you want them.' },
          ],
        },
        { callout: 'Write descriptions the receiver can check by eye: size, colour, model or batch, and the unit you counted in. “10 cartons of 24” is clearer than “240”.' },
      ],
    },
    {
      id: 'from-invoice',
      heading: 'Turn an Invoice Into a Delivery Note',
      tone: 'alt',
      blocks: [
        { p: 'If you have already billed the customer in the [free invoice generator](/tools/invoice-generator/), you do not need to type the items twice. Open the invoice, choose Convert to and pick Delivery Note. The editor copies the customer and the lines into a new delivery note and removes prices, taxes and payments. The invoice itself is kept as it was.' },
        {
          table: {
            caption: 'What moves across when an invoice becomes a delivery note',
            columns: ['Part of the invoice', 'On the delivery note'],
            rows: [
              ['Customer and address', 'Kept'],
              ['Item descriptions and quantities', 'Kept'],
              ['Unit prices, discounts and taxes', 'Removed'],
              ['Payments and balance due', 'Removed'],
              ['Document number', 'A new number in the DN series'],
            ],
          },
        },
      ],
    },
    {
      id: 'proof-of-delivery',
      heading: 'Using the Note as Proof of Delivery',
      blocks: [
        { p: 'Print two copies. The driver hands one to the customer and brings the other back signed, with the receiver’s name and the date written beside the signature. If something is missing or damaged, the receiver writes it on that copy before signing. That signed sheet is your proof that the goods arrived, and it settles most later arguments about what was delivered.' },
        { p: 'You can change the caption under the signature line in the editor, for example to Received by, so the printed copy tells the receiver where to sign. For deliveries split over several trips, make one note per trip and mention the earlier note numbers in the notes field.' },
        { p: 'Keep the signed copies in the same order as the note numbers. When a customer queries an invoice weeks later, a numbered, signed note is far quicker to find than a photo in someone’s phone.' },
      ],
    },
    {
      id: 'compare',
      heading: 'Delivery Note vs Packing Slip vs Invoice',
      tone: 'alt',
      blocks: [
        { p: 'These three are easy to mix up because they often list the same items. A packing slip is packed inside the box and lists what that one parcel holds. A delivery note covers the whole delivery and is signed when it is handed over. An invoice asks for money. Many small businesses use the delivery note for both of the first two jobs.' },
        { p: 'If your customer sends you a purchase order first, put its number in the Order no. field. When you need to bill for goods, use the invoice; when a buyer needs to order from you, they can use the [purchase order generator](/tools/purchase-order-generator/). For a till-style slip at a counter, the [thermal receipt generator](/tools/thermal-receipt-generator/) is the better fit.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Tool Does Not Do',
      blocks: [
        { callout: 'This is a document maker, not a delivery or stock system. It does not track drivers, reduce stock, collect e-signatures or send anything on its own. Notes are saved only in this browser, so export a JSON backup from the editor menu if you need a copy elsewhere.' },
      ],
    },
  ],
  faqHeading: 'Delivery Note Generator FAQ',
  faqs: [
    { question: 'Is this delivery note generator free?', answer: 'Yes. There is no signup, no limit on how many notes you make and no watermark. The PDF shows only your business details and the template you pick.' },
    { question: 'Why does a delivery note have no prices?', answer: 'Because it is read by people who handle the goods, not by the person who pays. Leaving prices off keeps the cost private and makes the note faster to check against the boxes.' },
    { question: 'Can I download the delivery note as a PDF?', answer: 'Yes. Press Create and choose PDF. You can also print it straight from the browser, save an Excel copy of the item list, or share it on WhatsApp or by email.' },
    { question: 'What is a delivery challan?', answer: 'It is the name used in India and nearby countries for the same document: a note that goes with goods and lists what is being sent. Some tax systems give the challan extra rules, so check what yours requires.' },
    { question: 'Who signs a delivery note?', answer: 'Usually the sender signs or stamps it before dispatch, and the receiver signs a copy when the goods arrive. The signed copy that comes back is the proof of delivery.' },
    { question: 'Can I show a different delivery address from the customer’s address?', answer: 'Yes. Switch on the different shipping address option and enter the drop-off location, such as a warehouse, a branch or a site, while the customer’s main address stays as it is.' },
    { question: 'Can I make a delivery note from an existing invoice?', answer: 'Yes. Open the invoice in the editor, choose Convert to and then Delivery Note. The items and customer carry over and the money fields are dropped, so nothing has to be typed again.' },
    { question: 'Where are my delivery notes stored?', answer: 'In your own browser on this device. Nothing is uploaded to a server. Clearing site data removes them, so download the files or export a JSON backup first.' },
  ],
  related: ['/tools/invoice-generator', '/tools/purchase-order-generator', '/tools/thermal-receipt-generator'],
  cta: {
    heading: 'Shipping orders every day?',
    text: 'Nexora’s cloud platform keeps customers, stock and invoices together, so deliveries and billing come from the same records. Every plan starts with a free one-month trial.',
    links: [
      { label: 'CRM invoicing', to: '/crm/invoices', primary: true },
      { label: 'Explore Nexora', to: '/' },
    ],
  },
}

const paystub = {
  path: '/tools/pay-stub-generator',
  appName: 'Nexora Pay Stub Generator',
  breadcrumbName: 'Pay Stub Generator',
  seo: {
    title: 'Free Pay Stub Generator, No Watermark – Payslip PDF | Nexora',
    description: 'Free pay stub generator with no watermark: make a paycheck stub or payslip with overtime, deductions, YTD and net pay. Download PDF, Excel or PNG.',
    keywords: 'free pay stub generator, free paystub generator no watermark, paycheck stub generator, check stub maker with calculator, payslip generator, pay stub template, salary slip maker, pay stub with overtime, payslip PDF, earnings statement, net pay calculator',
  },
  eyebrow: 'Free · Pay stub, payslip & salary slip · No signup',
  h1: 'Free Pay Stub Generator: Make a Payslip in Minutes',
  valueProp: 'Enter earnings and deductions, watch gross pay and net pay add up as you type, then download a clean PDF.',
  lead: 'This free pay stub generator turns a few pay details into a clear earnings statement for one pay period: employer and employee details, pay date, hourly or fixed earnings, overtime, bonuses, deductions, year-to-date totals and take-home pay. Pick a payslip template, add your logo and download a PDF, PNG or Excel file. It works for any currency and any country, because you type your own tax rates instead of relying on a built-in tax table.',
  preset: { tool: 'pay-stub' },
  toolLabel: 'the free pay stub generator',
  sections: [
    {
      id: 'how-to-make-a-pay-stub',
      heading: 'How to Make a Pay Stub in Five Steps',
      blocks: [
        {
          steps: [
            { title: 'Choose a design', text: 'Pick one of four templates, a brand colour and A4 or US Letter paper. You can also rename the document to Payslip, Salary Slip, Earnings Statement or Wage Statement.' },
            { title: 'Add employer and employee', text: 'Enter the company name, address and logo, then the employee’s name, ID, job title and department. Show only the last four digits of any national ID.' },
            { title: 'Set the pay period', text: 'Choose weekly, every two weeks, twice a month or monthly. The period start, period end and pay date fill in for you, and you can change any of them.' },
            { title: 'Enter earnings and deductions', text: 'Add regular pay, overtime, bonuses and allowances, then income tax, social security, pension or insurance. Each line is a fixed amount or a percentage of gross pay.' },
            { title: 'Download or share', text: 'Download the PDF, save a PNG image or an Excel file, print it, or send it by WhatsApp or email. Totals are checked as you type.' },
          ],
        },
        { p: 'The preview beside the form is the same layout that ends up in the file, so you can check every line before you download the payslip.' },
      ],
    },
    {
      id: 'what-is-on-a-pay-stub',
      heading: 'What Is on a Pay Stub? Every Field Explained',
      tone: 'alt',
      blocks: [
        { p: 'A pay stub, also called a payslip or wage statement, is the record that comes with a payment. It tells the employee how the money was worked out. The generator has a place for each part:' },
        {
          list: [
            { title: 'Employer and employee details', text: 'names, addresses, an employee ID and a job title, so the document is easy to match to a payroll file.' },
            { title: 'Pay period and pay date', text: 'the dates the work covers and the day the money was paid, plus how often staff are paid.' },
            { title: 'Gross pay', text: 'everything earned before anything is taken out: salary, hours worked, overtime, bonus, commission or tips.' },
            { title: 'Deductions', text: 'amounts withheld, such as income tax, social security or national insurance, pension contributions, health cover or a loan repayment.' },
            { title: 'Net pay', text: 'the take-home amount, which is gross pay minus total deductions. The tool also writes it out in words.' },
            { title: 'Year-to-date (YTD) totals', text: 'running totals since the start of the tax year, shown in a separate column when you switch it on.' },
            { title: 'Employer contributions', text: 'costs the employer pays on top of wages, listed apart from the employee’s deductions.' },
          ],
        },
      ],
    },
    {
      id: 'gross-to-net-example',
      heading: 'From Gross Pay to Net Pay: A Worked Example',
      blocks: [
        { p: 'Here is a monthly stub with assumed figures in US dollars. The rates are made up for the illustration; use the ones your own payroll applies.' },
        {
          table: {
            caption: 'Sample monthly pay stub, gross pay to net pay',
            columns: ['Line', 'How it is worked out', 'Amount'],
            rows: [
              ['Regular pay', '160 hours × $25.00', '$4,000.00'],
              ['Overtime', '8 hours × $25.00 × 1.5', '$300.00'],
              ['Bonus', 'Fixed amount', '$200.00'],
              ['Gross pay', 'Sum of earnings', '$4,500.00'],
              ['Income tax withholding', '12% of gross pay', '$540.00'],
              ['Pension contribution', '5% of gross pay', '$225.00'],
              ['Health insurance', 'Fixed amount', '$150.00'],
              ['Total deductions', 'Sum of deductions', '$915.00'],
              ['Net pay', 'Gross pay minus deductions', '$3,585.00'],
            ],
          },
        },
        { p: 'Percentages are taken from gross pay and rounded to the smallest unit of the currency, so the lines always add up to the totals shown.' },
      ],
    },
    {
      id: 'hourly-overtime-bonus',
      heading: 'Hourly Pay, Overtime, Bonuses and Allowances',
      tone: 'alt',
      blocks: [
        { p: 'Each earnings line can be a fixed amount or hours multiplied by a rate. For overtime, keep the normal hourly rate and set the multiplier: 1.5 for time and a half, 2 for double time. The line shows its own working, such as 8 hrs × $25.00 × 1.5, so the employee can see where the figure came from.' },
        { p: 'Bonuses, commission, tips, holiday pay and allowances are fixed-amount lines. The quick-add buttons under Earnings create them with the label filled in. You can have up to twenty lines in each section.' },
      ],
    },
    {
      id: 'deductions-and-ytd',
      heading: 'Deductions, Withholding and Year-to-Date Totals',
      blocks: [
        { p: 'Deductions are typed in rather than looked up. Set a percentage of gross pay for items such as income tax withholding or pension, and a fixed amount for items such as health insurance or union dues. Because the tool holds no tax tables, it behaves the same in every country and never goes out of date when rates change.' },
        { p: 'Year-to-date figures are entered by you, line by line, because the tool keeps no payroll history. Switch on the YTD column, type the running total for each earning or deduction, and the stub shows it beside the current amount along with a year-to-date net figure.' },
        { callout: 'This is a document maker, not payroll software. It does not work out statutory tax, file returns or pay anyone, so take the rates and the filing rules from your payroll provider or tax adviser.' },
      ],
    },
    {
      id: 'payslip-vs-pay-stub',
      heading: 'Pay Stub vs Payslip vs Salary Slip',
      tone: 'alt',
      blocks: [
        { p: 'They are the same document with different names. Pay stub is the usual word in the United States, payslip in the UK and much of Europe, and salary slip across South Asia and the Gulf. Choose the heading your staff expect from the document name menu; the layout and fields stay the same.' },
        { p: 'Whatever you call it, keep one stub per employee per pay period and a consistent file name. The download is named after the document, the employee and the pay date, which keeps a folder of PDFs easy to search.' },
      ],
    },
    {
      id: 'who-uses-it',
      heading: 'Who Can Use a Pay Stub Generator?',
      blocks: [
        {
          list: [
            { title: 'Small business owners', text: 'with a handful of employees who need a tidy statement for each payday without buying payroll software.' },
            { title: 'Household and domestic employers', text: 'who pay a nanny, carer or cleaner and want a written record of each payment.' },
            { title: 'Office managers and HR assistants', text: 'preparing stubs from a payroll sheet, with an Excel copy for the finance team.' },
            { title: 'Contractors and the self-employed', text: 'who keep a record of their own draw or of what they pay a helper. A statement you write for yourself is not an employer-issued payroll record, so a lender or landlord may ask for tax returns or bank statements instead.' },
          ],
        },
        { p: 'When you invoice a client rather than pay a worker, use the [free invoice generator](/tools/invoice-generator/) or the [contractor invoice generator](/tools/contractor-invoice-generator/).' },
      ],
    },
    {
      id: 'accurate-and-private',
      heading: 'Keeping Pay Records Accurate and Private',
      tone: 'alt',
      blocks: [
        { p: 'Pay data is personal. The stub is drawn in your browser, the draft is kept in this browser only, and the PDF, PNG and Excel files are built on your device rather than sent to a server. Clearing your browser’s site data removes the draft, so use the backup button in the editor if you want a copy.' },
        { callout: 'Only make stubs that match real payments. Changing figures to misstate someone’s income can be fraud, and this tool is meant for genuine payroll records.' },
      ],
    },
  ],
  faqHeading: 'Free Pay Stub Generator FAQ',
  faqs: [
    { question: 'Is this pay stub generator really free?', answer: 'Yes. There is no signup, no trial that runs out and no watermark on the PDF, PNG or Excel file. Only your own details and chosen design appear on the document.' },
    { question: 'Can I add overtime, bonuses and commission to a payslip?', answer: 'Yes. Add an earnings line for each. Overtime uses hours, an hourly rate and a multiplier such as 1.5, and bonuses or commission are fixed amounts. Every line is added into gross pay.' },
    { question: 'Does it calculate income tax or social security for me?', answer: 'No. It contains no tax tables. You type the percentage or the amount your payroll uses for each deduction, and the tool does the arithmetic and shows the net pay.' },
    { question: 'Where is the pay stub data saved?', answer: 'Only in your browser on this device, as a draft that comes back when you return. Nothing is uploaded for conversion. Clearing site data deletes the draft, so download the PDF or use the backup button first.' },
    { question: 'Can I use it outside the United States?', answer: 'Yes. Pick any currency your browser lists, choose A4 or US Letter paper, and rename the document to Payslip or Salary Slip. The amount in words is written in English.' },
    { question: 'How do I show year-to-date totals?', answer: 'Switch on the YTD column in the earnings section, then enter the running total for each earning and deduction. The stub prints them beside the current amounts.' },
    { question: 'Can I use it as free payroll software for all my staff?', answer: 'It makes one pay stub at a time, so it suits a single employee, a small team or a contractor better than a full payroll run. It keeps no staff list, does not file tax returns and does not pay anyone, and it uses the tax rates you type in. For each paycheck stub you enter the hours, rates and deductions, check the net pay it calculates and download the PDF.' },
    { question: 'Can a self-employed pay stub prove my income?', answer: 'Usually not on its own. A lender, landlord or tax office normally wants documents from an independent source, such as tax returns or bank statements, so ask what they accept before you rely on a stub you made yourself.' },
  ],
  related: ['/tools/invoice-generator', '/tools/contractor-invoice-generator', '/tools/quotation-generator'],
  cta: {
    heading: 'Paying a team every month?',
    text: 'The free tool makes one stub at a time. Nexora’s cloud platform keeps customers, invoices and staff accounts in one place, and every plan starts with a free one-month trial.',
    links: [
      { label: 'Explore Nexora', to: '/', primary: true },
      { label: 'See pricing', to: '/pricing' },
    ],
  },
}

export const TOOLS_HUB_CONTENT = hub

/** The tool landing pages, by path (no trailing slash). */
export const TOOL_PAGE_CONTENT = Object.freeze({
  [invoice.path]: invoice,
  [gst.path]: gst,
  [contractor.path]: contractor,
  [cis.path]: cis,
  [uae.path]: uae,
  [thermal.path]: thermal,
  [letterhead.path]: letterhead,
  [quotation.path]: quotation,
  [paystub.path]: paystub,
  [pakistan.path]: pakistan,
  [proforma.path]: proforma,
  [purchaseOrder.path]: purchaseOrder,
  [deliveryNote.path]: deliveryNote,
})

/** Hub + tool pages, by path. */
export const TOOLS_PAGES = Object.freeze({ [hub.path]: hub, ...TOOL_PAGE_CONTENT })

/** Plain text of an inline-markup string ([label](/path/) → label). */
export function plainText(text) {
  return String(text || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}
