import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'
import { HiOutlineCheck, HiOutlineXMark } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser.js'
import { getPlanCatalog, packageNameForPlan } from '../../data/moduleAccess.js'

function PricingModal({ open, onClose }) {
  const { plan, accessPlan, isTrialActive } = useUser()
  const navigate = useNavigate()
  const plans = getPlanCatalog()
  const currentPackage = packageNameForPlan(accessPlan || plan)

  function choosePackage() {
    onClose?.()
    navigate('/upgrade-business')
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="crm-modal-panel"
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">Choose Package</p>
                    <Badge variant="purple">Packages</Badge>
                    {accessPlan === 'Business' ? <Badge variant="success">{isTrialActive ? 'Trial Active' : 'Active'}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Compare Basic, Standard, Premium, and Enterprise package options.
                  </p>
                </div>
                <button
                  type="button"
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <HiOutlineXMark className="text-xl" />
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {plans.map((p) => {
                  const isCurrent = currentPackage === p.id
                  const isFeatured = p.id === 'Standard'
                  return (
                    <div
                      key={p.id}
                      className={[
                        'glass-muted rounded-2xl border p-4',
                        isFeatured ? 'border-indigo-500/30 shadow-glow' : 'border-white/20 dark:border-white/10',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{p.description}</p>
                        </div>
                        {isCurrent ? <Badge variant="success">Current</Badge> : isFeatured ? <Badge variant="purple">Best</Badge> : null}
                      </div>

                      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        {p.priceLabel}
                      </p>

                      <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        {p.features.map((f) => (
                          <div key={f} className="flex items-center gap-2">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                              <HiOutlineCheck className="text-sm" />
                            </span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      {p.contactSales ? (
                        <Button
                          variant="subtle"
                          className="mt-5 w-full rounded-2xl"
                          onClick={() => {
                            onClose?.()
                            navigate('/app/subscriptions')
                          }}
                        >
                          Contact Sales
                        </Button>
                      ) : (
                        <Button
                          className="mt-5 w-full rounded-2xl"
                          onClick={choosePackage}
                          disabled={isCurrent && !isTrialActive}
                        >
                          {isCurrent && !isTrialActive ? `${p.name} Active` : 'View Package'}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default memo(PricingModal)
