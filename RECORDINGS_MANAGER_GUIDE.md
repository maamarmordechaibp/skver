# Voice Recordings Manager - Complete Guide

## Overview

Your phone system now supports **both Text-to-Speech (TTS) and MP3 recordings**. You can manage all voice messages from the admin dashboard without touching code.

## Features

✅ **Replace TTS with MP3 Files** - Upload custom voice recordings to replace auto-generated speech  
✅ **Category-Based Management** - Organize recordings by use case (greeting, confirmation, error, etc.)  
✅ **Dashboard UI** - Easy-to-use admin page to add, edit, and delete recordings  
✅ **Automatic Fallback** - If a recording isn't available, system automatically uses TTS  
✅ **Live Updates** - Changes take effect immediately on next incoming call  

---

## Setup Instructions

### Step 1: Create Recordings Table in Supabase

**Go to SQL Editor** in [your Supabase Dashboard](https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve)

1. Click **SQL Editor** → **New Query**
2. Copy entire contents of [RECORDINGS_SETUP.sql](../RECORDINGS_SETUP.sql)
3. Click **Run**

This creates:
- ✅ `recordings` table with 10 default entries
- ✅ Indexes for fast lookup
- ✅ `get_recording_url()` function

### Step 2: Upload MP3 Files to Supabase Storage

1. Go to **Storage** in Supabase Dashboard
2. Click **Create Bucket** → name it `recordings`
3. Upload your MP3 files
4. For each file, click **→ More** → **Copy URL**
5. Keep URLs handy for step 3

**Best Audio Specs:**
- Format: MP3 (mono or stereo)
- Bit rate: 128 kbps or higher
- Sample rate: 16 kHz or 44.1 kHz
- Duration: 3-30 seconds per message

### Step 3: Add Recordings via Admin Dashboard

1. **Start your Next.js app:**
   ```bash
   npm run dev
   ```

2. **Open Admin Dashboard:**
   - Navigate to: `http://localhost:3000/admin/recordings`
   - (Or your deployed URL: `https://your-app.com/admin/recordings`)

3. **Click "Add New Recording"**
   - **Name**: e.g., "Custom Welcome Message"
   - **Description**: What this recording is used for
   - **Category**: Choose from list below
   - **MP3 URL**: Paste the URL from Storage

4. **Click "Save Recording"**

Done! Your recording is now available to voice calls.

---

## Recording Categories

| Category | Used For | Example |
|----------|----------|---------|
| `greeting` | First message when caller cts | "Welcome to our system" |
| `new_host` | For unregistered callers | "We don't recognize your number" |
| `confirmation` | Asking to confirm information | "Confirm you have 5 beds available" |
| `thank_you` | After successful interaction | "Thank you for your response" |
| `menu` | Menu options announcement | "Press 1 for registration, 2 for availability" |
| `error` | Invalid input handling | "I didn't understand that. Try again" |
| `admin` | Admin-specific prompts | "Enter your admin PIN" |
| `registration` | Registration flow messages | "Let's get you registered" |
| `campaign` | Campaign-specific messages | "We need hosts for Shabbat" |
| `custom` | Any custom messages | Your own recordings |

---

## How Voice Calls Work

### Call Flow with Recordings

```
1. Caller dials your number
   ↓
2. System checks: Does category have a recording?
   ├─ YES → Play MP3 recording
   └─ NO  → Use Text-to-Speech (TTS) fallback
   ↓
3. Wait for caller input (if Gather enabled)
   ↓
4. Process response
```

### Example: Registration Flow

1. **New caller unknown number**
   - Category: `new_host`
   - Recording (if exists): Custom MP3
   - TTS Fallback: "We don't recognize your number..."

2. **Asking for bed count**
   - Category: `registration`
   - Recording (if exists): "Please tell us how many beds..."
   - TTS Fallback: Auto-generated message

3. **Confirmation**
   - Category: `confirmation`
   - Recording (if exists): "You said 5 beds, confirm?"
   - TTS Fallback: Auto-generated TTS

---

## Tips for Best Results

### Record High-Quality Audio

✅ **DO:**
- Use quiet environment
- Speak clearly and at normal pace
- Use professional microphone if possible
- Record at 44.1 kHz / 128 kbps MP3

❌ **DON'T:**
- Record in noisy/echoey rooms
- Speak too fast or too quiet
- Use very dramatic/unnatural tone
- Create <2s or >30s messages

### Organize Your Categories

- Create one recording per **message type**, not per phrase
- Use a naming convention: `greeting-welcome`, `error-invalid-input`
- Description field should explain usage context
- Keep descriptions short (1 sentence)

### Testing Recordings

1. After creating a recording, click **Play** button to preview
2. Call your system to test the new message
3. Check Supabase logs if message doesn't play (error section)

---

## Managing Recordings via Dashboard

### View All Recordings
- All recordings grouped by category
- See URL, duration, status at a glance
- Filter by active/inactive

### Edit Recording
1. Click **Edit** button on any recording
2. Change name, description, category, or URL
3. Click **Save Recording**
4. Takes effect on next call

### Delete Recording
1. Click **Trash** button on any recording
2. Confirm deletion
3. System automatically falls back to TTS

### Inactive Recordings
- Toggle `is_active` to false if you want to pause a recording
- System will use TTS fallback until you reactivate it

---

## Advanced: Using Recordings in Code

If you want to integrate recordings into custom voice functions:

### Import the Recording Builder

```typescript
import { RecordingLaMLBuilder } from '../_shared/laml-builder-with-recordings.ts';

const builder = new RecordingLaMLBuilder(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Use it in your voice function
const laml = await builder.createResponse([
  {
    category: 'greeting',
    tts: 'Welcome to our system',
  },
]);

return new Response(laml, {
  status: 200,
  headers: { 'Content-Type': 'application/xml' },
});
```

### Available Methods

```typescript
// Play message (recording or TTS fallback)
const message = await builder.playMessage(
  'greeting',           // Category
  'Welcome message',    // TTS fallback text
  'man',               // Voice (man/woman)
  'en-US'              // Language
);

// Create complete LaML response with gather
const laml = await builder.createResponse(
  [
    { category: 'greeting', tts: 'Welcome' },
    { category: 'menu', tts: 'Press 1 or 2' }
  ],
  {
    action: 'https://your-url/next-handler',
    numDigits: 1,
    finis',
    timeout: 15
  }
);
```

---

## Troubleshooting

### Recording Not Playing

**Check 1: Is recording marked active?**
- Go to Recordings Manager
- Verify `is_active` toggle is ON

**Check 2: Is URL correct?**
- Click Play button
- If 404, URL is broken - edit and fix

**Check 3: Is MP3 publicly accessible?**
- Right-click MP3 in Storage, verify "Make Public"
- Try URL directly in browser

### TTS Playing Instead of Recording

**Likely cause:** Category name doesn't match exactly
- Category names are case-sensitive and use underscores
- ❌ Wrong: `NewHost` or `new_host_prompt`
- ✅ Correct: `new_host`

### Dashboard Not Loading

- Clear browser cache: `Ctrl+Shift+Delete`
- Check that Next.js server is running: `npm run dev`
- Verify Supabase credentials in `.env.local`

---

## Default Recordings

10 sample recordings are created automatically:

| Name | Category | URL (UPDATE THESE) |
|------|----------|-----|
| Welcome Message | greeting | https://your-bucket.com/welcome.mp3 |
| New Host Prompt | new_host | https://your-bucket.com/new-host.mp3 |
| Confirm Beds | confirmation | https://your-bucket.com/confirm.mp3 |
| Thank You | thank_you | https://your-bucket.com/thank-you.mp3 |
| Menu Main | menu | https://your-bucket.com/menu.mp3 |
| Invalid Input | error | https://your-bucket.com/invalid.mp3 |
| Please Try Again | error | https://your-bucket.com/retry.mp3 |
| Admin Pin Prompt | admin | https://your-bucket.com/admin-pin.mp3 |
| Registration Menu | registration | https://your-bucket.com/register.mp3 |
| Location Question | registration | https://your-bucket.com/location.mp3 |

**Action:** Edit these entries with your actual MP3 URLs from Storage.

---

## Next Steps

1. ✅ Run [RECORDINGS_SETUP.sql](../RECORDINGS_SETUP.sql) in Supabase
2. ✅ Upload MP3 files to Supabase Storage
3. ✅ Open `/admin/recordings` in dashboard
4. ✅ Add/edit 10 default recordings with your URLs
5. ✅ Test by calling your system
6. ✅ Create custom recordings as needed

---

## Questions?

- **Supabase Storage Help:** [Storage Docs](https://supabase.com/docs/guides/storage)
- **LaML Documentation:** [SignalWire LaML Docs](https://docs.signalwire.com/topics/laml/)
- **Recording Format Issues:** Use [ffmpeg](https://ffmpeg.org/) to convert: `ffmpeg -i input.wav -b:a 128k output.mp3`
