// Bulk Insert Worker - Optimized for maximum speed
self.onmessage = function(e) {
  const { totalRecords, chunkSize } = e.data;

  // Generate data in highly optimized way
  const bulkData = new Array(totalRecords);

  for (let i = 0; i < totalRecords; i++) {
    bulkData[i] = {
      name: `Bulk User ${i}`,
      email: `bulk${i}@example.com`,
      created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // Send data back in chunks to avoid memory issues
  const chunks = [];
  for (let i = 0; i < bulkData.length; i += chunkSize) {
    chunks.push(bulkData.slice(i, i + chunkSize));
  }

  self.postMessage({ chunks, totalRecords });
};