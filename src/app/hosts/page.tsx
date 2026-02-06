// src/app/hosts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Users, Search, Home, Building2, Phone } from "lucide-react";

interface Host {
  id: string;
  phone_number: string;
  name: string;
  total_beds: number;
  location_type: string;
  call_frequency: string;
  is_registered: boolean;
  created_at: string;
}

export default function HostsPage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchHosts = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase.from("hosts").select("*");

      setHosts(data || []);
      setLoading(false);
    };

    fetchHosts();
  }, []);

  const filteredHosts = hosts.filter(
    (host) =>
      host.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.phone_number.includes(searchTerm)
  );

  const registeredCount = hosts.filter((h) => h.is_registered).length;
  const totalBeds = hosts.reduce((sum, h) => sum + h.total_beds, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading hosts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">Host Management</h1>
            <p className="text-slate-400">View and manage all registered hosts</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">
            <Home className="w-5 h-5" />
            Back Home
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Total Hosts</p>
            <p className="text-4xl font-bold text-white">{hosts.length}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <Phone className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Registered</p>
            <p className="text-4xl font-bold text-white">{registeredCount}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Total Beds</p>
            <p className="text-4xl font-bold text-white">{totalBeds}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Avg Beds/Host</p>
            <p className="text-4xl font-bold text-white">{hosts.length > 0 ? (totalBeds / hosts.length).toFixed(1) : 0}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Hosts Table */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Beds</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Frequency</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredHosts.map((host) => (
                  <tr key={host.id} className="hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 text-sm text-white">{host.name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{host.phone_number}</td>
                    <td className="px-6 py-4 text-sm text-white font-semibold">{host.total_beds}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {host.location_type === "private" ? "Private" : "Home"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {host.call_frequency === "weekly" ? "Weekly" : "Special"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          host.is_registered
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {host.is_registered ? "Registered" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredHosts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No hosts found</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between text-sm text-slate-400">
          <span>Showing {filteredHosts.length} of {hosts.length} hosts</span>
          <span>{registeredCount} registered • {hosts.length - registeredCount} pending</span>
        </div>
      </div>
    </div>
  );
}
