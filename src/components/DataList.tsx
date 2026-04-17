import { FixedSizeList as List } from "react-window";
import { memo } from "react";

const DataItem = memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: any[];
  }) => {
    const item = data[index];
    if (!item) return null;

    return (
      <div
        style={style}
        className="mx-2 my-2 px-4 py-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {item.name.charAt(0).toUpperCase()}
          </div>

          <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors duration-200 text-sm">
            {item.name}
          </span>
        </div>

        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          ID: {item.id}
        </span>
      </div>
    );
  },
);

DataItem.displayName = "DataItem";

export default function DataList({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          No data found
        </h3>
        <p className="text-sm text-slate-500">
          Try adjusting your search criteria or add some data first
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-800">Data Records</h3>
        <p className="text-xs text-slate-500">{data.length} records found</p>
      </div>
      <List
        height={420}
        itemCount={data.length}
        itemSize={60}
        width="100%"
        itemData={data}
        overscanCount={5}
      >
        {DataItem}
      </List>

      {data.length > 1000 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <p className="text-xs text-blue-600">
            Showing {data.length.toLocaleString()} results (virtualized for
            performance)
          </p>
        </div>
      )}
    </div>
  );
}
