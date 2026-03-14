import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { supabase } from '../../../supabaseClient'

const fleetHeaders = ['sr', 'reg_no', 'town', 'mileage', 'ignition_time', 'fuel_allocated']

const formatToHMS = (decimal) => {
  if (decimal === undefined || decimal === null || decimal === '' || isNaN(parseFloat(decimal))) return '00:00:00';
  const totalSeconds = Math.round(parseFloat(decimal) * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const hmsToDecimal = (hms) => {
  if (!hms || typeof hms !== 'string' || !hms.includes(':')) {
    const val = parseFloat(hms);
    return isNaN(val) ? 0 : val;
  }
  const parts = hms.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return parseFloat((hours + minutes / 60 + seconds / 3600).toFixed(4));
};

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

  // Auto-sync rows to Mileage Report transfer buffer
  useEffect(() => {
    if (rows && rows.length > 0) {
      const transferData = rows.map(row => ({
        // Prefer explicit vehicle_code, fallback to reg_no
        vehicle_code: row.vehicle_code || row.reg_no,
        reg_no: row.reg_no,
        mileage: row.mileage,
        ignition_time: row.ignition_time,
        source: 'daily_reporting'
      }))

      const payload = JSON.stringify(transferData)
      localStorage.setItem('mileageReportTransfer', payload)
      // Broadcast for same-window active components
      window.dispatchEvent(new CustomEvent('mileageTransfer', { detail: transferData }))
      console.log(`📡 Broadcasted sync for ${transferData.length} vehicles from Daily Reporting`)
    }
  }, [rows])

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
        ignition_time: r.ignition_time ? formatToHMS(r.ignition_time) : '00:00:00',
        fuel_allocated: r.fuel_allocated ? String(r.fuel_allocated) : ''
      }))

      // Enrich with vehicle_code from registration for better syncing
      try {
        const regNos = [...new Set(loadedRows.map(r => r.reg_no).filter(Boolean))]
        if (regNos.length > 0) {
          const { data: vInfo } = await supabase
            .from('vehicle_registrations')
            .select('reg_no, vehicle_code')
            .in('reg_no', regNos)

          if (vInfo && vInfo.length > 0) {
            const map = {}
            vInfo.forEach(v => { map[v.reg_no.toLowerCase().trim()] = v.vehicle_code })
            loadedRows.forEach(r => {
              const key = (r.reg_no || '').toLowerCase().trim()
              if (map[key]) r.vehicle_code = map[key]
            })
          }
        }
      } catch (e) { console.warn('Sync enrichment failed', e) }

      setRows(loadedRows)
      setSaveResult(null)
    } catch (err) {
      console.error('Load fleet data error', err)
    } finally {
      setLoading(false)
    }
  }

  const updateRowField = async (idx, field, value) => {
    setRows(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      copy[idx].sr = idx + 1
      return copy
    })

    // If reg_no changed, try to fetch the corresponding vehicle_code for sync
    if (field === 'reg_no' && value) {
      try {
        const { data } = await supabase
          .from('vehicle_registrations')
          .select('vehicle_code')
          .eq('reg_no', value.trim())
          .single()
        
        if (data?.vehicle_code) {
          setRows(prev => {
            const copy = [...prev]
            if (copy[idx]) copy[idx].vehicle_code = data.vehicle_code
            return copy
          })
        }
      } catch (e) { /* silent fail */ }
    }
  }

  const getHeaderLabel = (key) => {
    const labels = {
      sr: 'SR',
      reg_no: 'VEHICLE CODE',
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

  const normalizeFleetRows = (json) => {
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

    const getValueByIndex = (row, idx, isTime = false) => {
      if (idx >= 0 && idx < json_keys.length) {
        const val = row[json_keys[idx]]
        if (isTime && typeof val === 'number') {
          return formatToHMS(val * 24)
        }
        return (val || '').toString().trim()
      }
      return ''
    }

    return json.map((r, idx) => ({
      sr: idx + 1,
      reg_no: regNoIdx >= 0 ? getValueByIndex(r, regNoIdx) : (r.reg_no || r['Reg No'] || r.registration || ''),
      town: townIdx >= 0 ? getValueByIndex(r, townIdx) : (r.town || r.Town || r.area || ''),
      mileage: mileageIdx >= 0 ? getValueByIndex(r, mileageIdx) : (r.mileage || r.Mileage || ''),
      ignition_time: igTimeIdx >= 0 ? getValueByIndex(r, igTimeIdx, true) : (r.ignition_time || r['IG Time'] || r['Ignition Time'] || ''),
      fuel_allocated: fuelIdx >= 0 ? getValueByIndex(r, fuelIdx) : (r.fuel_allocated || r['Fuel Allocated'] || r.fuel || '')
    }))
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

    const normalized = normalizeFleetRows(json)
    setPreviewRows(normalized.slice(0, 6))
    
    // Enrich with codes before setting
    const enriched = await enrichRowsWithCodes(normalized)
    setRows(enriched)
    
    // Immediate sync
    const transferData = enriched.map(row => ({
      vehicle_code: row.vehicle_code || row.reg_no,
      reg_no: row.reg_no,
      mileage: row.mileage,
      ignition_time: row.ignition_time,
      source: 'daily_reporting'
    }))
    localStorage.setItem('mileageReportTransfer', JSON.stringify(transferData))
    window.dispatchEvent(new CustomEvent('mileageTransfer', { detail: transferData }))
  }

  const handleDropFile = async (file) => {
    if (!file) return
    setSelectedFileName(file.name)
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const first = wb.SheetNames[0]
    const sheet = wb.Sheets[first]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    const normalized = normalizeFleetRows(json)
    setPreviewRows(normalized.slice(0, 6))
    
    // Enrich with codes before setting
    const enriched = await enrichRowsWithCodes(normalized)
    setRows(enriched)

    // Immediate sync
    const transferData = enriched.map(row => ({
      vehicle_code: row.vehicle_code || row.reg_no,
      reg_no: row.reg_no,
      mileage: row.mileage,
      ignition_time: row.ignition_time,
      source: 'daily_reporting'
    }))
    localStorage.setItem('mileageReportTransfer', JSON.stringify(transferData))
    window.dispatchEvent(new CustomEvent('mileageTransfer', { detail: transferData }))
  }

  const enrichRowsWithCodes = async (targetRows) => {
    try {
      const regNos = [...new Set(targetRows.map(r => r.reg_no).filter(Boolean))]
      if (regNos.length === 0) return targetRows

      // Wrap codes in double quotes to handle spaces (e.g. "LED 1234")
      const query = regNos.map(code => `reg_no.eq."${code}",vehicle_code.eq."${code}"`).join(',')
      const { data: vInfo } = await supabase
        .from('vehicle_registrations')
        .select('reg_no, vehicle_code')
        .or(query)

      if (vInfo && vInfo.length > 0) {
        const map = {}
        vInfo.forEach(v => {
          if (v.reg_no) map[v.reg_no.toLowerCase().trim()] = v.vehicle_code
          if (v.vehicle_code) map[v.vehicle_code.toLowerCase().trim()] = v.vehicle_code
        })

        return targetRows.map(r => {
          const key = (r.reg_no || '').toLowerCase().trim()
          const code = map[key] || r.vehicle_code || r.reg_no
          return { ...r, vehicle_code: code }
        })
      }
    } catch (e) {
      console.warn('Enrichment failed:', e)
    }
    return targetRows
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
      enrichRowsWithCodes(newRows).then(enriched => {
        setRows(prev => {
          const existing = [...prev]
          enriched.forEach(nr => {
            const idx = existing.findIndex(er => (er.reg_no || '').toLowerCase().trim() === (nr.reg_no || '').toLowerCase().trim())
            if (idx >= 0) {
              existing[idx] = { ...existing[idx], ...nr }
            } else {
              existing.push(nr)
            }
          })
          const updated = existing.map((r, i) => ({ ...r, sr: i + 1 }))
          
          // Force immediate sync for tab switchers
          const transferData = updated.map(row => ({
            vehicle_code: row.vehicle_code || row.reg_no,
            reg_no: row.reg_no,
            mileage: row.mileage,
            ignition_time: row.ignition_time,
            source: 'daily_reporting'
          }))
          localStorage.setItem('mileageReportTransfer', JSON.stringify(transferData))
          window.dispatchEvent(new CustomEvent('mileageTransfer', { detail: transferData }))
          
          return updated
        })
      })
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
          vehicle_code: row.vehicle_code || regNo, // Ensure vehicle_code is included
          town: (row.town || '').trim() || null,
          mileage: row.mileage ? parseFloat(row.mileage) : null,
          ignition_time: row.ignition_time ? hmsToDecimal(row.ignition_time) : null,
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
      <div className="flex items-center justify-between mb-6 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 bg-white/60 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {today}
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={() => { setUploadMode('choose'); setShowUploadModal(true) }} className="px-4 py-2 rounded-xl bg-white/80 text-slate-700 hover:bg-white border border-white/60 shadow-sm text-sm font-medium transition-all backdrop-blur-sm">Upload Report</button>

          <button onClick={() => setRows([])} className="px-4 py-2 rounded-xl bg-rose-50/80 text-rose-600 hover:bg-rose-100 border border-rose-100 text-sm font-medium transition-all backdrop-blur-sm">Clear</button>

          <button onClick={exportData} className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 text-sm font-medium transition-all border border-transparent">Export</button>
        </div>
      </div>


      {/* Search bar */}
      {/* Search bar */}
      <div className="mb-6 max-w-md">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Vehicle Code or Town..."
            className="pl-10 pr-10 py-2.5 rounded-xl bg-white/50 border border-white/60 text-sm w-full text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm backdrop-blur-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-500/20 border border-white/50 overflow-hidden transform transition-all scale-100 opacity-100">

            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                  {uploadMode === 'choose' && 'Import Fleet Data'}
                  {uploadMode === 'file' && 'Upload Spreadsheet'}
                  {uploadMode === 'paste' && 'Paste Data Grid'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">Add vehicle reports seamlessly</p>
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
                    <p className="text-sm text-slate-500 px-4">Import an Excel (.xlsx) or CSV file directly</p>
                  </button>

                  <button
                    onClick={() => { initPasteGrid(10); setUploadMode('paste') }}
                    className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all duration-300 text-center bg-white"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-500 flex items-center justify-center mb-4 transition-colors">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-1">Paste Manually</h4>
                    <p className="text-sm text-slate-500 px-4">Copy data from Excel/Sheets and paste directly</p>
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
                      <p className="text-sm text-slate-500 max-w-sm text-center">Support for .xlsx, .xls, and .csv files.</p>
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
                            {fleetHeaders.map((h, ci) => (
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
                      <button onClick={() => initPasteGrid(10)} className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors px-2">Reset Grid</button>
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
      <div className="overflow-x-auto border border-white/60 rounded-2xl shadow-lg shadow-indigo-100/10 bg-white/40 backdrop-blur-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading fleet data...</span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100/50 text-sm">
            <thead className="bg-gray-50/50 backdrop-blur-sm">
              <tr>
                {fleetHeaders.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{getHeaderLabel(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-100/50">
              {(() => {
                const q = (searchQuery || '').toLowerCase().trim()
                const filteredRows = q ? rows.filter(r => (r.reg_no || '').toLowerCase().includes(q) || (r.town || '').toLowerCase().includes(q)) : rows

                if (filteredRows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={fleetHeaders.length} className="p-8 text-slate-500 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span>No fleet data available. Upload a report or add entries manually.</span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return filteredRows.map((r, filteredIdx) => {
                  const actualIdx = rows.indexOf(r)
                  return (
                    <tr key={filteredIdx} className="hover:bg-white/40 transition-colors">
                      <td className="px-4 py-2"><input value={r.sr || ''} readOnly className="w-full p-1.5 text-sm bg-transparent border-0 text-slate-500" /></td>
                      <td className="px-4 py-2"><input value={r.reg_no || ''} onChange={(e) => updateRowField(actualIdx, 'reg_no', e.target.value)} className="w-full p-1.5 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all font-mono font-medium text-slate-700" /></td>
                      <td className="px-4 py-2"><input value={r.town || ''} onChange={(e) => updateRowField(actualIdx, 'town', e.target.value)} className="w-full p-2 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all" /></td>
                      <td className="px-4 py-2"><input value={r.mileage || ''} onChange={(e) => updateRowField(actualIdx, 'mileage', e.target.value)} type="number" step="0.01" className="w-full p-2 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all font-mono" /></td>
                      <td className="px-4 py-2"><input value={r.ignition_time || ''} onChange={(e) => updateRowField(actualIdx, 'ignition_time', e.target.value)} type="text" placeholder="00:00:00" className="w-full p-2 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all font-mono" /></td>
                      <td className="px-4 py-2"><input value={r.fuel_allocated || ''} onChange={(e) => updateRowField(actualIdx, 'fuel_allocated', e.target.value)} type="number" step="0.01" className="w-full p-2 text-sm bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all font-mono" /></td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
