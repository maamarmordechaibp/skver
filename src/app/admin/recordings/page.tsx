'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trash2, Edit2, Plus, Play } from 'lucide-react';

interface Recording {
  id: string;
  name: string;
  description?: string;
  category: string;
  mp3_url: string;
  duration_seconds?: number;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  'greeting',
  'new_host',
  'confirmation',
  'thank_you',
  'menu',
  'error',
  'admin',
  'registration',
  'campaign',
  'custom',
];

export default function RecordingsManager() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    mp3_url: '',
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('category')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecording = async () => {
    if (!formData.name || !formData.mp3_url) {
      alert('Please fill in name and MP3 URL');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('recordings')
          .update({
            name: formData.name,
            description: formData.description,
            category: formData.category,
            mp3_url: formData.mp3_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from('recordings').insert([
          {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            mp3_url: formData.mp3_url,
            is_active: true,
          },
        ]);

        if (error) throw error;
      }

      setFormData({
        name: '',
        description: '',
        category: 'custom',
        mp3_url: '',
      });
      setIsAddingNew(false);
      fetchRecordings();
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Error saving recording');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Error deleting recording');
    }
  };

  const handleEdit = (recording: Recording) => {
    setFormData({
      name: recording.name,
      description: recording.description || '',
      category: recording.category,
      mp3_url: recording.mp3_url,
    });
    setEditingId(recording.id);
    setIsAddingNew(true);
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      mp3_url: '',
    });
    setEditingId(null);
    setIsAddingNew(false);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      greeting: 'bg-blue-100 text-blue-800',
      new_host: 'bg-green-100 text-green-800',
      confirmation: 'bg-yellow-100 text-yellow-800',
      thank_you: 'bg-purple-100 text-purple-800',
      menu: 'bg-indigo-100 text-indigo-800',
      error: 'bg-red-100 text-red-800',
      admin: 'bg-orange-100 text-orange-800',
      registration: 'bg-pink-100 text-pink-800',
      campaign: 'bg-cyan-100 text-cyan-800',
      custom: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Recordings Manager</h1>
          <p className="text-gray-600">
            Manage MP3 recordings to replace text-to-speech in voice calls
          </p>
        </div>

        {/* Add/Edit Form */}
        {isAddingNew && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Recording' : 'Add New Recording'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recording Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Welcome Message"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What is this recording for?"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MP3 URL (Supabase Storage) *
                </label>
                <input
                  type="url"
                  value={formData.mp3_url}
                  onChange={(e) => setFormData({ ...formData, mp3_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to upload MP3 files:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to Supabase Dashboard → Storage</li>
                  <li>Create a new bucket called <code className="bg-white px-2 py-1">recordings</code></li>
                  <li>Upload your MP3 files to the bucket</li>
                  <li>Copy the public URL from the file details</li>
                  <li>Paste the URL here and save</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveRecording}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {editingId ? 'Update' : 'Create'} Recording
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Button */}
        {!isAddingNew && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="h-5 w-5" /> Add New Recording
          </button>
        )}

        {/* Recordings List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading recordings...</p>
          </div>
        ) : recordings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No recordings found. Create one to get started!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid gap-4 p-6">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{recording.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(recording.category)}`}>
                          {recording.category.replace('_', ' ')}
                        </span>
                      </div>
                      {recording.description && (
                        <p className="text-sm text-gray-600 mb-2">{recording.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        URL: <span className="font-mono break-all">{recording.mp3_url}</span>
                      </p>
                      {recording.duration_seconds && (
                        <p className="text-xs text-gray-500 mt-1">
                          Duration: {recording.duration_seconds}s
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {recording.mp3_url && (
                        <button
                          onClick={() => window.open(recording.mp3_url)}
                          title="Play recording"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Play className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(recording)}
                        title="Edit recording"
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(recording.id)}
                        title="Delete recording"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
