import { useMemo, useState } from 'react'
import { HiOutlineCalculator, HiOutlineChartBarSquare, HiOutlineClock, HiOutlineCurrencyDollar, HiOutlineUserGroup } from 'react-icons/hi2'

export default function RoiCalculator() {
  const [inputs, setInputs] = useState({
    employees: 5,
    dailyCustomers: 50,
    dailySales: 25000,
    monthlyExpenses: 150000,
    branches: 1,
  })

  const set = (key) => (e) => setInputs((p) => ({ ...p, [key]: Number(e.target.value) || 0 }))

  const results = useMemo(() => {
    const { employees, dailyCustomers, dailySales, monthlyExpenses, branches } = inputs
    const monthlyRevenue = dailySales * 30 * branches
    const timeSavedHrs = employees * 15 // ~15 hrs/month per employee saved
    const efficiencyGain = dailyCustomers * 0.15 * 30 * branches // 15% more customers
    const monthlySavings = monthlyExpenses * 0.25 // 25% cost reduction
    const yearlySavings = monthlySavings * 12
    const revenueIncrease = efficiencyGain * (dailySales / dailyCustomers || 500) * 0.1
    const roi = monthlyRevenue > 0 ? Math.round((monthlySavings + revenueIncrease) / (monthlyExpenses || 1) * 100) : 0
    return { monthlySavings, yearlySavings, timeSavedHrs, revenueIncrease, roi }
  }, [inputs])

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
            <HiOutlineCalculator className="h-3.5 w-3.5" />
            ROI Calculator
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-3xl">
            See how much Nexora saves your business
          </h2>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Inputs */}
          <div className="grid gap-4">
            {[
              { key: 'employees', label: 'Number of Employees', icon: HiOutlineUserGroup },
              { key: 'dailyCustomers', label: 'Daily Customers', icon: HiOutlineChartBarSquare },
              { key: 'dailySales', label: 'Average Daily Sales (PKR)', icon: HiOutlineCurrencyDollar },
              { key: 'monthlyExpenses', label: 'Monthly Expenses (PKR)', icon: HiOutlineChartBarSquare },
              { key: 'branches', label: 'Number of Branches', icon: HiOutlineCalculator },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-slate-500">
                  <Icon className="h-4 w-4" />
                  {label}
                </label>
                <input
                  type="number"
                  value={inputs[key]}
                  onChange={set(key)}
                  className="h-11 w-full rounded-xl border border-slate-200/60 bg-slate-50 px-4 text-[15px] font-medium text-[#1d1d1f] outline-none transition-all duration-200 focus:border-[#0071e3] focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            ))}
          </div>

          {/* Results */}
          <div className="grid gap-3">
            {[
              { label: 'Monthly Savings', value: `PKR ${results.monthlySavings.toLocaleString('en-PK')}`, icon: HiOutlineCurrencyDollar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Yearly Savings', value: `PKR ${results.yearlySavings.toLocaleString('en-PK')}`, icon: HiOutlineChartBarSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Time Saved', value: `${results.timeSavedHrs} hrs/month`, icon: HiOutlineClock, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Revenue Increase', value: `PKR ${results.revenueIncrease.toLocaleString('en-PK')}/mo`, icon: HiOutlineChartBarSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Estimated ROI', value: `${results.roi}%`, icon: HiOutlineCalculator, color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`flex items-center gap-4 rounded-xl ${bg} p-4 animate-[fadeIn_0.3s_ease-out_forwards]`}>
                <Icon className={`h-6 w-6 ${color}`} />
                <div>
                  <p className="text-[12px] font-medium text-slate-500">{label}</p>
                  <p className={`text-lg font-semibold tracking-[-0.01em] ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
