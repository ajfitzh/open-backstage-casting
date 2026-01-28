"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts';

// --- CONFIG ---
const API_TOKEN = "Token YOUR_ACTUAL_TOKEN_HERE"; // Use your baserow_token.txt
const TABLE_ID = "637"; // Performances Table
const BASE_URL = "https://open-backstage.org/api/database/rows/table/";

export default function AnalyticsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch last 40 performances, ordered by Date (field_6186)
        const response = await axios.get(
          `${BASE_URL}${TABLE_ID}/?user_field_names=true&order_by=field_6186&size=40`,
          { headers: { Authorization: API_TOKEN } }
        );

        const formattedData = response.data.results.map(row => {
          const sold = parseFloat(row['Tickets Sold'] || row.field_6184 || 0);
          const total = parseFloat(row['Total Inventory'] || row.field_6183 || 0);
          const fillRate = total > 0 ? (sold / total) * 100 : 0;
          
          return {
            name: row.Performance || row.field_6182, 
            Sold: sold,
            Capacity: total,
            FillRate: Math.round(fillRate),
            Remaining: total - sold
          };
        });

        setData(formattedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-12 text-zinc-400">Calculating box office data...</div>;

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-white">
      <header className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-blue-500">SHOW <span className="text-white">ANALYTICS</span></h1>
        <p className="text-zinc-500 text-sm mt-2">Historical Ticket Sales & Venue Fill Rates</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        
        {/* CHART 1: TICKETS SOLD VS CAPACITY */}
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Ticket Sales Volume
          </h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="Sold" stackId="a" fill="#10b981" name="Tickets Sold" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Remaining" stackId="a" fill="#27272a" name="Empty Seats" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: FILL RATE PERCENTAGE */}
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Venue Fill Rate (%)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis stroke="#666" fontSize={12} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="FillRate" stroke="#3b82f6" strokeWidth={3} dot={false} name="Fill %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}