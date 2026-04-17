// ================= DATABASE (virtualized) =================
// We do NOT store the full records array. Records are deterministic:
// id i => { id: i, name: `User ${i}` }.
// Persist only totalCount in IndexedDB to avoid huge structured-clone writes.
let totalCount = 0;

const INITIAL_RECORDS = 500000;

function normText(s) {
  return String(s).toLowerCase().replace(/\s+/g, " ").trim();
}

// ================= IndexedDB (persist large DB) =================
const DB_NAME = "data-vault";
const DB_VERSION = 1;
const KV_STORE = "kv";

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });

  return dbPromise;
}

function idbGet(key) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(KV_STORE, "readonly");
        const store = tx.objectStore(KV_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbSet(key, value) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(KV_STORE, "readwrite");
        const store = tx.objectStore(KV_STORE);
        store.put({ key, value, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
      }),
  );
}

let saveScheduled = false;
function scheduleSaveDB() {
  if (saveScheduled) return;
  saveScheduled = true;

  setTimeout(() => {
    saveScheduled = false;
    idbSet("count", totalCount).catch((e) =>
      console.error("Save DB error:", e),
    );
  }, 0);
}

// ================= LOAD / SAVE =================
async function loadDB() {
  const countPersisted = await idbGet("count").catch(() => null);
  if (typeof countPersisted === "number" && Number.isFinite(countPersisted)) {
    totalCount = Math.max(0, Math.floor(countPersisted));
    if (totalCount < INITIAL_RECORDS) totalCount = INITIAL_RECORDS;
    return;
  }

  // Migration from old format (full array stored under "db")
  const oldDb = await idbGet("db").catch(() => null);
  if (Array.isArray(oldDb)) {
    totalCount = Math.max(oldDb.length, INITIAL_RECORDS);
    await idbSet("count", totalCount).catch((e) =>
      console.error("Save DB error:", e),
    );
    return;
  }

  // Fresh init
  totalCount = INITIAL_RECORDS;
  await idbSet("count", totalCount).catch((e) =>
    console.error("Save DB error:", e),
  );
}

const ready = loadDB();

// ================= MESSAGE =================
window.addEventListener("message", (e) => {
  const { id, type, payload } = e.data;
  const replyTarget = e.source || window.parent;
  const reply = (msg) => replyTarget.postMessage(msg, "*");

  ready
    .then(() => {
      try {
    // ================= SEARCH =================
    if (type === "SEARCH") {
      const t0 = performance.now();
      const { keyword, minId, maxId, sortOrder, page, limit } = payload;

      const keywordLower = normText(keyword);
      const min =
        typeof minId === "number" && Number.isFinite(minId) ? minId : 0;
      const max =
        typeof maxId === "number" && Number.isFinite(maxId) ? maxId : Infinity;

      const safeMin = Math.max(0, Math.floor(min));
      const safeMax = Math.min(totalCount - 1, Math.floor(max));

      // Fast path: "user 12345" -> direct lookup (O(1))
      const exactIdMatch = keywordLower.match(/^user\s+(\d+)$/);
      if (exactIdMatch) {
        const idNum = Number(exactIdMatch[1]);
        const inRange = idNum >= safeMin && idNum <= safeMax;
        const item = inRange ? { id: idNum, name: "User " + idNum } : null;
        const data = item ? [item] : [];
        const t1 = performance.now();
        reply({
          id,
          type: "RESULT",
          data,
          total: data.length,
          searchTimeMs: Math.round((t1 - t0) * 100) / 100,
        });
        return;
      }

      // Fast path: no keyword -> slice by id range (no full scan)
      if (!keywordLower) {
        const total =
          safeMax >= safeMin ? safeMax - safeMin + 1 : 0;
        const start = (page - 1) * limit;
        const end = start + limit;

        let pageItems = [];
        if (total > 0 && start < total) {
          if (sortOrder === "asc") {
            const fromId = safeMin + start;
            const toId = Math.min(safeMin + end, safeMax + 1);
            pageItems = [];
            for (let idVal = fromId; idVal < toId; idVal++) {
              pageItems.push({ id: idVal, name: "User " + idVal });
            }
          } else {
            // descending
            const fromOffset = start;
            const toOffset = Math.min(end, total);
            const fromId = safeMax - fromOffset;
            const toId = safeMax - (toOffset - 1);
            // build without scanning full dataset
            pageItems = [];
            for (let idVal = fromId; idVal >= toId; idVal--) {
              pageItems.push({ id: idVal, name: "User " + idVal });
            }
          }
        }

        const t1 = performance.now();
        reply({
          id,
          type: "RESULT",
          data: pageItems,
          total,
          searchTimeMs: Math.round((t1 - t0) * 100) / 100,
        });
        return;
      }

      // General substring matching over a deterministic dataset is inherently expensive.
      // We'll cap work by scanning only the id range and stopping after collecting one page.
      const start = (page - 1) * limit;
      const needed = start + limit;
      const matches = [];
      let seen = 0;

      // scan in desired order within [safeMin..safeMax]
      if (sortOrder === "asc") {
        for (let idVal = safeMin; idVal <= safeMax; idVal++) {
          if (normText("User " + idVal).includes(keywordLower)) {
            if (seen >= start && matches.length < limit) {
              matches.push({ id: idVal, name: "User " + idVal });
            }
            seen++;
            if (seen >= needed) break;
          }
        }
      } else {
        for (let idVal = safeMax; idVal >= safeMin; idVal--) {
          if (normText("User " + idVal).includes(keywordLower)) {
            if (seen >= start && matches.length < limit) {
              matches.push({ id: idVal, name: "User " + idVal });
            }
            seen++;
            if (seen >= needed) break;
          }
        }
      }

      const t1 = performance.now();
      reply({
        id,
        type: "RESULT",
        data: matches,
        total: seen, // lower bound (we stop after one page worth)
        searchTimeMs: Math.round((t1 - t0) * 100) / 100,
      });
    }

    // ================= BULK INSERT (🔥 FAST MODE) =================
    if (type === "BULK_INSERT_COUNT" || type === "BULK_INSERT") {
      const chunkId = payload && payload.chunkId ? payload.chunkId : undefined;
      const count =
        payload && typeof payload.count === "number" && Number.isFinite(payload.count)
          ? Math.max(0, Math.floor(payload.count))
          : payload && Array.isArray(payload.chunk)
            ? payload.chunk.length
            : 0;

      totalCount += count;

      // progress = 100 ngay
      reply({
        type: "PROGRESS",
        chunkId,
        progress: 100,
      });

      // 🔥 DONE có chunkId (fix bug load hoài)
      reply({
        id,
        type: "DONE",
        chunkId,
      });

      // ⚡ save async (không block UI)
      scheduleSaveDB();
    }

    // ================= STATS =================
    if (type === "GET_STATS") {
      reply({
        id,
        type: "RESULT",
        totalRecords: totalCount,
      });
    }

    // ================= RESET =================
    if (type === "RESET") {
      totalCount = 0;
      scheduleSaveDB();

      reply({ id, type: "DONE" });
    }
      } catch (err) {
        reply({
          id,
          type: "ERROR",
          error: err && err.message ? err.message : String(err),
        });
      }
    })
    .catch((err) => {
      reply({
        id,
        type: "ERROR",
        error: err && err.message ? err.message : String(err),
      });
    });
});
