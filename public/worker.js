// ================= DATABASE =================
let database = [];
let lowercaseIndex = [];

// init data (100K ban đầu)
function generateData() {
  database = Array.from({ length: 100000 }, (_, i) => ({
    id: i,
    name: "User " + i,
  }));

  lowercaseIndex = database.map((item) => item.name.toLowerCase());
}

generateData();

// ================= WORKER =================
self.onmessage = (e) => {
  const { id, type, payload } = e.data;

  try {
    // ================= RESET =================
    if (type === "RESET") {
      database = [];
      lowercaseIndex = [];

      self.postMessage({
        id,
        type: "DONE",
      });
      return;
    }

    // ================= SEARCH =================
    if (type === "SEARCH") {
      const { keyword, minId, maxId, sortOrder, page, limit } = payload;

      const keywordLower = keyword.toLowerCase();

      let filtered = [];

      if (keywordLower) {
        const useIndexSearch = keywordLower.length >= 2;

        if (useIndexSearch) {
          filtered = database.filter((item, idx) => {
            return (
              lowercaseIndex[idx].includes(keywordLower) &&
              item.id >= minId &&
              item.id <= maxId
            );
          });
        } else {
          filtered = database.filter(
            (item) =>
              item.name.toLowerCase().includes(keywordLower) &&
              item.id >= minId &&
              item.id <= maxId,
          );
        }
      } else {
        filtered = database.filter(
          (item) => item.id >= minId && item.id <= maxId,
        );
      }

      // sort
      filtered.sort((a, b) =>
        sortOrder === "asc" ? a.id - b.id : b.id - a.id,
      );

      // pagination
      const start = (page - 1) * limit;
      const result = filtered.slice(start, start + limit);

      self.postMessage({
        id,
        type: "RESULT",
        data: result,
        total: filtered.length,
      });

      return;
    }

    // ================= GET STATS =================
    if (type === "GET_STATS") {
      self.postMessage({
        id,
        type: "RESULT",
        totalRecords: database.length,
      });
      return;
    }

    // ================= BULK INSERT =================
    if (type === "BULK_INSERT") {
      const { chunk, chunkId } = payload;

      let index = 0;
      const size = 1000; // insert từng batch để tránh lag

      function run() {
        const part = chunk.slice(index, index + size);

        // insert
        database.push(...part);
        lowercaseIndex.push(...part.map((i) => i.name.toLowerCase()));

        index += size;

        // progress
        self.postMessage({
          type: "PROGRESS",
          chunkId,
          progress: Math.min((index / chunk.length) * 100, 100),
        });

        if (index < chunk.length) {
          // tránh block UI
          setTimeout(run, 5);
        } else {
          self.postMessage({
            id,
            type: "DONE",
          });
        }
      }

      run();
      return;
    }
  } catch (err) {
    self.postMessage({
      id,
      type: "ERROR",
      error: err.message,
    });
  }
};
