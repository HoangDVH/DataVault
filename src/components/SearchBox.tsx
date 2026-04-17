type Props = {
  keyword: string;
  onChange: (val: string) => void;
};

export default function SearchBox({ keyword, onChange }: Props) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 mb-4 hover:shadow-xl transition-all duration-200">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          placeholder="Search users by name..."
          value={keyword}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-all duration-200 text-sm placeholder-slate-400"
        />
      </div>
    </div>
  );
}
