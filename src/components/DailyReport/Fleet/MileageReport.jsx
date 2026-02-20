import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { supabase } from '../../../supabaseClient'

const mileageHeaders = ['sr', 'reg_no', 'vehicle_type', 'used_for', 'mileage', 'ignition_time', 'threshold', 'remarks']

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

export default function MileageReport() {
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
  // UI tab state (Added for future filters: 'Used For' and 'Threshold')
  const [activeTab, setActiveTab] = useState('all')
  const [showUsedForModal, setShowUsedForModal] = useState(false)
  const [usedForGrid, setUsedForGrid] = useState([])
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [thresholdGrid, setThresholdGrid] = useState([])
  const [hasProposedThreshold, setHasProposedThreshold] = useState(false)
  const [proposedThresholdGrid, setProposedThresholdGrid] = useState([])
  // Staging for transfers: Used For proposals (accepted first) — must pass through modal before writing to main table
  const [hasProposedUsedFor, setHasProposedUsedFor] = useState(false)
  const [proposedUsedForGrid, setProposedUsedForGrid] = useState([])
  const [pushingAttendance, setPushingAttendance] = useState(false)
  const [attendancePushResult, setAttendancePushResult] = useState(null)

  // Auto-detection map for Used For suggestions (keys are lowercase)
  const USED_FOR_SUGGESTIONS = {
    'compactor': 'Container-Based Collection',
    'arm roller': 'Container-Based Collection',
    'road washer': 'Road Washing',
    'mechanical sweeper': 'Mechanical Sweeping',
    'loader': 'Loader Operations',
    'front end loader': 'Loader Operations',
    'front-end loader': 'Loader Operations',
    'loader rickshaw': 'Door-to-Door',
    'mini tipper': 'Commercial Area',
    'tractor trolley': 'TCP',
    'dumper truck': 'TCP',
    'front-end blade': 'TCP',
    'container repair vehicle': 'Container Repair'
  }

  // For types where there are multiple valid 'Used For' options, list them here
  const USED_FOR_OPTIONS = {
    'loader rickshaws': ['Door-to-Door', 'Commercial Area'],
    'tractor trolley': ['TCP', 'Bulk Waste'],
    'dumper truck': ['TCP', 'Bulk Waste'],
    'front end loader': ['TCP', 'Bulk Waste'],
    'front end blade': ['TCP', 'Container Repair']
  }

  const getSuggestionForType = (t) => {
    if (!t) return null
    const key = t.toString().trim().toLowerCase()
    return USED_FOR_SUGGESTIONS[key] || null
  }

  const getOptionsForType = (t) => {
    if (!t) return null
    const key = t.toString().trim().toLowerCase()
    return USED_FOR_OPTIONS[key] || null
  }

  // Threshold defaults and units (string keys are lowercased vehicle_type values)
  const THRESHOLD_DEFAULTS = {
    'loader rickshaws': { value: '12', unit: '' },
    'compactor': { value: '20', unit: '' },
    'mini tripper': { value: '10', unit: '' },
    'mechanical washer': { value: '10', unit: '' },
    'mechanical sweeper': { value: '10', unit: '' },
    'tractor trolley': { value: '20', unit: '' },
    'dumper truck': { value: '35', unit: '' },
    'arm roller': { value: '25', unit: '' },
    'front end blade': { value: '3', unit: 'hrs' },
    'front end loader': { value: '3', unit: 'hrs' }
  }

  const getThresholdForType = (t) => {
    if (!t) return null
    const key = t.toString().trim().toLowerCase()
    return THRESHOLD_DEFAULTS[key] || null
  }

  // Stage proposed 'Used For' rows from incoming vehicle records transfer (do not write to main table yet)
  const stageProposedUsedFor = (vehicleRecords) => {
    if (!vehicleRecords || vehicleRecords.length === 0) return []
    const staged = []
    const seen = new Set()
    vehicleRecords.forEach(item => {
      const regNo = (item.reg_no || item.vehicle_code || '').toString()
      if (!regNo || seen.has(regNo)) return
      seen.add(regNo)
      const vehicleType = (item.vehicle_type || '').toString()
      const suggestion = getSuggestionForType(vehicleType)
      const options = getOptionsForType(vehicleType)
      let candidate = (item.used_for || '').toString().trim()
      if (!candidate && suggestion) candidate = suggestion
      staged.push({
        reg_no: regNo,
        vehicle_code: item.vehicle_code || regNo,
        vehicle_type: vehicleType,
        used_for: candidate,
        options,
        used_for_source: candidate ? 'proposed' : 'none'
      })
    })
    return staged
  }

  const stageProposedThresholds = (vehicleRecords) => {
    if (!vehicleRecords || vehicleRecords.length === 0) return []
    const staged = []
    const seen = new Set()
    vehicleRecords.forEach(item => {
      const regNo = (item.reg_no || item.vehicle_code || '').toString()
      if (!regNo || seen.has(regNo)) return
      seen.add(regNo)
      const vehicleType = (item.vehicle_type || '').toString()
      const def = getThresholdForType(vehicleType)
      if (def) {
        staged.push({ reg_no: regNo, vehicle_code: item.vehicle_code || regNo, vehicle_type: vehicleType, threshold: def.value, unit: def.unit || '' })
      }
    })
    return staged
  }

  // Merge transferred data (daily reporting mileage / ignition time) into provided rows array.
  // This function applies mileage/ignition data and vehicle_type when present
  const mergeTransferredData = (baseRows, dailyReportingData = [], vehicleRecordsData = []) => {
    const copy = [...baseRows]
    const updates = {}

    const isLikelyCode = (v) => {
      if (!v) return false
      const s = v.toString().trim()
      // treat as code if contains letters or hyphens (e.g., HND-DT-004) or at least 3 chars
      return /[A-Za-z\-]/.test(s) || s.length >= 3
    }

    if (dailyReportingData && dailyReportingData.length > 0) {
      dailyReportingData.forEach(item => {
        const key = (item.vehicle_code || item.reg_no || '').toString()
        if (!key) return
        updates[key] = updates[key] || { reg_no: key }
        if (item.mileage !== undefined) updates[key].mileage = item.mileage || ''
        if (item.ignition_time !== undefined) updates[key].ignition_time = item.ignition_time || ''
      })
    }

    if (vehicleRecordsData && vehicleRecordsData.length > 0) {
      vehicleRecordsData.forEach(item => {
        const key = (item.reg_no || item.vehicle_code || '').toString()
        if (!key) return
        updates[key] = updates[key] || { reg_no: key }
        if (item.vehicle_type) updates[key].vehicle_type = item.vehicle_type
        // Do NOT apply used_for here — must come through Used For modal
      })
    }

    Object.keys(updates).forEach(k => {
      const u = updates[k]
      const norm = (s) => (s || '').toString().trim().toLowerCase()
      const idx = copy.findIndex(r => norm(r.reg_no) === norm(k) || norm(r.vehicle_code) === norm(k) || (u.vehicle_code && (norm(r.reg_no) === norm(u.vehicle_code) || norm(r.vehicle_code) === norm(u.vehicle_code))))
      if (idx >= 0) {
        // prefer existing reg_no/vehicle_code if they look like codes; otherwise, accept update
        const regNoToSet = isLikelyCode(copy[idx].reg_no) ? copy[idx].reg_no : (isLikelyCode(u.reg_no) ? u.reg_no : copy[idx].reg_no)
        const vehicleCodeToSet = isLikelyCode(copy[idx].vehicle_code) ? copy[idx].vehicle_code : (isLikelyCode(u.vehicle_code) ? u.vehicle_code : (isLikelyCode(u.reg_no) ? u.reg_no : copy[idx].vehicle_code))

        copy[idx] = {
          ...copy[idx],
          reg_no: regNoToSet || copy[idx].reg_no || '',
          vehicle_code: vehicleCodeToSet || copy[idx].vehicle_code || '',
          vehicle_type: u.vehicle_type || copy[idx].vehicle_type || '',
          mileage: u.mileage !== undefined ? u.mileage : copy[idx].mileage,
          ignition_time: u.ignition_time !== undefined ? u.ignition_time : copy[idx].ignition_time
        }
      } else {
        // sanitize pushed reg_no/vehicle_code to avoid numeric indexes
        const finalReg = isLikelyCode(u.reg_no) ? u.reg_no : ''
        const finalCode = isLikelyCode(u.vehicle_code) ? u.vehicle_code : (isLikelyCode(u.reg_no) ? u.reg_no : '')

        // If neither reg nor vehicle code are meaningful, try to find a row by vehicle_type with empty codes to update
        if (!finalReg && !finalCode) {
          const idxByType = copy.findIndex(r => (r.vehicle_type || '').toString().trim().toLowerCase() === (u.vehicle_type || '').toString().trim().toLowerCase() && !(r.reg_no || r.vehicle_code))
          if (idxByType >= 0) {
            copy[idxByType] = {
              ...copy[idxByType],
              vehicle_type: u.vehicle_type || copy[idxByType].vehicle_type || '',
              mileage: u.mileage || copy[idxByType].mileage || '',
              ignition_time: u.ignition_time || copy[idxByType].ignition_time || ''
            }
            return
          }
          // otherwise skip adding a row to avoid blank duplicate
          console.warn('Skipping pending transfer push with no vehicle code:', u)
          return
        }

        const alreadyExists = copy.some(r => norm(r.reg_no) === norm(finalReg) || norm(r.vehicle_code) === norm(finalCode) || (finalReg && (norm(r.reg_no) === norm(finalReg) || norm(r.vehicle_code) === norm(finalReg))))
        if (!alreadyExists) {
          copy.push({
            sr: 0,
            reg_no: finalReg || '',
            vehicle_code: finalCode || '',
            vehicle_type: u.vehicle_type || '',
            used_for: '',
            mileage: u.mileage || '',
            ignition_time: u.ignition_time || '',
            threshold: '',
            remarks: ''
          })
        }
      }
    })

    return copy.map((r, i) => ({ ...r, sr: i + 1 }))
  }

  const openUsedForModal = async () => {
    setActiveTab('used_for')
    const grid = []
    const seen = new Set()

    try {
      // Fetch active vehicles from database
      const { data: activeVehicles, error } = await supabase
        .from('vehicle_registrations')
        .select('*')
        .eq('status', 'Active')
        .order('reg_no', { ascending: true })

      if (error) {
        console.warn('Error fetching active vehicles:', error)
      } else if (activeVehicles && activeVehicles.length > 0) {
        // Process fetched active vehicles
        activeVehicles.forEach((v, idx) => {
          const vehicleType = (v.type || '').toString()
          const suggestion = getSuggestionForType(vehicleType)
          const options = getOptionsForType(vehicleType) || (suggestion ? [suggestion] : null)
          const val = (v.used_for || '').toString().trim()
          const valid = val.length <= 100
          const optionValid = options && options.length > 0 ? options.indexOf(val) !== -1 : true
          const vehicleCode = v.vehicle_code || v.reg_no || ''
          const source = val ? 'user' : (suggestion ? 'suggested' : 'none')
          const displayVal = val || (suggestion || (options && options.length ? options[0] : '')) || ''

          grid.push({
            sr: idx + 1,
            reg_no: v.reg_no || vehicleCode,
            vehicle_code: vehicleCode,
            vehicle_type: vehicleType,
            used_for: displayVal,
            used_for_source: source,
            options,
            used_for_valid: displayVal.length <= 100,
            used_for_option_valid: options && options.length > 0 ? options.indexOf(displayVal) !== -1 : true
          })
          if (vehicleCode) seen.add(vehicleCode)
        })
      }
    } catch (err) {
      console.error('Error opening used for modal:', err)
    }

    // Also include existing mileage report rows that match active vehicles
    ; (rows || []).forEach((r, i) => {
      const vehicleCode = (r.vehicle_code || r.reg_no || '').toString()
      if (vehicleCode && seen.has(vehicleCode)) return
      const vehicleType = (r.vehicle_type || '').toString()
      const suggestion = getSuggestionForType(vehicleType)
      const options = getOptionsForType(vehicleType) || (suggestion ? [suggestion] : null)
      const val = (r.used_for || '').toString().trim()
      const source = val ? 'user' : (suggestion ? 'suggested' : 'none')
      const displayVal = val || (suggestion || (options && options.length ? options[0] : '')) || ''
      const valid = displayVal.length <= 100
      const optionValid = options && options.length > 0 ? options.indexOf(displayVal) !== -1 : true
      grid.push({ sr: grid.length + 1, reg_no: r.reg_no || vehicleCode, vehicle_code: vehicleCode, vehicle_type: vehicleType, used_for: displayVal, used_for_source: source, options, used_for_valid: valid, used_for_option_valid: optionValid })
      if (vehicleCode) seen.add(vehicleCode)
    })

    setUsedForGrid(grid)
    setUsedForSaveError('')
    setShowUsedForModal(true)
  }

  const updateUsedForCell = (idx, field, value) => {
    setUsedForGrid(prev => {
      const copy = prev.map(r => ({ ...r }))
      if (!copy[idx]) return copy

      if (field === 'used_for') {
        const trimmed = value ? value.toString() : ''
        // If options exist and there are multiple options, ensure the value is one of them
        if (copy[idx].options && copy[idx].options.length > 1) {
          const allowed = copy[idx].options.indexOf(trimmed) !== -1
          // only set if allowed; otherwise ignore (prevent manual typing)
          if (!allowed) {
            // keep previous value unchanged
            return copy
          }
          copy[idx].used_for = trimmed
          copy[idx].used_for_source = 'user'
          copy[idx].used_for_valid = trimmed.length <= 100
          copy[idx].used_for_option_valid = true
          return copy
        }

        copy[idx].used_for = trimmed
        copy[idx].used_for_source = trimmed && trimmed.trim() ? 'user' : 'none'
        copy[idx].used_for_valid = trimmed.length <= 100
        copy[idx].used_for_option_valid = true
        return copy
      }

      if (field === 'vehicle_type') {
        copy[idx].vehicle_type = value
        const suggestion = getSuggestionForType(value)
        const options = getOptionsForType(value) || (suggestion ? [suggestion] : null)
        copy[idx].options = options
        // Only update used_for when it was previously a suggested value (not when user manually edited it)
        if (copy[idx].used_for_source !== 'user') {
          if (suggestion) {
            copy[idx].used_for = suggestion
            copy[idx].used_for_source = 'suggested'
            copy[idx].used_for_valid = suggestion.length <= 100
            copy[idx].used_for_option_valid = true
          } else if (options && options.length > 0) {
            const defaultVal = options[0]
            copy[idx].used_for = defaultVal
            copy[idx].used_for_source = 'suggested'
            copy[idx].used_for_valid = defaultVal.length <= 100
            copy[idx].used_for_option_valid = options.indexOf(defaultVal) !== -1
          } else {
            copy[idx].used_for = ''
            copy[idx].used_for_source = 'none'
            copy[idx].used_for_valid = true
            copy[idx].used_for_option_valid = true
          }
        }
        return copy
      }

      copy[idx][field] = value
      return copy
    })
  }

  const [usedForSaveError, setUsedForSaveError] = useState('')

  const saveUsedForGrid = () => {
    // validation: max 100 chars and option constraints
    for (let i = 0; i < usedForGrid.length; i++) {
      const r = usedForGrid[i]
      const val = (r?.used_for || '').toString().trim()
      if (val.length > 100) {
        setUsedForSaveError(`Row ${i + 1}: 'Used For' exceeds 100 characters.`)
        return
      }
      if (r?.options && r.options.length > 1) {
        // enforce selection from options
        if (!val || r.options.indexOf(val) === -1) {
          setUsedForSaveError(`Row ${i + 1}: 'Used For' must be one of the allowed options.`)
          return
        }
      }
    }

    setRows(prev => {
      const copy = [...prev]

      usedForGrid.forEach(g => {
        if (!g) return
        // normalize incoming keys
        const regNoCandidate = (g.reg_no || g.vehicle_code || '').toString().trim()
        const vehicleCodeCandidate = (g.vehicle_code || g.reg_no || '').toString().trim()
        const finalVehicleType = (g.vehicle_type || '').toString().trim()
        let finalUsedFor = (g.used_for || '').toString().trim()
        const suggestion = getSuggestionForType(finalVehicleType)
        if (!finalUsedFor && suggestion) finalUsedFor = suggestion

        const norm = (s) => (s || '').toString().trim().toLowerCase()
        const existingIdx = copy.findIndex(r =>
          norm(r.reg_no) === norm(regNoCandidate) ||
          norm(r.vehicle_code) === norm(regNoCandidate) ||
          norm(r.reg_no) === norm(vehicleCodeCandidate) ||
          norm(r.vehicle_code) === norm(vehicleCodeCandidate)
        )

        if (existingIdx >= 0) {
          // sanitize numeric-looking codes to avoid accidentally storing indices
          const looksLikeCode = (v) => v && (/[A-Za-z\-]/.test(v.toString()) || v.toString().length >= 3)
          const finalReg = looksLikeCode(regNoCandidate) ? regNoCandidate : (looksLikeCode(copy[existingIdx].reg_no) ? copy[existingIdx].reg_no : (looksLikeCode(vehicleCodeCandidate) ? vehicleCodeCandidate : copy[existingIdx].reg_no))
          const finalCode = looksLikeCode(vehicleCodeCandidate) ? vehicleCodeCandidate : (looksLikeCode(copy[existingIdx].vehicle_code) ? copy[existingIdx].vehicle_code : (looksLikeCode(regNoCandidate) ? regNoCandidate : copy[existingIdx].vehicle_code))

          copy[existingIdx] = {
            ...copy[existingIdx],
            reg_no: finalReg || copy[existingIdx].reg_no || '',
            vehicle_code: finalCode || copy[existingIdx].vehicle_code || '',
            vehicle_type: finalVehicleType || copy[existingIdx].vehicle_type || '',
            used_for: finalUsedFor || copy[existingIdx].used_for || ''
          }
        } else {
          // ensure both reg_no and vehicle_code fields are populated wherever possible (sanitized)
          const looksLikeCode = (v) => v && (/[A-Za-z\-]/.test(v.toString()) || v.toString().length >= 3)
          const finalRegNo = looksLikeCode(regNoCandidate) ? regNoCandidate : (looksLikeCode(vehicleCodeCandidate) ? vehicleCodeCandidate : '')
          const finalVehicleCode = looksLikeCode(vehicleCodeCandidate) ? vehicleCodeCandidate : (looksLikeCode(regNoCandidate) ? regNoCandidate : '')

          // If no meaningful code present, try to update an existing row that has the same vehicle type and empty codes
          if (!finalRegNo && !finalVehicleCode) {
            const candidateIdx = copy.findIndex(r => (r.vehicle_type || '').toString().trim().toLowerCase() === (finalVehicleType || '').toString().trim().toLowerCase() && !(r.reg_no || r.vehicle_code))
            if (candidateIdx >= 0) {
              copy[candidateIdx] = {
                ...copy[candidateIdx],
                vehicle_type: finalVehicleType || copy[candidateIdx].vehicle_type || '',
                used_for: finalUsedFor || copy[candidateIdx].used_for || ''
              }
            } else {
              // No code and no matching row by vehicle_type — skip creating a new row to avoid blank duplicates
              console.warn('Skipping Used For save for row without vehicle code:', g)
            }
            return
          }

          // If there's an existing row with the same vehicle_type but empty codes, update it instead of pushing
          const candidateIdxByType = copy.findIndex(r => (r.vehicle_type || '').toString().trim().toLowerCase() === (finalVehicleType || '').toString().trim().toLowerCase() && !(r.reg_no || r.vehicle_code))
          if (candidateIdxByType >= 0) {
            copy[candidateIdxByType] = {
              ...copy[candidateIdxByType],
              reg_no: finalRegNo || copy[candidateIdxByType].reg_no || '',
              vehicle_code: finalVehicleCode || copy[candidateIdxByType].vehicle_code || '',
              vehicle_type: finalVehicleType || copy[candidateIdxByType].vehicle_type || '',
              used_for: finalUsedFor || copy[candidateIdxByType].used_for || ''
            }
            return
          }

          // avoid pushing duplicates if a similar row already exists (case/whitespace-insensitive)
          const alreadyExists = copy.some(r => norm(r.reg_no) === norm(finalRegNo) || norm(r.vehicle_code) === norm(finalVehicleCode) || (finalRegNo && (norm(r.reg_no) === norm(finalRegNo) || norm(r.vehicle_code) === norm(finalRegNo))))
          if (!alreadyExists) {
            copy.push({
              sr: 0,
              reg_no: finalRegNo,
              vehicle_code: finalVehicleCode,
              vehicle_type: finalVehicleType,
              used_for: finalUsedFor,
              mileage: '',
              ignition_time: '',
              threshold: '',
              remarks: ''
            })
          }
        }
      })

      // After used_for is committed, merge any pending daily reporting mileage/IG (not applicable in fully auto, but kept for consistency)
      const merged = mergeTransferredData(copy)

      // Deduplicate and merge rows by reg_no / vehicle_code (case-insensitive). For rows without codes, try to reconcile by vehicle_type.
      const norm = (s) => (s || '').toString().trim().toLowerCase()
      const mergeRow = (a, b) => ({
        reg_no: a.reg_no || b.reg_no || '',
        vehicle_code: a.vehicle_code || b.vehicle_code || '',
        vehicle_type: a.vehicle_type || b.vehicle_type || '',
        used_for: a.used_for || b.used_for || '',
        mileage: a.mileage || b.mileage || '',
        ignition_time: a.ignition_time || b.ignition_time || '',
        threshold: a.threshold || b.threshold || '',
        remarks: a.remarks || b.remarks || ''
      })

      const map = new Map()
      const orphans = []

      merged.forEach(r => {
        const codeKey = norm(r.reg_no) || norm(r.vehicle_code)
        if (codeKey) {
          if (!map.has(codeKey)) map.set(codeKey, { ...r })
          else map.set(codeKey, mergeRow(map.get(codeKey), r))
          return
        }

        // no code: try to find a match by vehicle_type in map
        const vtype = norm(r.vehicle_type)
        let foundKey = null
        for (const [k, v] of map.entries()) {
          if (norm(v.vehicle_type) === vtype) { foundKey = k; break }
        }
        if (foundKey) {
          map.set(foundKey, mergeRow(map.get(foundKey), r))
          return
        }

        // try merge with orphan of same vehicle_type
        const idx = orphans.findIndex(o => norm(o.vehicle_type) === vtype)
        if (idx >= 0) {
          orphans[idx] = mergeRow(orphans[idx], r)
        } else {
          orphans.push({ ...r })
        }
      })

      const deduped = [...map.values(), ...orphans].map((r, i) => ({ ...r, sr: i + 1 }))
      return deduped
    })

    // Clear staging
    setHasProposedUsedFor(false)
    setProposedUsedForGrid([])

    setUsedForSaveError('')
    setShowUsedForModal(false)
    setActiveTab('all')
  }

  const openThresholdModal = async () => {
    setActiveTab('threshold')
    const grid = []
    const seenTypes = new Set()

    try {
      // Fetch active vehicles from database
      const { data: activeVehicles, error } = await supabase
        .from('vehicle_registrations')
        .select('type')
        .eq('status', 'Active')
        .order('type', { ascending: true })

      if (error) {
        console.warn('Error fetching active vehicles for threshold:', error)
      } else if (activeVehicles && activeVehicles.length > 0) {
        // Get unique vehicle types from active vehicles
        const uniqueTypes = [...new Set(activeVehicles.map(v => v.type).filter(Boolean))]
        uniqueTypes.forEach((vehicleType, idx) => {
          const tDefault = getThresholdForType(vehicleType)
          if (tDefault) {
            grid.push({ sr: idx + 1, vehicle_type: vehicleType, threshold: tDefault.value, threshold_unit: tDefault.unit, threshold_valid: true })
          } else {
            grid.push({ sr: idx + 1, vehicle_type: vehicleType, threshold: '', threshold_unit: '', threshold_valid: true })
          }
          seenTypes.add(vehicleType)
        })
      }
    } catch (err) {
      console.error('Error opening threshold modal:', err)
    }

    // Then include existing rows not in proposals
    ; (rows || []).forEach((r, i) => {
      if (seenTypes.has((r.vehicle_type || '').toString())) return
      const vehicleType = (r.vehicle_type || '').toString()
      const tDefault = getThresholdForType(vehicleType)
      if (r.threshold !== undefined && r.threshold !== null && r.threshold !== '') {
        grid.push({ sr: grid.length + 1, vehicle_type: vehicleType, threshold: r.threshold, threshold_unit: (tDefault && tDefault.unit) || '', threshold_valid: true })
        seenTypes.add(vehicleType)
        return
      }
      if (tDefault) {
        grid.push({ sr: grid.length + 1, vehicle_type: vehicleType, threshold: tDefault.value, threshold_unit: tDefault.unit, threshold_valid: true })
        seenTypes.add(vehicleType)
        return
      }
      grid.push({ sr: grid.length + 1, vehicle_type: vehicleType, threshold: '', threshold_unit: '', threshold_valid: true })
      seenTypes.add(vehicleType)
    })

    setThresholdGrid(grid)
    setThresholdSaveError('')
    setShowThresholdModal(true)
  }

  const updateThresholdCell = (idx, field, value) => {
    setThresholdGrid(prev => {
      const copy = prev.map(r => ({ ...r }))
      if (!copy[idx]) return copy

      if (field === 'threshold') {
        const trimmed = value === undefined || value === null ? '' : value.toString().trim()
        // allow empty value
        if (trimmed === '') {
          copy[idx].threshold = ''
          copy[idx].threshold_valid = true
          return copy
        }
        // numeric validation: only numbers allowed
        const num = Number(trimmed)
        if (Number.isFinite(num) && num >= 0) {
          copy[idx].threshold = trimmed
          copy[idx].threshold_valid = true
        } else {
          copy[idx].threshold_valid = false
        }
        return copy
      }

      if (field === 'vehicle_type') {
        copy[idx].vehicle_type = value
        const tDefault = getThresholdForType(value)
        if (!copy[idx].threshold || copy[idx].threshold === '') {
          if (tDefault) {
            copy[idx].threshold = tDefault.value
            copy[idx].threshold_unit = tDefault.unit || ''
            copy[idx].threshold_valid = true
          } else {
            copy[idx].threshold = ''
            copy[idx].threshold_unit = ''
            copy[idx].threshold_valid = true
          }
        } else {
          // keep user-entered threshold but update unit if default has a unit
          if (tDefault && tDefault.unit) copy[idx].threshold_unit = tDefault.unit
        }
        return copy
      }

      copy[idx][field] = value
      return copy
    })
  }

  const [thresholdSaveError, setThresholdSaveError] = useState('')

  const saveThresholdGrid = () => {
    // validate thresholds
    for (let i = 0; i < thresholdGrid.length; i++) {
      const g = thresholdGrid[i]
      const val = (g?.threshold || '').toString().trim()
      if (val === '') continue // empty allowed
      const num = Number(val)
      if (!Number.isFinite(num) || num < 0) {
        setThresholdSaveError(`Row ${i + 1}: Threshold must be a non-negative number.`)
        return
      }
      // if this type has a unit 'hrs', it's still numeric but we might warn if >24?
      if (g?.threshold_unit === 'hrs' && num <= 0) {
        setThresholdSaveError(`Row ${i + 1}: Threshold (hours) must be greater than 0.`)
        return
      }
    }

    setRows(prev => {
      const copy = prev.map((r, i) => {
        const g = thresholdGrid[i]
        if (!g) return r
        // store numeric string or empty
        return { ...r, vehicle_type: g.vehicle_type, threshold: g.threshold }
      })
      return copy.map((r, i) => ({ ...r, sr: i + 1 }))
    })
    setThresholdSaveError('')
    setShowThresholdModal(false)
    setActiveTab('all')
  }

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  // Load saved data from localStorage on mount (persist across refreshes),
  // otherwise load today's data from the server. Also check for any transfers.
  useEffect(() => {
    const saved = localStorage.getItem('mileageReportData')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setRows(parsed.map((r, i) => ({ ...r, sr: i + 1 })))
          console.log('✅ Loaded mileageReportData from localStorage')
        } else {
          // fallback to server load
          loadMileageData()
        }
      } catch (e) {
        console.warn('Failed to parse mileageReportData, loading from server', e)
        loadMileageData()
      }
    } else {
      loadMileageData()
    }

    checkForTransfer()
  }, [])

  // Listen for direct transfers and automatically apply them
  useEffect(() => {
    const handler = (e) => {
      try {
        const data = e?.detail || null
        if (!data) return
        const items = Array.isArray(data) ? data : [data]
        const dailyReporting = items.filter(i => i.source === 'daily_reporting' || (i.source === undefined && i.mileage !== undefined))
        const vehicleRecords = items.filter(i => i.source === 'vehicle_records' || i.source === undefined)

        if (dailyReporting.length > 0 || vehicleRecords.length > 0) {
          setRows(prev => mergeTransferredData(prev, dailyReporting, vehicleRecords))
          // Automatically clear the transfer buffer once processed
          localStorage.removeItem('mileageReportTransfer')
        }
      } catch (err) {
        console.warn('mileageTransfer handler error', err)
      }
    }

    window.addEventListener('mileageTransfer', handler)
    return () => window.removeEventListener('mileageTransfer', handler)
  }, [])

  // Save rows to localStorage for debugging/inspection
  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem('mileageReportData', JSON.stringify(rows))
      console.log('✅ Mileage Report data saved to localStorage:', rows)
    }
  }, [rows])

  // Watch activeTab and auto-open modals when tab changes
  useEffect(() => {
    if (activeTab === 'used_for') {
      if (!rows || rows.length === 0) {
        loadMileageData().then(() => openUsedForModal())
      } else {
        openUsedForModal()
      }
      return
    }
    if (activeTab === 'threshold') {
      if (!rows || rows.length === 0) {
        loadMileageData().then(() => openThresholdModal())
      } else {
        openThresholdModal()
      }
      return
    }
    // close any modals when tab is not one of the specialized tabs
    setShowUsedForModal(false)
    setShowThresholdModal(false)
  }, [activeTab])

  const checkForTransfer = () => {
    const transferData = localStorage.getItem('mileageReportTransfer')
    if (transferData) {
      try {
        const parsed = JSON.parse(transferData)
        const items = Array.isArray(parsed) ? parsed : [parsed]

        const daily = items.filter(i => i.source === 'daily_reporting' || !i.source)
        const vehicles = items.filter(i => i.source === 'vehicle_records')

        if (daily.length > 0 || vehicles.length > 0) {
          setRows(prev => mergeTransferredData(prev, daily, vehicles))
          localStorage.removeItem('mileageReportTransfer')
        }
      } catch (e) {
        console.error('Error parsing transfer data:', e)
      }
    }
  }

  const loadMileageData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('fleet_mileage_reports')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: true })

      if (error) throw error

      let loadedRows = (data || []).map((r, idx) => ({
        sr: idx + 1,
        reg_no: r.reg_no || '',
        vehicle_type: r.vehicle_type || '',
        used_for: r.used_for || '',
        mileage: r.mileage ? String(r.mileage) : '',
        ignition_time: r.ignition_time ? formatToHMS(r.ignition_time) : '00:00:00',
        threshold: r.threshold ? String(r.threshold) : '',
        remarks: r.remarks || ''
      }))

      // Enrich rows with vehicle metadata from vehicle_registrations when missing
      try {
        const regNosToFetch = [...new Set(loadedRows.filter(r => (!r.vehicle_type || !r.used_for) && r.reg_no).map(r => r.reg_no))]
        if (regNosToFetch.length > 0) {
          const { data: meta, error: metaErr } = await supabase
            .from('vehicle_registrations')
            .select('reg_no, type, used_for')
            .in('reg_no', regNosToFetch)

          if (!metaErr && meta && meta.length) {
            const map = {}
            meta.forEach(m => { map[m.reg_no] = m })
            loadedRows = loadedRows.map(r => {
              const m = map[r.reg_no]
              if (!m) return r
              return {
                ...r,
                vehicle_type: r.vehicle_type || (m.type || ''),
                used_for: r.used_for || (m.used_for || '')
              }
            })
          }
        }
      } catch (e) {
        console.warn('Failed to enrich mileage rows with vehicle metadata', e)
      }
      setRows(loadedRows)
      setSaveResult(null)
    } catch (err) {
      console.error('Load mileage data error', err)
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
      reg_no: 'VEHICLE CODE',
      vehicle_type: 'VEHICLE TYPE',
      used_for: 'USED FOR',
      mileage: 'MILEAGE',
      ignition_time: 'IG TIME',
      threshold: 'THRESHOLD',
      remarks: 'REMARKS'
    }
    return labels[key] || key.toUpperCase()
  }


  const pushAttendanceData = async () => {
    if (rows.length === 0) {
      setAttendancePushResult({
        success: false,
        message: 'No mileage data to push',
        details: 'Please load or enter mileage data first'
      })
      return
    }

    try {
      setPushingAttendance(true)
      setAttendancePushResult(null)

      // Get unique vehicle registration numbers from the mileage data
      const vehicleRegNos = [...new Set(rows.map(r => r.reg_no).filter(Boolean))]

      if (vehicleRegNos.length === 0) {
        setAttendancePushResult({
          success: false,
          message: 'No vehicle codes found',
          details: 'Mileage data must contain vehicle codes (reg_no)'
        })
        return
      }

      // Fetch vehicle IDs from vehicle_registrations table
      // Search across multiple fields: reg_no, reg_id, vehicle_code for flexible matching
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicle_registrations')
        .select('id, reg_no, reg_id, vehicle_code, type')
        .or(vehicleRegNos.map(code => `reg_no.eq.${code},reg_id.eq.${code},vehicle_code.eq.${code}`).join(','))

      if (vehicleError) {
        console.error('Vehicle fetch error:', vehicleError)
        throw vehicleError
      }

      if (!vehicles || vehicles.length === 0) {
        setAttendancePushResult({
          success: false,
          message: 'No matching vehicles found',
          details: `Searched for: ${vehicleRegNos.join(', ')}. Please ensure these vehicles are registered in Vehicle Registration.`
        })
        return
      }

      // Create attendance records for today
      const attendanceRecords = vehicles.map(vehicle => {
        // Find the corresponding row in the mileage data
        const sourceRow = rows.find(r => {
          const normRow = (r.reg_no || '').toString().trim().toLowerCase();
          return normRow === (vehicle.reg_no || '').toLowerCase() ||
            normRow === (vehicle.reg_id || '').toLowerCase() ||
            normRow === (vehicle.vehicle_code || '').toLowerCase();
        });

        return {
          vehicle_id: vehicle.id,
          attendance_date: today,
          status: 'Present',
          mileage: sourceRow?.mileage ? parseFloat(sourceRow.mileage) : null,
          ignition_time: sourceRow?.ignition_time ? hmsToDecimal(sourceRow.ignition_time) : null,
          updated_at: new Date().toISOString()
        }
      })

      // Upsert attendance records (insert or update if already exists for this date)
      const { error: attendanceError } = await supabase
        .from('vehicle_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'vehicle_id,attendance_date'
        })

      if (attendanceError) throw attendanceError

      // Show which vehicles were matched
      const matchedCodes = vehicles.map(v => v.reg_id || v.reg_no || v.vehicle_code).filter(Boolean)

      setAttendancePushResult({
        success: true,
        message: 'Attendance pushed successfully!',
        details: `${vehicles.length} vehicle(s) marked as present for ${today}: ${matchedCodes.join(', ')}`
      })

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => {
        setAttendancePushResult(null)
      }, 5000)

    } catch (err) {
      console.error('Error pushing attendance:', err)
      setAttendancePushResult({
        success: false,
        message: 'Failed to push attendance',
        details: err.message || 'An unexpected error occurred'
      })
    } finally {
      setPushingAttendance(false)
    }
  }

  // Clear the main table and all transfer-related persisted data (testing mode)
  const clearTable = () => {
    // Clear table rows
    setRows([])
    // Remove persisted table and transfer buffers
    localStorage.removeItem('mileageReportData')
    localStorage.removeItem('mileageReportTransfer')

    // Reset UI and flags
    setSaveResult(null)
  }

  const downloadTemplate = () => {
    const headerRow = ['SR', 'Vehicle Code', 'Vehicle Type', 'Used For', 'Mileage', 'IG Time', 'Threshold', 'Remarks']
    const ws = XLSX.utils.aoa_to_sheet([headerRow])
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `fleet-mileage-report-template.xlsx`)
  }

  const normalizeJsonRows = (json) => {
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
    const vehicleTypeIdx = findColumnIndex(['vehicle type', 'type'])
    const usedForIdx = findColumnIndex(['used for', 'purpose', 'usage'])
    const mileageIdx = findColumnIndex(['mileage', 'distance', 'km'])
    const igTimeIdx = findColumnIndex(['ig time', 'ignition time', 'ignition'])
    const thresholdIdx = findColumnIndex(['threshold', 'limit'])
    const remarksIdx = findColumnIndex(['remarks', 'notes', 'comment'])

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
      vehicle_type: vehicleTypeIdx >= 0 ? getValueByIndex(r, vehicleTypeIdx) : (r.vehicle_type || r['Vehicle Type'] || ''),
      used_for: usedForIdx >= 0 ? getValueByIndex(r, usedForIdx) : (r.used_for || r['Used For'] || ''),
      mileage: mileageIdx >= 0 ? getValueByIndex(r, mileageIdx) : (r.mileage || r.Mileage || ''),
      ignition_time: igTimeIdx >= 0 ? getValueByIndex(r, igTimeIdx, true) : (r.ignition_time || r['IG Time'] || ''),
      threshold: thresholdIdx >= 0 ? getValueByIndex(r, thresholdIdx) : (r.threshold || r.Threshold || ''),
      remarks: remarksIdx >= 0 ? getValueByIndex(r, remarksIdx) : (r.remarks || r.Remarks || '')
    }))
  }

  const processFile = async (file) => {
    if (!file) return
    setSelectedFileName(file.name)
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const first = wb.SheetNames[0]
    const sheet = wb.Sheets[first]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    const normalized = normalizeJsonRows(json)
    setPreviewRows(normalized.slice(0, 6))
    setRows(normalized)
  }

  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    await processFile(f)
  }

  const handleDropFile = async (file) => {
    if (!file) return
    setSelectedFileName(file.name)
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const first = wb.SheetNames[0]
    const sheet = wb.Sheets[first]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    const normalized = normalizeJsonRows(json)
    setPreviewRows(normalized.slice(0, 6))
    setRows(normalized)
  }

  const initPasteGrid = (rowsCount = 5) => {
    const grid = Array.from({ length: rowsCount }, () => Array(mileageHeaders.length).fill(''))
    setPasteGrid(grid)
    setPasteStart({ r: 0, c: 0 })
  }

  const handleGridCellChange = (ri, ci, value) => {
    setPasteGrid(prev => {
      const g = prev.map(r => [...r])
      while (g.length <= ri) g.push(Array(mileageHeaders.length).fill(''))
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
        if (!g[rowIdx]) g[rowIdx] = Array(mileageHeaders.length).fill('')
        for (let c = 0; c < lines[r].length; c++) {
          const colIdx = startC + c
          if (colIdx < mileageHeaders.length) g[rowIdx][colIdx] = lines[r][c]
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
        vehicle_type: row[2] || '',
        used_for: row[3] || '',
        mileage: row[4] || '',
        ignition_time: row[5] || '',
        threshold: row[6] || '',
        remarks: row[7] || ''
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

  const saveMileageData = async () => {
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
          vehicle_type: (row.vehicle_type || '').trim() || null,
          used_for: (row.used_for || '').trim() || null,
          mileage: row.mileage ? parseFloat(row.mileage) : null,
          ignition_time: row.ignition_time ? hmsToDecimal(row.ignition_time) : null,
          threshold: row.threshold ? parseFloat(row.threshold) : null,
          remarks: (row.remarks || '').trim() || null
        }

        const { error } = await supabase
          .from('fleet_mileage_reports')
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
      console.error('Save mileage data error', err)
      setSaveResult({ success: 0, failed: rows.length, message: 'Unexpected error' })
    } finally {
      setSaving(false)
    }
  }

  const exportData = () => {
    const ws = XLSX.utils.json_to_sheet(rows, { header: mileageHeaders })
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `fleet-mileage-report-${today}.xlsx`)
  }

  return (
    <>
      <div className="p-4">

        {/* Attendance Push Result Notification */}
        {attendancePushResult && (
          <div className={`mb-4 p-4 rounded-2xl border backdrop-blur-xl shadow-lg ${attendancePushResult.success
            ? 'bg-emerald-50/80 border-emerald-200'
            : 'bg-red-50/80 border-red-200'
            }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${attendancePushResult.success
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-red-100 text-red-600'
                  }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {attendancePushResult.success ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${attendancePushResult.success ? 'text-emerald-800' : 'text-red-800'
                    }`}>
                    {attendancePushResult.message}
                  </p>
                  {attendancePushResult.details && (
                    <p className="text-xs text-slate-600 mt-1">{attendancePushResult.details}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setAttendancePushResult(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6 bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-sm transition-all">

          {/* Left Side: Context/Date (Exact match to DailyReporting style) */}
          <div className="text-sm font-semibold text-slate-700 bg-white/60 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-100 flex items-center gap-2 self-end">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {today}
          </div>

          {/* Right Side: Operational Stack */}
          <div className="flex flex-col items-end gap-3">

            {/* Top Row: View Mode Toggles (Separated and Renamed) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(activeTab === 'used_for' ? 'all' : 'used_for')}
                className={`h-9 px-5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${activeTab === 'used_for'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md border-transparent scale-105'
                  : 'bg-white/80 text-slate-600 border-white/10 hover:bg-white hover:text-blue-600 shadow-sm'}`}
              >
                <span>Used For</span>
                {hasProposedUsedFor && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ring-2 ring-white/20"></span>}
              </button>

              <button
                onClick={() => setActiveTab(activeTab === 'threshold' ? 'all' : 'threshold')}
                className={`h-9 px-5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${activeTab === 'threshold'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md border-transparent scale-105'
                  : 'bg-white/80 text-slate-600 border-white/10 hover:bg-white hover:text-amber-600 shadow-sm'}`}
              >
                Threshold
              </button>
            </div>

            {/* Bottom Row: Primary Actions (Standardized Heights) */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { setUploadMode('choose'); setShowUploadModal(true) }}
                className="h-10 px-4 py-2 rounded-xl bg-white/80 text-slate-700 hover:bg-white border border-white/60 shadow-sm text-sm font-medium transition-all backdrop-blur-sm"
              >
                Upload Report
              </button>

              <button
                onClick={exportData}
                className="h-10 px-4 py-2 rounded-xl bg-white/80 text-slate-700 hover:bg-white border border-white/60 shadow-sm text-sm font-medium transition-all backdrop-blur-sm"
              >
                Export
              </button>

              <button
                onClick={clearTable}
                className="h-10 px-4 py-2 rounded-xl bg-rose-50/80 text-rose-600 hover:bg-rose-100 border border-rose-100 text-sm font-medium transition-all backdrop-blur-sm"
              >
                Clear
              </button>

              <div className="w-px h-6 bg-slate-200/50 mx-1"></div>

              {/* Attendance Push - Icon Button (Matched to HR Report style) */}
              <div className="relative group/push">
                {pushingAttendance && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 z-10">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                  </span>
                )}
                <button
                  onClick={pushAttendanceData}
                  disabled={pushingAttendance || rows.length === 0}
                  title="Push Attendance Data"
                  className={`p-2.5 rounded-full shadow-lg transition-all duration-300 relative overflow-hidden group/btn ${pushingAttendance
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-110 active:scale-95 border border-white/20'
                    }`}
                >
                  <div className={`transition-transform duration-700 ${pushingAttendance ? 'animate-spin' : 'group-hover/btn:rotate-180'}`}>
                    {pushingAttendance ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    )}
                  </div>
                </button>
              </div>

              <button
                onClick={saveMileageData}
                disabled={saving}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 text-sm font-medium transition-all disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>


        {/* Search bar (Styled to match DailyReporting) */}
        <div className="mb-6 max-w-md">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicles..."
              className="pl-9 pr-4 py-2 rounded-xl bg-white/50 border border-white/60 text-sm w-full text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm backdrop-blur-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
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
                    {uploadMode === 'choose' && 'Import Mileage Data'}
                    {uploadMode === 'file' && 'Upload Spreadsheet'}
                    {uploadMode === 'paste' && 'Paste Data Grid'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">Add vehicle mileage reports seamlessly</p>
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

                    {previewRows && previewRows.length > 0 && (
                      <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                        <div className="text-sm font-semibold mb-3 text-slate-700">Preview (first {previewRows.length} rows)</div>
                        <div className="overflow-auto max-h-36 custom-scrollbar">
                          <table className="min-w-full text-xs">
                            <thead className="text-left text-slate-500 bg-slate-50 border-b border-slate-100">
                              <tr>
                                {mileageHeaders.map((h) => (
                                  <th key={h} className="px-3 py-2 font-medium">{getHeaderLabel(h)}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {previewRows.map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  {mileageHeaders.map((h) => (
                                    <td key={h} className="px-3 py-2 text-slate-600">{r[h] || ''}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
                              {mileageHeaders.map((h, ci) => (
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

        {/* Mileage Table */}
        <div className="overflow-x-auto border border-white/60 rounded-2xl shadow-lg shadow-indigo-100/10 bg-white/40 backdrop-blur-xl">
          {loading ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading mileage data...</span>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100/50 text-sm">
              <thead className="bg-gray-50/50 backdrop-blur-sm">
                <tr>
                  {mileageHeaders.map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{getHeaderLabel(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-gray-100/50">
                {(() => {
                  const q = (searchQuery || '').toLowerCase().trim()
                  const filteredRows = q ? rows.filter(r => (r.reg_no || '').toLowerCase().includes(q) || (r.vehicle_type || '').toLowerCase().includes(q)) : rows

                  if (filteredRows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={mileageHeaders.length} className="p-8 text-slate-500 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span>No mileage data available. Upload a report or add entries manually.</span>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return filteredRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-white/40 transition-colors">
                      <td className="px-3 py-2"><input value={r.sr || ''} readOnly className="w-full p-1.5 text-xs bg-transparent border-0 text-slate-500" /></td>
                      <td className="px-3 py-2"><input value={r.reg_no || ''} onChange={(e) => updateRowField(idx, 'reg_no', e.target.value)} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all font-mono font-medium text-slate-700" /></td>
                      <td className="px-3 py-2"><input value={r.vehicle_type || ''} onChange={(e) => updateRowField(idx, 'vehicle_type', e.target.value)} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400" /></td>
                      <td className="px-3 py-2"><input value={r.used_for || ''} onChange={(e) => updateRowField(idx, 'used_for', e.target.value)} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400" /></td>
                      <td className="px-3 py-2"><input value={r.mileage || ''} onChange={(e) => updateRowField(idx, 'mileage', e.target.value)} type="number" step="0.01" className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400 font-mono" /></td>
                      <td className="px-3 py-2"><input value={r.ignition_time || ''} onChange={(e) => updateRowField(idx, 'ignition_time', e.target.value)} type="text" placeholder="00:00:00" className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400 font-mono" /></td>
                      <td className="px-3 py-2"><input value={r.threshold || ''} onChange={(e) => updateRowField(idx, 'threshold', e.target.value)} type="number" step="0.01" className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400 font-mono" /></td>
                      <td className="px-3 py-2"><input value={r.remarks || ''} onChange={(e) => updateRowField(idx, 'remarks', e.target.value)} className="w-full p-1.5 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400" /></td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Used For Modal - Top Level */}
      {showUsedForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-500/20 border border-white/50 overflow-hidden transform transition-all scale-100 opacity-100 flex flex-col max-h-[85vh]">

            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Used For Specification</h3>
                <p className="text-sm text-slate-500 mt-0.5">Define usage purposes for active vehicles</p>
              </div>
              <button
                onClick={() => { setShowUsedForModal(false); setActiveTab('all') }}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Error Message */}
            {usedForSaveError && (
              <div className="px-8 pt-4 pb-0">
                <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-center text-sm">
                  <svg className="w-5 h-5 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {usedForSaveError}
                </div>
              </div>
            )}

            {/* Modal Content - Scrollable Grid */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center border-r border-slate-200">SR</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-left border-r border-slate-200">Vehicle Code</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-left border-r border-slate-200">Type</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-left">Used For</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {usedForGrid.map((r, idx) => (
                      <tr key={idx} className="group hover:bg-indigo-50/10 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-slate-400 text-center border-r border-slate-100 bg-slate-50/50">{r.sr || idx + 1}</td>
                        <td className="px-4 py-3 border-r border-slate-100">
                          <input
                            value={r.vehicle_code}
                            onChange={(e) => updateUsedForCell(idx, 'vehicle_code', e.target.value)}
                            className="w-full bg-transparent border-none text-sm font-mono text-slate-700 focus:ring-0 p-0"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100">
                          <input
                            value={r.vehicle_type}
                            onChange={(e) => updateUsedForCell(idx, 'vehicle_type', e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-slate-600 focus:ring-0 p-0"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-4 py-3 relative">
                          <div className="relative">
                            {r.options && r.options.length > 1 ? (
                              <div className="relative">
                                <select
                                  value={r.used_for || ''}
                                  onChange={(e) => updateUsedForCell(idx, 'used_for', e.target.value)}
                                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition-shadow"
                                >
                                  <option value="">-- Select Purpose --</option>
                                  {r.options.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                                {r.used_for_option_valid === false && (
                                  <p className="text-xs text-rose-500 mt-1 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Invalid selection
                                  </p>
                                )}
                              </div>
                            ) : (
                              <>
                                <input
                                  list={r.options && r.options.length ? `usedfor-list-${idx}` : undefined}
                                  value={r.used_for || ''}
                                  onChange={(e) => updateUsedForCell(idx, 'used_for', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-slate-400"
                                  placeholder="Enter purpose..."
                                />

                                {r.options && r.options.length > 0 && (
                                  <datalist id={`usedfor-list-${idx}`}>
                                    {r.options.map((opt) => (
                                      <option key={opt} value={opt} />
                                    ))}
                                  </datalist>
                                )}

                                { /* Validation / Info messages */}
                                <div className="mt-1 space-y-0.5">
                                  {r.used_for_source === 'suggested' && (
                                    <p className="text-[10px] text-blue-600 font-medium flex items-center">
                                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      Suggested for {r.vehicle_type}
                                    </p>
                                  )}

                                  {r.used_for_source === 'user' && r.options && r.options.length > 0 && r.options.indexOf((r.used_for || '').toString()) === -1 && (
                                    <p className="text-[10px] text-amber-600 font-medium flex items-center">
                                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                      Custom value
                                    </p>
                                  )}

                                  {r.used_for_valid === false && (
                                    <p className="text-[10px] text-rose-600 font-medium">Max 100 characters</p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setShowUsedForModal(false); setActiveTab('all') }}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-semibold shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveUsedForGrid}
                className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm font-bold"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Threshold Modal - Top Level */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-500/20 border border-white/50 overflow-hidden transform transition-all scale-100 opacity-100 flex flex-col max-h-[85vh]">

            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Threshold Configuration</h3>
                <p className="text-sm text-slate-500 mt-0.5">Set operational limits for vehicle types</p>
              </div>
              <button
                onClick={() => { setShowThresholdModal(false); setActiveTab('all') }}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center border-r border-slate-200">SR</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-left border-r border-slate-200">Type of Vehicle</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-left">Threshold (hrs)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {thresholdGrid.map((r, idx) => (
                      <tr key={idx} className="group hover:bg-indigo-50/10 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-slate-400 text-center border-r border-slate-100 bg-slate-50/50">{r.sr || idx + 1}</td>
                        <td className="px-4 py-3 border-r border-slate-100">
                          <input
                            value={r.vehicle_type}
                            onChange={(e) => updateThresholdCell(idx, 'vehicle_type', e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-slate-700 focus:ring-0 p-0"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <input
                              value={r.threshold}
                              onChange={(e) => updateThresholdCell(idx, 'threshold', e.target.value)}
                              type="number"
                              step="any"
                              min="0"
                              className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                              placeholder="0.00"
                            />
                            {r.threshold_unit === 'hrs' && (
                              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">hrs</span>
                            )}
                          </div>
                          {!r.threshold_valid && (
                            <p className="text-xs text-rose-500 mt-1 flex items-center font-medium">
                              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Must be a positive number
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setShowThresholdModal(false); setActiveTab('all') }}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-semibold shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveThresholdGrid}
                className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm font-bold"
              >
                Save Limits
              </button>
            </div>

          </div>
        </div>
      )}

    </>
  )
}
