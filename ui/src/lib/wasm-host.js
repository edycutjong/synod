import * as approverA from './wasm/approver_a/approver_a.js';
import * as approverB from './wasm/approver_b/approver_b.js';
import * as executor from './wasm/executor/executor.js';
import { addTelemetryLog } from './db';

export function invoke(req) {
  const target = req.targetContract;
  const func = req.functionName;
  const input = req.input;

  addTelemetryLog('enclave', `Host Interface: contracts-call invoke matching target = ${target}, function = ${func}`);

  try {
    let resultBytes;
    if (target === 'approver-a') {
      if (func === 'evaluate') {
        resultBytes = approverA.contracts.evaluate({ input });
      } else {
        throw new Error(`Function ${func} not implemented in ${target}`);
      }
    } else if (target === 'approver-b') {
      if (func === 'evaluate') {
        resultBytes = approverB.contracts.evaluate({ input });
      } else {
        throw new Error(`Function ${func} not implemented in ${target}`);
      }
    } else if (target === 'executor') {
      if (func === 'execute') {
        resultBytes = executor.contracts.execute({ input });
      } else {
        throw new Error(`Function ${func} not implemented in ${target}`);
      }
    } else {
      throw new Error(`Unknown contract target: ${target}`);
    }

    return resultBytes;
  } catch (e) {
    if (e.payload) {
      throw e;
    }
    const msg = e.message || String(e);
    addTelemetryLog('enclave', `Contracts-Call: Invocation of ${target} failed: ${msg}`);
    const err = new Error(msg);
    err.payload = { tag: 'inner-failed', val: msg };
    throw err;
  }
}
