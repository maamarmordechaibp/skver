"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useAuth } from '../lib/useAuth';

interface Campaign {
  id: string;
  shabbat_date: string;
  beds_needed: number;
  beds_confirmed: number;
  status: string;
  custom_message_url: string;
  created_at: string;
}

interface DashboardData {
  campaign: Campaign | null;
  hosts: any[];
  calls: any[];
  responses: any[];
  stats: {
    totalBeds: number;
    totalHosts: number;
    totalCalls: number;
    accepted: number;
    declined: number;
    pending: number;
  };
}

export default function DashboardPage() {
  const { loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setData(json);
        setError(null);
        setLastUpdate(new Date());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const campaign = data?.campaign;
  const stats = data?.stats || { totalBeds: 0, totalHosts: 0, totalCalls: 0, accepted: 0, declined: 0, pending: 0 };
  const bedsNeeded = campaign?.beds_needed || 0;
  const bedsConfirmed = campaign?.beds_confirmed || 0;
  const progress = bedsNeeded > 0 ? (bedsConfirmed / bedsNeeded) * 100 : 0;

  const formatTime = (d: string) => { try { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch { return '--'; } };
  const formatPhone = (p: string) => { if (!p) return ''; const c = p.replace(/\D/g, ''); return c.length === 11 ? `(${c.slice(1,4)}) ${c.slice(4,7)}-${c.slice(7)}` : p; };
  const getColor = (s: string) => { const m: Record<string, string> = { completed: '#10b981', accepted: '#10b981', 'in-progress': '#3b82f6', declined: '#ef4444', pending: '#f59e0b' }; return m[s?.toLowerCase()] || '#6b7280'; };

  const styles = {
    page: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh', background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)' },
    nav: { background: 'rgba(79, 70, 229, 0.95)', padding: '12px 24px', position: 'sticky' as const, top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
    navInner: { maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { color: 'white', fontSize: '22px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' },
    navLinks: { display: 'flex', gap: '8px' },
    navLink: (active: boolean) => ({ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', background: active ? 'rgba(255,255,255,0.2)' : 'transparent', fontSize: '14px', fontWeight: '500' }),
    main: { maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' },
    card: { background: '#1e293b', borderRadius: '14px', padding: '20px', border: '1px solid #334155' },
    cardTitle: { fontSize: '16px', fontWeight: '600', color: 'white', margin: 0 },
    listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#334155', borderRadius: '10px' },
  };

  if (authLoading) {
    return <div style={{ minHeight: '100vh', background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#94a3b8', fontSize: '18px' }}>Loading...</div></div>;
  }

  return (
    <>
      <Head><title>Dashboard - Guest House IVR</title></Head>
      <div style={styles.page}>
        <nav style={styles.nav}>
          <div style={styles.navInner}>
            <Link href="/" style={styles.logo}><span style={{ fontSize: '28px' }}>🏠</span>Guest House IVR</Link>
            <div style={styles.navLinks}>
              {[{ href: '/dashboard', label: '📊 Dashboard' }, { href: '/hosts', label: '👥 Hosts' }, { href: '/campaigns', label: '📢 Campaigns' }, { href: '/recordings', label: '🎙️ Recordings' }].map(i => (
                <Link key={i.href} href={i.href} style={styles.navLink(i.href === '/dashboard')}>{i.label}</Link>
              ))}
              <button onClick={signOut} style={{ color: 'white', padding: '8px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.5)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Logout</button>
            </div>
          </div>
        </nav>

        <div style={styles.main}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '700', color: 'white', margin: 0 }}>Campaign Dashboard</h1>
              <p style={{ color: '#94a3b8', marginTop: '8px' }}>Real-time monitoring and campaign insights</p>
            </div>
            <div style={{ textAlign: 'right' }} suppressHydrationWarning>
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>{mounted ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : '...'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', justifyContent: 'flex-end' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '500' }}>Live</span>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: '12px', padding: '16px', marginBottom: '24px', color: '#fecaca' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px' }}><p style={{ color: '#94a3b8' }}>Loading dashboard...</p></div>
          ) : (
            <>
              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { icon: '🛏️', label: 'Total Beds', value: stats.totalBeds, color: '#10b981' },
                  { icon: '✅', label: 'Confirmed', value: bedsConfirmed, color: '#3b82f6' },
                  { icon: '🎯', label: 'Target', value: bedsNeeded, color: '#8b5cf6' },
                  { icon: '📞', label: 'Calls', value: stats.totalCalls, color: '#f97316' },
                  { icon: '👥', label: 'Active Hosts', value: stats.totalHosts, color: '#ec4899' },
                ].map((m, i) => (
                  <div key={i} style={{ ...styles.card, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '24px', opacity: 0.6 }}>{m.icon}</div>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>{m.label}</p>
                    <p style={{ color: 'white', fontSize: '32px', fontWeight: '700', margin: 0 }}>{m.value}</p>
                    <div style={{ width: '40px', height: '4px', background: m.color, borderRadius: '2px', marginTop: '12px' }} />
                  </div>
                ))}
              </div>

              {/* Campaign Progress */}
              {campaign ? (
                <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'white', margin: 0 }}>
                        Campaign for {new Date(campaign.shabbat_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </h2>
                      <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0' }}>Status: <span style={{ color: '#10b981' }}>{campaign.status}</span></p>
                    </div>
                    <span style={{ color: '#38bdf8', fontSize: '32px', fontWeight: '700' }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: '12px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '6px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '14px' }}>
                    <span style={{ color: '#10b981' }}>{bedsConfirmed} confirmed</span>
                    <span style={{ color: '#f59e0b' }}>{bedsNeeded - bedsConfirmed} remaining</span>
                  </div>
                </div>
              ) : (
                <div style={{ ...styles.card, textAlign: 'center', padding: '40px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '48px' }}>📢</span>
                  <p style={{ color: '#cbd5e1', fontSize: '18px', margin: '16px 0 8px' }}>No Active Campaign</p>
                  <p style={{ color: '#94a3b8' }}>Call the phone line and press 8 to start a campaign</p>
                </div>
              )}

              {/* Queue Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Accepted', value: stats.accepted, icon: '✅', color: '#10b981' },
                  { label: 'Declined', value: stats.declined, icon: '❌', color: '#ef4444' },
                  { label: 'Pending', value: stats.pending, icon: '⏳', color: '#f59e0b' },
                  { label: 'Total Queue', value: stats.accepted + stats.declined + stats.pending, icon: '📋', color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{s.icon}</span>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>{s.label}</span>
                      </div>
                      <p style={{ color: 'white', fontSize: '28px', fontWeight: '700', margin: 0 }}>{s.value}</p>
                    </div>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Three Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                {/* Recent Calls */}
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={styles.cardTitle}>📞 Recent Calls</h3>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>{data?.calls?.length || 0}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                    {(data?.calls || []).length > 0 ? (data?.calls || []).slice(0, 10).map((call: any) => (
                      <div key={call.id} style={{ ...styles.listItem, borderLeft: `3px solid ${getColor(call.status)}` }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{call.direction === 'inbound' ? '📞' : '📲'}</span>
                            <span style={{ color: 'white', fontWeight: '500', fontSize: '14px' }}>{call.host?.name || formatPhone(call.from_number)}</span>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                            {formatTime(call.created_at)} {call.duration ? `• ${call.duration}s` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: getColor(call.status) + '20', color: getColor(call.status) }}>{call.status}</span>
                      </div>
                    )) : <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No calls yet</p>}
                  </div>
                </div>

                {/* Hosts with Beds */}
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={styles.cardTitle}>🛏️ Available Beds</h3>
                    <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>{stats.totalBeds} total</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                    {(data?.hosts || []).length > 0 ? (data?.hosts || []).slice(0, 10).map((host: any) => (
                      <div key={host.id} style={styles.listItem}>
                        <div>
                          <div style={{ color: 'white', fontWeight: '500', fontSize: '14px' }}>{host.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{host.city ? `${host.city}, ${host.state}` : formatPhone(host.phone_number)}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: 'white', padding: '8px 14px', borderRadius: '8px', fontSize: '16px', fontWeight: '700' }}>{host.total_beds}</div>
                      </div>
                    )) : <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No hosts with beds</p>}
                  </div>
                </div>

                {/* Recent Responses */}
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={styles.cardTitle}>📝 Responses</h3>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>{data?.responses?.length || 0}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                    {(data?.responses || []).length > 0 ? (data?.responses || []).slice(0, 10).map((resp: any) => (
                      <div key={resp.id} style={{ ...styles.listItem, borderLeft: `3px solid ${getColor(resp.response_type)}` }}>
                        <div>
                          <div style={{ color: 'white', fontWeight: '500', fontSize: '14px' }}>{resp.host?.name || 'Unknown'}</div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{formatTime(resp.responded_at)} • {resp.response_method}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: getColor(resp.response_type) + '20', color: getColor(resp.response_type) }}>{resp.response_type}</span>
                          {resp.beds_offered > 0 && <div style={{ color: '#10b981', fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>+{resp.beds_offered}</div>}
                        </div>
                      </div>
                    )) : <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No responses</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
