import { useState } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const templateHeaders = [
  'employee_id',
  'name',
  'date',
  'check_in',
  'check_out',
  'notes'
]

export default function HRTab() {
  const [active, setActive] = useState('checkin')
  const [rows, setRows] = useState([])

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([])
    XLSX.utils.sheet_add_aoa(ws, [templateHeaders], { origin: 'A1' })
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `attendance-template.xlsx`)
  }

  const exportReport = (filterType) => {
    // Filter by active tab (checkin/checkout) if requested
    let exportRows = rows
    if (filterType === 'checkin') exportRows = rows.filter(r => r.check_in)
    if (filterType === 'checkout') exportRows = rows.filter(r => r.check_out)

    const ws = XLSX.utils.json_to_sheet(exportRows)
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
      employee_id: r.employee_id || r.employeeId || r['Employee ID'] || r['employee id'] || r['employee_id'] || '',
      name: r.name || r.Name || r['Full Name'] || '',
      date: r.date || r.Date || '',
      check_in: r.check_in || r.checkIn || r['Check-In'] || '',
      check_out: r.check_out || r.checkOut || r['Check-Out'] || '',
      notes: r.notes || r.Notes || ''
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
          <button onClick={() => exportReport(active)} className="px-3 py-1 rounded-md bg-emerald-600 text-white">Export {active === 'checkin' ? 'Check-In' : 'Check-Out'} Report</button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-md">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {templateHeaders.map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">{h.replace('_', ' ')}</th>
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
                <td className="px-4 py-2">{r.employee_id}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.date}</td>
                <td className="px-4 py-2">{r.check_in}</td>
                <td className="px-4 py-2">{r.check_out}</td>
                <td className="px-4 py-2">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
