export default function Sidebar() {
  return (
    <div className="h-full p-4 bg-linear-to-b from-white to-slate-50">
      <div className="mb-6">
        <h2 className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          DataVault
        </h2>
        <p className="text-xs text-slate-500 mt-1">Data Management System</p>
      </div>
      <nav>
        <ul className="space-y-2">
          <li className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600 transition-all duration-200 hover:bg-blue-100 cursor-pointer text-sm">
            📊 Dashboard
          </li>
          <li className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-200 cursor-pointer text-sm">
            📁 Data Sources
          </li>
          <li className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-200 cursor-pointer text-sm">
            ⚙️ Settings
          </li>
        </ul>
      </nav>
    </div>
  );
}
