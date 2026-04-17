type Props = {
  isInserting: boolean;
  progress: number;
  onInsert: () => void;
};

export default function BulkInsert({ isInserting, progress, onInsert }: Props) {
  return (
    <div className="mb-4 w-full">
      <button
        disabled={isInserting}
        onClick={onInsert}
        className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
          isInserting
            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
            : "bg-linear-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
        }`}
      >
        {isInserting ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            Inserting 50K Records...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="text-xl mr-3">⚡</span>
            Insert 50K Records
          </div>
        )}
      </button>

      {isInserting && (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 mt-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-800">
              Insert Progress
            </h3>
            <span className="text-xs text-slate-500">
              {Math.floor(progress)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-linear-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">
            Processing bulk data insertion...
          </p>
        </div>
      )}
    </div>
  );
}
