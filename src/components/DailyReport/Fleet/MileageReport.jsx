import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { supabase } from '../../../supabaseClient'

const mileageHeaders = ['sr', 'reg_no', 'vehicle_type', 'used_for', 'mileage', 'ignition_time', 'threshold', 'remarks']

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
  const [pendingTransfer, setPendingTransfer] = useState(null)
  const [pendingVehicleRecords, setPendingVehicleRecords] = useState([])
  const [transferApplied, setTransferApplied] = useState(false)
  const [showTransferReview, setShowTransferReview] = useState(false)
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

  // Merge pending transfers (daily reporting mileage / ignition time) into provided rows array.
  // This function only applies mileage/ignition data (from pendingTransfer) and vehicle_type when present
  const mergePendingToRows = (baseRows) => {
    const copy = [...baseRows]
    const updates = {}

    const isLikelyCode = (v) => {
      if (!v) return false
      const s = v.toString().trim()
      // treat as code if contains letters or hyphens (e.g., HND-DT-004) or at least 3 chars
      return /[A-Za-z\-]/.test(s) || s.length >= 3
    }

    if (pendingTransfer && pendingTransfer.length > 0) {
      pendingTransfer.forEach(item => {
        const key = (item.vehicle_code || item.reg_no || '').toString()
        if (!key) return
        updates[key] = updates[key] || { reg_no: key }
        if (item.mileage !== undefined) updates[key].mileage = item.mileage || ''
        if (item.ignition_time !== undefined) updates[key].ignition_time = item.ignition_time || ''
      })
    }

    if (pendingVehicleRecords && pendingVehicleRecords.length > 0) {
      pendingVehicleRecords.forEach(item => {
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

  const openUsedForModal = () => {
    setActiveTab('used_for')
    const grid = []
    const seen = new Set()

    // Priority 1: use staged proposals from transfer
    if (hasProposedUsedFor && proposedUsedForGrid && proposedUsedForGrid.length > 0) {
      proposedUsedForGrid.forEach((p, idx) => {
        const vehicleType = (p.vehicle_type || '').toString()
        const suggestion = getSuggestionForType(vehicleType)
        const options = p.options || getOptionsForType(vehicleType) || (suggestion ? [suggestion] : null)
        const val = (p.used_for || '').toString().trim()
        const valid = val.length <= 100
        const optionValid = options && options.length > 0 ? options.indexOf(val) !== -1 : true
        const vehicleCode = p.vehicle_code || p.reg_no || ''
        grid.push({ sr: p.sr || idx + 1, reg_no: p.reg_no || vehicleCode, vehicle_code: vehicleCode, vehicle_type: vehicleType, used_for: val, used_for_source: 'proposed', options, used_for_valid: valid, used_for_option_valid: optionValid })
        if (vehicleCode) seen.add(vehicleCode)
      })
    }

    // Then include existing rows that were not in proposals
    ;(rows || []).forEach((r, i) => {
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
      grid.push({ sr: r.sr || i + 1, reg_no: r.reg_no || vehicleCode, vehicle_code: vehicleCode, vehicle_type: vehicleType, used_for: displayVal, used_for_source: source, options, used_for_valid: valid, used_for_option_valid: optionValid })
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

      // After used_for is committed, merge pending daily reporting mileage/IG and any vehicle type hints
      const merged = mergePendingToRows(copy)

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

    // Clear staging (keep transfer in localStorage for testing; explicit discard will clear it)
    setHasProposedUsedFor(false)
    setProposedUsedForGrid([])
    setPendingTransfer(null)
    setPendingVehicleRecords([])
    setTransferApplied(true)

    setUsedForSaveError('')
    setShowUsedForModal(false)
    setActiveTab('all')
  }

  const openThresholdModal = () => {
    setActiveTab('threshold')
    const grid = []

    // If we have proposed thresholds (from vehicle records), show them as priority
    if (hasProposedThreshold && proposedThresholdGrid && proposedThresholdGrid.length > 0) {
      proposedThresholdGrid.forEach((p, idx) => {
        grid.push({ sr: p.sr || idx + 1, vehicle_type: p.vehicle_type || '', threshold: p.threshold || '', threshold_unit: p.unit || '', threshold_valid: true, is_proposed: true })
      })
    }

    // Then include existing rows not in proposals
    const seenTypes = new Set(grid.map(g => g.vehicle_type))
    ;(rows || []).forEach((r, i) => {
      if (seenTypes.has((r.vehicle_type || '').toString())) return
      const vehicleType = (r.vehicle_type || '').toString()
      const tDefault = getThresholdForType(vehicleType)
      if (r.threshold !== undefined && r.threshold !== null && r.threshold !== '') {
        grid.push({ sr: r.sr || i + 1, vehicle_type: vehicleType, threshold: r.threshold, threshold_unit: (tDefault && tDefault.unit) || '', threshold_valid: true })
        return
      }
      if (tDefault) {
        grid.push({ sr: r.sr || i + 1, vehicle_type: vehicleType, threshold: tDefault.value, threshold_unit: tDefault.unit, threshold_valid: true })
        return
      }
      grid.push({ sr: r.sr || i + 1, vehicle_type: vehicleType, threshold: '', threshold_unit: '', threshold_valid: true })
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

  // Listen for direct transfers and stage both Used For and Threshold proposals
  useEffect(() => {
    const handler = (e) => {
      try {
        const data = e?.detail || null
        if (!data) return
        const items = Array.isArray(data) ? data : [data]
        const dailyReporting = items.filter(i => i.source === 'daily_reporting' || (i.source === undefined && i.mileage !== undefined))
        const vehicleRecords = items.filter(i => i.source === 'vehicle_records' || i.source === undefined)

        // Stage pending daily reporting mileage/IG immediately (do not auto-apply)
        if (dailyReporting && dailyReporting.length > 0) {
          setPendingTransfer(dailyReporting)
        }

        if (vehicleRecords && vehicleRecords.length > 0) {
          const stagedUsedFor = stageProposedUsedFor(vehicleRecords)
          if (stagedUsedFor && stagedUsedFor.length > 0) {
            setProposedUsedForGrid(stagedUsedFor)
            setHasProposedUsedFor(true)
            setPendingVehicleRecords(vehicleRecords)
          }
          const stagedThresholds = stageProposedThresholds(vehicleRecords)
          if (stagedThresholds && stagedThresholds.length > 0) {
            setProposedThresholdGrid(stagedThresholds)
            setHasProposedThreshold(true)
          }
        }

        // Badge-only staging. User opens Used For manually to accept proposals.
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
    if (transferData && !transferApplied) {
      try {
        const parsed = JSON.parse(transferData)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        
        // Separate transfers by source
        const dailyReporting = items.filter(i => i.source === 'daily_reporting' || !i.source)
        const vehicleRecords = items.filter(i => i.source === 'vehicle_records')
        
        // Set pending data for review
        if (dailyReporting.length > 0) {
          setPendingTransfer(dailyReporting)
        }
        if (vehicleRecords.length > 0) {
          setPendingVehicleRecords(vehicleRecords)
          const staged = stageProposedUsedFor(vehicleRecords)
          if (staged && staged.length > 0) {
            setProposedUsedForGrid(staged)
            setHasProposedUsedFor(true)
          }
        }
        
        // Badge-only staging: users should open the Used For tab to process staged transfers.
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
        ignition_time: r.ignition_time ? String(r.ignition_time) : '',
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

  const applyTransferData = () => {
    // For backward compatibility keep an action that merges pending daily reporting into rows
    if ((!pendingTransfer || pendingTransfer.length === 0) && (!pendingVehicleRecords || pendingVehicleRecords.length === 0)) return
    setRows(prev => mergePendingToRows(prev))
    // keep mileageReportTransfer in localStorage for testing (explicit discard clears it)
    setPendingTransfer(null)
    setPendingVehicleRecords([])
    setTransferApplied(true)
  }

  const discardTransferData = () => {
    localStorage.removeItem('mileageReportTransfer')
    setPendingTransfer(null)
    setPendingVehicleRecords([])
    setHasProposedUsedFor(false)
    setProposedUsedForGrid([])
    setTransferApplied(true)
  }

  // Clear the main table and all transfer-related persisted data (testing mode)
  const clearTable = () => {
    // Clear table rows
    setRows([])
    // Remove persisted table and transfer buffers
    localStorage.removeItem('mileageReportData')
    localStorage.removeItem('mileageReportTransfer')

    // Reset any pending/staged transfers
    setPendingTransfer(null)
    setPendingVehicleRecords([])
    setHasProposedUsedFor(false)
    setProposedUsedForGrid([])
    setHasProposedThreshold(false)
    setProposedThresholdGrid([])

    // Reset UI and flags
    setTransferApplied(false)
    setShowTransferReview(false)
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

    const getValueByIndex = (row, idx) => {
      if (idx >= 0 && idx < json_keys.length) {
        return (row[json_keys[idx]] || '').toString().trim()
      }
      return ''
    }

    return json.map((r, idx) => ({
      sr: idx + 1,
      reg_no: regNoIdx >= 0 ? getValueByIndex(r, regNoIdx) : (r.reg_no || r['Reg No'] || r.registration || ''),
      vehicle_type: vehicleTypeIdx >= 0 ? getValueByIndex(r, vehicleTypeIdx) : (r.vehicle_type || r['Vehicle Type'] || ''),
      used_for: usedForIdx >= 0 ? getValueByIndex(r, usedForIdx) : (r.used_for || r['Used For'] || ''),
      mileage: mileageIdx >= 0 ? getValueByIndex(r, mileageIdx) : (r.mileage || r.Mileage || ''),
      ignition_time: igTimeIdx >= 0 ? getValueByIndex(r, igTimeIdx) : (r.ignition_time || r['IG Time'] || ''),
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

    const getValueByIndex = (row, idx) => {
      if (idx >= 0 && idx < json_keys.length) {
        return (row[json_keys[idx]] || '').toString().trim()
      }
      return ''
    }

    const normalized = json.map((r, idx) => ({
      sr: idx + 1,
      reg_no: regNoIdx >= 0 ? getValueByIndex(r, regNoIdx) : (r.reg_no || r['Reg No'] || r.registration || ''),
      vehicle_type: vehicleTypeIdx >= 0 ? getValueByIndex(r, vehicleTypeIdx) : (r.vehicle_type || r['Vehicle Type'] || ''),
      used_for: usedForIdx >= 0 ? getValueByIndex(r, usedForIdx) : (r.used_for || r['Used For'] || ''),
      mileage: mileageIdx >= 0 ? getValueByIndex(r, mileageIdx) : (r.mileage || r.Mileage || ''),
      ignition_time: igTimeIdx >= 0 ? getValueByIndex(r, igTimeIdx) : (r.ignition_time || r['IG Time'] || ''),
      threshold: thresholdIdx >= 0 ? getValueByIndex(r, thresholdIdx) : (r.threshold || r.Threshold || ''),
      remarks: remarksIdx >= 0 ? getValueByIndex(r, remarksIdx) : (r.remarks || r.Remarks || '')
    }))

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
          ignition_time: row.ignition_time ? parseFloat(row.ignition_time) : null,
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
      {/* Pending Transfer Notification - Dual Source */}
      {(pendingTransfer?.length > 0 || pendingVehicleRecords?.length > 0) && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-md">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 text-sm">⚡ Data Transfer Ready (Dual Source)</h3>
              {pendingTransfer && pendingTransfer.length > 0 && (
                <p className="text-sm text-blue-800 mt-1">📊 Daily Reporting: {pendingTransfer.length} row(s) with Mileage & IG Time</p>
              )}
              {pendingVehicleRecords && pendingVehicleRecords.length > 0 && (
                <p className="text-sm text-blue-800">🚗 Vehicle Records: {pendingVehicleRecords.length} row(s) with Type & Usage</p>
              )}
            </div>
            <div className="flex gap-2">
                <button
                  onClick={() => setShowTransferReview(true)}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 font-medium"
                >
                  Review & Apply
                </button>
              <button
                onClick={discardTransferData}
                className="px-4 py-2 rounded-md bg-blue-100 text-blue-800 text-sm hover:bg-blue-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600">
          <strong>Today's Report:</strong> {today}
        </div>

        <div className="flex items-center space-x-2">
          {/* Tabs (visual only) placed alongside action buttons */}
          <div className="hidden sm:flex items-center space-x-2 mr-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2 py-1 rounded-md text-sm ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-700'}`}>
              All
            </button>
            <button
              onClick={() => setActiveTab('used_for')}
              className={`px-2 py-1 rounded-md text-sm ${activeTab === 'used_for' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-700'}`}>
              <span className="inline-flex items-center">
                <span>Used For</span>
                {hasProposedUsedFor && proposedUsedForGrid && proposedUsedForGrid.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs">{proposedUsedForGrid.length}</span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('threshold')}
              className={`px-2 py-1 rounded-md text-sm ${activeTab === 'threshold' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-700'}`}>
              Threshold
            </button>
          </div>

          <button onClick={downloadTemplate} className="px-3 py-1 rounded-md bg-slate-700 text-white text-sm">Download Template</button>

          <button onClick={() => { setUploadMode('choose'); setShowUploadModal(true) }} className="px-3 py-1 rounded-md bg-gray-50 text-slate-700 cursor-pointer border border-gray-200 text-sm">Upload Report</button>

          <button onClick={clearTable} className="px-3 py-1 rounded-md bg-red-50 text-red-600 border border-red-100 text-sm">Clear Table</button>

          {/* Quick action: open Used For modal when staged proposals exist */}
          {hasProposedUsedFor && (
            <button onClick={() => openUsedForModal()} className="px-3 py-1 rounded-md bg-purple-600 text-white text-sm">Process Used For</button>
          )}

          <button onClick={exportData} className="px-3 py-1 rounded-md bg-emerald-600 text-white text-sm">Export Report</button>

          <button onClick={saveMileageData} disabled={saving} className="px-3 py-1 rounded-md bg-sky-600 text-white text-sm">
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </div>

      {/* Tabs: compact - only show All here per request */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-md text-sm ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-700'}`}>
            All
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Vehicle Code or Vehicle Type"
          className="px-3 py-1.5 rounded-md border border-gray-200 text-sm w-full max-w-md focus:ring-1 focus:ring-sky-300"
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl p-4 bg-white rounded">
            {uploadMode === 'choose' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upload Mileage Report</h3>
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
                            {mileageHeaders.map((h) => (
                              <th key={h} className="pr-4">{getHeaderLabel(h)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((r, i) => (
                            <tr key={i} className={`${i % 2 ? 'bg-gray-50' : ''}`}>
                              {mileageHeaders.map((h) => (
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
                        {mileageHeaders.map((h, ci) => (
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
                          <td colSpan={mileageHeaders.length + 1} className="p-4 text-center text-slate-500">Empty grid. Paste data or use clipboard.</td>
                        </tr>
                      )}
                      {pasteNotice && (
                        <tr>
                          <td colSpan={mileageHeaders.length + 1} className="p-2 text-center text-sky-700 text-xs">{pasteNotice}</td>
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

      {/* Mileage Table */}
      <div className="overflow-x-auto border border-gray-100 rounded-md">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading mileage data...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {mileageHeaders.map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">{getHeaderLabel(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {(() => {
                const q = (searchQuery || '').toLowerCase().trim()
                const filteredRows = q ? rows.filter(r => (r.reg_no || '').toLowerCase().includes(q) || (r.vehicle_type || '').toLowerCase().includes(q)) : rows

                if (filteredRows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={mileageHeaders.length} className="p-6 text-slate-500 text-center">No mileage data. Upload a report or add entries manually.</td>
                    </tr>
                  )
                }

                return filteredRows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2"><input value={r.sr || ''} readOnly className="w-full p-1 text-xs bg-gray-50 border-0" /></td>
                    <td className="px-3 py-2"><input value={r.reg_no || ''} onChange={(e) => updateRowField(idx, 'reg_no', e.target.value)} className="w-full p-1 text-xs border border-gray-200 rounded" /></td>
                    <td className="px-3 py-2"><input value={r.vehicle_type || ''} onChange={(e) => updateRowField(idx, 'vehicle_type', e.target.value)} className="w-full p-1 text-xs border border-gray-200 rounded" /></td>
                    <td className="px-3 py-2"><input value={r.used_for || ''} onChange={(e) => updateRowField(idx, 'used_for', e.target.value)} className="w-full p-1 text-xs border border-gray-200 rounded" /></td>
                    <td className="px-3 py-2"><input value={r.mileage || ''} onChange={(e) => updateRowField(idx, 'mileage', e.target.value)} type="number" step="0.01" className="w-full p-1 text-xs border border-gray-200 rounded" /></td>
                    <td className="px-3 py-2"><input value={r.ignition_time || ''} onChange={(e) => updateRowField(idx, 'ignition_time', e.target.value)} type="number" step="0.01" className="w-full p-1 text-xs border border-gray-200 rounded" /></td>
                    <td className="px-3 py-2"><input value={r.threshold || ''} onChange={(e) => updateRowField(idx, 'threshold', e.target.value)} type="number" step="0.01" className="w-full p-1 text-xs border border-gray-200 rounded" /></td>
                    <td className="px-3 py-2"><input value={r.remarks || ''} onChange={(e) => updateRowField(idx, 'remarks', e.target.value)} className="w-full p-1 text-xs border border-gray-200 rounded" /></td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        )}
      </div>
    </div>
      {/* Transfer Review Modal - Dual Source */}
      {showTransferReview && (pendingTransfer?.length > 0 || pendingVehicleRecords?.length > 0) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-11/12 md:w-4/5 p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Review Data Transfer (Dual Source)</h3>
              <button onClick={() => setShowTransferReview(false)} className="text-slate-500">Close</button>
            </div>

            {/* Daily Reporting Data */}
            {pendingTransfer && pendingTransfer.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-blue-700 mb-3 pb-2 border-b border-blue-200">📊 Daily Reporting Data (Mileage & IG Time)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-left text-gray-600 bg-blue-50">
                      <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Vehicle Code</th>
                        <th className="px-2 py-2">Mileage</th>
                        <th className="px-2 py-2">IG Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransfer.map((it, i) => (
                        <tr key={i} className={`${i % 2 ? 'bg-blue-50' : ''}`}>
                          <td className="px-2 py-1">{i + 1}</td>
                          <td className="px-2 py-1 font-medium">{it.vehicle_code || it.reg_no || '—'}</td>
                          <td className="px-2 py-1">{it.mileage || '—'}</td>
                          <td className="px-2 py-1">{it.ignition_time || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vehicle Records Data */}
            {pendingVehicleRecords && pendingVehicleRecords.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-purple-700 mb-3 pb-2 border-b border-purple-200">🚗 Vehicle Records Data (Type & Usage)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-left text-gray-600 bg-purple-50">
                      <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Reg No</th>
                        <th className="px-2 py-2">Vehicle Code</th>
                        <th className="px-2 py-2">Vehicle Type</th>
                        <th className="px-2 py-2">Used For</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingVehicleRecords.map((it, i) => (
                        <tr key={i} className={`${i % 2 ? 'bg-purple-50' : ''}`}>
                          <td className="px-2 py-1">{i + 1}</td>
                          <td className="px-2 py-1 font-medium">{it.reg_no || '—'}</td>
                          <td className="px-2 py-1">{it.vehicle_code || '—'}</td>
                          <td className="px-2 py-1">{it.vehicle_type || '—'}</td>
                          <td className="px-2 py-1">{it.used_for || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info Note */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-4">
              <strong>ℹ️ How Reconciliation Works:</strong> Records are merged by Vehicle Code. Daily Reporting creates rows with Mileage & IG Time. Vehicle Records enriches those rows with Type & Usage. If Vehicle Records arrives first, it's stored temporarily until matching Daily Reporting data arrives.
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowTransferReview(false); setPendingTransfer(null); setPendingVehicleRecords([] ) }} className="px-3 py-2 rounded bg-gray-50 border text-sm">Dismiss</button>
              {hasProposedUsedFor ? (
                <button onClick={() => { openUsedForModal(); setShowTransferReview(false) }} className="px-3 py-2 rounded bg-purple-600 text-white text-sm">Process Used For</button>
              ) : (
                <button onClick={() => { setRows(prev => mergePendingToRows(prev)); /* keep mileageReportTransfer in localStorage for testing */ setPendingTransfer(null); setPendingVehicleRecords([]); setTransferApplied(true); setShowTransferReview(false) }} className="px-3 py-2 rounded bg-purple-600 text-white text-sm">Confirm & Apply</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Used For Modal - Top Level */}
      {showUsedForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-11/12 md:w-3/4 p-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Used For - Grid View</h3>
              <button onClick={() => { setShowUsedForModal(false); setActiveTab('all') }} className="text-slate-500">Close</button>
            </div>

            {usedForSaveError && (
              <div className="mb-3 text-sm text-red-700">{usedForSaveError}</div>
            )}

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-2">SR</th>
                    <th className="px-2 py-2">Vehicle Code</th>
                    <th className="px-2 py-2">Type of Vehicle</th>
                    <th className="px-2 py-2">Used For</th>
                  </tr>
                </thead>
                <tbody>
                  {usedForGrid.map((r, idx) => (
                    <tr key={idx} className={`${idx % 2 ? 'bg-gray-50' : ''}`}>
                      <td className="px-2 py-1">{r.sr || idx + 1}</td>
                      <td className="px-2 py-1"><input value={r.vehicle_code} onChange={(e) => updateUsedForCell(idx, 'vehicle_code', e.target.value)} className="p-1 text-sm border rounded" /></td>
                      <td className="px-2 py-1"><input value={r.vehicle_type} onChange={(e) => updateUsedForCell(idx, 'vehicle_type', e.target.value)} className="p-1 text-sm border rounded" /></td>
                      <td className="px-2 py-1">
                        {r.options && r.options.length > 1 ? (
                          <>
                            <select value={r.used_for || ''} onChange={(e) => updateUsedForCell(idx, 'used_for', e.target.value)} className="p-1 text-sm border rounded w-full">
                              <option value="">-- Select --</option>
                              {r.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <div className="text-xs text-slate-400 italic mt-1">Choose one of the options</div>
                            {r.used_for_option_valid === false && (
                              <div className="text-xs text-red-600 mt-1">Value must be one of the allowed options</div>
                            )}
                          </>
                        ) : (
                          <>
                            <input list={r.options && r.options.length ? `usedfor-list-${idx}` : undefined} value={r.used_for || ''} onChange={(e) => updateUsedForCell(idx, 'used_for', e.target.value)} className="p-1 text-sm border rounded w-full" />

                            {r.options && r.options.length > 0 && (
                              <datalist id={`usedfor-list-${idx}`}>
                                {r.options.map((opt) => (
                                  <option key={opt} value={opt} />
                                ))}
                              </datalist>
                            )}

                            {r.options && r.options.length > 0 && (
                              <div className="text-xs text-slate-400 italic mt-1">Options: {r.options.join(', ')}</div>
                            )}

                            {r.used_for_source === 'suggested' && (
                              <div className="text-xs text-slate-400 italic mt-1">Suggested based on selected vehicle type</div>
                            )}

                            {r.used_for_source === 'user' && r.options && r.options.length > 0 && r.options.indexOf((r.used_for || '').toString()) === -1 && (
                              <div className="text-xs text-amber-600 italic mt-1">Custom value (not in options)</div>
                            )}

                            {r.used_for_valid === false && (
                              <div className="text-xs text-red-600 mt-1">Max 100 chars</div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowUsedForModal(false); setActiveTab('all') }} className="px-3 py-2 bg-gray-50 border rounded">Cancel</button>
              <button onClick={saveUsedForGrid} className="px-3 py-2 bg-sky-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Modal - Top Level */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-11/12 md:w-3/4 p-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Threshold - Grid View</h3>
              <button onClick={() => { setShowThresholdModal(false); setActiveTab('all') }} className="text-slate-500">Close</button>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-2">SR</th>
                    <th className="px-2 py-2">Type of Vehicle</th>
                    <th className="px-2 py-2">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {thresholdGrid.map((r, idx) => (
                    <tr key={idx} className={`${idx % 2 ? 'bg-gray-50' : ''}`}>
                      <td className="px-2 py-1">{r.sr || idx + 1}</td>
                      <td className="px-2 py-1"><input value={r.vehicle_type} onChange={(e) => updateThresholdCell(idx, 'vehicle_type', e.target.value)} className="p-1 text-sm border rounded" /></td>
                      <td className="px-2 py-1">
                        <div className="flex items-center space-x-2">
                          <input value={r.threshold} onChange={(e) => updateThresholdCell(idx, 'threshold', e.target.value)} type="number" step="any" min="0" className="p-1 text-sm border rounded w-28" />
                          {r.threshold_unit === 'hrs' && (
                            <div className="text-xs text-slate-600">hrs</div>
                          )}
                        </div>
                        {!r.threshold_valid && (
                          <div className="text-xs text-red-600 mt-1">Enter a valid non-negative number</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowThresholdModal(false); setActiveTab('all') }} className="px-3 py-2 bg-gray-50 border rounded">Cancel</button>
              <button onClick={saveThresholdGrid} className="px-3 py-2 bg-sky-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
