import React from 'react'
import { ResponsiveContainer, RadialBarChart, RadialBar, Tooltip, Cell, PieChart, Pie } from 'recharts'

const RoundChart = ({ title, value, subtext, data, type = 'radial', darkMode = false }) => {
    return (
        <div className={`backdrop-blur-xl border rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-between h-[280px] transition-colors duration-300 ${darkMode
                ? 'bg-slate-800/50 border-slate-700/50 shadow-black/20'
                : 'bg-white border-slate-200 shadow-slate-200/50'
            }`}>
            <h3 className={`font-medium text-lg w-full text-left z-10 ${darkMode ? 'text-slate-200' : 'text-slate-700'
                }`}>{title}</h3>

            <div className="flex-1 w-full flex items-center justify-center relative translate-y-2">
                {type === 'radial' ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="100%"
                            barSize={15}
                            data={data}
                            startAngle={90}
                            endAngle={-270}
                        >
                            <RadialBar
                                minAngle={15}
                                background={{ fill: darkMode ? '#334155' : '#e2e8f0' }}
                                clockWise
                                dataKey="value"
                                cornerRadius={10}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                                    borderRadius: '8px',
                                    color: darkMode ? '#f1f5f9' : '#1e293b',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-8">
                    <span className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'
                        }`}>{value}</span>
                    {subtext && <span className={`text-xs font-medium mt-1 uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>{subtext}</span>}
                </div>
            </div>
        </div>
    )
}

export default RoundChart
