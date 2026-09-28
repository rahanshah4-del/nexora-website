/** Currency choices for pickers (built once). */

import { getCurrencyMeta, listCurrencies } from '../engine/index.js'

let currencyOptionsCache = null
export function currencyOptions() {
  if (!currencyOptionsCache) {
    currencyOptionsCache = listCurrencies().map((code) => {
      const meta = getCurrencyMeta(code, 'en')
      const symbol = meta.narrowSymbol && meta.narrowSymbol !== code ? meta.narrowSymbol : ''
      return { value: code, label: `${code}${symbol ? ` · ${symbol}` : ''}`, detail: meta.name, search: `${code} ${symbol} ${meta.name}` }
    })
  }
  return currencyOptionsCache
}
