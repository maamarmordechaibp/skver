// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { BarChart3, Phone, CheckCircle, XCircle, Clock, Home } from "lucide-react";

interface Campaign {
  id: string;
  shabbat_date: string;
  beds_needed: number;
  beds_confirmed: number;
  status: string;
}

interface QueueStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
}

export default function DashboardPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    accepted: 0,
    declined: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: activeCampaign } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .limit(1);

      if (activeCampaign && activeCampaign.length > 0) {
        setCampaign(activeCampaign[0]);

        const { data: queueData } = await supabase
          .from("call_queue")
          .select("status")
          .eq("campaign_id", activeCampaign[0].id);

        if (queueData) {
          const totalCalls = queueData.length;
          const accepted = queueData.filter(
            (q) => q.status === "accepted"
          ).length;
          const declined = queueData.filter(
            (q) => q.status === "declined"
          ).length;
          const pending = queueData.filter(
            (q) => q.status === "pending"
          ).length;

          setStats({
            total: totalCalls,
            accepted,
            declined,
            pending,
          });
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const bedsNeeded = campaign?.beds_needed || 0;
  const bedsConfirmed = campaign?.beds_confirmed || 0;
  const progress = bedsNeeded > 0 ? (bedsConfirmed / bedsNeeded) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">Campaign Dashboard</h1>
            <p className="text-slate-400">Real-time monitoring and campaign insights</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">
            <Home className="w-5 h-5" />
            Back Home
          </Link>
        </div>

        {campaign ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard 
                icon={Phone} 
                label="Beds Needed" 
                value={bedsNeeded} 
                color="from-blue-500 to-blue-600"
              />
              <MetricCard 
                icon={CheckCircle} 
                label="Beds Confirmed" 
                value={bedsConfirmed} 
                color="from-emerald-500 to-emerald-600"
              />
              <MetricCard 
                icon={BarChart3} 
                label="Progress" 
                value={`${progress.toFixed(0)}%`} 
                color="from-purple-500 to-purple-600"
              />
              <MetricCard 
                icon={Phone} 
                label="Calls Made" 
                value={stats.total} 
                color="from-orange-500 to-orange-600"
              />
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-8 mb-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-6">Campaign Progress</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Completion</span>
                  <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-slate-400 mt-4">
                  <span>{bedsConfirmed} confirmed</span>
                  <span>{bedsNeeded - bedsConfirmed} remaining</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <ResponsiveCard 
                icon={CheckCircle}
                title="Accepted" 
                value={stats.accepted} 
                color="from-emerald-500 to-emerald-600"
              />
              <ResponsiveCard 
                icon={XCircle}
                title="Declined" 
                value={stats.declined} 
                color="from-red-500 to-red-600"
              />
              <ResponsiveCard 
                icon={Clock}
                title="Pending" 
                value={stats.pending} 
                color="from-amber-500 to-amber-600"
              />
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-6">Campaign Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-sm mb-2">Shabbat Date</span>
                  <span className="text-white text-lg font-semibold">{campaign.shabbat_date}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 text-sm mb-2">Status</span>
                  <span className={`text-lg font-semibold w-fit px-3 py-1 rounded-full ${
                    campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                    campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-12 text-center border border-slate-700">
            <BarChart3 className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-xl text-slate-300 font-medium">No active campaign</p>
            <p className="text-slate-400 mt-2">Create a campaign from the admin menu to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color} text-white group-hover:scale-110 transition`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-slate-400 text-sm mb-2">{label}</p>
      <p className="text-4xl font-bold text-white">{value}</p>
    </div>
  );
}

function ResponsiveCard({ icon: Icon, title, value, color }: any) {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`p-4 rounded-lg bg-gradient-to-br ${color} text-white opacity-20`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
