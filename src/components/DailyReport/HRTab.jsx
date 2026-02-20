import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { supabase } from '../../supabaseClient'

const templateHeaders = [
  'sr',
  'username',
  'cnic',
  'uc_ward',
  'type',
  'datetime'
]

const attendanceHeaders = [
  'check_in',
  'check_out',
  'username',
  'father_name',
  'cnic',
  'designation',
  'uc_ward',
  'attendance_point',
  'type'
]

export default function HRTab() {
  const [active, setActive] = useState('checkin')
  const [checkinRows, setCheckinRows] = useState([])
  const [checkoutRows, setCheckoutRows] = useState([])
  const [attendanceRows, setAttendanceRows] = useState([])
  const [pasteText, setPasteText] = useState('')
  const [pasteGrid, setPasteGrid] = useState([])
  const [pasteStart, setPasteStart] = useState({ r: 0, c: 0 })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadMode, setUploadMode] = useState('choose') // 'choose' | 'file' | 'paste'
  const [selectedFileName, setSelectedFileName] = useState('')
  const [previewRows, setPreviewRows] = useState([]) // preview of uploaded file (first few rows)
  const [pasteNotice, setPasteNotice] = useState('') // show brief paste feedback
  const [attendanceOverrides, setAttendanceOverrides] = useState({})
  const [pushAll, setPushAll] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [workerData, setWorkerData] = useState({})
  const [pushedData, setPushedData] = useState([]) // Store successfully pushed records
  const [showPushedDataModal, setShowPushedDataModal] = useState(false)

  // Get current rows based on active tab
  const rows = active === 'checkin' ? checkinRows : active === 'checkout' ? checkoutRows : []
  const setRows = active === 'checkin' ? setCheckinRows : active === 'checkout' ? setCheckoutRows : () => { }

  const updateRowField = (idx, field, value) => {
    const currentRows = active === 'checkin' ? checkinRows : checkoutRows
    const setCurrentRows = active === 'checkin' ? setCheckinRows : setCheckoutRows
    setCurrentRows(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }



  const handleTablePaste = async (e) => {
    // Capture clipboard text and apply it directly to the table (auto-apply)
    const text = e?.clipboardData?.getData('text') || ''
    if (!text) return
    e.preventDefault()
    handleApplyPaste(text)
  }


  const mapHeaderToKey = (h) => {
    const key = (h || '').toLowerCase().trim()
    if (key === 'sr' || key.includes('sr') || key.includes('serial')) return 'sr'
    if (key.includes('user') || key.includes('name')) return 'username'
    if (key.includes('cnic')) return 'cnic'
    if (key.includes('uc') || key.includes('ward')) return 'uc_ward'
    if (key.includes('type') || key.includes('attendance type')) return 'type'
    if (key.includes('date') || key.includes('time')) return 'datetime'
    if (key.includes('check-in') || key.includes('check_in')) return 'check_in'
    if (key.includes('check-out') || key.includes('check_out')) return 'check_out'
    if (key.includes('father') || key.includes('husband')) return 'father_name'
    if (key.includes('designation')) return 'designation'
    if (key.includes('attendance point')) return 'attendance_point'
    return null
  }

  const getHeaderLabel = (key) => {
    const labels = {
      sr: 'SR',
      username: 'USERNAME',
      father_name: 'FATHER/HUSBAND',
      cnic: 'CNIC',
      designation: 'DESIGNATION',
      uc_ward: 'UC/WARD',
      attendance_point: 'ATTENDANCE POINT',
      check_in: 'CHECK-IN',
      check_out: 'CHECK-OUT',
      type: 'ATTENDANCE TYPE',
      datetime: 'DATE&TIME'
    }
    return labels[key] || key.toUpperCase()
  }

  const handleApplyPaste = (directText) => {
    const source = (typeof directText === 'string' ? directText : pasteText || '')
    if (!source || !source.trim()) return
    const lines = source.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    const delim = lines[0].includes('\t') ? '\t' : ','
    const firstParts = lines[0].split(delim).map(p => p.trim())

    // Determine if first row is header-like
    const headerKeys = firstParts.map(h => mapHeaderToKey(h))
    const hasHeader = headerKeys.some(k => k !== null)

    const newRows = []

    for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
      const parts = lines[i].split(delim).map(p => p.trim())
      const obj = { sr: '', username: '', cnic: '', uc_ward: '', type: '', datetime: '' }

      if (hasHeader) {
        for (let j = 0; j < firstParts.length; j++) {
          const key = mapHeaderToKey(firstParts[j])
          if (!key) continue
          obj[key] = parts[j] || ''
        }
      } else {
        // Map by template order when there's no header
        for (let j = 0; j < Math.min(parts.length, templateHeaders.length); j++) {
          obj[templateHeaders[j]] = parts[j] || ''
        }
      }

      newRows.push(obj)
    }

    if (newRows.length > 0) {
      setRows(prev => ([...prev, ...newRows]))
    }

    if (typeof directText !== 'string') {
      setPasteText('')
      setShowUploadModal(false)
    }
  }

  const downloadTemplate = () => {
    let headerRow
    if (active === 'attendance') {
      headerRow = ['CHECK-IN', 'CHECK-OUT', 'NAME', 'FATHER/HUSBAND', 'CNIC', 'DESIGNATION', 'UC/WARD', 'ATTENDANCE POINT', 'ATTENDANCE TYPE']
    } else {
      headerRow = ['SR', 'Username', 'CNIC', 'UC/Ward', 'Type', 'Date&Time']
    }
    const ws = XLSX.utils.aoa_to_sheet([headerRow])
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `attendance-hr-template.xlsx`)
  }

  const computeAttendance = () => {
    // Aggregate check-in and check-out rows separately and merge them
    const map = new Map()

    const getKey = (r, idx, prefix) => {
      // Prioritize CNIC if valid (length > 4 is a heuristic check)
      if (r.cnic && String(r.cnic).trim().length > 4) return String(r.cnic).trim()
      // Then Username if valid
      if (r.username && String(r.username).trim().length > 1) return String(r.username).trim()
      // Then SR
      if (r.sr) return `sr-${r.sr}`
      // Fallback
      return `${prefix}-${idx}`
    }

    // Process check-in rows
    checkinRows.forEach((r, idx) => {
      const key = getKey(r, idx, 'checkin')

      const existing = map.get(key) || {
        _key: key,
        sr: r.sr || '',
        username: r.username || '',
        cnic: r.cnic || '',
        uc_ward: r.uc_ward || '',
        last_check_in_ts: 0,
        last_check_out_ts: 0,
        last_check_in: '',
        last_check_out: '',
        presentFlag: false,
        absentFlag: false,
        manual: false
      }

      const dt = r.datetime || ''
      const type = (r.type || '').toLowerCase()

      // Update basic info if missing
      if (!existing.username && r.username) existing.username = r.username
      if (!existing.cnic && r.cnic) existing.cnic = r.cnic
      if (!existing.uc_ward && r.uc_ward) existing.uc_ward = r.uc_ward

      // Check if type explicitly marks as Absent
      // Also check check_in value for explicit absent marker
      const checkInVal = (r.check_in || '').toString().trim().toUpperCase()
      if (type.includes('absent') || checkInVal === 'A' || checkInVal === 'ABSENT' || checkInVal === 'LEAVE' || checkInVal === 'L') {
        existing.absentFlag = true
        // If explicitly absent, ensure we don't accidentally mark present
        if (checkInVal === 'A' || checkInVal === 'ABSENT') existing.presentFlag = false
      } else {
        // Inherently present if in Check-In list (unless absent)
        existing.presentFlag = true
        // If no timestamp and no existing check-in string, set a default
        if (!existing.last_check_in) existing.last_check_in = 'Checked In'
      }

      // determine check-in timestamp
      let parsedIn = 0
      if (r.check_in) parsedIn = Date.parse(r.check_in) || 0
      else if (type.includes('in') || type.includes('check-in') || type.includes('checkin')) parsedIn = Date.parse(dt) || 0
      else if (dt) parsedIn = Date.parse(dt) || 0

      if (parsedIn && parsedIn > (existing.last_check_in_ts || 0)) {
        existing.last_check_in_ts = parsedIn
        existing.last_check_in = r.check_in || dt || new Date(parsedIn).toISOString()
      }

      map.set(key, existing)
    })

    // Process check-out rows
    checkoutRows.forEach((r, idx) => {
      const key = getKey(r, idx, 'checkout')

      const existing = map.get(key) || {
        _key: key,
        sr: r.sr || '',
        username: r.username || '',
        cnic: r.cnic || '',
        uc_ward: r.uc_ward || '',
        last_check_in_ts: 0,
        last_check_out_ts: 0,
        last_check_in: '',
        last_check_out: '',
        presentFlag: false,
        absentFlag: false,
        manual: false
      }

      const dt = r.datetime || ''
      const type = (r.type || '').toLowerCase()

      // Update basic info if missing
      if (!existing.username && r.username) existing.username = r.username
      if (!existing.cnic && r.cnic) existing.cnic = r.cnic
      if (!existing.uc_ward && r.uc_ward) existing.uc_ward = r.uc_ward

      // Check if type explicitly marks as Absent
      // Also check check_out value for explicit absent marker
      const checkOutVal = (r.check_out || '').toString().trim().toUpperCase()
      if (type.includes('absent') || checkOutVal === 'A' || checkOutVal === 'ABSENT' || checkOutVal === 'LEAVE' || checkOutVal === 'L') {
        existing.absentFlag = true
        // If explicitly absent, ensure we don't accidentally mark present
        if (checkOutVal === 'A' || checkOutVal === 'ABSENT') existing.presentFlag = false
      } else {
        // Only mark as present if we actually have a check-out timestamp or value
        existing.presentFlag = true
        if (!existing.last_check_out) existing.last_check_out = 'Checked Out'
      }

      // determine check-out timestamp
      let parsedOut = 0
      if (r.check_out) parsedOut = Date.parse(r.check_out) || 0
      else if (type.includes('out') || type.includes('check-out') || type.includes('checkout')) parsedOut = Date.parse(dt) || 0
      else if (dt) parsedOut = Date.parse(dt) || 0

      if (parsedOut && parsedOut > (existing.last_check_out_ts || 0)) {
        existing.last_check_out_ts = parsedOut
        existing.last_check_out = r.check_out || dt || new Date(parsedOut).toISOString()
      }

      map.set(key, existing)
    })

    const res = Array.from(map.values()).map((e, i) => {
      const inTs = e.last_check_in_ts || 0
      const outTs = e.last_check_out_ts || 0

      let status = 'Absent'

      if (e.absentFlag) {
        status = 'Absent'
      } else if (e.presentFlag) {
        status = 'Present'
      } else if (inTs || outTs) {
        status = 'Present'
      }

      // Apply manual override if present
      if (attendanceOverrides && attendanceOverrides[e._key] !== undefined) {
        status = attendanceOverrides[e._key]
        e.manual = true
      } else if (attendanceOverrides && e.username && attendanceOverrides[e.username] !== undefined) {
        status = attendanceOverrides[e.username]
        e.manual = true
      } else {
        e.manual = false
      }

      e.status = status
      e.sr = e.sr || (i + 1)

      // ensure display fields
      if (e.last_check_in_ts && !e.last_check_in) e.last_check_in = new Date(e.last_check_in_ts).toISOString()
      if (e.last_check_out_ts && !e.last_check_out) e.last_check_out = new Date(e.last_check_out_ts).toISOString()

      return e
    })

    return res
  }

  const getAttendanceStatusLetter = (status) => {
    // Convert attendance status to P/L/A
    if (status === 'Present') return 'P'
    if (status === 'Absent') return 'A'
    if (status === 'Leave') return 'L'
    return '-'
  }

  const getCheckInStatus = (a) => {
    // Return P if check-in exists (either has timestamp, check-in data, or check_in column from upload), otherwise -
    const val = (a.check_in || a.last_check_in || '').toString().trim()
    const upper = val.toUpperCase()

    if (upper === 'A' || upper === 'ABSENT') return 'A'
    if (upper === 'L' || upper === 'LEAVE') return 'L'
    if (upper === 'P' || upper === 'PRESENT') return 'P'

    const inTs = a.last_check_in_ts || 0
    if (inTs > 0) return 'P'

    return val ? 'P' : '-'
  }

  const getCheckOutStatus = (a) => {
    // Return P if check-out exists (either has timestamp, check-out data, or check_out column from upload)
    const val = (a.check_out || a.last_check_out || '').toString().trim()
    const upper = val.toUpperCase()

    if (upper === 'A' || upper === 'ABSENT') return 'A'
    if (upper === 'L' || upper === 'LEAVE') return 'L'
    if (upper === 'P' || upper === 'PRESENT') return 'P'

    const outTs = a.last_check_out_ts || 0
    if (outTs > 0) return 'P'

    // If they have checked in but not checked out, mark checkout as 'A'
    const hasCheckIn = (a.last_check_in_ts > 0) || (a.last_check_in && a.last_check_in.trim() !== '') || (a.check_in && a.check_in.trim() !== '')
    const checkInVal = (a.check_in || a.last_check_in || '').toString().trim().toUpperCase()
    const isCheckInAbsent = checkInVal === 'A' || checkInVal === 'ABSENT' || checkInVal === 'LEAVE' || checkInVal === 'L'

    if (hasCheckIn && !val && !isCheckInAbsent) {
      return 'A'
    }

    return val ? 'P' : '-'
  }

  const getStatusColor = (letter) => {
    if (letter === 'P') return 'text-green-600'
    if (letter === 'A') return 'text-red-600'
    if (letter === 'L') return 'text-yellow-600'
    return 'text-gray-400'
  }

  const setAttendanceStatus = (key, status) => {
    setAttendanceOverrides(prev => ({ ...prev, [key]: status }))
  }

  const clearAttendanceOverride = (key) => {
    setAttendanceOverrides(prev => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  // Push attendance changes (manual or all) to Suthra Punjab HR attendance_monthly
  const pushAttendanceToWorkerManager = async () => {
    setPushResult(null)
    setPushing(true)
    try {
      // Use attendanceRows if they exist (uploaded directly to Attendance tab), otherwise compute from check-in/check-out
      const isAttendanceRowsMode = attendanceRows && attendanceRows.length > 0
      const dataToUse = isAttendanceRowsMode ? attendanceRows : computeAttendance()

      // Push all records in the view (effectively 'Push All' is always true for the new UI)
      const toPush = dataToUse
      if (!toPush.length) {
        setPushResult({ success: 0, failed: 0, message: 'No changes to push.' })
        setPushing(false)
        return
      }

      // Extract month and day from attendance data
      // Try to find a date from the uploaded data (check_in, check_out, or datetime fields)
      let dateToUse = new Date()

      // If we have attendance data with timestamps, extract the date from the first row
      if (toPush.length > 0) {
        const firstRow = toPush[0]
        const dateSource = firstRow.check_in || firstRow.check_out || firstRow.datetime || firstRow.last_check_in || firstRow.last_check_out

        if (dateSource) {
          const parsed = new Date(dateSource)
          if (!isNaN(parsed.getTime())) {
            dateToUse = parsed
            console.log('📅 Using date from uploaded data:', dateToUse.toISOString().split('T')[0])
          }
        }
      }

      const month = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`
      const day = String(dateToUse.getDate())

      console.log(`📊 Pushing ${toPush.length} attendance records for ${month}-${day}`)

      let success = 0
      let failed = 0
      const failures = []
      const successfulPushes = [] // Track successfully pushed records

      for (const a of toPush) {
        const cnic = (a.cnic || '').trim()
        let worker = null

        // Prefer exact CNIC match
        if (cnic) {
          const { data: wdata, error: werr } = await supabase.from('workers').select('*').eq('cnic', cnic).limit(1)
          if (werr) {
            console.warn(`❌ Worker query error for CNIC ${cnic}:`, werr.message)
            failures.push({ row: a, reason: 'Worker query error' })
            failed++
            continue
          }
          if (wdata && wdata.length) worker = wdata[0]
        }

        // Fallback to name match (case-insensitive contains)
        if (!worker && a.username) {
          const nameLike = `%${a.username}%`
          const { data: wdata, error: werr } = await supabase.from('workers').select('*').ilike('full_name', nameLike).limit(1)
          if (werr) {
            console.warn(`❌ Worker query error for name ${a.username}:`, werr.message)
            failures.push({ row: a, reason: 'Worker query error' })
            failed++
            continue
          }
          if (wdata && wdata.length) worker = wdata[0]
        }

        if (!worker) {
          console.warn(`❌ No worker found for CNIC: ${cnic || 'N/A'}, Name: ${a.username || 'N/A'}`)
          failures.push({ row: a, reason: 'No matching worker (by CNIC or name)' })
          failed++
          continue
        }

        // Load existing monthly attendance
        const { data: exist, error: existErr } = await supabase.from('attendance_monthly').select('*').eq('worker_id', worker.id).eq('month', month).limit(1)
        if (existErr) {
          console.error('Attendance query failed for worker', worker.id, 'month', month, ':', existErr.message)
          failures.push({ row: a, reason: `Attendance query failed: ${existErr.message || 'unknown error'}` })
          failed++
          continue
        }

        let attendance_json = {}
        if (exist && exist.length && exist[0].attendance_json) attendance_json = { ...exist[0].attendance_json }

        // Map attendance status to P/L/A based on 'type' field or 'status' field
        let mapped = 'A'
        const rawStatus = (a.type || a.status || '').toString().trim()
        const statusType = rawStatus.toUpperCase()

        console.log(`📝 Processing ${worker.full_name}: status="${rawStatus}"`)

        // 1. Check computed flags first (most reliable from computeAttendance)
        if (a.absentFlag) {
          mapped = 'A'
        }
        else if (a.presentFlag) {
          mapped = 'P'
        }
        // 2. Direct check for single letters/words in type/status column
        else if (statusType === 'P' || statusType === 'L' || statusType === 'A') {
          mapped = statusType
        }
        else if (statusType.includes('ABSENT')) {
          mapped = 'A'
        }
        else if (statusType.includes('LEAVE')) {
          mapped = 'L'
        }
        else if (statusType.includes('PRESENT')) {
          mapped = 'P'
        }
        // 3. Last resort: check if content exists in check-in/check-out fields
        else {
          const checkInVal = (a.check_in || a.last_check_in || '').toString().trim().toUpperCase()
          const checkOutVal = (a.check_out || a.last_check_out || '').toString().trim().toUpperCase()

          if (checkInVal === 'A' || checkInVal === 'ABSENT' || checkOutVal === 'A' || checkOutVal === 'ABSENT') {
            mapped = 'A'
          }
          else if (checkInVal === 'L' || checkInVal === 'LEAVE' || checkOutVal === 'L' || checkOutVal === 'LEAVE') {
            mapped = 'L'
          }
          else if (checkInVal || checkOutVal) {
            mapped = 'P'
            console.log(`✅ No type specified, but check-in found ("${checkInVal}"/"${checkOutVal}"), marking as Present`)
          }
        }

        console.log(`   -> Mapped to: ${mapped}`)

        attendance_json[day] = mapped

        // Upsert the attendance row
        const payload = { worker_id: worker.id, month, attendance_json }
        const { error: upsertErr } = await supabase.from('attendance_monthly').upsert(payload, { onConflict: ['worker_id', 'month'] })
        if (upsertErr) {
          console.error(`❌ Upsert failed for ${worker.full_name}:`, upsertErr.message)
          failures.push({ row: a, reason: 'Upsert failed' })
          failed++
          continue
        }

        console.log(`✅ ${worker.full_name}: ${mapped} for day ${day}`)

        // Store successful push details
        successfulPushes.push({
          worker_name: worker.full_name,
          worker_code: worker.employee_code,
          cnic: worker.cnic,
          designation: worker.designation,
          status: mapped,
          date: `${month}-${day.padStart(2, '0')}`,
          attendance_point: worker.attendance_point || a.attendance_point
        })

        success++
      }

      setPushResult({
        success,
        failed,
        failures,
        message: success > 0 ? 'Changes will automatically appear in Suthra Punjab HR Attendance tab within 30 seconds.' : undefined
      })

      // Store successfully pushed data for viewing
      if (successfulPushes.length > 0) {
        setPushedData(successfulPushes)
      }
    } catch (err) {
      console.error('Push attendance error', err)
      setPushResult({ success: 0, failed: 1, message: 'Unexpected error' })
    } finally {
      setPushing(false)
    }
  }

  const exportReport = (filterType) => {
    if (filterType === 'attendance') {
      // If attendance data was uploaded directly, export that. Otherwise, compute from check-in/check-out
      const dataToExport = attendanceRows && attendanceRows.length > 0 ? attendanceRows : computeAttendance()
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `attendance-report-attendance.xlsx`)
      return
    }

    let exportRows = active === 'checkin' ? checkinRows : checkoutRows
    const ws = XLSX.utils.json_to_sheet(exportRows, { header: templateHeaders })
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `attendance-report-${filterType || 'all'}.xlsx`)
  }

  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setSelectedFileName(f.name)
    const data = await f.arrayBuffer()
    const wb = XLSX.read(data)
    const first = wb.SheetNames[0]
    const sheet = wb.Sheets[first]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    // Create a smarter column mapper that tries to match columns by keywords
    const json_keys = json.length > 0 ? Object.keys(json[0]) : []

    // Find which actual column index matches expected headers
    const findColumnIndex = (keywords) => {
      for (let i = 0; i < json_keys.length; i++) {
        const key = json_keys[i].toLowerCase()
        for (const kw of keywords) {
          if (key.includes(kw.toLowerCase())) {
            return i
          }
        }
      }
      return -1
    }

    const getValueByIndex = (row, idx) => {
      if (idx >= 0 && idx < json_keys.length) {
        return (row[json_keys[idx]] || '').toString().trim()
      }
      return ''
    }

    if (active === 'attendance') {
      const checkInIdx = findColumnIndex(['check-in', 'checkin', 'check in'])
      const checkOutIdx = findColumnIndex(['check-out', 'checkout', 'check out'])
      const typeIdx = findColumnIndex(['attendance type', 'attendance_type'])
      const fatherIdx = findColumnIndex(['father', 'husband'])
      const designationIdx = findColumnIndex(['designation'])
      const ucwardIdx = findColumnIndex(['uc', 'ward', 'union'])
      const attendancePointIdx = findColumnIndex(['attendance point', 'point'])

      const normalized = json.map((r) => ({
        sr: r.sr || r.SR || r['SR'] || r['Sr'] || '',
        username: r.username || r.Username || r.name || r.Name || r['NAME'] || '',
        father_name: fatherIdx >= 0 ? getValueByIndex(r, fatherIdx) : (r['father_name'] || r['father/husband'] || r['Father/Husband'] || r['FATHER/HUSBAND'] || ''),
        cnic: r.cnic || r.CNIC || r['CNIC'] || '',
        designation: designationIdx >= 0 ? getValueByIndex(r, designationIdx) : (r.designation || r.Designation || r['DESIGNATION'] || ''),
        uc_ward: ucwardIdx >= 0 ? getValueByIndex(r, ucwardIdx) : (r['uc/ward'] || r['UC/WARD'] || r.uc_ward || r.UC || r.ward || r.Ward || r['UC/WARD'] || ''),
        attendance_point: attendancePointIdx >= 0 ? getValueByIndex(r, attendancePointIdx) : (r['attendance_point'] || r['Attendance Point'] || r['ATTENDANCE POINT'] || ''),
        check_in: checkInIdx >= 0 ? getValueByIndex(r, checkInIdx) : (r['check-in'] || r['Check-In'] || r['CHECK-IN'] || ''),
        check_out: checkOutIdx >= 0 ? getValueByIndex(r, checkOutIdx) : (r['check-out'] || r['Check-Out'] || r['CHECK-OUT'] || ''),
        type: typeIdx >= 0 ? getValueByIndex(r, typeIdx) : (r.type || r.Type || r['ATTENDANCE TYPE'] || '')
      }))
      setPreviewRows(normalized.slice(0, 6))
      setAttendanceRows(normalized)
    } else {
      // For check-in/check-out tabs, use smarter matching too
      const srIdx = findColumnIndex(['sr', 'serial', 'emp id', 'employee id'])
      const nameIdx = findColumnIndex(['user name', 'username', 'name', 'employee name'])
      const cnicIdx = findColumnIndex(['cnic', 'identity'])
      const ucwardIdx = findColumnIndex(['uc', 'ward', 'union'])
      const datetimeIdx = findColumnIndex(['date', 'time', 'datetime'])

      const normalized = json.map((r) => ({
        sr: srIdx >= 0 ? getValueByIndex(r, srIdx) : (r.sr || r.SR || r['SR'] || r['Sr'] || r['sr#'] || r.employee_id || r.employeeId || ''),
        username: nameIdx >= 0 ? getValueByIndex(r, nameIdx) : (r.username || r.Username || r['User Name'] || r.name || r.Name || ''),
        cnic: cnicIdx >= 0 ? getValueByIndex(r, cnicIdx) : (r.cnic || r.CNIC || r['CNIC'] || r.cnicNumber || r['Cnic'] || ''),
        uc_ward: ucwardIdx >= 0 ? getValueByIndex(r, ucwardIdx) : (r['uc/ward'] || r['UC/WARD'] || r.uc_ward || r.UC || r.ward || r.Ward || ''),
        type: r.type || r.Type || (r.check_in ? 'Check-In' : r.check_out ? 'Check-Out' : '') || '',
        datetime: datetimeIdx >= 0 ? getValueByIndex(r, datetimeIdx) : (r['date&time'] || r.datetime || r['date_time'] || r.date || r.Date || '')
      }))
      setPreviewRows(normalized.slice(0, 6))
      setRows(normalized)
    }
  }

  // Initialize the paste grid (spreadsheet-like) with given rows and template column count
  const initPasteGrid = (rowsCount = 5) => {
    const headers = active === 'attendance' ? attendanceHeaders : templateHeaders
    const grid = Array.from({ length: rowsCount }, () => Array(headers.length).fill(''))
    setPasteGrid(grid)
    setPasteStart({ r: 0, c: 0 })
  }

  const handleGridCellChange = (ri, ci, value) => {
    const headers = active === 'attendance' ? attendanceHeaders : templateHeaders
    setPasteGrid(prev => {
      const g = prev.map(r => [...r])
      while (g.length <= ri) g.push(Array(headers.length).fill(''))
      g[ri][ci] = value
      return g
    })
  }

  const parseHtmlTable = (html) => {
    // Parse HTML table markup and extract rows/cells as array of arrays
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const table = doc.querySelector('table')
      if (!table) return []
      const rows = Array.from(table.querySelectorAll('tr')).map(tr => Array.from(tr.querySelectorAll('th,td')).map(td => td.textContent.trim()))
      return rows.filter(r => r.length > 0)
    } catch {
      return []
    }
  }

  const extractClipboardLines = (e) => {
    // Try text/plain first, then text/html, then fallback splitting
    const cd = e?.clipboardData || (window.clipboardData ? window.clipboardData : null)
    let text = ''
    if (cd) {
      text = cd.getData('text') || cd.getData('text/plain') || ''
    }
    if (text && text.trim()) {
      return text.split(/\r?\n/).map(l => l.split(/\t|,/).map(c => c.trim())).filter(r => r.length)
    }

    // try html
    let html = ''
    if (cd && cd.getData) html = cd.getData('text/html') || ''
    if (html && html.trim()) {
      const parsed = parseHtmlTable(html)
      if (parsed && parsed.length) return parsed
    }

    // extra fallback: try plain text from window clipboard (async not available here), so return empty
    return []
  }

  const handleGridPaste = (e, startR = 0, startC = 0) => {
    const lines = extractClipboardLines(e)
    if (!lines || lines.length === 0) {
      // try async clipboard API as a fallback
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(txt => {
          const l = txt.split(/\r?\n/).map(l => l.split(/\t|,/).map(c => c.trim())).filter(r => r.length)
          if (!l || l.length === 0) {
            setPasteNotice('Nothing found in clipboard')
            setTimeout(() => setPasteNotice(''), 3000)
            return
          }
          applyLinesToGrid(l, startR, startC)
        }).catch(() => {
          setPasteNotice('Unable to read clipboard')
          setTimeout(() => setPasteNotice(''), 3000)
        })
      } else {
        setPasteNotice('Nothing found in clipboard')
        setTimeout(() => setPasteNotice(''), 3000)
      }
      if (e && e.preventDefault) e.preventDefault()
      return
    }

    if (e && e.preventDefault) e.preventDefault()
    applyLinesToGrid(lines, startR, startC)
  }

  const applyLinesToGrid = (lines, startR = 0, startC = 0) => {
    console.debug('applyLinesToGrid: linesCount=', lines.length, 'start=', startR, startC)
    const headers = active === 'attendance' ? attendanceHeaders : templateHeaders
    setPasteGrid(prev => {
      const g = prev && prev.length ? prev.map(r => [...r]) : []
      for (let r = 0; r < lines.length; r++) {
        const rowIdx = startR + r
        if (!g[rowIdx]) g[rowIdx] = Array(headers.length).fill('')
        for (let c = 0; c < lines[r].length; c++) {
          const colIdx = startC + c
          if (colIdx < headers.length) g[rowIdx][colIdx] = lines[r][c]
        }
      }
      // show brief paste notice
      try { setPasteNotice(`Pasted ${lines.length} row${lines.length > 1 ? 's' : ''}`) } catch { /* ignore */ }
      setTimeout(() => setPasteNotice(''), 3000)
      return g
    })
  }

  const applyPasteGrid = () => {
    if (!pasteGrid || pasteGrid.length === 0) return
    const firstRow = pasteGrid[0] || []
    const headerKeys = firstRow.map(h => mapHeaderToKey(h))
    let hasHeader = headerKeys.some(k => k !== null)

    // If there's a header-like row but no data rows following (single-row paste), treat it as data
    const hasDataAfterHeader = pasteGrid.slice(1).some(row => row && row.some(cell => String(cell).trim()))
    if (hasHeader && !hasDataAfterHeader) {
      hasHeader = false
    }

    const headers = active === 'attendance' ? attendanceHeaders : templateHeaders
    const newRows = []

    for (let i = hasHeader ? 1 : 0; i < pasteGrid.length; i++) {
      const row = pasteGrid[i]
      if (!row || row.every(cell => !String(cell).trim())) continue

      // Create object with appropriate template
      let obj = {}
      if (active === 'attendance') {
        obj = { sr: '', username: '', father_name: '', cnic: '', designation: '', uc_ward: '', attendance_point: '', check_in: '', check_out: '', type: '' }
      } else {
        obj = { sr: '', username: '', cnic: '', uc_ward: '', type: '', datetime: '' }
      }

      if (hasHeader) {
        for (let j = 0; j < row.length; j++) {
          const key = headerKeys[j]
          if (!key) continue
          obj[key] = row[j] || ''
        }
      } else {
        for (let j = 0; j < Math.min(row.length, headers.length); j++) {
          obj[headers[j]] = row[j] || ''
        }
      }
      newRows.push(obj)
    }

    if (newRows.length) {
      if (active === 'attendance') {
        setAttendanceRows(prev => ([...prev, ...newRows]))
      } else {
        setRows(prev => ([...prev, ...newRows]))
      }
    }
    setPasteGrid([])
    setShowUploadModal(false)
  }

  const handleCloseUploadModal = () => {
    setShowUploadModal(false)
    setUploadMode('choose')
    setPasteGrid([])
    setPasteText('')
    setSelectedFileName('')
    setPreviewRows([])
  }

  const handleDropFile = async (file) => {
    if (!file) return
    setSelectedFileName(file.name)
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const first = wb.SheetNames[0]
    const sheet = wb.Sheets[first]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (active === 'attendance') {
      // For attendance tab, parse with all attendance columns
      // Create a smarter column mapper that tries to match columns by keywords
      const json_keys = json.length > 0 ? Object.keys(json[0]) : []

      // Find which actual column index matches expected headers
      const findColumnIndex = (keywords) => {
        for (let i = 0; i < json_keys.length; i++) {
          const key = json_keys[i].toLowerCase()
          for (const kw of keywords) {
            if (key.includes(kw.toLowerCase())) {
              return i
            }
          }
        }
        return -1
      }

      const checkInIdx = findColumnIndex(['check-in', 'checkin', 'check in'])
      const checkOutIdx = findColumnIndex(['check-out', 'checkout', 'check out'])
      const typeIdx = findColumnIndex(['attendance type', 'attendance_type'])
      const fatherIdx = findColumnIndex(['father', 'husband'])
      const designationIdx = findColumnIndex(['designation'])
      const ucwardIdx = findColumnIndex(['uc', 'ward'])
      const attendancePointIdx = findColumnIndex(['attendance point'])

      const getValueByIndex = (row, idx) => {
        if (idx >= 0 && idx < json_keys.length) {
          return (row[json_keys[idx]] || '').toString().trim()
        }
        return ''
      }

      const normalized = json.map((r) => ({
        sr: r.sr || r.SR || r['SR'] || r['Sr'] || '',
        username: r.username || r.Username || r.name || r.Name || r['NAME'] || '',
        father_name: fatherIdx >= 0 ? getValueByIndex(r, fatherIdx) : (r['father_name'] || r['father/husband'] || r['Father/Husband'] || r['FATHER/HUSBAND'] || ''),
        cnic: r.cnic || r.CNIC || r['CNIC'] || '',
        designation: designationIdx >= 0 ? getValueByIndex(r, designationIdx) : (r.designation || r.Designation || r['DESIGNATION'] || ''),
        uc_ward: ucwardIdx >= 0 ? getValueByIndex(r, ucwardIdx) : (r['uc/ward'] || r.uc_ward || r.UC || r.ward || r.Ward || r['UC/WARD'] || ''),
        attendance_point: attendancePointIdx >= 0 ? getValueByIndex(r, attendancePointIdx) : (r['attendance_point'] || r['Attendance Point'] || r['ATTENDANCE POINT'] || ''),
        check_in: checkInIdx >= 0 ? getValueByIndex(r, checkInIdx) : (r['check-in'] || r['Check-In'] || r['CHECK-IN'] || ''),
        check_out: checkOutIdx >= 0 ? getValueByIndex(r, checkOutIdx) : (r['check-out'] || r['Check-Out'] || r['CHECK-OUT'] || ''),
        type: typeIdx >= 0 ? getValueByIndex(r, typeIdx) : (r.type || r.Type || r['ATTENDANCE TYPE'] || '')
      }))
      setPreviewRows(normalized.slice(0, 6))
      setAttendanceRows(normalized)
    } else {
      // For check-in/check-out tabs, use original template
      const normalized = json.map((r) => ({
        sr: r.sr || r.SR || r['SR'] || r['Sr'] || r['sr#'] || r.employee_id || r.employeeId || '',
        username: r.username || r.Username || r['User Name'] || r.name || r.Name || '',
        cnic: r.cnic || r.CNIC || r['CNIC'] || r.cnicNumber || r['Cnic'] || '',
        uc_ward: r['uc/ward'] || r.uc_ward || r.UC || r.ward || r.Ward || '',
        type: r.type || r.Type || (r.check_in ? 'Check-In' : r.check_out ? 'Check-Out' : '') || '',
        datetime: r['date&time'] || r.datetime || r['date_time'] || r.date || r.Date || ''
      }))
      setPreviewRows(normalized.slice(0, 6))
      setRows(normalized)
    }
  }

  useEffect(() => {
    if (!showUploadModal) return
    const onKey = (e) => {
      if (e.key === 'Escape') handleCloseUploadModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showUploadModal])

  // Fetch worker details for attendance display
  useEffect(() => {
    const fetchWorkerDetails = async () => {
      const attendance = computeAttendance()
      const workers = {}
      for (const a of attendance) {
        if (a.cnic && !workers[a.cnic]) {
          const { data, error } = await supabase.from('workers').select('father_name, designation, attendance_point').eq('cnic', a.cnic).limit(1)
          if (!error && data && data.length) {
            workers[a.cnic] = data[0]
          } else {
            workers[a.cnic] = { father_name: '-', designation: '-', attendance_point: '-' }
          }
        }
      }
      setWorkerData(workers)
    }
    if (active === 'attendance') {
      fetchWorkerDetails()
    }
  }, [checkinRows, checkoutRows, active])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm">
        <div className="flex space-x-1 bg-white/60 rounded-xl p-1 border border-white/50">
          <button onClick={() => setActive('checkin')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${active === 'checkin' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}>Check-In</button>
          <button onClick={() => setActive('checkout')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${active === 'checkout' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}>Check-Out</button>
          <button onClick={() => setActive('attendance')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${active === 'attendance' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}>Attendance</button>
        </div>

        <div className="flex items-center space-x-3 pr-2">
          <button onClick={() => { setUploadMode('choose'); setShowUploadModal(true) }} className="px-4 py-2 rounded-xl bg-white/80 text-slate-700 hover:bg-white border border-white/60 shadow-sm text-sm font-medium transition-all backdrop-blur-sm">Upload Report</button>

          <button onClick={() => {
            if (active === 'checkin') setCheckinRows([]);
            else if (active === 'checkout') setCheckoutRows([]);
            else if (active === 'attendance') {
              setAttendanceRows([]);
              setCheckinRows([]);
              setCheckoutRows([]);
              setPushResult(null);
            }
          }} className="px-4 py-2 rounded-xl bg-rose-50/80 text-rose-600 hover:bg-rose-100 border border-rose-100 text-sm font-medium transition-all backdrop-blur-sm">Clear</button>

          <button onClick={() => exportReport(active)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 text-sm font-medium transition-all border border-transparent">Export</button>

          {active === 'attendance' && (
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200/50">
              {pushedData.length > 0 && (
                <button
                  onClick={() => setShowPushedDataModal(true)}
                  className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-all font-medium text-xs flex flex-col items-center justify-center w-10 h-10 shadow-sm"
                  title={`View Push History (${pushedData.length} records)`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {pushedData.length > 0 && <span className="absolute top-0 right-0 -mt-1 -mr-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center border-2 border-white">{pushedData.length}</span>}
                </button>
              )}

              <div className="relative group">
                {pushing && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                  </span>
                )}
                <button
                  onClick={() => pushAttendanceToWorkerManager()}
                  disabled={pushing}
                  className={`p-3 rounded-full shadow-lg transition-all duration-300 relative overflow-hidden group/btn ${pushing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 border border-white/20'
                    }`}
                  title="Push Attendance Data"
                >
                  <div className={`transition-transform duration-700 ${pushing ? 'animate-spin' : 'group-hover/btn:rotate-180'}`}>
                    {pushing ? (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search row (placed under HR / Fleet boxes) */}
      <div className="mb-4">
        <div className="flex items-center">
          <div className="flex items-center space-x-4 w-full">
            <div className="w-full max-w-md">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SR, Username or CNIC..."
                  className="pl-10 pr-10 py-2.5 rounded-xl bg-white/50 border border-white/60 text-sm w-full text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm backdrop-blur-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Placeholder area for HR / Fleet boxes above — kept on the right side of this row */}
            <div className="flex-1" />
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm transition-all">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-500/20 border border-white/50 overflow-hidden transform transition-all scale-100 opacity-100">

            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                  {uploadMode === 'choose' && 'Import Data'}
                  {uploadMode === 'file' && 'Upload Spreadsheet'}
                  {uploadMode === 'paste' && 'Paste Data Grid'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">Add records to your report seamlessly</p>
              </div>
              <button
                onClick={handleCloseUploadModal}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              {uploadMode === 'choose' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => setUploadMode('file')}
                    className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 text-center bg-white"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-500 flex items-center justify-center mb-4 transition-colors">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-1">Upload File</h4>
                    <p className="text-sm text-slate-500 px-4">Import an Excel (.xlsx) or CSV file directly into the table</p>
                  </button>

                  <button
                    onClick={() => { initPasteGrid(10); setUploadMode('paste') }}
                    className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all duration-300 text-center bg-white"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-500 flex items-center justify-center mb-4 transition-colors">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-1">Paste Manually</h4>
                    <p className="text-sm text-slate-500 px-4">Copy data from Excel/Sheets and paste directly into a grid</p>
                  </button>
                </div>
              )}

              {uploadMode === 'file' && (
                <div className="space-y-6">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleDropFile(f); }}
                    className="relative group cursor-pointer"
                  >
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={async (e) => { await handleFile(e); setUploadMode('choose'); setShowUploadModal(false) }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-indigo-200 group-hover:border-indigo-400 rounded-3xl bg-indigo-50/30 group-hover:bg-indigo-50/60 transition-all">
                      <div className="w-20 h-20 bg-white rounded-full shadow-lg shadow-indigo-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <p className="text-xl font-bold text-slate-800 mb-2">Drop your spreadsheet here</p>
                      <p className="text-sm text-slate-500 max-w-sm text-center">Support for .xlsx, .xls, and .csv files. Data will be automatically mapped to columns.</p>
                      <button className="mt-6 px-6 py-2 bg-white text-indigo-600 font-semibold rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-all text-sm">Browse Files</button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setUploadMode('choose')} className="text-sm font-medium text-slate-500 hover:text-slate-800 px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Back to options
                    </button>
                  </div>
                </div>
              )}

              {uploadMode === 'paste' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center border-r border-slate-200">#</th>
                            {(active === 'attendance' ? attendanceHeaders : templateHeaders).map((h, ci) => (
                              <th key={ci} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-left border-r border-slate-200 min-w-[140px] whitespace-nowrap">{getHeaderLabel(h)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {pasteGrid && pasteGrid.length ? pasteGrid.map((row, ri) => (
                            <tr key={ri} className="group hover:bg-indigo-50/20 transition-colors">
                              <td className="px-2 py-2 text-xs font-medium text-slate-400 text-center border-r border-slate-100 bg-slate-50/50">{ri + 1}</td>
                              {row.map((cell, ci) => (
                                <td key={ci} className="p-0 border-r border-slate-100 relative">
                                  <input
                                    value={cell ?? ''}
                                    onChange={(e) => handleGridCellChange(ri, ci, e.target.value)}
                                    onFocus={() => setPasteStart({ r: ri, c: ci })}
                                    onPaste={(e) => handleGridPaste(e, ri, ci)}
                                    className="w-full h-full px-4 py-3 text-sm bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 rounded-none transition-all font-mono text-slate-700 placeholder-slate-300"
                                    placeholder="-"
                                  />
                                </td>
                              ))}
                            </tr>
                          )) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {pasteNotice && (
                    <div className="flex justify-center">
                      <div className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200 animate-fade-in-up">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {pasteNotice}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setUploadMode('choose')} className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-2">Back</button>
                      <div className="h-4 w-px bg-slate-200"></div>
                      <button onClick={() => initPasteGrid(10, templateHeaders.length)} className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors px-2">Reset Grid</button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          try {
                            const txt = await navigator.clipboard.readText()
                            const fakeEvent = { clipboardData: { getData: () => txt }, preventDefault: () => { } }
                            handleGridPaste(fakeEvent, pasteStart.r || 0, pasteStart.c || 0)
                          } catch { /* ignore */ }
                        }}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-semibold shadow-sm flex items-center gap-2 group"
                      >
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Paste Clipboard
                      </button>

                      <button
                        onClick={() => { applyPasteGrid(); handleCloseUploadModal() }}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm font-bold flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Apply Data
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {active !== 'attendance' && (
        <div className="mb-3 text-sm text-slate-500">Tip: Click cells to edit inline. You can upload a file using the <strong>Upload Report</strong> button. The table structure matches the Excel template for easy import.</div>
      )}

      <div className="overflow-x-auto border border-white/60 rounded-2xl shadow-lg shadow-indigo-100/10 bg-white/40 backdrop-blur-xl" onPaste={handleTablePaste}>
        {active === 'attendance' ? (
          <table className="min-w-full divide-y divide-gray-100/50 text-sm">
            <thead className="bg-gray-50/50 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Check-In</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Check-Out</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Father/Husband</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CNIC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">UC/Ward</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Point</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Type</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-100/50">
              {(() => {
                // If attendance data was uploaded directly, display that. Otherwise, compute from check-in/check-out
                const dataToDisplay = attendanceRows && attendanceRows.length > 0 ? attendanceRows : computeAttendance()
                const allAttendance = dataToDisplay
                const attendance = searchQuery ? allAttendance.filter(a => {
                  const q = searchQuery.toLowerCase().trim()
                  return String(a.sr || a.username || a.cnic).toLowerCase().includes(q)
                }) : allAttendance

                if (!attendance.length) {
                  return (
                    <tr>
                      <td colSpan={9} className="p-6 text-slate-500 text-center">No attendance data. Load check-in/check-out records to compute attendance or upload attendance data.</td>
                    </tr>
                  )
                }
                return (
                  <>
                    {pushResult && (
                      <tr>
                        <td colSpan={9} className="p-3">
                          <div className="text-sm">
                            <strong>{pushResult.success}</strong> updated, <strong>{pushResult.failed}</strong> failed.
                            {pushResult.message && <span className="ml-2 text-gray-500">{pushResult.message}</span>}
                          </div>
                          {pushResult.failures && pushResult.failures.length > 0 && (
                            <details className="mt-2 text-xs text-red-500">
                              <summary>View failures ({pushResult.failures.length})</summary>
                              <ul className="mt-2 list-disc list-inside">
                                {pushResult.failures.map((f, i) => (
                                  <li key={i}><strong>{f.row.username || f.row.cnic}</strong>: {f.reason}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </td>
                      </tr>
                    )}
                    {attendance.map((a, i) => {
                      const worker = workerData[a.cnic] || { father_name: '-', designation: '-', attendance_point: '-' }
                      const checkInLetter = getCheckInStatus(a)
                      const checkOutLetter = getCheckOutStatus(a)
                      const checkInColor = getStatusColor(checkInLetter)
                      const checkOutColor = getStatusColor(checkOutLetter)
                      return (
                        <tr key={i} className="hover:bg-white/40 transition-colors">
                          <td className={`px-4 py-3 font-semibold ${checkInColor}`}>{checkInLetter}</td>
                          <td className={`px-4 py-3 font-semibold ${checkOutColor}`}>{checkOutLetter}</td>
                          <td className="px-4 py-3 text-slate-700">{a.username}</td>
                          <td className="px-4 py-3 text-slate-600">{a.father_name || worker.father_name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.cnic}</td>
                          <td className="px-4 py-3 text-slate-600">{a.designation || worker.designation}</td>
                          <td className="px-4 py-3 text-slate-600">{a.uc_ward}</td>
                          <td className="px-4 py-3 text-slate-600">{a.attendance_point || worker.attendance_point}</td>
                          <td className="px-4 py-3 text-slate-600">{a.type || '-'}</td>
                        </tr>
                      )
                    })}
                  </>
                )
              })()}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-gray-100/50 text-sm">
            <thead className="bg-gray-50/50 backdrop-blur-sm">
              <tr>
                {templateHeaders.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h === 'sr' ? 'SR' : h === 'username' ? 'Username' : h === 'cnic' ? 'CNIC' : h === 'uc_ward' ? 'UC/Ward' : h === 'type' ? 'Type' : h === 'datetime' ? 'Date & Time' : h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-100/50">
              {(() => {
                const q = (searchQuery || '').toLowerCase().trim()
                const visibleRows = q ? rows.filter(r => String(r.sr || '').toLowerCase().includes(q) || (r.username || '').toLowerCase().includes(q) || (r.cnic || '').toLowerCase().includes(q)) : rows
                if (visibleRows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={templateHeaders.length} className="p-6 text-slate-500 text-center">No records loaded. Upload a sheet or download the template to begin.</td>
                    </tr>
                  )
                }
                return visibleRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-white/40 transition-colors">
                    <td className="px-4 py-2"><input value={r.sr || ''} onChange={(e) => updateRowField(idx, 'sr', e.target.value)} className="w-full p-1.5 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400" /></td>
                    <td className="px-4 py-2"><input value={r.username || ''} onChange={(e) => updateRowField(idx, 'username', e.target.value)} className="w-full p-1.5 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400" /></td>
                    <td className="px-4 py-2"><input value={r.cnic || ''} onChange={(e) => updateRowField(idx, 'cnic', e.target.value)} className="w-full p-1.5 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400 font-mono text-xs" /></td>
                    <td className="px-4 py-2"><input value={r.uc_ward || ''} onChange={(e) => updateRowField(idx, 'uc_ward', e.target.value)} className="w-full p-1.5 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400" /></td>
                    <td className="px-4 py-2"><input value={r.type || ''} onChange={(e) => updateRowField(idx, 'type', e.target.value)} className="w-full p-1.5 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400" /></td>
                    <td className="px-4 py-2"><input value={r.datetime || ''} onChange={(e) => updateRowField(idx, 'datetime', e.target.value)} className="w-full p-1.5 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400" /></td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        )}
      </div>

      {/* Pushed Data Modal */}
      {showPushedDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm transition-all" onClick={() => setShowPushedDataModal(false)}>
          <div className="w-full max-w-5xl bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-indigo-500/20 max-h-[90vh] overflow-hidden border border-white/50" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-indigo-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Pushed Attendance Data</h2>
                  <p className="text-sm text-indigo-100 mt-1 font-medium">
                    {pushedData.length} record{pushedData.length !== 1 ? 's' : ''} successfully updated
                  </p>
                </div>
                <button
                  onClick={() => setShowPushedDataModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-auto max-h-[calc(90vh-120px)] p-6 bg-slate-50/50">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-gray-50/90 backdrop-blur border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Worker Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CNIC</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Point</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {pushedData.map((record, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{record.worker_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono text-xs">{record.worker_code}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono text-xs">{record.cnic}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{record.designation}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${record.status === 'P' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            record.status === 'L' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                            {record.status === 'P' ? '✓ Present' :
                              record.status === 'L' ? '○ Leave' :
                                '✗ Absent'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 font-mono text-xs hidden sm:table-cell">{record.date}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{record.attendance_point || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white/80 backdrop-blur flex justify-between items-center">
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                These records are now live in Suthra Punjab HR
              </div>
              <button
                onClick={() => setShowPushedDataModal(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
