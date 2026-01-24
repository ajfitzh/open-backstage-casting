import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts'; 
import { TrendingUp, Users, DollarSign, AlertCircle, ClipboardCheck } from 'lucide-react';

// Mock Data - In reality, fetched via lib/baserow.ts
const complianceData = [
  { name: 'Agreements', done: 85, total: 100 },
  { name: 'Fees Paid', done: 60, total: 100 },
  { name: 'Headshots', done: 45, total: 100 },
  { name: 'Medical Forms', done: 92, total: 100 },
];

const castDiversity = [
  { name: 'Lead', value: 12 },
  { name: 'Supporting', value: 25 },
  { name: 'Ensemble', value: 48 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  return (
    <div className="bg-zinc-950 text-zinc-50 p-8 min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold">Production Analytics</h1>
          <p className="text-zinc-400">Open Backstage Internal Reporting</p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          Last Synced with Baserow: Today, 14:02
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Cast" value="85" icon={<Users size={20}/>} trend="+4 from last show" />
        <StatCard title="Fees Collected" value="$4,250" icon={<DollarSign size={20}/>} trend="60% of goal" />
        <StatCard title="Missing Waivers" value="8" icon={<AlertCircle size={20} className="text-amber-500"/>} />
        <StatCard title="Compliance" value="72%" icon={<ClipboardCheck size={20}/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Production Coordinator View: Compliance */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" /> Onboarding Progress
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="done" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Artistic Director View: Cast Balance */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Role Distribution</h2>
          <div className="h-64 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={castDiversity}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {castDiversity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {castDiversity.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-zinc-400">{d.name}:</span>
                  <span className="font-mono">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
      <div className="flex justify-between items-start mb-2">
        <span className="text-zinc-400 text-sm font-medium">{title}</span>
        <div className="text-zinc-500">{icon}</div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {trend && <div className="text-xs text-emerald-500 mt-1">{trend}</div>}
    </div>
  );
}