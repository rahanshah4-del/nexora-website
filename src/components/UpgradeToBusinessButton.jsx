import { useNavigate } from 'react-router-dom'
import { safeTrackMetaEventOnce } from '../lib/metaPixel.js'

export default function UpgradeToBusinessButton({ className = '', children = 'Upgrade to Business' }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => {
        safeTrackMetaEventOnce('InitiateCheckout', undefined, 'nexora_meta_initiatecheckout', 'session')
        navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })
      }}
      className={className}
    >
      {children}
    </button>
  )
}

