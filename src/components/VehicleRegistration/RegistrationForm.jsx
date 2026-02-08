import { useState } from 'react';
import { motion } from 'framer-motion';

const RegistrationForm = () => {
    const [formData, setFormData] = useState({
        sr: '',
        regId: '',
        regNo: '',
        type: '',
        make: '',
        model: '',
        year: '',
        vehicleCode: '',
        ownedBy: '',
        joiningDate: '',
        status: 'Active'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        // Add submission logic here later
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

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Sr (Serial Number) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Sr</label>
                    <input
                        type="text"
                        name="sr"
                        value={formData.sr}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="Serial No."
                    />
                </div>

                {/* Reg-ID */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Reg-ID</label>
                    <input
                        type="text"
                        name="regId"
                        value={formData.regId}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="Registration ID"
                    />
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
                    <label className="text-sm font-medium text-slate-700">Vehicle Code</label>
                    <input
                        type="text"
                        name="vehicleCode"
                        value={formData.vehicleCode}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="e.g. V-001"
                    />
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
                        <option value="Compactor">Compactor</option>
                        <option value="Dumper">Dumper</option>
                        <option value="Tractor/Trolley">Tractor/Trolley</option>
                        <option value="Loader/Excavator">Loader/Excavator</option>
                        <option value="Water Bowser">Water Bowser</option>
                        <option value="Car">Car</option>
                        <option value="Bike">Bike</option>
                        <option value="Other">Other</option>
                    </select>
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
                    <input
                        type="text"
                        name="ownedBy"
                        value={formData.ownedBy}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="Owner Name or Department"
                    />
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

                {/* Submit Button */}
                <div className="md:col-span-2 lg:col-span-3 flex justify-end pt-4">
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors"
                    >
                        Register Vehicle
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default RegistrationForm;
