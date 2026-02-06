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

export default function HRTab() {
  const [active, setActive] = useState('checkin')
  const [rows, setRows] = useState([])
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



  const updateRowField = (idx, field, value) => {
    setRows(prev => {
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
    if (key.includes('type')) return 'type'
    if (key.includes('date') || key.includes('time')) return 'datetime'
    return null
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
    const headerRow = ['SR','Username','CNIC','UC/Ward','Type','Date&Time']
    const ws = XLSX.utils.aoa_to_sheet([headerRow])
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `attendance-hr-template.xlsx`)
  }

  const computeAttendance = () => {
    // Aggregate rows by username (fallback to sr or cnic) and compute last check-in/out
    // Tracks keys and applies manual overrides from `attendanceOverrides`
    const map = new Map()
    rows.forEach((r, idx) => {
      const key = r.username || r.sr || r.cnic || `row-${idx}`
      const existing = map.get(key) || { _key: key, sr: r.sr || '', username: r.username || '', cnic: r.cnic || '', uc_ward: r.uc_ward || '', last_check_in_ts: 0, last_check_out_ts: 0, last_check_in: '', last_check_out: '', presentFlag: false, manual: false }
      const dt = r.datetime || ''
      const type = (r.type || '').toLowerCase()

      // determine check-in timestamp
      let parsedIn = 0
      if (r.check_in) parsedIn = Date.parse(r.check_in) || 0
      else if (type.includes('in') || type.includes('check-in') || type.includes('checkin')) parsedIn = Date.parse(dt) || 0
      else if (type.includes('present')) {
        // mark present even if no datetime
        existing.presentFlag = true
        parsedIn = Date.parse(dt) || 0
      }

      if (parsedIn && parsedIn > (existing.last_check_in_ts || 0)) {
        existing.last_check_in_ts = parsedIn
        existing.last_check_in = r.check_in || dt || new Date(parsedIn).toISOString()
      } else if (type.includes('present') && !existing.last_check_in_ts) {
        // no timestamp but explicit 'present' marker
        existing.presentFlag = true
        existing.last_check_in = existing.last_check_in || 'Present'
      }

      // determine check-out timestamp
      let parsedOut = 0
      if (r.check_out) parsedOut = Date.parse(r.check_out) || 0
      else if (type.includes('out') || type.includes('check-out') || type.includes('checkout')) parsedOut = Date.parse(dt) || 0

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
      // if explicit present marker without timestamps -> mark Present
      if (e.presentFlag && inTs === 0 && outTs === 0) status = 'Present'
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
      const attendance = computeAttendance()
      const toPush = attendance.filter(a => pushAll || a.manual)
      if (!toPush.length) {
        setPushResult({ success: 0, failed: 0, message: 'No changes to push.' })
        setPushing(false)
        return
      }

      const month = (() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      })()
      const day = String(new Date().getDate())

      let success = 0
      let failed = 0
      const failures = []

      for (const a of toPush) {
        const cnic = (a.cnic || '').trim()
        let worker = null

        // Prefer exact CNIC match
        if (cnic) {
          const { data: wdata, error: werr } = await supabase.from('workers').select('*').eq('cnic', cnic).limit(1)
          if (werr) {
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
            failures.push({ row: a, reason: 'Worker query error' })
            failed++
            continue
          }
          if (wdata && wdata.length) worker = wdata[0]
        }

        if (!worker) {
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
        const mapped = (a.status === 'Present') ? 'P' : 'A'
        attendance_json[day] = mapped

        // Upsert the attendance row
        const payload = { worker_id: worker.id, month, attendance_json }
        const { error: upsertErr } = await supabase.from('attendance_monthly').upsert(payload, { onConflict: ['worker_id', 'month'] })
        if (upsertErr) {
          failures.push({ row: a, reason: 'Upsert failed' })
          failed++
          continue
        }

        success++
      }

      setPushResult({ success, failed, failures })
    } catch (err) {
      console.error('Push attendance error', err)
      setPushResult({ success: 0, failed: 1, message: 'Unexpected error' })
    } finally {
      setPushing(false)
    }
  }

  const exportReport = (filterType) => {
    if (filterType === 'attendance') {
      const attendanceRows = computeAttendance()
      const ws = XLSX.utils.json_to_sheet(attendanceRows)
      const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `attendance-report-attendance.xlsx`)
      return
    }

    let exportRows = rows
    if (filterType === 'checkin') exportRows = rows.filter(r => (r.type && /in/i.test(r.type)) || r.check_in)
    if (filterType === 'checkout') exportRows = rows.filter(r => (r.type && /out/i.test(r.type)) || r.check_out)

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
    // Normalize headers to match template
    const normalized = json.map((r) => ({
      sr: r.sr || r.SR || r['SR'] || r['Sr'] || r['sr#'] || r.employee_id || r.employeeId || '',
      username: r.username || r.Username || r['User Name'] || r.name || r.Name || '',
      cnic: r.cnic || r.CNIC || r['CNIC'] || r.cnicNumber || r['Cnic'] || '',
      uc_ward: r['uc/ward'] || r.uc_ward || r.UC || r.ward || r.Ward || '',
      type: r.type || r.Type || (r.check_in ? 'Check-In' : r.check_out ? 'Check-Out' : '') || '',
      datetime: r['date&time'] || r.datetime || r['date_time'] || r.date || r.Date || ''
    }))
    setRows(normalized)
  }

  // Initialize the paste grid (spreadsheet-like) with given rows and template column count
  const initPasteGrid = (rowsCount = 5, cols = templateHeaders.length) => {
    const grid = Array.from({ length: rowsCount }, () => Array(cols).fill(''))
    setPasteGrid(grid)
    setPasteStart({ r: 0, c: 0 })
  }

  const handleGridCellChange = (ri, ci, value) => {
    setPasteGrid(prev => {
      const g = prev.map(r => [...r])
      while (g.length <= ri) g.push(Array(templateHeaders.length).fill(''))
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
    setPasteGrid(prev => {
      const g = prev && prev.length ? prev.map(r => [...r]) : []
      for (let r = 0; r < lines.length; r++) {
        const rowIdx = startR + r
        if (!g[rowIdx]) g[rowIdx] = Array(templateHeaders.length).fill('')
        for (let c = 0; c < lines[r].length; c++) {
          const colIdx = startC + c
          if (colIdx < templateHeaders.length) g[rowIdx][colIdx] = lines[r][c]
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

    const newRows = []

    for (let i = hasHeader ? 1 : 0; i < pasteGrid.length; i++) {
      const row = pasteGrid[i]
      if (!row || row.every(cell => !String(cell).trim())) continue
      const obj = { sr: '', username: '', cnic: '', uc_ward: '', type: '', datetime: '' }
      if (hasHeader) {
        for (let j = 0; j < row.length; j++) {
          const key = headerKeys[j]
          if (!key) continue
          obj[key] = row[j] || ''
        }
      } else {
        for (let j = 0; j < Math.min(row.length, templateHeaders.length); j++) {
          obj[templateHeaders[j]] = row[j] || ''
        }
      }
      newRows.push(obj)
    }

    if (newRows.length) setRows(prev => ([...prev, ...newRows]))
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

  useEffect(() => {
    if (!showUploadModal) return
    const onKey = (e) => {
      if (e.key === 'Escape') handleCloseUploadModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showUploadModal])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <button onClick={() => setActive('checkin')} className={`px-3 py-1 rounded-md ${active === 'checkin' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-600'}`}>Check-In</button>
          <button onClick={() => setActive('checkout')} className={`px-3 py-1 rounded-md ${active === 'checkout' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-600'}`}>Check-Out</button>
          <button onClick={() => setActive('attendance')} className={`px-3 py-1 rounded-md ${active === 'attendance' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-600'}`}>Attendance</button>
        </div>

        <div className="flex items-center space-x-2">
          {active !== 'attendance' && (
            <button onClick={downloadTemplate} className="px-3 py-1 rounded-md bg-slate-700 text-white">Download Template</button>
          )}

          {active !== 'attendance' && (
            <button onClick={() => { setUploadMode('choose'); setShowUploadModal(true) }} className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 cursor-pointer border border-gray-200">Upload Report</button>
          )}



          <button onClick={() => setRows([])} className="px-3 py-1 rounded-md bg-red-50 text-red-600 border border-red-100">Clear Table</button>

          <button onClick={() => exportReport(active)} className="px-3 py-1 rounded-md bg-emerald-600 text-white">Export {active === 'checkin' ? 'Check-In' : active === 'checkout' ? 'Check-Out' : 'Attendance'} Report</button>
          {active === 'attendance' && (
            <div className="flex items-center space-x-2">
              <label className="inline-flex items-center text-sm">
                <input type="checkbox" checked={pushAll} onChange={(e) => setPushAll(e.target.checked)} className="mr-2" />
                <span>Push all</span>
              </label>

              <button onClick={() => pushAttendanceToWorkerManager()} disabled={pushing} className="px-3 py-1 rounded-md bg-sky-600 text-white">
                {pushing ? 'Pushing...' : 'Push to Worker Manager'}
              </button>
            </div>
          )}        
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl p-4 bg-white rounded">
                  {uploadMode === 'choose' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upload Report</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded hover:shadow-lg cursor-pointer" onClick={() => setUploadMode('file')}>
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-slate-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div>
                        <div className="font-semibold">Upload Excel / CSV</div>
                        <div className="text-xs text-slate-500">Choose a file to import (XLSX/CSV)</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded hover:shadow-lg cursor-pointer" onClick={() => { initPasteGrid(8, templateHeaders.length); setUploadMode('paste') }}>
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-yellow-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                      <svg className="w-6 h-6 text-slate-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 7v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 3h8v4H8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div className="text-sm text-slate-600">Drop a file here or click to browse</div>
                    </div>
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => { handleFile(e); setShowUploadModal(false); setUploadMode('choose') }} className="hidden" />
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
                            {templateHeaders.map((h) => <th key={h} className="pr-4">{h === 'sr' ? 'SR' : h === 'username' ? 'Username' : h === 'cnic' ? 'CNIC' : h === 'uc_ward' ? 'UC/Ward' : h === 'type' ? 'Type' : 'Date & Time'}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((r, i) => (
                            <tr key={i} className={`${i % 2 ? 'bg-gray-50' : ''}`}>
                              <td className="pr-4">{r.sr}</td>
                              <td className="pr-4">{r.username}</td>
                              <td className="pr-4">{r.cnic}</td>
                              <td className="pr-4">{r.uc_ward}</td>
                              <td className="pr-4">{r.type}</td>
                              <td className="pr-4">{r.datetime}</td>
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
                        {templateHeaders.map((h, ci) => (
                          <th key={ci} className="px-2 py-1 border text-xs text-left">{h === 'sr' ? 'SR' : h === 'username' ? 'Username' : h === 'cnic' ? 'CNIC' : h === 'uc_ward' ? 'UC/Ward' : h === 'type' ? 'Type' : 'Date & Time'}</th>
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
                      const fakeEvent = { clipboardData: { getData: () => txt }, preventDefault: () => {} }
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

      <div className="overflow-x-auto border border-gray-100 rounded-md" onPaste={handleTablePaste}>
        {active === 'attendance' ? (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">SR</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Username</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">CNIC</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">UC/Ward</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Last Check-In</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Last Check-Out</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {(() => {
                const attendance = computeAttendance()
                if (!attendance.length) {
                  return (
                    <tr>
                      <td colSpan={7} className="p-6 text-slate-500 text-center">No attendance data. Load check-in/check-out records to compute attendance.</td>
                    </tr>
                  )
                }
                return (
                  <>
                    {pushResult && (
                      <tr>
                        <td colSpan={7} className="p-3">
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
                    {attendance.map((a, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{a.sr}</td>
                        <td className="px-4 py-2">{a.username}</td>
                        <td className="px-4 py-2">{a.cnic}</td>
                        <td className="px-4 py-2">{a.uc_ward}</td>
                        <td className="px-4 py-2">{a.last_check_in || '-'}</td>
                        <td className="px-4 py-2">{a.last_check_out || '-'}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <select value={a.status} onChange={(e) => setAttendanceStatus(a._key, e.target.value)} className={`text-sm font-semibold ${a.status === 'Present' ? 'text-emerald-700' : 'text-red-600'}`}>
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                            </select>
                            {a.manual && (
                              <button onClick={() => clearAttendanceOverride(a._key)} className="px-2 py-1 text-xs text-gray-500 hover:underline">Clear</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )
              })()}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {templateHeaders.map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">{h === 'sr' ? 'SR' : h === 'username' ? 'Username' : h === 'cnic' ? 'CNIC' : h === 'uc_ward' ? 'UC/Ward' : h === 'type' ? 'Type' : h === 'datetime' ? 'Date & Time' : h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={templateHeaders.length} className="p-6 text-slate-500 text-center">No records loaded. Upload a sheet or download the template to begin.</td>
                </tr>
              )}
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2"><input value={r.sr || ''} onChange={(e) => updateRowField(idx, 'sr', e.target.value)} className="w-full p-1 text-sm bg-transparent" /></td>
                  <td className="px-4 py-2"><input value={r.username || ''} onChange={(e) => updateRowField(idx, 'username', e.target.value)} className="w-full p-1 text-sm" /></td>
                  <td className="px-4 py-2"><input value={r.cnic || ''} onChange={(e) => updateRowField(idx, 'cnic', e.target.value)} className="w-full p-1 text-sm" /></td>
                  <td className="px-4 py-2"><input value={r.uc_ward || ''} onChange={(e) => updateRowField(idx, 'uc_ward', e.target.value)} className="w-full p-1 text-sm" /></td>
                  <td className="px-4 py-2"><input value={r.type || ''} onChange={(e) => updateRowField(idx, 'type', e.target.value)} className="w-full p-1 text-sm" /></td>
                  <td className="px-4 py-2"><input value={r.datetime || ''} onChange={(e) => updateRowField(idx, 'datetime', e.target.value)} className="w-full p-1 text-sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
