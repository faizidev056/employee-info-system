import React from 'react'

export default function StatCard({ title, value, delta, icon }) {
  return (
    <div className="bg-white/5 p-4 rounded-lg border border-white/6 flex items-start gap-4">
      <div className="p-2 bg-white/6 rounded-md">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-gray-300">{title}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </div>
      {delta && (
        <div className={`text-sm font-medium self-center ${delta[0] === '+' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {delta}
        </div>
      )}
    </div>
  )
}
