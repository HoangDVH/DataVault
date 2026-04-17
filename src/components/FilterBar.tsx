type Props = {
  minId: string;
  maxId: string;
  sortOrder: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  onSortChange: (v: string) => void;
  onNext: () => void;
};

export default function FilterBar({
  minId,
  maxId,
  sortOrder,
  onMinChange,
  onMaxChange,
  onSortChange,
  onNext,
}: Props) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 mb-4 hover:shadow-xl transition-all duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Min ID
          </label>
          <input
            type="number"
            placeholder="0"
            value={minId}
            onChange={(e) => onMinChange(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-all duration-200"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Max ID
          </label>
          <input
            type="number"
            placeholder="Infinity"
            value={maxId}
            onChange={(e) => onMaxChange(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-all duration-200"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Sort Order
          </label>
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-all duration-200 bg-white appearance-none"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={onNext}
            className="w-full px-3 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
          >
            Next Page →
          </button>
        </div>
      </div>
    </div>
  );
}
