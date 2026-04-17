export default function Stats({ totalRecords, latency }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <span className="text-base">📊</span>
          </div>
          <div className="h-1 w-7 bg-linear-to-r from-blue-500 to-blue-600 rounded"></div>
        </div>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
          Total Records
        </p>
        <p className="text-xl font-bold text-slate-800">
          {totalRecords.toLocaleString()}
        </p>
      </div>

      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <span className="text-base">⚡</span>
          </div>
          <div className="h-1 w-7 bg-linear-to-r from-orange-500 to-orange-600 rounded"></div>
        </div>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
          Avg Latency
        </p>
        <p className="text-xl font-bold text-slate-800">{latency} ms</p>
      </div>

      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <span className="text-base">✅</span>
          </div>
          <div className="h-1 w-7 bg-linear-to-r from-green-500 to-green-600 rounded"></div>
        </div>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
          Status
        </p>
        <p className="text-xl font-bold text-green-600">Active</p>
      </div>
    </div>
  );
}
