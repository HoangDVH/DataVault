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

  // 🔥 Progress UI
  const [progress, setProgress] = useState(0);
  const targetProgress = useRef(0);

  const [isInserting, setIsInserting] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [minId, setMinId] = useState("");
  const [maxId, setMaxId] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [page, setPage] = useState(1);
  const limit = 20;

  const [totalRecords, setTotalRecords] = useState(() => {
    try {
      const raw = localStorage.getItem("dv.totalRecords");
      if (!raw) return 0;
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  });
  const [latency, setLatency] = useState(0); // last search roundtrip
  const [avgLatency, setAvgLatency] = useState(0);
  const latencyWindow = useRef<number[]>([]);
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null);

  // iframe ref
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [vaultReady, setVaultReady] = useState(false);
  const vaultReadyWaiters = useRef<Array<() => void>>([]);

  // message system
  const pending = useRef<Map<string, PendingItem>>(new Map());

  // progress tracking
  const progressMap = useRef<Record<string, number>>({});
  const totalChunks = useRef(0);
  const doneChunks = useRef<Set<string>>(new Set());

  const currentToastId = useRef<string>("");

  // ================= INIT =================
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg) return;

      // resolve promise
      if (msg.id && pending.current.has(msg.id)) {
        const item = pending.current.get(msg.id)!;
        pending.current.delete(msg.id);

        if (msg.type === "ERROR") item.reject(msg.error);
        else item.resolve(msg);
      }

      // progress
      if (msg.type === "PROGRESS") {
        progressMap.current[msg.chunkId] = msg.progress;

        const total =
          Object.values(progressMap.current).reduce((a, b) => a + b, 0) /
          totalChunks.current;

        targetProgress.current = Math.floor(total);
      }

      // DONE tracking
      if (msg.type === "DONE") {
        if (msg.chunkId) {
          doneChunks.current.add(msg.chunkId);
        }

        if (doneChunks.current.size === totalChunks.current) {
          targetProgress.current = 100;

          setTimeout(() => {
            toast.success("Insert thành công 🚀", {
              id: currentToastId.current,
            });
            setIsInserting(false);
            doneChunks.current.clear();
          }, 200);
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const waitForVaultReady = () => {
    const cw = iframeRef.current?.contentWindow;
    if (vaultReady || cw) {
      if (!vaultReady && cw) setVaultReady(true);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      vaultReadyWaiters.current.push(resolve);
    });
  };

  // ================= RAF SMOOTH =================
  useEffect(() => {
    let raf: number;

    const animate = () => {
      setProgress((prev) => {
        const diff = targetProgress.current - prev;

        if (Math.abs(diff) < 0.5) return targetProgress.current;

        return prev + diff * 0.15;
      });

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ================= SEND MESSAGE =================
  const sendMessage = async (type: string, payload: any) => {
    await waitForVaultReady();
    const id = crypto.randomUUID();
    const start = performance.now();

    return new Promise<any>((resolve, reject) => {
      pending.current.set(id, {
        resolve: (res: any) => {
          const latency = performance.now() - start;
          resolve({ ...res, latency });
        },
        reject,
      });

      const targetWindow = iframeRef.current?.contentWindow;
      if (!targetWindow) {
        pending.current.delete(id);
        reject("Vault iframe not ready");
        return;
      }

      targetWindow.postMessage({ id, type, payload }, "*");

      setTimeout(() => {
        if (pending.current.has(id)) {
          pending.current.delete(id);
          reject("Timeout");
        }
      }, 10000);
    });
  };

  // ================= SEARCH =================
  const handleSearch = instantDebounce((value: string) => {
    const key = value.trim();
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
        setData(res.data);
        const last = Math.floor(res.latency);
        setLatency(last);
        latencyWindow.current.push(last);
        if (latencyWindow.current.length > 20) latencyWindow.current.shift();
        const avg =
          latencyWindow.current.reduce((a, b) => a + b, 0) /
          latencyWindow.current.length;
        setAvgLatency(Math.round(avg));
        setSearchTimeMs(
          typeof res.searchTimeMs === "number" ? res.searchTimeMs : null,
        );
      })
      .finally(() => setLoading(false));
  }, 16);

  useEffect(() => {
    handleSearch(keyword);
  }, [minId, maxId, sortOrder, page]);

  // ================= GET STATS =================
  const getTotalRecords = () => {
    sendMessage("GET_STATS", {}).then((res) => {
      if (res.totalRecords !== undefined) {
        // Vault now persists DB in IndexedDB, so the UI should reflect the real total.
        setTotalRecords(res.totalRecords);
      }
    });
  };

  useEffect(() => {
    getTotalRecords();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dv.totalRecords", String(totalRecords));
    } catch {
      // ignore (private mode / blocked storage)
    }
  }, [totalRecords]);

  // ================= INSERT =================
  const handleInsert = async () => {
    setIsInserting(true);
    setProgress(0);
    targetProgress.current = 0;

    progressMap.current = {};
    doneChunks.current.clear();

    currentToastId.current = toast.loading("Starting...");

    const chunkSize = 10000;
    const chunks = [];

    for (let i = 0; i < 50000; i += chunkSize) {
      chunks.push({ count: Math.min(chunkSize, 50000 - i) });
    }

    totalChunks.current = chunks.length;

    await Promise.all(
      chunks.map((chunk) => {
        const chunkId = crypto.randomUUID();
        progressMap.current[chunkId] = 0;

        return sendMessage("BULK_INSERT_COUNT", { count: chunk.count, chunkId });
      }),
    );

    await getTotalRecords();
  };

  // ================= UI =================
  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* iframe (hidden) */}
      <iframe
        ref={iframeRef}
        src="/vault.html"
        className="hidden"
        title="data-vault"
        onLoad={() => {
          setVaultReady(true);
          const waiters = vaultReadyWaiters.current;
          vaultReadyWaiters.current = [];
          waiters.forEach((r) => r());
        }}
        onError={() => {
          // Unblock callers so they can surface an error/timeout instead of waiting forever
          const waiters = vaultReadyWaiters.current;
          vaultReadyWaiters.current = [];
          waiters.forEach((r) => r());
        }}
      />

      <Sidebar />

      <div className="flex-1 p-6 space-y-4">
        <Stats totalRecords={totalRecords} latency={avgLatency} />

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

        <div className="h-5 text-sm text-slate-500 flex items-center justify-between">
          <span>{loading ? "Searching..." : ""}</span>
          <span>
            {searchTimeMs !== null
              ? `Search: ${searchTimeMs} ms · UI: ${latency} ms`
              : ""}
          </span>
        </div>

        <DataList data={data} />
      </div>
    </div>
  );
}
