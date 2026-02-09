import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const VehicleRegistrationsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('vehicle_registrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Vehicle Registrations</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRows}
            className="px-3 py-1 bg-white border rounded text-sm"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
      )}

      {rows.length === 0 && !loading ? (
        <div className="text-sm text-slate-500">No registrations found.</div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm table-auto">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Reg-ID</th>
                <th className="px-3 py-2 text-left">Vehicle Code</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Make / Model</th>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-left">Owned By</th>
                <th className="px-3 py-2 text-left">Joining</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-3 py-2">{r.reg_id}</td>
                  <td className="px-3 py-2">{r.vehicle_code}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.make} {r.model ? '/' + r.model : ''}</td>
                  <td className="px-3 py-2">{r.year || '—'}</td>
                  <td className="px-3 py-2">{r.owned_by || r.owned_by_type || '—'}</td>
                  <td className="px-3 py-2">{r.joining_date || '—'}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="mt-4 p-4 border rounded bg-slate-50">
          <div className="flex justify-between items-start">
            <h2 className="text-sm font-medium">Registration Details</h2>
            <button onClick={() => setSelected(null)} className="text-sm text-slate-600">Close</button>
          </div>
          <pre className="mt-2 text-xs overflow-auto max-h-64 p-2 bg-white border rounded">{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default VehicleRegistrationsPage;
