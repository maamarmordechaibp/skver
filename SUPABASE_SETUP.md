# Supabase Database Setup Guide

## ✅ Quick Setup Instructions

### Step 1: Get Your Supabase Credentials

1. **Go to your Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve
   - This is your project dashboard

2. **Get the Project URL**
   - Click on **Settings** (bottom left) → **API**
   - Copy the **Project URL** (looks like: `https://kzxveopoyooaxvejjtve.supabase.co`)
   - This goes in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`

3. **Get the Anon Key**
   - In the same **Settings → API** page
   - Copy the **anon public** key
   - This goes in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Get the Service Role Key** (for backend operations)
   - In the same **Settings → API** page
   - Copy the **service_role** key (keep this secret!)
   - This goes in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Create the Database Tables

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy and paste the entire SQL schema from `DATABASE_SCHEMA.sql` in this project
4. Click **Run**

The schema includes:
- ✅ `hosts` table (store host information)
- ✅ `campaigns` table (Shabbat campaigns)
- ✅ `call_queue` table (calling queue)
- ✅ `responses` table (host responses)
- ✅ `call_history` table (all calls)
- ✅ `admin_settings` table (system settings)
- ✅ Automatic triggers and functions

### Step 3: Update `.env.local`

Replace these values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://kzxveopoyooaxvejjtve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 4: Test thection

Run the development server:
```bash
npm run dev
```

Visit `http://localhost:3000`

Try accessing:
- **Dashboard**: `/dashboard` - Should show "No active campaign"
- **Hosts**: `/hosts` - Should show empty table
- **Campaigns**: `/campaigns` - Should show empty table
- **Reports**: `/reports` - Should show empty table

If you see data loading and no errors, **you're connected!** ✅

---

## 📱 Next Steps: SignalWire Integration

After the database is running, set up **SignalWire** for phone call handling:

1. **Create SignalWire Account**: https://signalwire.com
2. **Get Credentials**:
   - Project ID
   - API Token
   - Space URL (domain)
   - Phone Number (for IVR)

3. **Update `.env.local`**:
   ```dotenv
   SIGNALWIRE_PROJECT_ID=your_project_id
   SIGNALWIRE_API_TOKEN=your_api_token
   SIGNALWIRE_SPACE_URL=your_space.signalwire.com
   SIGNALWIRE_PHONE_NUMBER=+1234567890
   ```

4. **Configure Webhooks** in SignalWire:
   - Incoming Voice: `https://yourdomain.com/api/voice/incoming`

---

## 📧 Email Setup (Optional)

To enable email reports:

1. **Create Resend Account**: https://resend.com
2. **Copy API Key**
3. **Update `.env.local`**:
   ```dotenv
   RESEND_API_KEY=your_api_key
   ADMIN_EMAIL=your-email@company.com
   ```

---

## 🧪 Test the System

### Create a Test Host
```bash
# In Supabase SQL Editor
INSERT INTO public.hosts (
  phone_number,
  name,
  total_beds,
  location_type,
  call_frequency,
  is_registered
) VALUES (
  '+1234567890',
  'Test Host',
  3,
  'home',
  'weekly',
  true
);
```

### Visit Dashboard
- Should now show 1 registered host

### Create a Test Campaign
```bash
INSERT INTO public.campaigns (
  shabbat_date,
  beds_needed,
  status
) VALUES (
  '2025-02-07',
  5,
  'pending'
);
```

---

## ❓ Troubleshooting

### "Can't connect to Supabase"
- ✅ Check URL and keys are in `.env.local`
- ✅ Verify no extra spaces in the values
- ✅ Make sure keys are not expired (they shouldn't be)

### "Tables don't exist"
- ✅ Run the SQL schema in SQL Editor
- ✅ Refresh the browser after schema creation

### "Getting CORS errors"
- ✅ Supabase handles CORS automatically
- ✅ Check that you're using the correct (anon, not service_role) key for frontend

---

## 🎯 You're All Set!

Now you have:
- ✅ Database connected and running
- ✅ Beautiful modern UI/UX on all pages
- ✅ Real-time dashboard
- ✅ Host management
- ✅ Campaign history
- ✅ Detailed reports

**Next**: Set up SignalWire for phone integration!
