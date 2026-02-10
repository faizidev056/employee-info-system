import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';

const RegistrationForm = () => {
    const [formData, setFormData] = useState({
        sr: '',
        regId: '',
        regNo: '',
        type: '',
        make: '',
        model: '',
        year: '',
        vehicleCodePrefix: '',  // e.g., HND-LR-
        vehicleCodeSuffix: '',  // e.g., 001, 002 (user-editable)
        // Owner selection: default to Contractor; if 'Other' selected user can type name into `ownedBy`
        ownedByType: 'Contractor',
        ownedBy: '',
        joiningDate: '',
        usedFor: '',
        status: 'Active'
    });

    const [regLoading, setRegLoading] = useState(false);
    const [localSeq, setLocalSeq] = useState({});
    const [lastRegistered, setLastRegistered] = useState(null); // store last successful registration

    const VEHICLE_TYPES = [
        'Tractor Trolley',
        'Front end blade',
        'Front end loader',
        'Dumper truck',
        'Arm roller',
        'Compactor',
        'Mini tripper',
        'Loader rickshaws',
        'Mechanical Washer',
        'Mechanical sweeper',
        'Drain cleaner',
        'Water bowser',
        'Other'
    ];

    const TYPE_CODES = {
        'Tractor Trolley': 'TT',
        'Front end blade': 'FB',
        'Front end loader': 'FEL',
        'Dumper truck': 'DT',
        'Arm roller': 'AR',
        'Compactor': 'CP',
        'Mini tripper': 'MT',
        'Loader rickshaws': 'LR',
        'Mechanical Washer': 'MW',
        'Mechanical sweeper': 'MS',
        'Drain cleaner': 'DC',
        'Water bowser': 'WB',
        'Other': 'OT'
    };

    const zeroPad = (n, len = 3) => String(n).padStart(len, '0');

    // Runtime check: ensure every declared vehicle type has a mapping in TYPE_CODES
    useEffect(() => {
        const missing = VEHICLE_TYPES.filter(t => !(t in TYPE_CODES));
        if (missing.length) {
            console.warn('Vehicle type(s) missing TYPE_CODES mapping:', missing);
        }
        // Also check for any TYPE_CODES keys not present in VEHICLE_TYPES
        const extra = Object.keys(TYPE_CODES).filter(k => !VEHICLE_TYPES.includes(k));
        if (extra.length) {
            console.warn('TYPE_CODES contains keys not present in VEHICLE_TYPES:', extra);
        }
    }, []);

    const generateRegId = async (type) => {
        // Legacy helper kept for compatibility. Prefer server-side RPC for authoritative id.
        if (!type) return '';
        const code = TYPE_CODES[type] || 'OT';
        setRegLoading(true);
        try {
            // Try to fetch existing reg_ids from 'vehicles' table and determine max sequence
            const { data, error } = await supabase
                .from('vehicles')
                .select('reg_id');
            if (error) throw error;
            let max = 0;
            if (Array.isArray(data)) {
                data.forEach(item => {
                    // Support multiple possible column names and ensure string handling
                    const regVal = (item.reg_id || item.regId || item.reg || '').toString();
                    const m = regVal.match(new RegExp(`ZKB-${code}/(\\d+)$`));
                    if (m) {
                        const num = parseInt(m[1], 10);
                        if (!Number.isNaN(num)) max = Math.max(max, num);
                    }
                });
            }
            const next = Number.isFinite(max) ? (max + 1) : 1; // default to 1 if parsing failed
            return `ZKB-${code}/${zeroPad(next)}`;
        } catch (err) {
            console.warn('Supabase lookup failed for regId; using local fallback.', err);
            // Use an immediate local fallback number (do not rely on async state read)
            const nextSeq = (localSeq[code] || 0) + 1;
            setLocalSeq(prev => ({ ...prev, [code]: nextSeq }));
            return `ZKB-${code}/${zeroPad(nextSeq)}`;
        } finally {
            setRegLoading(false);
        }
    };

    // Preview vehicle code prefix without reserving it (non-destructive, reads current counter)
    const previewVehicleCode = async (type) => {
        if (!type) return;
        const code = TYPE_CODES[type] || 'OT';
        try {
            const { data, error } = await supabase
                .from('registration_counters')
                .select('seq')
                .eq('type_code', code)
                .single();
            if (error) {
                // If row not found, data will be null - treat as seq = 0
                console.warn('preview: no counter row', error);
            }
            const currentSeq = data && data.seq ? Number(data.seq) : 0;
            const next = currentSeq + 1;
            const previewPrefix = `HND-${code}-`;
            const previewRegId = `ZKB-${code}/${zeroPad(next)}`;
            const previewSr = String(next);  // SR as just digits
            setFormData(prev => ({ ...prev, vehicleCodePrefix: previewPrefix, vehicleCodeSuffix: zeroPad(next), regId: previewRegId, sr: previewSr }));
        } catch (err) {
            console.warn('previewVehicleCode failed, using local fallback', err);
            const next = (localSeq[code] || 0) + 1;
            const previewPrefix = `HND-${code}-`;
            const previewSr = String(next);
            setFormData(prev => ({ ...prev, vehicleCodePrefix: previewPrefix, vehicleCodeSuffix: zeroPad(next), regId: `ZKB-${code}/${zeroPad(next)}`, sr: previewSr }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'type') {
            setFormData(prev => ({ ...prev, type: value }));
            // preview vehicle/Reg IDs and SR (non-reserving) so user sees codes immediately
            previewVehicleCode(value);
            return;
        }
        if (name === 'vehicleCodeSuffix') {
            // Only allow digits
            const digitsOnly = value.replace(/[^\d]/g, '');
            setFormData(prev => ({ ...prev, [name]: digitsOnly }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            sr: '',
            regId: '',
            regNo: '',
            type: '',
            make: '',
            model: '',
            year: '',
            vehicleCodePrefix: '',
            vehicleCodeSuffix: '',
            ownedByType: 'Contractor',
            ownedBy: '',
            joiningDate: '',
            usedFor: '',
            status: 'Active'
        });
        setLastRegistered(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setRegLoading(true);
        try {
            if (!formData.type) throw new Error('Select a vehicle type first');
            if (formData.ownedByType === 'Other' && !(formData.ownedBy && formData.ownedBy.trim())) throw new Error('Please enter owner name when Owned By is Other');
            if (!formData.vehicleCodeSuffix || !formData.vehicleCodeSuffix.trim()) throw new Error('Enter vehicle code suffix (e.g., 001 or 002)');
            const code = TYPE_CODES[formData.type] || 'OT';

            // Construct full vehicle code from prefix + suffix
            const fullVehicleCode = formData.vehicleCodePrefix + formData.vehicleCodeSuffix;

            // Check if vehicle code already exists
            const { data: existingVehicles, error: checkError } = await supabase
                .from('vehicle_registrations')
                .select('vehicle_code')
                .eq('vehicle_code', fullVehicleCode)
                .limit(1);
            
            if (checkError) throw checkError;
            if (existingVehicles && existingVehicles.length > 0) {
                throw new Error(`Vehicle Code "${fullVehicleCode}" already exists! Please use a different suffix.`);
            }

            // Call atomic RPC to register the full vehicle record in one step
            const rpcParams = {
                p_type: formData.type,
                p_type_code: code,
                p_reg_no: formData.regNo || null,
                p_make: formData.make || null,
                p_model: formData.model || null,
                p_year: formData.year ? Number(formData.year) : null,
                p_owned_by_type: formData.ownedByType || 'Contractor',
                p_owned_by: formData.ownedByType === 'Other' ? (formData.ownedBy || null) : (formData.ownedByType || 'Contractor'),
                p_joining_date: formData.joiningDate || null,
                p_status: formData.status || 'Active',
                p_sr: null,  // RPC will auto-generate SR based on type_code
                p_vehicle_code_suffix: formData.vehicleCodeSuffix || null,
                p_used_for: formData.usedFor || null
            };

            const { data: rpcData, error: rpcError } = await supabase.rpc('register_vehicle', rpcParams);
            if (rpcError) throw rpcError;

            // Parse RPC response robustly
            let rpcObj = rpcData;
            if (!rpcObj) throw new Error('Empty response from register_vehicle');
            if (typeof rpcObj === 'string') {
                try { rpcObj = JSON.parse(rpcObj); } catch { /* leave as-is */ }
            }
            if (Array.isArray(rpcObj)) rpcObj = rpcObj[0];

            const regId = rpcObj && (rpcObj.reg_id || rpcObj.regId || (rpcObj.row && rpcObj.row.reg_id));
            const insertedRow = rpcObj && (rpcObj.row || rpcObj);

            if (!regId) throw new Error('register_vehicle did not return reg_id');

            // Update UI with authoritative values from user input (for vehicle code, use what user typed)
            setFormData(prev => ({ ...prev, regId }));
            // Normalize insertedRow if it's a JSON string
            let inserted = insertedRow;
            if (typeof insertedRow === 'string') {
                try { inserted = JSON.parse(insertedRow); } catch { /* ignore */ }
            }
            setLastRegistered(inserted);
            alert(`Vehicle registered: ${regId} | Sr: ${inserted.sr} | Code: ${fullVehicleCode}`);

            // Optionally clear the form for a fresh registration - now keep it so user can copy details; user can start a new one below

        } catch (err) {
            console.error(err);
            alert('Registration failed: ' + (err.message || JSON.stringify(err)));
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        >
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-semibold text-slate-800">Vehicle Registration Form</h2>
                <p className="text-sm text-slate-500 mt-1">Enter the details of the new vehicle</p>
            </div>

            {lastRegistered && (
                <div className="p-4 m-6 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-green-800">Last Registered</h3>
                            <p className="text-sm text-green-700">Sr: <span className="font-medium">{lastRegistered.sr}</span></p>
                            <p className="text-sm text-green-700">Reg-ID: <span className="font-medium">{lastRegistered.reg_id}</span></p>
                            <p className="text-sm text-green-700">Vehicle Code: <span className="font-medium">{lastRegistered.vehicle_code}</span></p>
                            <p className="text-sm text-green-700">Owned By: <span className="font-medium">{lastRegistered.owned_by || '—'}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => resetForm()} className="px-3 py-1 bg-white border rounded text-sm">Register another</button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Sr (Serial Number) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Sr <span className="text-xs text-slate-400">{regLoading ? '(Generating...)' : '(Auto)'}</span></label>
                    <input
                        type="text"
                        name="sr"
                        value={formData.sr}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none transition-all text-slate-800 placeholder-slate-400"
                        placeholder="Auto-generated serial number"
                        readOnly
                    />
                    <p className="text-xs text-slate-400">Serial number is auto-generated (e.g. 1, 2, 3...)</p>
                </div>

                {/* Reg-ID */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Reg-ID <span className="text-xs text-slate-400">{regLoading ? '(Generating...)' : '(Auto)'}</span></label>
                    <input
                        type="text"
                        name="regId"
                        value={formData.regId}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none transition-all text-slate-800 placeholder-slate-400"
                        placeholder="Auto-generated registration ID"
                        readOnly
                    />
                    <p className="text-xs text-slate-400">Reg ID is auto-generated from vehicle type (e.g. ZKB-TT/001)</p>
                </div>

                {/* Reg No */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Reg No</label>
                    <input
                        type="text"
                        name="regNo"
                        value={formData.regNo}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="Registration Number"
                        required
                    />
                </div>

                {/* Vehicle Code */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Vehicle Code <span className="text-xs text-slate-400">(HND-TT-001 format)</span></label>
                    <input
                        type="text"
                        name="vehicleCodeSuffix"
                        value={formData.vehicleCodeSuffix}
                        onChange={handleChange}
                        placeholder="Enter suffix (e.g., 001, 002, 100)"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        maxLength="6"
                    />
                    <div className="text-xs text-slate-500 mt-1">
                        Full code: <span className="font-medium text-slate-700">{formData.vehicleCodePrefix}{formData.vehicleCodeSuffix || '—'}</span>
                    </div>
                    <p className="text-xs text-slate-400">Enter a unique code suffix (numbers only)</p>
                </div>

                {/* Type of Vehicle */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Type of Vehicle</label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                    >
                        <option value="">Select Type</option>
                        {VEHICLE_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    {/* Show selected type code for clarity */}
                    <p className="text-xs text-slate-400 mt-1">Type code: <span className="font-medium">{TYPE_CODES[formData.type] || '—'}</span></p>
                </div>

                {/* Make */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Make</label>
                    <input
                        type="text"
                        name="make"
                        value={formData.make}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="e.g. Toyota, Hino"
                    />
                </div>

                {/* Model */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Model</label>
                    <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="e.g. Corolla, 500 Series"
                    />
                </div>

                {/* Year */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Year</label>
                    <input
                        type="number"
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="Year of Manufacture"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                    />
                </div>

                {/* Owned By */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Owned By</label>
                    <select
                        name="ownedByType"
                        value={formData.ownedByType}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                    >
                        <option value="Contractor">Contractor</option>
                        <option value="Other">Other</option>
                    </select>
                    {formData.ownedByType === 'Other' && (
                        <input
                            type="text"
                            name="ownedBy"
                            value={formData.ownedBy}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                            placeholder="Enter owner name"
                        />
                    )}
                </div>

                {/* Joining Date */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Joining Date</label>
                    <input
                        type="date"
                        name="joiningDate"
                        value={formData.joiningDate}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                    />
                </div>

                {/* Used For */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Used For</label>
                    <input
                        type="text"
                        name="usedFor"
                        value={formData.usedFor}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="e.g. Waste Collection, Road Maintenance"
                    />
                    <p className="text-xs text-slate-400">Purpose or use case for this vehicle</p>
                </div>

                {/* Submit Button */}
                <div className="md:col-span-2 lg:col-span-3 flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={regLoading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors"
                    >
                        {regLoading ? 'Registering...' : 'Register Vehicle'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default RegistrationForm;
