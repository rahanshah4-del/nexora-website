# CRM Test Checklist

Use a clean client workspace and confirm each step keeps data scoped to the logged-in account.

- Create customer: add a customer, confirm it appears in Customers and dashboard customer count.
- Create product: add a product with PKR price and stock, confirm it appears in Products.
- Create invoice: select the product, set quantity, tax, and discount; confirm subtotal, tax, total, amount paid, and balance due are correct.
- Approval Center: confirm the new pending invoice appears immediately with invoice number, customer, amount, amount paid, balance due, currency, and status.
- Approve invoice: approve the invoice and confirm payment status remains pending until marked paid.
- Partial payment: record a partial payment and confirm amount paid increases, balance due decreases, and status becomes partial.
- Mark paid: mark the invoice as paid and confirm payment record is created, balance due is 0, status is paid, and product stock is reduced once.
- Add expense: create or submit an expense, confirm it is pending and appears in Approvals.
- Approve expense: approve the expense and confirm it is counted in reports and profit.
- Reject expense: reject an expense and confirm it is ignored by reports and profit.
- Dashboard: confirm revenue counts only paid invoices/payments, customers count is real, active leads count is real, pending invoices are real, expenses are approved only, and profit equals revenue minus expenses.
- Reports: confirm revenue, invoices, payments, expenses, profit, customers, and leads match dashboard numbers for the same date range.
- Activity logs: confirm invoice created, payment recorded, approval done, expense added, customer added, product added, and subscription upgraded actions appear.
- Invalid data check: create no records with blank amount/currency/customer; confirm no NaN or undefined appears in the UI.
