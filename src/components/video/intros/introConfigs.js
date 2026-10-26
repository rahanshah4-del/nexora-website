/**
 * Sample-data scripts for the data-driven module intros (GenericIntro.jsx).
 * Every name, figure and status is made up for illustration. Feature claims follow
 * the module's product page (src/pages/public/SolutionPage.jsx).
 *
 * rows: [name, sub, status, tone, after?]  (tone: ok | warn | bad | hot | mute; `after` replaces the status of the clicked row)
 * tiles: [label, value, tone]  (number values count up, strings show as they are)
 * flow.items: [name, qty text, amount]   queue: [name, text, appears at s]
 */
const tag = (x) => x

export const INTRO_CONFIGS = {
  'retail-pos': tag({
    brand: 'Retail POS',
    hook: { pains: ['Slow checkout', 'Wrong stock counts', 'Lost receipts', 'Manual returns'], head: ['Busy counter.', 'Fast checkout.'], tag: 'Barcode billing · Inventory · Customers · Receipts · Reports' },
    list: {
      eyebrow: '01 · Inventory', head: ['Know your stock.', 'Always.'], title: 'Stock levels · 5 products', pick: 2, tilesTitle: 'Store stock', detail: { title: 'Cotton Shirt', status: '✓ Reorder alert set', chips: ['Barcode 8901234', 'Reorder at 10', '6 left'] },
      rows: [['Denim Jeans', '24 in stock', 'In stock', 'ok'], ['Socks 3-pack', '58 in stock', 'In stock', 'ok'], ['Cotton Shirt', '6 left', 'Low stock', 'warn', 'Reorder alert'], ['Leather Belt', '31 in stock', 'In stock', 'ok'], ['Silk Scarf', '12 in stock', 'In stock', 'ok']],
      tiles: [['Products', 312, 'accent'], ['Low stock', 14, 'warn'], ['Reorder alerts', 14, 'mute']],
    },
    flow: {
      eyebrow: '02 · Barcode billing', head: ['Scan, bill and', 'print in seconds.'], leftTitle: 'Counter 1', leftSub: 'Sale #412', tag: 'Barcode', cur: 'PKR ', adj: { label: 'Discount 10%', rate: -0.1 }, totalLabel: 'Total', button: 'Print receipt', sentLabel: 'Receipt printed',
      items: [['Cotton Shirt', '× 2', 4800], ['Denim Jeans', '× 1', 3500], ['Socks 3-pack', '× 3', 900]],
      rightTitle: 'Receipt and stock', waiting: 'Waiting for a sale…', ticketTitle: 'Receipt #412', pendingChip: 'Printing', doneChip: 'Stock synced', ticketLines: ['2 × Cotton Shirt', '1 × Denim Jeans', '3 × Socks 3-pack'],
    },
    metrics: {
      eyebrow: '03 · Reports and returns', head: ['Returns handled.', 'Reports ready.'], leftTitle: 'Store report · today', cur: 'PKR ', big: 198000, bigLabel: 'Sales across 412 receipts', bars: [['Cotton Shirt', 78], ['Denim Jeans', 61], ['Socks 3-pack', 44]],
      rightTitle: 'Returns and stock sync', working: 'Working', allDone: 'All synced', pendingLabel: 'processing', doneLabel: 'synced',
      queue: [['Return #31 · Cotton Shirt', 'PKR 2,400 refunded', 0.8], ['Stock +1 · Cotton Shirt', 'Inventory adjusted', 1.6], ['Customer saved · Ayesha K.', 'Purchase history updated', 2.4]],
    },
    close: { label: "Today's sales", cur: 'PKR ', big: 198000, series: [20, 28, 26, 40, 46, 43, 60, 66, 63, 80], chips: ['Barcode', 'Returns', 'Cloud sync'], head: ['Run the whole store from', 'one counter.'] },
  }),

  'medical-store-pos': tag({
    brand: 'Pharmacy POS',
    hook: { pains: ['Expired stock', 'Slow item search', 'Missing batches', 'Paper registers'], head: ['Every batch.', 'Every expiry.'], tag: 'Fast search · Batches · Expiry alerts · Purchases · Reports' },
    list: {
      eyebrow: '01 · Batches and expiry', head: ['Catch expiry', 'before it costs you.'], title: 'Batches · 5 medicines', pick: 0, tilesTitle: 'Expiry watch', detail: { title: 'Paracetamol 500mg', status: '✓ Marked for review', chips: ['Batch B-2291', '120 strips', 'Expires Nov 2026'] },
      rows: [['Paracetamol 500mg', 'Batch B-2291', 'Expiring soon', 'warn', 'Reviewed'], ['Amoxicillin 250mg', 'Batch B-1187', 'Good', 'ok'], ['Cough Syrup 100ml', 'Batch B-0934', 'Expiring soon', 'warn'], ['Vitamin C 500mg', 'Batch B-3310', 'Good', 'ok'], ['ORS Sachet', 'Batch B-2048', 'Good', 'ok']],
      tiles: [['Expiry alerts', 23, 'warn'], ['Low stock', 18, 'accent'], ['Batches', 640, 'mute']],
    },
    flow: {
      eyebrow: '02 · Medicine billing', head: ['Search fast.', 'Bill by batch.'], leftTitle: 'Counter', leftSub: 'Sale #1186', tag: 'Fast search', cur: 'PKR ', totalLabel: 'Total', button: 'Bill and print', sentLabel: 'Billed',
      items: [['Paracetamol 500mg', '× 2', 120], ['Amoxicillin 250mg', '× 1', 380], ['Cough Syrup 100ml', '× 1', 290]],
      rightTitle: 'Batch stock', waiting: 'Waiting for a sale…', ticketTitle: 'Batch stock updated', pendingChip: 'Updating', doneChip: 'Stock synced', ticketLines: ['Paracetamol B-2291 · −2', 'Amoxicillin B-1187 · −1', 'Cough Syrup B-0934 · −1'],
    },
    metrics: {
      eyebrow: '03 · Purchases and reports', head: ['Reorder on time.', 'Close the day.'], leftTitle: 'Daily report', cur: 'PKR ', big: 126000, bigLabel: "Today's medicine sales", bars: [['Tablets and capsules', 72], ['Syrups', 48], ['Supplements', 35]],
      rightTitle: 'Supplier purchases', working: 'Ordering', allDone: 'Stock received', pendingLabel: 'ordered', doneLabel: 'received',
      queue: [['PO #208 · Alpha Pharma', 'PKR 84,000', 0.8], ['PO #209 · MediSupply', 'PKR 52,000', 1.6], ['PO #210 · CarePlus', 'PKR 31,500', 2.4]],
    },
    close: { label: "Today's sales", cur: 'PKR ', big: 126000, series: [18, 24, 30, 28, 42, 50, 47, 62, 68, 78], chips: ['Batches', 'Expiry alerts', 'Purchases'], head: ['Run the pharmacy counter with', 'full control.'] },
  }),

  'school-erp': tag({
    brand: 'School ERP',
    hook: { pains: ['Paper registers', 'Fee dues missed', 'Late results', 'Parents not informed'], head: ['Classroom to office.', 'One system.'], tag: 'Students · Attendance · Fees · Exams · Parent portal' },
    list: {
      eyebrow: '01 · Attendance', head: ['Mark attendance', 'in a tap.'], title: 'Class 7-A · 5 students', pick: 2, tilesTitle: "Today's attendance", detail: { title: 'Sara Malik', status: '✓ Parent notified', chips: ['Class 7-A', 'Absent today', 'Guardian informed'] },
      rows: [['Ayesha Khan', 'Roll 01', 'Present', 'ok'], ['Hamza Ali', 'Roll 02', 'Present', 'ok'], ['Sara Malik', 'Roll 03', 'Present', 'ok', ['Absent', 'bad']], ['Bilal Ahmed', 'Roll 04', 'Present', 'ok'], ['Noor Fatima', 'Roll 05', 'Present', 'ok']],
      tiles: [['Students', 1284, 'accent'], ['Attendance', '94%', 'ok'], ['Absent', 77, 'warn']],
    },
    flow: {
      eyebrow: '02 · Fee collection', head: ['Collect fees.', 'Inform parents.'], leftTitle: 'Fee voucher', leftSub: 'Ayesha Khan · 7-A', tag: 'May fees', cur: 'PKR ', totalLabel: 'Total due', button: 'Collect fee', sentLabel: 'Voucher paid',
      items: [['Tuition fee', 'monthly', 4500], ['Transport fee', 'monthly', 1200], ['Exam fee', 'term', 800]],
      rightTitle: 'Parent portal', waiting: 'Waiting for a payment…', ticketTitle: 'Fee received · 7-A', pendingChip: 'Notifying', doneChip: 'Parent notified', ticketLines: ['Tuition fee · paid', 'Transport fee · paid', 'Exam fee · paid'],
    },
    metrics: {
      eyebrow: '03 · Exams and reports', head: ['Results out.', 'Reports ready.'], leftTitle: 'Fee collection · this month', cur: 'PKR ', big: 3100000, bigLabel: 'Collected across 1,284 students', bars: [['Class 6', 88], ['Class 7', 94], ['Class 8', 79]],
      rightTitle: 'Exam results', working: 'Marking', allDone: 'Published', pendingLabel: 'marking', doneLabel: 'published',
      queue: [['Class 7 · Mathematics', 'Marks entered', 0.8], ['Class 7 · Science', 'Marks entered', 1.6], ['Class 8 · English', 'Marks entered', 2.4]],
    },
    close: { label: 'Fees collected', cur: 'PKR ', big: 3100000, series: [22, 30, 28, 42, 48, 46, 60, 64, 70, 82], chips: ['Attendance', 'Fees', 'Exams'], head: ['Run the whole school from', 'one dashboard.'] },
  }),

  'crm': tag({
    brand: 'CRM',
    hook: { pains: ['Missed follow-ups', 'Leads in notebooks', 'Late invoices', 'No team view'], head: ['Every lead.', 'Never lost.'], tag: 'Leads · Customers · Pipeline · Invoices · Tasks' },
    list: {
      eyebrow: '01 · Pipeline', head: ['See every deal,', 'every stage.'], title: 'Pipeline · 5 leads', pick: 1, tilesTitle: 'Sales pipeline', detail: { title: 'Zubair Traders', status: '✓ Moved to Won', chips: ['PKR 180,000', 'Assigned to Sana', 'Follow-up done'] },
      rows: [['Noor Enterprises', 'New lead', 'New', 'mute'], ['Zubair Traders', 'Quote sent', 'Negotiating', 'warn', 'Won'], ['Haseeb & Co', 'Demo booked', 'Demo', 'hot'], ['Al-Madina Store', 'Follow-up', 'Follow-up', 'warn'], ['Rana Textiles', 'New lead', 'New', 'mute']],
      tiles: [['Open leads', 184, 'accent'], ['Follow-ups', 47, 'warn'], ['Won deals', 'PKR 2.4M', 'ok']],
    },
    flow: {
      eyebrow: '02 · Deal to invoice', head: ['Win the deal.', 'Send the invoice.'], leftTitle: 'New invoice', leftSub: 'Zubair Traders', tag: 'INV-1042', cur: 'PKR ', totalLabel: 'Total', button: 'Create invoice', sentLabel: 'Invoice sent',
      items: [['CRM setup', 'one time', 120000], ['Team training', '2 days', 30000], ['Support', '3 months', 30000]],
      rightTitle: 'Customer timeline', waiting: 'Waiting for an invoice…', ticketTitle: 'Invoice #INV-1042', pendingChip: 'Sending', doneChip: 'Sent', ticketLines: ['Deal moved to Won', 'Invoice created and sent', 'Follow-up task assigned'],
    },
    metrics: {
      eyebrow: '03 · Team and tasks', head: ['Tasks assigned.', 'Team visible.'], leftTitle: 'Team performance', cur: 'PKR ', big: 2400000, bigLabel: 'Won deals this quarter', bars: [['Sana', 86], ['Ali', 72], ['Bilal', 58]],
      rightTitle: 'Follow-up tasks', working: 'In progress', allDone: 'All done', pendingLabel: 'due today', doneLabel: 'done',
      queue: [['Call Zubair Traders', 'Assigned to Sana', 0.8], ['Send quotation · Noor Enterprises', 'Assigned to Ali', 1.6], ['Follow up · Haseeb & Co', 'Assigned to Bilal', 2.4]],
    },
    close: { label: 'Won deals', cur: 'PKR ', big: 2400000, series: [16, 24, 22, 36, 42, 40, 58, 64, 70, 84], chips: ['Leads', 'Invoices', 'Team'], head: ['Turn every lead into', 'revenue.'] },
  }),

  'whatsapp-crm': tag({
    brand: 'WhatsApp CRM',
    hook: { pains: ['Unanswered chats', 'Manual broadcasts', 'Lost context', 'No tracking'], head: ['Conversations.', 'Measured.'], tag: 'Broadcasts · Follow-ups · Automation · Customers · Reports' },
    list: {
      eyebrow: '01 · Customer chats', head: ['Every chat', 'linked to a customer.'], title: 'Inbox · 5 chats', pick: 0, tilesTitle: 'Conversation desk', detail: { title: 'Ayesha Khan', status: '✓ Tagged: Interested', chips: ['Linked to customer', 'Follow-up set', 'Assigned to Sana'] },
      rows: [['Ayesha Khan', 'Is the offer still open?', 'New', 'hot', 'Replied'], ['Hamza Ali', 'Send the price list', 'Replied', 'ok'], ['Sara Malik', 'Thanks, will order', 'Replied', 'ok'], ['Bilal Ahmed', 'Delivery time?', 'New', 'hot'], ['Noor Fatima', 'Please call me', 'Follow-up', 'warn']],
      tiles: [['Broadcasts', '24K', 'accent'], ['Follow-ups', 312, 'warn'], ['Replies', '38%', 'ok']],
    },
    flow: {
      eyebrow: '02 · Broadcast', head: ['Send to the right', 'people at once.'], leftTitle: 'New broadcast', leftSub: 'Eid offer', tag: 'Audience', cur: '', subLabel: 'Recipients', totalLabel: 'Total reach', button: 'Send broadcast', sentLabel: 'Broadcast sent',
      items: [['New leads', 'segment', 1200], ['Past customers', 'segment', 3400], ['Open inquiries', 'segment', 800]],
      rightTitle: 'Delivery tracking', waiting: 'Waiting for a broadcast…', ticketTitle: 'Broadcast · Eid offer', pendingChip: 'Sending', doneChip: 'Delivered', ticketLines: ['Message queued for 5,400', 'Replies tagged to customers', 'Follow-ups scheduled'],
    },
    metrics: {
      eyebrow: '03 · Follow-ups and reports', head: ['Nothing missed.', 'Everything counted.'], leftTitle: 'Outreach report', cur: '', big: 24000, bigLabel: 'Messages sent this month', bars: [['Delivered', 96], ['Replied', 38], ['Follow-up booked', 21]],
      rightTitle: 'Follow-ups and automation', working: 'Queued', allDone: 'On track', pendingLabel: 'scheduled', doneLabel: 'sent',
      queue: [['Follow-up · Ayesha Khan', 'Tomorrow 10:00', 0.8], ['Automation · Welcome reply', 'New lead trigger', 1.6], ['Follow-up · Bilal Ahmed', 'Tomorrow 12:30', 2.4]],
    },
    close: { label: 'Messages sent', cur: '', big: 24000, series: [14, 22, 30, 28, 40, 52, 48, 62, 70, 82], chips: ['Broadcasts', 'Follow-ups', 'Automation'], head: ['Turn every chat into', 'a customer win.'] },
  }),

  'transport-rental': tag({
    brand: 'Fleet & Rental',
    hook: { pains: ['Missed dues', 'Double bookings', 'Paper ledgers', 'No fleet view'], head: ['Every vehicle.', 'Every booking.'], tag: 'Fleet · Bookings · Customer ledger · Payments and dues · Reports' },
    list: {
      eyebrow: '01 · Fleet', head: ['See which cars', 'are out, live.'], title: 'Fleet · 5 vehicles', pick: 1, tilesTitle: 'Fleet status', detail: { title: 'Suzuki Alto', status: '✓ Booked', chips: ['LEA-558', '3 days', 'Customer: Bilal R.'] },
      rows: [['Toyota Corolla', 'LHR-2104', 'Rented', 'warn'], ['Suzuki Alto', 'LEA-558', 'Available', 'ok', 'Booked'], ['Honda City', 'LEB-912', 'Rented', 'warn'], ['Toyota Yaris', 'LXA-340', 'Available', 'ok'], ['Honda 125', 'LEC-771', 'Available', 'ok']],
      tiles: [['Fleet units', 42, 'accent'], ['Active rentals', 18, 'warn'], ['Available', 24, 'ok']],
    },
    flow: {
      eyebrow: '02 · Booking', head: ['Book in seconds.', 'Track every due.'], leftTitle: 'New booking', leftSub: 'Suzuki Alto', tag: '3 days', cur: 'PKR ', totalLabel: 'Total', button: 'Confirm booking', sentLabel: 'Booking confirmed',
      items: [['Suzuki Alto rental', '× 3 days', 21000], ['Driver', '× 3 days', 6000], ['Security deposit', 'refundable', 15000]],
      rightTitle: 'Customer ledger', waiting: 'Waiting for a booking…', ticketTitle: 'Booking #B-207', pendingChip: 'Saving', doneChip: 'In ledger', ticketLines: ['Bilal R. · 3 days', 'Advance PKR 20,000', 'Due PKR 22,000'],
    },
    metrics: {
      eyebrow: '03 · Payments and dues', head: ['Collect dues.', 'See revenue.'], leftTitle: 'Rental dues', cur: 'PKR ', big: 312000, bigLabel: 'Pending dues to follow up', bars: [['Fleet utilization', 74], ['Dues collected', 62], ['Returns on time', 88]],
      rightTitle: 'Payments', working: 'Collecting', allDone: 'Collected', pendingLabel: 'pending', doneLabel: 'collected',
      queue: [['Bilal R. · Booking #B-207', 'PKR 22,000', 0.8], ['Usman T. · Booking #B-198', 'PKR 14,500', 1.6], ['Refund · Booking #B-190', 'PKR 15,000 deposit', 2.4]],
    },
    close: { label: 'Rental revenue', cur: 'PKR ', big: 1240000, series: [20, 26, 34, 30, 44, 52, 50, 64, 70, 80], chips: ['Fleet', 'Bookings', 'Dues'], head: ['Run the whole fleet from', 'one workspace.'] },
  }),

  'property-erp': tag({
    brand: 'Property ERP',
    hook: { pains: ['Late rent', 'Lost lease dates', 'Scattered records', 'Slow owner reports'], head: ['Rent in.', 'Leases tracked.'], tag: 'Tenants · Rent · Leases · Maintenance · Reports' },
    list: {
      eyebrow: '01 · Rent collection', head: ['Know who paid,', 'who is due.'], title: 'Rent · 5 units', pick: 1, tilesTitle: 'Portfolio', detail: { title: 'Shop 12 · Bilal & Co', status: '✓ Reminder sent', chips: ['PKR 120,000', 'Lease to Dec 2026', 'Due in 3 days'] },
      rows: [['Flat 4B · Usman', 'PKR 65,000', 'Paid', 'ok'], ['Shop 12 · Bilal & Co', 'PKR 120,000', 'Due', 'warn', 'Reminded'], ['Flat 7A · Hira', 'PKR 58,000', 'Paid', 'ok'], ['Office 3 · Noor Ltd', 'PKR 150,000', 'Paid', 'ok'], ['Flat 2C · Imran', 'PKR 52,000', 'Due', 'warn']],
      tiles: [['Properties', 86, 'accent'], ['Rent collected', 'PKR 5.8M', 'ok'], ['Open requests', 12, 'warn']],
    },
    flow: {
      eyebrow: '02 · Rent payment', head: ['Record rent.', 'Update the owner.'], leftTitle: 'Rent payment', leftSub: 'Flat 4B · Usman', tag: 'May rent', cur: 'PKR ', totalLabel: 'Total received', button: 'Record payment', sentLabel: 'Payment recorded',
      items: [['Monthly rent', 'May', 65000], ['Maintenance charge', 'May', 5000], ['Utilities', 'May', 3500]],
      rightTitle: 'Owner report', waiting: 'Waiting for a payment…', ticketTitle: 'Owner statement', pendingChip: 'Updating', doneChip: 'Report ready', ticketLines: ['Rent received', 'Lease active to Dec 2026', 'Balance PKR 0'],
    },
    metrics: {
      eyebrow: '03 · Maintenance and reports', head: ['Requests assigned.', 'Reports ready.'], leftTitle: 'Rent collection · this month', cur: 'PKR ', big: 5800000, bigLabel: 'Collected across 86 properties', bars: [['Residential', 92], ['Commercial', 81], ['Housing society', 68]],
      rightTitle: 'Maintenance requests', working: 'Open', allDone: 'Resolved', pendingLabel: 'assigned', doneLabel: 'done',
      queue: [['AC repair · Flat 4B', 'Assigned to Zafar', 0.8], ['Plumbing · Shop 12', 'Assigned to Rashid', 1.6], ['Lift service · Block A', 'Assigned to Zafar', 2.4]],
    },
    close: { label: 'Rent collected', cur: 'PKR ', big: 5800000, series: [24, 30, 28, 40, 46, 44, 58, 62, 70, 82], chips: ['Tenants', 'Leases', 'Maintenance'], head: ['Run the whole portfolio from', 'one desk.'] },
  }),
  'nexora-ai': tag({
    brand: 'AI',
    hook: { pains: ['Typing menus by hand', 'Reports nobody reads', 'Invisible to AI search', 'Invoices from scratch'], head: ['One AI.', 'Whole business.'], tag: 'Menu import · GEO audit · AI reports · Free tools' },
    list: {
      eyebrow: '01 · AI menu import', head: ['Photo in.', 'Menu out.'], title: 'Menu photo · 5 items read', pick: 1, tilesTitle: 'Import result', detail: { title: 'Menu imported', status: '✓ Added to POS', chips: ['Prices read', 'Categories set', 'Ready to sell'] },
      rows: [['Chicken Karahi', 'PKR 1,800', 'Read', 'ok'], ['Beef Biryani', 'PKR 650', 'Read', 'ok', 'Added to POS'], ['Seekh Kebab', 'PKR 480', 'Read', 'ok'], ['Garlic Naan', 'PKR 60', 'Read', 'ok'], ['Mint Lemonade', 'PKR 220', 'Read', 'ok']],
      tiles: [['Items read', 42, 'accent'], ['Categories', 6, 'ok'], ['Minutes', 1, 'mute']],
    },
    flow: {
      eyebrow: '02 · GeoLint GEO audit', head: ['Can AI search', 'read your site?'], leftTitle: 'GEO score', leftSub: 'example site', tag: 'Free', cur: '', subLabel: 'Three parts added up', totalLabel: 'Score out of 100', button: 'Get the ranked fix list', sentLabel: 'Fix list ready',
      items: [['Bot access', 'of 30', 23], ['JavaScript test', 'of 25', 19], ['Content and facts', 'of 45', 38]],
      rightTitle: 'Ranked fixes', waiting: 'Waiting for the audit…', ticketTitle: 'Fix list', pendingChip: 'Ranking', doneChip: 'Ready', ticketLines: ['1. Let AI bots in robots.txt', '2. Show text without JavaScript', '3. Answer first under each heading'],
    },
    metrics: {
      eyebrow: '03 · AI reports and free tools', head: ['Answers ready.', 'Invoices free.'], leftTitle: 'AI sales summary · this week', cur: 'PKR ', big: 148000, bigLabel: 'Best sellers found by Nexora AI', bars: [['Chicken Karahi', 74], ['Beef Biryani', 58], ['Mint Lemonade', 39]],
      rightTitle: 'Free tools', working: 'Making', allDone: 'All ready', pendingLabel: 'making', doneLabel: 'ready',
      queue: [['Invoice #1042 · PDF', 'Free Invoice Generator', 0.8], ['Quotation Q-218', 'Turns into an invoice', 1.6], ['Pay stub · May', 'Net pay worked out', 2.4]],
    },
    close: { label: "This week's sales", cur: 'PKR ', big: 148000, series: [22, 30, 28, 44, 50, 47, 64, 70, 68, 84], chips: ['AI menu import', 'GEO audit', 'Free tools'], head: ['Run the business with', 'AI built in.'] },
  }),
}
