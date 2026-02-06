import Link from "next/link";

export default function Home() {
  return (
    <div className="py-10">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">
        Welcome to Guest House IVR System
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Manage your phone campaigns and host communications efficiently.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-indigo-600 mb-2">Dashboard</h2>
          <p className="text-gray-600">View system overview and statistics</p>
        </Link>
        
        <Link href="/hosts" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-indigo-600 mb-2">Hosts</h2>
          <p className="text-gray-600">Manage registered hosts and contacts</p>
        </Link>
        
        <Link href="/campaigns" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-indigo-600 mb-2">Campaigns</h2>
          <p className="text-gray-600">Create and manage phone campaigns</p>
        </Link>

        <Link href="/admin/recordings" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-indigo-600 mb-2">Recordings</h2>
          <p className="text-gray-600">Manage voice recordings and MP3 files</p>
        </Link>
      </div>

      <div className="mt-10 p-6 bg-indigo-50 rounded-lg">
        <h3 className="font-semibold text-indigo-900 mb-2">Voice System Status</h3>
        <p className="text-indigo-700">
          ✅ Phone system is live at: <strong>+1-845-935-0513</strong>
        </p>
      </div>
    </div>
  );
}
