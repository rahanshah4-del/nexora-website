// Currencies a workspace can run in. `symbol` is the default display symbol
// (used as the placeholder in Settings and for the setup-wizard preview); the
// workspace owner can override it with their own symbol in Settings.
export const currencyCatalog = [
  { code: 'PKR', name: 'Pakistan Rupee', symbol: 'Rs', countries: ['Pakistan'] },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', countries: ['India'] },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', countries: ['Bangladesh'] },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', countries: ['Sri Lanka'] },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', countries: ['Nepal'] },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', countries: ['Afghanistan'] },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', countries: ['United Arab Emirates', 'UAE', 'Middle East'] },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', countries: ['Saudi Arabia'] },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', countries: ['Qatar'] },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', countries: ['Kuwait'] },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD', countries: ['Bahrain'] },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', countries: ['Oman'] },
  { code: 'USD', name: 'US Dollar', symbol: '$', countries: ['United States', 'USA'] },
  { code: 'GBP', name: 'British Pound', symbol: '£', countries: ['United Kingdom', 'UK'] },
  { code: 'EUR', name: 'Euro', symbol: '€', countries: ['Europe'] },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', countries: ['Canada'] },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', countries: ['Australia'] },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', countries: ['Malaysia'] },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', countries: ['Singapore'] },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', countries: ['South Africa'] },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', countries: ['Nigeria'] },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', countries: ['Kenya'] },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', countries: ['Egypt'] },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', countries: ['Turkey'] },
]

export const supportedCurrencies = currencyCatalog.map((item) => ({
  code: item.code,
  label: `${item.code} — ${item.name}`,
}))

export const supportedCurrencyCodes = currencyCatalog.map((item) => item.code)

// Countries offered by the workspace setup wizard. Picking one pre-selects its
// currency (the user can still pick any other currency).
export const setupCountries = [
  'Pakistan',
  'India',
  'Bangladesh',
  'Sri Lanka',
  'Nepal',
  'Afghanistan',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'Middle East',
  'United Kingdom',
  'Europe',
  'United States',
  'Canada',
  'Australia',
  'Malaysia',
  'Singapore',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Egypt',
  'Turkey',
]

// Static UI conversion rates relative to USD.
export const fxRates = {
  USD: 1,
  PKR: 278.5,
  AED: 3.67,
  SAR: 3.75,
  INR: 83.0,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.37,
  AUD: 1.52,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.377,
  OMR: 0.385,
}
