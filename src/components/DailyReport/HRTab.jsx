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

    // Process check-in rows
    checkinRows.forEach((r, idx) => {
      const key = r.username || r.sr || r.cnic || `checkin-${idx}`
      const existing = map.get(key) || {
        _key: key, sr: r.sr || '', username: r.username || '', cnic: r.cnic || '', uc_ward: r.uc_ward || '',
        last_check_in_ts: 0, last_check_out_ts: 0, last_check_in: '', last_check_out: '',
        presentFlag: false, absentFlag: false, manual: false
      }
      const dt = r.datetime || ''
      const type = (r.type || '').toLowerCase()

      // Check if type explicitly marks as Absent
      if (type.includes('absent')) {
        existing.absentFlag = true
      }

      // determine check-in timestamp
      let parsedIn = 0
      if (r.check_in) parsedIn = Date.parse(r.check_in) || 0
      else if (type.includes('in') || type.includes('check-in') || type.includes('checkin')) parsedIn = Date.parse(dt) || 0
      else if (type.includes('present')) {
        existing.presentFlag = true
        parsedIn = Date.parse(dt) || 0
      }

      if (parsedIn && parsedIn > (existing.last_check_in_ts || 0)) {
        existing.last_check_in_ts = parsedIn
        existing.last_check_in = r.check_in || dt || new Date(parsedIn).toISOString()
      } else if (type.includes('present') && !existing.last_check_in_ts) {
        existing.presentFlag = true
        existing.last_check_in = existing.last_check_in || 'Present'
      }

      map.set(key, existing)
    })

    // Process check-out rows
    checkoutRows.forEach((r, idx) => {
      const key = r.username || r.sr || r.cnic || `checkout-${idx}`
      const existing = map.get(key) || {
        _key: key, sr: r.sr || '', username: r.username || '', cnic: r.cnic || '', uc_ward: r.uc_ward || '',
        last_check_in_ts: 0, last_check_out_ts: 0, last_check_in: '', last_check_out: '',
        presentFlag: false, absentFlag: false, manual: false
      }
      const dt = r.datetime || ''
      const type = (r.type || '').toLowerCase()

      // determine check-out timestamp
      let parsedOut = 0
      if (r.check_out) parsedOut = Date.parse(r.check_out) || 0
      else if (type.includes('out') || type.includes('check-out') || type.includes('checkout')) parsedOut = Date.parse(dt) || 0
      else if (type.includes('present')) {
        // also treat 'present' in checkout tab as a valid checkout
        parsedOut = Date.parse(dt) || 0
      }

      if (parsedOut && parsedOut > (existing.last_check_out_ts || 0)) {
        existing.last_check_out_ts = parsedOut
        existing.last_check_out = r.check_out || dt || new Date(parsedOut).toISOString()
      } else if (type.includes('present') && !existing.last_check_out_ts) {
        // if just 'present' marker but no valid timestamp
        existing.last_check_out = existing.last_check_out || 'Present'
      }

      map.set(key, existing)
    })

    const res = Array.from(map.values()).map((e, i) => {
      const inTs = e.last_check_in_ts || 0
      const outTs = e.last_check_out_ts || 0

      let status = 'Absent'
      // if explicit absent marker -> mark Absent (takes priority)
      if (e.absentFlag) status = 'Absent'
      // if explicit present marker without timestamps -> mark Present
      else if (e.presentFlag && inTs === 0 && outTs === 0) status = 'Present'
      else if (inTs && (!outTs || inTs > outTs)) status = 'Present'

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
    const inTs = a.last_check_in_ts || 0
    const checkInData = a.check_in || ''
    return (inTs > 0 || a.last_check_in || checkInData) ? 'P' : '-'
  }

  const getCheckOutStatus = (a) => {
    // Return P if check-out exists (either has timestamp, check-out data, or check_out column from upload), otherwise -
    const outTs = a.last_check_out_ts || 0
    const checkOutData = a.check_out || ''
    return (outTs > 0 || a.last_check_out || checkOutData) ? 'P' : '-'
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

  // Push attendance changes (manual or all) to Worker Manager attendance_monthly
  const pushAttendanceToWorkerManager = async () => {
    setPushResult(null)
    setPushing(true)
    try {
      // Use attendanceRows if they exist (uploaded directly to Attendance tab), otherwise compute from check-in/check-out
      const isAttendanceRowsMode = attendanceRows && attendanceRows.length > 0
      const dataToUse = isAttendanceRowsMode ? attendanceRows : computeAttendance()
      // If using attendanceRows directly, push all. Otherwise, filter by pushAll or manual flag
      const toPush = isAttendanceRowsMode ? dataToUse : dataToUse.filter(a => pushAll || a.manual)
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
        // Direct check for single letters to preserve exact input
        if (statusType === 'P' || statusType === 'L' || statusType === 'A') {
          mapped = statusType
        }
        // Then check for full words
        else if (statusType.includes('PRESENT')) {
          mapped = 'P'
        }
        else if (statusType.includes('LEAVE')) {
          mapped = 'L'
        }
        else if (statusType.includes('ABSENT')) {
          mapped = 'A'
        }
        // If no recognizable status, check if check_in or check_out exists
        else if (a.check_in || a.last_check_in) {
          mapped = 'P'  // If there's a check-in, mark as present
          console.log(`✅ No type specified, but check-in found, marking as Present`)
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
        message: success > 0 ? 'Changes will automatically appear in Worker Manager Attendance tab within 30 seconds.' : undefined
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
          <button onClick={downloadTemplate} className="px-4 py-2 rounded-xl bg-slate-700/10 text-slate-700 hover:bg-slate-700/20 text-sm font-medium transition-all border border-slate-700/5">Template</button>

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
              <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={pushAll} onChange={(e) => setPushAll(e.target.checked)} className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30" />
                <span>Push all</span>
              </label>

              <button onClick={() => pushAttendanceToWorkerManager()} disabled={pushing} className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 text-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                {pushing ? 'Pushing...' : 'Push Updates'}
              </button>

              {pushedData.length > 0 && (
                <button
                  onClick={() => setShowPushedDataModal(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 text-sm font-medium transition-all"
                >
                  History ({pushedData.length})
                </button>
              )}
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
          <div className="w-full max-w-3xl bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
            {uploadMode === 'choose' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upload Report</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded hover:shadow-lg cursor-pointer" onClick={() => setUploadMode('file')}>
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-slate-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <div>
                        <div className="font-semibold">Upload Excel / CSV</div>
                        <div className="text-xs text-slate-500">Choose a file to import (XLSX/CSV)</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded hover:shadow-lg cursor-pointer" onClick={() => { initPasteGrid(8); setUploadMode('paste') }}>
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-yellow-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <div>
                        <div className="font-semibold">Paste Manually</div>
                        <div className="text-xs text-slate-500">Open an editable spreadsheet-like grid to paste data</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={handleCloseUploadModal} className="px-4 py-2 rounded bg-gray-50 border">Cancel</button>
                </div>
              </div>
            )}

            {uploadMode === 'file' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-3">Upload Excel / CSV</h3>
                <div className="p-4 border-2 border-dashed rounded bg-gray-50 text-center hover:border-sky-300"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleDropFile(f); }}>
                  <label className="block cursor-pointer">
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-6 h-6 text-slate-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 7v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 3h8v4H8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <div className="text-sm text-slate-600">Drop a file here or click to browse</div>
                    </div>
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={async (e) => { await handleFile(e); setShowUploadModal(false); setUploadMode('choose') }} className="hidden" />
                  </label>
                  {selectedFileName && <div className="mt-3 text-xs text-slate-700">Selected: <strong>{selectedFileName}</strong></div>}
                </div>

                {previewRows && previewRows.length > 0 && (
                  <div className="mt-4 border rounded p-2 bg-white">
                    <div className="text-sm font-semibold mb-2">Preview (first {previewRows.length} rows)</div>
                    <div className="overflow-auto max-h-36">
                      <table className="min-w-full text-xs">
                        <thead className="text-left text-gray-500">
                          <tr>
                            {(active === 'attendance' ? attendanceHeaders : templateHeaders).map((h) => (
                              <th key={h} className="pr-4">{getHeaderLabel(h)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((r, i) => (
                            <tr key={i} className={`${i % 2 ? 'bg-gray-50' : ''}`}>
                              {(active === 'attendance' ? attendanceHeaders : templateHeaders).map((h) => (
                                <td key={h} className="pr-4">{r[h] || ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button onClick={handleCloseUploadModal} className="px-3 py-1 rounded bg-gray-50 border">Close</button>
                </div>
              </div>
            )}

            {uploadMode === 'paste' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Paste Data (Spreadsheet)</h3>
                  <button onClick={handleCloseUploadModal} className="text-slate-500 hover:text-slate-700">Close ✕</button>
                </div>

                <div className="overflow-auto border rounded mb-3 max-h-64">
                  <table className="min-w-full table-fixed border-collapse text-sm">
                    <thead className="bg-gray-100 sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-2 py-1 border text-xs">#</th>
                        {(active === 'attendance' ? attendanceHeaders : templateHeaders).map((h, ci) => (
                          <th key={ci} className="px-2 py-1 border text-xs text-left">{getHeaderLabel(h)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pasteGrid && pasteGrid.length ? pasteGrid.map((row, ri) => (
                        <tr key={ri} className={`${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t`}>
                          <td className="px-2 py-1 border text-xs">{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-1 py-1 border">
                              <input value={cell ?? ''}
                                onChange={(e) => handleGridCellChange(ri, ci, e.target.value)}
                                onFocus={() => setPasteStart({ r: ri, c: ci })}
                                onPaste={(e) => handleGridPaste(e, ri, ci)}
                                className="w-full p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-300" />
                            </td>
                          ))}
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={templateHeaders.length + 1} className="p-4 text-center text-slate-500">Empty grid. Use "Paste from Clipboard" or paste into any cell.</td>
                        </tr>
                      )}
                      {pasteNotice && (
                        <tr>
                          <td colSpan={templateHeaders.length + 1} className="p-2 text-center text-sky-700 text-xs">{pasteNotice}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <button onClick={() => initPasteGrid(5, templateHeaders.length)} className="px-2 py-1 rounded bg-gray-50 border text-sm">Reset Grid</button>
                  <button onClick={async () => {
                    try {
                      const txt = await navigator.clipboard.readText()
                      const fakeEvent = { clipboardData: { getData: () => txt }, preventDefault: () => { } }
                      handleGridPaste(fakeEvent, pasteStart.r || 0, pasteStart.c || 0)
                    } catch {
                      // ignore
                    }
                  }} className="px-2 py-1 rounded bg-gray-50 border text-sm">Paste from Clipboard (auto)</button>
                </div>

                <div className="flex justify-end space-x-2 mt-2">
                  <button onClick={handleCloseUploadModal} className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 border border-gray-200">Cancel</button>
                  <button onClick={() => { applyPasteGrid(); handleCloseUploadModal() }} className="px-3 py-1 rounded-md bg-emerald-600 text-white">Apply Paste</button>
                </div>
              </div>
            )}

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
                These records are now live in Worker Manager
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
