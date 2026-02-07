import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { supabase } from '../../../supabaseClient'

const fleetHeaders = ['sr', 'reg_no', 'town', 'mileage', 'ignition_time', 'fuel_allocated']

export default function DailyReporting() {
  const [rows, setRows] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadMode, setUploadMode] = useState('choose')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [previewRows, setPreviewRows] = useState([])
  const [pasteGrid, setPasteGrid] = useState([])
  const [pasteStart, setPasteStart] = useState({ r: 0, c: 0 })
  const [pasteNotice, setPasteNotice] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  // Load today's fleet data on mount
  useEffect(() => {
    loadFleetData()
  }, [])

  const loadFleetData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('fleet_daily_reports')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: true })

      if (error) throw error

      const loadedRows = (data || []).map((r, idx) => ({
        sr: idx + 1,
        reg_no: r.reg_no || '',
        town: r.town || '',
        mileage: r.mileage ? String(r.mileage) : '',
        ignition_time: r.ignition_time ? String(r.ignition_time) : '',
        fuel_allocated: r.fuel_allocated ? String(r.fuel_allocated) : ''
      }))
      setRows(loadedRows)
      setSaveResult(null)
    } catch (err) {
      console.error('Load fleet data error', err)
    } finally {
      setLoading(false)
    }
  }

  const updateRowField = (idx, field, value) => {
    setRows(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      copy[idx].sr = idx + 1
      return copy
    })
  }

  const getHeaderLabel = (key) => {
    const labels = {
      sr: 'SR',
      reg_no: 'REG NO',
      town: 'TOWN',
      mileage: 'MILEAGE',
      ignition_time: 'IG TIME',
      fuel_allocated: 'FUEL ALLOCATED'
    }
    return labels[key] || key.toUpperCase()
  }

  const downloadTemplate = () => {
    const headerRow = ['SR', 'Reg No', 'Town', 'Mileage', 'IG Time', 'Fuel Allocated']
    const ws = XLSX.utils.aoa_to_sheet([headerRow])
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `fleet-daily-reporting-template.xlsx`)
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

    const json_keys = json.length > 0 ? Object.keys(json[0]) : []

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

    const regNoIdx = findColumnIndex(['reg', 'registration', 'reg no', 'vehicle'])
    const townIdx = findColumnIndex(['town', 'area', 'location'])
    const mileageIdx = findColumnIndex(['mileage', 'distance', 'km'])
    const igTimeIdx = findColumnIndex(['ig time', 'ignition time', 'ignition', 'on time'])
    const fuelIdx = findColumnIndex(['fuel', 'fuel allocated', 'fuel issued'])

    const getValueByIndex = (row, idx) => {
      if (idx >= 0 && idx < json_keys.length) {
        return (row[json_keys[idx]] || '').toString().trim()
      }
      return ''
    }

    const normalized = json.map((r, idx) => ({
      sr: idx + 1,
      reg_no: regNoIdx >= 0 ? getValueByIndex(r, regNoIdx) : (r.reg_no || r['Reg No'] || r.registration || ''),
      town: townIdx >= 0 ? getValueByIndex(r, townIdx) : (r.town || r.Town || r.area || ''),
      mileage: mileageIdx >= 0 ? getValueByIndex(r, mileageIdx) : (r.mileage || r.Mileage || ''),
      ignition_time: igTimeIdx >= 0 ? getValueByIndex(r, igTimeIdx) : (r.ignition_time || r['IG Time'] || r['Ignition Time'] || ''),
      fuel_allocated: fuelIdx >= 0 ? getValueByIndex(r, fuelIdx) : (r.fuel_allocated || r['Fuel Allocated'] || r.fuel || '')
    }))

    setPreviewRows(normalized.slice(0, 6))
    setRows(normalized)
  }

  const handleDropFile = async (file) => {
    if (!file) return
    setSelectedFileName(file.name)
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const first = wb.SheetNames[0]
    const sheet = wb.Sheets[first]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    const json_keys = json.length > 0 ? Object.keys(json[0]) : []

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

    const regNoIdx = findColumnIndex(['reg', 'registration', 'reg no', 'vehicle'])
    const townIdx = findColumnIndex(['town', 'area', 'location'])
    const mileageIdx = findColumnIndex(['mileage', 'distance', 'km'])
    const igTimeIdx = findColumnIndex(['ig time', 'ignition time', 'ignition', 'on time'])
    const fuelIdx = findColumnIndex(['fuel', 'fuel allocated', 'fuel issued'])

    const getValueByIndex = (row, idx) => {
      if (idx >= 0 && idx < json_keys.length) {
        return (row[json_keys[idx]] || '').toString().trim()
      }
      return ''
    }

    const normalized = json.map((r, idx) => ({
      sr: idx + 1,
      reg_no: regNoIdx >= 0 ? getValueByIndex(r, regNoIdx) : (r.reg_no || r['Reg No'] || r.registration || ''),
      town: townIdx >= 0 ? getValueByIndex(r, townIdx) : (r.town || r.Town || r.area || ''),
      mileage: mileageIdx >= 0 ? getValueByIndex(r, mileageIdx) : (r.mileage || r.Mileage || ''),
      ignition_time: igTimeIdx >= 0 ? getValueByIndex(r, igTimeIdx) : (r.ignition_time || r['IG Time'] || r['Ignition Time'] || ''),
      fuel_allocated: fuelIdx >= 0 ? getValueByIndex(r, fuelIdx) : (r.fuel_allocated || r['Fuel Allocated'] || r.fuel || '')
    }))

    setPreviewRows(normalized.slice(0, 6))
    setRows(normalized)
  }

  const initPasteGrid = (rowsCount = 5) => {
    const grid = Array.from({ length: rowsCount }, () => Array(fleetHeaders.length).fill(''))
    setPasteGrid(grid)
    setPasteStart({ r: 0, c: 0 })
  }

  const handleGridCellChange = (ri, ci, value) => {
    setPasteGrid(prev => {
      const g = prev.map(r => [...r])
      while (g.length <= ri) g.push(Array(fleetHeaders.length).fill(''))
      g[ri][ci] = value
      return g
    })
  }

  const handleGridPaste = (e, startR = 0, startC = 0) => {
    const cd = e?.clipboardData || (window.clipboardData ? window.clipboardData : null)
    let text = ''
    if (cd) {
      text = cd.getData('text') || cd.getData('text/plain') || ''
    }
    if (!text || !text.trim()) {
      setPasteNotice('Nothing found in clipboard')
      setTimeout(() => setPasteNotice(''), 3000)
      if (e && e.preventDefault) e.preventDefault()
      return
    }

    const lines = text.split(/\r?\n/).map(l => l.split(/\t/).map(c => c.trim())).filter(r => r.length)
    if (e && e.preventDefault) e.preventDefault()
    applyLinesToGrid(lines, startR, startC)
  }

  const applyLinesToGrid = (lines, startR = 0, startC = 0) => {
    setPasteGrid(prev => {
      const g = prev && prev.length ? prev.map(r => [...r]) : []
      for (let r = 0; r < lines.length; r++) {
        const rowIdx = startR + r
        if (!g[rowIdx]) g[rowIdx] = Array(fleetHeaders.length).fill('')
        for (let c = 0; c < lines[r].length; c++) {
          const colIdx = startC + c
          if (colIdx < fleetHeaders.length) g[rowIdx][colIdx] = lines[r][c]
        }
      }
      setPasteNotice(`Pasted ${lines.length} row${lines.length > 1 ? 's' : ''}`)
      setTimeout(() => setPasteNotice(''), 3000)
      return g
    })
  }

  const applyPasteGrid = () => {
    if (!pasteGrid || pasteGrid.length === 0) return
    const newRows = []
    for (let i = 0; i < pasteGrid.length; i++) {
      const row = pasteGrid[i]
      if (!row || row.every(cell => !String(cell).trim())) continue

      const obj = {
        sr: '',
        reg_no: row[1] || '',
        town: row[2] || '',
        mileage: row[3] || '',
        ignition_time: row[4] || '',
        fuel_allocated: row[5] || ''
      }
      newRows.push(obj)
    }

    if (newRows.length) {
      setRows(prev => [...prev, ...newRows].map((r, idx) => ({ ...r, sr: idx + 1 })))
    }
    setPasteGrid([])
    setShowUploadModal(false)
  }

  const handleCloseUploadModal = () => {
    setShowUploadModal(false)
    setUploadMode('choose')
    setPasteGrid([])
    setSelectedFileName('')
    setPreviewRows([])
  }

  const saveFleetData = async () => {
    setSaveResult(null)
    setSaving(true)
    try {
      let success = 0
      let failed = 0
      const failures = []

      for (const row of rows) {
        const regNo = (row.reg_no || '').trim()
        if (!regNo) {
          failures.push({ row, reason: 'Missing registration number' })
          failed++
          continue
        }

        const payload = {
          date: today,
          reg_no: regNo,
          town: (row.town || '').trim() || null,
          mileage: row.mileage ? parseFloat(row.mileage) : null,
          ignition_time: row.ignition_time ? parseFloat(row.ignition_time) : null,
          fuel_allocated: row.fuel_allocated ? parseFloat(row.fuel_allocated) : null
        }

        const { error } = await supabase
          .from('fleet_daily_reports')
          .upsert(payload, { onConflict: ['date', 'reg_no'] })

        if (error) {
          failures.push({ row, reason: error.message })
          failed++
        } else {
          success++
        }
      }

      setSaveResult({ success, failed, failures })
    } catch (err) {
      console.error('Save fleet data error', err)
      setSaveResult({ success: 0, failed: rows.length, message: 'Unexpected error' })
    } finally {
      setSaving(false)
    }
  }

  const exportData = () => {
    const ws = XLSX.utils.json_to_sheet(rows, { header: fleetHeaders })
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `fleet-daily-report-${today}.xlsx`)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600">
          <strong>Today's Report:</strong> {today}
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={downloadTemplate} className="px-3 py-1 rounded-md bg-slate-700 text-white text-sm">Download Template</button>

          <button onClick={() => { setUploadMode('choose'); setShowUploadModal(true) }} className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 cursor-pointer border border-gray-200 text-sm">Upload Report</button>

          <button onClick={() => setRows([])} className="px-3 py-1 rounded-md bg-red-50 text-red-600 border border-red-100 text-sm">Clear Table</button>

          <button onClick={exportData} className="px-3 py-1 rounded-md bg-emerald-600 text-white text-sm">Export Report</button>

          <button onClick={saveFleetData} disabled={saving} className="px-3 py-1 rounded-md bg-sky-600 text-white text-sm">
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Reg No or Town"
          className="px-3 py-1.5 rounded-md border border-gray-200 text-sm w-full max-w-md focus:ring-1 focus:ring-sky-300"
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl p-4 bg-white rounded">
            {uploadMode === 'choose' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upload Fleet Report</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded hover:shadow-lg cursor-pointer" onClick={() => setUploadMode('file')}>
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-slate-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div>
                        <div className="font-semibold">Upload Excel / CSV</div>
                        <div className="text-xs text-slate-500">Choose a file to import</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded hover:shadow-lg cursor-pointer" onClick={() => { initPasteGrid(8); setUploadMode('paste') }}>
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-yellow-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div>
                        <div className="font-semibold">Paste Manually</div>
                        <div className="text-xs text-slate-500">Paste data from spreadsheet</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={handleCloseUploadModal} className="px-4 py-2 rounded bg-gray-50 border text-sm">Cancel</button>
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
                            {fleetHeaders.map((h) => (
                              <th key={h} className="pr-4">{getHeaderLabel(h)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((r, i) => (
                            <tr key={i} className={`${i % 2 ? 'bg-gray-50' : ''}`}>
                              {fleetHeaders.map((h) => (
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
                  <button onClick={handleCloseUploadModal} className="px-3 py-1 rounded bg-gray-50 border text-sm">Close</button>
                </div>
              </div>
            )}

            {uploadMode === 'paste' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Paste Data</h3>
                  <button onClick={handleCloseUploadModal} className="text-slate-500 hover:text-slate-700">Close ✕</button>
                </div>

                <div className="overflow-auto border rounded mb-3 max-h-64">
                  <table className="min-w-full table-fixed border-collapse text-sm">
                    <thead className="bg-gray-100 sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-2 py-1 border text-xs">#</th>
                        {fleetHeaders.map((h, ci) => (
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
                          <td colSpan={fleetHeaders.length + 1} className="p-4 text-center text-slate-500">Empty grid. Paste data or use clipboard.</td>
                        </tr>
                      )}
                      {pasteNotice && (
                        <tr>
                          <td colSpan={fleetHeaders.length + 1} className="p-2 text-center text-sky-700 text-xs">{pasteNotice}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <button onClick={() => initPasteGrid(5)} className="px-2 py-1 rounded bg-gray-50 border text-sm">Reset Grid</button>
                </div>

                <div className="flex justify-end space-x-2 mt-2">
                  <button onClick={handleCloseUploadModal} className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 border border-gray-200 text-sm">Cancel</button>
                  <button onClick={() => { applyPasteGrid(); handleCloseUploadModal() }} className="px-3 py-1 rounded-md bg-emerald-600 text-white text-sm">Apply Paste</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Result */}
      {saveResult && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <strong>{saveResult.success}</strong> saved, <strong>{saveResult.failed}</strong> failed.
          {saveResult.failures && saveResult.failures.length > 0 && (
            <details className="mt-2 text-xs text-red-600">
              <summary>View failures</summary>
              <ul className="mt-2 list-disc list-inside">
                {saveResult.failures.map((f, i) => (
                  <li key={i}><strong>{f.row.reg_no}</strong>: {f.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Fleet Table */}
      <div className="overflow-x-auto border border-gray-100 rounded-md">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading fleet data...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {fleetHeaders.map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">{getHeaderLabel(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {(() => {
                const q = (searchQuery || '').toLowerCase().trim()
                const filteredRows = q ? rows.filter(r => (r.reg_no || '').toLowerCase().includes(q) || (r.town || '').toLowerCase().includes(q)) : rows

                if (filteredRows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={fleetHeaders.length} className="p-6 text-slate-500 text-center">No fleet data. Upload a report or add entries manually.</td>
                    </tr>
                  )
                }

                return filteredRows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2"><input value={r.sr || ''} readOnly className="w-full p-1 text-sm bg-gray-50 border-0" /></td>
                    <td className="px-4 py-2"><input value={r.reg_no || ''} onChange={(e) => updateRowField(idx, 'reg_no', e.target.value)} className="w-full p-1 text-sm border border-gray-200 rounded" /></td>
                    <td className="px-4 py-2"><input value={r.town || ''} onChange={(e) => updateRowField(idx, 'town', e.target.value)} className="w-full p-1 text-sm border border-gray-200 rounded" /></td>
                    <td className="px-4 py-2"><input value={r.mileage || ''} onChange={(e) => updateRowField(idx, 'mileage', e.target.value)} type="number" step="0.01" className="w-full p-1 text-sm border border-gray-200 rounded" /></td>
                    <td className="px-4 py-2"><input value={r.ignition_time || ''} onChange={(e) => updateRowField(idx, 'ignition_time', e.target.value)} type="number" step="0.01" className="w-full p-1 text-sm border border-gray-200 rounded" /></td>
                    <td className="px-4 py-2"><input value={r.fuel_allocated || ''} onChange={(e) => updateRowField(idx, 'fuel_allocated', e.target.value)} type="number" step="0.01" className="w-full p-1 text-sm border border-gray-200 rounded" /></td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
