import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/useAuth';

interface Campaign {
  id: string;
  shabbat_date: string;
  beds_needed: number;
  beds_confirmed: number;
  status: string;
  custom_message_url?: string;
  created_at: string;
}

interface QueueItem {
  id: string;
  host_id: string;
  host_name?: string;
  host_phone?: string;
  host_beds?: number;
  host_city?: string;
  status: string;
  priority: number;
  attempts: number;
  is_calling?: boolean;
}

interface Response {
  id: string;
  host_id: string;
  host_name?: string;
  host_phone?: string;
  beds_offered: number;
  response_type: string;
  responded_at: string;
}

// Helper function to get next Saturday date
const getNextSaturday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7; // If today is Saturday, get next Saturday
  const nextSat = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
  return nextSat.toISOString().split('T')[0];
};

export default function CampaignsPage() {
  const { loading: authLoading, signOut } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'responses'>('queue');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [calling, setCalling] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newCampaign, setNewCampaign] = useState({
    shabbat_date: getNextSaturday(),
    beds_needed: 50,
  });
  
  const [editCampaign, setEditCampaign] = useState({
    beds_needed: 50,
    shabbat_date: '',
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchQueue(selectedCampaign.id);
      fetchResponses(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  // Auto-refresh queue every 5 seconds when calls are active
  useEffect(() => {
    if (selectedCampaign && queue.some(q => q.is_calling || q.status === 'calling')) {
      const interval = setInterval(() => {
        fetchQueue(selectedCampaign.id);
        fetchResponses(selectedCampaign.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedCampaign, queue]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns?action=queue&campaignId=${campaignId}`);
      const data = await res.json();
      setQueue(data.error ? [] : data);
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  const fetchResponses = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns?action=responses&campaignId=${campaignId}`);
      const data = await res.json();
      setResponses(data.error ? [] : data);
    } catch (err) {
      console.error('Error fetching responses:', err);
    }
  };

  const createCampaign = async () => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCampaigns([data, ...campaigns]);
      setSelectedCampaign(data);
      setShowCreateModal(false);
    } catch (err: any) {
      alert('Error creating campaign: ' + err.message);
    }
  };

  const openEditModal = () => {
    if (!selectedCampaign) return;
    setEditCampaign({
      beds_needed: selectedCampaign.beds_needed || 50,
      shabbat_date: selectedCampaign.shabbat_date,
    });
    setShowEditModal(true);
  };

  const saveCampaign = async () => {
    if (!selectedCampaign) return;
    setSaving(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCampaign.id,
          beds_needed: editCampaign.beds_needed,
          shabbat_date: editCampaign.shabbat_date,
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Update local state
      const updated = { ...selectedCampaign, ...data };
      setSelectedCampaign(updated);
      setCampaigns(campaigns.map(c => c.id === updated.id ? updated : c));
      setShowEditModal(false);
    } catch (err: any) {
      alert('Error saving campaign: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0] || !selectedCampaign) return;
    
    setUploading(true);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaignId', selectedCampaign.id);

    try {
      const res = await fetch('/api/campaign-upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert('Recording uploaded successfully!');
      setShowUploadModal(false);
      // Update the selected campaign with the new URL
      if (data.campaign) {
        setSelectedCampaign(data.campaign);
      }
      fetchCampaigns();
    } catch (err: any) {
      alert('Error uploading: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const startCalling = async () => {
    if (!selectedCampaign) return;
    setCalling(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_calls', campaignId: selectedCampaign.id })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(`Queued ${data.queued || 0} hosts. Calling ${data.called || 0} now!${data.warning ? '\n⚠️ ' + data.warning : ''}`);
      fetchQueue(selectedCampaign.id);
      fetchResponses(selectedCampaign.id);
    } catch (err: any) {
      alert('Error starting calls: ' + err.message);
    } finally {
      setCalling(false);
    }
  };

  const skipHost = async (queueItemId: string, hostName: string) => {
    if (!confirm(`Skip ${hostName} for this week's campaign?`)) return;
    
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip_host', queueItemId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Remove from queue locally
      setQueue(queue.filter(q => q.id !== queueItemId));
    } catch (err: any) {
      alert('Error skipping host: ' + err.message);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedCampaign) return;
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCampaign.id, status })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedCampaign({ ...selectedCampaign, status });
      fetchCampaigns();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w || !selectedCampaign) return;
    
    const acceptedBeds = responses.filter(r => r.response_type === 'accepted').reduce((sum, r) => sum + r.beds_offered, 0);
    
    w.document.write(`
      <html>
        <head>
          <title>Campaign Report - ${selectedCampaign.shabbat_date}</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { color: #4F46E5; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #4F46E5; color: white; }
            .accepted { color: green; font-weight: bold; }
            .declined { color: red; }
            .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>🏠 Guest House Campaign Report</h1>
          <p><strong>Shabbat Date:</strong> ${new Date(selectedCampaign.shabbat_date).toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${selectedCampaign.status}</p>
          <div class="summary">
            <h3>Summary</h3>
            <p>Beds Needed: <strong>${selectedCampaign.beds_needed}</strong></p>
            <p>Beds Confirmed: <strong>${acceptedBeds}</strong></p>
            <p>Progress: <strong>${Math.round((acceptedBeds / selectedCampaign.beds_needed) * 100)}%</strong></p>
            <p>Accepted: ${responses.filter(r => r.response_type === 'accepted').length} | Declined: ${responses.filter(r => r.response_type === 'declined').length}</p>
          </div>
          <h2>Accepted Hosts (${responses.filter(r => r.response_type === 'accepted').length})</h2>
          <table>
            <tr><th>#</th><th>Name</th><th>Phone</th><th>Beds</th><th>Response Time</th></tr>
            ${responses.filter(r => r.response_type === 'accepted').map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.host_name || 'Unknown'}</td>
                <td>${r.host_phone || '-'}</td>
                <td><strong>${r.beds_offered}</strong></td>
                <td>${new Date(r.responded_at).toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>
          <h2>Declined/Other (${responses.filter(r => r.response_type !== 'accepted').length})</h2>
          <table>
            <tr><th>#</th><th>Name</th><th>Phone</th><th>Status</th><th>Time</th></tr>
            ${responses.filter(r => r.response_type !== 'accepted').map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.host_name || 'Unknown'}</td>
                <td>${r.host_phone || '-'}</td>
                <td class="${r.response_type}">${r.response_type.toUpperCase()}</td>
                <td>${new Date(r.responded_at).toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>
          <hr/>
          <p style="color: #666; font-size: 12px;">Generated: ${new Date().toLocaleString()} | Guest House IVR System</p>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const getStatusColor = (s: string) => ({ active: '#10b981', completed: '#3b82f6', draft: '#f59e0b', calling: '#ef4444', skipped: '#64748b' }[s] || '#64748b');

  const acceptedCount = responses.filter(r => r.response_type === 'accepted').length;
  const declinedCount = responses.filter(r => r.response_type === 'declined').length;
  const acceptedBeds = responses.filter(r => r.response_type === 'accepted').reduce((sum, r) => sum + r.beds_offered, 0);
  
  const pendingQueue = queue.filter(q => q.status === 'pending');
  const callingNow = queue.filter(q => q.status === 'calling' || q.is_calling);
  const completedQueue = queue.filter(q => ['completed', 'no_answer', 'failed'].includes(q.status));

  if (authLoading) {
    return <div style={{ minHeight: '100vh', background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#94a3b8', fontSize: '18px' }}>Loading...</div></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)' }}>
      <nav style={{ background: '#4F46E5', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏠 Guest House IVR
        </Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Dashboard', 'Hosts', 'Campaigns', 'Recordings'].map((item) => (
            <Link key={item} href={`/${item.toLowerCase()}`} style={{
              padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', color: 'white',
              background: item === 'Campaigns' ? 'rgba(255,255,255,0.2)' : 'transparent'
            }}>{item}</Link>
          ))}
          <button onClick={signOut} style={{ color: 'white', padding: '8px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.5)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>📣 Campaign Management</h1>
            <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Create campaigns, manage call queue, track responses</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} style={{
            background: '#10b981', color: 'white', border: 'none', padding: '12px 24px',
            borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
          }}>
            ➕ New Campaign
          </button>
        </div>

        {error && <div style={{ background: '#7f1d1d', color: 'white', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>Error: {error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
          {/* Campaign List */}
          <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #334155' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '16px' }}>📋 Campaigns</h3>
            </div>
            <div style={{ maxHeight: '600px', overflow: 'auto' }}>
              {campaigns.map(c => (
                <div key={c.id} onClick={() => setSelectedCampaign(c)} style={{
                  padding: '16px', cursor: 'pointer', borderBottom: '1px solid #334155',
                  background: selectedCampaign?.id === c.id ? '#334155' : 'transparent'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontWeight: '500' }}>{formatDate(c.shabbat_date)}</span>
                    <span style={{ background: getStatusColor(c.status), color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                    {c.beds_confirmed}/{c.beds_needed} beds
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No campaigns yet
                </div>
              )}
            </div>
          </div>

          {/* Campaign Details */}
          {selectedCampaign ? (
            <div>
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => setShowUploadModal(true)} style={{
                  background: '#6366f1', color: 'white', border: 'none', padding: '10px 20px',
                  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  🎤 Upload Recording
                </button>
                <button onClick={startCalling} disabled={calling || (selectedCampaign.status !== 'active' && selectedCampaign.status !== 'pending')} style={{
                  background: calling ? '#64748b' : '#10b981', color: 'white', border: 'none', padding: '10px 20px',
                  borderRadius: '8px', cursor: calling || (selectedCampaign.status !== 'active' && selectedCampaign.status !== 'pending') ? 'not-allowed' : 'pointer'
                }}>
                  {calling ? '📞 Calling...' : '📞 Start Calls'}
                </button>
                <button onClick={printReport} style={{
                  background: '#f59e0b', color: 'white', border: 'none', padding: '10px 20px',
                  borderRadius: '8px', cursor: 'pointer'
                }}>
                  🖨️ Print Report
                </button>
                <button onClick={openEditModal} style={{
                  background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px',
                  borderRadius: '8px', cursor: 'pointer'
                }}>
                  ✏️ Edit Campaign
                </button>
                {selectedCampaign.status === 'draft' && (
                  <button onClick={() => updateStatus('active')} style={{
                    background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'
                  }}>✅ Activate</button>
                )}
                {selectedCampaign.status === 'active' && (
                  <button onClick={() => updateStatus('completed')} style={{
                    background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'
                  }}>🏁 Complete</button>
                )}
              </div>

              {/* Recording Status */}
              <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎤</span>
                  <div>
                    <div style={{ color: 'white', fontWeight: '500' }}>Campaign Recording</div>
                    {selectedCampaign.custom_message_url ? (
                      <div style={{ color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✓ Recording uploaded</span>
                        <audio controls style={{ height: '30px', marginLeft: '8px' }}>
                          <source src={selectedCampaign.custom_message_url} type="audio/mpeg" />
                        </audio>
                      </div>
                    ) : (
                      <div style={{ color: '#f59e0b', fontSize: '13px' }}>⚠️ No recording - using default system message</div>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowUploadModal(true)} style={{
                  background: selectedCampaign.custom_message_url ? '#334155' : '#6366f1', 
                  color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                }}>
                  {selectedCampaign.custom_message_url ? '🔄 Replace' : '📤 Upload'}
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Target', value: selectedCampaign.beds_needed, color: '#3b82f6', icon: '🎯' },
                  { label: 'Confirmed', value: acceptedBeds, color: '#10b981', icon: '✅' },
                  { label: 'In Queue', value: pendingQueue.length, color: '#f59e0b', icon: '📋' },
                  { label: 'Calling Now', value: callingNow.length, color: '#ef4444', icon: '📞' },
                  { label: 'Accepted', value: acceptedCount, color: '#10b981', icon: '👍' },
                  { label: 'Declined', value: declinedCount, color: '#ef4444', icon: '👎' },
                ].map((stat, i) => (
                  <div key={i} style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>{stat.label}</span>
                      <span style={{ fontSize: '16px' }}>{stat.icon}</span>
                    </div>
                    <div style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'white', fontWeight: '500' }}>Progress: {acceptedBeds}/{selectedCampaign.beds_needed} beds</span>
                  <span style={{ color: '#10b981' }}>{Math.round((acceptedBeds / selectedCampaign.beds_needed) * 100)}%</span>
                </div>
                <div style={{ height: '16px', background: '#334155', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                    width: `${Math.min(100, (acceptedBeds / selectedCampaign.beds_needed) * 100)}%`,
                    transition: 'width 0.5s'
                  }} />
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                  { key: 'queue', label: `📋 Call Queue (${queue.length})` },
                  { key: 'responses', label: `📊 Responses (${responses.length})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    style={{
                      padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: activeTab === tab.key ? '#4F46E5' : '#1e293b',
                      color: 'white', fontWeight: '500'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Call Queue Tab */}
              {activeTab === 'queue' && (
                <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                  {/* Currently Calling */}
                  {callingNow.length > 0 && (
                    <div style={{ padding: '16px', borderBottom: '1px solid #334155', background: '#7f1d1d20' }}>
                      <h4 style={{ color: '#ef4444', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}></span>
                        Currently Calling ({callingNow.length})
                      </h4>
                      {callingNow.map(q => (
                        <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#7f1d1d40', borderRadius: '8px', marginBottom: '8px' }}>
                          <div>
                            <span style={{ color: 'white', fontWeight: '500' }}>{q.host_name || 'Unknown'}</span>
                            <span style={{ color: '#94a3b8', marginLeft: '12px' }}>{q.host_phone}</span>
                            <span style={{ color: '#64748b', marginLeft: '12px', fontSize: '13px' }}>{q.host_beds} beds</span>
                          </div>
                          <span style={{ color: '#ef4444', fontWeight: '500' }}>📞 Ringing...</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending Queue */}
                  <div style={{ padding: '16px', borderBottom: '1px solid #334155' }}>
                    <h4 style={{ color: 'white', margin: '0 0 12px 0' }}>📋 Upcoming Calls ({pendingQueue.length})</h4>
                    {pendingQueue.length === 0 ? (
                      <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No pending calls in queue</div>
                    ) : (
                      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                        {pendingQueue.map((q, i) => (
                          <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ color: '#64748b', width: '30px' }}>#{i + 1}</span>
                              <div>
                                <div style={{ color: 'white', fontWeight: '500' }}>{q.host_name || 'Unknown'}</div>
                                <div style={{ color: '#94a3b8', fontSize: '13px' }}>{q.host_phone} • {q.host_city || '-'}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ color: '#3b82f6', fontWeight: '500' }}>{q.host_beds} beds</span>
                              <button
                                onClick={() => skipHost(q.id, q.host_name || 'this host')}
                                style={{
                                  background: '#7f1d1d', color: '#ef4444', border: 'none', padding: '6px 12px',
                                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                                }}
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Completed/Failed */}
                  {completedQueue.length > 0 && (
                    <div style={{ padding: '16px' }}>
                      <h4 style={{ color: '#64748b', margin: '0 0 12px 0' }}>✓ Completed ({completedQueue.length})</h4>
                      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {completedQueue.map(q => (
                          <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #334155' }}>
                            <span style={{ color: '#94a3b8' }}>{q.host_name || 'Unknown'}</span>
                            <span style={{ color: q.status === 'completed' ? '#10b981' : '#ef4444', fontSize: '13px' }}>
                              {q.status === 'completed' ? '✓ Answered' : q.status === 'no_answer' ? '✗ No Answer' : '✗ Failed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Responses Tab */}
              {activeTab === 'responses' && (
                <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#334155', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Host</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Phone</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Response</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Beds</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8' }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '12px 16px', color: 'white' }}>{r.host_name || 'Unknown'}</td>
                            <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{r.host_phone || '-'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                background: r.response_type === 'accepted' ? '#10b981' : r.response_type === 'declined' ? '#ef4444' : r.response_type === 'callback' ? '#3b82f6' : '#f59e0b',
                                color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '13px'
                              }}>
                                {r.response_type === 'callback' ? '📞 Callback' : r.response_type}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'white', fontWeight: '500' }}>{r.beds_offered}</td>
                            <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                              {new Date(r.responded_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {responses.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No responses yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '60px', textAlign: 'center', border: '1px solid #334155' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📣</div>
              <h2 style={{ color: 'white' }}>No Campaign Selected</h2>
              <p style={{ color: '#94a3b8' }}>Select or create a campaign</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '32px', width: '400px', border: '1px solid #334155' }}>
            <h2 style={{ color: 'white', margin: '0 0 24px 0' }}>➕ Create Campaign</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Shabbat Date</label>
              <input type="date" value={newCampaign.shabbat_date} onChange={(e) => setNewCampaign({ ...newCampaign, shabbat_date: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Beds Needed</label>
              <input type="number" value={newCampaign.beds_needed} onChange={(e) => setNewCampaign({ ...newCampaign, beds_needed: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createCampaign} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '32px', width: '400px', border: '1px solid #334155' }}>
            <h2 style={{ color: 'white', margin: '0 0 8px 0' }}>🎤 Upload Recording</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 24px 0', fontSize: '14px' }}>
              This is the introduction message played when the system calls hosts asking for beds.
            </p>
            <form onSubmit={uploadRecording}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>MP3 File</label>
                <input ref={fileInputRef} type="file" accept="audio/mp3,audio/mpeg"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowUploadModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={uploading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: uploading ? '#64748b' : '#6366f1', color: 'white', cursor: uploading ? 'not-allowed' : 'pointer' }}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && selectedCampaign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '32px', width: '420px', border: '1px solid #334155' }}>
            <h2 style={{ color: 'white', margin: '0 0 8px 0' }}>✏️ Edit Campaign</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 24px 0', fontSize: '14px' }}>
              Update campaign settings
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Date (Shabbat)</label>
              <input type="date" value={editCampaign.shabbat_date}
                onChange={e => setEditCampaign({ ...editCampaign, shabbat_date: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', boxSizing: 'border-box' }} />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Beds Needed</label>
              <input type="number" value={editCampaign.beds_needed} min="1"
                onChange={e => setEditCampaign({ ...editCampaign, beds_needed: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', boxSizing: 'border-box' }} />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ 
                flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', 
                background: 'transparent', color: '#94a3b8', cursor: 'pointer' 
              }}>
                Cancel
              </button>
              <button onClick={saveCampaign} disabled={saving} style={{ 
                flex: 1, padding: '12px', borderRadius: '8px', border: 'none', 
                background: saving ? '#64748b' : '#10b981', color: 'white', 
                cursor: saving ? 'not-allowed' : 'pointer' 
              }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
