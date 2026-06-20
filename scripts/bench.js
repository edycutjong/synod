const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const WASM_FILES = {
  'Coordinator': 'coordinator/coordinator.core.wasm',
  'Approver A (Treasury)': 'approver_a/approver_a.core.wasm',
  'Approver B (Compliance)': 'approver_b/approver_b.core.wasm',
  'Executor (Paymaster)': 'executor/executor.core.wasm'
};

const TARGET_DIR = path.resolve(__dirname, 'wasm');

async function benchmarkWasmCompilation() {
  console.log("=== WebAssembly Compilation & Instantiation Benchmark ===");
  console.log(`Target Directory: ${TARGET_DIR}\n`);

  console.log("| Contract Component | Binary Size | Comp. Time (ms) | Speed (MB/s) |");
  console.log("|---|---|---|---|");

  for (const [name, relPath] of Object.entries(WASM_FILES)) {
    const filePath = path.join(TARGET_DIR, relPath);
    if (!fs.existsSync(filePath)) {
      console.log(`| ${name} | *Not found at ${relPath}* | - | - |`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const sizeKb = buffer.length / 1024;
    const sizeMb = buffer.length / (1024 * 1024);

    const start = performance.now();
    const module = await WebAssembly.compile(buffer);
    const end = performance.now();
    const duration = end - start;
    const speed = sizeMb / (duration / 1000);

    console.log(`| ${name} | ${sizeKb.toFixed(1)} KiB | ${duration.toFixed(2)} ms | ${speed.toFixed(2)} MB/s |`);
  }
  console.log("");
}

async function run() {
  try {
    await benchmarkWasmCompilation();
  } catch (err) {
    console.error("Benchmark failed:", err);
  }
}

run();
