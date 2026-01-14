const fs = require('fs');
const path = require('path');

function cleanResults() {
  const resultsDir = path.join(process.cwd(), 'results');

  console.log(`[DEBUG] Target path: ${resultsDir}`);

  if (!fs.existsSync(resultsDir)) {
    console.log('[INFO] Directory "results" does not exist. Skipping cleanup.');
    return;
  }

  try {
    const files = fs.readdirSync(resultsDir);

    if (files.length === 0) {
      console.log('[INFO] Directory "results" is already empty.');
      return;
    }

    files.forEach((file) => {
      const curPath = path.join(resultsDir, file);
      fs.rmSync(curPath, { recursive: true, force: true });
    });

    console.log(`[SUCCESS] Cleaned ${files.length} item(s) from "results" directory.`);
  } catch (error) {
    console.error(`[ERROR] Failed to clean "results" directory: ${error.message}`);
  }
}

cleanResults();
