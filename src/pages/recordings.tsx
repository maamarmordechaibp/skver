import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface SystemRecording {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  file_url: string | null;
  use_tts: boolean;
  tts_text: string;
  is_active: boolean;
  sort_order: number;
}

const CATEGORY_INFO: Record<string, { label: string; icon: string; description: string }> = {
  main_menu: { label: 'Main Menu', icon: '📞', description: 'Welcome message when someone calls' },
  identification: { label: 'Identification', icon: '👤', description: 'System identifies the caller' },
  beds_info: { label: 'Beds Information', icon: '🛏️', description: 'Telling caller their bed count' },
  confirmation: { label: 'Confirmation', icon: '✅', description: 'Prompts for confirming or changing' },
  thank_you: { label: 'Thank You', icon: '🙏', description: 'Completion and thank you messages' },
  registration: { label: 'Registration', icon: '📝', description: 'New host registration flow' },
  weekly: { label: 'Weekly Campaign', icon: '📣', description: 'Outbound call greetings' },
};

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<SystemRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const res = await fetch('/api/system-recordings');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecordings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadRecording = async (key: string, file: File) => {
    setUploading(key);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', key);

    try {
      const res = await fetch('/api/system-recordings', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Update local state
      setRecordings(recordings.map(r => 
        r.key === key ? { ...r, file_url: data.file_url, use_tts: false } : r
      ));
      alert('Recording uploaded successfully!');
    } catch (err: any) {
      alert('Error uploading: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  const clearRecording = async (key: string) => {
    if (!confirm('Remove this recording and use TTS instead?')) return;
    
    try {
      const res = await fetch('/api/system-recordings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, clear: true })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setRecordings(recordings.map(r => 
        r.key === key ? { ...r, file_url: null, use_tts: true } : r
      ));
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const playRecording = (recording: SystemRecording) => {
    if (playingKey === recording.key) {
      audioRef.current?.pause();
      speechSynthesis.cancel();
      setPlayingKey(null);
      return;
    }

    if (recording.file_url && audioRef.current) {
      audioRef.current.src = recording.file_url;
      audioRef.current.play();
      setPlayingKey(recording.key);
    } else {
      // Use browser TTS for preview
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(recording.tts_text);
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingKey(null);
      speechSynthesis.speak(utterance);
      setPlayingKey(recording.key);
    }
  };

  const handleFileSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadRecording(key, file);
    }
  };

  // Group recordings by category
  const groupedRecordings = recordings.reduce((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = [];
    acc[rec.category].push(rec);
    return acc;
  }, {} as Record<string, SystemRecording[]>);

  const categories = Object.keys(groupedRecordings).sort((a, b) => {
    const aOrder = recordings.find(r => r.category === a)?.sort_order || 0;
    const bOrder = recordings.find(r => r.category === b)?.sort_order || 0;
    return aOrder - bOrder;
  });

  const filteredCategories = selectedCategory === 'all' 
    ? categories 
    : categories.filter(c => c === selectedCategory);

  const withRecording = recordings.filter(r => r.file_url).length;
  const usingTTS = recordings.filter(r => !r.file_url).length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)' }}>
      <audio ref={audioRef} onEnded={() => setPlayingKey(null)} />
      
      <nav style={{ background: '#4F46E5', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏠 Guest House IVR
        </Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Dashboard', 'Hosts', 'Campaigns', 'Recordings'].map((item) => (
            <Link key={item} href={`/${item.toLowerCase()}`} style={{
              padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', color: 'white',
              background: item === 'Recordings' ? 'rgba(255,255,255,0.2)' : 'transparent'
            }}>{item}</Link>
          ))}
        </div>
      </nav>

      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>🎤 System Voice Messages</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Upload MP3 recordings for each IVR prompt or use Text-to-Speech</p>
        </div>

        {error && (
          <div style={{ background: '#7f1d1d', color: 'white', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
            Error: {error}
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
              Run the SQL setup file first: <code>SYSTEM_RECORDINGS_SETUP.sql</code>
            </p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Messages', value: recordings.length, color: '#6366f1', icon: '🎵' },
            { label: 'With Recording', value: withRecording, color: '#10b981', icon: '🎤' },
            { label: 'Using TTS', value: usingTTS, color: '#f59e0b', icon: '🔊' },
            { label: 'Categories', value: categories.length, color: '#3b82f6', icon: '📁' },
          ].map((stat, i) => (
            <div key={i} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>{stat.label}</span>
                <span style={{ fontSize: '20px' }}>{stat.icon}</span>
              </div>
              <div style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: selectedCategory === 'all' ? '#6366f1' : '#334155',
                color: 'white', fontWeight: '500'
              }}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: selectedCategory === cat ? '#6366f1' : '#334155',
                  color: 'white', fontWeight: '500'
                }}
              >
                {CATEGORY_INFO[cat]?.icon} {CATEGORY_INFO[cat]?.label || cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>
            Loading system recordings...
          </div>
        ) : (
          /* Recordings by Category */
          filteredCategories.map(category => (
            <div key={category} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '32px' }}>{CATEGORY_INFO[category]?.icon || '🎵'}</span>
                <div>
                  <h2 style={{ color: 'white', margin: 0, fontSize: '20px' }}>
                    {CATEGORY_INFO[category]?.label || category}
                  </h2>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
                    {CATEGORY_INFO[category]?.description || ''}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedRecordings[category]?.sort((a, b) => a.sort_order - b.sort_order).map(recording => (
                  <div key={recording.key} style={{
                    background: '#1e293b', borderRadius: '12px', border: '1px solid #334155',
                    padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'
                  }}>
                    {/* Status Indicator */}
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px', 
                      background: recording.file_url ? '#10b981' : '#f59e0b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', flexShrink: 0
                    }}>
                      {recording.file_url ? '🎤' : '🔊'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h3 style={{ color: 'white', margin: 0, fontSize: '16px' }}>{recording.name}</h3>
                        <span style={{
                          background: recording.file_url ? '#065f46' : '#78350f',
                          color: recording.file_url ? '#6ee7b7' : '#fcd34d',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600'
                        }}>
                          {recording.file_url ? 'HAS RECORDING' : 'TTS ONLY'}
                        </span>
                      </div>
                      <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>{recording.description}</p>
                      {!recording.file_url && (
                        <p style={{ color: '#64748b', margin: '8px 0 0 0', fontSize: '12px', fontStyle: 'italic' }}>
                          TTS: "{recording.tts_text}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {/* Play/Preview Button */}
                      <button
                        onClick={() => playRecording(recording)}
                        style={{
                          padding: '10px 16px', borderRadius: '8px', border: 'none',
                          background: playingKey === recording.key ? '#ef4444' : '#6366f1',
                          color: 'white', cursor: 'pointer', fontWeight: '500', fontSize: '14px'
                        }}
                      >
                        {playingKey === recording.key ? '⏹️ Stop' : '▶️ Play'}
                      </button>

                      {/* Upload Button */}
                      <input
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/wav"
                        ref={(el: HTMLInputElement | null) => { fileInputRefs.current[recording.key] = el; }}
                        onChange={(e) => handleFileSelect(recording.key, e)}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => fileInputRefs.current[recording.key]?.click()}
                        disabled={uploading === recording.key}
                        style={{
                          padding: '10px 16px', borderRadius: '8px', border: '1px solid #10b981',
                          background: 'transparent', color: '#10b981', cursor: 'pointer',
                          fontWeight: '500', fontSize: '14px',
                          opacity: uploading === recording.key ? 0.5 : 1
                        }}
                      >
                        {uploading === recording.key ? '⏳ Uploading...' : '⬆️ Upload MP3'}
                      </button>

                      {/* Clear Recording Button (only if has recording) */}
                      {recording.file_url && (
                        <button
                          onClick={() => clearRecording(recording.key)}
                          style={{
                            padding: '10px 16px', borderRadius: '8px', border: '1px solid #ef4444',
                            background: 'transparent', color: '#ef4444', cursor: 'pointer',
                            fontWeight: '500', fontSize: '14px'
                          }}
                        >
                          🗑️ Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {recordings.length === 0 && !loading && !error && (
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '60px', textAlign: 'center', border: '1px solid #334155' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎤</div>
            <h2 style={{ color: 'white', margin: '0 0 8px 0' }}>No System Recordings Found</h2>
            <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Run the SQL setup file to create the recording slots</p>
            <code style={{ background: '#0f172a', color: '#6ee7b7', padding: '8px 16px', borderRadius: '8px', fontSize: '14px' }}>
              SYSTEM_RECORDINGS_SETUP.sql
            </code>
          </div>
        )}

        {/* Info Box */}
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', marginTop: '32px' }}>
          <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '16px' }}>ℹ️ How It Works</h3>
          <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong style={{ color: '#10b981' }}>🎤 Has Recording:</strong> Your uploaded MP3 will play to callers
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong style={{ color: '#f59e0b' }}>🔊 TTS Only:</strong> Text-to-Speech will be used (male voice)
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: '#6366f1' }}>Admin Messages:</strong> Always use TTS with male voice - no recordings needed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
