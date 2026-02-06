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

  const exportReport = (filterType) => {
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
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={downloadTemplate} className="px-3 py-1 rounded-md bg-slate-700 text-white">Download Template</button>
          <input id="fileInput" type="file" accept=".xlsx, .xls, .csv" onChange={handleFile} className="hidden" />
          <label htmlFor="fileInput" className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 cursor-pointer border border-gray-200">Upload Report</label>

          <button onClick={() => setShowPaste(true)} className="px-3 py-1 rounded-md bg-yellow-400 text-slate-900">Paste Data</button>

          <button onClick={() => addRow()} className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 border border-gray-200">Add Row</button>

          <button onClick={() => exportReport(active)} className="px-3 py-1 rounded-md bg-emerald-600 text-white">Export {active === 'checkin' ? 'Check-In' : 'Check-Out'} Report</button>
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
      </div>
    </div>
  )
}
