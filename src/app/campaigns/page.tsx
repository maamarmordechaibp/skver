// src/app/campaigns/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Calendar, Home, TrendingUp, CheckCircle } from "lucide-react";

interface Campaign {
  id: string;
  shabbat_date: string;
  beds_needed: number;
  beds_confirmed: number;
  status: string;
  created_at: string;
  created_by: string;
  completed_at: string | null;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      setCampaigns(data || []);
      setLoading(false);
    };

    fetchCampaigns();
  }, []);

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const completedCampaigns = campaigns.filter((c) => c.status === "completed").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">Campaign History</h1>
            <p className="text-slate-400">View all past and current campaigns</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">
            <Home className="w-5 h-5" />
            Back Home
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-calendar-500 to-calendar-600 text-white">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Total Campaigns</p>
            <p className="text-4xl font-bold text-white">{campaigns.length}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Active</p>
            <p className="text-4xl font-bold text-white">{activeCampaigns}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Completed</p>
            <p className="text-4xl font-bold text-white">{completedCampaigns}</p>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Shabbat Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Beds Needed</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Beds Confirmed</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Progress</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {campaigns.map((campaign) => {
                  const progress =
                    campaign.beds_needed > 0
                      ? (campaign.beds_confirmed / campaign.beds_needed) * 100
                      : 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4 text-sm text-white font-semibold">
                        {campaign.shabbat_date}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {campaign.beds_needed}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {campaign.beds_confirmed}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-white font-semibold w-10">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            campaign.status === "active"
                              ? "bg-blue-500/20 text-blue-300"
                              : campaign.status === "completed"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          {campaign.status === "active"
                            ? "Active"
                            : campaign.status === "completed"
                              ? "Completed"
                              : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(campaign.created_at).toLocaleDateString(
                          "en-US"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {campaigns.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No campaigns found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
