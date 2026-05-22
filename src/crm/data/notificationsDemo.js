function minutesAgo(min) {
  return new Date(Date.now() - min * 60 * 1000).toISOString()
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

function daysAgo(d) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()
}

export const notificationsDemo = [
  {
    id: 'notif_1',
    userId: 'demo',
    type: 'New Lead',
    title: 'New lead created',
    message: 'A new lead “James Carter” was added to the pipeline.',
    priority: 'high',
    read: false,
    createdAt: minutesAgo(7),
    relatedId: 'lead_demo_1',
  },
  {
    id: 'notif_2',
    userId: 'demo',
    type: 'Payment Received',
    title: 'Payment received',
    message: 'Invoice INV-1042 marked as paid (manual verification).',
    priority: 'medium',
    read: false,
    createdAt: hoursAgo(2),
    relatedId: 'inv_demo_1042',
  },
  {
    id: 'notif_3',
    userId: 'demo',
    type: 'Task Overdue',
    title: 'Follow-up overdue',
    message: 'Call with “NEXORA Retail” is overdue. Schedule a follow-up.',
    priority: 'high',
    read: true,
    createdAt: hoursAgo(18),
    relatedId: 'task_demo_2',
  },
  {
    id: 'notif_4',
    userId: 'demo',
    type: 'New Invoice',
    title: 'Invoice created',
    message: 'New invoice INV-1047 created for “BluePeak Labs”.',
    priority: 'low',
    read: true,
    createdAt: daysAgo(2),
    relatedId: 'inv_demo_1047',
  },
  {
    id: 'notif_5',
    userId: 'demo',
    type: 'Team Activity',
    title: 'Team member updated',
    message: 'Role updated for “Ayesha” to Manager.',
    priority: 'low',
    read: true,
    createdAt: daysAgo(4),
    relatedId: 'team_demo_1',
  },
]

