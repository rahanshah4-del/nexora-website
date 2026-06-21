import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineCalendarDays,
  HiOutlineCheckBadge,
  HiOutlineDocumentChartBar,
  HiOutlineCpuChip,
  HiOutlineSignal,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import useAuth from '../../context/useAuth.js'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import { useCustomers } from '../hooks/useCustomers.js'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import { useUser } from '../hooks/useUser.js'
import { registerAttendanceDevice } from '../lib/attendanceDevices.js'
import { createUserDoc, listenToWorkspaceCollection } from '../lib/firestore.js'

const STATUS_OPTIONS = ['present', 'absent', 'late', 'leave']

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function studentLabel(student = {}) {
  return student.studentName || student.name || student.customerName || 'Student'
}

function staffLabel(member = {}) {
  return member.fullName || member.name || member.displayName || member.email || 'Staff member'
}

function studentClass(student = {}) {
  return [student.className || student.class || student.grade, student.section].filter(Boolean).join(' - ') || 'Unassigned'
}

function staffDepartment(member = {}) {
  return member.department || member.role || member.position || 'Staff'
}

function statusTone(status) {
  if (status === 'present') return 'success'
  if (status === 'late') return 'warning'
  if (status === 'absent') return 'danger'
  return 'info'
}

function toSortableTime(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function sortNewest(rows = []) {
  return [...rows].sort((a, b) => toSortableTime(b.createdAt || b.syncedAt || b.punchTime || b.date) - toSortableTime(a.createdAt || a.syncedAt || a.punchTime || a.date))
}

export default function AttendancePage() {
  const { user } = useAuth()
  const { workspaceId, businessType } = useUser()
  const customersApi = useCustomers({ limitCount: 500 })
  const teamApi = useTeamMembers()
  const students = customersApi.customers || []
  const staff = teamApi.members || []
  const [mode, setMode] = useState('student')
  const [date, setDate] = useState(todayKey())
  const [personId, setPersonId] = useState('')
  const [status, setStatus] = useState('present')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [registeringDevice, setRegisteringDevice] = useState(false)
  const [devices, setDevices] = useState([])
  const [deviceLogs, setDeviceLogs] = useState([])
  const [studentAttendanceRows, setStudentAttendanceRows] = useState([])
  const [staffAttendanceRows, setStaffAttendanceRows] = useState([])
  const [deviceError, setDeviceError] = useState('')
  const [newDevice, setNewDevice] = useState({
    name: '',
    provider: 'ZKTeco / Biometric',
    deviceSerial: '',
    deviceType: 'biometric',
    defaultPersonType: 'student',
  })
  const [deviceCredentials, setDeviceCredentials] = useState(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideLanguage, setGuideLanguage] = useState('en')
  const [toast, setToast] = useState(null)

  const selectedStudent = useMemo(() => students.find((student) => student.id === personId), [personId, students])
  const selectedStaff = useMemo(() => staff.find((member) => member.id === personId), [personId, staff])
  const activeList = mode === 'student' ? students : staff
  const selectedPerson = mode === 'student' ? selectedStudent : selectedStaff
  const activeAttendanceRows = mode === 'student' ? studentAttendanceRows : staffAttendanceRows
  const reportUrl = mode === 'student'
    ? '/app/school-reports?report=student_attendance'
    : '/app/school-reports?report=staff_attendance'
  const connectedDevices = devices.filter((device) => String(device.status || '').toLowerCase() !== 'disabled').length
  const recentAutoLogs = deviceLogs.slice(0, 8)

  useEffect(() => {
    if (!personId && activeList.length) {
      setPersonId(activeList[0].id)
    }
  }, [activeList, personId])

  useEffect(() => {
    if (!workspaceId) {
      setDevices([])
      setDeviceLogs([])
      return undefined
    }
    const common = { workspaceId, businessType, orderByField: null, limitCount: 100 }
    const unsubs = [
      listenToWorkspaceCollection({
        ...common,
        collectionName: 'attendanceDevices',
        onData: (rows) => {
          setDevices(sortNewest(rows))
          setDeviceError('')
        },
        onError: (error) => {
          setDevices([])
          setDeviceError(error?.message || 'Unable to load attendance devices.')
        },
      }),
      listenToWorkspaceCollection({
        ...common,
        collectionName: 'attendanceDeviceLogs',
        onData: (rows) => {
          setDeviceLogs(sortNewest(rows))
          setDeviceError('')
        },
        onError: (error) => {
          setDeviceLogs([])
          setDeviceError(error?.message || 'Unable to load device attendance logs.')
        },
      }),
      listenToWorkspaceCollection({
        ...common,
        collectionName: 'studentAttendance',
        onData: (rows) => {
          setStudentAttendanceRows(sortNewest(rows))
          setDeviceError('')
        },
        onError: (error) => {
          setStudentAttendanceRows([])
          setDeviceError(error?.message || 'Unable to load student attendance records.')
        },
      }),
      listenToWorkspaceCollection({
        ...common,
        collectionName: 'staffAttendance',
        onData: (rows) => {
          setStaffAttendanceRows(sortNewest(rows))
          setDeviceError('')
        },
        onError: (error) => {
          setStaffAttendanceRows([])
          setDeviceError(error?.message || 'Unable to load staff attendance records.')
        },
      }),
    ]
    return () => unsubs.forEach((unsub) => unsub?.())
  }, [businessType, workspaceId])

  async function handleSave(event) {
    event.preventDefault()
    if (!workspaceId) {
      setToast({ tone: 'error', message: 'Workspace not ready. Please reload and try again.' })
      return
    }
    if (!personId) {
      setToast({ tone: 'warning', message: 'Please select a student or staff member.' })
      return
    }
    const isStudent = mode === 'student'
    const person = isStudent ? selectedStudent : selectedStaff
    if (!person) {
      setToast({ tone: 'warning', message: `Selected ${isStudent ? 'student' : 'staff member'} record could not be loaded. Please select again.` })
      return
    }
    const collectionName = isStudent ? 'studentAttendance' : 'staffAttendance'
    const payload = {
      date,
      status,
      attendance: status,
      note: note.trim(),
      source: 'attendance-module',
      ...(isStudent
        ? {
            studentId: person.id,
            studentName: studentLabel(person),
            name: studentLabel(person),
            className: studentClass(person),
            class: studentClass(person),
            section: person.section || '',
            rollNo: person.rollNo || '',
            admissionNo: person.admissionNo || '',
          }
        : {
            staffId: person.id,
            staffName: staffLabel(person),
            name: staffLabel(person),
            className: staffDepartment(person),
            department: staffDepartment(person),
            role: person.role || '',
          }),
      createdBy: user?.uid || workspaceId,
    }

    setSaving(true)
    try {
      await createUserDoc(workspaceId, collectionName, payload, { businessType })
      setToast({ tone: 'success', message: 'Attendance saved. Reports Center is now updated.' })
      setNote('')
    } catch (error) {
      setToast({ tone: 'error', message: error?.message || 'Unable to save attendance.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRegisterDevice(event) {
    event.preventDefault()
    if (!workspaceId) {
      setToast({ tone: 'error', message: 'Workspace not ready. Please reload and try again.' })
      return
    }
    setRegisteringDevice(true)
    setDeviceCredentials(null)
    try {
      const result = await registerAttendanceDevice({
        workspaceId,
        ...newDevice,
      })
      setDeviceCredentials(result)
      setToast({ tone: 'success', message: 'Attendance device connected. Save the secret now; it is shown once.' })
      setNewDevice({
        name: '',
        provider: 'ZKTeco / Biometric',
        deviceSerial: '',
        deviceType: 'biometric',
        defaultPersonType: 'student',
      })
    } catch (error) {
      setToast({ tone: 'error', message: error?.message || 'Unable to register attendance device.' })
    } finally {
      setRegisteringDevice(false)
    }
  }

  return (
    <div className="space-y-5">
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <button
        type="button"
        onClick={() => setGuideOpen(true)}
        className="fixed right-4 top-28 z-40 inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-100/70 transition hover:bg-indigo-50"
      >
        <HiOutlineSignal className="h-5 w-5" />
        Connection Guide
      </button>

      {guideOpen ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm" onClick={() => setGuideOpen(false)}>
          <aside
            className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Attendance Device</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{guideLanguage === 'ur' ? 'Connection Guide' : 'Connection Guide'}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {guideLanguage === 'ur'
                    ? 'Biometric/RFID device ko normally local middleware connect karta hai. Middleware device se punches read karke Nexora webhook par POST karega.'
                    : 'A biometric/RFID device is normally connected through local middleware. The middleware reads punches from the device and posts them to the Nexora webhook.'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-black">
                  <button type="button" onClick={() => setGuideLanguage('en')} className={`rounded-lg px-2.5 py-1.5 ${guideLanguage === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}>English</button>
                  <button type="button" onClick={() => setGuideLanguage('ur')} className={`rounded-lg px-2.5 py-1.5 ${guideLanguage === 'ur' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}>Urdu</button>
                </div>
                <button
                  type="button"
                  onClick={() => setGuideOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {(guideLanguage === 'ur'
                ? [
                    ['1. Device connect karein', 'Biometric/RFID device ko LAN par connect karein. Device IP/serial note karein. Agar ZKTeco hai to ZK middleware/bridge app use hoti hai.'],
                    ['2. Nexora me device register karein', 'Attendance page par device name, provider aur serial/IP enter karke Connect Device click karein.'],
                    ['3. Endpoint aur secret save karein', 'Register ke baad Device ID, Endpoint aur Secret show hoga. Secret sirf aik dafa show hota hai, is ko middleware config me save karein.'],
                    ['4. Middleware POST bheje', 'Middleware har punch ko endpoint par POST kare. Secret ko x-nexora-device-secret header me bhejna recommended hai.'],
                    ['5. Auto data reports me dikhega', 'Successful punch studentAttendance ya staffAttendance me save hota hai, Attendance page aur School Reports Center me auto show hota hai.'],
                  ]
                : [
                    ['1. Connect the device', 'Connect the biometric/RFID device to the local network. Note the device IP or serial number. ZKTeco devices usually need a ZK middleware or bridge app.'],
                    ['2. Register it in Nexora', 'On the Attendance page, enter the device name, provider, serial/IP, then click Connect Device.'],
                    ['3. Save endpoint and secret', 'After registration, Nexora shows Device ID, Endpoint, and Secret. The secret is shown once, so save it in your middleware config.'],
                    ['4. Send punches by POST', 'The middleware should POST each punch to the endpoint. Sending the secret in the x-nexora-device-secret header is recommended.'],
                    ['5. Data appears in reports', 'Successful punches are saved to studentAttendance or staffAttendance and show automatically in Attendance and School Reports Center.'],
                  ]).map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-sm font-black text-indigo-900">{guideLanguage === 'ur' ? 'POST payload example' : 'POST payload example'}</p>
              <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">{`POST {endpoint}
Header: x-nexora-device-secret: DEVICE_SECRET

{
  "workspaceId": "WORKSPACE_ID",
  "deviceId": "DEVICE_ID",
  "records": [
    {
      "personType": "student",
      "deviceUserId": "1001",
      "name": "Ali Khan",
      "className": "Class 5 - A",
      "status": "present",
      "timestamp": "2026-06-19T08:05:00+05:00"
    }
  ]
}`}</pre>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-900">{guideLanguage === 'ur' ? 'Important' : 'Important'}</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                {guideLanguage === 'ur'
                  ? 'Browser direct device IP se biometric logs read nahi kar sakta. Real auto sync ke liye device vendor SDK, local bridge app, ya cloud push service chahiye jo Nexora webhook ko call kare.'
                  : 'A browser cannot directly read biometric logs from a device IP. Real auto sync needs a device vendor SDK, local bridge app, or cloud push service that calls the Nexora webhook.'}
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      <PageHeader
        title="Attendance"
        subtitle="Mark student and staff attendance. Saved records are used by School ERP attendance reports."
        right={<Badge variant="info">Reports connected</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <HiOutlineUserGroup className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-500">Students</p>
              <p className="text-2xl font-black text-slate-950">{students.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <HiOutlineCheckBadge className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-500">Staff</p>
              <p className="text-2xl font-black text-slate-950">{staff.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <HiOutlineDocumentChartBar className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-500">Report Link</p>
              <Link to={reportUrl} className="text-sm font-black text-sky-700 hover:text-sky-900">
                Open attendance report
              </Link>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700">
              <HiOutlineCpuChip className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-500">Devices</p>
              <p className="text-2xl font-black text-slate-950">{connectedDevices}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <HiOutlineCpuChip className="h-5 w-5 text-violet-600" />
            <h2 className="text-base font-black text-slate-950">Connect Attendance Device</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Biometric/RFID device ya local middleware is webhook endpoint par punches send karega. Data auto attendance me save ho kar reports me show hoga.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleRegisterDevice}>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Device Name</span>
              <Input value={newDevice.name} onChange={(event) => setNewDevice((current) => ({ ...current, name: event.target.value }))} placeholder="Main Gate Biometric" className="mt-1.5" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Provider</span>
                <Input value={newDevice.provider} onChange={(event) => setNewDevice((current) => ({ ...current, provider: event.target.value }))} className="mt-1.5" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Serial/IP</span>
                <Input value={newDevice.deviceSerial} onChange={(event) => setNewDevice((current) => ({ ...current, deviceSerial: event.target.value }))} placeholder="SN/IP optional" className="mt-1.5" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Default Attendance Type</span>
              <Select value={newDevice.defaultPersonType} onChange={(event) => setNewDevice((current) => ({ ...current, defaultPersonType: event.target.value }))} className="mt-1.5">
                <option value="student">Student</option>
                <option value="staff">Staff</option>
              </Select>
            </label>
            <Button type="submit" disabled={registeringDevice} className="rounded-2xl">
              {registeringDevice ? 'Connecting...' : 'Connect Device'}
            </Button>
          </form>

          {deviceCredentials ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Save this one-time secret</p>
              <p className="mt-2 break-all text-xs font-bold text-slate-700">Device ID: {deviceCredentials.deviceId}</p>
              <p className="mt-1 break-all text-xs font-bold text-slate-700">Endpoint: {deviceCredentials.endpoint}</p>
              <p className="mt-1 break-all text-xs font-bold text-slate-700">Secret: {deviceCredentials.secret}</p>
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Auto Sync Devices</h2>
              <p className="mt-1 text-sm text-slate-600">Connected devices and recent automatic punches.</p>
            </div>
            <Badge variant={connectedDevices ? 'success' : 'default'}>{connectedDevices ? 'Auto ready' : 'No device'}</Badge>
          </div>
          {deviceError ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{deviceError}</p> : null}
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Devices</p>
              {devices.length ? devices.map((device) => (
                <div key={device.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-900">{device.name || 'Attendance Device'}</p>
                    <Badge variant={String(device.status || '').toLowerCase() === 'disabled' ? 'warning' : 'success'}>{device.status || 'connected'}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{device.provider || 'Generic'} · {device.deviceSerial || 'No serial'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Punches: {device.totalPunches || 0}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No attendance device connected yet.</div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Recent auto punches</p>
              {recentAutoLogs.length ? recentAutoLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-900">{log.name || log.studentName || log.staffName || 'Unknown'}</p>
                    <Badge variant={statusTone(String(log.attendance || log.status || 'present').toLowerCase())}>{String(log.attendance || log.status || 'present').toUpperCase()}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{log.deviceName || 'Device'} · {log.date || 'No date'}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Device punches will appear here after sync.</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <HiOutlineCalendarDays className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-black text-slate-950">Mark Attendance</h2>
          </div>
          <form className="mt-5 space-y-4" onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-sm font-black">
              <button type="button" onClick={() => { setMode('student'); setPersonId('') }} className={`rounded-xl px-3 py-2 transition ${mode === 'student' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}>Student</button>
              <button type="button" onClick={() => { setMode('staff'); setPersonId('') }} className={`rounded-xl px-3 py-2 transition ${mode === 'staff' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}>Staff</button>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Date</span>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5" />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">{mode === 'student' ? 'Student' : 'Staff member'}</span>
              <Select value={personId} onChange={(event) => setPersonId(event.target.value)} className="mt-1.5">
                <option value="">Select {mode === 'student' ? 'student' : 'staff'}</option>
                {activeList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {mode === 'student' ? `${studentLabel(item)} - ${studentClass(item)}` : `${staffLabel(item)} - ${staffDepartment(item)}`}
                  </option>
                ))}
              </Select>
              {!activeList.length ? (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                  No {mode === 'student' ? 'student' : 'staff'} records found. School Dashboard par Add Test Data click karein.
                </p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Status</span>
              <Select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5">
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item.slice(0, 1).toUpperCase() + item.slice(1)}</option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Note</span>
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" className="mt-1.5" />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving} className="rounded-2xl">
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
              <Link to={reportUrl} className="focus-ring inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300">
                Open Report
              </Link>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-black text-slate-950">Report Wiring</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Student records save into <span className="font-bold">studentAttendance</span> and staff records save into <span className="font-bold">staffAttendance</span>. The School Reports Center reads these same collections for attendance overview, Student Attendance Report, and Staff Attendance Report.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link to="/app/school-reports?report=student_attendance" className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-black text-indigo-700 transition hover:bg-indigo-100">
              Student Attendance Report
            </Link>
            <Link to="/app/school-reports?report=staff_attendance" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100">
              Staff Attendance Report
            </Link>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Selected</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {selectedPerson
                ? mode === 'student'
                  ? `${studentLabel(selectedPerson)} - ${studentClass(selectedPerson)}`
                  : `${staffLabel(selectedPerson)} - ${staffDepartment(selectedPerson)}`
                : 'No record selected yet.'}
            </p>
            <div className="mt-3 inline-flex">
              <Badge variant={statusTone(status)}>{status.toUpperCase()}</Badge>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Saved Attendance</p>
              <Badge variant={activeAttendanceRows.length ? 'success' : 'default'}>{activeAttendanceRows.length} records</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {activeAttendanceRows.slice(0, 8).length ? activeAttendanceRows.slice(0, 8).map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-black text-slate-900">
                      {mode === 'student' ? row.studentName || row.name || 'Student' : row.staffName || row.name || 'Staff member'}
                    </p>
                    <Badge variant={statusTone(String(row.attendance || row.status || 'present').toLowerCase())}>
                      {String(row.attendance || row.status || 'present').toUpperCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {[row.className || row.class || row.department, row.date || 'No date', row.source || 'attendance'].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
                  No saved {mode === 'student' ? 'student' : 'staff'} attendance yet. Save attendance ya Add Test Data click karein.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
