import { HiOutlineArrowDownTray, HiOutlineEye } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'

export default function ReportCard({ report, onView }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{report.title}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{report.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="default">{report.category}</Badge>
            <Badge variant={report.status === 'Live' ? 'success' : 'warning'}>{report.status}</Badge>
            <Badge variant="purple">{report.summary}</Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400">Updated: {report.lastUpdated}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="rounded-2xl" type="button" onClick={onView}>
          <HiOutlineEye className="text-lg" />
          View Report
        </Button>
        <Button variant="subtle" className="rounded-2xl" type="button">
          <HiOutlineArrowDownTray className="text-lg" />
          PDF
        </Button>
        <Button variant="ghost" className="rounded-2xl" type="button">
          Excel
        </Button>
        <Button variant="ghost" className="rounded-2xl" type="button">
          CSV
        </Button>
      </div>
    </Card>
  )
}
