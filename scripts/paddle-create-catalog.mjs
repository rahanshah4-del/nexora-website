/**
 * Paddle Live Catalog Creator
 *
 * Creates: Starter, Pro, Advanced — each with monthly + yearly prices + 7-day trial
 * + country overrides for UK (GBP), Ireland (EUR), Australia (AUD)
 *
 * Usage:
 *   PADDLE_LIVE_API_KEY="your_live_key" node scripts/paddle-create-catalog.mjs
 */

const PADDLE_API = 'https://api.paddle.com'

// ── Plan Definitions ──
// Paddle amounts: lowest denomination strings (USD 10.00 = "1000")
const PLANS = [
  {
    name: 'Starter',
    taxCategory: 'software',
    description: 'Nexora Starter Plan — ideal for small businesses getting started with digital operations.',
    monthly: { description: 'Starter — Monthly', amount: '1000',    currency: 'USD', trialDays: 7 },
    yearly:  { description: 'Starter — Yearly',  amount: '10000',   currency: 'USD', trialDays: 7, interval: 'year', frequency: 1 },
  },
  {
    name: 'Pro',
    taxCategory: 'software',
    description: 'Nexora Pro Plan — for growing businesses that need advanced features and more users.',
    monthly: { description: 'Pro — Monthly', amount: '4000',    currency: 'USD', trialDays: 7 },
    yearly:  { description: 'Pro — Yearly',  amount: '40000',   currency: 'USD', trialDays: 7, interval: 'year', frequency: 1 },
  },
  {
    name: 'Advanced',
    taxCategory: 'software',
    description: 'Nexora Advanced Plan — unlimited everything for large teams and enterprises.',
    monthly: { description: 'Advanced — Monthly', amount: '12000',   currency: 'USD', trialDays: 7 },
    yearly:  { description: 'Advanced — Yearly',  amount: '120000',  currency: 'USD', trialDays: 7, interval: 'year', frequency: 1 },
  },
]

// ── Country Overrides (monthly prices, in local lowest denomination) ──
const OVERRIDES = [
  {
    country: 'GBR',
    currency: 'GBP',
    label: 'United Kingdom',
    // GBP amounts — Starter, Pro, Advanced monthly (in pence!)
    monthlyAmounts: ['800', '3200', '9600'],
    yearlyAmounts:  ['8000', '32000', '96000'],
  },
  {
    country: 'IRL',
    currency: 'EUR',
    label: 'Ireland',
    // EUR amounts — in cents
    monthlyAmounts: ['900', '3600', '10800'],
    yearlyAmounts:  ['9000', '36000', '108000'],
  },
  {
    country: 'AUS',
    currency: 'AUD',
    label: 'Australia',
    // AUD amounts — in cents
    monthlyAmounts: ['1200', '4800', '14400'],
    yearlyAmounts:  ['12000', '48000', '144000'],
  },
]

async function apiKey() {
  const key = process.env.PADDLE_LIVE_API_KEY
  if (!key) {
    console.error('❌ Set PADDLE_LIVE_API_KEY environment variable.')
    process.exit(1)
  }
  return key
}

async function paddleRequest(key, method, path, body = null) {
  const url = `${PADDLE_API}${path}`
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  const data = await res.json()
  if (!res.ok) {
    const err = JSON.stringify(data, null, 2)
    throw new Error(`Paddle ${method} ${path} failed (${res.status}): ${err}`)
  }
  return data.data
}

async function main() {
  const key = await apiKey()
  console.log('🔑 Using live API key\n')

  const catalog = []

  for (const plan of PLANS) {
    console.log(`📦 Creating product: ${plan.name}...`)

    // 1. Create product
    const product = await paddleRequest(key, 'POST', '/products', {
      name: plan.name,
      tax_category: plan.taxCategory,
      description: plan.description,
      type: 'standard',
    })
    console.log(`   ✅ Product created: ${product.id} (${product.name})`)

    // 2. Create monthly price
    const monthly = await paddleRequest(key, 'POST', '/prices', {
      description: plan.monthly.description,
      product_id: product.id,
      unit_price: {
        amount: plan.monthly.amount,
        currency_code: plan.monthly.currency,
      },
      billing_cycle: { interval: 'month', frequency: 1 },
      trial_period: { interval: 'day', frequency: plan.monthly.trialDays },
      quantity: { minimum: 1, maximum: 1 },
    })
    console.log(`   💰 Monthly price: ${monthly.id} — $${Number(plan.monthly.amount) / 100}/mo`)

    // 3. Create yearly price
    const yearly = await paddleRequest(key, 'POST', '/prices', {
      description: plan.yearly.description,
      product_id: product.id,
      unit_price: {
        amount: plan.yearly.amount,
        currency_code: plan.yearly.currency,
      },
      billing_cycle: { interval: 'year', frequency: 1 },
      trial_period: { interval: 'day', frequency: plan.yearly.trialDays },
      quantity: { minimum: 1, maximum: 1 },
    })
    console.log(`   💰 Yearly price:  ${yearly.id} — $${Number(plan.yearly.amount) / 100}/yr`)

    catalog.push({
      plan: plan.name,
      product_id: product.id,
      monthly_price_id: monthly.id,
      yearly_price_id: yearly.id,
      monthlyAmount: plan.monthly.amount,
      yearlyAmount: plan.yearly.amount,
    })
    console.log('')
  }

  // 4. Country overrides
  console.log('🌍 Creating country price overrides...\n')

  for (const override of OVERRIDES) {
    console.log(`   📍 ${override.label} (${override.currency})`)

    for (let i = 0; i < PLANS.length; i++) {
      const plan = catalog[i]

      // Monthly override
      const monthlyOverride = await paddleRequest(key, 'POST', '/prices', {
        description: `${PLANS[i].name} — Monthly (${override.label})`,
        product_id: plan.product_id,
        unit_price: {
          amount: override.monthlyAmounts[i],
          currency_code: override.currency,
        },
        billing_cycle: { interval: 'month', frequency: 1 },
        trial_period: { interval: 'day', frequency: 7 },
        quantity: { minimum: 1, maximum: 1 },
        custom_data: { country_override: override.country },
      })
      console.log(`      Monthly: ${monthlyOverride.id} — ${(Number(override.monthlyAmounts[i])/100).toFixed(2)} ${override.currency}/mo`)

      // Yearly override
      const yearlyOverride = await paddleRequest(key, 'POST', '/prices', {
        description: `${PLANS[i].name} — Yearly (${override.label})`,
        product_id: plan.product_id,
        unit_price: {
          amount: override.yearlyAmounts[i],
          currency_code: override.currency,
        },
        billing_cycle: { interval: 'year', frequency: 1 },
        trial_period: { interval: 'day', frequency: 7 },
        quantity: { minimum: 1, maximum: 1 },
        custom_data: { country_override: override.country },
      })
      console.log(`      Yearly:  ${yearlyOverride.id} — ${(Number(override.yearlyAmounts[i])/100).toFixed(2)} ${override.currency}/yr`)
    }
    console.log('')
  }

  // 5. Summary
  console.log('═'.repeat(60))
  console.log('📋 CATALOG SUMMARY — Save this mapping!\n')
  console.log('%-12s %-22s %-22s %-22s'.replace(/%/g, ''))
  console.log('PLAN         PRODUCT_ID            MONTHLY_PRICE          YEARLY_PRICE')
  console.log('─'.repeat(85))
  for (const item of catalog) {
    console.log(`${item.plan.padEnd(12)} ${item.product_id.padEnd(22)} ${item.monthly_price_id.padEnd(22)} ${item.yearly_price_id}`)
  }
  console.log('\n🌍 Country overrides created for: GBR (GBP), IRL (EUR), AUS (AUD)')
  console.log('   Each has its own monthly + yearly price IDs')
  console.log('\n✅ Done — live catalog ready!')
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
