import { useNavigate } from 'react-router-dom'

export default function UpgradeToBusinessButton({ className = '', children = 'Upgrade to Business' }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })}
      className={className}
    >
      {children}
    </button>
  )
}

