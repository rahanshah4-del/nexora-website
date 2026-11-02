/**
 * Long-form help sections for the platform articles (Inventory, Team & Permissions,
 * Reports, Email Marketing). Pure data, appended after the short fact-based sections
 * by platformArticle() in helpCenterData.js.
 *
 * Accuracy rule (same as helpCenterData.js): every statement here is taken from what the
 * app actually ships - report names from src/crm/lib/reportCatalog.js, role presets from
 * src/crm/pages/Team.jsx, stock movement types from src/crm/pages/Inventory.jsx. Where a
 * feature is not live yet (email campaigns), the article says so plainly.
 */

export const PLATFORM_EXTRA_SECTIONS = {
  'inventory-management': [
    {
      id: 'who-needs-it',
      heading: 'Who Needs Inventory Management Software',
      blocks: [
        { p: 'Stock problems rarely announce themselves. A shop owner finds out a best-seller is gone when a customer asks for it. A medical store finds out a supplier was overpaid when the monthly statement does not match. A wholesaler finds out the warehouse count and the register disagree only at year end. Inventory management software exists to move those discoveries from "too late" to "this morning".' },
        { p: 'Nexora’s inventory workspace is built for businesses that buy goods and sell them again: retail shops and supermarkets, pharmacies and medical stores, wholesalers, restaurants that track food stock, and small warehouses. If your day involves a product list, a supplier you call to reorder, and a number on a shelf that must match a number on a screen, this is the part of Nexora that does that job.' },
        { p: 'It is also included inside the point-of-sale products. When a cashier completes a sale in Retail POS or Pharmacy POS, the stock for those items goes down without anyone typing it twice. You do not need a separate stock system running beside your billing system.' },
      ],
    },
    {
      id: 'set-up-products',
      heading: 'Step by Step: Setting Up Your Product Catalog',
      blocks: [
        { p: 'A clean product list is the foundation of everything else. Spend an hour on it once and every report afterwards becomes trustworthy.' },
        {
          steps: [
            { title: 'Create categories first', text: 'Open Categories and add the groups you actually think in, such as Beverages, Dairy, Stationery or Antibiotics. Categories let you filter the catalog and report on a group instead of scrolling through hundreds of items.' },
            { title: 'Add each product with a name, SKU and barcode', text: 'Give every product a clear name, an SKU you will recognise and, if you scan at the counter, its barcode. A consistent naming style ("Lays Masala 50g", not "lays masla") keeps search fast and stops duplicates.' },
            { title: 'Enter cost price and selling price', text: 'Record what you pay and what you charge. Nexora uses the cost price for inventory value and product profitability reports, so leave neither blank if you want accurate margins.' },
            { title: 'Set a minimum stock alert', text: 'Pick the quantity at which you want a warning. Think about lead time: if a supplier needs three days to deliver and you sell ten units a day, an alert at 30 gives you breathing room.' },
            { title: 'Record the opening stock', text: 'Add the quantity you hold today as an Opening movement. This gives the stock history a clear starting line so later movements add up.' },
          ],
        },
        { callout: 'Importing hundreds of items at once is tempting. Start with your fifty fastest-moving products instead, confirm that counts match the shelf, then add the rest. Errors are far easier to spot in a short list.' },
      ],
    },
    {
      id: 'stock-movements',
      heading: 'How Stock Movements Work',
      blocks: [
        { p: 'Nexora does not just store one number per product. Every change in quantity is saved as a movement with a type, a date and a reason, so you can always answer the question "why is the count what it is?". The movement types in the Stock screen are:' },
        {
          list: [
            { title: 'Stock In', text: 'Goods received from a supplier or added after a purchase. Raises the quantity.' },
            { title: 'Stock Out', text: 'Goods that leave for any reason other than a normal sale, for example samples or internal use. Lowers the quantity.' },
            { title: 'Adjustment', text: 'A correction after a physical count. Use this when the shelf and the screen disagree, and write a short reason so the next person understands.' },
            { title: 'Opening', text: 'The starting quantity when you first set up a product or begin a new period.' },
            { title: 'Damaged', text: 'Broken, spoiled or expired goods you can no longer sell. Keeping these separate from adjustments shows you how much loss you really have.' },
            { title: 'Returned', text: 'Items brought back by customers that go back into stock.' },
            { title: 'Transfer', text: 'Stock that moves between locations, such as from the warehouse to the shop floor.' },
          ],
        },
        { p: 'Because damage and returns have their own types, your Stock Movement report tells a story. A rising "Damaged" total on one product is a signal to check storage or the supplier, something a single running quantity would hide.' },
      ],
    },
    {
      id: 'low-stock-reorder',
      heading: 'Low Stock Alerts and Reordering',
      blocks: [
        { p: 'The Inventory dashboard counts how many products have fallen to or below their minimum stock alert, and the Low Stock report lists exactly which ones. The idea is simple: look at that list at the start of the day, call the supplier, and place the order before the shelf is empty.' },
        { p: 'A few habits make the alert far more useful than a default number would:' },
        {
          list: [
            { title: 'Base the alert on speed of sale', text: 'A product that sells ten a day needs a higher alert than one that sells ten a month, even if both are cheap.' },
            { title: 'Add lead time', text: 'Count the days between calling a supplier and receiving goods. The alert should cover at least that many days of sales.' },
            { title: 'Review seasonal items', text: 'Raise alerts before Ramadan, Eid, wedding season or exam months, and lower them afterwards so you do not overstock.' },
            { title: 'Check the list weekly', text: 'Even with a good alert, a weekly look at the Low Stock report catches anything that was set too low.' },
          ],
        },
      ],
    },
    {
      id: 'suppliers-purchases',
      heading: 'Suppliers, Purchase Orders and Payments',
      blocks: [
        { p: 'Buying is half of inventory. Nexora keeps a Suppliers list with contact details and a Purchases screen where you record what you ordered and received. That gives you one place to see who you buy from, what you bought, what you paid and what you still owe.' },
        {
          steps: [
            { title: 'Add the supplier', text: 'Save the name, phone and any notes. Having the number next to the order saves a search through your contacts.' },
            { title: 'Record the purchase', text: 'Choose the supplier, add the products and quantities, and enter the cost. When goods arrive, the stock goes up by the received quantity.' },
            { title: 'Track what you owe', text: 'Record payments against the purchase. The Supplier Due report shows the outstanding balance per supplier, and the Supplier Statement shows the full history.' },
            { title: 'Handle returns', text: 'If goods go back to a supplier, record a purchase return so stock and the supplier balance stay correct. The Purchase Returns report lists them.' },
          ],
        },
        { p: 'Over a few months this history shows you which supplier is cheapest for which product and which one is often late, which is exactly the information you need when negotiating.' },
      ],
    },
    {
      id: 'inventory-reports',
      heading: 'Inventory Reports You Can Run',
      blocks: [
        { p: 'Nexora’s report centre includes a group of inventory reports that you can filter by category or product, and export or print. The ones owners use most are:' },
        {
          list: [
            { title: 'Stock Summary', text: 'Current quantity, value and status for every product.' },
            { title: 'Stock Movement', text: 'Every stock in, out, adjustment, damage, return and transfer, with a date range filter, as an audit trail.' },
            { title: 'Low Stock', text: 'Products at or below their minimum alert, ready to turn into a purchase.' },
            { title: 'Inventory Value', text: 'The total value of your stock at cost price and at retail price.' },
            { title: 'Product Profitability', text: 'Cost against selling price per product, with profit and margin percentage.' },
            { title: 'Sales Returns', text: 'Items customers returned and how they went back to stock.' },
          ],
        },
        { p: 'Inventory Value is the one your accountant will ask for at month end, and Product Profitability is the one that quietly changes pricing decisions. Many owners discover that a product they push hard earns far less per unit than a quiet one on the next shelf.' },
      ],
    },
    {
      id: 'by-business-type',
      heading: 'Inventory for Different Kinds of Business',
      blocks: [
        {
          list: [
            { title: 'Retail shops and supermarkets', text: 'Barcode scanning at the counter, category filters and daily low-stock review. Every sale reduces stock automatically.', to: '/retail-pos' },
            { title: 'Pharmacies and medical stores', text: 'Medicine stock with batch and expiry tracking, supplier purchases and a daily report, so near-expiry items are sold first or returned in time.', to: '/pharmacy-pos' },
            { title: 'Restaurants and cafes', text: 'Food stock alongside menu and kitchen workflows, so ingredients do not run out in the middle of service.', to: '/restaurant-pos' },
            { title: 'Wholesalers and small warehouses', text: 'Larger quantities, supplier dues and transfers between locations, with cloud sync so the office and the warehouse see the same numbers.' },
          ],
        },
      ],
    },
    {
      id: 'stock-take-routine',
      heading: 'A Simple Routine That Keeps Counts Accurate',
      blocks: [
        { p: 'Software cannot stop a box from being miscounted, but a routine can catch it quickly. Owners who keep accurate stock tend to do a few small things consistently:' },
        {
          steps: [
            { title: 'Count a small slice every week', text: 'Pick one category or shelf, count it and compare it with the screen. Fix differences with an Adjustment and a short note.' },
            { title: 'Receive goods against the order', text: 'Check delivered quantities against the purchase before signing. Record only what actually arrived.' },
            { title: 'Log damage when it happens', text: 'A Damaged movement entered on the day is accurate. One reconstructed a month later never is.' },
            { title: 'Give stock access by role', text: 'Let cashiers sell but keep adjustments and deletions with a manager. The Team & Permissions article explains how.', to: '/help-center/team-permissions' },
            { title: 'Review value monthly', text: 'Compare Inventory Value month to month. A sudden jump or drop deserves a look at the movement report.' },
          ],
        },
      ],
    },
    {
      id: 'inventory-troubleshooting',
      heading: 'Common Problems and Quick Fixes',
      blocks: [
        {
          list: [
            { title: 'Stock shows negative', text: 'A sale was made before the matching purchase was recorded. Record the stock in, or add an Adjustment, and keep a habit of receiving goods the same day.' },
            { title: 'Two entries for the same product', text: 'Usually a spelling variation. Keep one, move the quantity across with an Adjustment and remove the duplicate.' },
            { title: 'Low stock list is empty', text: 'Products without a minimum stock alert never appear. Open the product and set the alert quantity.' },
            { title: 'Counts differ between devices', text: 'Wait for the sync indicator to show Synced. Cloud sync updates all counters and the office view once the connection returns.' },
          ],
        },
        { callout: 'Inventory figures are only as good as the entries behind them. If a number looks wrong, open the Stock Movement report for that product first. The cause is almost always visible there.' },
      ],
    },
    {
      id: 'inventory-read-next',
      heading: 'Read Next',
      blocks: [
        { p: 'Inventory connects naturally to billing, reporting and access control. These guides cover the neighbouring pieces.' },
        {
          links: [
            { to: '/help-center/reports', label: 'Reports & Analytics help' },
            { to: '/help-center/team-permissions', label: 'Team & Permissions help' },
            { to: '/retail-pos', label: 'Retail POS' },
            { to: '/pharmacy-pos', label: 'Pharmacy POS' },
          ],
        },
      ],
    },
  ],

  'team-permissions': [
    {
      id: 'why-roles-matter',
      heading: 'Why Roles and Permissions Matter',
      blocks: [
        { p: 'Every business starts with the owner doing everything. Then the first cashier joins, then an accountant, then a manager, and suddenly one shared login is a real risk. Someone deletes a record by mistake. A staff member sees profit figures they should not. Nobody can say who changed a price last Thursday.' },
        { p: 'Role-based access control solves this without slowing anyone down. Each person gets their own login and sees only the screens and actions their job needs. The owner keeps full control and a record of what happened.' },
      ],
    },
    {
      id: 'role-presets',
      heading: 'The Ready-Made Roles',
      blocks: [
        { p: 'When you add a team member, you start from a role. Each role is a sensible set of defaults that you can adjust afterwards.' },
        {
          list: [
            { title: 'Owner', text: 'The person who created the workspace. Full access and protected from removal.' },
            { title: 'Admin', text: 'Manages the workspace day to day. Can view, create, edit, delete, export and approve.' },
            { title: 'Manager', text: 'Daily operations, reports, exports and approvals, without delete rights.' },
            { title: 'Cashier', text: 'Point-of-sale work only: sales, orders, KOT, billing and receipt printing.' },
            { title: 'Accountant', text: 'Finance work: invoices, expenses, accounts, reports and approvals.' },
            { title: 'Sales Staff', text: 'Customers, leads, orders, invoices and follow-ups.' },
            { title: 'Support Agent', text: 'Customers, support, WhatsApp inbox, notifications and follow-ups.' },
            { title: 'Custom Staff', text: 'Starts with view-only access. You then choose modules and actions one by one.' },
          ],
        },
        { p: 'Using a preset first and tweaking it is faster and safer than building access from nothing. A new cashier, for instance, gets exactly the screens a cashier needs from the first login.' },
      ],
    },
    {
      id: 'permission-actions',
      heading: 'Module Access and Action Access',
      blocks: [
        { p: 'Permissions work on two levels. First, which modules a person can open at all. Second, what they can do inside each one. The actions are:' },
        {
          list: [
            { title: 'View', text: 'See the records on that screen.' },
            { title: 'Create', text: 'Add new records such as an invoice, customer or product.' },
            { title: 'Edit', text: 'Change existing records.' },
            { title: 'Delete', text: 'Remove records. Keep this with owners and admins in most businesses.' },
            { title: 'Export', text: 'Download or print data. Useful to limit if you worry about customer lists leaving the business.' },
            { title: 'Approve', text: 'Approve items that need sign-off, such as expenses and payments.' },
          ],
        },
        { p: 'A manager may be allowed to view, create, edit and approve in Expenses but not delete, while an accountant may view and export reports but never touch the point of sale. These small differences are what make delegation safe.' },
      ],
    },
    {
      id: 'add-first-member',
      heading: 'Step by Step: Adding a Team Member',
      blocks: [
        {
          steps: [
            { title: 'Open Team Management', text: 'Find it in the sidebar of your workspace. You will see current members, their roles and their status.' },
            { title: 'Enter their details', text: 'Add the person’s name and email address. They will log in with that email, so use one they actually check.' },
            { title: 'Choose a role', text: 'Pick the closest preset. Check the description under the role so you know what you are granting.' },
            { title: 'Fine-tune access', text: 'Open the permission list and switch individual modules and actions on or off. Leave anything you are unsure about off, because it is easy to grant later.' },
            { title: 'Send the invite', text: 'The member signs in and the invite changes to accepted after their first login.' },
            { title: 'Test it', text: 'Ask the new member, or log in yourself in a private window, to confirm they see only what you intended.' },
          ],
        },
        { callout: 'Seats depend on your plan: Basic includes up to 2 team members, Standard up to 5, Enterprise is unlimited, and the free trial allows unlimited users while it runs.' },
      ],
    },
    {
      id: 'role-examples',
      heading: 'Practical Setups for Common Businesses',
      blocks: [
        {
          list: [
            { title: 'A restaurant with three shifts', text: 'The owner and one manager keep full access. Cashiers get POS, orders and KOT only, so they can bill tables but cannot see profit reports or delete orders.', to: '/restaurant-pos' },
            { title: 'A retail shop with a part-time accountant', text: 'The accountant gets finance, invoices, expenses and reports with export and approve. Counter staff get sales and orders. Stock adjustments stay with the manager.', to: '/retail-pos' },
            { title: 'A school office', text: 'The principal reviews approvals and reports. An accounts clerk handles fees and payroll screens. Teachers see attendance only.', to: '/school-erp' },
            { title: 'A small sales team', text: 'Sales staff see customers, leads, invoices and follow-ups. A sales manager adds reports and approvals.', to: '/crm' },
          ],
        },
      ],
    },
    {
      id: 'approvals-audit',
      heading: 'Approvals, Activity Logs and Accountability',
      blocks: [
        { p: 'Access control is about prevention. Activity logs are about accountability. Nexora records who did what and when, and the Activity Logs screen lets you filter by person, module, action and date range, or search for a keyword.' },
        { p: 'Together with the Approval Center, this means sensitive actions like expenses and payments can require sign-off from someone with the approve permission. The person who raised the item cannot quietly approve it themselves unless you have given them that permission.' },
        {
          list: [
            { title: 'Find who changed a record', text: 'Search the log by module and date, then read the user and description.' },
            { title: 'Review a staff member’s day', text: 'Filter by user and a single date to see everything they did.' },
            { title: 'Spot unusual deletes', text: 'Filter by the delete action across the week. A few are normal; many in a short time deserve a conversation.' },
          ],
        },
      ],
    },
    {
      id: 'security-habits',
      heading: 'Good Security Habits for Teams',
      blocks: [
        {
          steps: [
            { title: 'One person, one login', text: 'Never share a login. Shared logins make logs useless and make it impossible to remove one person’s access safely.' },
            { title: 'Least access by default', text: 'Start narrow and add permissions when someone asks. It is much easier than discovering later that a trainee could export every customer.' },
            { title: 'Remove people on their last day', text: 'Delete or disable the member the day they leave. Their history stays in the logs.' },
            { title: 'Review access every quarter', text: 'Roles drift as jobs change. A short review keeps access matched to responsibility.' },
            { title: 'Keep the owner account private', text: 'Use the owner login for setup and review, not for everyday work on a shared counter computer.' },
          ],
        },
      ],
    },
    {
      id: 'team-troubleshooting',
      heading: 'Common Questions and Fixes',
      blocks: [
        {
          list: [
            { title: 'A member cannot see a module', text: 'The module is probably not enabled for their role. Open their permissions and switch on at least View for that module.' },
            { title: 'The invite still says pending', text: 'The status changes after the person’s first successful login. Ask them to sign in with the exact email you invited.' },
            { title: 'I cannot remove the owner', text: 'The owner is protected on purpose so a workspace can never be left without control.' },
            { title: 'A cashier can see too much', text: 'Check whether the role was changed to a broader preset. Re-apply the Cashier role and review the list.' },
          ],
        },
        { callout: 'Changing a role resets that member’s permissions to the new role’s defaults, so adjust individual switches after you pick the role, not before.' },
      ],
    },
    {
      id: 'team-read-next',
      heading: 'Read Next',
      blocks: [
        {
          links: [
            { to: '/help-center/getting-started', label: 'Getting started with Nexora' },
            { to: '/help-center/pricing-and-trial', label: 'Pricing and trial' },
            { to: '/help-center/reports', label: 'Reports & Analytics help' },
            { to: '/help-center/inventory-management', label: 'Inventory Management help' },
          ],
        },
      ],
    },
  ],

  reports: [
    {
      id: 'why-reports',
      heading: 'Why Good Reports Change How You Run a Business',
      blocks: [
        { p: 'Most owners know roughly how business is going. Fewer know which product earns the most margin, which customer is late again, which cashier closes with the biggest differences, or whether this month beat last month. The gap between "roughly" and "exactly" is where money is quietly lost.' },
        { p: 'Nexora’s report centre pulls from the data your team already enters: invoices, point-of-sale orders, payments, expenses, stock movements, school fees and more. There is nothing extra to type. You pick a report, set a date range and read the answer.' },
      ],
    },
    {
      id: 'report-categories',
      heading: 'The Report Categories',
      blocks: [
        { p: 'Reports are grouped so you can find them by the question you are asking. Which ones you see depends on your business type and your role.' },
        {
          list: [
            { title: 'Finance', text: 'Profit & Loss, Income, Expenses, Cash Balance, Bank Balance, Wallet Balance, Refunds and Supplier Payments.' },
            { title: 'Sales', text: 'Invoice Sales, POS Sales, Daily and Monthly Sales, and sales broken down by product, customer, staff and payment method.' },
            { title: 'Purchases', text: 'Purchase Summary, Purchase Payments, Supplier Due, Supplier Statement and Purchase Returns.' },
            { title: 'Inventory', text: 'Stock Summary, Stock Movement, Low Stock, Inventory Value, Product Profitability and Sales Returns.' },
            { title: 'Customers and suppliers', text: 'Customer Ledger, Customer Balance, Top Customers and the matching supplier reports.' },
            { title: 'CRM', text: 'Leads, pipeline, conversion and staff performance for sales teams.' },
            { title: 'School ERP', text: 'Fee collection, outstanding fees, attendance and student summary.' },
            { title: 'Transport', text: 'Trip revenue, vehicle profit, fuel and driver performance.' },
            { title: 'Restaurant', text: 'KOT, table turnover, waiter performance and kitchen summary.' },
            { title: 'Business overview', text: 'A combined view across the modules you use.' },
          ],
        },
      ],
    },
    {
      id: 'run-first-report',
      heading: 'Step by Step: Running Your First Report',
      blocks: [
        {
          steps: [
            { title: 'Open Reports', text: 'Choose Reports from the sidebar. Reports that suit your business type are listed by category.' },
            { title: 'Pick the question', text: 'Select a report such as Daily Sales or Profit & Loss. Each one has a one-line description under its name.' },
            { title: 'Set the period', text: 'Use a preset like today, this week or this month, or enter your own date range. Match the period to your decision: daily for cash checks, monthly for trends.' },
            { title: 'Apply filters', text: 'Narrow by product, category, customer, staff or payment method where the report allows it.' },
            { title: 'Read the summary first', text: 'Look at the totals before the rows. Then scan the detail for anything unusual.' },
            { title: 'Export or print', text: 'Download the report or print it. The available formats depend on the report.' },
          ],
        },
      ],
    },
    {
      id: 'export-formats',
      heading: 'Exporting Reports: PDF, Excel, CSV and Print',
      blocks: [
        { p: 'A report you cannot share is only half useful. Nexora supports several outputs, and the right one depends on who receives it:' },
        {
          list: [
            { title: 'PDF', text: 'For owners, partners, banks and clients. A fixed, clean layout that looks the same everywhere.' },
            { title: 'Excel', text: 'For accountants who want to filter, pivot or combine the data with their own sheets.' },
            { title: 'CSV', text: 'For importing into other tools. Plain data, no formatting.' },
            { title: 'Print', text: 'For the counter, the notice board or the file cabinet. Some reports also offer a compact 58 mm thermal layout for receipt printers.' },
          ],
        },
        { p: 'Not every report supports every format. Where one is missing, the export option simply does not appear on that report.' },
      ],
    },
    {
      id: 'daily-weekly-monthly',
      heading: 'A Reporting Rhythm That Works',
      blocks: [
        { p: 'You do not need to read every report every day. A rhythm keeps you informed without taking over your week.' },
        {
          list: [
            { title: 'Every day (5 minutes)', text: 'Daily Sales, Cash Balance and, for restaurants, the cashier end-of-day summary. Confirm the money in the drawer matches the system.' },
            { title: 'Every week (15 minutes)', text: 'Low Stock, Supplier Due, Customer Balance and Top Customers. Reorder, pay and follow up.' },
            { title: 'Every month (30 minutes)', text: 'Profit & Loss, Monthly Sales, Inventory Value and Product Profitability. Compare with last month and decide what to change.' },
          ],
        },
        { callout: 'The most useful habit is comparison. A single number rarely helps. This month against last month, or this Friday against the last four Fridays, shows direction.' },
      ],
    },
    {
      id: 'reports-by-role',
      heading: 'Reports by Role: Who Should See What',
      blocks: [
        { p: 'Profit and cost figures are sensitive. Because reports follow the same role system as the rest of Nexora, you decide who can open the Reports screen and who can export.' },
        {
          list: [
            { title: 'Owners and admins', text: 'Everything, including Profit & Loss and cost-based reports.' },
            { title: 'Managers', text: 'Operational reports with export, useful for running the floor without exposing everything.' },
            { title: 'Accountants', text: 'Finance, purchase and ledger reports with export for month-end work.' },
            { title: 'Support agents', text: 'Customer-facing reports they need to answer questions.' },
            { title: 'Cashiers', text: 'Usually no reports at all, only the point-of-sale screens.' },
          ],
        },
        { p: 'You can read more about setting this up in the Team & Permissions guide.' },
        { links: [{ to: '/help-center/team-permissions', label: 'Team & Permissions help' }] },
      ],
    },
    {
      id: 'reports-by-business',
      heading: 'Report Examples for Different Businesses',
      blocks: [
        {
          list: [
            { title: 'Retail shop', text: 'Daily Sales to check the drawer, Low Stock to reorder, Product Profitability to see which items earn the most per unit.', to: '/retail-pos' },
            { title: 'Restaurant', text: 'KOT and kitchen summary to see how busy service was, waiter performance and table turnover to plan staffing.', to: '/restaurant-pos' },
            { title: 'Pharmacy', text: 'Stock Summary and Supplier Due to manage medicine purchases and payments.', to: '/pharmacy-pos' },
            { title: 'School', text: 'Fee Collection and Outstanding Fees to chase dues, and Attendance to monitor classes.', to: '/school-erp' },
            { title: 'Fleet and rental', text: 'Trip revenue, vehicle profit and fuel to see which vehicles pay for themselves.', to: '/transport-fleet' },
            { title: 'Sales team', text: 'Leads, pipeline and conversion to find where deals stall.', to: '/crm' },
          ],
        },
      ],
    },
    {
      id: 'accuracy-tips',
      heading: 'Getting Accurate Reports',
      blocks: [
        { p: 'A report is a mirror. If the entries are incomplete, the mirror shows it. A few habits make every report more reliable:' },
        {
          steps: [
            { title: 'Record everything the same day', text: 'Late entries move numbers between periods and make daily reports look wrong.' },
            { title: 'Always fill in cost price', text: 'Without cost, profit and margin reports have nothing to calculate.' },
            { title: 'Use consistent categories', text: 'Expense and product categories should be few and clear. Ten similar categories blur every chart.' },
            { title: 'Approve pending items', text: 'Expenses and payments waiting for approval may not appear in totals yet. Clear the Approval Center before month end.' },
            { title: 'Check the date range', text: 'Many "wrong" reports are simply set to the wrong period.' },
          ],
        },
      ],
    },
    {
      id: 'reports-troubleshooting',
      heading: 'Common Questions and Fixes',
      blocks: [
        {
          list: [
            { title: 'A report is empty', text: 'Check the date range and filters first. Then confirm the underlying records exist for that period.' },
            { title: 'The total differs from my own sum', text: 'Look for pending approvals, refunds or a different payment method filter. The report summary lists what it includes.' },
            { title: 'I cannot see the Reports screen', text: 'Your role may not include the Reports module. Ask the owner or an admin to enable it.' },
            { title: 'The export option is missing', text: 'That report does not support that format. Try another format or use Print.' },
          ],
        },
      ],
    },
    {
      id: 'reports-read-next',
      heading: 'Read Next',
      blocks: [
        {
          links: [
            { to: '/help-center/inventory-management', label: 'Inventory Management help' },
            { to: '/help-center/team-permissions', label: 'Team & Permissions help' },
            { to: '/help-center/getting-started', label: 'Getting started with Nexora' },
          ],
        },
      ],
    },
  ],

  'email-marketing': [
    {
      id: 'status-today',
      heading: 'What Is Available Today and What Is Coming',
      blocks: [
        { p: 'Email marketing is one of the modules Nexora is building out. We prefer to be clear about what exists now rather than promise features you cannot find in your workspace.' },
        { p: 'Today, the customer-communication tools you can use inside a Nexora workspace include WhatsApp templates, broadcasts and follow-ups, loyalty campaigns and coupons, and in-app notifications. The dedicated email campaign builder, with subscriber lists, templates and open and click tracking, is marked as coming soon in the app. The guidance below explains how email marketing works and how to prepare, so you are ready to use it the day it opens and can already apply the same discipline with the channels you have.' },
      ],
    },
    {
      id: 'why-email',
      heading: 'Why Email Still Works for Small Businesses',
      blocks: [
        { p: 'Social media reach rises and falls with algorithms you do not control. An email list is different: it is a group of people who chose to hear from you, and you own the contact details. For a shop, a school, a clinic or a service company, a short email about a new arrival, an exam date or a seasonal offer is cheap to send and easy to measure.' },
        {
          list: [
            { title: 'Low cost', text: 'There is no per-message fee like SMS or paid advertising when you use your own email list.' },
            { title: 'Permission based', text: 'People on your list asked to be there, which means higher attention than cold outreach.' },
            { title: 'Measurable', text: 'You can see how many opened a message and how many clicked, then improve the next one.' },
            { title: 'Repeatable', text: 'A good template can be reused every month with only the content changed.' },
          ],
        },
      ],
    },
    {
      id: 'build-list',
      heading: 'Step by Step: Building a Subscriber List the Right Way',
      blocks: [
        {
          steps: [
            { title: 'Collect with consent', text: 'Ask customers for their email at checkout, on admission forms or through your website, and tell them what they will receive.' },
            { title: 'Keep the data clean', text: 'Check spelling at the point of entry. A mistyped address becomes a bounce later.' },
            { title: 'Segment from day one', text: 'Tag people by what matters: customers and leads, parents and staff, branch or city. A message to the right group performs far better than one to everyone.' },
            { title: 'Honour unsubscribes immediately', text: 'Every marketing email should include a clear way to opt out, and the person must be removed promptly.' },
            { title: 'Never buy lists', text: 'Purchased lists damage sender reputation and often break privacy rules.' },
          ],
        },
        { callout: 'Customer records you already hold in Nexora CRM, such as names, phone numbers and emails, are the natural starting point for your list, provided those customers agreed to be contacted.' },
      ],
    },
    {
      id: 'write-campaign',
      heading: 'How to Write a Campaign People Open',
      blocks: [
        { p: 'Open rates are decided by two small things: who the message appears to be from and the subject line. Everything inside matters only after the email is opened.' },
        {
          list: [
            { title: 'Subject line', text: 'Be specific and short. "Eid collection now in store" beats "Newsletter October". Avoid shouting in capitals and heavy punctuation.' },
            { title: 'Preview text', text: 'The line after the subject is read too. Use it to add one useful detail.' },
            { title: 'One message per email', text: 'Pick one goal, such as visiting the shop, booking a demo or paying fees, and make one clear button for it.' },
            { title: 'Plain, human wording', text: 'Write as you would speak to a customer at the counter. Short paragraphs read well on phones.' },
            { title: 'Mobile first', text: 'Most opens happen on a phone. Keep the layout single column with large tap targets.' },
          ],
        },
      ],
    },
    {
      id: 'timing-frequency',
      heading: 'Timing and Frequency',
      blocks: [
        { p: 'There is no universal best time. A school may reach parents in the evening, while a restaurant may reach diners just before lunch or dinner. Test two send times for a month and let the open numbers decide.' },
        { p: 'For frequency, consistency matters more than volume. One useful email every two weeks is better than five rushed ones in a week that push people to unsubscribe.' },
      ],
    },
    {
      id: 'metrics',
      heading: 'The Numbers Worth Watching',
      blocks: [
        {
          list: [
            { title: 'Open rate', text: 'The share of recipients who opened the email. Mostly a measure of your subject line and sender name.' },
            { title: 'Click rate', text: 'The share who clicked a link. This tells you whether the content and button were persuasive.' },
            { title: 'Unsubscribe rate', text: 'A rising rate means you send too often or to the wrong people.' },
            { title: 'Bounce rate', text: 'Addresses that did not receive the email. Clean them from the list.' },
            { title: 'List growth', text: 'New subscribers minus those who left. A healthy list grows steadily.' },
          ],
        },
        { p: 'Remember that open tracking is an estimate, because some email apps hide opens. Click numbers are the stronger signal of interest.' },
      ],
    },
    {
      id: 'use-cases',
      heading: 'Ideas for Different Businesses',
      blocks: [
        {
          list: [
            { title: 'Retail and grocery', text: 'New arrivals, weekend discounts and festival offers sent to customers who bought before.', to: '/retail-pos' },
            { title: 'Schools and academies', text: 'Fee reminders, exam schedules and event notices to parents.', to: '/school-erp' },
            { title: 'Restaurants', text: 'A new menu item or a family-night offer to regular diners.', to: '/restaurant-pos' },
            { title: 'Property and real estate', text: 'New listings and viewing days to enquiries already in your CRM.', to: '/property-erp' },
            { title: 'Service companies', text: 'Quote follow-ups and short tips that keep you in mind between projects.', to: '/crm' },
          ],
        },
      ],
    },
    {
      id: 'channels-today',
      heading: 'Reaching Customers Today with Nexora',
      blocks: [
        { p: 'While the email builder is on the way, you do not have to wait to start communicating. The same principles of consent, segmentation and one clear message apply to the tools available now.' },
        {
          list: [
            { title: 'WhatsApp CRM', text: 'Templates, broadcasts and follow-ups for people who prefer chat.', to: '/whatsapp-crm' },
            { title: 'Loyalty campaigns and coupons', text: 'Reward repeat customers with points and offers.' },
            { title: 'Notifications', text: 'In-app alerts for your own team about due items and follow-ups.' },
            { title: 'CRM', text: 'Keep contact details and notes organised, which is the base for any future email list.', to: '/crm' },
          ],
        },
      ],
    },
    {
      id: 'email-troubleshooting',
      heading: 'Common Questions',
      blocks: [
        {
          list: [
            { title: 'Can I send bulk email from my workspace right now?', text: 'The dedicated email campaign builder is not yet open. Use WhatsApp broadcasts and loyalty campaigns in the meantime.' },
            { title: 'Will my customers’ data be safe?', text: 'Workspace data is separated by workspace and protected by role-based access, so only people you authorise can see contact lists.' },
            { title: 'Do I need permission to email customers?', text: 'Yes. Collect consent and follow the rules of your country, and always offer an unsubscribe option.' },
          ],
        },
      ],
    },
    {
      id: 'email-read-next',
      heading: 'Read Next',
      blocks: [
        {
          links: [
            { to: '/help-center/whatsapp-crm', label: 'WhatsApp CRM help' },
            { to: '/help-center/crm', label: 'CRM help' },
            { to: '/help-center/reports', label: 'Reports & Analytics help' },
          ],
        },
      ],
    },
  ],
}

export const PLATFORM_EXTRA_FAQS = {
  'inventory-management': [
    { q: 'How do I do a stock count in Nexora?', a: 'Count a shelf or category, compare it with the Stock screen and record any difference as an Adjustment with a short reason. Weekly counts of a small slice are easier than one big count a year.' },
    { q: 'What is the difference between Damaged and Adjustment?', a: 'Adjustment corrects a counting difference. Damaged records goods that existed but can no longer be sold. Keeping them apart shows you true loss.' },
    { q: 'Does stock go down automatically when I sell?', a: 'Yes, in the point-of-sale products a completed sale reduces the stock of the items sold, so you do not enter it twice.' },
    { q: 'Can I see how much my stock is worth?', a: 'Yes. The Inventory Value report shows your stock at cost price and at retail price.' },
    { q: 'Which report shows my most profitable products?', a: 'Product Profitability compares cost and selling price per product and shows profit and margin percentage.' },
    { q: 'Can different staff have different stock permissions?', a: 'Yes. You can let cashiers sell while keeping stock adjustments and deletions with managers, using roles and permissions.' },
  ],
  'team-permissions': [
    { q: 'What roles can I give my team?', a: 'Admin, Manager, Cashier, Accountant, Sales Staff, Support Agent and Custom Staff. Each starts with sensible defaults that you can adjust.' },
    { q: 'What can a cashier see?', a: 'A cashier role is limited to point-of-sale work such as sales, orders, KOT, billing and receipt printing, unless you grant more.' },
    { q: 'Can I stop someone from deleting or exporting data?', a: 'Yes. View, create, edit, delete, export and approve are separate switches, so you can allow some and block others.' },
    { q: 'How do I see who changed something?', a: 'Open Activity Logs and filter by user, module, action or date range, or search by keyword.' },
    { q: 'Can the owner be removed?', a: 'No. The owner is protected so a workspace always has someone in control.' },
    { q: 'What should I do when a staff member leaves?', a: 'Remove or disable their access the same day. Their past activity stays in the logs for your records.' },
  ],
  reports: [
    { q: 'Which reports can I export?', a: 'Depending on the report, you can export to PDF, Excel or CSV, or print. Some reports also offer a compact 58 mm thermal layout.' },
    { q: 'Can I see profit and loss?', a: 'Yes. The Profit & Loss report shows revenue minus expenses for the period you choose, with breakdowns.' },
    { q: 'Can I see sales by staff member or payment method?', a: 'Yes. The Sales category includes breakdowns by product, customer, staff and payment method.' },
    { q: 'How often should I check reports?', a: 'A good rhythm is a quick daily sales and cash check, a weekly look at stock and dues, and a monthly profit and trend review.' },
    { q: 'Who can open the reports?', a: 'Access follows roles. Owners and admins see everything, while you can limit cashiers and other staff to only what they need.' },
    { q: 'Why does my report total look different from my notes?', a: 'Check the date range, filters and any pending approvals or refunds. These are the most common reasons for differences.' },
  ],
  'email-marketing': [
    { q: 'Is the email campaign builder available yet?', a: 'It is marked as coming soon in the app. Until it opens, you can use WhatsApp broadcasts, loyalty campaigns and notifications to reach customers.' },
    { q: 'How do I get people on an email list?', a: 'Ask for their email with consent at checkout, admission or on your website, explain what you will send, and always include an unsubscribe option.' },
    { q: 'What is a good subject line?', a: 'Short, specific and honest, such as "Eid collection now in store". Avoid all capitals and heavy punctuation.' },
    { q: 'How often should I email my list?', a: 'Consistency beats volume. One useful email every one to two weeks is a good starting point for most small businesses.' },
    { q: 'Which email numbers matter most?', a: 'Click rate and unsubscribe rate are the most reliable signals. Open rate is useful but estimated, since some apps hide opens.' },
  ],
}
