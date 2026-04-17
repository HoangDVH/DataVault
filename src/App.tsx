import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import Stats from "./components/Stats";
import SearchBox from "./components/SearchBox";
import FilterBar from "./components/FilterBar";
import BulkInsert from "./components/BulkInsert";
import DataList from "./components/DataList";
import { instantDebounce } from "./utils/debounce";
import toast from "react-hot-toast";

type PendingItem = {
  resolve: Function;
  reject: Function;
};

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔥 UI progress (smooth)
  const [progress, setProgress] = useState(0);
  const targetProgress = useRef(0);

  const [isInserting, setIsInserting] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [minId, setMinId] = useState("");
  const [maxId, setMaxId] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [page, setPage] = useState(1);
  const limit = 20;
  const [totalRecords, setTotalRecords] = useState(0);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ================= WORKER =================
  const WORKER_COUNT = 1;
  const workers = useRef<Worker[]>([]);
  const workerIndex = useRef(0);
  const pending = useRef<Map<string, PendingItem>>(new Map());

  // ================= PROGRESS =================
  const progressMap = useRef<Record<string, number>>({});
  const totalChunks = useRef(0);

  const currentToastId = useRef<string>("");
  const latestSearchId = useRef<string | null>(null);

  const [latency, setLatency] = useState(0);

  // ================= INIT WORKER =================
  useEffect(() => {
    workers.current = Array.from({ length: WORKER_COUNT }, () => {
      const w = new Worker("/worker.js");

      w.onmessage = (e) => {
        const msg = e.data;
        if (!msg) return;

        if (msg.id && pending.current.has(msg.id)) {
          const item = pending.current.get(msg.id)!;
          pending.current.delete(msg.id);

          if (msg.type === "ERROR") item.reject(msg.error);
          else item.resolve(msg);
        }

        // 🔥 chỉ update TARGET
        if (msg.type === "PROGRESS") {
          const { chunkId, progress } = msg;

          progressMap.current[chunkId] = progress;

          const values = Object.values(progressMap.current);
          const total =
            values.reduce((sum, p) => sum + p, 0) / totalChunks.current;

          targetProgress.current = Math.floor(total);
        }

        if (msg.type === "DONE") {
          targetProgress.current = 100;

          setTimeout(() => {
            toast.success("Insert thành công 🚀", {
              id: currentToastId.current,
            });
            setIsInserting(false);
          }, 300);
        }
      };

      return w;
    });

    return () => workers.current.forEach((w) => w.terminate());
  }, []);

  useEffect(() => {
    getTotalRecords();
  }, []);

  // ================= RAF SMOOTH =================
  useEffect(() => {
    let rafId: number;

    const animate = () => {
      setProgress((prev) => {
        const diff = targetProgress.current - prev;

        if (Math.abs(diff) < 0.5) return targetProgress.current;

        return prev + diff * 0.1; // easing
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafId);
  }, []);

  // ================= TOAST PROGRESS =================
  const updateToastProgress = (percent: number) => {
    toast.custom(
      () => (
        <div className="bg-white p-4 rounded-lg shadow w-72">
          <p className="text-sm font-semibold mb-2">Đang insert dữ liệu...</p>

          <div className="w-full bg-gray-200 h-2 rounded">
            <div
              className="bg-blue-500 h-2 rounded"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="text-xs mt-1">{percent}%</p>
        </div>
      ),
      { id: currentToastId.current },
    );
  };

  useEffect(() => {
    if (isInserting) {
      updateToastProgress(Math.floor(progress));
    }
  }, [progress]);

  // ================= LOAD BALANCE =================
  const getNextWorker = () => {
    const w = workers.current[workerIndex.current];
    workerIndex.current = (workerIndex.current + 1) % workers.current.length;
    return w;
  };

  const sendMessage = (type: string, payload: any) => {
    const id = crypto.randomUUID();
    const startTime = performance.now(); // 🔥 start

    return new Promise<any>((resolve, reject) => {
      pending.current.set(id, {
        resolve: (res: any) => {
          const time = performance.now() - startTime; // 🔥 end

          resolve({
            ...res,
            latency: time, // 🔥 inject latency
          });
        },
        reject,
      });

      getNextWorker().postMessage({ id, type, payload });

      setTimeout(() => {
        if (pending.current.has(id)) {
          pending.current.delete(id);
          reject("Timeout");
        }
      }, 10000);
    });
  };

  const getTotalRecords = () => {
    return sendMessage("GET_STATS", {}).then((res) => {
      if (res.totalRecords !== undefined) {
        setTotalRecords(res.totalRecords);
      }
      return res.totalRecords;
    });
  };

  // ================= SEARCH =================
  const handleSearch = instantDebounce((value: string) => {
    const key = value.trim();
    const searchRequestId = crypto.randomUUID();
    latestSearchId.current = searchRequestId;

    setLoading(true);

    sendMessage("SEARCH", {
      keyword: key,
      minId: Number(minId) || 0,
      maxId: Number(maxId) || Infinity,
      sortOrder,
      page,
      limit,
    })
      .then((res) => {
        if (latestSearchId.current !== searchRequestId) return;
        setData(res.data);
        setLatency(Math.floor(res.latency));
      })
      .finally(() => {
        if (latestSearchId.current === searchRequestId) {
          setLoading(false);
        }
      });
  }, 16);

  useEffect(() => {
    handleSearch(keyword);
  }, [minId, maxId, sortOrder, page]);

  // ================= INSERT =================
  const handleInsert = async () => {
    setIsInserting(true);
    setProgress(0);
    targetProgress.current = 0;

    currentToastId.current = toast.loading("Starting...");

    const startId = totalRecords; // 🔥 lấy từ Stats hiện tại

    const bigData = Array.from({ length: 50000 }, (_, i) => ({
      id: startId + i,
      name: "User " + (startId + i),
    }));

    const chunkSize = 10000;
    const chunks = [];

    for (let i = 0; i < bigData.length; i += chunkSize) {
      chunks.push(bigData.slice(i, i + chunkSize));
    }

    totalChunks.current = chunks.length;
    progressMap.current = {};

    await Promise.all(
      chunks.map((chunk) => {
        const chunkId = crypto.randomUUID();
        progressMap.current[chunkId] = 0;

        return sendMessage("BULK_INSERT", { chunk, chunkId });
      }),
    );

    await getTotalRecords();
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-6 left-6 z-50 bg-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-200"
      >
        <svg
          className="w-6 h-6 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 border-r border-slate-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Sidebar />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 p-4 md:p-6 md:ml-0 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-4">
          <Stats totalRecords={totalRecords} latency={latency} />

          <BulkInsert
            isInserting={isInserting}
            progress={progress}
            onInsert={handleInsert}
          />

          <SearchBox
            keyword={keyword}
            onChange={(v) => {
              setKeyword(v);
              setPage(1);
              handleSearch(v);
            }}
          />

          <FilterBar
            minId={minId}
            maxId={maxId}
            sortOrder={sortOrder}
            onMinChange={(v) => {
              setMinId(v);
              setPage(1);
            }}
            onMaxChange={(v) => {
              setMaxId(v);
              setPage(1);
            }}
            onSortChange={(v) => {
              setSortOrder(v);
              setPage(1);
            }}
            onNext={() => setPage((p) => p + 1)}
          />

          <div className="h-[60px] flex items-center justify-center">
            {loading && (
              <div className="animate-spin h-6 w-6 border-b-2 border-blue-600"></div>
            )}
          </div>

          {/* 🔥 FIX: tránh layout shift */}
          <div className="min-h-[420px]">
            <DataList data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
