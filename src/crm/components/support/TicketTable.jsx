import { useMemo } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Table from '../ui/Table.jsx'

function statusVariant(status) {
  if (status === 'Resolved') return 'success'
  if (status === 'In Progress') return 'info'
  if (status === 'Closed') return 'default'
  return 'warning'
}

function priorityVariant(priority) {
  if (priority === 'Urgent') return 'danger'
  if (priority === 'High') return 'warning'
  if (priority === 'Medium') return 'info'
  return 'default'
}

export default function TicketTable({ tickets, onOpen }) {
  const columns = useMemo(
    () => [
      { key: 'ticketNumber', header: 'Ticket', cell: (r) => <span className="font-semibold">{r.ticketNumber}</span> },
      { key: 'subject', header: 'Subject', cell: (r) => <span className="font-semibold">{r.subject}</span> },
      { key: 'customerName', header: 'Customer' },
      { key: 'assignedTo', header: 'Assigned', cell: (r) => <Badge variant="default">{r.assignedTo}</Badge> },
      { key: 'priority', header: 'Priority', cell: (r) => <Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge> },
      { key: 'status', header: 'Status', cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
      { key: 'updatedAt', header: 'Updated' },
      {
        key: 'actions',
        header: 'Actions',
        cell: (r) => (
          <Button variant="ghost" className="rounded-2xl" type="button" onClick={() => onOpen?.(r)}>
            View
          </Button>
        ),
      },
    ],
    [onOpen],
  )

  return <Table columns={columns} rows={tickets} />
}

