import { useState } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

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
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [attendanceOverrides, setAttendanceOverrides] = useState({})

  const addRow = (data = {}) => {
    setRows(prev => ([...prev, {
      employee_id: data.employee_id || '',
      name: data.name || '',
      date: data.date || '',
      check_in: data.check_in || '',
      check_out: data.check_out || '',
      notes: data.notes || ''
    }]))
  }

  const updateRowField = (index, field, value) => {
    setRows(prev => prev.map((r,i) => i === index ? ({ ...r, [field]: value }) : r))
  }

  const removeRow = (index) => {
    setRows(prev => prev.filter((_, i) => i !== index))
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

  const handleApplyPaste = () => {
    if (!pasteText || !pasteText.trim()) return
    const lines = pasteText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    const delim = lines[0].includes('\t') ? '\t' : ','
    const firstParts = lines[0].split(delim).map(p => p.trim())

    // Determine if first row is header-like
    const headerKeys = firstParts.map(h => mapHeaderToKey(h))
    const hasHeader = headerKeys.some(k => k !== null)

    const newRows = []

    for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
      const parts = lines[i].split(delim).map(p => p.trim())
      const obj = { employee_id: '', name: '', date: '', check_in: '', check_out: '', notes: '' }

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

    setPasteText('')
    setShowPaste(false)
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <button onClick={() => setActive('checkin')} className={`px-3 py-1 rounded-md ${active === 'checkin' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-600'}`}>Check-In</button>
          <button onClick={() => setActive('checkout')} className={`px-3 py-1 rounded-md ${active === 'checkout' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-600'}`}>Check-Out</button>
          <button onClick={() => setActive('attendance')} className={`px-3 py-1 rounded-md ${active === 'attendance' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-600'}`}>Attendance</button>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={downloadTemplate} className="px-3 py-1 rounded-md bg-slate-700 text-white">Download Template</button>
          <input id="fileInput" type="file" accept=".xlsx, .xls, .csv" onChange={handleFile} className="hidden" />
          <label htmlFor="fileInput" className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 cursor-pointer border border-gray-200">Upload Report</label>

          <button onClick={() => setShowPaste(true)} className="px-3 py-1 rounded-md bg-yellow-400 text-slate-900">Paste Data</button>

          <button onClick={() => addRow()} className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 border border-gray-200">Add Row</button>

          <button onClick={() => exportReport(active)} className="px-3 py-1 rounded-md bg-emerald-600 text-white">Export {active === 'checkin' ? 'Check-In' : active === 'checkout' ? 'Check-Out' : 'Attendance'} Report</button>
        </div>
      </div>

      {showPaste && (
        <div className="p-4 mb-4 border border-dashed rounded bg-gray-50">
          <p className="text-sm mb-2">Paste tabular data (CSV or tab/TSV). First row can be headers matching template (SR, Username, CNIC, UC/Ward, Type, Date&Time) or omit headers to map by column order.</p>
          <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={6} className="w-full p-2 border rounded" />
          <div className="flex justify-end space-x-2 mt-2">
            <button onClick={() => { setPasteText(''); setShowPaste(false) }} className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 border border-gray-200">Cancel</button>
            <button onClick={handleApplyPaste} className="px-3 py-1 rounded-md bg-emerald-600 text-white">Apply Paste</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-100 rounded-md">
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
                if (!attendance.length) return (
                  <tr>
                    <td colSpan={7} className="p-6 text-slate-500 text-center">No attendance data. Load check-in/check-out records to compute attendance.</td>
                  </tr>
                )
                return attendance.map((a, i) => (
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
                ))
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
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
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
                  <td className="px-4 py-2"><input value={r.sr} onChange={(e) => updateRowField(idx, 'sr', e.target.value)} className="w-full text-sm p-1 bg-transparent" /></td>
                  <td className="px-4 py-2"><input value={r.username} onChange={(e) => updateRowField(idx, 'username', e.target.value)} className="w-full text-sm p-1 bg-transparent" /></td>
                  <td className="px-4 py-2"><input value={r.cnic} onChange={(e) => updateRowField(idx, 'cnic', e.target.value)} className="w-full text-sm p-1 bg-transparent" /></td>
                  <td className="px-4 py-2"><input value={r.uc_ward} onChange={(e) => updateRowField(idx, 'uc_ward', e.target.value)} className="w-full text-sm p-1 bg-transparent" /></td>
                  <td className="px-4 py-2"><input value={r.type} onChange={(e) => updateRowField(idx, 'type', e.target.value)} className="w-full text-sm p-1 bg-transparent" /></td>
                  <td className="px-4 py-2"><input value={r.datetime} onChange={(e) => updateRowField(idx, 'datetime', e.target.value)} className="w-full text-sm p-1 bg-transparent" /></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => removeRow(idx)} className="px-2 py-1 text-sm text-red-600 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
