import Link from "next/link";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Guest House IVR System</title>
        <meta name="description" content="Phone campaign management system" />
      </Head>
      <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)' }}>
        {/* Navbar */}
        <nav style={{ background: '#4F46E5', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🏠</span>
              <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>Guest House IVR</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', fontSize: '14px', fontWeight: '500' }}>📊 Dashboard</Link>
              <Link href="/hosts" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', fontSize: '14px', fontWeight: '500' }}>👥 Hosts</Link>
              <Link href="/campaigns" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', fontSize: '14px', fontWeight: '500' }}>📢 Campaigns</Link>
              <Link href="/recordings" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', fontSize: '14px', fontWeight: '500' }}>🎙️ Recordings</Link>
            </div>
          </div>
        </nav>
        
        {/* Main Content */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px' }}>
          {/* Hero Section */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
              Guest House IVR System
            </h1>
            <p style={{ fontSize: '20px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
              Manage your phone campaigns, track host availability, and coordinate Shabbat guest placement efficiently.
            </p>
          </div>
          
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
            <div style={{ background: '#1e293b', borderRadius: '14px', padding: '24px', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📞</div>
              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>Phone Line</div>
              <div style={{ color: '#10b981', fontSize: '18px', fontWeight: '600' }}>+1-845-935-0513</div>
            </div>
            <div style={{ background: '#1e293b', borderRadius: '14px', padding: '24px', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛏️</div>
              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>Available Beds</div>
              <div style={{ color: '#3b82f6', fontSize: '24px', fontWeight: '600' }}>14</div>
            </div>
            <div style={{ background: '#1e293b', borderRadius: '14px', padding: '24px', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>Active Hosts</div>
              <div style={{ color: '#a855f7', fontSize: '24px', fontWeight: '600' }}>5</div>
            </div>
            <div style={{ background: '#1e293b', borderRadius: '14px', padding: '24px', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📢</div>
              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>Campaign Status</div>
              <div style={{ color: '#10b981', fontSize: '18px', fontWeight: '600' }}>Active</div>
            </div>
          </div>
          
          {/* Navigation Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '40px' }}>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#1e293b', borderRadius: '14px', padding: '32px', border: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>📊</div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'white', margin: 0 }}>Dashboard</h2>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Real-time monitoring</p>
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6' }}>
                  View campaign progress, track calls in real-time, monitor host responses, and see bed availability at a glance.
                </p>
              </div>
            </Link>
            
            <Link href="/hosts" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#1e293b', borderRadius: '14px', padding: '32px', border: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>👥</div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'white', margin: 0 }}>Hosts</h2>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Volunteer management</p>
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6' }}>
                  Manage registered hosts, view contact details and bed counts, filter by city or registration status.
                </p>
              </div>
            </Link>
            
            <Link href="/campaigns" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#1e293b', borderRadius: '14px', padding: '32px', border: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>📢</div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'white', margin: 0 }}>Campaigns</h2>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Shabbat outreach</p>
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6' }}>
                  Create and manage weekly Shabbat campaigns, track progress, and coordinate outbound calls to hosts.
                </p>
              </div>
            </Link>

            <Link href="/recordings" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#1e293b', borderRadius: '14px', padding: '32px', border: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🎙️</div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'white', margin: 0 }}>Recordings</h2>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Voice prompts</p>
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6' }}>
                  Manage IVR voice recordings, custom messages, and audio prompts used throughout the phone system.
                </p>
              </div>
            </Link>
          </div>

          {/* Phone System Info */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e293b)', borderRadius: '14px', padding: '32px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#10b981' }}>●</span> Voice System Active
                </h3>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>
                  The phone system is operational and ready to receive calls.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>Call this number:</div>
                <div style={{ color: '#10b981', fontSize: '28px', fontWeight: 'bold' }}>+1-845-935-0513</div>
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 20px' }}>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Press 1</div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Report Availability</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 20px' }}>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Press 2</div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Register as Host</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 20px' }}>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Press 3</div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Contact Office</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 20px' }}>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Press 8</div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Admin Options</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
