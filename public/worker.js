let database = [];
let lowercaseIndex = [];

function generateData() {
  database = Array.from({ length: 100000 }, (_, i) => ({
    id: i,
    name: "User " + i,
  }));

  lowercaseIndex = database.map((item) => item.name.toLowerCase());
}

generateData();

self.onmessage = (e) => {
  const { id, type, payload } = e.data;

  try {
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

      filtered.sort((a, b) =>
        sortOrder === "asc" ? a.id - b.id : b.id - a.id,
      );

      const start = (page - 1) * limit;

      self.postMessage({
        id,
        type: "RESULT",
        data: filtered.slice(start, start + limit),
      });
    }

    if (type === "GET_STATS") {
      self.postMessage({
        id,
        type: "RESULT",
        totalRecords: database.length,
      });
    }

    if (type === "BULK_INSERT") {
      const { chunk, chunkId } = payload;

      let index = 0;
      const size = 1000;

      function run() {
        const part = chunk.slice(index, index + size);
        database.push(...part);
        lowercaseIndex.push(...part.map((item) => item.name.toLowerCase()));
        index += size;

        self.postMessage({
          type: "PROGRESS",
          chunkId,
          progress: Math.min((index / chunk.length) * 100, 100),
        });

        if (index < chunk.length) {
          setTimeout(run, 10);
        } else {
          self.postMessage({ id, type: "DONE" });
        }
      }

      run();
    }
  } catch (err) {
    self.postMessage({
      id,
      type: "ERROR",
      error: err.message,
    });
  }
};
