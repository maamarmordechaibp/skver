// src/app/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { CheckCircle, XCircle, TrendingUp, Home, BarChart2 } from "lucide-react";

interface Response {
  id: string;
  host: { name: string; phone_number: string };
  beds_offered: number;
  response_type: string;
  responded_at: string;
}

interface ReportStats {
  totalAccepted: number;
  totalDeclined: number;
  totalBedsOffered: number;
  acceptanceRate: number;
  responses: Response[];
}

export default function ReportsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
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

      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
        await fetchReportStats(data[0].id);
      }

      setLoading(false);
    };

    fetchCampaigns();
  }, []);

  const fetchReportStats = async (campaignId: string) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: responses } = await supabase
      .from("responses")
      .select(
        `
        *,
        host:hosts(name, phone_number)
      `
      )
      .eq("campaign_id", campaignId);

    if (responses) {
      const accepted = responses.filter((r) => r.response_type === "accepted");
      const declined = responses.filter((r) => r.response_type === "declined");

      setStats({
        totalAccepted: accepted.length,
        totalDeclined: declined.length,
        totalBedsOffered: accepted.reduce((sum, r) => sum + r.beds_offered, 0),
        acceptanceRate:
          responses.length > 0
            ? (accepted.length / responses.length) * 100
            : 0,
        responses: responses || [],
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">Campaign Reports</h1>
            <p className="text-slate-400">Detailed analytics and response tracking</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">
            <Home className="w-5 h-5" />
            Back Home
          </Link>
        </div>

        {/* Campaign Selector */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Select Campaign
          </label>
          <select
            value={selectedCampaign}
            onChange={(e) => {
              setSelectedCampaign(e.target.value);
              fetchReportStats(e.target.value);
            }}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                Shabbat {campaign.shabbat_date} - {campaign.beds_needed} beds needed
              </option>
            ))}
          </select>
        </div>

        {stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-2">Accepted</p>
                <p className="text-4xl font-bold text-white">{stats.totalAccepted}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-2">Declined</p>
                <p className="text-4xl font-bold text-white">{stats.totalDeclined}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <BarChart2 className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-2">Total Beds</p>
                <p className="text-4xl font-bold text-white">{stats.totalBedsOffered}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-2">Success Rate</p>
                <p className="text-4xl font-bold text-white">{stats.acceptanceRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Responses Table */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-900/50 border-b border-slate-700 px-6 py-4">
                <h2 className="text-2xl font-bold text-white">Response Details</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Phone</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Beds</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Response</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {stats.responses.map((response) => (
                      <tr key={response.id} className="hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 text-sm text-white">
                          {response.host?.name || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {response.host?.phone_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-white font-semibold">
                          {response.beds_offered}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              response.response_type === "accepted"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {response.response_type === "accepted"
                              ? "Accepted"
                              : "Declined"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {new Date(response.responded_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {stats.responses.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No responses for this campaign yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
