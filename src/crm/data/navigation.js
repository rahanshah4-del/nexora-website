import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineChartBarSquare,
  HiOutlineCog6Tooth,
  HiOutlineDocumentChartBar,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineInboxStack,
  HiOutlineLifebuoy,
  HiOutlineBell,
  HiOutlineRectangleStack,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineBriefcase,
  HiOutlineTag,
  HiOutlineSquares2X2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2'

export const navItems = [
  { label: 'Dashboard', to: '/app/dashboard', icon: HiOutlineHome },
  { label: 'Client Portal', to: '/app/client-portal', icon: HiOutlineSquares2X2 },
  { label: 'Customers', to: '/app/customers', icon: HiOutlineUsers },
  { label: 'Leads', to: '/app/leads', icon: HiOutlineUserGroup },
  { label: 'AI Lead Scoring', to: '/app/leads/scoring', icon: HiOutlineSparkles },
  { label: 'AI Assistant', to: '/app/ai-assistant', icon: HiOutlineChatBubbleLeftRight },
  { label: 'Sales Pipeline', to: '/app/pipeline', icon: HiOutlineRectangleStack },
  { label: 'Follow-Up Automation', to: '/app/follow-ups', icon: HiOutlineInboxStack },
  { label: 'Team Management', to: '/app/team', icon: HiOutlineShieldCheck },
  { label: 'HR Dashboard', to: '/app/hr', icon: HiOutlineBriefcase },
  { label: 'Invoices', to: '/app/invoices', icon: HiOutlineDocumentText },
  { label: 'Subscriptions', to: '/app/subscriptions', icon: HiOutlineTag },
  { label: 'Support Tickets', to: '/app/support', icon: HiOutlineLifebuoy },
  { label: 'Activity Logs', to: '/app/activity-logs', icon: HiOutlineDocumentChartBar },
  { label: 'Enterprise Analytics', to: '/app/analytics', icon: HiOutlineChartBarSquare },
  { label: 'Notifications', to: '/app/notifications', icon: HiOutlineBell },
  { label: 'Reports', to: '/app/reports', icon: HiOutlineDocumentChartBar },
  { label: 'Settings', to: '/app/settings', icon: HiOutlineCog6Tooth },
]


export const quickActions = [
  { label: 'Filters', to: '/app/analytics', icon: HiOutlineAdjustmentsHorizontal },
]
