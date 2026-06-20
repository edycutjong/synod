"use components";
import { call, error, info, nowMs, sign, tenantDid } from '../../wasm-env.js';
import { environment, exit as exit$1, stderr } from '@bytecodealliance/preview2-shim/cli';
import { error as error$1, streams } from '@bytecodealliance/preview2-shim/io';
const { getEnvironment } = environment;

if (getEnvironment=== undefined) {
  const err = new Error("unexpectedly undefined local import 'getEnvironment', was 'getEnvironment' available at instantiation?");
  console.error("ERROR:", err.toString());
  throw err;
}

const { exit } = exit$1;

if (exit=== undefined) {
  const err = new Error("unexpectedly undefined local import 'exit', was 'exit' available at instantiation?");
  console.error("ERROR:", err.toString());
  throw err;
}

const { getStderr } = stderr;

if (getStderr=== undefined) {
  const err = new Error("unexpectedly undefined local import 'getStderr', was 'getStderr' available at instantiation?");
  console.error("ERROR:", err.toString());
  throw err;
}

const { Error: Error$1 } = error$1;

if (Error$1=== undefined) {
  const err = new Error("unexpectedly undefined local import 'Error$1', was 'Error' available at instantiation?");
  console.error("ERROR:", err.toString());
  throw err;
}

const { OutputStream } = streams;

if (OutputStream=== undefined) {
  const err = new Error("unexpectedly undefined local import 'OutputStream', was 'OutputStream' available at instantiation?");
  console.error("ERROR:", err.toString());
  throw err;
}


function promiseWithResolvers() {
  if (Promise.withResolvers) {
    return Promise.withResolvers();
  } else {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
}
const symbolDispose = Symbol.dispose || Symbol.for('dispose');
const symbolAsyncIterator = Symbol.asyncIterator;
const symbolIterator = Symbol.iterator;

const _debugLog = (...args) => {
  if (!globalThis?.process?.env?.JCO_DEBUG) { return; }
  console.debug(...args);
};
const ASYNC_DETERMINISM = 'random';
const GLOBAL_COMPONENT_MEMORY_MAP = new Map();
const CURRENT_TASK_META = {};

function _getGlobalCurrentTaskMeta(componentIdx) {
  if (componentIdx === null || componentIdx === undefined) {
    throw new Error("missing/invalid component idx");
  }
  const v = CURRENT_TASK_META[componentIdx];
  if (v === undefined || v === null) {
    return undefined;
  }
  return { ...v };
}


function _setGlobalCurrentTaskMeta(args) {
  if (!args) { throw new TypeError('args missing'); }
  if (args.taskID === undefined) { throw new TypeError('missing task ID'); }
  if (args.componentIdx === undefined) { throw new TypeError('missing component idx'); }
  const { taskID, componentIdx } = args;
  return CURRENT_TASK_META[componentIdx] = { taskID, componentIdx };
}


function _withGlobalCurrentTaskMeta(args) {
  _debugLog('[_withGlobalCurrentTaskMeta()] args', args);
  if (!args) { throw new TypeError('args missing'); }
  if (args.taskID === undefined) { throw new TypeError('missing task ID'); }
  if (args.componentIdx === undefined) { throw new TypeError('missing component idx'); }
  if (!args.fn) { throw new TypeError('missing fn'); }
  const { taskID, componentIdx, fn } = args;
  
  try {
    CURRENT_TASK_META[componentIdx] = { taskID, componentIdx };
    return fn();
  } catch (err) {
    _debugLog("error while executing sync callee/callback", {
      ...args,
      err,
    });
    throw err;
  } finally {
    CURRENT_TASK_META[componentIdx] = null;
  }
}

async function _withGlobalCurrentTaskMetaAsync(args) {
  _debugLog('[_withGlobalCurrentTaskMetaAsync()] args', args);
  if (!args) { throw new TypeError('args missing'); }
  if (args.taskID === undefined) { throw new TypeError('missing task ID'); }
  if (args.componentIdx === undefined) { throw new TypeError('missing component idx'); }
  if (!args.fn) { throw new TypeError('missing fn'); }
  
  const { taskID, componentIdx, fn } = args;
  
  try {
    CURRENT_TASK_META[componentIdx] = { taskID, componentIdx };
    return await fn();
  } catch (err) {
    _debugLog("error while executing async callee/callback", {
      ...args,
      err,
    });
    throw err;
  } finally {
    CURRENT_TASK_META[componentIdx] = null;
  }
}

async function _clearCurrentTask(args) {
  _debugLog('[_clearCurrentTask()] args', args);
  if (!args) { throw new TypeError('args missing'); }
  if (args.taskID === undefined) { throw new TypeError('missing task ID'); }
  if (args.componentIdx === undefined) { throw new TypeError('missing component idx'); }
  const { taskID, componentIdx } = args;
  
  const meta = CURRENT_TASK_META[componentIdx];
  if (!meta) { throw new Error(`missing current task meta for component idx [${componentIdx}]`); }
  
  if (meta.taskID !== taskID) {
    throw new Error(`task ID [${meta.taskID}] != requested ID [${taskID}]`);
  }
  if (meta.componentIdx !== componentIdx) {
    throw new Error(`component idx [${meta.componentIdx}] != requested idx [${componentIdx}]`);
  }
  
  CURRENT_TASK_META[componentIdx] = null;
}

function lookupMemoriesForComponent(args) {
  const { componentIdx } = args ?? {};
  if (args.componentIdx === undefined) { throw new TypeError("missing component idx"); }
  
  const metas = GLOBAL_COMPONENT_MEMORY_MAP.get(componentIdx);
  if (!metas) { return []; }
  
  if (args.memoryIdx === undefined) {
    return Object.values(metas);
  }
  
  const meta = metas[args.memoryIdx];
  return meta?.memory;
}

function registerGlobalMemoryForComponent(args) {
  const { componentIdx, memory, memoryIdx } = args ?? {};
  if (componentIdx === undefined) { throw new TypeError('missing component idx'); }
  if (memory === undefined && memoryIdx === undefined) { throw new TypeError('missing both memory & memory idx'); }
  let inner = GLOBAL_COMPONENT_MEMORY_MAP.get(componentIdx);
  if (!inner) {
    inner = {};
    GLOBAL_COMPONENT_MEMORY_MAP.set(componentIdx, inner);
  }
  
  inner[memoryIdx] = { memory, memoryIdx, componentIdx };
}

class RepTable {
  #data = [0, null];
  #target;
  
  constructor(args) {
    this.target = args?.target;
  }
  
  data() { return this.#data; }
  
  insert(val) {
    _debugLog('[RepTable#insert()] args', { val, target: this.target });
    const freeIdx = this.#data[0];
    if (freeIdx === 0) {
      this.#data.push(val);
      this.#data.push(null);
      const rep = (this.#data.length >> 1) - 1;
      _debugLog('[RepTable#insert()] inserted', { val, target: this.target, rep });
      return rep;
    }
    this.#data[0] = this.#data[freeIdx << 1];
    const placementIdx = freeIdx << 1;
    this.#data[placementIdx] = val;
    this.#data[placementIdx + 1] = null;
    _debugLog('[RepTable#insert()] inserted', { val, target: this.target, rep: freeIdx });
    return freeIdx;
  }
  
  get(rep) {
    _debugLog('[RepTable#get()] args', { rep, target: this.target });
    if (rep === 0) { throw new Error('invalid resource rep during get, (cannot be 0)'); }
    
    const baseIdx = rep << 1;
    const val = this.#data[baseIdx];
    return val;
  }
  
  contains(rep) {
    _debugLog('[RepTable#contains()] args', { rep, target: this.target });
    if (rep === 0) { throw new Error('invalid resource rep during contains, (cannot be 0)'); }
    
    const baseIdx = rep << 1;
    return !!this.#data[baseIdx];
  }
  
  remove(rep) {
    _debugLog('[RepTable#remove()] args', { rep, target: this.target });
    if (rep === 0) { throw new Error('invalid resource rep during remove, (cannot be 0)'); }
    if (this.#data.length === 2) { throw new Error('invalid'); }
    
    const baseIdx = rep << 1;
    const val = this.#data[baseIdx];
    
    this.#data[baseIdx] = this.#data[0];
    this.#data[0] = rep;
    
    return val;
  }
  
  clear() {
    _debugLog('[RepTable#clear()] args', { rep, target: this.target });
    this.#data = [0, null];
  }
}
const _coinFlip = () => { return Math.random() > 0.5; };
let SCOPE_ID = 0;
const I32_MIN = -2_147_483_648;

const I32_MAX= 2_147_483_647;


function _isValidNumericPrimitive(ty, v) {
  if (v === undefined || v === null) { return false; }
  switch (ty) {
    case 'bool':
    return v === 0 || v === 1;
    break;
    case 'u8':
    return v >= 0 && v <= 255;
    break;
    case 's8':
    return v >= -128 && v <= 127;
    break;
    case 'u16':
    return v >= 0 && v <= 65535;
    break;
    case 's16':
    return v >= -32768 && v <= 32767;
    case 'u32':
    return v >= 0 && v <= 4_294_967_295;
    case 's32':
    return v >= -2_147_483_648 && v <= 2_147_483_647;
    case 'u64':
    return typeof v === 'bigint' && v >= 0 && v <= 18_446_744_073_709_551_615n;
    case 's64':
    return typeof v === 'bigint' && v >= -9223372036854775808n && v <= 9223372036854775807n;
    break;
    case 'f32':
    case 'f64': return typeof v === 'number';
    default:
    return false;
  }
  return true;
}

function _requireValidNumericPrimitive(ty, v) {
  if (v === undefined  || v === null || !_isValidNumericPrimitive(ty, v)) {
    throw new TypeError(`invalid ${ty} value [${v}]`);
  }
  return true;
}

const _typeCheckValidI32 = (n) => typeof n === 'number' && n >= I32_MIN && n <= I32_MAX;


const _typeCheckAsyncFn= (f) => {
  return f instanceof ASYNC_FN_CTOR;
};

let RESOURCE_CALL_BORROWS = [];const ASYNC_FN_CTOR = (async () => {}).constructor;

function clearCurrentTask(componentIdx, taskID) {
  _debugLog('[clearCurrentTask()] args', { componentIdx, taskID });
  
  if (componentIdx === undefined || componentIdx === null) {
    throw new Error('missing/invalid component instance index while ending current task');
  }
  
  const tasks = ASYNC_TASKS_BY_COMPONENT_IDX.get(componentIdx);
  if (!tasks || !Array.isArray(tasks)) {
    throw new Error('missing/invalid tasks for component instance while ending task');
  }
  if (tasks.length == 0) {
    throw new Error(`no current tasks for component instance [${componentIdx}] while ending task`);
  }
  
  if (taskID !== undefined) {
    const last = tasks[tasks.length - 1];
    if (last.id !== taskID) {
      // throw new Error('current task does not match expected task ID');
      return;
    }
  }
  
  ASYNC_CURRENT_TASK_IDS.pop();
  ASYNC_CURRENT_COMPONENT_IDXS.pop();
  
  const taskMeta = tasks.pop();
  return taskMeta.task;
}

const CURRENT_TASK_MAY_BLOCK= globalThis.WebAssembly ? new globalThis.WebAssembly.Global({ value: 'i32', mutable: true }, 0) : false;

const ASYNC_CURRENT_TASK_IDS = [];
const ASYNC_CURRENT_COMPONENT_IDXS = [];

function unpackCallbackResult(result) {
  if (!(_typeCheckValidI32(result))) { throw new Error('invalid callback return value [' + result + '], not a valid i32'); }
  const eventCode = result & 0xF;
  if (eventCode < 0 || eventCode > 3) {
    throw new Error('invalid async return value [' + eventCode + '], outside callback code range');
  }
  if (result < 0 || result >= 2**32) { throw new Error('invalid callback result'); }
  // TODO: table max length check?
  const waitableSetRep = result >> 4;
  return [eventCode, waitableSetRep];
}

class AsyncSubtask {
  static _ID = 0n;
  
  static State = {
    STARTING: 0,
    STARTED: 1,
    RETURNED: 2,
    CANCELLED_BEFORE_STARTED: 3,
    CANCELLED_BEFORE_RETURNED: 4,
  };
  
  #id;
  #state = AsyncSubtask.State.STARTING;
  #componentIdx;
  
  #parentTask;
  #childTask = null;
  
  #dropped = false;
  #cancelRequested = false;
  
  #memoryIdx = null;
  #lenders = null;
  
  #waitable = null;
  
  #callbackFn = null;
  #callbackFnName = null;
  
  #postReturnFn = null;
  #onProgressFn = null;
  #pendingEventFn = null;
  
  #callMetadata = {};
  
  #resolved = false;
  
  #onResolveHandlers = [];
  #onStartHandlers = [];
  
  #result = null;
  #resultSet = false;
  
  fnName;
  target;
  isAsync;
  isManualAsync;
  
  constructor(args) {
    if (typeof args.componentIdx !== 'number') {
      throw new Error('invalid componentIdx for subtask creation');
    }
    this.#componentIdx = args.componentIdx;
    
    this.#id = ++AsyncSubtask._ID;
    this.fnName = args.fnName;
    
    if (!args.parentTask) { throw new Error('missing parent task during subtask creation'); }
    this.#parentTask = args.parentTask;
    
    if (args.childTask) { this.#childTask = args.childTask; }
    
    if (args.memoryIdx) { this.#memoryIdx = args.memoryIdx; }
    
    if (!args.waitable) { throw new Error("missing/invalid waitable"); }
    this.#waitable = args.waitable;
    
    if (args.callMetadata) { this.#callMetadata = args.callMetadata; }
    
    this.#lenders = [];
    this.target = args.target;
    this.isAsync = args.isAsync;
    this.isManualAsync = args.isManualAsync;
  }
  
  id() { return this.#id; }
  parentTaskID() { return this.#parentTask?.id(); }
  childTaskID() { return this.#childTask?.id(); }
  state() { return this.#state; }
  
  waitable() { return this.#waitable; }
  waitableRep() { return this.#waitable.idx(); }
  
  join() { return this.#waitable.join(...arguments); }
  getPendingEvent() { return this.#waitable.getPendingEvent(...arguments); }
  hasPendingEvent() { return this.#waitable.hasPendingEvent(...arguments); }
  setPendingEvent() { return this.#waitable.setPendingEvent(...arguments); }
  
  setTarget(tgt) { this.target = tgt; }
  
  getResult() {
    if (!this.#resultSet) { throw new Error("subtask result has not been set") }
    return this.#result;
  }
  setResult(v) {
    if (this.#resultSet) { throw new Error("subtask result has already been set"); }
    this.#result = v;
    this.#resultSet = true;
  }
  
  componentIdx() { return this.#componentIdx; }
  
  setChildTask(t) {
    if (!t) { throw new Error('cannot set missing/invalid child task on subtask'); }
    if (this.#childTask) { throw new Error('child task is already set on subtask'); }
    if (this.#parentTask === t) { throw new Error("parent cannot be child"); }
    this.#childTask = t;
  }
  getChildTask(t) { return this.#childTask; }
  
  getParentTask() { return this.#parentTask; }
  
  setCallbackFn(f, name) {
    if (!f) { return; }
    if (this.#callbackFn) { throw new Error('callback fn can only be set once'); }
    this.#callbackFn = f;
    this.#callbackFnName = name;
  }
  
  getCallbackFnName() {
    if (!this.#callbackFn) { return undefined; }
    return this.#callbackFn.name;
  }
  
  setPostReturnFn(f) {
    if (!f) { return; }
    if (this.#postReturnFn) { throw new Error('postReturn fn can only be set once'); }
    this.#postReturnFn = f;
  }
  
  setOnProgressFn(f) {
    if (this.#onProgressFn) { throw new Error('on progress fn can only be set once'); }
    this.#onProgressFn = f;
  }
  
  isNotStarted() {
    return this.#state == AsyncSubtask.State.STARTING;
  }
  
  registerOnStartHandler(f) {
    this.#onStartHandlers.push(f);
  }
  
  onStart(args) {
    _debugLog('[AsyncSubtask#onStart()] args', {
      componentIdx: this.#componentIdx,
      subtaskID: this.#id,
      parentTaskID: this.parentTaskID(),
      fnName: this.fnName,
      args,
    });
    
    if (this.#onProgressFn) { this.#onProgressFn(); }
    
    this.#state = AsyncSubtask.State.STARTED;
    
    let result;
    
    // If we have been provided a helper start function as a result of
    // component fusion performed by wasmtime tooling, then we can call that helper and lifts/lowers will
    // be performed for us.
    //
    // See also documentation on `HostIntrinsic::PrepareCall`
    //
    if (this.#callMetadata.startFn) {
      result = this.#callMetadata.startFn.apply(null, args?.startFnParams ?? []);
    }
    
    return result;
  }
  
  
  registerOnResolveHandler(f) {
    this.#onResolveHandlers.push(f);
  }
  
  reject(subtaskErr) {
    this.#childTask?.reject(subtaskErr);
  }
  
  onResolve(subtaskValue) {
    _debugLog('[AsyncSubtask#onResolve()] args', {
      componentIdx: this.#componentIdx,
      subtaskID: this.#id,
      isAsync: this.isAsync,
      childTaskID: this.childTaskID(),
      parentTaskID: this.parentTaskID(),
      parentTaskFnName: this.#parentTask?.entryFnName(),
      fnName: this.fnName,
    });
    
    if (this.#resolved) {
      throw new Error('subtask has already been resolved');
    }
    
    if (this.#onProgressFn) { this.#onProgressFn(); }
    
    if (subtaskValue === null && this.#cancelRequested) {
      if (this.#state === AsyncSubtask.State.STARTING) {
        this.#state = AsyncSubtask.State.CANCELLED_BEFORE_STARTED;
      } else {
        if (this.#state !== AsyncSubtask.State.STARTED) {
          throw new Error('resolved subtask must have been started before cancellation');
        }
        this.#state = AsyncSubtask.State.CANCELLED_BEFORE_RETURNED;
      }
    } else {
      if (this.#state !== AsyncSubtask.State.STARTED) {
        throw new Error('resolved subtask must have been started before completion');
      }
      this.#state = AsyncSubtask.State.RETURNED;
    }
    
    this.setResult(subtaskValue);
    
    for (const f of this.#onResolveHandlers) {
      try {
        f(subtaskValue);
      } catch (err) {
        console.error("error during subtask resolve handler", err);
        throw err;
      }
    }
    
    const callMetadata = this.getCallMetadata();
    
    // TODO(fix): we should be able to easily have the caller's meomry
    // to lower into here, but it's not present in PrepareCall
    const memory = callMetadata.memory ?? this.#parentTask?.getReturnMemory() ?? lookupMemoriesForComponent({ componentIdx: this.#parentTask?.componentIdx() })[0];
    if (callMetadata && !callMetadata.returnFn && this.isAsync && callMetadata.resultPtr && memory) {
      const { resultPtr, realloc } = callMetadata;
      const lowers = callMetadata.lowers; // may have been updated in task.return of the child
      if (lowers && lowers.length > 0) {
        lowers[0]({
          componentIdx: this.#componentIdx,
          memory,
          realloc,
          vals: [subtaskValue],
          storagePtr: resultPtr,
          stringEncoding: callMetadata.stringEncoding,
        });
      }
    }
    
    this.#resolved = true;
    this.#parentTask.removeSubtask(this);
  }
  
  getStateNumber() { return this.#state; }
  isReturned() { return this.#state === AsyncSubtask.State.RETURNED; }
  
  getCallMetadata() { return this.#callMetadata; }
  
  isResolved() {
    if (this.#state === AsyncSubtask.State.STARTING
    || this.#state === AsyncSubtask.State.STARTED) {
      return false;
    }
    if (this.#state === AsyncSubtask.State.RETURNED
    || this.#state === AsyncSubtask.State.CANCELLED_BEFORE_STARTED
    || this.#state === AsyncSubtask.State.CANCELLED_BEFORE_RETURNED) {
      return true;
    }
    throw new Error('unrecognized internal Subtask state [' + this.#state + ']');
  }
  
  addLender(handle) {
    _debugLog('[AsyncSubtask#addLender()] args', { handle });
    if (!Number.isNumber(handle)) { throw new Error('missing/invalid lender handle [' + handle + ']'); }
    
    if (this.#lenders.length === 0 || this.isResolved()) {
      throw new Error('subtask has no lendors or has already been resolved');
    }
    
    handle.lends++;
    this.#lenders.push(handle);
  }
  
  deliverResolve() {
    _debugLog('[AsyncSubtask#deliverResolve()] args', {
      lenders: this.#lenders,
      parentTaskID: this.parentTaskID(),
      subtaskID: this.#id,
      childTaskID: this.childTaskID(),
      resolved: this.isResolved(),
      resolveDelivered: this.resolveDelivered(),
    });
    
    const cannotDeliverResolve = this.resolveDelivered() || !this.isResolved();
    if (cannotDeliverResolve) {
      throw new Error('subtask cannot deliver resolution twice, and the subtask must be resolved');
    }
    
    for (const lender of this.#lenders) {
      lender.lends--;
    }
    
    this.#lenders = null;
  }
  
  resolveDelivered() {
    _debugLog('[AsyncSubtask#resolveDelivered()] args', { });
    if (this.#lenders === null && !this.isResolved()) {
      throw new Error('invalid subtask state, lenders missing and subtask has not been resolved');
    }
    return this.#lenders === null;
  }
  
  drop() {
    _debugLog('[AsyncSubtask#drop()] args', {
      componentIdx: this.#componentIdx,
      parentTaskID: this.#parentTask?.id(),
      parentTaskFnName: this.#parentTask?.entryFnName(),
      childTaskID: this.#childTask?.id(),
      childTaskFnName: this.#childTask?.entryFnName(),
      subtaskFnName: this.fnName,
    });
    if (!this.#waitable) { throw new Error('missing/invalid inner waitable'); }
    if (!this.resolveDelivered()) {
      throw new Error('cannot drop subtask before resolve is delivered');
    }
    if (this.#waitable) { this.#waitable.drop() }
    this.#dropped = true;
  }
  
  #getComponentState() {
    const state = getOrCreateAsyncState(this.#componentIdx);
    if (!state) {
      throw new Error('invalid/missing async state for component [' + componentIdx + ']');
    }
    return state;
  }
  
  getWaitableHandleIdx() {
    _debugLog('[AsyncSubtask#getWaitableHandleIdx()] args', { });
    if (!this.#waitable) { throw new Error('missing/invalid waitable'); }
    return this.waitableRep();
  }
}

function _prepareCall(
memoryIdx,
getMemoryFn,
startFn,
returnFn,
callerComponentIdx,
calleeComponentIdx,
taskReturnTypeIdx,
calleeIsAsyncInt,
stringEncoding,
resultCountOrAsync,
) {
  _debugLog('[_prepareCall()]', {
    memoryIdx,
    callerComponentIdx,
    calleeComponentIdx,
    taskReturnTypeIdx,
    calleeIsAsyncInt,
    stringEncoding,
    resultCountOrAsync,
  });
  const argArray = [...arguments];
  
  // value passed in *may* be as large as u32::MAX which may be mangled into -2
  resultCountOrAsync >>>= 0;
  
  let isAsync = false;
  let hasResultPointer = false;
  if (resultCountOrAsync === 2**32 - 1) {
    // prepare async with no result (u32::MAX)
    isAsync = true;
    hasResultPointer = false;
  } else if (resultCountOrAsync === 2**32 - 2) {
    // prepare async with result (u32::MAX - 1)
    isAsync = true;
    hasResultPointer = true;
  }
  
  const currentCallerTaskMeta = getCurrentTask(callerComponentIdx);
  if (!currentCallerTaskMeta) {
    throw new Error('invalid/missing current task for caller during prepare call');
  }
  
  const currentCallerTask = currentCallerTaskMeta.task;
  if (!currentCallerTask) {
    throw new Error('unexpectedly missing task in meta for caller during prepare call');
  }
  
  if (currentCallerTask.componentIdx() !== callerComponentIdx) {
    throw new Error(`task component idx [${ currentCallerTask.componentIdx() }] !== [${ callerComponentIdx }] (callee ${ calleeComponentIdx })`);
  }
  
  let getCalleeParamsFn;
  let resultPtr = null;
  let directParamsArr;
  if (hasResultPointer) {
    directParamsArr = argArray.slice(10, argArray.length - 1);
    getCalleeParamsFn = () => directParamsArr;
    resultPtr = argArray[argArray.length - 1];
  } else {
    directParamsArr = argArray.slice(10);
    getCalleeParamsFn = () => directParamsArr;
  }
  
  let encoding;
  switch (stringEncoding) {
    case 0:
    encoding = 'utf8';
    break;
    case 1:
    encoding = 'utf16';
    break;
    case 2:
    encoding = 'compact-utf16';
    break;
    default:
    throw new Error(`unrecognized string encoding enum [${stringEncoding}]`);
  }
  
  const subtask = currentCallerTask.createSubtask({
    componentIdx: callerComponentIdx,
    parentTask: currentCallerTask,
    isAsync,
    callMetadata: {
      getMemoryFn,
      memoryIdx,
      resultPtr,
      returnFn,
      startFn,
      stringEncoding,
    }
  });
  
  const [newTask, newTaskID] = createNewCurrentTask({
    componentIdx: calleeComponentIdx,
    isAsync,
    getCalleeParamsFn,
    entryFnName: [
    'task',
    subtask.getParentTask().id(),
    'subtask',
    subtask.id(),
    'new-prepared-async-task'
    ].join('/'),
    stringEncoding,
  });
  newTask.setParentSubtask(subtask);
  newTask.setReturnMemoryIdx(memoryIdx);
  newTask.setReturnMemory(getMemoryFn);
  subtask.setChildTask(newTask);
  
  newTask.subtaskMeta = {
    subtask,
    calleeComponentIdx,
    callerComponentIdx,
    getCalleeParamsFn,
    stringEncoding,
    isAsync,
  };
  
  _setGlobalCurrentTaskMeta({
    taskID: newTask.id(),
    componentIdx: newTask.componentIdx(),
  });
}

function _asyncStartCall(args, callee, paramCount, resultCount, flags) {
  const componentIdx = ASYNC_CURRENT_COMPONENT_IDXS.at(-1);
  
  const globalTaskMeta = _getGlobalCurrentTaskMeta(componentIdx);
  if (!globalTaskMeta) { throw new Error('missing global current task globalTaskMeta'); }
  const taskID = globalTaskMeta.taskID;
  
  _debugLog('[_asyncStartCall()] args', { args, componentIdx });
  const { getCallbackFn, callbackIdx, getPostReturnFn, postReturnIdx } = args;
  
  const preparedTaskMeta = getCurrentTask(componentIdx, taskID);
  if (!preparedTaskMeta) { throw new Error('unexpectedly missing current task'); }
  
  const preparedTask = preparedTaskMeta.task;
  if (!preparedTask) { throw new Error('unexpectedly missing current task'); }
  if (!preparedTask.subtaskMeta) { throw new Error('missing subtask meta from prepare'); }
  
  const {
    subtask,
    returnMemoryIdx,
    getReturnMemoryFn,
    callerComponentIdx,
    calleeComponentIdx,
    getCalleeParamsFn,
    isAsync,
    stringEncoding,
  } = preparedTask.subtaskMeta;
  if (!subtask) { throw new Error("missing subtask from cstate during async start call"); }
  if (calleeComponentIdx !== preparedTask.componentIdx()) {
    throw new Error(`meta callee idx [${calleeComponentIdx}] != current task idx [${preparedTask.componentIdx()}] during async start call`);
  }
  if (calleeComponentIdx !== componentIdx) {
    throw new Error("mismatched componentIdx for async start call (does not match prepare)");
  }
  
  const argArray = [...arguments];
  
  if (resultCount < 0 || resultCount > 1) { throw new Error('invalid/unsupported result count'); }
  
  const callbackFnName = 'callback_' + callbackIdx;
  const callbackFn = getCallbackFn();
  preparedTask.setCallbackFn(callbackFn, callbackFnName);
  preparedTask.setPostReturnFn(getPostReturnFn());
  
  if (resultCount < 0 || resultCount > 1) {
    throw new Error(`unsupported result count [${ resultCount }]`);
  }
  
  const params = preparedTask.getCalleeParams();
  if (paramCount !== params.length) {
    throw new Error(`unexpected callee param count [${ params.length }], _asyncStartCall invocation expected [${ paramCount }]`);
  }
  
  const callerComponentState = getOrCreateAsyncState(subtask.componentIdx());
  
  const calleeComponentState = getOrCreateAsyncState(preparedTask.componentIdx());
  const calleeBackpressure = calleeComponentState.hasBackpressure();
  
  // Set up a handler on subtask completion to lower results from the call into the caller's memory region.
  //
  // NOTE: during fused guest->guest calls this handler is triggered, but does not actually perform
  // lowering manually, as fused modules provider helper functions that can
  subtask.registerOnResolveHandler((res) => {
    _debugLog('[_asyncStartCall()] handling subtask result', { res, subtaskID: subtask.id() });
    
    let subtaskCallMeta = subtask.getCallMetadata();
    
    // NOTE: in the case of guest -> guest async calls, there may be no memory/realloc present,
    // as the host will intermediate the value storage/movement between calls.
    //
    // We can simply take the value and lower it as a parameter
    if (subtaskCallMeta.memory || subtaskCallMeta.realloc) {
      throw new Error("call metadata unexpectedly contains memory/realloc for guest->guest call");
    }
    
    const callerTask = subtask.getParentTask();
    const calleeTask = preparedTask;
    const callerMemoryIdx = callerTask.getReturnMemoryIdx();
    const callerComponentIdx = callerTask.componentIdx();
    
    // If a helper function was provided we are likely in a fused guest->guest call,
    // and the result will be delivered (lift/lowered) via helper function
    if (subtaskCallMeta && subtaskCallMeta.returnFn) {
      _debugLog('[_asyncStartCall()] return function present while handling subtask result, returning early (skipping lower)', {
        calleeTaskID: calleeTask.id(),
        calleeComponentIdx,
      });
      
      // TODO: centralize calling of returnFn to *one place* (if possible)
      if (subtaskCallMeta.returnFnCalled) { return; }
      
      const res = subtaskCallMeta.returnFn.apply(null, [subtaskCallMeta.resultPtr]);
      
      _debugLog('[_asyncStartCall()] finished calling return fn', {
        calleeTaskID: calleeTask.id(),
        calleeComponentIdx,
        res,
      });
      
      return;
    }
    
    // If there is no where to lower the results, exit early
    if (!subtaskCallMeta.resultPtr) {
      _debugLog('[_asyncStartCall()] no result ptr during subtask result handling, returning early (skipping lower)');
      return;
    }
    
    let callerMemory;
    if (callerMemoryIdx !== null && callerMemoryIdx !== undefined) {
      callerMemory = lookupMemoriesForComponent({ componentIdx: callerComponentIdx, memoryIdx: callerMemoryIdx });
    } else {
      const callerMemories = lookupMemoriesForComponent({ componentIdx: callerComponentIdx });
      if (callerMemories.length !== 1) { throw new Error(`unsupported amount of caller memories`); }
      callerMemory = callerMemories[0];
    }
    
    if (!callerMemory) {
      _debugLog('[_asyncStartCall()] missing memory', { subtaskID: subtask.id(), res });
      throw new Error(`missing memory for to guest->guest call result (subtask [${subtask.id()}])`);
    }
    
    const lowerFns = calleeTask.getReturnLowerFns();
    if (!lowerFns || lowerFns.length === 0) {
      _debugLog('[_asyncStartCall()] missing result lower metadata for guest->guest call', { subtaskID: subtask.id() });
      throw new Error(`missing result lower metadata for guest->guest call (subtask [${subtask.id()}])`);
    }
    
    if (lowerFns.length !== 1) {
      _debugLog('[_asyncStartCall()] only single result reportetd for guest->guest call', { subtaskID: subtask.id() });
      throw new Error(`only single result supported for guest->guest calls (subtask [${subtask.id()}])`);
    }
    
    _debugLog('[_asyncStartCall()] lowering results', { subtaskID: subtask.id() });
    lowerFns[0]({
      realloc: undefined,
      memory: callerMemory,
      vals: [res],
      storagePtr: subtaskCallMeta.resultPtr,
      componentIdx: callerComponentIdx,
      stringEncoding: subtaskCallMeta.stringEncoding,
    });
    
  });
  
  subtask.setOnProgressFn(() => {
    subtask.setPendingEvent(() => {
      if (subtask.isResolved()) { subtask.deliverResolve(); }
      const event = {
        code: ASYNC_EVENT_CODE.SUBTASK,
        payload0: subtask.waitableRep(),
        payload1: subtask.getStateNumber(),
      };
      return event;
    });
  });
  
  // Start the (event) driver loop that will resolve the subtask
  // in a new JS task
  setTimeout(async () => {
    _debugLog('[_asyncStartCall()] continuing started subtask (in JS task)', {
      taskID: preparedTask.id(),
      subtaskID: subtask.id(),
      callerComponentIdx,
      calleeComponentIdx,
    });
    
    let startRes = subtask.onStart({ startFnParams: params });
    startRes = Array.isArray(startRes) ? startRes : [startRes];
    
    if (calleeComponentState.isExclusivelyLocked()) {
      _debugLog('[_asyncStartCall()] during continuation callee is exclusively locked, suspending...', {
        taskID: preparedTask.id(),
        subtaskID: subtask.id(),
        callerComponentIdx,
        calleeComponentIdx,
      });
      await calleeComponentState.suspendTask({
        task: preparedTask,
        readyFn: () => !calleeComponentState.isExclusivelyLocked(),
      });
    }
    
    const started = await preparedTask.enter();
    if (!started) {
      _debugLog('[_asyncStartCall()] task failed early', {
        taskID: preparedTask.id(),
        subtaskID: subtask.id(),
      });
      throw new Error("task failed to start");
      return;
    }
    
    let callbackResult;
    try {
      let jspiCallee = WebAssembly.promising(callee);
      callbackResult = await _withGlobalCurrentTaskMetaAsync({
        taskID: preparedTask.id(),
        componentIdx: preparedTask.componentIdx(),
        fn: () => {
          return jspiCallee.apply(null, startRes);
        }
      });
    } catch(err) {
      _debugLog("[_asyncStartCall()] initial subtask callee run failed", err);
      // NOTE: a good place to rejectt the parent task, if rejection API is enabled
      // subtask.reject(err);
      // subtask.getParentTask().reject(err);
      
      subtask.getParentTask().setErrored(err);
      
      return;
    }
    
    // If there was no callback function, we're dealing with a sync function
    // that was lifted as async without one, there is only the callee.
    if (!callbackFn) {
      _debugLog("[_asyncStartCall()] no callback, resolving w/ callee result", {
        taskID: preparedTask.id(),
        componentIdx: preparedTask.componentIdx(),
        preparedTask,
        stateNumber: preparedTask.taskState(),
        isResolved: preparedTask.isResolved(),
        callbackFn,
      });
      preparedTask.resolve([callbackResult]);
      return;
    }
    
    let fnName = callbackFn.fnName;
    if (!fnName) {
      fnName = [
      '<task ',
      subtask.parentTaskID(),
      '/subtask ',
      subtask.id(),
      '/task ',
      preparedTask.id(),
      '>',
      ].join("");
    }
    
    try {
      _debugLog("[_asyncStartCall()] starting driver loop", {
        fnName,
        componentIdx: preparedTask.componentIdx(),
        subtaskID: subtask.id(),
        childTaskID: subtask.childTaskID(),
        parentTaskID: subtask.parentTaskID(),
      });
      
      await _driverLoop({
        componentState: calleeComponentState,
        task: preparedTask,
        fnName,
        isAsync: true,
        callbackResult,
        resolve,
        reject
      });
    } catch (err) {
      _debugLog("[AsyncStartCall] drive loop call failure", { err });
    }
    
  }, 0);
  
  const subtaskState = subtask.getStateNumber();
  if (subtaskState < 0 || subtaskState > 2**5) {
    throw new Error('invalid subtask state, out of valid range');
  }
  
  _debugLog('[_asyncStartCall()] returning subtask rep & state', {
    subtask: {
      rep: subtask.waitableRep(),
      state: subtaskState,
    }
  });
  
  return Number(subtask.waitableRep()) << 4 | subtaskState;
}

function _syncStartCall(callbackIdx) {
  _debugLog('[_syncStartCall()] args', { callbackIdx });
  throw new Error('synchronous start call not implemented!');
}

class Waitable {
  #componentIdx;
  
  #pendingEventFn = null;
  
  #promise;
  #resolve;
  #reject;
  
  #waitableSet = null;
  
  #hasSyncWaiter = false;
  
  #idx = null; // to component-global waitables
  
  target;
  
  constructor(args) {
    const { componentIdx, target } = args;
    this.#componentIdx = componentIdx;
    this.target = args.target;
    this.#resetPromise();
  }
  
  componentIdx() { return this.#componentIdx; }
  isInSet() { return this.#waitableSet !== null; }
  
  idx() { return this.#idx; }
  setIdx(idx) {
    if (idx === 0) { throw new Error("waitable idx cannot be zero"); }
    this.#idx = idx;
  }
  
  setTarget(tgt) { this.target = tgt; }
  
  #resetPromise() {
    const { promise, resolve, reject } = promiseWithResolvers()
    this.#promise = promise;
    this.#resolve = resolve;
    this.#reject = reject;
  }
  
  resolve() { this.#resolve(); }
  reject(err) { this.#reject(err); }
  promise() { return this.#promise; }
  
  hasPendingEvent() {
    // _debugLog('[Waitable#hasPendingEvent()]', {
      //     componentIdx: this.#componentIdx,
      //     waitable: this,
      //     waitableSet: this.#waitableSet,
      //     hasPendingEvent: this.#pendingEventFn !== null,
      // });
      return this.#pendingEventFn !== null;
    }
    
    setPendingEvent(fn) {
      _debugLog('[Waitable#setPendingEvent()] args', {
        waitable: this,
        inSet: this.#waitableSet,
      });
      this.#pendingEventFn = fn;
    }
    
    getPendingEvent() {
      _debugLog('[Waitable#getPendingEvent()] args', {
        waitable: this,
        inSet: this.#waitableSet,
        hasPendingEvent: this.#pendingEventFn !== null,
      });
      if (this.#pendingEventFn === null) { return null; }
      const eventFn = this.#pendingEventFn;
      this.#pendingEventFn = null;
      const e = eventFn();
      this.#resetPromise();
      return e;
    }
    
    join(waitableSet) {
      _debugLog('[Waitable#join()] args', {
        waitable: this,
        waitableSet: waitableSet,
        isRemoval: waitableSet === null,
      });
      
      if (this.#waitableSet === undefined) {
        throw new TypeError('waitable set must be not be undefined');
      }
      
      if (this.#waitableSet) {
        this.#waitableSet.removeWaitable(this);
      }
      
      this.#waitableSet = waitableSet;
      
      if (waitableSet) {
        this.#waitableSet.addWaitable(this);
      }
    }
    
    drop() {
      _debugLog('[Waitable#drop()] args', {
        componentIdx: this.#componentIdx,
        waitable: this,
      });
      if (this.hasPendingEvent()) {
        throw new Error('waitables with pending events cannot be dropped');
      }
      this.join(null);
    }
    
    async waitForPendingEvent(args) {
      const { cstate } = args;
      if (!cstate) { throw new TypeError('missing component state'); }
      
      if (this.#waitableSet !== null || this.#hasSyncWaiter) {
        throw new Error("waitable is already in a set/has a sync waiter");
      }
      this.#hasSyncWaiter = true;
      await cstate.waitUntil({
        cancellable: false,
        readyFn: () => this.hasPendingEvent(),
      });
      this.#hasSyncWaiter = false;
    }
    
  }
  
  const ERR_CTX_TABLES = {};
  
  function contextGet(ctx) {
    const { componentIdx, slot } = ctx;
    if (componentIdx === undefined) { throw new TypeError("missing component idx"); }
    if (slot === undefined) { throw new TypeError("missing slot"); }
    
    const currentTaskMeta = _getGlobalCurrentTaskMeta(componentIdx);
    if (!currentTaskMeta) {
      throw new Error(`missing/incomplete global current task meta for component idx [${componentIdx}] during context set`);
    }
    const taskID = currentTaskMeta.taskID;
    
    const taskMeta = getCurrentTask(componentIdx, taskID);
    if (!taskMeta) { throw new Error('failed to retrieve current task'); }
    
    let task = taskMeta.task;
    if (!task) { throw new Error('invalid/missing current task in metadata while getting context'); }
    
    _debugLog('[contextGet()] args', {
      slot,
      storage: task.storage,
      taskID: task.id(),
      componentIdx: task.componentIdx(),
    });
    
    if (slot < 0 || slot >= task.storage.length) { throw new Error('invalid slot for current task'); }
    
    return task.storage[slot];
  }
  
  
  function contextSet(ctx, value) {
    const { componentIdx, slot } = ctx;
    if (componentIdx === undefined) { throw new TypeError("missing component idx"); }
    if (slot === undefined) { throw new TypeError("missing slot"); }
    if (!(_typeCheckValidI32(value))) { throw new Error('invalid value for context set (not valid i32)'); }
    
    const currentTaskMeta = _getGlobalCurrentTaskMeta(componentIdx);
    if (!currentTaskMeta) {
      throw new Error(`missing/incomplete global current task meta for component idx [${componentIdx}] during context set`);
    }
    const taskID = currentTaskMeta.taskID;
    
    const taskMeta = getCurrentTask(componentIdx, taskID);
    if (!taskMeta) { throw new Error('failed to retrieve current task'); }
    
    let task = taskMeta.task;
    if (!task) { throw new Error('invalid/missing current task in metadata while setting context'); }
    
    _debugLog('[contextSet()] args', {
      slot,
      value,
      storage: task.storage,
      taskID: task.id(),
      componentIdx: task.componentIdx(),
    });
    
    if (slot < 0 || slot >= task.storage.length) { throw new Error('invalid slot for current task'); }
    task.storage[slot] = value;
  }
  
  const ASYNC_TASKS_BY_COMPONENT_IDX = new Map();
  
  class AsyncTask {
    static _ID = 0n;
    
    static State = {
      INITIAL: 'initial',
      CANCELLED: 'cancelled',
      CANCEL_PENDING: 'cancel-pending',
      CANCEL_DELIVERED: 'cancel-delivered',
      RESOLVED: 'resolved',
    }
    
    static BlockResult = {
      CANCELLED: 'block.cancelled',
      NOT_CANCELLED: 'block.not-cancelled',
    }
    
    #id;
    #componentIdx;
    #state;
    #isAsync;
    #isManualAsync;
    #entryFnName = null;
    
    #onResolveHandlers = [];
    #completionPromise = null;
    #rejected = false;
    
    #exitPromise = null;
    #onExitHandlers = [];
    
    #memoryIdx = null;
    #memory = null;
    
    #callbackFn = null;
    #callbackFnName = null;
    
    #postReturnFn = null;
    
    #getCalleeParamsFn = null;
    
    #stringEncoding = null;
    
    #parentSubtask = null;
    
    #errHandling;
    
    #backpressurePromise;
    #backpressureWaiters = 0n;
    
    #returnLowerFns = null;
    
    #subtasks = [];
    
    #entered = false;
    #exited = false;
    #errored = null;
    
    cancelled = false;
    cancelRequested = false;
    alwaysTaskReturn = false;
    
    returnCalls =  0;
    storage = [0, 0];
    borrowedHandles = {};
    
    tmpRetI64HighBits = 0|0;
    
    constructor(opts) {
      this.#id = ++AsyncTask._ID;
      
      if (opts?.componentIdx === undefined) {
        throw new TypeError('missing component id during task creation');
      }
      this.#componentIdx = opts.componentIdx;
      
      this.#state = AsyncTask.State.INITIAL;
      this.#isAsync = opts?.isAsync ?? false;
      this.#isManualAsync = opts?.isManualAsync ?? false;
      this.#entryFnName = opts.entryFnName;
      
      const {
        promise: completionPromise,
        resolve: resolveCompletionPromise,
        reject: rejectCompletionPromise,
      } = promiseWithResolvers();
      this.#completionPromise = completionPromise;
      
      this.#onResolveHandlers.push((results) => {
        if (this.#errored !== null) {
          rejectCompletionPromise(this.#errored);
          return;
        } else if (this.#rejected) {
          rejectCompletionPromise(results);
          return;
        }
        resolveCompletionPromise(results);
      });
      
      const {
        promise: exitPromise,
        resolve: resolveExitPromise,
        reject: rejectExitPromise,
      } = promiseWithResolvers();
      this.#exitPromise = exitPromise;
      
      this.#onExitHandlers.push(() => {
        resolveExitPromise();
      });
      
      if (opts.callbackFn) { this.#callbackFn = opts.callbackFn; }
      if (opts.callbackFnName) { this.#callbackFnName = opts.callbackFnName; }
      
      if (opts.getCalleeParamsFn) { this.#getCalleeParamsFn = opts.getCalleeParamsFn; }
      
      if (opts.stringEncoding) { this.#stringEncoding = opts.stringEncoding; }
      
      if (opts.parentSubtask) { this.#parentSubtask = opts.parentSubtask; }
      
      
      if (opts.errHandling) { this.#errHandling = opts.errHandling; }
    }
    
    taskState() { return this.#state; }
    id() { return this.#id; }
    componentIdx() { return this.#componentIdx; }
    entryFnName() { return this.#entryFnName; }
    
    completionPromise() { return this.#completionPromise; }
    exitPromise() { return this.#exitPromise; }
    
    isAsync() { return this.#isAsync; }
    isSync() { return !this.isAsync(); }
    
    getErrHandling() { return this.#errHandling; }
    
    hasCallback() { return this.#callbackFn !== null; }
    
    getReturnMemoryIdx() { return this.#memoryIdx; }
    setReturnMemoryIdx(idx) {
      if (idx === null) { return; }
      this.#memoryIdx = idx;
    }
    
    getReturnMemory() { return this.#memory; }
    setReturnMemory(m) {
      if (m === null) { return; }
      this.#memory = m;
    }
    
    setReturnLowerFns(fns) { this.#returnLowerFns = fns; }
    getReturnLowerFns() { return this.#returnLowerFns; }
    
    setParentSubtask(subtask) {
      if (!subtask || !(subtask instanceof AsyncSubtask)) { return }
      if (this.#parentSubtask) { throw new Error('parent subtask can only be set once'); }
      this.#parentSubtask = subtask;
    }
    
    getParentSubtask() { return this.#parentSubtask; }
    
    // TODO(threads): this is very inefficient, we can pass along a root task,
    // and ideally do not need this once thread support is in place
    getRootTask() {
      let currentSubtask = this.getParentSubtask();
      let task = this;
      while (currentSubtask) {
        task = currentSubtask.getParentTask();
        currentSubtask = task.getParentSubtask();
      }
      return task;
    }
    
    setPostReturnFn(f) {
      if (!f) { return; }
      if (this.#postReturnFn) { throw new Error('postReturn fn can only be set once'); }
      this.#postReturnFn = f;
    }
    
    setCallbackFn(f, name) {
      if (!f) { return; }
      if (this.#callbackFn) { throw new Error('callback fn can only be set once'); }
      this.#callbackFn = f;
      this.#callbackFnName = name;
    }
    
    getCallbackFnName() {
      if (!this.#callbackFnName) { return undefined; }
      return this.#callbackFnName;
    }
    
    async runCallbackFn(...args) {
      if (!this.#callbackFn) { throw new Error('no callback function has been set for task'); }
      return _withGlobalCurrentTaskMetaAsync({
        taskID: this.#id,
        componentIdx: this.#componentIdx,
        fn: () => { return this.#callbackFn.apply(null, args); }
      });
    }
    
    getCalleeParams() {
      if (!this.#getCalleeParamsFn) { throw new Error('missing/invalid getCalleeParamsFn'); }
      return this.#getCalleeParamsFn();
    }
    
    mayBlock() { return this.isAsync() || this.isResolvedState() }
    
    mayEnter(task) {
      const cstate = getOrCreateAsyncState(this.#componentIdx);
      if (cstate.hasBackpressure()) {
        _debugLog('[AsyncTask#mayEnter()] disallowed due to backpressure', { taskID: this.#id });
        return false;
      }
      if (!cstate.callingSyncImport()) {
        _debugLog('[AsyncTask#mayEnter()] disallowed due to sync import call', { taskID: this.#id });
        return false;
      }
      const callingSyncExportWithSyncPending = cstate.callingSyncExport && !task.isAsync;
      if (!callingSyncExportWithSyncPending) {
        _debugLog('[AsyncTask#mayEnter()] disallowed due to sync export w/ sync pending', { taskID: this.#id });
        return false;
      }
      return true;
    }
    
    enterSync() {
      if (this.needsExclusiveLock()) {
        const cstate = getOrCreateAsyncState(this.#componentIdx);
        // TODO(???): it is *very possible* for a the line below to fail if
        // an async function is already running (and holding the exclusive lock)
        //
        // It's not really possible to fix this unless we turn every sync export into
        // an async export that will use the regular async enabled `enter()`.
        cstate.exclusiveLock();
      }
      return true;
    }
    
    async enter(opts) {
      _debugLog('[AsyncTask#enter()] args', {
        taskID: this.#id,
        componentIdx: this.#componentIdx,
        subtaskID: this.getParentSubtask()?.id(),
        args: opts,
        entryFnName: this.#entryFnName,
      });
      
      if (this.#entered) {
        throw new Error(`task with ID [${this.#id}] should not be entered twice`);
      }
      
      const cstate = getOrCreateAsyncState(this.#componentIdx);
      
      if (opts?.isHost) {
        this.#entered = true;
        return this.#entered;
      }
      
      await cstate.nextTaskExecutionSlot({ task: this });
      
      // If a task is synchronous then we can avoid component-relevant
      // tracking and immediately enter.
      if (this.isSync()) {
        this.#entered = true;
        
        // TODO(breaking): remove once manually-specifying async fns is removed
        // It is currently possible for an actually sync export to be specified
        // as async via JSPI
        if (this.#isManualAsync) {
          if (this.needsExclusiveLock()) { cstate.exclusiveLock(); }
        }
        
        return this.#entered;
      }
      
      // Perform intial backpressure check
      if (cstate.hasBackpressure() || this.needsExclusiveLock() && cstate.isExclusivelyLocked()) {
        cstate.addBackpressureWaiter();
        
        const result = await this.waitUntil({
          readyFn: () => {
            return !(cstate.hasBackpressure()
            || this.needsExclusiveLock() && cstate.isExclusivelyLocked());
          },
          cancellable: true,
        });
        
        cstate.removeBackpressureWaiter();
        
        if (result === AsyncTask.BlockResult.CANCELLED) {
          this.cancel();
          return false;
        }
      }
      
      // Lock the component state or keep trying until we can/do
      try {
        if (this.needsExclusiveLock()) { cstate.exclusiveLock(); }
      } catch {
        // Continuously attempt to lock until we can
        while (cstate.hasBackpressure() || this.needsExclusiveLock() && cstate.isExclusivelyLocked()) {
          try {
            if (this.needsExclusiveLock()) { cstate.exclusiveLock(); }
            break;
          } catch(err) {
            cstate.addBackpressureWaiter();
            const result = await this.waitUntil({
              readyFn: () => {
                return !(cstate.hasBackpressure()
                || this.needsExclusiveLock() && cstate.isExclusivelyLocked());
              },
              cancellable: true,
            });
            cstate.removeBackpressureWaiter();
            if (result === AsyncTask.BlockResult.CANCELLED) {
              this.cancel();
              return false;
            }
          }
        }
      }
      
      this.#entered = true;
      return this.#entered;
    }
    
    isRunningState() { return this.#state !== AsyncTask.State.RESOLVED; }
    isResolvedState() { return this.#state === AsyncTask.State.RESOLVED; }
    isResolved() { return this.#state === AsyncTask.State.RESOLVED; }
    
    async waitUntil(opts) {
      const { readyFn, cancellable } = opts;
      _debugLog('[AsyncTask#waitUntil()] args', { taskID: this.#id, args: { cancellable } });
      
      // TODO(fix): check for cancel
      // TODO(fix): determinism
      // TODO(threads): add this thread to waiting list
      
      const keepGoing = await this.suspendUntil({
        readyFn,
        cancellable,
      });
      
      return keepGoing;
    }
    
    async yieldUntil(opts) {
      const { readyFn, cancellable } = opts;
      _debugLog('[AsyncTask#yieldUntil()]', {
        taskID: this.#id,
        args: {
          cancellable,
        },
        componentIdx: this.#componentIdx,
      });
      
      const keepGoing = await this.suspendUntil({ readyFn, cancellable });
      if (keepGoing) {
        return {
          code: ASYNC_EVENT_CODE.NONE,
          payload0: 0,
          payload1: 0,
        };
      }
      
      return {
        code: ASYNC_EVENT_CODE.TASK_CANCELLED,
        payload0: 0,
        payload1: 0,
      };
    }
    
    async suspendUntil(opts) {
      const { cancellable, readyFn } = opts;
      _debugLog('[AsyncTask#suspendUntil()] args', {
        taskID: this.#id,
        args: {
          cancellable,
        },
        componentIdx: this.#componentIdx,
      });
      
      const pendingCancelled = this.deliverPendingCancel({ cancellable });
      if (pendingCancelled) { return false; }
      
      const completed = await this.immediateSuspendUntil({ readyFn, cancellable });
      return completed;
    }
    
    // TODO(threads): equivalent to thread.suspend_until()
    async immediateSuspendUntil(opts) {
      const { cancellable, readyFn } = opts;
      _debugLog('[AsyncTask#immediateSuspendUntil()] args', {
        args: {
          cancellable,
          readyFn,
        },
        taskID: this.#id,
        componentIdx: this.#componentIdx,
      });
      
      const ready = readyFn();
      if (ready && ASYNC_DETERMINISM === 'random') {
        const coinFlip = _coinFlip();
        if (coinFlip) { return true }
      }
      
      const keepGoing = await this.immediateSuspend({ cancellable, readyFn });
      return keepGoing;
    }
    
    async immediateSuspend(opts) { // NOTE: equivalent to thread.suspend()
    // TODO(threads): store readyFn on the thread
    const { cancellable, readyFn } = opts;
    _debugLog('[AsyncTask#immediateSuspend()] args', { cancellable, readyFn });
    
    const pendingCancelled = this.deliverPendingCancel({ cancellable });
    if (pendingCancelled) { return false; }
    
    const cstate = getOrCreateAsyncState(this.#componentIdx);
    const keepGoing = await cstate.suspendTask({ task: this, readyFn });
    return keepGoing;
  }
  
  deliverPendingCancel(opts) {
    const { cancellable } = opts;
    _debugLog('[AsyncTask#deliverPendingCancel()]', {
      args: { cancellable },
      taskID: this.#id,
      componentIdx: this.#componentIdx,
    });
    
    if (cancellable && this.#state === AsyncTask.State.PENDING_CANCEL) {
      this.#state = AsyncTask.State.CANCEL_DELIVERED;
      return true;
    }
    
    return false;
  }
  
  isCancelled() { return this.cancelled }
  
  cancel(args) {
    _debugLog('[AsyncTask#cancel()] args', { });
    if (this.taskState() !== AsyncTask.State.CANCEL_DELIVERED) {
      throw new Error(`(component [${this.#componentIdx}]) task [${this.#id}] invalid task state [${this.taskState()}] for cancellation`);
    }
    if (this.borrowedHandles.length > 0) { throw new Error('task still has borrow handles'); }
    this.cancelled = true;
    this.onResolve(args?.error ?? new Error('task cancelled'));
    this.#state = AsyncTask.State.RESOLVED;
  }
  
  onResolve(taskValue) {
    const handlers = this.#onResolveHandlers;
    this.#onResolveHandlers = [];
    for (const f of handlers) {
      try {
        f(taskValue);
      } catch (err) {
        _debugLog("[AsyncTask#onResolve] error during task resolve handler", err);
        throw err;
      }
    }
    
    if (this.#parentSubtask) {
      const meta = this.#parentSubtask.getCallMetadata();
      // Run the rturn fn if it has not already been called -- this *should* have happened in
      // `task.return`, but some paths do not go through task.return (e.g. async lower of sync fn
      // which goes through prepare + async-start-call)
      if (meta.returnFn && !meta.returnFnCalled) {
        _debugLog('[AsyncTask#onResolve()] running returnFn', {
          componentIdx: this.#componentIdx,
          taskID: this.#id,
          subtaskID: this.#parentSubtask.id(),
        });
        const memory = meta.getMemoryFn();
        meta.returnFn.apply(null, [taskValue, meta.resultPtr]);
        meta.returnFnCalled = true;
      }
    }
    
    if (this.#postReturnFn) {
      _debugLog('[AsyncTask#onResolve()] running post return ', {
        componentIdx: this.#componentIdx,
        taskID: this.#id,
      });
      try {
        this.#postReturnFn(taskValue);
      } catch (err) {
        _debugLog("[AsyncTask#onResolve] error during task resolve handler", err);
        throw err;
      }
    }
    
    if (this.#parentSubtask) {
      this.#parentSubtask.onResolve(taskValue);
    }
  }
  
  registerOnResolveHandler(f) {
    this.#onResolveHandlers.push(f);
  }
  
  isRejected() { return this.#rejected; }
  
  setErrored(err) {
    this.#errored = err;
  }
  
  reject(taskErr) {
    _debugLog('[AsyncTask#reject()] args', {
      componentIdx: this.#componentIdx,
      taskID: this.#id,
      parentSubtask: this.#parentSubtask,
      parentSubtaskID: this.#parentSubtask?.id(),
      entryFnName: this.entryFnName(),
      callbackFnName: this.#callbackFnName,
      errMsg: taskErr.message,
    });
    
    if (this.isResolvedState() || this.#rejected) { return; }
    
    for (const subtask of this.#subtasks) {
      subtask.reject(taskErr);
    }
    
    this.#rejected = true;
    this.cancelRequested = true;
    this.#state = AsyncTask.State.PENDING_CANCEL;
    const cancelled = this.deliverPendingCancel({ cancellable: true });
    
    // TODO: do cleanup here to reset the machinery so we can run again?
    
    this.cancel({ error: taskErr });
  }
  
  resolve(results) {
    _debugLog('[AsyncTask#resolve()] args', {
      componentIdx: this.#componentIdx,
      taskID: this.#id,
      entryFnName: this.entryFnName(),
      callbackFnName: this.#callbackFnName,
    });
    
    if (this.#state === AsyncTask.State.RESOLVED) {
      throw new Error(`(component [${this.#componentIdx}]) task [${this.#id}]  is already resolved (did you forget to wait for an import?)`);
    }
    
    if (this.borrowedHandles.length > 0) {
      throw new Error('task still has borrow handles');
    }
    
    this.#state = AsyncTask.State.RESOLVED;
    
    switch (results.length) {
      case 0:
      this.onResolve(undefined);
      break;
      case 1:
      this.onResolve(results[0]);
      break;
      default:
      _debugLog('[AsyncTask#resolve()] unexpected number of results', {
        componentIdx: this.#componentIdx,
        results,
        taskID: this.#id,
        subtaskID: this.#parentSubtask?.id(),
        entryFnName: this.#entryFnName,
        callbackFnName: this.#callbackFnName,
      });
      throw new Error('unexpected number of results');
    }
  }
  
  exit(args) {
    _debugLog('[AsyncTask#exit()]', {
      componentIdx: this.#componentIdx,
      taskID: this.#id,
    });
    
    if (this.#exited)  { throw new Error("task has already exited"); }
    
    if (this.#state !== AsyncTask.State.RESOLVED) {
      // TODO(fix): only fused, manually specified post returns seem to break this invariant,
      // as the TaskReturn trampoline is not activated it seems.
      //
      // see: test/p3/ported/wasmtime/component-async/post-return.js
      //
      // We *should* be able to upgrade this to be more strict and throw at some point,
      // which may involve rewriting the upstream test to surface task return manually somehow.
      //
      //throw new Error(`(component [${this.#componentIdx}]) task [${this.#id}] exited without resolution`);
      _debugLog('[AsyncTask#exit()] task exited without resolution', {
        componentIdx: this.#componentIdx,
        taskID: this.#id,
        subtask: this.getParentSubtask(),
        subtaskID: this.getParentSubtask()?.id(),
      });
      this.#state = AsyncTask.State.RESOLVED;
    }
    
    if (this.borrowedHandles > 0) {
      throw new Error('task [${this.#id}] exited without clearing borrowed handles');
    }
    
    const state = getOrCreateAsyncState(this.#componentIdx);
    if (!state) { throw new Error('missing async state for component [' + this.#componentIdx + ']'); }
    
    // Exempt the host from exclusive lock check
    if (this.#componentIdx !== -1 && !args?.skipExclusiveLockCheck) {
      if (this.needsExclusiveLock() && !state.isExclusivelyLocked()) {
        throw new Error(`task [${this.#id}] exit: component [${this.#componentIdx}] should have been exclusively locked`);
      }
    }
    
    state.exclusiveRelease();
    
    for (const f of this.#onExitHandlers) {
      try {
        f();
      } catch (err) {
        console.error("error during task exit handler", err);
        throw err;
      }
    }
    
    this.#exited = true;
    clearCurrentTask(this.#componentIdx, this.id());
  }
  
  needsExclusiveLock() {
    return !this.#isAsync || this.hasCallback();
  }
  
  createSubtask(args) {
    _debugLog('[AsyncTask#createSubtask()] args', args);
    const { componentIdx, childTask, callMetadata, fnName, isAsync, isManualAsync } = args;
    
    const cstate = getOrCreateAsyncState(this.#componentIdx);
    if (!cstate) {
      throw new Error(`invalid/missing async state for component idx [${componentIdx}]`);
    }
    
    const waitable = new Waitable({
      componentIdx: this.#componentIdx,
      target: `subtask (internal ID [${this.#id}])`,
    });
    
    const newSubtask = new AsyncSubtask({
      componentIdx,
      childTask,
      parentTask: this,
      callMetadata,
      isAsync,
      isManualAsync,
      fnName,
      waitable,
    });
    this.#subtasks.push(newSubtask);
    newSubtask.setTarget(`subtask (internal ID [${newSubtask.id()}], waitable [${waitable.idx()}], component [${componentIdx}])`);
    waitable.setIdx(cstate.handles.insert(newSubtask));
    waitable.setTarget(`waitable for subtask (waitable id [${waitable.idx()}], subtask internal ID [${newSubtask.id()}])`);
    
    return newSubtask;
  }
  
  getLatestSubtask() {
    return this.#subtasks.at(-1);
  }
  
  getSubtaskByWaitableRep(rep) {
    if (rep === undefined) { throw new TypeError('missing rep'); }
    return this.#subtasks.find(s => s.waitableRep() === rep);
  }
  
  currentSubtask() {
    _debugLog('[AsyncTask#currentSubtask()]');
    if (this.#subtasks.length === 0) { return undefined; }
    return this.#subtasks.at(-1);
  }
  
  removeSubtask(subtask) {
    if (this.#subtasks.length === 0) { throw new Error('cannot end current subtask: no current subtask'); }
    this.#subtasks = this.#subtasks.filter(t => t !== subtask);
    return subtask;
  }
}

const ASYNC_EVENT_CODE = {
  NONE: 0,
  SUBTASK: 1,
  STREAM_READ: 2,
  STREAM_WRITE: 3,
  FUTURE_READ: 4,
  FUTURE_WRITE: 5,
  TASK_CANCELLED: 6,
};

function getCurrentTask(componentIdx, taskID) {
  let usedGlobal = false;
  if (componentIdx === undefined || componentIdx === null) {
    throw new Error('missing component idx'); // TODO(fix)
    // componentIdx = ASYNC_CURRENT_COMPONENT_IDXS.at(-1);
    // usedGlobal = true;
  }
  
  const taskMetas = ASYNC_TASKS_BY_COMPONENT_IDX.get(componentIdx);
  if (taskMetas === undefined || taskMetas.length === 0) { return undefined; }
  
  if (taskID) {
    return taskMetas.find(meta => meta.task.id() === taskID);
  }
  
  const taskMeta = taskMetas[taskMetas.length - 1];
  if (!taskMeta || !taskMeta.task) { return undefined; }
  
  return taskMeta;
}

let dv = new DataView(new ArrayBuffer());
const dataView = mem => dv.buffer === mem.buffer ? dv : dv = new DataView(mem.buffer);

function toUint64(val) {
  const converted = BigInt(val)
  
  return BigInt.asUintN(64, converted);
}


function toUint16(val) {
  
  val >>>= 0;
  val %= 2 ** 16;
  return val;
}

const utf16Decoder = new TextDecoder('utf-16');
const TEXT_DECODER_UTF8 = new TextDecoder();
const TEXT_ENCODER_UTF8 = new TextEncoder();

function _utf8AllocateAndEncode(s, realloc, memory) {
  if (typeof s !== 'string') {
    throw new TypeError('expected a string, received [' + typeof s + ']');
  }
  if (s.length === 0) { return { ptr: 1, len: 0 }; }
  let buf = TEXT_ENCODER_UTF8.encode(s);
  let ptr = realloc(0, 0, 1, buf.length);
  new Uint8Array(memory.buffer).set(buf, ptr);
  const res = { ptr, len: buf.length, codepoints: [...s].length };
  return res;
}


const T_FLAG = 1 << 30;

function rscTableCreateOwn(table, rep) {
  const free = table[0] & ~T_FLAG;
  table._createdReps.add(rep);
  if (free === 0) {
    table.push(0);
    table.push(rep | T_FLAG);
    return (table.length >> 1) - 1;
  }
  table[0] = table[free << 1];
  table[free << 1] = 0;
  table[(free << 1) + 1] = rep | T_FLAG;
  return free;
}

function rscTableRemove(table, handle) {
  const scope = table[handle << 1];
  const val = table[(handle << 1) + 1];
  const own = (val & T_FLAG) !== 0;
  const rep = val & ~T_FLAG;
  if (val === 0 || (scope & T_FLAG) !== 0) {
    throw new TypeError("Invalid handle");
  }
  table[handle << 1] = table[0] | T_FLAG;
  table[0] = handle | T_FLAG;
  return { rep, scope, own };
}

let curResourceBorrows = [];

function createNewCurrentTask(args) {
  _debugLog('[createNewCurrentTask()] args', args);
  const {
    componentIdx,
    isAsync,
    isManualAsync,
    entryFnName,
    parentSubtaskID,
    callbackFnName,
    getCallbackFn,
    getParamsFn,
    stringEncoding,
    errHandling,
    getCalleeParamsFn,
    resultPtr,
    callingWasmExport,
  } = args;
  if (componentIdx === undefined || componentIdx === null) {
    throw new Error('missing/invalid component instance index while starting task');
  }
  let taskMetas = ASYNC_TASKS_BY_COMPONENT_IDX.get(componentIdx);
  const callbackFn = getCallbackFn ? getCallbackFn() : null;
  
  const newTask = new AsyncTask({
    componentIdx,
    isAsync,
    isManualAsync,
    entryFnName,
    callbackFn,
    callbackFnName,
    stringEncoding,
    getCalleeParamsFn,
    resultPtr,
    errHandling,
  });
  
  const newTaskID = newTask.id();
  const newTaskMeta = { id: newTaskID, componentIdx, task: newTask };
  
  // NOTE: do not track host tasks
  ASYNC_CURRENT_TASK_IDS.push(newTaskID);
  ASYNC_CURRENT_COMPONENT_IDXS.push(componentIdx);
  
  if (!taskMetas) {
    taskMetas = [newTaskMeta];
    ASYNC_TASKS_BY_COMPONENT_IDX.set(componentIdx, [newTaskMeta]);
  } else {
    taskMetas.push(newTaskMeta);
  }
  
  return [newTask, newTaskID];
}

function _lowerImportBackwardsCompat(args) {
  const params = [...arguments].slice(1);
  _debugLog('[_lowerImportBackwardsCompat()] args', { args, params });
  const {
    functionIdx,
    componentIdx,
    isAsync,
    isManualAsync,
    paramLiftFns,
    resultLowerFns,
    hasResultPointer,
    funcTypeIsAsync,
    metadata,
    memoryIdx,
    getMemoryFn,
    getReallocFn,
    importFn,
    stringEncoding,
  } = args;
  
  let meta = _getGlobalCurrentTaskMeta(componentIdx);
  let createdTask;
  
  // Some components depend on initialization logic (i.e. `_initialize` or some such
  // core wasm export) that is embedded in the component, but is not executed or wizer'd
  // away before the transpiled component is attempted to be used.
  //
  // These components execut their initialization logic *when they are imported* in the
  // transpiled context -- so we may get a call to an export that is lowered without going
  // through `CallWasm` or `CallInterface`.
  //
  if (!meta) {
    if (funcTypeIsAsync || (isAsync && !isManualAsync)) {
      throw new Error('p3 async wasm exports cannot use backwards compat auto-task init');
    }
    
    const [newTask, newTaskID] = createNewCurrentTask({
      componentIdx,
      isAsync,
      isManualAsync,
      callingWasmExport: false,
    });
    createdTask = newTask;
    
    // Since we're managing the task creation ourselves we must clear ourselves
    createdTask.registerOnResolveHandler(() => {
      _clearCurrentTask({
        taskID: task.id(),
        componentIdx: task.componentIdx(),
      });
    });
    
    _setGlobalCurrentTaskMeta({
      componentIdx,
      taskID: newTaskID,
    });
    
    meta = _getGlobalCurrentTaskMeta(componentIdx);
  }
  
  const { taskID } = meta;
  
  const taskMeta = getCurrentTask(componentIdx, taskID);
  if (!taskMeta) {
    throw new Error('invalid/missing async task meta');
  }
  
  const task = taskMeta.task;
  if (!task) { throw new Error('invalid/missing async task'); }
  
  const cstate = getOrCreateAsyncState(componentIdx);
  
  // TODO: re-enable this check -- postReturn can call imports though,
  // and that breaks things.
  //
  // if (!cstate.mayLeave) {
    //     throw new Error(`cannot leave instance [${componentIdx}]`);
    // }
    
    if (!task.mayBlock() && funcTypeIsAsync && !isAsync) {
      throw new Error("non async exports cannot synchronously call async functions");
    }
    
    // If there is an existing task, this should be part of a subtask
    const memory = getMemoryFn();
    // Canonical ABI lower appends result storage as a trailing
    // param when async lower has any flat result, or sync lower
    // has more than one flat result.
    const resultPtr = hasResultPointer ? params[params.length - 1] : undefined;
    const subtask = task.createSubtask({
      componentIdx,
      parentTask: task,
      fnName: importFn.fnName,
      isAsync,
      isManualAsync,
      callMetadata: {
        memoryIdx,
        memory,
        realloc: getReallocFn?.(),
        getReallocFn,
        resultPtr,
        lowers: resultLowerFns,
        stringEncoding,
      }
    });
    task.setReturnMemoryIdx(memoryIdx);
    task.setReturnMemory(getMemoryFn());
    
    subtask.onStart();
    
    // If dealing with a sync lowered sync function, we can directly return results
    //
    // TODO(breaking): remove once we get rid of manual async import specification,
    // as func types cannot be detected in that case only (and we don't need that w/ p3)
    if (!isManualAsync && !isAsync && !funcTypeIsAsync) {
      if (createdTask) { createdTask.enterSync(); }
      
      const res = importFn(...params);
      
      // TODO(breaking): remove once we get rid of manual async import specification,
      // as func types cannot be detected in that case only (and we don't need that w/ p3)
      if (!funcTypeIsAsync && !subtask.isReturned()) {
        throw new Error('post-execution subtasks must either be async or returned');
      }
      
      const syncRes = subtask.getResult();
      if (createdTask) { createdTask.resolve([syncRes]); }
      
      return syncRes;
    }
    
    // Sync-lowered async functions requires async behavior because the callee *can* block,
    // but this call must *act* synchronously and return immediately with the result
    // (i.e. not returning until the work is done)
    //
    // TODO(breaking): remove checking for manual async specification here, once we can go p3-only
    //
    if (!isManualAsync && !isAsync && funcTypeIsAsync) {
      const { promise, resolve } = new Promise();
      queueMicrotask(async () => {
        if (!subtask.isResolvedState()) {
          await task.suspendUntil({ readyFn: () => task.isResolvedState() });
        }
        resolve(subtask.getResult());
      });
      return promise;
    }
    
    // NOTE: at this point we know that we are working with an async lowered import
    
    const subtaskState = subtask.getStateNumber();
    if (subtaskState < 0 || subtaskState >= 2**4) {
      throw new Error('invalid subtask state, out of valid range');
    }
    
    subtask.setOnProgressFn(() => {
      subtask.setPendingEvent(() => {
        if (subtask.isResolved()) { subtask.deliverResolve(); }
        const event = {
          code: ASYNC_EVENT_CODE.SUBTASK,
          payload0: subtask.waitableRep(),
          payload1: subtask.getStateNumber(),
        }
        return event;
      });
    });
    
    // This is a hack to maintain backwards compatibility with
    // manually-specified async imports, used in wasm exports that are
    // not actually async (but are specified as so).
    //
    // This is not normal p3 sync behavior but instead anticipating that
    // the caller that is doing manual async will be waiting for a promise that
    // resolves to the *actual* result.
    //
    // TODO(breaking): remove once manually specified async is removed
    //
    // There are a few cases:
    // 1. sync function with async types (e.g. `f: func() -> stream<u32>`)
    // 2. async function with async types (e.g. `f: async func() -> stream<u32>`)
    // 3. async function with sync types (e.g. `f: async func() -> list<u32>`)
    // 4. sync function with non-async types (e.g. `f: func() -> list<u32>`)
    //
    // This hack *only* applies to 4 -- the case where an async JS host function
    // is supplied to a Wasm export which does *not* need to do any async abi
    // lifting/lowering (async ABI did not exist when JSPI integratiton was
    // initially merged to enable asynchronously returning values from the host)
    //
    const requiresManualAsyncResult = !isAsync && !funcTypeIsAsync && isManualAsync;
    let manualAsyncResult;
    if (requiresManualAsyncResult) {
      manualAsyncResult = promiseWithResolvers();
    }
    
    queueMicrotask(async () => {
      try {
        _debugLog('[_lowerImportBackwardsCompat()] calling lowered import', { importFn, params });
        if (createdTask) { await createdTask.enter(); }
        
        const asyncRes = await importFn(...params);
        if (requiresManualAsyncResult) {
          manualAsyncResult.resolve(subtask.getResult());
        }
        
        if (createdTask) { createdTask.resolve([asyncRes]); }
        
        
      } catch (err) {
        _debugLog("[_lowerImportBackwardsCompat()] import fn error:", err);
        if (requiresManualAsyncResult) {
          manualAsyncResult.reject(err);
        }
        throw err;
      }
    });
    
    if (requiresManualAsyncResult) { return manualAsyncResult.promise; }
    
    return Number(subtask.waitableRep()) << 4 | subtaskState;
  }
  
  function _liftFlatU8(ctx) {
    _debugLog('[_liftFlatU8()] args', { ctx });
    let val;
    
    if (ctx.useDirectParams) {
      if (ctx.params.length === 0) { throw new Error('expected at least a single i32 argument'); }
      val = ctx.params[0];
      ctx.params = ctx.params.slice(1);
      return [val, ctx];
    }
    
    if (ctx.storageLen !== undefined && ctx.storageLen < 1) {
      throw new Error(`insufficient storage ([${ctx.storageLen}] bytes) for lift (u8 requires 1 byte)`);
    }
    
    val = new DataView(ctx.memory.buffer).getUint8(ctx.storagePtr, true);
    
    ctx.storagePtr += 1;
    if (ctx.storageLen !== undefined) { ctx.storageLen -= 1; }
    
    return [val, ctx];
  }
  
  
  function _liftFlatU16(ctx) {
    _debugLog('[_liftFlatU16()] args', { ctx });
    let val;
    
    if (ctx.useDirectParams) {
      if (ctx.params.length === 0) { throw new Error('expected at least a single i32 argument'); }
      val = ctx.params[0];
      ctx.params = ctx.params.slice(1);
      return [val, ctx];
    }
    
    if (ctx.storageLen !== undefined && ctx.storageLen < 2) {
      throw new Error(`insufficient storage ([${ctx.storageLen}] bytes) for lift (u16 requires 2 bytes)`);
    }
    
    val = new DataView(ctx.memory.buffer).getUint16(ctx.storagePtr, true);
    
    ctx.storagePtr += 2;
    if (ctx.storageLen !== undefined) { ctx.storageLen -= 2; }
    
    const rem = ctx.storagePtr % 2;
    if (rem !== 0) { ctx.storagePtr += (2 - rem); }
    
    return [val, ctx];
  }
  
  
  function _liftFlatU32(ctx) {
    _debugLog('[_liftFlatU32()] args', { ctx });
    let val;
    
    if (ctx.useDirectParams) {
      if (ctx.params.length === 0) { throw new Error('expected at least a single i34 argument'); }
      val = ctx.params[0];
      ctx.params = ctx.params.slice(1);
      return [val, ctx];
    }
    
    if (ctx.storageLen !== undefined && ctx.storageLen < 4) {
      throw new Error(`insufficient storage ([${ctx.storageLen}] bytes) for lift (u32 requires 4 bytes)`);
    }
    val = new DataView(ctx.memory.buffer).getUint32(ctx.storagePtr, true);
    ctx.storagePtr += 4;
    if (ctx.storageLen !== undefined) { ctx.storageLen -= 4; }
    
    return [val, ctx];
  }
  
  
  function _liftFlatFloat64(ctx) {
    _debugLog('[_liftFlatFloat64()] args', { ctx });
    let val;
    
    if (ctx.useDirectParams) {
      if (ctx.params.length === 0) {
        throw new Error('expected at least one single f64 argument');
      }
      val = ctx.params[0];
      ctx.params = ctx.params.slice(1);
      
      if (ctx.inVariant) {
        const dv = new DataView(new ArrayBuffer(8));
        dv.setBigInt64(0, val);
        val = dv.getFloat64(0);
      }
      
      return [val, ctx];
    }
    
    if (ctx.storageLen !== undefined && ctx.storageLen < 8) {
      throw new Error(`insufficient storage ([${ctx.storageLen}] bytes) for lift (f64 requires 8 bytes)`);
    }
    
    val = new DataView(ctx.memory.buffer).getFloat64(ctx.storagePtr, true);
    ctx.storagePtr += 8;
    if (ctx.storageLen !== undefined) { ctx.storageLen -= 8; }
    
    return [val, ctx];
  }
  
  
  function _liftFlatStringAny(ctx) {
    switch (ctx.stringEncoding) {
      case 'utf8':
      return _liftFlatStringUTF8(ctx);
      case 'utf16':
      return _liftFlatStringUTF16(ctx);
      default:
      throw new Error(`missing/unrecognized/unsupported string encoding [${ctx.stringEncoding}]`);
    }
  }
  
  function _liftFlatStringUTF8(ctx) {
    _debugLog('[_liftFlatStringUTF8()] args', { ctx });
    let val;
    
    if (ctx.useDirectParams) {
      if (ctx.params.length < 2) { throw new Error('expected at least two u32 arguments'); }
      let offset = ctx.params[0];
      if (typeof offset === 'bigint') { offset = Number(offset); }
      if (!Number.isSafeInteger(offset)) { throw new Error('invalid offset'); }
      const len = ctx.params[1];
      if (!Number.isSafeInteger(len)) {  throw new Error('invalid len'); }
      val = TEXT_DECODER_UTF8.decode(new DataView(ctx.memory.buffer, offset, len));
      ctx.params = ctx.params.slice(2);
      return [val, ctx];
    }
    
    const rem = ctx.storagePtr % 4;
    if (rem !== 0) { ctx.storagePtr += (4 - rem); }
    
    const dv = new DataView(ctx.memory.buffer);
    const start = dv.getUint32(ctx.storagePtr, true);
    const codeUnits = dv.getUint32(ctx.storagePtr + 4, true);
    
    val = TEXT_DECODER_UTF8.decode(new Uint8Array(ctx.memory.buffer, start, codeUnits));
    
    ctx.storagePtr += 8;
    if (ctx.storageLen !== undefined) { ctx.storagelen -= 8; }
    
    return [val, ctx];
  }
  
  function _liftFlatStringUTF16(ctx) {
    _debugLog('[_liftFlatStringUTF16()] args', { ctx });
    let val;
    
    if (ctx.useDirectParams) {
      if (ctx.params.length < 2) { throw new Error('expected at least two u32 arguments'); }
      let offset = ctx.params[0];
      if (typeof offset === 'bigint') { offset = Number(offset); }
      if (!Number.isSafeInteger(offset)) {  throw new Error('invalid offset'); }
      const len = ctx.params[1];
      if (!Number.isSafeInteger(len)) {  throw new Error('invalid len'); }
      val = utf16Decoder.decode(new DataView(ctx.memory.buffer, offset, len));
      ctx.params = ctx.params.slice(2);
      return [val, ctx];
    }
    
    const data = new DataView(ctx.memory.buffer)
    const start = data.getUint32(ctx.storagePtr, vals[0], true);
    const codeUnits = data.getUint32(ctx.storagePtr, vals[0] + 4, true);
    val = utf16Decoder.decode(new Uint16Array(ctx.memory.buffer, start, codeUnits));
    ctx.storagePtr = ctx.storagePtr + 2 * codeUnits;
    if (ctx.storageLen !== undefined) { ctx.storageLen = ctx.storageLen - 2 * codeUnits }
    
    return [val, ctx];
  }
  
  function _liftFlatRecord(meta) {
    const { fieldMetas, size32: recordSize32, align32: recordAlign32 } = meta;
    return function _liftFlatRecordInner(ctx) {
      _debugLog('[_liftFlatRecord()] args', { ctx });
      
      const originalPtr = ctx.storagePtr;
      const res = {};
      for (const [key, liftFn, size32, align32] of fieldMetas) {
        let fieldPtr;
        if (ctx.storagePtr !== undefined) {
          const rem = ctx.storagePtr % align32;
          if (rem !== 0) { ctx.storagePtr += align32 - rem; }
          fieldPtr = ctx.storagePtr;
        }
        
        // A field occupies exactly size32 bytes of the record's
        // flat storage. Capture the remaining storage budget before
        // lifting the field and restore it afterwards: a field's own
        // lift fn may repurpose storageLen internally (e.g. a list
        // sets it to the element-buffer length while reading
        // out-of-line data and never restores it), which would
        // otherwise corrupt the budget the next field sees.
        // See https://github.com/bytecodealliance/jco/issues/1585.
        let fieldLen;
        if (ctx.storageLen !== undefined) { fieldLen = ctx.storageLen; }
        
        let [val, newCtx] = liftFn(ctx);
        res[key] = val;
        ctx = newCtx;
        
        if (fieldPtr !== undefined) {
          ctx.storagePtr = Math.max(ctx.storagePtr, fieldPtr + size32);
        }
        if (fieldLen !== undefined) {
          ctx.storageLen = fieldLen - size32;
        }
      }
      
      if (originalPtr !== undefined) {
        ctx.storagePtr = Math.max(ctx.storagePtr, originalPtr + recordSize32);
      }
      
      if (ctx.storagePtr !== undefined) {
        const rem = ctx.storagePtr % recordAlign32;
        if (rem !== 0) { ctx.storagePtr += recordAlign32 - rem; }
      }
      
      return [res, ctx];
    }
  }
  
  function _liftFlatVariant(meta) {
    const {
      caseMetas,
      variantSize32,
      variantAlign32,
      variantPayloadOffset32,
      variantFlatCount,
      isEnum,
    } = meta;
    
    return function _liftFlatVariantInner(ctx) {
      _debugLog('[_liftFlatVariant()] args', { ctx });
      const origUseParams = ctx.useDirectParams;
      
      // If we're in the process of lifting a variant, we note
      // we are during any lifting that happens (e.g. to accomodate f32/f64 mechanics)
      const wasInVariant = ctx.inVariant;
      ctx.inVariant = true;
      
      let caseIdx;
      let liftRes;
      const originalPtr = ctx.storagePtr;
      const numCases =  caseMetas.length;
      if (caseMetas.length < 256) {
        liftRes = _liftFlatU8(ctx);
      } else if (numCases >= 256 && numCases < 65536) {
        liftRes = _liftFlatU16(ctx);
      } else if (numCases >= 65536 && numCases < 4_294_967_296) {
        liftRes = _liftFlatU32(ctx);
      } else {
        throw new Error(`unsupported number of variant cases [${numCases}]`);
      }
      caseIdx = liftRes[0];
      ctx = liftRes[1];
      
      const [
      tag,
      liftFn,
      caseSize32,
      caseAlign32,
      caseFlatCount,
      ] = caseMetas[caseIdx];
      
      if (variantPayloadOffset32 === undefined) {
        throw new Error('unexpectedly missing payload offset');
      }
      
      if (originalPtr !== undefined) {
        ctx.storagePtr = originalPtr + variantPayloadOffset32;
      }
      
      let val;
      if (liftFn === null) {
        val = { tag };
        // NOTE: here we need to move past the entire object in memory
        // despite moving to the payload which we now know is missing/unnecessary
        if (originalPtr !== undefined) {
          ctx.storagePtr = originalPtr + variantSize32;
        }
      } else {
        if (ctx.useDirectParams && ctx.params && liftFn !== _liftFlatFloat64 && typeof ctx.params[0] === 'bigint') {
          if (ctx.params[0] > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error(`invalid value, reinterpreted i32/f32 too large: [${ctx.params[0]}]`);
          }
          ctx.params[0] = Number(ctx.params[0]);
        }
        
        const [newVal, newCtx] = liftFn(ctx);
        val = { tag, val: newVal };
        ctx = newCtx;
      }
      
      if (origUseParams) {
        if (variantFlatCount === undefined || variantFlatCount === null) {
          _debugLog('[_liftFlatVariant()] variant with unknown flat count', { ctx, meta });
          throw new Error('cannot lift variant with unknown flat count');
        }
        if (caseFlatCount === undefined || caseFlatCount === null) {
          _debugLog('[_liftFlatVariant()] case with unknown flat count', { ctx, meta, case: meta.caseMetas[caseIdx] });
          throw new Error('cannot lift case with unknown flat count');
        }
        // NOTE: enums can be tightly packed and do not have a descriminant
        const remainingPayloadParams = variantFlatCount - caseFlatCount - (isEnum ? 0 : 1);
        if (remainingPayloadParams < 0) {
          throw new Error(`invalid variant flat count metadata`);
        }
        if (ctx.params.length < remainingPayloadParams) {
          throw new Error(`expected at least [${remainingPayloadParams}] remaining variant payload params, but got [${ctx.params.length}]`);
        }
        ctx.params = ctx.params.slice(remainingPayloadParams);
      }
      
      if (ctx.storagePtr !== undefined) {
        const rem = ctx.storagePtr % variantAlign32;
        if (rem !== 0) { ctx.storagePtr += variantAlign32 - rem; }
      }
      
      ctx.inVariant = wasInVariant;
      
      return [val, ctx];
    }
  }
  
  function _liftFlatList(meta) {
    const { elemLiftFn, elemSize32, elemAlign32, knownLen, typedArray } = meta;
    
    const listValue =
    typedArray === undefined
    ? values => values
    : values => new typedArray(values);
    
    const readValuesAndReset = (ctx, originalPtr, originalLen, dataPtr, len) => {
      ctx.storagePtr = dataPtr;
      const val = [];
      for (var i = 0; i < len; i++) {
        const elemPtr = dataPtr + i * elemSize32;
        ctx.storagePtr = elemPtr;
        const [res, nextCtx] = elemLiftFn(ctx);
        val.push(res);
        ctx = nextCtx;
        
        ctx.storagePtr = Math.max(ctx.storagePtr, elemPtr + elemSize32);
      }
      if (originalPtr !== null) { ctx.storagePtr = originalPtr; }
      if (originalLen !== null) { ctx.storageLen = originalLen; }
      return [listValue(val), ctx];
    };
    
    return function _liftFlatListInner(ctx) {
      _debugLog('[_liftFlatList()] args', { ctx });
      
      let liftResults;
      if (knownLen !== undefined) { // list with known length
      if (ctx.useDirectParams) {
        _debugLog('memory unexpectedly missing while lifting unknown length list', { ctx });
        liftResults = [listValue(ctx.params.slice(0, knownLen)), ctx];
        ctx.params = ctx.params.slice(knownLen);
      } else { // indirect params
      if (ctx.memory === null) {
        _debugLog('memory unexpectedly missing while lifting known length list', { knownLen, ctx });
        throw new Error(`memory missing while lifting known length (${knownLen}) list`);
      }
      
      const originalLen = ctx.storageLen;
      const originalPtr = ctx.storagePtr;
      
      ctx.storageLen = knownLen * elemSize32;
      liftResults = readValuesAndReset(ctx, null, originalLen, ctx.storagePtr, knownLen);
    }
    
  } else { // unknown length list
  
  if (ctx.useDirectParams) {
    // unknown length list ptr w/ direct params
    const dataPtr = ctx.params[0];
    const len = ctx.params[1];
    ctx.params = ctx.params.slice(2);
    
    ctx.useDirectParams = false;
    const originalPtr = ctx.storagePtr;
    const originalLen = ctx.storageLen;
    ctx.storageLen = len * elemSize32;
    
    liftResults = readValuesAndReset(ctx, originalPtr, originalLen, dataPtr, len);
    
    ctx.useDirectParams = true;
  } else {
    // unknown length list ptr w/ in-memory params
    const originalLen = ctx.storageLen;
    ctx.storageLen = 8;
    
    const dataPtrLiftRes = _liftFlatU32(ctx);
    const dataPtr = dataPtrLiftRes[0];
    ctx = dataPtrLiftRes[1];
    
    const lenLiftRes = _liftFlatU32(ctx);
    const len = lenLiftRes[0];
    ctx = lenLiftRes[1];
    
    const originalPtr = ctx.storagePtr;
    ctx.storagePtr = dataPtr;
    
    ctx.storageLen = len * elemSize32;
    liftResults = readValuesAndReset(ctx, originalPtr, originalLen, dataPtr, len);
  }
}

return liftResults;
}
}

function _liftFlatTuple(meta) {
  const { elemLiftFns, size32: tupleSize32, align32: tupleAlign32 } = meta;
  return function _liftFlatTupleInner(ctx) {
    _debugLog('[_liftFlatTuple()] args', { ctx });
    
    const originalPtr = ctx.storagePtr;
    const val = [];
    for (const [ liftFn, size32, align32 ]  of elemLiftFns) {
      let elemPtr;
      if (ctx.storagePtr !== undefined) {
        const rem = ctx.storagePtr % align32;
        if (rem !== 0) { ctx.storagePtr += align32 - rem; }
        elemPtr = ctx.storagePtr;
      }
      
      // As in _liftFlatRecord: an element occupies exactly size32
      // bytes of the tuple's flat storage, so capture and restore
      // the storage budget around the element lift to stop a
      // field's internal storageLen use (e.g. lists) leaking into
      // the next element.
      // See https://github.com/bytecodealliance/jco/issues/1585.
      let elemLen;
      if (ctx.storageLen !== undefined) { elemLen = ctx.storageLen; }
      
      const [newValue, newCtx] = liftFn(ctx);
      val.push(newValue);
      ctx = newCtx;
      
      if (elemPtr !== undefined) {
        ctx.storagePtr = Math.max(ctx.storagePtr, elemPtr + size32);
      }
      if (elemLen !== undefined) {
        ctx.storageLen = elemLen - size32;
      }
    }
    
    if (originalPtr !== undefined) {
      ctx.storagePtr = Math.max(ctx.storagePtr, originalPtr + tupleSize32);
    }
    
    if (ctx.storagePtr !== undefined) {
      const rem = ctx.storagePtr % tupleAlign32;
      if (rem !== 0) { ctx.storagePtr += tupleAlign32 - rem; }
    }
    
    return [val, ctx];
  }
}

function _liftFlatEnum(meta) {
  meta.isEnum = true;
  const f = _liftFlatVariant(meta);
  return function _liftFlatEnumInner(ctx) {
    _debugLog('[_liftFlatEnum()] args', { ctx });
    const res = f(ctx);
    res[0] = res[0].tag;
    return res;
  }
}

function _liftFlatOption(meta) {
  const f = _liftFlatVariant(meta);
  return function _liftFlatOptionInner(ctx) {
    _debugLog('[_liftFlatOption()] args', { ctx });
    return f(ctx);
  }
}

function _liftFlatResult(meta) {
  const f = _liftFlatVariant(meta);
  return function _liftFlatResultInner(ctx) {
    _debugLog('[_liftFlatResult()] args', { ctx });
    return f(ctx);
  }
}

function _liftFlatBorrow(componentTableIdx, size, memory, vals, storagePtr, storageLen) {
  _debugLog('[_liftFlatBorrow()] args', { size, memory, vals, storagePtr, storageLen });
  throw new Error('flat lift for borrowed resources is not supported!');
}


function _lowerFlatU8(ctx) {
  _debugLog('[_lowerFlatU8()] args', ctx);
  
  if (ctx.vals.length !== 1) {
    throw new Error(`unexpected number [${ctx.vals.length}] of vals (expected 1)`);
  }
  
  _requireValidNumericPrimitive.bind('u8', ctx.vals[0]);
  
  if (!ctx.memory) { throw new Error("missing memory for lower"); }
  new DataView(ctx.memory.buffer).setUint32(ctx.storagePtr, ctx.vals[0], true);
  
  ctx.storagePtr += 1;
}

function _lowerFlatU16(ctx) {
  _debugLog('[_lowerFlatU16()] args', { ctx });
  
  if (!ctx.memory) { throw new Error("missing memory for lower"); }
  if (ctx.vals.length !== 1) {
    throw new Error(`unexpected number [${ctx.vals.length}] of vals (expected 1)`);
  }
  
  const rem = ctx.storagePtr % 2;
  if (rem !== 0) { ctx.storagePtr += (2 - rem); }
  
  _requireValidNumericPrimitive.bind('u16', ctx.vals[0]);
  new DataView(ctx.memory.buffer).setUint16(ctx.storagePtr, ctx.vals[0], true);
  
  ctx.storagePtr += 2;
}

function _lowerFlatU32(ctx) {
  _debugLog('[_lowerFlatU32()] args', { ctx });
  
  if (ctx.vals.length !== 1) {
    throw new Error(`expected single value to lower, got [${ctx.vals.length}]`);
  }
  
  const rem = ctx.storagePtr % 4;
  if (rem !== 0) { ctx.storagePtr += (4 - rem); }
  
  _requireValidNumericPrimitive.bind('u32', ctx.vals[0]);
  new DataView(ctx.memory.buffer).setUint32(ctx.storagePtr, ctx.vals[0], true);
  
  ctx.storagePtr += 4;
}

function _lowerFlatU64(ctx) {
  _debugLog('[_lowerFlatU64()] args', { ctx });
  
  if (ctx.vals.length !== 1) { throw new Error('unexpected number of vals'); }
  
  const rem = ctx.storagePtr % 8;
  if (rem !== 0) { ctx.storagePtr += (8 - rem); }
  
  _requireValidNumericPrimitive.bind('u64', ctx.vals[0]);
  new DataView(ctx.memory.buffer).setBigUint64(ctx.storagePtr, ctx.vals[0], true);
  
  ctx.storagePtr += 8;
}

function _lowerFlatStringAny(ctx) {
  switch (ctx.stringEncoding) {
    case 'utf8':
    return _lowerFlatStringUTF8(ctx);
    case 'utf16':
    return _lowerFlatStringUTF16(ctx);
    default:
    throw new Error(`missing/unrecognized/unsupported string encoding [${ctx.stringEncoding}]`);
  }
}

function _lowerFlatStringUTF8(ctx) {
  _debugLog('[_lowerFlatStringUTF8()] args', ctx);
  if (!ctx.realloc) { throw new Error('missing realloc during flat string lower'); }
  
  const s = ctx.vals[0];
  const { ptr, codepoints } = _utf8AllocateAndEncode(ctx.vals[0], ctx.realloc, ctx.memory);
  
  const view = new DataView(ctx.memory.buffer);
  view.setUint32(ctx.storagePtr, ptr, true);
  view.setUint32(ctx.storagePtr + 4, codepoints, true);
  
  ctx.storagePtr += 8;
}

function _lowerFlatStringUTF16(ctx) {
  _debugLog('[_lowerFlatStringUTF16()] args', { ctx });
  if (!ctx.realloc) { throw new Error('missing realloc during flat string lower'); }
  
  const s = ctx.vals[0];
  const { ptr, len, codepoints } = _utf16AllocateAndEncode(ctx.vals[0], ctx.realloc, ctx.memory);
  
  const view = new DataView(ctx.memory.buffer);
  view.setUint32(ctx.storagePtr, ptr, true);
  view.setUint32(ctx.storagePtr + 4, codepoints, true);
  
  const bytes = new Uint16Array(ctx.memory.buffer, start, codeUnits);
  if (ctx.memory.buffer.byteLength < start + bytes.byteLength) {
    throw new Error('memory out of bounds');
  }
  if (ctx.storageLen !== undefined && ctx.storageLen !== bytes.byteLength) {
    throw new Error(`storage length [${ctx.storageLen}] != [${bytes.byteLength}])`);
  }
  new Uint16Array(ctx.memory.buffer, ctx.storagePtr).set(bytes);
  
  ctx.storagePtr += len;
}

function _lowerFlatRecord(meta) {
  const { fieldMetas, size32: recordSize32, align32: recordAlign32 } = meta;
  return function _lowerFlatRecordInner(ctx) {
    _debugLog('[_lowerFlatRecord()] args', { ctx });
    
    const originalPtr = ctx.storagePtr;
    const r = ctx.vals[0];
    for (const [tag, lowerFn, size32, align32 ] of fieldMetas) {
      const rem = ctx.storagePtr % align32;
      if (rem !== 0) { ctx.storagePtr += align32 - rem; }
      
      const fieldPtr = ctx.storagePtr;
      ctx.vals = [r[tag]];
      lowerFn(ctx);
      
      ctx.storagePtr = Math.max(ctx.storagePtr, fieldPtr + size32);
    }
    
    ctx.storagePtr = Math.max(ctx.storagePtr, originalPtr + recordSize32);
    
    const rem = ctx.storagePtr % recordAlign32;
    if (rem !== 0) {
      ctx.storagePtr += recordAlign32 - rem;
    }
  }
}

function _lowerFlatVariant(meta) {
  const { variantSize32, variantAlign32, variantPayloadOffset32, caseMetas } = meta;
  
  let caseLookup = {};
  for (const [idx, meta] of caseMetas.entries()) {
    let tag = meta[0];
    caseLookup[tag] = { discriminant: idx, meta };
  }
  
  return function _lowerFlatVariantInner(ctx) {
    _debugLog('[_lowerFlatVariant()] args', { ctx });
    
    const { tag, val } = ctx.vals[0];
    const variantCase = caseLookup[tag];
    if (!variantCase) {
      throw new Error(`missing tag [${tag}] (valid tags: ${Object.keys(caseLookup)})`);
    }
    
    const [ _tag, lowerFn, caseSize32, caseAlign32, caseFlatCount ] = variantCase.meta;
    
    const originalPtr = ctx.storagePtr;
    ctx.vals = [variantCase.discriminant];
    let discLowerRes;
    if (caseMetas.length < 256) {
      discLowerRes = _lowerFlatU8(ctx);
    } else if (caseMetas.length >= 256 && caseMetas.length < 65536) {
      discLowerRes = _lowerFlatU16(ctx);
    } else if (caseMetas.length >= 65536 && caseMetas.length < 4_294_967_296) {
      discLowerRes = _lowerFlatU32(ctx);
    } else {
      throw new Error(`unsupported number of cases [${caseMetas.length}]`);
    }
    
    const payloadOffsetPtr = originalPtr + variantPayloadOffset32;
    ctx.storagePtr = payloadOffsetPtr;
    ctx.vals = [val];
    if (lowerFn) { lowerFn(ctx); }
    
    ctx.storagePtr = Math.max(ctx.storagePtr, originalPtr + variantSize32);
    
    const rem = ctx.storagePtr % variantAlign32;
    if (rem !== 0) { ctx.storagePtr += varianttAlign32 - rem; }
  }
}

function _lowerFlatList(meta) {
  const {
    elemLowerFn,
    knownLen,
    size32,
    align32,
    elemSize32,
    elemAlign32,
  } = meta;
  
  if (!elemLowerFn) { throw new TypeError("missing/invalid element lower fn for list"); }
  
  return function _lowerFlatListInner(ctx) {
    _debugLog('[_lowerFlatList()] args', { ctx });
    
    if (ctx.useDirectParams) {
      if (ctx.params.length < 2) { throw new Error('insufficient params left to lower list'); }
      const storagePtr = ctx.params[0];
      const elemCount = ctx.params[1];
      ctx.params = ctx.params.slice(2);
      
      const list = ctx.vals[0];
      if (!list) { throw new Error("missing direct param value"); }
      
      const lowerCtx = {
        storagePtr,
        memory: ctx.memory,
        stringEncoding: ctx.stringEncoding,
      };
      for (let idx = 0; idx < list.length; idx++) {
        const elemPtr = storagePtr + idx * elemSize32;
        lowerCtx.storagePtr = elemPtr;
        lowerCtx.vals = list.slice(idx, idx+1);
        elemLowerFn(lowerCtx);
        lowerCtx.storagePtr = Math.max(lowerCtx.storagePtr, elemPtr + elemSize32);
      }
      ctx.storagePtr = lowerCtx.storagePtr;
      
      // TODO: implement parma-only known-length processing
      
      return;
    }
    
    // TODO(fix): is it possible to get a vals that are a addr and length here from
    // a component lower?
    
    const elems = ctx.vals[0];
    if (knownLen === undefined) {
      // unknown length
      if (!ctx.realloc) { throw new Error('missing realloc during flat string lower'); }
      const dataPtr = ctx.realloc(0, 0, elemAlign32, elemSize32 * elems.length);
      
      ctx.vals[0] = dataPtr;
      _lowerFlatU32(ctx);
      
      ctx.vals[0] = elems.length;
      _lowerFlatU32(ctx);
      
      const origPtr = ctx.storagePtr;
      ctx.storagePtr = dataPtr;
      
      for (const [idx, elem] of elems.entries()) {
        const elemPtr = dataPtr + idx * elemSize32;
        ctx.storagePtr = elemPtr;
        ctx.vals = [elem];
        elemLowerFn(ctx);
        ctx.storagePtr = Math.max(ctx.storagePtr, elemPtr + elemSize32);
      }
      
      ctx.storagePtr = origPtr;
      
    } else {
      // known length
      
      if (elems.length !== knownLen) {
        throw new TypeError(`invalid list input of length [${elems.length}], must be length [${knownLen}]`);
      }
      
      const originalPtr = ctx.storagePtr;
      for (const [idx, elem] of elems.entries()) {
        const elemPtr = originalPtr + idx * elemSize32;
        ctx.storagePtr = elemPtr;
        ctx.vals = [elem];
        elemLowerFn(ctx);
        ctx.storagePtr = Math.max(ctx.storagePtr, elemPtr + elemSize32);
      }
    }
    
    // TODO(fix): special case for u8/u16/etc, we can do a direct copy
    
    const totalSizeBytes = elems.length * size32;
    if (ctx.storageLen !== undefined && totalSizeBytes > ctx.storageLen) {
      throw new Error('not enough storage remaining for list flat lower');
    }
  }
}

function _lowerFlatTuple(meta) {
  const { elemLowerMetas, size32: tupleSize32, align32: tupleAlign32 } = meta;
  return function _lowerFlatTupleInner(ctx) {
    _debugLog('[_lowerFlatTuple()] args', { ctx });
    const originalPtr = ctx.storagePtr;
    const tuple = ctx.vals[0];
    for (const [idx, [ lowerFn, size32, align32 ]]  of elemLowerMetas.entries()) {
      const rem = ctx.storagePtr % align32;
      if (rem !== 0) { ctx.storagePtr += align32 - rem; }
      
      const elemPtr = ctx.storagePtr;
      ctx.vals = [tuple[idx]];
      lowerFn(ctx);
      ctx.storagePtr = Math.max(ctx.storagePtr, elemPtr + size32);
    }
    
    ctx.storagePtr = Math.max(ctx.storagePtr, originalPtr + tupleSize32);
    
    const rem = ctx.storagePtr % tupleAlign32;
    if (rem !== 0) {
      ctx.storagePtr += tupleAlign32 - rem;
    }
  }
}

function _lowerFlatResult(meta) {
  const f = _lowerFlatVariant(meta);
  return function _lowerFlatResultInner(ctx) {
    _debugLog('[_lowerFlatResult()] args', { ctx });
    
    const v = ctx.vals[0];
    const isNotResultObject = typeof v !== 'object'
    || Object.keys(v).length !== 2
    || !('tag' in v)
    || !('ok' === v.tag || 'err' === v.tag)
    || !('val' in v);
    if (isNotResultObject) {
      ctx.vals[0] = { tag: 'ok', val: v };
    }
    
    f(ctx);
  };
}

function _lowerFlatOwn(meta) {
  const { lowerFn, componentIdx } = meta;
  
  return function _lowerFlatOwnInner(ctx) {
    _debugLog('[_lowerFlatOwn()] args', { ctx });
    const { createFn } = ctx;
    
    if (ctx.componentIdx !== componentIdx) {
      throw new Error(`component index mismatch (expected [${componentIdx}], lift called from [${ctx.componentIdx}])`);
    }
    
    const obj = ctx.vals[0];
    if (obj === undefined || obj === null) { throw new Error('missing resource'); }
    const handle = lowerFn(obj);
    
    ctx.vals[0] = handle;
    _lowerFlatU32(ctx);
  };
}

const STREAMS = new RepTable({ target: 'global stream map' });
const ASYNC_STATE = new Map();

function getOrCreateAsyncState(componentIdx, init) {
  if (!ASYNC_STATE.has(componentIdx)) {
    const newState = new ComponentAsyncState({ componentIdx });
    ASYNC_STATE.set(componentIdx, newState);
  }
  return ASYNC_STATE.get(componentIdx);
}

class ComponentAsyncState {
  static EVENT_HANDLER_EVENTS = [ 'backpressure-change' ];
  
  #componentIdx;
  #callingAsyncImport = false;
  #syncImportWait = promiseWithResolvers();
  #locked = false;
  #parkedTasks = new Map();
  #suspendedTasksByTaskID = new Map();
  #suspendedTaskIDs = [];
  #errored = null;
  
  #backpressure = 0;
  #backpressureWaiters = 0n;
  
  #handlerMap = new Map();
  #nextHandlerID = 0n;
  
  #tickLoop = null;
  #tickLoopInterval = null;
  
  #onExclusiveReleaseHandlers = [];
  
  mayLeave = true;
  
  handles;
  subtasks;
  
  constructor(args) {
    this.#componentIdx = args.componentIdx;
    this.handles = new RepTable({ target: `component [${this.#componentIdx}] handles (waitable objects)` });
    this.subtasks = new RepTable({ target: `component [${this.#componentIdx}] subtasks` });
  };
  
  componentIdx() { return this.#componentIdx; }
  
  errored() { return this.#errored !== null; }
  setErrored(err) {
    _debugLog('[ComponentAsyncState#setErrored()] component errored', { err, componentIdx: this.#componentIdx });
    if (this.#errored) { return; }
    if (!err) {
      err = new Error('error elswehere (see other component instance error)')
      err.componentIdx = this.#componentIdx;
    }
    this.#errored = err;
  }
  
  callingSyncImport(val) {
    if (val === undefined) { return this.#callingAsyncImport; }
    if (typeof val !== 'boolean') { throw new TypeError('invalid setting for async import'); }
    const prev = this.#callingAsyncImport;
    this.#callingAsyncImport = val;
    if (prev === true && this.#callingAsyncImport === false) {
      this.#notifySyncImportEnd();
    }
  }
  
  #notifySyncImportEnd() {
    const existing = this.#syncImportWait;
    this.#syncImportWait = promiseWithResolvers();
    existing.resolve();
  }
  
  async waitForSyncImportCallEnd() {
    await this.#syncImportWait.promise;
  }
  
  setBackpressure(v) {
    this.#backpressure = v;
    return this.#backpressure
  }
  getBackpressure() { return this.#backpressure; }
  
  incrementBackpressure() {
    const current = this.#backpressure;
    if (current < 0 || current > 2**16) {
      throw new Error(`invalid current backpressure value [${current}]`);
    }
    const newValue = this.getBackpressure() + 1;
    if (newValue >= 2**16) {
      throw new Error(`invalid new backpressure value [${newValue}], overflow`);
    }
    return this.setBackpressure(newValue);
  }
  
  decrementBackpressure() {
    const current = this.#backpressure;
    if (current < 0 || current > 2**16) {
      throw new Error(`invalid current backpressure value [${current}]`);
    }
    const newValue = Math.max(0, current - 1);
    if (newValue < 0) {
      throw new Error(`invalid new backpressure value [${newValue}], underflow`);
    }
    return this.setBackpressure(newValue);
  }
  hasBackpressure() { return this.#backpressure > 0; }
  
  waitForBackpressure() {
    let backpressureCleared = false;
    const cstate = this;
    cstate.addBackpressureWaiter();
    const handlerID = this.registerHandler({
      event: 'backpressure-change',
      fn: (bp) => {
        if (bp === 0) {
          cstate.removeHandler(handlerID);
          backpressureCleared = true;
        }
      }
    });
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (backpressureCleared) { return; }
        clearInterval(interval);
        cstate.removeBackpressureWaiter();
        resolve(null);
      }, 0);
    });
  }
  
  registerHandler(args) {
    const { event, fn } = args;
    if (!event) { throw new Error("missing handler event"); }
    if (!fn) { throw new Error("missing handler fn"); }
    
    if (!ComponentAsyncState.EVENT_HANDLER_EVENTS.includes(event)) {
      throw new Error(`unrecognized event handler [${event}]`);
    }
    
    const handlerID = this.#nextHandlerID++;
    let handlers = this.#handlerMap.get(event);
    if (!handlers) {
      handlers = [];
      this.#handlerMap.set(event, handlers)
    }
    
    handlers.push({ id: handlerID, fn, event });
    return handlerID;
  }
  
  removeHandler(args) {
    const { event, handlerID } = args;
    const registeredHandlers = this.#handlerMap.get(event);
    if (!registeredHandlers) { return; }
    const found = registeredHandlers.find(h => h.id === handlerID);
    if (!found) { return; }
    this.#handlerMap.set(event, this.#handlerMap.get(event).filter(h => h.id !== handlerID));
  }
  
  getBackpressureWaiters() { return this.#backpressureWaiters; }
  addBackpressureWaiter() { this.#backpressureWaiters++; }
  removeBackpressureWaiter() {
    this.#backpressureWaiters--;
    if (this.#backpressureWaiters < 0) {
      throw new Error("unexepctedly negative number of backpressure waiters");
    }
  }
  
  isExclusivelyLocked() { return this.#locked === true; }
  setLocked(locked) {
    this.#locked = locked;
  }
  
  exclusiveLock() {
    _debugLog('[ComponentAsyncState#exclusiveLock()]', {
      locked: this.#locked,
      componentIdx: this.#componentIdx,
    });
    this.setLocked(true);
  }
  
  exclusiveRelease() {
    _debugLog('[ComponentAsyncState#exclusiveRelease()] args', {
      locked: this.#locked,
      componentIdx: this.#componentIdx,
    });
    this.setLocked(false);
    
    this.#onExclusiveReleaseHandlers = this.#onExclusiveReleaseHandlers.filter(v => !!v);
    for (const [idx, f] of this.#onExclusiveReleaseHandlers.entries()) {
      try {
        this.#onExclusiveReleaseHandlers[idx] = null;
        f();
      } catch (err) {
        _debugLog("error while executing handler for next exclusive release", err);
        throw err;
      }
    }
  }
  
  onNextExclusiveRelease(fn) {
    _debugLog('[ComponentAsyncState#()onNextExclusiveRelease] registering');
    this.#onExclusiveReleaseHandlers.push(fn);
  }
  
  // nextTaskPromise & nextTaskQueue are used to await current task completion and queues
  // any tasks attempting to enter() and complete.
  //
  // see: nextTaskExecutionSlot()
  //
  // TODO(threads): this should be unnecessary once threads are properly implemented,
  // as the task.enter() logic should suffice (it should be guaranteed that we cannot re-enter
  // unless the task in question is the current task in the thread execution, and only one can
  // run at a time)
  #nextTaskPromise = Promise.resolve(true);
  #nextTaskQueue = [];
  
  async nextTaskExecutionSlot(args) {
    const { task } = args;
    
    const placeholder = {
      completed: false,
      task,
      promise: task.exitPromise().then(() => {
        placeholder.completed = true;
      }),
    };
    this.#nextTaskQueue.push(placeholder);
    
    let next;
    while (true) {
      await this.#nextTaskPromise;
      
      next = this.#nextTaskQueue.find(placeholder => !placeholder.completed);
      
      // This task is next in the queue, we can continue
      if (next === undefined || next === placeholder) {
        this.#nextTaskPromise = next.promise;
        if (this.#nextTaskQueue.length > 1000) {
          this.#nextTaskQueue = this.#nextTaskQueue.filter(p => !p.completed);
          if (this.#nextTaskQueue.length > 1000) {
            _debugLog('[ComponentAsyncState#()nextTaskExecutionSlot] next task queue length > 1000 even after cleanup, tasks may be leaking');
          }
        }
        break;
      }
      
      // If we get here, this task was *not* next in the queue, continue waiting
      // (at this point the task that *is* next will likely have already set itself
      // as this.#nextTaskPromise)
    }
  }
  
  #getSuspendedTaskMeta(taskID) {
    return this.#suspendedTasksByTaskID.get(taskID);
  }
  
  #removeSuspendedTaskMeta(taskID) {
    _debugLog('[ComponentAsyncState#removeSuspendedTaskMeta()] removing suspended task', {
      taskID,
      componentIdx: this.#componentIdx,
    });
    const idx = this.#suspendedTaskIDs.findIndex(t => t === taskID);
    const meta = this.#suspendedTasksByTaskID.get(taskID);
    this.#suspendedTaskIDs[idx] = null;
    this.#suspendedTasksByTaskID.delete(taskID);
    return meta;
  }
  
  #addSuspendedTaskMeta(meta) {
    if (!meta) { throw new Error('missing task meta'); }
    const taskID = meta.taskID;
    this.#suspendedTasksByTaskID.set(taskID, meta);
    this.#suspendedTaskIDs.push(taskID);
    if (this.#suspendedTasksByTaskID.size < this.#suspendedTaskIDs.length - 10) {
      this.#suspendedTaskIDs = this.#suspendedTaskIDs.filter(t => t !== null);
    }
  }
  
  // TODO(threads): readyFn is normally on the thread
  suspendTask(args) {
    const { task, readyFn } = args;
    const taskID = task.id();
    const componentIdx = task.componentIdx();
    _debugLog('[ComponentAsyncState#suspendTask()]', {
      taskID,
      componentIdx: this.#componentIdx,
      taskEntryFnName: task.entryFnName(),
      subtask: task.getParentSubtask(),
    });
    
    if (componentIdx !== this.#componentIdx) {
      throw new Error('assert: task component idx should match async state');
    }
    
    if (this.#getSuspendedTaskMeta(taskID)) {
      throw new Error(`task [${taskID}] already suspended`);
    }
    
    const { promise, resolve, reject } = promiseWithResolvers();
    this.#addSuspendedTaskMeta({
      task,
      taskID,
      readyFn,
      resume: () => {
        _debugLog('[ComponentAsyncState] resuming suspended task', {
          taskID,
          componentIdx: this.#componentIdx,
        });
        // TODO(threads): it's thread cancellation we should be checking for below, not task
        resolve(!task.isCancelled());
      },
    });
    
    this.runTickLoop();
    
    return promise;
  }
  
  resumeTaskByID(taskID) {
    const meta = this.#removeSuspendedTaskMeta(taskID);
    if (!meta) { return; }
    if (meta.taskID !== taskID) { throw new Error('task ID does not match'); }
    meta.resume();
  }
  
  async runTickLoop() {
    if (this.#tickLoop !== null) { return; }
    this.#tickLoop = 1;
    setTimeout(async () => {
      let done = this.tick();
      while (!done) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        done = this.tick();
      }
      this.#tickLoop = null;
    }, 10);
  }
  
  tick() {
    // _debugLog('[ComponentAsyncState#tick()]', { suspendedTaskIDs: this.#suspendedTaskIDs });
    
    const resumableTasks = this.#suspendedTaskIDs.filter(t => t !== null);
    for (const taskID of resumableTasks) {
      const meta = this.#suspendedTasksByTaskID.get(taskID);
      if (!meta || !meta.readyFn) {
        throw new Error(`missing/invalid task despite ID [${taskID}] being present`);
      }
      
      // If the task failed via any means, allow the task to resume because
      // it's been cancelled -- the callback should immediately exit as well
      if (meta.task.isRejected()) {
        _debugLog('[ComponentAsyncState#tick()] detected task rejection, leaving early', { meta });
        this.resumeTaskByID(taskID);
        return;
      }
      
      const isReady = meta.readyFn();
      if (!isReady) { continue; }
      
      _debugLog('[ComponentAsyncState#tick()] resuming task via tick', {
        taskID,
        componentIdx: this.#componentIdx,
      });
      this.resumeTaskByID(taskID);
    }
    
    return this.#suspendedTaskIDs.filter(t => t !== null).length === 0;
  }
  
  addStreamEndToTable(args) {
    _debugLog('[ComponentAsyncState#addStreamEnd()] args', args);
    const { tableIdx, streamEnd } = args;
    if (typeof streamEnd === 'number') { throw new Error("INSERTING BAD STREAMEND"); }
    
    let { table, componentIdx } = STREAM_TABLES[tableIdx];
    if (componentIdx === undefined || !table) {
      throw new Error(`invalid global stream table state for table [${tableIdx}]`);
    }
    
    const handle = table.insert(streamEnd);
    streamEnd.setHandle(handle);
    streamEnd.setStreamTableIdx(tableIdx);
    
    const cstate = getOrCreateAsyncState(componentIdx);
    const waitableIdx = cstate.handles.insert(streamEnd);
    streamEnd.setWaitableIdx(waitableIdx);
    
    _debugLog('[ComponentAsyncState#addStreamEnd()] added stream end', {
      tableIdx,
      table,
      handle,
      streamEnd,
      destComponentIdx: componentIdx,
    });
    
    return { handle, waitableIdx };
  }
  
  createWaitable(args) {
    return new Waitable({ target: args?.target, });
  }
  
  createReadableStreamEnd(args) {
    _debugLog('[ComponentAsyncState#createStreamEnd()] args', args);
    const { tableIdx, elemMeta, hostInjectFn } = args;
    
    const { table: localStreamTable, componentIdx } = STREAM_TABLES[tableIdx];
    if (!localStreamTable) {
      throw new Error(`missing global stream table lookup for table [${tableIdx}] while creating stream`);
    }
    if (componentIdx !== this.#componentIdx) {
      throw new Error('component idx mismatch while creating stream');
    }
    
    const waitable = this.createWaitable();
    const streamEnd = new StreamReadableEnd({
      tableIdx,
      elemMeta,
      hostInjectFn,
      pendingBufferMeta: {},
      target: `stream read end (lowered, @init)`,
      waitable,
    });
    
    streamEnd.setWaitableIdx(this.handles.insert(streamEnd));
    streamEnd.setHandle(localStreamTable.insert(streamEnd));
    if (streamEnd.streamTableIdx() !== tableIdx) {
      throw new Error("unexpectedly mismatched stream table");
    }
    const streamEndWaitableIdx = streamEnd.waitableIdx();
    const streamEndHandle = streamEnd.handle();
    waitable.setTarget(`waitable for stream read end (lowered, waitable [${streamEndWaitableIdx}])`);
    streamEnd.setTarget(`stream read end (lowered, waitable [${streamEndWaitableIdx}])`);
    
    return {
      waitableIdx: streamEndWaitableIdx,
      handle: streamEndHandle,
      streamEnd,
    };
  }
  
  createStream(args) {
    _debugLog('[ComponentAsyncState#createStream()] args', args);
    const { tableIdx, elemMeta, hostInjectFn } = args;
    if (tableIdx === undefined) { throw new Error("missing table idx while adding stream"); }
    if (elemMeta === undefined) { throw new Error("missing element metadata while adding stream"); }
    
    const { table: localStreamTable, componentIdx } = STREAM_TABLES[tableIdx];
    if (!localStreamTable) {
      throw new Error(`missing global stream table lookup for table [${tableIdx}] while creating stream`);
    }
    if (componentIdx !== this.#componentIdx) {
      throw new Error('component idx mismatch while creating stream');
    }
    
    const readWaitable = this.createWaitable();
    const writeWaitable = this.createWaitable();
    
    const stream = new InternalStream({
      tableIdx,
      elemMeta,
      readWaitable,
      writeWaitable,
      hostInjectFn,
    });
    stream.setGlobalStreamMapRep(STREAMS.insert(stream));
    
    const writeEnd = stream.writeEnd();
    writeEnd.setWaitableIdx(this.handles.insert(writeEnd));
    writeEnd.setHandle(localStreamTable.insert(writeEnd));
    if (writeEnd.streamTableIdx() !== tableIdx) { throw new Error("unexpectedly mismatched stream table"); }
    
    const writeEndWaitableIdx = writeEnd.waitableIdx();
    const writeEndHandle = writeEnd.handle();
    writeWaitable.setTarget(`waitable for stream write end (waitable [${writeEndWaitableIdx}])`);
    writeEnd.setTarget(`stream write end (waitable [${writeEndWaitableIdx}])`);
    
    const readEnd = stream.readEnd();
    readEnd.setWaitableIdx(this.handles.insert(readEnd));
    readEnd.setHandle(localStreamTable.insert(readEnd));
    if (readEnd.streamTableIdx() !== tableIdx) { throw new Error("unexpectedly mismatched stream table"); }
    
    const readEndWaitableIdx = readEnd.waitableIdx();
    const readEndHandle = readEnd.handle();
    readWaitable.setTarget(`waitable for read end (waitable [${readEndWaitableIdx}])`);
    readEnd.setTarget(`stream read end (waitable [${readEndWaitableIdx}])`);
    
    return {
      writeEnd,
      writeEndWaitableIdx,
      writeEndHandle,
      readEndWaitableIdx,
      readEndHandle,
      readEnd,
    };
  }
  
  getStreamEnd(args) {
    _debugLog('[ComponentAsyncState#getStreamEnd()] args', args);
    const { tableIdx, streamEndHandle, streamEndWaitableIdx } = args;
    if (tableIdx === undefined) {
      throw new Error('missing table idx while getting stream end');
    }
    
    const { table, componentIdx } = STREAM_TABLES[tableIdx];
    const cstate = getOrCreateAsyncState(componentIdx);
    
    let streamEnd;
    if (streamEndWaitableIdx !== undefined) {
      streamEnd = cstate.handles.get(streamEndWaitableIdx);
    } else if (streamEndHandle !== undefined) {
      if (!table) { throw new Error(`missing/invalid table [${tableIdx}] while getting stream end`); }
      streamEnd = table.get(streamEndHandle);
    } else {
      throw new TypeError("must specify either waitable idx or handle to retrieve stream");
    }
    
    if (!streamEnd) {
      throw new Error(`missing stream end (tableIdx [${tableIdx}], handle [${streamEndHandle}], waitableIdx [${streamEndWaitableIdx}])`);
    }
    if (tableIdx && streamEnd.streamTableIdx() !== tableIdx) {
      throw new Error(`stream end table idx [${streamEnd.streamTableIdx()}] does not match [${tableIdx}]`);
    }
    
    return streamEnd;
  }
  
  deleteStreamEnd(args) {
    _debugLog('[ComponentAsyncState#deleteStreamEnd()] args', args);
    const { tableIdx, streamEndWaitableIdx } = args;
    if (tableIdx === undefined) { throw new Error("missing table idx while removing stream end"); }
    if (streamEndWaitableIdx === undefined) { throw new Error("missing stream idx while removing stream end"); }
    
    const { table, componentIdx } = STREAM_TABLES[tableIdx];
    const cstate = getOrCreateAsyncState(componentIdx);
    
    const streamEnd = cstate.handles.get(streamEndWaitableIdx);
    if (!streamEnd) {
      throw new Error(`missing stream end [${streamEndWaitableIdx}] in component handles while deleting stream`);
    }
    if (streamEnd.streamTableIdx() !== tableIdx) {
      throw new Error(`stream end table idx [${streamEnd.streamTableIdx()}] does not match [${tableIdx}]`);
    }
    
    let removed = cstate.handles.remove(streamEnd.waitableIdx());
    if (!removed) {
      throw new Error(`failed to remove stream end [${streamEndWaitableIdx}] waitable obj in component [${componentIdx}]`);
    }
    
    removed = table.remove(streamEnd.handle());
    if (!removed) {
      throw new Error(`failed to remove stream end with handle [${streamEnd.handle()}] from stream table [${tableIdx}] in component [${componentIdx}]`);
    }
    
    return streamEnd;
  }
  
  removeStreamEndFromTable(args) {
    _debugLog('[ComponentAsyncState#removeStreamEndFromTable()] args', args);
    
    const { tableIdx, streamWaitableIdx } = args;
    if (tableIdx === undefined) { throw new Error("missing table idx while removing stream end"); }
    if (streamWaitableIdx === undefined) {
      throw new Error("missing stream end waitable idx while removing stream end");
    }
    
    const { table, componentIdx } = STREAM_TABLES[tableIdx];
    if (!table) { throw new Error(`missing/invalid table [${tableIdx}] while removing stream end`); }
    
    const cstate = getOrCreateAsyncState(componentIdx);
    
    const streamEnd = cstate.handles.get(streamWaitableIdx);
    if (!streamEnd) {
      throw new Error(`missing stream end (handle [${streamWaitableIdx}], table [${tableIdx}])`);
    }
    const handle = streamEnd.handle();
    
    let removed = cstate.handles.remove(streamWaitableIdx);
    if (!removed) {
      throw new Error(`failed to remove streamEnd from handles (waitable idx [${streamWaitableIdx}]), component [${componentIdx}])`);
    }
    
    removed = table.remove(handle);
    if (!removed) {
      throw new Error(`failed to remove streamEnd from table (handle [${handle}]), table [${tableIdx}], component [${componentIdx}])`);
    }
    
    return streamEnd;
  }
  
  createFuture(args) {
    _debugLog('[ComponentAsyncState#createFuture()] args', args);
    const { tableIdx, elemMeta, hostInjectFn } = args;
    if (tableIdx === undefined) { throw new Error("missing table idx while adding future"); }
    if (elemMeta === undefined) { throw new Error("missing element metadata while adding future"); }
    
    const { table: futureTable, componentIdx } = FUTURE_TABLES[tableIdx];
    if (!futureTable) {
      throw new Error(`missing global future table lookup for table [${tableIdx}] while creating future`);
    }
    if (componentIdx !== this.#componentIdx) {
      throw new Error('component idx mismatch while creating future');
    }
    
    const readWaitable = this.createWaitable();
    const writeWaitable = this.createWaitable();
    
    const future = new InternalFuture({
      tableIdx,
      componentIdx: this.#componentIdx,
      elemMeta,
      readWaitable,
      writeWaitable,
      hostInjectFn,
    });
    future.setGlobalFutureMapRep(FUTURES.insert(future));
    
    const writeEnd = future.writeEnd();
    writeEnd.setWaitableIdx(this.handles.insert(writeEnd));
    writeEnd.setHandle(futureTable.insert(writeEnd));
    if (writeEnd.futureTableIdx() !== tableIdx) { throw new Error("unexpectedly mismatched future table"); }
    
    const writeEndWaitableIdx = writeEnd.waitableIdx();
    const writeEndHandle = writeEnd.handle();
    writeWaitable.setTarget(`waitable for future write end (waitable [${writeEndWaitableIdx}])`);
    writeEnd.setTarget(`future write end (waitable [${writeEndWaitableIdx}])`);
    
    const readEnd = future.readEnd();
    readEnd.setWaitableIdx(this.handles.insert(readEnd));
    readEnd.setHandle(futureTable.insert(readEnd));
    if (readEnd.futureTableIdx() !== tableIdx) { throw new Error("unexpectedly mismatched future table"); }
    
    const readEndWaitableIdx = readEnd.waitableIdx();
    const readEndHandle = readEnd.handle();
    readWaitable.setTarget(`waitable for read end (waitable [${readEndWaitableIdx}])`);
    readEnd.setTarget(`future read end (waitable [${readEndWaitableIdx}])`);
    
    return {
      writeEnd,
      writeEndWaitableIdx,
      writeEndHandle,
      readEndWaitableIdx,
      readEndHandle,
      readEnd,
    };
  }
  
  getFutureEnd(args) {
    _debugLog('[ComponentAsyncState#getFutureEnd()] args', args);
    const { tableIdx, futureEndHandle, futureEndWaitableIdx } = args;
    if (tableIdx === undefined) {
      throw new Error('missing table idx while getting future end');
    }
    
    const { table, componentIdx } = FUTURE_TABLES[tableIdx];
    const cstate = getOrCreateAsyncState(componentIdx);
    
    let futureEnd;
    if (futureEndWaitableIdx !== undefined) {
      futureEnd = cstate.handles.get(futureEndWaitableIdx);
    } else if (futureEndHandle !== undefined) {
      if (!table) { throw new Error(`missing/invalid table [${tableIdx}] while getting future end`); }
      futureEnd = table.get(futureEndHandle);
    } else {
      throw new TypeError("must specify either waitable idx or handle to retrieve future");
    }
    
    if (!futureEnd) {
      throw new Error(`missing future end (tableIdx [${tableIdx}], handle [${futureEndHandle}], waitableIdx [${futureEndWaitableIdx}])`);
    }
    if (tableIdx && futureEnd.futureTableIdx() !== tableIdx) {
      throw new Error(`future end table idx [${futureEnd.futureTableIdx()}] does not match [${tableIdx}]`);
    }
    
    return futureEnd;
  }
  
  removeFutureEndFromTable(args) {
    _debugLog('[ComponentAsyncState#removeFutureEndFromTable()] args', args);
    
    const { tableIdx, futureWaitableIdx } = args;
    if (tableIdx === undefined) { throw new Error("missing table idx while removing future end"); }
    if (futureWaitableIdx === undefined) {
      throw new Error("missing future end waitable idx while removing future end");
    }
    
    const { table, componentIdx } = FUTURE_TABLES[tableIdx];
    if (!table) { throw new Error(`missing/invalid table [${tableIdx}] while removing future end`); }
    
    const cstate = getOrCreateAsyncState(componentIdx);
    
    const futureEnd = cstate.handles.get(futureWaitableIdx);
    if (!futureEnd) {
      throw new Error(`missing future end (handle [${futureWaitableIdx}], table [${tableIdx}])`);
    }
    const handle = futureEnd.handle();
    
    let removed = cstate.handles.remove(futureWaitableIdx);
    if (!removed) {
      throw new Error(`failed to remove futureEnd from handles (waitable idx [${futureWaitableIdx}]), component [${componentIdx}])`);
    }
    
    removed = table.remove(handle);
    if (!removed) {
      throw new Error(`failed to remove futureEnd from table (handle [${handle}]), table [${tableIdx}], component [${componentIdx}])`);
    }
    
    return futureEnd;
  }
  
}

const base64Compile = str => WebAssembly.compile(
typeof Buffer !== 'undefined'
? Buffer.from(str, 'base64')
: Uint8Array.from(atob(str), b => b.charCodeAt(0))
);


const symbolCabiDispose = Symbol.for('cabiDispose');

const symbolRscHandle = Symbol('handle');

const symbolRscRep = Symbol.for('cabiRep');

const HANDLE_TABLES= [];


class ComponentError extends Error {
  constructor (value) {
    const enumerable = typeof value !== 'string';
    super(enumerable ? `${String(value)} (see error.payload)` : value);
    Object.defineProperty(this, 'payload', { value, enumerable });
  }
}

function getErrorPayload(e) {
  if (e && hasOwnProperty.call(e, 'payload')) return e.payload;
  if (e instanceof Error) throw e;
  return e;
}

const isLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

const hasOwnProperty = Object.prototype.hasOwnProperty;

const instantiateCore = WebAssembly.instantiate;


let exports0;

const handleTable1 = [T_FLAG, 0];
handleTable1._createdReps = new Set();


const captureTable1= new Map();
let captureCnt1= 0;

HANDLE_TABLES[1] = handleTable1;

const _trampoline2 = function() {
  _debugLog('[iface="wasi:cli/stderr@0.2.6", function="get-stderr"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'getStderr',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'none',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  
  try {
    ret = _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => getStderr(),
    })
    ;
  } catch (err) {
    
    _debugLog('[Instruction::CallInterface] error during sync call', {
      taskID: task.id(),
      subtaskID: currentSubtask?.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  
  if (!(ret instanceof OutputStream)) {
    throw new TypeError('Resource error: Not a valid \"OutputStream\" resource.');
  }
  var handle0 = ret[symbolRscHandle];
  if (!handle0) {
    const rep = ret[symbolRscRep] || ++captureCnt1;
    captureTable1.set(rep, ret);
    handle0 = rscTableCreateOwn(handleTable1, rep);
  }
  
  _debugLog('[iface="wasi:cli/stderr@0.2.6", function="get-stderr"][Instruction::Return]', {
    funcName: 'get-stderr',
    paramCount: 1,
    async: false,
    postReturn: false
  });
  task.resolve([handle0]);
  task.exit();
  return handle0;
}
_trampoline2.fnName = 'wasi:cli/stderr@0.2.6#getStderr';

const _trampoline3 = function(arg0) {
  let variant0;
  switch (arg0) {
    case 0: {
      variant0= {
        tag: 'ok',
        val: undefined
      };
      break;
    }
    case 1: {
      variant0= {
        tag: 'err',
        val: undefined
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  _debugLog('[iface="wasi:cli/exit@0.2.6", function="exit"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'exit',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'none',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  
  try {
    _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => exit(variant0),
    })
    ;
  } catch (err) {
    
    _debugLog('[Instruction::CallInterface] error during sync call', {
      taskID: task.id(),
      subtaskID: currentSubtask?.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  _debugLog('[iface="wasi:cli/exit@0.2.6", function="exit"][Instruction::Return]', {
    funcName: 'exit',
    paramCount: 0,
    async: false,
    postReturn: false
  });
  task.resolve([ret]);
  task.exit();
}
_trampoline3.fnName = 'wasi:cli/exit@0.2.6#exit';
let exports1;
let memory0;
let realloc0;
let realloc0Async;

const _trampoline4 = function(arg0, arg1, arg2) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  _debugLog('[iface="host:interfaces/logging@2.1.0", function="info"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'info',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'result-catch-handler',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  try {
    ret = { tag: 'ok', val: _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => info(result0),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

var variant2 = ret;
switch (variant2.tag) {
  case 'ok': {
    const e = variant2.val;
    dataView(memory0).setInt8(arg2 + 0, 0, true);
    
    break;
  }
  case 'err': {
    const e = variant2.val;
    dataView(memory0).setInt8(arg2 + 0, 1, true);
    
    var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
    var ptr1= encodeRes.ptr;
    var len1 = encodeRes.len;
    
    dataView(memory0).setUint32(arg2 + 8, len1, true);
    dataView(memory0).setUint32(arg2 + 4, ptr1, true);
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant2, valueType: typeof variant2});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="host:interfaces/logging@2.1.0", function="info"][Instruction::Return]', {
  funcName: 'info',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline4.fnName = 'host:interfaces/logging@2.1.0#info';

const _trampoline5 = function(arg0, arg1, arg2) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  _debugLog('[iface="host:interfaces/logging@2.1.0", function="error"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'error',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'result-catch-handler',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  try {
    ret = { tag: 'ok', val: _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => error(result0),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

var variant2 = ret;
switch (variant2.tag) {
  case 'ok': {
    const e = variant2.val;
    dataView(memory0).setInt8(arg2 + 0, 0, true);
    
    break;
  }
  case 'err': {
    const e = variant2.val;
    dataView(memory0).setInt8(arg2 + 0, 1, true);
    
    var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
    var ptr1= encodeRes.ptr;
    var len1 = encodeRes.len;
    
    dataView(memory0).setUint32(arg2 + 8, len1, true);
    dataView(memory0).setUint32(arg2 + 4, ptr1, true);
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant2, valueType: typeof variant2});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="host:interfaces/logging@2.1.0", function="error"][Instruction::Return]', {
  funcName: 'error',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline5.fnName = 'host:interfaces/logging@2.1.0#error';

const _trampoline6 = function(arg0) {
  _debugLog('[iface="host:interfaces/clock@2.1.0", function="now-ms"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'nowMs',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'result-catch-handler',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  try {
    ret = { tag: 'ok', val: _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => nowMs(),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

var variant1 = ret;
switch (variant1.tag) {
  case 'ok': {
    const e = variant1.val;
    dataView(memory0).setInt8(arg0 + 0, 0, true);
    dataView(memory0).setBigInt64(arg0 + 8, toUint64(e), true);
    
    break;
  }
  case 'err': {
    const e = variant1.val;
    dataView(memory0).setInt8(arg0 + 0, 1, true);
    var variant0 = e;
    switch (variant0.tag) {
      case 'no-tx-context': {
        dataView(memory0).setInt8(arg0 + 8, 0, true);
        break;
      }
      default: {
        throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant0.tag)}\` (received \`${variant0}\`) specified for \`ClockError\``);
      }
    }
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant1, valueType: typeof variant1});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="host:interfaces/clock@2.1.0", function="now-ms"][Instruction::Return]', {
  funcName: 'now-ms',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline6.fnName = 'host:interfaces/clock@2.1.0#nowMs';

const _trampoline7 = function(arg0) {
  _debugLog('[iface="host:tenant/tenant-context@1.0.0", function="tenant-did"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'tenantDid',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'none',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  
  try {
    ret = _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => tenantDid(),
    })
    ;
  } catch (err) {
    
    _debugLog('[Instruction::CallInterface] error during sync call', {
      taskID: task.id(),
      subtaskID: currentSubtask?.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  var val0 = ret;
  var len0 = Array.isArray(val0) ? val0.length : val0.byteLength;
  var ptr0 = realloc0(0, 0, 1, len0 * 1);
  
  let valData0;
  const valLenBytes0 = len0 * 1;
  if (Array.isArray(val0)) {
    // Regular array likely containing numbers, write values to memory
    let offset = 0;
    const dv0 = new DataView(memory0.buffer);
    for (const v of val0) {
      _requireValidNumericPrimitive.bind(null, 'u8')(v);
      dv0.setUint8(ptr0+ offset, v, true);
      offset += 1;
    }
  } else {
    // TypedArray / ArrayBuffer-like, direct copy
    valData0 = new Uint8Array(val0.buffer || val0, val0.byteOffset, valLenBytes0);
    const out0 = new Uint8Array(memory0.buffer, ptr0, valLenBytes0);
    out0.set(valData0);
  }
  
  dataView(memory0).setUint32(arg0 + 4, len0, true);
  dataView(memory0).setUint32(arg0 + 0, ptr0, true);
  _debugLog('[iface="host:tenant/tenant-context@1.0.0", function="tenant-did"][Instruction::Return]', {
    funcName: 'tenant-did',
    paramCount: 0,
    async: false,
    postReturn: false
  });
  task.resolve([ret]);
  task.exit();
}
_trampoline7.fnName = 'host:tenant/tenant-context@1.0.0#tenantDid';

const _trampoline8 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
  let enum0;
  switch (arg0) {
    case 0: {
      enum0 = 'get';
      break;
    }
    case 1: {
      enum0 = 'post';
      break;
    }
    case 2: {
      enum0 = 'put';
      break;
    }
    case 3: {
      enum0 = 'patch';
      break;
    }
    case 4: {
      enum0 = 'delete';
      break;
    }
    default: {
      throw new TypeError('invalid discriminant specified for Verb');
    }
  }
  var ptr1 = arg1;
  var len1 = arg2;
  var result1 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr1, len1));
  let variant5;
  switch (arg3) {
    case 0: {
      variant5 = undefined;
      break;
    }
    case 1: {
      var len4 = arg5;
      var base4 = arg4;
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 16;
        var ptr2 = dataView(memory0).getUint32(base + 0, true);
        var len2 = dataView(memory0).getUint32(base + 4, true);
        var result2 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        var ptr3 = dataView(memory0).getUint32(base + 8, true);
        var len3 = dataView(memory0).getUint32(base + 12, true);
        var result3 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push([result2, result3]);
      }
      variant5 = result4;
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for option');
    }
  }
  let variant7;
  switch (arg6) {
    case 0: {
      variant7 = undefined;
      break;
    }
    case 1: {
      var ptr6 = arg7;
      var len6 = arg8;
      var result6 = new Uint8Array(memory0.buffer.slice(ptr6, ptr6 + len6 * 1));
      variant7 = result6;
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for option');
    }
  }
  _debugLog('[iface="host:interfaces/http-with-placeholders@2.1.0", function="call"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'call',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'result-catch-handler',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  try {
    ret = { tag: 'ok', val: _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => call({
        method: enum0,
        url: result1,
        headers: variant5,
        payload: variant7,
      }),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

var variant15 = ret;
switch (variant15.tag) {
  case 'ok': {
    const e = variant15.val;
    dataView(memory0).setInt8(arg9 + 0, 0, true);
    var {code: v8_0, payload: v8_1 } = e;
    dataView(memory0).setInt16(arg9 + 4, toUint16(v8_0), true);
    var val9 = v8_1;
    var len9 = Array.isArray(val9) ? val9.length : val9.byteLength;
    var ptr9 = realloc0(0, 0, 1, len9 * 1);
    
    let valData9;
    const valLenBytes9 = len9 * 1;
    if (Array.isArray(val9)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv9 = new DataView(memory0.buffer);
      for (const v of val9) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv9.setUint8(ptr9+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData9 = new Uint8Array(val9.buffer || val9, val9.byteOffset, valLenBytes9);
      const out9 = new Uint8Array(memory0.buffer, ptr9, valLenBytes9);
      out9.set(valData9);
    }
    
    dataView(memory0).setUint32(arg9 + 12, len9, true);
    dataView(memory0).setUint32(arg9 + 8, ptr9, true);
    
    break;
  }
  case 'err': {
    const e = variant15.val;
    dataView(memory0).setInt8(arg9 + 0, 1, true);
    var variant14 = e;
    switch (variant14.tag) {
      case 'egress-denied': {
        const e = variant14.val;
        dataView(memory0).setInt8(arg9 + 4, 0, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr10= encodeRes.ptr;
        var len10 = encodeRes.len;
        
        dataView(memory0).setUint32(arg9 + 12, len10, true);
        dataView(memory0).setUint32(arg9 + 8, ptr10, true);
        break;
      }
      case 'placeholder-denied': {
        const e = variant14.val;
        dataView(memory0).setInt8(arg9 + 4, 1, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr11= encodeRes.ptr;
        var len11 = encodeRes.len;
        
        dataView(memory0).setUint32(arg9 + 12, len11, true);
        dataView(memory0).setUint32(arg9 + 8, ptr11, true);
        break;
      }
      case 'placeholder-unknown': {
        const e = variant14.val;
        dataView(memory0).setInt8(arg9 + 4, 2, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr12= encodeRes.ptr;
        var len12 = encodeRes.len;
        
        dataView(memory0).setUint32(arg9 + 12, len12, true);
        dataView(memory0).setUint32(arg9 + 8, ptr12, true);
        break;
      }
      case 'placeholder-no-user-context': {
        dataView(memory0).setInt8(arg9 + 4, 3, true);
        break;
      }
      case 'upstream-error': {
        const e = variant14.val;
        dataView(memory0).setInt8(arg9 + 4, 4, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr13= encodeRes.ptr;
        var len13 = encodeRes.len;
        
        dataView(memory0).setUint32(arg9 + 12, len13, true);
        dataView(memory0).setUint32(arg9 + 8, ptr13, true);
        break;
      }
      default: {
        throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant14.tag)}\` (received \`${variant14}\`) specified for \`HttpError\``);
      }
    }
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant15, valueType: typeof variant15});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="host:interfaces/http-with-placeholders@2.1.0", function="call"][Instruction::Return]', {
  funcName: 'call',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline8.fnName = 'host:interfaces/http-with-placeholders@2.1.0#call';

const _trampoline9 = function(arg0, arg1, arg2) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = new Uint8Array(memory0.buffer.slice(ptr0, ptr0 + len0 * 1));
  _debugLog('[iface="host:interfaces/signing@2.1.0", function="sign"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'sign',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'result-catch-handler',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  try {
    ret = { tag: 'ok', val: _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => sign(result0),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

var variant5 = ret;
switch (variant5.tag) {
  case 'ok': {
    const e = variant5.val;
    dataView(memory0).setInt8(arg2 + 0, 0, true);
    var val1 = e;
    var len1 = Array.isArray(val1) ? val1.length : val1.byteLength;
    var ptr1 = realloc0(0, 0, 1, len1 * 1);
    
    let valData1;
    const valLenBytes1 = len1 * 1;
    if (Array.isArray(val1)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv1 = new DataView(memory0.buffer);
      for (const v of val1) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv1.setUint8(ptr1+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData1 = new Uint8Array(val1.buffer || val1, val1.byteOffset, valLenBytes1);
      const out1 = new Uint8Array(memory0.buffer, ptr1, valLenBytes1);
      out1.set(valData1);
    }
    
    dataView(memory0).setUint32(arg2 + 8, len1, true);
    dataView(memory0).setUint32(arg2 + 4, ptr1, true);
    
    break;
  }
  case 'err': {
    const e = variant5.val;
    dataView(memory0).setInt8(arg2 + 0, 1, true);
    var variant4 = e;
    switch (variant4.tag) {
      case 'no-signing-key': {
        dataView(memory0).setInt8(arg2 + 4, 0, true);
        break;
      }
      case 'signing-failed': {
        const e = variant4.val;
        dataView(memory0).setInt8(arg2 + 4, 1, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr2= encodeRes.ptr;
        var len2 = encodeRes.len;
        
        dataView(memory0).setUint32(arg2 + 12, len2, true);
        dataView(memory0).setUint32(arg2 + 8, ptr2, true);
        break;
      }
      case 'pubkey-format': {
        dataView(memory0).setInt8(arg2 + 4, 2, true);
        break;
      }
      case 'encoding-failed': {
        const e = variant4.val;
        dataView(memory0).setInt8(arg2 + 4, 3, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr3= encodeRes.ptr;
        var len3 = encodeRes.len;
        
        dataView(memory0).setUint32(arg2 + 12, len3, true);
        dataView(memory0).setUint32(arg2 + 8, ptr3, true);
        break;
      }
      default: {
        throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`SignError\``);
      }
    }
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant5, valueType: typeof variant5});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="host:interfaces/signing@2.1.0", function="sign"][Instruction::Return]', {
  funcName: 'sign',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline9.fnName = 'host:interfaces/signing@2.1.0#sign';

const handleTable0 = [T_FLAG, 0];
handleTable0._createdReps = new Set();


const captureTable0= new Map();
let captureCnt0= 0;

HANDLE_TABLES[0] = handleTable0;

const _trampoline10 = function(arg0, arg1) {
  var handle1 = arg0;
  
  var rep2 = handleTable0[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable0.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(Error$1.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  
  curResourceBorrows.push(rsc0);
  _debugLog('[iface="wasi:io/error@0.2.6", function="[method]error.to-debug-string"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'toDebugString',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'none',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  
  try {
    ret = _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => rsc0.toDebugString(),
    })
    ;
  } catch (err) {
    
    _debugLog('[Instruction::CallInterface] error during sync call', {
      taskID: task.id(),
      subtaskID: currentSubtask?.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  for (const rsc of curResourceBorrows) {
    rsc[symbolRscHandle] = undefined;
  }
  curResourceBorrows = [];
  
  var encodeRes = _utf8AllocateAndEncode(ret, realloc0, memory0);
  var ptr3= encodeRes.ptr;
  var len3 = encodeRes.len;
  
  dataView(memory0).setUint32(arg1 + 4, len3, true);
  dataView(memory0).setUint32(arg1 + 0, ptr3, true);
  _debugLog('[iface="wasi:io/error@0.2.6", function="[method]error.to-debug-string"][Instruction::Return]', {
    funcName: '[method]error.to-debug-string',
    paramCount: 0,
    async: false,
    postReturn: false
  });
  task.resolve([ret]);
  task.exit();
}
_trampoline10.fnName = 'wasi:io/error@0.2.6#toDebugString';

const _trampoline11 = function(arg0, arg1, arg2, arg3) {
  var handle1 = arg0;
  
  var rep2 = handleTable1[(handle1 << 1) + 1] & ~T_FLAG;
  var rsc0 = captureTable1.get(rep2);
  if (!rsc0) {
    rsc0 = Object.create(OutputStream.prototype);
    Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1});
    Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2});
  }
  
  curResourceBorrows.push(rsc0);
  var ptr3 = arg1;
  var len3 = arg2;
  var result3 = new Uint8Array(memory0.buffer.slice(ptr3, ptr3 + len3 * 1));
  _debugLog('[iface="wasi:io/streams@0.2.6", function="[method]output-stream.blocking-write-and-flush"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'blockingWriteAndFlush',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'result-catch-handler',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  try {
    ret = { tag: 'ok', val: _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => rsc0.blockingWriteAndFlush(result3),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

for (const rsc of curResourceBorrows) {
  rsc[symbolRscHandle] = undefined;
}
curResourceBorrows = [];
var variant6 = ret;
switch (variant6.tag) {
  case 'ok': {
    const e = variant6.val;
    dataView(memory0).setInt8(arg3 + 0, 0, true);
    
    break;
  }
  case 'err': {
    const e = variant6.val;
    dataView(memory0).setInt8(arg3 + 0, 1, true);
    var variant5 = e;
    switch (variant5.tag) {
      case 'last-operation-failed': {
        const e = variant5.val;
        dataView(memory0).setInt8(arg3 + 4, 0, true);
        
        if (!(e instanceof Error$1)) {
          throw new TypeError('Resource error: Not a valid \"Error\" resource.');
        }
        var handle4 = e[symbolRscHandle];
        if (!handle4) {
          const rep = e[symbolRscRep] || ++captureCnt0;
          captureTable0.set(rep, e);
          handle4 = rscTableCreateOwn(handleTable0, rep);
        }
        
        dataView(memory0).setInt32(arg3 + 8, handle4, true);
        break;
      }
      case 'closed': {
        dataView(memory0).setInt8(arg3 + 4, 1, true);
        break;
      }
      default: {
        throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
      }
    }
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant6, valueType: typeof variant6});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="wasi:io/streams@0.2.6", function="[method]output-stream.blocking-write-and-flush"][Instruction::Return]', {
  funcName: '[method]output-stream.blocking-write-and-flush',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline11.fnName = 'wasi:io/streams@0.2.6#blockingWriteAndFlush';

const _trampoline12 = function(arg0) {
  _debugLog('[iface="wasi:cli/environment@0.2.6", function="get-environment"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'getEnvironment',
      getCallbackFn: () => null,
      callbackFnName: null,
      errHandling: 'none',
      callingWasmExport: false,
    });
    task = results[0];
  };
  
  taskCreation: {
    parentTask = getCurrentTask(
    0,
    _getGlobalCurrentTaskMeta(0)?.taskID,
    )?.task;
    
    if (!parentTask) {
      createTask();
      break taskCreation;
    }
    
    createTask();
    
    if (hostProvided) {
      subtask = parentTask.getLatestSubtask();
      if (!subtask) {
        throw new Error(`Missing subtask (in parent task [${parentTask.id()}]) for host import, has the import been lowered? (ensure asyncImports are set properly)`);
      }
      task.setParentSubtask(subtask);
    }
  }
  
  const started = task.enterSync();
  
  let ret;
  
  try {
    ret = _withGlobalCurrentTaskMeta({
      componentIdx: task.componentIdx(),
      taskID: task.id(),
      fn: () => getEnvironment(),
    })
    ;
  } catch (err) {
    
    _debugLog('[Instruction::CallInterface] error during sync call', {
      taskID: task.id(),
      subtaskID: currentSubtask?.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  var vec3 = ret;
  var len3 = vec3.length;
  var result3 = realloc0(0, 0, 4, len3 * 16);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 16;var [tuple0_0, tuple0_1] = e;
    
    var encodeRes = _utf8AllocateAndEncode(tuple0_0, realloc0, memory0);
    var ptr1= encodeRes.ptr;
    var len1 = encodeRes.len;
    
    dataView(memory0).setUint32(base + 4, len1, true);
    dataView(memory0).setUint32(base + 0, ptr1, true);
    
    var encodeRes = _utf8AllocateAndEncode(tuple0_1, realloc0, memory0);
    var ptr2= encodeRes.ptr;
    var len2 = encodeRes.len;
    
    dataView(memory0).setUint32(base + 12, len2, true);
    dataView(memory0).setUint32(base + 8, ptr2, true);
  }
  dataView(memory0).setUint32(arg0 + 4, len3, true);
  dataView(memory0).setUint32(arg0 + 0, result3, true);
  _debugLog('[iface="wasi:cli/environment@0.2.6", function="get-environment"][Instruction::Return]', {
    funcName: 'get-environment',
    paramCount: 0,
    async: false,
    postReturn: false
  });
  task.resolve([ret]);
  task.exit();
}
_trampoline12.fnName = 'wasi:cli/environment@0.2.6#getEnvironment';
let exports2;
let postReturn0;
let postReturn0Async;
let contracts100ComposeAction;

function composeAction(arg0) {
  var {input: v0_0, userProfile: v0_1, context: v0_2 } = arg0;
  var variant2 = v0_0;
  let variant2_0;
  let variant2_1;
  let variant2_2;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
    variant2_2 = 0;
  } else {
    const e = variant2;
    var val1 = e;
    var len1 = Array.isArray(val1) ? val1.length : val1.byteLength;
    var ptr1 = realloc0(0, 0, 1, len1 * 1);
    
    let valData1;
    const valLenBytes1 = len1 * 1;
    if (Array.isArray(val1)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv1 = new DataView(memory0.buffer);
      for (const v of val1) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv1.setUint8(ptr1+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData1 = new Uint8Array(val1.buffer || val1, val1.byteOffset, valLenBytes1);
      const out1 = new Uint8Array(memory0.buffer, ptr1, valLenBytes1);
      out1.set(valData1);
    }
    
    variant2_0 = 1;
    variant2_1 = ptr1;
    variant2_2 = len1;
  }
  var variant4 = v0_1;
  let variant4_0;
  let variant4_1;
  let variant4_2;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
    variant4_2 = 0;
  } else {
    const e = variant4;
    var val3 = e;
    var len3 = Array.isArray(val3) ? val3.length : val3.byteLength;
    var ptr3 = realloc0(0, 0, 1, len3 * 1);
    
    let valData3;
    const valLenBytes3 = len3 * 1;
    if (Array.isArray(val3)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv3 = new DataView(memory0.buffer);
      for (const v of val3) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv3.setUint8(ptr3+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, valLenBytes3);
      const out3 = new Uint8Array(memory0.buffer, ptr3, valLenBytes3);
      out3.set(valData3);
    }
    
    variant4_0 = 1;
    variant4_1 = ptr3;
    variant4_2 = len3;
  }
  var variant6 = v0_2;
  let variant6_0;
  let variant6_1;
  let variant6_2;
  if (variant6 === null || variant6=== undefined) {
    variant6_0 = 0;
    variant6_1 = 0;
    variant6_2 = 0;
  } else {
    const e = variant6;
    var val5 = e;
    var len5 = Array.isArray(val5) ? val5.length : val5.byteLength;
    var ptr5 = realloc0(0, 0, 1, len5 * 1);
    
    let valData5;
    const valLenBytes5 = len5 * 1;
    if (Array.isArray(val5)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv5 = new DataView(memory0.buffer);
      for (const v of val5) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv5.setUint8(ptr5+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData5 = new Uint8Array(val5.buffer || val5, val5.byteOffset, valLenBytes5);
      const out5 = new Uint8Array(memory0.buffer, ptr5, valLenBytes5);
      out5.set(valData5);
    }
    
    variant6_0 = 1;
    variant6_1 = ptr5;
    variant6_2 = len5;
  }
  _debugLog('[iface="synod:agent/contracts@1.0.0", function="compose-action"][Instruction::CallWasm] enter', {
    funcName: 'compose-action',
    paramCount: 9,
    async: false,
    postReturn: true,
  });
  const hostProvided = false;
  
  const [task, _wasm_call_currentTaskID] = createNewCurrentTask({
    componentIdx: 0,
    isAsync: false,
    isManualAsync: false,
    entryFnName: 'contracts100ComposeAction',
    getCallbackFn: () => null,
    callbackFnName: null,
    errHandling: 'throw-result-err',
    callingWasmExport: true,
  });
  
  const started = task.enterSync();
  
  if (0!== null) {
    task.setReturnMemoryIdx(0);
    task.setReturnMemory(() => memory0());
  }
  
  
  let ret;
  
  try {
    ret =   _withGlobalCurrentTaskMeta({
      taskID: task.id(),
      componentIdx: task.componentIdx(),
      fn: () => contracts100ComposeAction(variant2_0, variant2_1, variant2_2, variant4_0, variant4_1, variant4_2, variant6_0, variant6_1, variant6_2),
    });
  } catch (err) {
    
    _debugLog('[Instruction::CallWasm] error during sync call', {
      taskID: task.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  let variant9;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr7 = dataView(memory0).getUint32(ret + 4, true);
      var len7 = dataView(memory0).getUint32(ret + 8, true);
      var result7 = new Uint8Array(memory0.buffer.slice(ptr7, ptr7 + len7 * 1));
      variant9= {
        tag: 'ok',
        val: result7
      };
      break;
    }
    case 1: {
      var ptr8 = dataView(memory0).getUint32(ret + 4, true);
      var len8 = dataView(memory0).getUint32(ret + 8, true);
      var result8 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr8, len8));
      variant9= {
        tag: 'err',
        val: result8
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  _debugLog('[iface="synod:agent/contracts@1.0.0", function="compose-action"][Instruction::Return]', {
    funcName: 'compose-action',
    paramCount: 1,
    async: false,
    postReturn: true
  });
  const retCopy = variant9;
  task.resolve([retCopy.val]);
  
  let cstate = getOrCreateAsyncState(0);
  cstate.mayLeave = false;
  postReturn0(ret);
  cstate.mayLeave = true;
  task.exit();
  
  
  
  if (typeof retCopy === 'object' && retCopy.tag === 'err') {
    throw new ComponentError(retCopy.val);
  }
  return retCopy.val;
  
}
let contracts100GetTrace;

function getTrace(arg0) {
  var {input: v0_0, userProfile: v0_1, context: v0_2 } = arg0;
  var variant2 = v0_0;
  let variant2_0;
  let variant2_1;
  let variant2_2;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
    variant2_2 = 0;
  } else {
    const e = variant2;
    var val1 = e;
    var len1 = Array.isArray(val1) ? val1.length : val1.byteLength;
    var ptr1 = realloc0(0, 0, 1, len1 * 1);
    
    let valData1;
    const valLenBytes1 = len1 * 1;
    if (Array.isArray(val1)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv1 = new DataView(memory0.buffer);
      for (const v of val1) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv1.setUint8(ptr1+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData1 = new Uint8Array(val1.buffer || val1, val1.byteOffset, valLenBytes1);
      const out1 = new Uint8Array(memory0.buffer, ptr1, valLenBytes1);
      out1.set(valData1);
    }
    
    variant2_0 = 1;
    variant2_1 = ptr1;
    variant2_2 = len1;
  }
  var variant4 = v0_1;
  let variant4_0;
  let variant4_1;
  let variant4_2;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
    variant4_2 = 0;
  } else {
    const e = variant4;
    var val3 = e;
    var len3 = Array.isArray(val3) ? val3.length : val3.byteLength;
    var ptr3 = realloc0(0, 0, 1, len3 * 1);
    
    let valData3;
    const valLenBytes3 = len3 * 1;
    if (Array.isArray(val3)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv3 = new DataView(memory0.buffer);
      for (const v of val3) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv3.setUint8(ptr3+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, valLenBytes3);
      const out3 = new Uint8Array(memory0.buffer, ptr3, valLenBytes3);
      out3.set(valData3);
    }
    
    variant4_0 = 1;
    variant4_1 = ptr3;
    variant4_2 = len3;
  }
  var variant6 = v0_2;
  let variant6_0;
  let variant6_1;
  let variant6_2;
  if (variant6 === null || variant6=== undefined) {
    variant6_0 = 0;
    variant6_1 = 0;
    variant6_2 = 0;
  } else {
    const e = variant6;
    var val5 = e;
    var len5 = Array.isArray(val5) ? val5.length : val5.byteLength;
    var ptr5 = realloc0(0, 0, 1, len5 * 1);
    
    let valData5;
    const valLenBytes5 = len5 * 1;
    if (Array.isArray(val5)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv5 = new DataView(memory0.buffer);
      for (const v of val5) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv5.setUint8(ptr5+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData5 = new Uint8Array(val5.buffer || val5, val5.byteOffset, valLenBytes5);
      const out5 = new Uint8Array(memory0.buffer, ptr5, valLenBytes5);
      out5.set(valData5);
    }
    
    variant6_0 = 1;
    variant6_1 = ptr5;
    variant6_2 = len5;
  }
  _debugLog('[iface="synod:agent/contracts@1.0.0", function="get-trace"][Instruction::CallWasm] enter', {
    funcName: 'get-trace',
    paramCount: 9,
    async: false,
    postReturn: true,
  });
  const hostProvided = false;
  
  const [task, _wasm_call_currentTaskID] = createNewCurrentTask({
    componentIdx: 0,
    isAsync: false,
    isManualAsync: false,
    entryFnName: 'contracts100GetTrace',
    getCallbackFn: () => null,
    callbackFnName: null,
    errHandling: 'throw-result-err',
    callingWasmExport: true,
  });
  
  const started = task.enterSync();
  
  if (0!== null) {
    task.setReturnMemoryIdx(0);
    task.setReturnMemory(() => memory0());
  }
  
  
  let ret;
  
  try {
    ret =   _withGlobalCurrentTaskMeta({
      taskID: task.id(),
      componentIdx: task.componentIdx(),
      fn: () => contracts100GetTrace(variant2_0, variant2_1, variant2_2, variant4_0, variant4_1, variant4_2, variant6_0, variant6_1, variant6_2),
    });
  } catch (err) {
    
    _debugLog('[Instruction::CallWasm] error during sync call', {
      taskID: task.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  let variant9;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr7 = dataView(memory0).getUint32(ret + 4, true);
      var len7 = dataView(memory0).getUint32(ret + 8, true);
      var result7 = new Uint8Array(memory0.buffer.slice(ptr7, ptr7 + len7 * 1));
      variant9= {
        tag: 'ok',
        val: result7
      };
      break;
    }
    case 1: {
      var ptr8 = dataView(memory0).getUint32(ret + 4, true);
      var len8 = dataView(memory0).getUint32(ret + 8, true);
      var result8 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr8, len8));
      variant9= {
        tag: 'err',
        val: result8
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  _debugLog('[iface="synod:agent/contracts@1.0.0", function="get-trace"][Instruction::Return]', {
    funcName: 'get-trace',
    paramCount: 1,
    async: false,
    postReturn: true
  });
  const retCopy = variant9;
  task.resolve([retCopy.val]);
  
  let cstate = getOrCreateAsyncState(0);
  cstate.mayLeave = false;
  postReturn0(ret);
  cstate.mayLeave = true;
  task.exit();
  
  
  
  if (typeof retCopy === 'object' && retCopy.tag === 'err') {
    throw new ComponentError(retCopy.val);
  }
  return retCopy.val;
  
}
let contracts100Evaluate;

function evaluate(arg0) {
  var {input: v0_0, userProfile: v0_1, context: v0_2 } = arg0;
  var variant2 = v0_0;
  let variant2_0;
  let variant2_1;
  let variant2_2;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
    variant2_2 = 0;
  } else {
    const e = variant2;
    var val1 = e;
    var len1 = Array.isArray(val1) ? val1.length : val1.byteLength;
    var ptr1 = realloc0(0, 0, 1, len1 * 1);
    
    let valData1;
    const valLenBytes1 = len1 * 1;
    if (Array.isArray(val1)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv1 = new DataView(memory0.buffer);
      for (const v of val1) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv1.setUint8(ptr1+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData1 = new Uint8Array(val1.buffer || val1, val1.byteOffset, valLenBytes1);
      const out1 = new Uint8Array(memory0.buffer, ptr1, valLenBytes1);
      out1.set(valData1);
    }
    
    variant2_0 = 1;
    variant2_1 = ptr1;
    variant2_2 = len1;
  }
  var variant4 = v0_1;
  let variant4_0;
  let variant4_1;
  let variant4_2;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
    variant4_2 = 0;
  } else {
    const e = variant4;
    var val3 = e;
    var len3 = Array.isArray(val3) ? val3.length : val3.byteLength;
    var ptr3 = realloc0(0, 0, 1, len3 * 1);
    
    let valData3;
    const valLenBytes3 = len3 * 1;
    if (Array.isArray(val3)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv3 = new DataView(memory0.buffer);
      for (const v of val3) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv3.setUint8(ptr3+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, valLenBytes3);
      const out3 = new Uint8Array(memory0.buffer, ptr3, valLenBytes3);
      out3.set(valData3);
    }
    
    variant4_0 = 1;
    variant4_1 = ptr3;
    variant4_2 = len3;
  }
  var variant6 = v0_2;
  let variant6_0;
  let variant6_1;
  let variant6_2;
  if (variant6 === null || variant6=== undefined) {
    variant6_0 = 0;
    variant6_1 = 0;
    variant6_2 = 0;
  } else {
    const e = variant6;
    var val5 = e;
    var len5 = Array.isArray(val5) ? val5.length : val5.byteLength;
    var ptr5 = realloc0(0, 0, 1, len5 * 1);
    
    let valData5;
    const valLenBytes5 = len5 * 1;
    if (Array.isArray(val5)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv5 = new DataView(memory0.buffer);
      for (const v of val5) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv5.setUint8(ptr5+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData5 = new Uint8Array(val5.buffer || val5, val5.byteOffset, valLenBytes5);
      const out5 = new Uint8Array(memory0.buffer, ptr5, valLenBytes5);
      out5.set(valData5);
    }
    
    variant6_0 = 1;
    variant6_1 = ptr5;
    variant6_2 = len5;
  }
  _debugLog('[iface="synod:agent/contracts@1.0.0", function="evaluate"][Instruction::CallWasm] enter', {
    funcName: 'evaluate',
    paramCount: 9,
    async: false,
    postReturn: true,
  });
  const hostProvided = false;
  
  const [task, _wasm_call_currentTaskID] = createNewCurrentTask({
    componentIdx: 0,
    isAsync: false,
    isManualAsync: false,
    entryFnName: 'contracts100Evaluate',
    getCallbackFn: () => null,
    callbackFnName: null,
    errHandling: 'throw-result-err',
    callingWasmExport: true,
  });
  
  const started = task.enterSync();
  
  if (0!== null) {
    task.setReturnMemoryIdx(0);
    task.setReturnMemory(() => memory0());
  }
  
  
  let ret;
  
  try {
    ret =   _withGlobalCurrentTaskMeta({
      taskID: task.id(),
      componentIdx: task.componentIdx(),
      fn: () => contracts100Evaluate(variant2_0, variant2_1, variant2_2, variant4_0, variant4_1, variant4_2, variant6_0, variant6_1, variant6_2),
    });
  } catch (err) {
    
    _debugLog('[Instruction::CallWasm] error during sync call', {
      taskID: task.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  let variant9;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr7 = dataView(memory0).getUint32(ret + 4, true);
      var len7 = dataView(memory0).getUint32(ret + 8, true);
      var result7 = new Uint8Array(memory0.buffer.slice(ptr7, ptr7 + len7 * 1));
      variant9= {
        tag: 'ok',
        val: result7
      };
      break;
    }
    case 1: {
      var ptr8 = dataView(memory0).getUint32(ret + 4, true);
      var len8 = dataView(memory0).getUint32(ret + 8, true);
      var result8 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr8, len8));
      variant9= {
        tag: 'err',
        val: result8
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  _debugLog('[iface="synod:agent/contracts@1.0.0", function="evaluate"][Instruction::Return]', {
    funcName: 'evaluate',
    paramCount: 1,
    async: false,
    postReturn: true
  });
  const retCopy = variant9;
  task.resolve([retCopy.val]);
  
  let cstate = getOrCreateAsyncState(0);
  cstate.mayLeave = false;
  postReturn0(ret);
  cstate.mayLeave = true;
  task.exit();
  
  
  
  if (typeof retCopy === 'object' && retCopy.tag === 'err') {
    throw new ComponentError(retCopy.val);
  }
  return retCopy.val;
  
}
let contracts100Execute;

function execute(arg0) {
  var {input: v0_0, userProfile: v0_1, context: v0_2 } = arg0;
  var variant2 = v0_0;
  let variant2_0;
  let variant2_1;
  let variant2_2;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
    variant2_2 = 0;
  } else {
    const e = variant2;
    var val1 = e;
    var len1 = Array.isArray(val1) ? val1.length : val1.byteLength;
    var ptr1 = realloc0(0, 0, 1, len1 * 1);
    
    let valData1;
    const valLenBytes1 = len1 * 1;
    if (Array.isArray(val1)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv1 = new DataView(memory0.buffer);
      for (const v of val1) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv1.setUint8(ptr1+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData1 = new Uint8Array(val1.buffer || val1, val1.byteOffset, valLenBytes1);
      const out1 = new Uint8Array(memory0.buffer, ptr1, valLenBytes1);
      out1.set(valData1);
    }
    
    variant2_0 = 1;
    variant2_1 = ptr1;
    variant2_2 = len1;
  }
  var variant4 = v0_1;
  let variant4_0;
  let variant4_1;
  let variant4_2;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
    variant4_2 = 0;
  } else {
    const e = variant4;
    var val3 = e;
    var len3 = Array.isArray(val3) ? val3.length : val3.byteLength;
    var ptr3 = realloc0(0, 0, 1, len3 * 1);
    
    let valData3;
    const valLenBytes3 = len3 * 1;
    if (Array.isArray(val3)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv3 = new DataView(memory0.buffer);
      for (const v of val3) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv3.setUint8(ptr3+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, valLenBytes3);
      const out3 = new Uint8Array(memory0.buffer, ptr3, valLenBytes3);
      out3.set(valData3);
    }
    
    variant4_0 = 1;
    variant4_1 = ptr3;
    variant4_2 = len3;
  }
  var variant6 = v0_2;
  let variant6_0;
  let variant6_1;
  let variant6_2;
  if (variant6 === null || variant6=== undefined) {
    variant6_0 = 0;
    variant6_1 = 0;
    variant6_2 = 0;
  } else {
    const e = variant6;
    var val5 = e;
    var len5 = Array.isArray(val5) ? val5.length : val5.byteLength;
    var ptr5 = realloc0(0, 0, 1, len5 * 1);
    
    let valData5;
    const valLenBytes5 = len5 * 1;
    if (Array.isArray(val5)) {
      // Regular array likely containing numbers, write values to memory
      let offset = 0;
      const dv5 = new DataView(memory0.buffer);
      for (const v of val5) {
        _requireValidNumericPrimitive.bind(null, 'u8')(v);
        dv5.setUint8(ptr5+ offset, v, true);
        offset += 1;
      }
    } else {
      // TypedArray / ArrayBuffer-like, direct copy
      valData5 = new Uint8Array(val5.buffer || val5, val5.byteOffset, valLenBytes5);
      const out5 = new Uint8Array(memory0.buffer, ptr5, valLenBytes5);
      out5.set(valData5);
    }
    
    variant6_0 = 1;
    variant6_1 = ptr5;
    variant6_2 = len5;
  }
  _debugLog('[iface="synod:agent/contracts@1.0.0", function="execute"][Instruction::CallWasm] enter', {
    funcName: 'execute',
    paramCount: 9,
    async: false,
    postReturn: true,
  });
  const hostProvided = false;
  
  const [task, _wasm_call_currentTaskID] = createNewCurrentTask({
    componentIdx: 0,
    isAsync: false,
    isManualAsync: false,
    entryFnName: 'contracts100Execute',
    getCallbackFn: () => null,
    callbackFnName: null,
    errHandling: 'throw-result-err',
    callingWasmExport: true,
  });
  
  const started = task.enterSync();
  
  if (0!== null) {
    task.setReturnMemoryIdx(0);
    task.setReturnMemory(() => memory0());
  }
  
  
  let ret;
  
  try {
    ret =   _withGlobalCurrentTaskMeta({
      taskID: task.id(),
      componentIdx: task.componentIdx(),
      fn: () => contracts100Execute(variant2_0, variant2_1, variant2_2, variant4_0, variant4_1, variant4_2, variant6_0, variant6_1, variant6_2),
    });
  } catch (err) {
    
    _debugLog('[Instruction::CallWasm] error during sync call', {
      taskID: task.id(),
      err,
    });
    task.setErrored(err);
    task.reject(err);
    task.exit();
    throw err;
    
  }
  
  let variant9;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr7 = dataView(memory0).getUint32(ret + 4, true);
      var len7 = dataView(memory0).getUint32(ret + 8, true);
      var result7 = new Uint8Array(memory0.buffer.slice(ptr7, ptr7 + len7 * 1));
      variant9= {
        tag: 'ok',
        val: result7
      };
      break;
    }
    case 1: {
      var ptr8 = dataView(memory0).getUint32(ret + 4, true);
      var len8 = dataView(memory0).getUint32(ret + 8, true);
      var result8 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr8, len8));
      variant9= {
        tag: 'err',
        val: result8
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  _debugLog('[iface="synod:agent/contracts@1.0.0", function="execute"][Instruction::Return]', {
    funcName: 'execute',
    paramCount: 1,
    async: false,
    postReturn: true
  });
  const retCopy = variant9;
  task.resolve([retCopy.val]);
  
  let cstate = getOrCreateAsyncState(0);
  cstate.mayLeave = false;
  postReturn0(ret);
  cstate.mayLeave = true;
  task.exit();
  
  
  
  if (typeof retCopy === 'object' && retCopy.tag === 'err') {
    throw new ComponentError(retCopy.val);
  }
  return retCopy.val;
  
}
function trampoline0(handle) {
  const handleEntry = rscTableRemove(handleTable0, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable0.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable0.delete(handleEntry.rep);
    } else if (Error$1[symbolCabiDispose]) {
      Error$1[symbolCabiDispose](handleEntry.rep);
    }
  }
}
function trampoline1(handle) {
  const handleEntry = rscTableRemove(handleTable1, handle);
  if (handleEntry.own) {
    
    const rsc = captureTable1.get(handleEntry.rep);
    if (rsc) {
      if (rsc[symbolDispose]) rsc[symbolDispose]();
      captureTable1.delete(handleEntry.rep);
    } else if (OutputStream[symbolCabiDispose]) {
      OutputStream[symbolCabiDispose](handleEntry.rep);
    }
  }
}
let trampoline2 = _trampoline2.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 2,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline2.manuallyAsync,
  paramLiftFns: [],
  resultLowerFns: [_lowerFlatOwn({
    componentIdx: 0,
    lowerFn: 
    function lowerImportedOwnedHost_OutputStream(obj) {
      if (!(obj instanceof OutputStream)) {
        throw new TypeError('Resource error: Not a valid \"OutputStream\" resource.');
      }
      let handle = obj[symbolRscHandle];
      if (!handle) {
        const rep = obj[symbolRscRep] || ++captureCnt1;
        captureTable1.set(rep, obj);
        handle = rscTableCreateOwn(handleTable1, rep);
      }
      return handle;
    }
    ,
  })],
  hasResultPointer: false,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: null,
  stringEncoding: 'utf8',
  getMemoryFn: () => null,
  getReallocFn: undefined,
  importFn: _trampoline2,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 2,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline2.manuallyAsync,
  paramLiftFns: [],
  resultLowerFns: [_lowerFlatOwn({
    componentIdx: 0,
    lowerFn: 
    function lowerImportedOwnedHost_OutputStream(obj) {
      if (!(obj instanceof OutputStream)) {
        throw new TypeError('Resource error: Not a valid \"OutputStream\" resource.');
      }
      let handle = obj[symbolRscHandle];
      if (!handle) {
        const rep = obj[symbolRscRep] || ++captureCnt1;
        captureTable1.set(rep, obj);
        handle = rscTableCreateOwn(handleTable1, rep);
      }
      return handle;
    }
    ,
  })],
  hasResultPointer: false,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: null,
  stringEncoding: 'utf8',
  getMemoryFn: () => null,
  getReallocFn: undefined,
  importFn: _trampoline2,
},
);
let trampoline3 = _trampoline3.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 3,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline3.manuallyAsync,
  paramLiftFns: [
  _liftFlatResult({
    caseMetas: [['ok', null, 0, 0, 0],['err', null, 0, 0, 0],],
    variantSize32: 1,
    variantAlign32: 1,
    variantPayloadOffset32: 1,
    variantFlatCount: 1,
  })
  ],
  resultLowerFns: [],
  hasResultPointer: false,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: null,
  stringEncoding: 'utf8',
  getMemoryFn: () => null,
  getReallocFn: undefined,
  importFn: _trampoline3,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 3,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline3.manuallyAsync,
  paramLiftFns: [
  _liftFlatResult({
    caseMetas: [['ok', null, 0, 0, 0],['err', null, 0, 0, 0],],
    variantSize32: 1,
    variantAlign32: 1,
    variantPayloadOffset32: 1,
    variantFlatCount: 1,
  })
  ],
  resultLowerFns: [],
  hasResultPointer: false,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: null,
  stringEncoding: 'utf8',
  getMemoryFn: () => null,
  getReallocFn: undefined,
  importFn: _trampoline3,
},
);
let trampoline4 = _trampoline4.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 4,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline4.manuallyAsync,
  paramLiftFns: [_liftFlatStringAny],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', null, 12, 4, 4 ],
    [ 'err', _lowerFlatStringAny, 12, 4, 4 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline4,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 4,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline4.manuallyAsync,
  paramLiftFns: [_liftFlatStringAny],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', null, 12, 4, 4 ],
    [ 'err', _lowerFlatStringAny, 12, 4, 4 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline4,
},
);
let trampoline5 = _trampoline5.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 5,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline5.manuallyAsync,
  paramLiftFns: [_liftFlatStringAny],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', null, 12, 4, 4 ],
    [ 'err', _lowerFlatStringAny, 12, 4, 4 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline5,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 5,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline5.manuallyAsync,
  paramLiftFns: [_liftFlatStringAny],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', null, 12, 4, 4 ],
    [ 'err', _lowerFlatStringAny, 12, 4, 4 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline5,
},
);
let trampoline6 = _trampoline6.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 6,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline6.manuallyAsync,
  paramLiftFns: [],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', _lowerFlatU64, 16, 8, 8 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'no-tx-context', null, 0, 0, 0 ],],
      variantSize32: 1,
      variantAlign32: 1,
      variantPayloadOffset32: 1,
      variantFlatCount: 1,
    } ), 16, 8, 8 ],
    ],
    variantSize32: 16,
    variantAlign32: 8,
    variantPayloadOffset32: 8,
    variantFlatCount: 2,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: undefined,
  importFn: _trampoline6,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 6,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline6.manuallyAsync,
  paramLiftFns: [],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', _lowerFlatU64, 16, 8, 8 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'no-tx-context', null, 0, 0, 0 ],],
      variantSize32: 1,
      variantAlign32: 1,
      variantPayloadOffset32: 1,
      variantFlatCount: 1,
    } ), 16, 8, 8 ],
    ],
    variantSize32: 16,
    variantAlign32: 8,
    variantPayloadOffset32: 8,
    variantFlatCount: 2,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: undefined,
  importFn: _trampoline6,
},
);
let trampoline7 = _trampoline7.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 7,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline7.manuallyAsync,
  paramLiftFns: [],
  resultLowerFns: [_lowerFlatList({
    elemLowerFn: _lowerFlatU8,
    elemSize32: 1,
    elemAlign32: 1,
  })],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline7,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 7,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline7.manuallyAsync,
  paramLiftFns: [],
  resultLowerFns: [_lowerFlatList({
    elemLowerFn: _lowerFlatU8,
    elemSize32: 1,
    elemAlign32: 1,
  })],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline7,
},
);
let trampoline8 = _trampoline8.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 8,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline8.manuallyAsync,
  paramLiftFns: [_liftFlatRecord({ fieldMetas: [['method', 
  _liftFlatEnum({
    caseMetas: [['get', null, 1, 1, 1],['post', null, 1, 1, 1],['put', null, 1, 1, 1],['patch', null, 1, 1, 1],['delete', null, 1, 1, 1],],
    variantSize32: 1,
    variantAlign32: 1,
    variantPayloadOffset32: 1,
    variantFlatCount: 1,
  })
  , 1, 1],['url', _liftFlatStringAny, 8, 4],['headers', 
  _liftFlatOption({
    caseMetas: [
    ['none', null, 0, 0, 0 ],
    ['some', _liftFlatList({
      elemLiftFn: _liftFlatTuple({ elemLiftFns: [[_liftFlatStringAny, 8, 4],[_liftFlatStringAny, 8, 4],], size32: 16, align32: 4 }),
      elemAlign32: 4,
      elemSize32: 16,
      typedArray: undefined,
    }), 8, 4, 2 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  , 12, 4],['payload', 
  _liftFlatOption({
    caseMetas: [
    ['none', null, 0, 0, 0 ],
    ['some', _liftFlatList({
      elemLiftFn: _liftFlatU8,
      elemAlign32: 1,
      elemSize32: 1,
      typedArray: Uint8Array,
    }), 8, 4, 2 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  , 12, 4],], size32: 36, align32: 4 })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', _lowerFlatRecord({ fieldMetas: [['code', _lowerFlatU16, 2, 2 ],['payload', _lowerFlatList({
      elemLowerFn: _lowerFlatU8,
      elemSize32: 1,
      elemAlign32: 1,
    }), 8, 4 ],], size32: 12, align32: 4 }), 16, 4, 4 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'egress-denied', _lowerFlatStringAny, 8, 4, 2 ],[ 'placeholder-denied', _lowerFlatStringAny, 8, 4, 2 ],[ 'placeholder-unknown', _lowerFlatStringAny, 8, 4, 2 ],[ 'placeholder-no-user-context', null, 0, 0, 0 ],[ 'upstream-error', _lowerFlatStringAny, 8, 4, 2 ],],
      variantSize32: 12,
      variantAlign32: 4,
      variantPayloadOffset32: 4,
      variantFlatCount: 3,
    } ), 16, 4, 4 ],
    ],
    variantSize32: 16,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 4,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline8,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 8,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline8.manuallyAsync,
  paramLiftFns: [_liftFlatRecord({ fieldMetas: [['method', 
  _liftFlatEnum({
    caseMetas: [['get', null, 1, 1, 1],['post', null, 1, 1, 1],['put', null, 1, 1, 1],['patch', null, 1, 1, 1],['delete', null, 1, 1, 1],],
    variantSize32: 1,
    variantAlign32: 1,
    variantPayloadOffset32: 1,
    variantFlatCount: 1,
  })
  , 1, 1],['url', _liftFlatStringAny, 8, 4],['headers', 
  _liftFlatOption({
    caseMetas: [
    ['none', null, 0, 0, 0 ],
    ['some', _liftFlatList({
      elemLiftFn: _liftFlatTuple({ elemLiftFns: [[_liftFlatStringAny, 8, 4],[_liftFlatStringAny, 8, 4],], size32: 16, align32: 4 }),
      elemAlign32: 4,
      elemSize32: 16,
      typedArray: undefined,
    }), 8, 4, 2 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  , 12, 4],['payload', 
  _liftFlatOption({
    caseMetas: [
    ['none', null, 0, 0, 0 ],
    ['some', _liftFlatList({
      elemLiftFn: _liftFlatU8,
      elemAlign32: 1,
      elemSize32: 1,
      typedArray: Uint8Array,
    }), 8, 4, 2 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  , 12, 4],], size32: 36, align32: 4 })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', _lowerFlatRecord({ fieldMetas: [['code', _lowerFlatU16, 2, 2 ],['payload', _lowerFlatList({
      elemLowerFn: _lowerFlatU8,
      elemSize32: 1,
      elemAlign32: 1,
    }), 8, 4 ],], size32: 12, align32: 4 }), 16, 4, 4 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'egress-denied', _lowerFlatStringAny, 8, 4, 2 ],[ 'placeholder-denied', _lowerFlatStringAny, 8, 4, 2 ],[ 'placeholder-unknown', _lowerFlatStringAny, 8, 4, 2 ],[ 'placeholder-no-user-context', null, 0, 0, 0 ],[ 'upstream-error', _lowerFlatStringAny, 8, 4, 2 ],],
      variantSize32: 12,
      variantAlign32: 4,
      variantPayloadOffset32: 4,
      variantFlatCount: 3,
    } ), 16, 4, 4 ],
    ],
    variantSize32: 16,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 4,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline8,
},
);
let trampoline9 = _trampoline9.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 9,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline9.manuallyAsync,
  paramLiftFns: [_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', _lowerFlatList({
      elemLowerFn: _lowerFlatU8,
      elemSize32: 1,
      elemAlign32: 1,
    }), 16, 4, 4 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'no-signing-key', null, 0, 0, 0 ],[ 'signing-failed', _lowerFlatStringAny, 8, 4, 2 ],[ 'pubkey-format', null, 0, 0, 0 ],[ 'encoding-failed', _lowerFlatStringAny, 8, 4, 2 ],],
      variantSize32: 12,
      variantAlign32: 4,
      variantPayloadOffset32: 4,
      variantFlatCount: 3,
    } ), 16, 4, 4 ],
    ],
    variantSize32: 16,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 4,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline9,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 9,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline9.manuallyAsync,
  paramLiftFns: [_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', _lowerFlatList({
      elemLowerFn: _lowerFlatU8,
      elemSize32: 1,
      elemAlign32: 1,
    }), 16, 4, 4 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'no-signing-key', null, 0, 0, 0 ],[ 'signing-failed', _lowerFlatStringAny, 8, 4, 2 ],[ 'pubkey-format', null, 0, 0, 0 ],[ 'encoding-failed', _lowerFlatStringAny, 8, 4, 2 ],],
      variantSize32: 12,
      variantAlign32: 4,
      variantPayloadOffset32: 4,
      variantFlatCount: 3,
    } ), 16, 4, 4 ],
    ],
    variantSize32: 16,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 4,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline9,
},
);
let trampoline10 = _trampoline10.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 10,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline10.manuallyAsync,
  paramLiftFns: [_liftFlatBorrow.bind(null, 0)],
  resultLowerFns: [_lowerFlatStringAny],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline10,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 10,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline10.manuallyAsync,
  paramLiftFns: [_liftFlatBorrow.bind(null, 0)],
  resultLowerFns: [_lowerFlatStringAny],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline10,
},
);
let trampoline11 = _trampoline11.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 11,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline11.manuallyAsync,
  paramLiftFns: [_liftFlatBorrow.bind(null, 1),_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', null, 12, 4, 4 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'last-operation-failed', _lowerFlatOwn({
        componentIdx: 0,
        lowerFn: 
        function lowerImportedOwnedHost_Error$1(obj) {
          if (!(obj instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid \"Error$1\" resource.');
          }
          let handle = obj[symbolRscHandle];
          if (!handle) {
            const rep = obj[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, obj);
            handle = rscTableCreateOwn(handleTable0, rep);
          }
          return handle;
        }
        ,
      }), 4, 4, 1 ],[ 'closed', null, 0, 0, 0 ],],
      variantSize32: 8,
      variantAlign32: 4,
      variantPayloadOffset32: 4,
      variantFlatCount: 2,
    } ), 12, 4, 4 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: undefined,
  importFn: _trampoline11,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 11,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline11.manuallyAsync,
  paramLiftFns: [_liftFlatBorrow.bind(null, 1),_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', null, 12, 4, 4 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'last-operation-failed', _lowerFlatOwn({
        componentIdx: 0,
        lowerFn: 
        function lowerImportedOwnedHost_Error$1(obj) {
          if (!(obj instanceof Error$1)) {
            throw new TypeError('Resource error: Not a valid \"Error$1\" resource.');
          }
          let handle = obj[symbolRscHandle];
          if (!handle) {
            const rep = obj[symbolRscRep] || ++captureCnt0;
            captureTable0.set(rep, obj);
            handle = rscTableCreateOwn(handleTable0, rep);
          }
          return handle;
        }
        ,
      }), 4, 4, 1 ],[ 'closed', null, 0, 0, 0 ],],
      variantSize32: 8,
      variantAlign32: 4,
      variantPayloadOffset32: 4,
      variantFlatCount: 2,
    } ), 12, 4, 4 ],
    ],
    variantSize32: 12,
    variantAlign32: 4,
    variantPayloadOffset32: 4,
    variantFlatCount: 3,
  })
  ],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: undefined,
  importFn: _trampoline11,
},
);
let trampoline12 = _trampoline12.manuallyAsync ? new WebAssembly.Suspending(_lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 12,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline12.manuallyAsync,
  paramLiftFns: [],
  resultLowerFns: [_lowerFlatList({
    elemLowerFn: _lowerFlatTuple({ elemLowerMetas: [[_lowerFlatStringAny, 8, 4],[_lowerFlatStringAny, 8, 4],], size32: 16, align32: 4 }),
    elemSize32: 16,
    elemAlign32: 4,
  })],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline12,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 12,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline12.manuallyAsync,
  paramLiftFns: [],
  resultLowerFns: [_lowerFlatList({
    elemLowerFn: _lowerFlatTuple({ elemLowerMetas: [[_lowerFlatStringAny, 8, 4],[_lowerFlatStringAny, 8, 4],], size32: 16, align32: 4 }),
    elemSize32: 16,
    elemAlign32: 4,
  })],
  hasResultPointer: true,
  funcTypeIsAsync: false,
  getCallbackFn: () => null,
  getPostReturnFn: () => null,
  isCancellable: false,
  memoryIdx: 0,
  stringEncoding: 'utf8',
  getMemoryFn: () => memory0,
  getReallocFn: () => realloc0,
  importFn: _trampoline12,
},
);

const $init = (() => {
  let gen = (function* _initGenerator () {
    const module0 = base64Compile('AGFzbQEAAAAB6gEdYAN/f38Bf2ACf38Bf2ABfwBgBH9/f38AYAJ/fwBgA39/fwBgCn9/f39/f39/f38AYAABf2AAAGABfwF/YAZ/f39/f38AYAR/f39+AGAFf39/fn8AYAV/f39/fwBgCX9/f39/f39/fwF/YAV/f39/fwF/YAR/f39/AX9gB39/f39/f38AYAJ+fwF/YAJ8fwF/YAR/f35+AGAGf39/f39/AX9gA35/fwF/YAR/fH9/AX9gB39/f39/f38Bf2ALf39/f39/f39/f38Bf2AJf39/f39/fn5+AGAIf39/f39/f38AYAV/fn5+fgACvgQNHWhvc3Q6aW50ZXJmYWNlcy9sb2dnaW5nQDIuMS4wBGluZm8ABR1ob3N0OmludGVyZmFjZXMvbG9nZ2luZ0AyLjEuMAVlcnJvcgAFG2hvc3Q6aW50ZXJmYWNlcy9jbG9ja0AyLjEuMAZub3ctbXMAAiBob3N0OnRlbmFudC90ZW5hbnQtY29udGV4dEAxLjAuMAp0ZW5hbnQtZGlkAAIsaG9zdDppbnRlcmZhY2VzL2h0dHAtd2l0aC1wbGFjZWhvbGRlcnNAMi4xLjAEY2FsbAAGHWhvc3Q6aW50ZXJmYWNlcy9zaWduaW5nQDIuMS4wBHNpZ24ABRN3YXNpOmlvL2Vycm9yQDAuMi40FFtyZXNvdXJjZS1kcm9wXWVycm9yAAIVd2FzaTppby9zdHJlYW1zQDAuMi40HFtyZXNvdXJjZS1kcm9wXW91dHB1dC1zdHJlYW0AAhN3YXNpOmlvL2Vycm9yQDAuMi40HVttZXRob2RdZXJyb3IudG8tZGVidWctc3RyaW5nAAQVd2FzaTppby9zdHJlYW1zQDAuMi40LlttZXRob2Rdb3V0cHV0LXN0cmVhbS5ibG9ja2luZy13cml0ZS1hbmQtZmx1c2gAAxV3YXNpOmNsaS9zdGRlcnJAMC4yLjQKZ2V0LXN0ZGVycgAHGndhc2k6Y2xpL2Vudmlyb25tZW50QDAuMi4wD2dldC1lbnZpcm9ubWVudAACE3dhc2k6Y2xpL2V4aXRAMC4yLjAEZXhpdAACA/0D+wMICQkJBAoECgsMDAwMDAUFCwkJCQ0AAAkJCQQEBAQEBAQKBQQEBAEBAQUEAgICAgICAgIBAQAFAQUEBAEIAg4ODg4KBQ0BDw0CAQ4ODg4BAQUBAQEBBAUFAgEBAAEBAQQBAQEBAQIBAQEEBQUQEBAQAQEBAQEAAgEABAQBAQEDAgUKDQUBAQECBQQEBAUCAQUQBwgFBQMFBQQBAQEBAQEDBAQECQUEBAQDBQEBAQEBBAEBAQMEAwQFBQQFBBEEBAEBAQEBAQEBAQEBAQQJCQEJAAUBAAUFAwUEAgkJBAQFBAQFCREAAgEBAQABAQEAAQEAAAwMDAwLDQoNAQEAAgEAARITCAUCBQQUBAUNAgICBQQBAQIBAAEBAQABAQEAAQEEAwQCCAEIBRACAgQEBAQBDQoFCQMDAwMDCQMEAwMCCggCBQUIAwECAgIHCQQHBAENCQIFBQEBAQEBAAAAAAICAgICBAQFBAQBAAMDBAAAAAEBBAQEBAQQCAQDBwkJAAICAQEEAAECCAgIAQkCAgIJAAEBAQkJAAQBAQACAQEFAAUEBAMFCAIEAQUBEAAFDQEBARIBAAABAQEAFQUCBQUFFgEBAQEBAQEBAQEDAAUNDREXAwMXAQAACQ8DDwEADxgZCgAAARoKAQ0CAQ0JCQEFBQUDDRsBBAEBARwEBwFwAacBpwEFAwEAEQabAix/AUGAgMAAC38AQQALfwBBiMzAAAt/AEEIC38AQQkLfwBBCgt/AEELC38AQQwLfwBBDQt/AEEBC38AQQ8LfwBBEAt/AEERC38AQRILfwBB2I7CAAt/AEEpC38AQbrfwAALfwBBuuHAAAt/AEHBAAt/AEHCAAt/AEHFAAt/AEEpC38AQcoAC38AQcwAC38AQc4AC38AQdgAC38AQdkAC38AQdoAC38AQdsAC38AQd0AC38AQZyTwgALfwBB4QALfwBB8I7CAAt/AEHiAAt/AEGsx8EAC38AQYiPwgALfwBBoI/CAAt/AEGcj8IAC38AQZCPwgALfwBBsJPCAAt/AEGAgMQAC38AQcSGwgALfwBBiNXBAAt/AEGhAQsHhgMKBm1lbW9yeQIANGNhYmlfcG9zdF9zeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjY29tcG9zZS1hY3Rpb24ASipzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjY29tcG9zZS1hY3Rpb24ASyRzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZXZhbHVhdGUATCNzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZXhlY3V0ZQBNJXN5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNnZXQtdHJhY2UATi5jYWJpX3Bvc3Rfc3lub2Q6YWdlbnQvY29udHJhY3RzQDEuMC4wI2V2YWx1YXRlAEotY2FiaV9wb3N0X3N5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNleGVjdXRlAEovY2FiaV9wb3N0X3N5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNnZXQtdHJhY2UASgxjYWJpX3JlYWxsb2MAhAMJuAIBAEEBC6YBkwGRAacCkgE1NDP5AdsBzAGfAp4CtQNE0ANw0gNvOkJBggFAPPcBUkleYIkBW21fXH+KAWFufnHRA4ABcnN1gQGIAYMBhQGEAasBuwGqAboBvgG4AakBvQG5AaYBtwG/AacBqAHOA9QD0AHNAc4B1AHTAdIB1gG3A/QB+AGIAvsBhwLyAfYB9QGJAvMBigKMAosCwwPPA6kCxAOlAuIDogKhAqYC0wLZAq4CvALcAuIChAPrAvsC5gLoAvoC5QLnAvwC5ALqArAC+AL3AsAC+QLCAsEC7gLJAsUCxgLIAsoCxwLEAu0C9gL1AukC7wL+AoMDggP0Av0CgQP/AoAD4wLsAqYDpQPxAvMC8ALyAroCuwKFA6gDrAOqA6cDqQPFA/cDwAOCBOMDhgTZA7wDvgMKwYgP+wMCAAvGEQEKfyOAgICAAEGAAWsiASSAgICAAAJAIAAQj4CAgAAiAg0AIABBADYCCAJAIAAoAhQiAiAAKAIQIgNPDQAgAEEMaiEEIAAoAgwhBUEAIQYDQEEAIANrIQcgAkEFaiECAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQANAAkACQCAFIAJqIghBe2otAAAiCUF3ag4lAQEJCQEJCQkJCQkJCQkJCQkJCQkJCQkBCQgJCQkJCQkJCQkJBgALIAlBpX9qDiEGCAgICAgICAgICAQICAgICAgIAggICAgIAwgICAgICAYICyAAIAJBfGo2AhQgByACQQFqIgJqQQVHDQAMEAsLIAAgAkF8aiIFNgIUIAUgA08NByAAIAJBfWoiCTYCFAJAIAhBfGotAABB9QBHDQAgCSAFIAMgBSADSxsiBUYNCCAAIAJBfmoiAzYCFCAIQX1qLQAAQewARw0AIAMgBUYNCCAAIAJBf2o2AhQgCEF+ai0AAEHsAEYNDAsgAUEJNgJ0IAFByABqIAQQ7YGAgAAgAUH0AGogASgCSCABKAJMEPGBgIAAIQIMDwsgACACQXxqIgU2AhQgBSADTw0HIAAgAkF9aiIJNgIUAkAgCEF8ai0AAEHyAEcNACAJIAUgAyAFIANLGyIFRg0IIAAgAkF+aiIDNgIUIAhBfWotAABB9QBHDQAgAyAFRg0IIAAgAkF/ajYCFCAIQX5qLQAAQeUARg0LCyABQQk2AnQgAUHYAGogBBDtgYCAACABQfQAaiABKAJYIAEoAlwQ8YGAgAAhAgwOCyAAIAJBfGoiBTYCFCAFIANPDQcgACACQX1qIgk2AhQCQCAIQXxqLQAAQeEARw0AIAkgBSADIAUgA0sbIgVGDQggACACQX5qIgM2AhQgCEF9ai0AAEHsAEcNACADIAVGDQggACACQX9qIgM2AhQgCEF+ai0AAEHzAEcNACADIAVGDQggACACNgIUIAhBf2otAABB5QBGDQoLIAFBCTYCdCABQegAaiAEEO2BgIAAIAFB9ABqIAEoAmggASgCbBDxgYCAACECDA0LIAAgAkF8ajYCFAwDCwJAIAAoAgAgACgCCCICayAGQQFxIgVPDQAgACACIAVBAUEBEI+BgIAAIAAoAgghAgsCQCAFRQ0AIAAoAgQgAmogCjoAACACQQFqIQILIAAgAjYCCCAAIAAoAhRBAWo2AhRBACEHDAgLIAAgAkF8ajYCFCAEEOiBgIAAIgINCgwGCyAJQVBqQf8BcUEKTw0ECyAAEJCAgIAAIgJFDQQMCAsgAUEFNgJ0IAFBwABqIAQQ7YGAgAAgAUH0AGogASgCQCABKAJEEPGBgIAAIQIMBwsgAUEFNgJ0IAFB0ABqIAQQ7YGAgAAgAUH0AGogASgCUCABKAJUEPGBgIAAIQIMBgsgAUEFNgJ0IAFB4ABqIAQQ7YGAgAAgAUH0AGogASgCYCABKAJkEPGBgIAAIQIMBQsgAUEKNgJ0IAFBOGogBBDsgYCAACABQfQAaiABKAI4IAEoAjwQ8YGAgAAhAgwEC0EBIQcCQCAGQQFxRQ0AIAohCQwBCwJAIAAoAggiAg0AQQAhAgwECyAAIAJBf2oiAjYCCCAAKAIEIAJqLQAAIQkLAkACQAJAAkACQAJAAkAgACgCFCICIAAoAhAiA0kNACAJIQoMAQsgACgCBCEGIAAoAgwhBSAAKAAIIQggCSEKA0ACQAJAAkACQAJAIAUgAmotAAAiCUF3ag4kAQEHBwEHBwcHBwcHBwcHBwcHBwcHBwcBBwcHBwcHBwcHBwcCAAsgCUHdAEYNAiAJQf0ARw0GIApB/wFxQfsARg0DDAYLIAAgAkEBaiICNgIUIAMgAkcNAwwECyAHQQFxRQ0FIAAgAkEBaiICNgIUDAULIApB/wFxQdsARw0DCyAAIAJBAWoiAjYCFAJAIAgNAEEAIQIMCgsgACAIQX9qIgg2AgggBiAIai0AACEKQQEhByACIANJDQALC0ECIQICQAJAIApB/wFxIgBB2wBGDQAgAEH7AEcNAUEDIQILIAEgAjYCdCABQTBqIAQQ7IGAgAAgAUH0AGogASgCMCABKAI0EPGBgIAAIQIMCAsjgYCAgAAiAkGAgMCAAGpBKCACQZDywYAAahDag4CAAAALIAdBAXFFDQBBByECIApB/wFxIgBB2wBGDQIgAEH7AEYNASOBgICAACICQYCAwIAAakEoIAJBoPLBgABqENqDgIAAAAsgCkH/AXFB+wBHDQICQCACIANPDQADQAJAAkAgBSACai0AAEF3aiIJQRlLDQBBASAJdEGTgIAEcQ0BIAlBGUcNACAAIAJBAWo2AhQgBBDogYCAACICDQkCQAJAAkAgACgCFCICIAAoAhAiA08NACAEKAIAIQUDQAJAIAUgAmotAABBd2oOMgAABAQABAQEBAQEBAQEBAQEBAQEBAQEAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQDBAsgACACQQFqIgI2AhQgAyACRw0ACwsgAUEDNgJ0IAFBIGogBBDsgYCAACABQfQAaiABKAIgIAEoAiQQ8YGAgAAhAgwLCyAAIAJBAWoiAjYCFAwHCyABQQY2AnQgAUEYaiAEEOyBgIAAIAFB9ABqIAEoAhggASgCHBDxgYCAACECDAkLIAFBETYCdCABQQhqIAQQ7IGAgAAgAUH0AGogASgCCCABKAIMEPGBgIAAIQIMCAsgACACQQFqIgI2AhQgAyACRw0ACwsgAUEDNgJ0IAFBEGogBBDsgYCAACABQfQAaiABKAIQIAEoAhQQ8YGAgAAhAgwFC0EIIQILIAEgAjYCdCABIAQQ7IGAgAAgAUH0AGogASgCACABKAIEEPGBgIAAIQIMAwtBASEGIAIgA0kNAAsLIAFBBTYCdCABQShqIABBDGoQ7IGAgAAgAUH0AGogASgCKCABKAIsEPGBgIAAIQILIAFBgAFqJICAgIAAIAILjgIBBX8jgICAgABBIGsiASSAgICAAAJAAkACQAJAIAAoAhQiAiAAKAIQIgNPDQAgAEEMaiEEIAAoAgwhBQNAAkAgBSACai0AAEF3ag4yAAAEBAAEBAQEBAQEBAQEBAQEBAQEBAQABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAMECyAAIAJBAWoiAjYCFCADIAJHDQALCyABQQM2AhQgAUEIaiAAQQxqEOyBgIAAIAFBFGogASgCCCABKAIMEPGBgIAAIQIMAgsgACACQQFqNgIUQQAhAgwBCyABQQY2AhQgASAEEOyBgIAAIAFBFGogASgCACABKAIEEPGBgIAAIQILIAFBIGokgICAgAAgAguDBAEHfyOAgICAAEEwayIBJICAgIAAIABBDGohAgJAAkAgACgCFCIDIAAoAhAiBE8NACAAIANBAWoiBTYCFAJAAkAgACgCDCIGIANqLQAAIgNBMEYNACADQU9qQf8BcUEISw0CIAUgBE8NAQNAIAYgBWotAABBUGpB/wFxQQlLDQIgACAFQQFqIgU2AhQgBCAFRw0AC0EAIQMMAwsgBSAETw0AIAYgBWotAABBUGpB/wFxQQlLDQAgAUENNgIkIAFBCGogAhDsgYCAACABQSRqIAEoAgggASgCDBDxgYCAACEDDAILQQAhAyAFIARPDQECQAJAAkAgBiAFai0AACIHQeUARg0AIAdBxQBGDQAgB0EuRw0EIAAgBUEBaiIHNgIUIAcgBE8NAiAGIAdqLQAAQVBqQf8BcUEJSw0CIAVBAmohBQNAIAQgBUYNAiAGIAVqIQIgBUEBaiIHIQUgAi0AACICQVBqQf8BcUEKSQ0ACyAAIAdBf2o2AhQgAkEgckHlAEcNBAsgABCegICAACEDDAMLIAAgBDYCFAwCCyABQQ02AiQgAUEQaiACEOyBgIAAIAFBJGogASgCECABKAIUEPGBgIAAIQMMAQsgAUENNgIkIAFBGGogAhDtgYCAACABQSRqIAEoAhggASgCHBDxgYCAACEDCyABQTBqJICAgIAAIAMLywIBB38jgICAgABBMGsiAiSAgICAACACQRxqIAFBCGooAgA2AgAgAkGAAToAICACQQA2AhAgAkKAgICAEDcCCCACIAEpAgA3AhQgACACQQhqIAEgASABIAEQkoCAgAACQCAAKAIIIgNBgICAgHhGDQAgAigCHCIBIAIoAhgiBE8NACACQRRqIQUgACgCDCEGIAIoAhQhBwJAA0AgByABai0AAEF3aiIIQRdLDQFBASAIdEGTgIAEcUUNASAEIAFBAWoiAUcNAAsgAiAENgIcDAELIAIgATYCHCACQRY2AiQgAiAFEOmBgIAAIAJBJGogAigCACACKAIEEPGBgIAAIQEgAEGAgICAeDYCCCAAIAE2AgAgA0UNACAGIANBARCcgYCAAAsCQCACKAIIIgFFDQAgAigCDCABQQEQnIGAgAALIAJBMGokgICAgAAL6CkEB38BfgZ/AX4jgICAgABBkAJrIgYkgICAgAACQAJAAkAgASgCFCIHIAEoAhAiCE8NACABQQxqIQkgASgCDCEKA0AgCiAHai0AACILQXdqIgxBF0sNAkEBIAx0QZOAgARxRQ0CIAEgB0EBaiIHNgIUIAggB0cNAAsLIAZBBTYC+AEgBiABQQxqEOmBgIAAIAZB+AFqIAYoAgAgBigCBBDxgYCAACEMQYCAgIB4IQgMAQsCQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAtB2wBGDQAgC0H7AEYNAUGAgICAeCEIIAEgBkGPAmojgYCAgABBmPPBgABqEKOAgIAAIAEQ64CAgAAhDAwOCyABIAEtABhBf2oiDDoAGCAMQf8BcUUNASABIAdBAWo2AhQgBkEBOgD0ASAGIAE2AvABIAZB+AFqIAZB8AFqEKmAgIAAAkACQCAGLQD4AUEBRw0AIAYoAvwBIQxBgICAgHghCAwBCwJAAkACQAJAIAYtAPkBQQFHDQAgBkH4AWogBigC8AEQrYCAgABBgICAgHghCCAGKAL8ASEMAkAgBigC+AEiB0GAgICAeEcNAAwFCyAGNQKAAiENIAZB+AFqIAZB8AFqEKmAgIAAAkAgBi0A+AFBAUcNACAGKAL8ASELDAQLIAYtAPkBQQFHDQIgBkH4AWogBigC8AEQqoCAgAAgBigC+AFBAUcNASAGKAL8ASELDAMLQYCAgIB4IQhBACOBgICAACIHQejywYAAaiAHQdjywYAAahDogICAACEMDAMLIA1CIIYgDK2EIQ0gBigChAIhDiAGKAKAAiEMIAchCAwCC0EBI4GAgIAAIghB6PLBgABqIAhB2PLBgABqEOiAgIAAIQsLQYCAgIB4IQgCQCAHRQ0AIAwgB0EBEJyBgIAACyALIQwLIAEgAS0AGEEBajoAGAJAAkACQAJAAkAgASgCFCIHIAEoAhAiD08NACAJKAIAIQsDQAJAIAsgB2otAAAiCkF3ag4kAAAEBAAEBAQEBAQEBAQEBAQEBAQEBAQABAQEBAQEBAQEBAQGAwsgASAHQQFqIgc2AhQgDyAHRw0ACwsgBkECNgL4ASAGQRhqIAkQ6YGAgAAgBkH4AWogBigCGCAGKAIcEPGBgIAAIQsMDQsgCkHdAEYNAQsgBkEWNgL4ASAGQRBqIAkQ6YGAgAAgBkH4AWogBigCECAGKAIUEPGBgIAAIQsMCwsgASAHQQFqNgIUQQAhCwwKCyABIAdBAWoiBzYCFCAHIA9PDQgDQCALIAdqLQAAIhBBd2oiCkEXSw0IQQEgCnRBk4CABHFFDQggASAHQQFqIgc2AhQgDyAHRw0ADAkLCyABIAEtABhBf2oiDDoAGAJAIAxB/wFxRQ0AIAEgB0EBaiIHNgIUAkAgByAISQ0AQYCAgIB4IREMBAtCACENQYCAgIB4IRFBASEPA0AgCSgCACELAkADQCALIAdqLQAAIgpBd2oiDEEXSw0BQQEgDHRBk4CABHFFDQEgASAHQQFqIgc2AhQgCCAHRw0ADAYLCwJAAkACQAJAIApB/QBHDQBBgICAgHghCCARQYCAgIB4Rg0BIA2nQQFxRQ0CIBKtQiCGIBOthCENIBRCIIinIQ4gFKchDCARIQgMCwsCQCAPQQFxDQACQCAKQSxGDQAgBkEINgL4ASAGQegBaiAJEOmBgIAAIAZB+AFqIAYoAugBIAYoAuwBEPGBgIAAIQwMCgsgASAHQQFqIgc2AhQCQCAHIAhPDQADQCALIAdqLQAAIgpBd2oiDEEZSw0JAkBBASAMdEGTgIAEcQ0AIAxBGUcNCgwGCyABIAdBAWoiBzYCFCAIIAdHDQALCyAGQQU2AvgBIAZB2AFqIAkQ6YGAgAAgBkH4AWogBigC2AEgBigC3AEQ8YGAgAAhDAwJCyAKQSJGDQIgBkERNgL4ASAGQcgBaiAJEOmBgIAAIAZB+AFqIAYoAsgBIAYoAswBEPGBgIAAIQwMCAsjgYCAgABB1aPAgABqQREQ5oCAgAAhDAwIC0GAgICAeCEII4GAgIAAQeajwIAAakEGEOaAgIAAIQwgEUUNByATIBFBARCcgYCAAAwHCyABQQA2AgggASAHQQFqNgIUIAZB+AFqIAkgARDrgYCAACAGKAL8ASEMIAYoAvgBIgdBAkYNBSAGKAKAAiEIAkACQAJAAkACQAJAAkACQAJAAkACQCAHQQFxRQ0AIAhBemoODAIFBQQFBQUFBQUFAQULAkACQAJAIAhBemoODAIHBwAHBwcHBwcHAQcLIAwjgYCAgABB0aTAgABqQQkQnYOAgABFDQoMBgsgDCOBgICAAEHVo8CAAGpBERCdg4CAAEUNCQwFCyAMI4GAgIAAQeajwIAAakEGEJ2DgIAARQ0CDAQLIAwjgYCAgABB1aPAgABqQREQnYOAgAANAwwHCyAMI4GAgIAAQeajwIAAakEGEJ2DgIAADQILIA1CAVENAyABEKSAgIAAIgwNDCAGQfgBaiABEKqAgIAAIAYoAvgBRQ0CIAYoAvwBIQwMDAsgDCOBgICAAEHRpMCAAGpBCRCdg4CAAEUNBAsgARCkgICAACIMDQogAUEANgIIIAEoAhQiByABKAIQIghPDQIgCSgCACEMQQAhEANAQQAgCGshDyAHQQVqIQcCQAJAAkACQAJAAkACQAJAAkACQAJAAkACQANAAkACQCAMIAdqIgpBe2otAAAiC0F3ag4lAQEICAEICAgICAgICAgICAgICAgICAgBCAYICAgICAgICAgICQALIAtBpX9qDiEGBwcHBwcHBwcHBwQHBwcHBwcHAgcHBwcHAwcHBwcHBwYHCyABIAdBfGo2AhQgDyAHQQFqIgdqQQVHDQAMEQsLIAEgB0F8aiIMNgIUIAwgCE8NByABIAdBfWoiCzYCFAJAIApBfGotAABB9QBHDQAgCyAMIAggDCAISxsiDEYNCCABIAdBfmoiCDYCFCAKQX1qLQAAQewARw0AIAggDEYNCCABIAdBf2o2AhQgCkF+ai0AAEHsAEYNCwsgBkEJNgL4ASAGQaABaiAJEOqBgIAAIAZB+AFqIAYoAqABIAYoAqQBEPGBgIAAIQwMFwsgASAHQXxqIgw2AhQgDCAITw0HIAEgB0F9aiILNgIUAkAgCkF8ai0AAEHyAEcNACALIAwgCCAMIAhLGyIMRg0IIAEgB0F+aiIINgIUIApBfWotAABB9QBHDQAgCCAMRg0IIAEgB0F/ajYCFCAKQX5qLQAAQeUARg0KCyAGQQk2AvgBIAZBsAFqIAkQ6oGAgAAgBkH4AWogBigCsAEgBigCtAEQ8YGAgAAhDAwWCyABIAdBfGoiDDYCFCAMIAhPDQcgASAHQX1qIgs2AhQCQCAKQXxqLQAAQeEARw0AIAsgDCAIIAwgCEsbIgxGDQggASAHQX5qIgg2AhQgCkF9ai0AAEHsAEcNACAIIAxGDQggASAHQX9qIgg2AhQgCkF+ai0AAEHzAEcNACAIIAxGDQggASAHNgIUIApBf2otAABB5QBGDQkLIAZBCTYC+AEgBkHAAWogCRDqgYCAACAGQfgBaiAGKALAASAGKALEARDxgYCAACEMDBULIAEgB0F8ajYCFCAJEOeBgIAAIgwNFAwHCwJAIAEoAgAgASgCCCIHayAQQQFxIgxPDQAgASAHIAxBAUEBEI+BgIAAIAEoAgghBwsCQCAMRQ0AIAEoAgQgB2ogDjoAACAHQQFqIQcLIAEgBzYCCCABIAEoAhRBAWo2AhRBACEPDAcLIAtBUGpB/wFxQQpJDQEgBkEKNgL4ASAGQZABaiAJEOmBgIAAIAZB+AFqIAYoApABIAYoApQBEPGBgIAAIQwMEgsgASAHQXxqNgIUCyABEJ+AgIAAIgxFDQMMEAsgBkEFNgL4ASAGQZgBaiAJEOqBgIAAIAZB+AFqIAYoApgBIAYoApwBEPGBgIAAIQwMDwsgBkEFNgL4ASAGQagBaiAJEOqBgIAAIAZB+AFqIAYoAqgBIAYoAqwBEPGBgIAAIQwMDgsgBkEFNgL4ASAGQbgBaiAJEOqBgIAAIAZB+AFqIAYoArgBIAYoArwBEPGBgIAAIQwMDQtBASEPAkAgEEEBcUUNACAOIQsMAQsgASgCCCIHRQ0GIAEgB0F/aiIHNgIIIAEoAgQgB2otAAAhCwsCQAJAAkACQAJAAkACQCABKAIUIgcgASgCECIISQ0AIAshDgwBCyABKAIEIRAgASgCDCEMIAEoAgghCiALIQ4DQAJAAkACQAJAAkAgDCAHai0AACILQXdqDiQBAQcHAQcHBwcHBwcHBwcHBwcHBwcHBwEHBwcHBwcHBwcHBwIACyALQd0ARg0CIAtB/QBHDQYgDkH/AXFB+wBGDQMMBgsgASAHQQFqIgc2AhQgCCAHRw0DDAQLIA9BAXFFDQUgASAHQQFqIgc2AhQMBQsgDkH/AXFB2wBHDQMLIAEgB0EBaiIHNgIUIApFDQwgASAKQX9qIgo2AgggECAKai0AACEOQQEhDyAHIAhJDQALC0ECIQcCQAJAIA5B/wFxIgxB2wBGDQAgDEH7AEcNAUEDIQcLIAYgBzYC+AEgBkGAAWogCRDpgYCAACAGQfgBaiAGKAKAASAGKAKEARDxgYCAACEMDBELI4GAgIAAIgdBgIDAgABqQSggB0GQ8sGAAGoQ2oOAgAAACyAPQQFxRQ0AQQchByAOQf8BcSIMQdsARg0CIAxB+wBGDQEjgYCAgAAiB0GAgMCAAGpBKCAHQaDywYAAahDag4CAAAALIA5B/wFxQfsARw0CAkAgByAITw0AA0ACQAJAIAwgB2otAABBd2oiC0EZSw0AQQEgC3RBk4CABHENASALQRlHDQAgASAHQQFqNgIUIAkQ54GAgAAiDA0SAkACQAJAIAEoAhQiByABKAIQIghPDQAgCSgCACEMA0ACQCAMIAdqLQAAQXdqDjIAAAQEAAQEBAQEBAQEBAQEBAQEBAQEBAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAwQLIAEgB0EBaiIHNgIUIAggB0cNAAsLIAZBAzYC+AEgBkHwAGogCRDpgYCAACAGQfgBaiAGKAJwIAYoAnQQ8YGAgAAhDAwUCyABIAdBAWoiBzYCFAwHCyAGQQY2AvgBIAZB6ABqIAkQ6YGAgAAgBkH4AWogBigCaCAGKAJsEPGBgIAAIQwMEgsgBkERNgL4ASAGQdgAaiAJEOmBgIAAIAZB+AFqIAYoAlggBigCXBDxgYCAACEMDBELIAEgB0EBaiIHNgIUIAggB0cNAAsLIAZBAzYC+AEgBkHgAGogCRDpgYCAACAGQfgBaiAGKAJgIAYoAmQQ8YGAgAAhDAwOC0EIIQcLIAYgBzYC+AEgBkHQAGogCRDpgYCAACAGQfgBaiAGKAJQIAYoAlQQ8YGAgAAhDAwMC0EBIRAgByAISQ0ADAMLCyAGKQOAAiEUQgEhDQwDCyOBgICAAEHmo8CAAGpBBhDpgICAACEMDAgLIAZBBTYC+AEgBkH4AGogCRDpgYCAACAGQfgBaiAGKAJ4IAYoAnwQ8YGAgAAhDAwHCwJAAkAgEUGAgICAeEcNAAJAIAEQpICAgAAiDA0AIAZB+AFqIAEQrYCAgAAgBigC/AEhEyAGKAL4ASIRQYCAgIB4Rw0CIBMhDAtBgICAgHghCAwJCyOBgICAAEHVo8CAAGpBERDpgICAACEMDAcLIAYoAoACIRILQQAhDyABKAIUIgcgASgCECIISQ0ADAQLCyAGQRg2AvgBIAZBMGogCRDpgYCAACAGQfgBaiAGKAIwIAYoAjQQ8YGAgAAhDEGAgICAeCEIDAwLIAZBGDYC+AEgBkEIaiAJEOmBgIAAIAZB+AFqIAYoAgggBigCDBDxgYCAACEMQYCAgIB4IQgMCwsCQCAKQf0ARg0AIAZBETYC+AEgBkHQAWogCRDpgYCAACAGQfgBaiAGKALQASAGKALUARDxgYCAACEMDAILIAZBFTYC+AEgBkHgAWogCRDpgYCAACAGQfgBaiAGKALgASAGKALkARDxgYCAACEMDAELIAZBAzYC+AEgBkGIAWogCRDpgYCAACAGQfgBaiAGKAKIASAGKAKMARDxgYCAACEMC0GAgICAeCEIIBFBgICAgHhyQYCAgIB4Rg0AIBMgEUEBEJyBgIAACwsgASABLQAYQQFqOgAYAkACQAJAAkACQAJAIAEoAhQiByABKAIQIg9PDQAgCSgCACELA0ACQCALIAdqLQAAIgpBd2oOJAAABAQABAQEBAQEBAQEBAQEBAQEBAQEAAQEBAQEBAQEBAQEBgMLIAEgB0EBaiIHNgIUIA8gB0cNAAsLIAZBAzYC+AEgBkHAAGogCRDpgYCAACAGQfgBaiAGKAJAIAYoAkQQ8YGAgAAhCwwECyAKQf0ARg0BCyAGQRY2AvgBIAZBOGogCRDpgYCAACAGQfgBaiAGKAI4IAYoAjwQ8YGAgAAhCwwCCyABIAdBAWo2AhRBACELDAELIAZBFTYC+AEgBkHIAGogCRDpgYCAACAGQfgBaiAGKAJIIAYoAkwQ8YGAgAAhCwsCQAJAIAhBgICAgHhGDQAgDachByALRQ0FIAgNASALIQwMBwsgC0UNBgJAIAsoAgANACALKAIIIgdFDQAgCygCBCAHQQEQnIGAgAALIAtBFEEEEJyBgIAADAYLIAcgCEEBEJyBgIAAIAshDAwFCyAQQd0ARw0AIAZBFTYC+AEgBkEoaiAJEOmBgIAAIAZB+AFqIAYoAiggBigCLBDxgYCAACELDAELIAZBFjYC+AEgBkEgaiAJEOmBgIAAIAZB+AFqIAYoAiAgBigCJBDxgYCAACELCwJAIAhBgICAgHhGDQAgDachByALRQ0BIAgNAiALIQwMAwsgC0UNAgJAIAsoAgANACALKAIIIgdFDQAgCygCBCAHQQEQnIGAgAALIAtBFEEEEJyBgIAADAILIAAgBzYCDCAAIA42AgQgACANQiCIPgIQDAILIAcgCEEBEJyBgIAAIAshDAtBgICAgHghCCAMIAEQ64CAgAAhDAsgACAINgIIIAAgDDYCACAGQZACaiSAgICAAAuxAwENfyOAgICAAEEwayICJICAgIAAIAJBHGogAUEIaigCADYCACACQYABOgAgIAJBADYCECACQoCAgIAQNwIIIAIgASkCADcCFCAAIAJBCGogASABIAEgARCUgICAAAJAIAAoAgAiA0GAgICAeEYNACACKAIcIgEgAigCGCIETw0AIAJBFGohBSAAKAIoIQYgACgCJCEHIAAoAhwhCCAAKAIYIQkgACgCECEKIAAoAgwhCyAAKAIEIQwgAigCFCENAkADQCANIAFqLQAAQXdqIg5BF0sNAUEBIA50QZOAgARxRQ0BIAQgAUEBaiIBRw0ACyACIAQ2AhwMAQsgAiABNgIcIAJBFjYCJCACIAUQ7IGAgAAgAkEkaiACKAIAIAIoAgQQ8YGAgAAhASAAQYCAgIB4NgIAIAAgATYCBAJAIANFDQAgDCADQQEQnIGAgAALAkAgC0UNACAKIAtBARCcgYCAAAsCQCAJRQ0AIAggCUEBEJyBgIAACyAHRQ0AIAYgB0EBEJyBgIAACwJAIAIoAggiAUUNACACKAIMIAFBARCcgYCAAAsgAkEwaiSAgICAAAvCEQETfyOAgICAAEHgAGsiBiSAgICAAAJAAkACQCABKAIUIgcgASgCECIITw0AIAFBDGohCSABKAIMIQoDQCAKIAdqLQAAIgtBd2oiDEEXSw0CQQEgDHRBk4CABHFFDQIgASAHQQFqIgc2AhQgCCAHRw0ACwsgBkEFNgIsIAZBCGogAUEMahDsgYCAACAGQSxqIAYoAgggBigCDBDxgYCAACEJQYCAgIB4IQsMAQsCQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCALQdsARg0AIAtB+wBGDQFBgICAgHghCyABIAZB3wBqI4GAgIAAQYjzwYAAahCigICAACABEOqAgIAAIQkMDQsgASABLQAYQX9qIgw6ABggDEH/AXFFDQEgASAHQQFqNgIUIAZBAToAKCAGIAE2AiQgBkEsaiAGQSRqEKiAgIAAAkAgBi0ALEEBRw0AIAYoAjAhCUGAgICAeCELDAkLIAYtAC1BAUcNAiAGQSxqIAYoAiQgBiAGIAYgBhCugICAACAGKAIwIQkCQCAGKAIsIgtBgICAgHhHDQBBgICAgHghCwwJCyAGKAJYIQ0gBigCVCEOIAYoAlAhDyAGKAJMIRAgBigCSCERIAYoAkQhEiAGKAJAIRMgBigCPCEUIAYoAjghFSAGKAI0IRYgBkEsaiAGQSRqEKiAgIAAAkACQAJAIAYtACxBAUYNAEECIQcgBi0ALUEBRw0CIAZBLGogBigCJBCHgYCAACAGLwEsQQFHDQELIAYoAjAhDAJAIAtFDQAgCSALQQEQnIGAgAALAkAgFUUNACAUIBVBARCcgYCAAAsCQCASRQ0AIBEgEkEBEJyBgIAAC0GAgICAeCELAkAgDw0AIAwhCQwLCyAOIA9BARCcgYCAACAMIQkMCgsgBi8BMCEXIAYvAS4hBwtBACAHIAdB//8DcUECRhshBwwICyABIAEtABhBf2oiDDoAGAJAIAxB/wFxRQ0AIAEgB0EBajYCFCAGQQE6ACggBiABNgIkIAZBLGogBkEkahCngICAAAJAIAYtACxFDQBBgICAgHghCwwEC0ECIRhBgICAgHghCwJAA0ACQAJAAkACQCAGLQAtQQFHDQAgBigCJCIHQQA2AgggByAHKAIUQQFqNgIUIAZBLGogB0EMaiAHEO6BgIAAIAYoAjAhDCAGKAIsIgpBAkYNCiAGKAI0IQgCQAJAAkACQAJAAkAgCkEBcUUNACAIQXhqDg0DBAQEBAQEBAQEBAQBBAsCQAJAIAhBeGoODQEFBQUFBQUFBQUFBQAFCyAMI4GAgIAAQZikwIAAakEUEJ2DgIAARQ0CDAQLIAwpAABC5dzZq8btm7jlAFINAwwHCyAMI4GAgIAAQZikwIAAakEUEJ2DgIAADQILIBhB//8DcUECRw0EIAcQj4CAgAAiDA0NIAZBLGogBxCHgYCAACAGLwEsRQ0CIAYoAjAhDAwNCyAMKQAAQuXc2avG7Zu45QBRDQQLIAcQjoCAgAAiDEUNBAwLCyAGLwEwIRcgBi8BLiEYDAMLAkAgC0GAgICAeEYNAEEAIBggGEH//wNxQQJGGyEHDA0LI4GAgIAAQZCkwIAAakEIEOaAgIAAIQlBgICAgHghCwwLCyOBgICAAEGYpMCAAGpBFBDpgICAACEMDAgLIAtBgICAgHhHDQICQAJAIAcQj4CAgAAiCQ0AIAZBLGogByAGIAYgBiAGEK6AgIAAIAYoAjAhCSAGKAIsIgtBgICAgHhHDQELQYCAgIB4IQsMCgsgBigCWCENIAYoAlQhDiAGKAJQIQ8gBigCTCEQIAYoAkghESAGKAJEIRIgBigCQCETIAYoAjwhFCAGKAI4IRUgBigCNCEWCyAGQSxqIAZBJGoQp4CAgAAgBi0ALA0FDAALCyOBgICAAEGQpMCAAGpBCBDpgICAACEMDAULIAZBGDYCLCAGQRhqIAkQ7IGAgAAgBkEsaiAGKAIYIAYoAhwQ8YGAgAAhCUGAgICAeCELDAsLIAZBGDYCLCAGQRBqIAkQ7IGAgAAgBkEsaiAGKAIQIAYoAhQQ8YGAgAAhCUGAgICAeCELDAoLQYCAgIB4IQtBACOBgICAACIHQfDywYAAaiAHQdjywYAAahDogICAACEJDAULIAYoAjAhDAsgC0GAgICAeEcNACAMIQlBgICAgHghCwwBCwJAIAtFDQAgCSALQQEQnIGAgAALAkAgFUUNACAUIBVBARCcgYCAAAsCQCASRQ0AIBEgEkEBEJyBgIAAC0GAgICAeCELAkAgD0UNACAOIA9BARCcgYCAAAsgDCEJCwsgASABLQAYQQFqOgAYIAEQpYCAgAAhDAJAAkAgC0GAgICAeEYNACAMRQ0DAkAgC0UNACAJIAtBARCcgYCAAAsCQCAVRQ0AIBQgFUEBEJyBgIAACwJAIBJFDQAgESASQQEQnIGAgAALIA8NASAMIQkMBQsgDEUNBAJAIAwoAgANACAMKAIIIgdFDQAgDCgCBCAHQQEQnIGAgAALIAxBFEEEEJyBgIAADAQLIA4gD0EBEJyBgIAAIAwhCQwDCyABIAEtABhBAWo6ABggARCmgICAACEMAkAgC0GAgICAeEYNACAMRQ0BAkAgC0UNACAJIAtBARCcgYCAAAsCQCAVRQ0AIBQgFUEBEJyBgIAACwJAIBJFDQAgESASQQEQnIGAgAALIA8NAiAMIQkMAwsgDEUNAgJAIAwoAgANACAMKAIIIgdFDQAgDCgCBCAHQQEQnIGAgAALIAxBFEEEEJyBgIAADAILIAAgFzsBMiAAIAc7ATAgACANNgIsIAAgDjYCKCAAIA82AiQgACAQNgIgIAAgETYCHCAAIBI2AhggACATNgIUIAAgFDYCECAAIBU2AgwgACAWNgIIDAILIA4gD0EBEJyBgIAAIAwhCQtBgICAgHghCyAJIAEQ6oCAgAAhCQsgACALNgIAIAAgCTYCBCAGQeAAaiSAgICAAAuaBwUGfwF+BH8BfgJ8I4CAgIAAQcAAayIEJICAgIAAAkACQAJAAkACQAJAAkACQAJAIAEoAhQiBSABKAIQIgZPDQAgAUEMaiIHKAIAIgggBWotAAAiCUEuRg0BIAlBxQBGDQIgCUHlAEYNAgsgAkUNAkIBIQoMBgsgASAFQQFqIgk2AhQCQAJAIAkgBk8NACAIIAlqIQsgBUECaiEMIAkgBmshCCAFQX9zIAZqIQ1BACEFA0ACQCALIAVqLQAAIg5BUGoiBkH/AXEiCUEKSQ0AAkAgBUUNAEEAIAVrIQggDkEgckHlAEcNByAEQSBqIAEgAiADIAgQloCAgAAMCAsgBEENNgI0IARBGGogBxDpgYCAACAEIARBNGogBCgCGCAEKAIcEPGBgIAANgIkIARBATYCIAwHCwJAIANCmLPmzJmz5swZWA0AIANCmbPmzJmz5swZUg0DIAlBBUsNAwsgASAMIAVqNgIUIANCCn4gBq1C/wGDfCEDIA0gBUEBaiIFRw0ACyAIDQQLIARBBTYCNCAEIAcQ6YGAgAAgBCAEQTRqIAQoAgAgBCgCBBDxgYCAADYCJCAEQQE2AiAMBAsgBEEgaiABIAIgA0EAIAVrEIKCgIAADAMLIARBIGogASACIANBABCWgICAACAEKAIgRQ0DIAAgBCgCJDYCCCAAQgM3AwAMBQtCACEKAkBCACADfSIPQgBZDQBCAiEKIA8hAwwECyADur1CgICAgICAgICAf4QhAwwDCyADuiEQAkACQAJAAkAgCCAIQR91IgVzIAVrIgVBtQJJDQADQCAQRAAAAAAAAAAAYQ0EIAhBf0oNAiAQRKDI64XzzOF/oyEQIAhBtAJqIgggCEEfdSIFcyAFayIFQbUCTw0ACwsjgoCAgAAgBUEDdGorAwAhESAIQX9KDQEgECARoyEQDAILIARBDjYCNCAEQRBqIAcQ6oGAgAAgBCAEQTRqIAQoAhAgBCgCFBDxgYCAADYCJCAEQQE2AiAMAgsgECARoiIQmUQAAAAAAADwf2INACAEQQ42AjQgBEEIaiAHEOqBgIAAIAQgBEE0aiAEKAIIIAQoAgwQ8YGAgAA2AiQgBEEBNgIgDAELIAQgECAQmiACGzkDKCAEQQA2AiALIAQoAiBFDQAgACAEKAIkNgIIIABCAzcDAAwCCyAEKQMoIQNCACEKCyAAIAM3AwggACAKNwMACyAEQcAAaiSAgICAAAuJBgIIfwJ8I4CAgIAAQTBrIgUkgICAgABBASEGIAEgASgCFCIHQQFqIgg2AhQgAUEMaiEJAkAgCCABKAIQIgpPDQBBASEGAkACQCAJKAIAIAhqLQAAQVVqDgMBAgACC0EAIQYLIAEgB0ECaiIINgIUCwJAAkACQCAIIApPDQAgASAIQQFqIgc2AhQCQCABKAIMIgsgCGotAABBUGpB/wFxIghBCkkNACAFQQ02AiQgBUEQaiAJEOqBgIAAIAVBJGogBSgCECAFKAIUEPGBgIAAIQcgAEEBNgIAIAAgBzYCBAwDCyAHIApPDQEDQCALIAdqLQAAQVBqQf8BcSIMQQpPDQIgASAHQQFqIgc2AhQCQAJAIAhBy5mz5gBMDQAgCEHMmbPmAEcNASAMQQdLDQELIAhBCmwgDGohCCAKIAdHDQEMAwsLIAAgASACIANQIAYQhIKAgAAMAgsgBUEFNgIkIAVBGGogCRDqgYCAACAFQSRqIAUoAhggBSgCHBDxgYCAACEHIABBATYCACAAIAc2AgQMAQsCQAJAIAYNACAEIAhrIgdBH3VBgICAgHhzIAcgCEEASiAHIARIcxshBwwBCyAEIAhqIgdBH3VBgICAgHhzIAcgCEEASCAHIARIcxshBwsgA7ohDQJAAkACQAJAAkACQCAHIAdBH3UiCHMgCGsiCEG1AkkNAANAIA1EAAAAAAAAAABhDQUgB0F/Sg0CIA1EoMjrhfPM4X+jIQ0gB0G0AmoiByAHQR91IghzIAhrIghBtQJPDQALCyOCgICAACAIQQN0aisDACEOIAdBf0oNASANIA6jIQ0MAwsgBUEONgIkIAVBCGogCRDqgYCAACAAIAVBJGogBSgCCCAFKAIMEPGBgIAANgIEDAELIA0gDqIiDZlEAAAAAAAA8H9iDQEgBUEONgIkIAUgCRDqgYCAACAAIAVBJGogBSgCACAFKAIEEPGBgIAANgIEC0EBIQcMAQsgACANIA2aIAIbOQMIQQAhBwsgACAHNgIACyAFQTBqJICAgIAAC7gDAQt/I4CAgIAAQSBrIgUkgICAgAAgASABKAIUIgZBAWoiBzYCFCABQQxqIQgCQAJAIAcgASgCECIJTw0AIAZBAmohCiAIKAIAIAdqIQsgBkF/cyAJaiEMQQAhBgJAA0ACQCALIAZqLQAAIg1BUGoiDkH/AXEiD0EKSQ0AAkAgBkUNACAEIAZrIQYCQCANQSByQeUARg0AIAAgASACIAMgBhCYgICAAAwGCyAAIAEgAiADIAYQmYCAgAAMBQsgBUENNgIUIAUgCBDsgYCAACAFQRRqIAUoAgAgBSgCBBDxgYCAACEGIABBATYCACAAIAY2AgQMBAsCQCADQpiz5syZs+bMGVgNACADQpmz5syZs+bMGVINAiAPQQVLDQILIAEgCiAGajYCFCADQgp+IA6tQv8Bg3whAyAMIAZBAWoiBkcNAAsgACABIAIgAyAHIARqIAlrEJiAgIAADAILIAAgASACIAMgBCAGaxCagICAAAwBCyAFQQU2AhQgBUEIaiAIEOyBgIAAIAVBFGogBSgCCCAFKAIMEPGBgIAAIQYgAEEBNgIAIAAgBjYCBAsgBUEgaiSAgICAAAvHAgQBfwF8AX8BfCOAgICAAEEgayIFJICAgIAAIAO6IQYCQAJAAkACQAJAAkAgBCAEQR91IgdzIAdrIgdBtQJJDQADQCAGRAAAAAAAAAAAYQ0FIARBf0oNAiAGRKDI64XzzOF/oyEGIARBtAJqIgQgBEEfdSIHcyAHayIHQbUCTw0ACwsjgoCAgAAgB0EDdGorAwAhCCAEQX9KDQEgBiAIoyEGDAMLIAVBDjYCFCAFQQhqIAFBDGoQ7YGAgAAgACAFQRRqIAUoAgggBSgCDBDxgYCAADYCBAwBCyAGIAiiIgaZRAAAAAAAAPB/Yg0BIAVBDjYCFCAFIAFBDGoQ7YGAgAAgACAFQRRqIAUoAgAgBSgCBBDxgYCAADYCBAtBASEEDAELIAAgBiAGmiACGzkDCEEAIQQLIAAgBDYCACAFQSBqJICAgIAAC/kDAQd/I4CAgIAAQSBrIgUkgICAgABBASEGIAEgASgCFCIHQQFqIgg2AhQgAUEMaiEJAkAgCCABKAIQIgpPDQBBASEGAkACQCAJKAIAIAhqLQAAQVVqDgMBAgACC0EAIQYLIAEgB0ECaiIINgIUCwJAAkACQCAIIApPDQAgASAIQQFqIgc2AhQCQCABKAIMIgsgCGotAABBUGpB/wFxIghBCkkNACAFQQ02AhQgBSAJEO2BgIAAIAVBFGogBSgCACAFKAIEEPGBgIAAIQcgAEEBNgIAIAAgBzYCBAwDCyAHIApPDQEDQCALIAdqLQAAQVBqQf8BcSIJQQpPDQIgASAHQQFqIgc2AhQCQAJAIAhBy5mz5gBMDQAgCEHMmbPmAEcNASAJQQdLDQELIAhBCmwgCWohCCAKIAdHDQEMAwsLIAAgASACIANQIAYQoYCAgAAMAgsgBUEFNgIUIAVBCGogCRDtgYCAACAFQRRqIAUoAgggBSgCDBDxgYCAACEHIABBATYCACAAIAc2AgQMAQsCQAJAIAYNACAEIAhrIgdBH3VBgICAgHhzIAcgCEEASiAHIARIcxshBwwBCyAEIAhqIgdBH3VBgICAgHhzIAcgCEEASCAHIARIcxshBwsgACABIAIgAyAHEJiAgIAACyAFQSBqJICAgIAAC38BBH8CQAJAIAEoAhQiBSABKAIQIgZPDQAgASgCDCEHAkADQCAHIAVqLQAAIghBUGpB/wFxQQlLDQEgASAFQQFqIgU2AhQgBiAFRw0ADAILCyAIQSByQeUARg0BCyAAIAEgAiADIAQQmICAgAAPCyAAIAEgAiADIAQQmYCAgAALpgQCBn8BfiOAgICAAEEwayIDJICAgIAAIAFBDGohBAJAAkACQCABKAIUIgUgASgCECIGTw0AIAEgBUEBaiIHNgIUAkAgASgCDCIIIAVqLQAAIgVBMEcNAAJAAkAgByAGTw0AIAggB2otAABBUGpB/wFxQQpJDQELIAAgASACQgAQlYCAgAAMBAsgA0ENNgIgIANBCGogBBDpgYCAACADQSBqIAMoAgggAygCDBDxgYCAACEHIABCAzcDACAAIAc2AggMAwsCQCAFQU9qQf8BcUEJSQ0AIANBDTYCICADQRBqIAQQ6oGAgAAgA0EgaiADKAIQIAMoAhQQ8YGAgAAhByAAQgM3AwAgACAHNgIIDAMLIAVBUGqtQv8BgyEJAkAgByAGTw0AA0AgCCAHai0AAEFQaiIFQf8BcSIEQQpPDQECQCAJQpmz5syZs+bMGVQNACAJQpmz5syZs+bMGVINBCAEQQVLDQQLIAEgB0EBaiIHNgIUIAlCCn4gBa1C/wGDfCEJIAYgB0cNAAsLIAAgASACIAkQlYCAgAAMAgsgA0EFNgIgIANBGGogBBDqgYCAACADQSBqIAMoAhggAygCHBDxgYCAACEHIABCAzcDACAAIAc2AggMAQsgA0EgaiABIAIgCRCDgoCAAAJAIAMoAiBBAUcNACAAIAMoAiQ2AgggAEIDNwMADAELIAAgAysDKDkDCCAAQgA3AwALIANBMGokgICAgAALtAcCBn8DfiOAgICAAEEwayIDJICAgIAAIAFBDGohBAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAEoAhQiBSABKAIQIgZPDQAgASAFQQFqIgc2AhQCQCABKAIMIgggBWotAAAiBUEwRw0AAkACQAJAAkAgByAGTw0AIAggB2otAAAiB0FQakH/AXFBCkkNAyAHQS5GDQEgB0HFAEYNAiAHQeUARg0CC0IAQoCAgICAgICAgH8gAhshCSACrSEKDA4LQgAhCiADQSBqIAEgAkIAQQAQl4CAgAAgAygCIA0ODAwLQgAhCiADQSBqIAEgAkIAQQAQmYCAgAAgAygCIEUNCyAAIAMoAiQ2AgggAEIDNwMADA4LIANBDTYCICADQQhqIAQQ7IGAgAAgA0EgaiADKAIIIAMoAgwQ8YGAgAAhByAAQgM3AwAgACAHNgIIDA0LAkAgBUFPakH/AXFBCUkNACADQQ02AiAgA0EQaiAEEO2BgIAAIANBIGogAygCECADKAIUEPGBgIAAIQcgAEIDNwMAIAAgBzYCCAwNCyAFQVBqrUL/AYMhCSAHIAZPDQEDQCAIIAdqLQAAQVBqIgVB/wFxIgRBCk8NAgJAAkAgCUKZs+bMmbPmzBlUDQAgCUKZs+bMmbPmzBlSDQEgBEEFSw0BCyABIAdBAWoiBzYCFCAJQgp+IAWtQv8Bg3whCSAGIAdHDQEMBAsLIANBIGogASACIAkQnYCAgAACQCADKAIgQQFHDQAgACADKAIkNgIIIABCAzcDAAwNCyAAIAMrAyg5AwggAEIANwMADAwLIANBBTYCICADQRhqIAQQ7YGAgAAgA0EgaiADKAIYIAMoAhwQ8YGAgAAhByAAQgM3AwAgACAHNgIIDAsLIAcgBk8NACAIIAdqLQAAIgdBLkYNASAHQcUARg0CIAdB5QBGDQILIAJFDQJCASEKDAQLIANBIGogASACIAlBABCXgICAACADKAIgDQQMAgsgA0EgaiABIAIgCUEAEJmAgIAAIAMoAiBFDQEgACADKAIkNgIIIABCAzcDAAwHC0IAIQoCQEIAIAl9IgtCAFkNAEICIQogCyEJDAILIAm6vUKAgICAgICAgIB/hCEJDAELIAMpAyghCUIAIQoLIAAgCTcDCCAAIAo3AwAMBAsgACADKAIkNgIIIABCAzcDAAwDCyADKQMoIQkLIAAgCTcDCCAAIAo3AwAMAQsgACADKAIkNgIIIABCAzcDAAsgA0EwaiSAgICAAAu9AQEFf0EAIQQCQAJAIAEoAhAiBSABKAIUIgZNDQAgBkEBaiEHIAUgBmshCCABKAIMIAZqIQVBACEEA0ACQCAFIARqLQAAIgZBUGpB/wFxQQpJDQAgBkEuRg0DAkAgBkHFAEYNACAGQeUARw0DCyAAIAEgAiADIAQQmYCAgAAPCyABIAcgBGo2AhQgCCAEQQFqIgRHDQALIAghBAsgACABIAIgAyAEEJiAgIAADwsgACABIAIgAyAEEJeAgIAAC4ACAQZ/I4CAgIAAQSBrIgEkgICAgAAgACAAKAIUIgJBAWoiAzYCFCAAQQxqIQQCQCADIAAoAhAiBU8NAAJAIAQoAgAgA2otAABBVWoOAwABAAELIAAgAkECaiIDNgIUCwJAAkAgAyAFTw0AIAAgA0EBaiICNgIUIAAoAgwiBiADai0AAEFQakH/AXFBCUsNAEEAIQMgAiAFTw0BA0AgBiACai0AAEFQakH/AXFBCUsNAiAAIAJBAWoiAjYCFCAFIAJHDQAMAgsLIAFBDTYCFCABQQhqIAQQ7YGAgAAgAUEUaiABKAIIIAEoAgwQ8YGAgAAhAwsgAUEgaiSAgICAACADC4MEAQd/I4CAgIAAQTBrIgEkgICAgAAgAEEMaiECAkACQCAAKAIUIgMgACgCECIETw0AIAAgA0EBaiIFNgIUAkACQCAAKAIMIgYgA2otAAAiA0EwRg0AIANBT2pB/wFxQQhLDQIgBSAETw0BA0AgBiAFai0AAEFQakH/AXFBCUsNAiAAIAVBAWoiBTYCFCAEIAVHDQALQQAhAwwDCyAFIARPDQAgBiAFai0AAEFQakH/AXFBCUsNACABQQ02AiQgAUEIaiACEOmBgIAAIAFBJGogASgCCCABKAIMEPGBgIAAIQMMAgtBACEDIAUgBE8NAQJAAkACQCAGIAVqLQAAIgdB5QBGDQAgB0HFAEYNACAHQS5HDQQgACAFQQFqIgc2AhQgByAETw0CIAYgB2otAABBUGpB/wFxQQlLDQIgBUECaiEFA0AgBCAFRg0CIAYgBWohAiAFQQFqIgchBSACLQAAIgJBUGpB/wFxQQpJDQALIAAgB0F/ajYCFCACQSByQeUARw0ECyAAEKCAgIAAIQMMAwsgACAENgIUDAILIAFBDTYCJCABQRBqIAIQ6YGAgAAgAUEkaiABKAIQIAEoAhQQ8YGAgAAhAwwBCyABQQ02AiQgAUEYaiACEOqBgIAAIAFBJGogASgCGCABKAIcEPGBgIAAIQMLIAFBMGokgICAgAAgAwuAAgEGfyOAgICAAEEgayIBJICAgIAAIAAgACgCFCICQQFqIgM2AhQgAEEMaiEEAkAgAyAAKAIQIgVPDQACQCAEKAIAIANqLQAAQVVqDgMAAQABCyAAIAJBAmoiAzYCFAsCQAJAIAMgBU8NACAAIANBAWoiAjYCFCAAKAIMIgYgA2otAABBUGpB/wFxQQlLDQBBACEDIAIgBU8NAQNAIAYgAmotAABBUGpB/wFxQQlLDQIgACACQQFqIgI2AhQgBSACRw0ADAILCyABQQ02AhQgAUEIaiAEEOqBgIAAIAFBFGogASgCCCABKAIMEPGBgIAAIQMLIAFBIGokgICAgAAgAwvUAQECfyOAgICAAEEgayIFJICAgIAAAkACQAJAAkAgAw0AIAQNAQsgASgCFCIDIAEoAhAiBE8NASABKAIMIQYDQCAGIANqLQAAQVBqQf8BcUEKTw0CIAEgA0EBaiIDNgIUIAQgA0cNAAwCCwsgBUEONgIUIAVBCGogAUEMahDtgYCAACAAIAVBFGogBSgCCCAFKAIMEPGBgIAANgIEQQEhAwwBCyAARAAAAAAAAAAARAAAAAAAAACAIAIbOQMIQQAhAwsgACADNgIAIAVBIGokgICAgAALqAoBB38jgICAgABBgAFrIgMkgICAgAAgAEEMaiEEAkACQAJAAkACQAJAAkAgACgCFCIFIAAoAhAiBk8NAAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAEKAIAIgcgBWotAAAiCEGlf2oOIQQLCwsLCwsLCwsLAwsLCwsLCwsBCwsLCwsCCwsLCwsLBQALIAhBXmoODAkKCgoKCgoKCgoKCAoLIAAgBUEBaiIINgIUIAggBk8NDCAAIAVBAmoiCTYCFAJAIAcgCGotAABB9QBHDQAgBiAJRg0NIAAgBUEDaiIINgIUIAcgCWotAABB7ABHDQAgCCAGRg0NIAAgBUEEajYCFCAHIAhqLQAAQewARg0FCyADQQk2AnAgA0EYaiAEEO2BgIAAIANB8ABqIAMoAhggAygCHBDxgYCAACEFDBALIAAgBUEBaiIINgIUIAggBk8NDCAAIAVBAmoiCTYCFAJAIAcgCGotAABB8gBHDQAgBiAJRg0NIAAgBUEDaiIINgIUIAcgCWotAABB9QBHDQAgCCAGRg0NIAAgBUEEajYCFCAHIAhqLQAAQeUARg0FCyADQQk2AnAgA0EoaiAEEO2BgIAAIANB8ABqIAMoAiggAygCLBDxgYCAACEFDA8LIAAgBUEBaiIINgIUIAggBk8NDCAAIAVBAmoiCTYCFAJAIAcgCGotAABB4QBHDQAgBiAJRg0NIAAgBUEDaiIINgIUIAcgCWotAABB7ABHDQAgCCAGRg0NIAAgBUEEaiIJNgIUIAcgCGotAABB8wBHDQAgCSAGRg0NIAAgBUEFajYCFCAHIAlqLQAAQeUARg0FCyADQQk2AnAgA0E4aiAEEO2BgIAAIANB8ABqIAMoAjggAygCPBDxgYCAACEFDA4LIANBCjoAcCADQfAAaiABIAIQ+oGAgAAgABDqgICAACEFDA0LIANBCzoAcCADQfAAaiABIAIQ+oGAgAAgABDqgICAACEFDAwLIANBBzoAcCADQfAAaiABIAIQ+oGAgAAgABDqgICAACEFDAsLIANBgAI7AXAgA0HwAGogASACEPqBgIAAIAAQ6oCAgAAhBQwKCyADQQA7AXAgA0HwAGogASACEPqBgIAAIAAQ6oCAgAAhBQwJCyAAIAVBAWo2AhQgA0HAAGogAEEAEJyAgIAAIAMpA0BCA1ENByADQcAAaiABIAIQ/oGAgAAgABDqgICAACEFDAgLIABBADYCCCAAIAVBAWo2AhQgA0HkAGogBCAAEO6BgIAAIAMoAmghBSADKAJkQQJGDQcgAyADKAJsNgJ4IAMgBTYCdCADQQU6AHAgA0HwAGogASACEPqBgIAAIAAQ6oCAgAAhBQwHCyAIQVBqQf8BcUEKSQ0BCyADQQo2AnAgA0EIaiAEEOyBgIAAIANB8ABqIAMoAgggAygCDBDxgYCAACAAEOqAgIAAIQUMBQsgA0HQAGogAEEBEJyAgIAAAkAgAykDUEIDUg0AIAMoAlghBQwFCyADQdAAaiABIAIQ/oGAgAAgABDqgICAACEFDAQLIANBBTYCcCADQRBqIAQQ7YGAgAAgA0HwAGogAygCECADKAIUEPGBgIAAIQUMAwsgA0EFNgJwIANBIGogBBDtgYCAACADQfAAaiADKAIgIAMoAiQQ8YGAgAAhBQwCCyADQQU2AnAgA0EwaiAEEO2BgIAAIANB8ABqIAMoAjAgAygCNBDxgYCAACEFDAELIAMoAkghBQsgA0GAAWokgICAgAAgBQuoCgEHfyOAgICAAEGAAWsiAySAgICAACAAQQxqIQQCQAJAAkACQAJAAkACQCAAKAIUIgUgACgCECIGTw0AAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAQoAgAiByAFai0AACIIQaV/ag4hBAsLCwsLCwsLCwsDCwsLCwsLCwELCwsLCwILCwsLCwsFAAsgCEFeag4MCQoKCgoKCgoKCgoICgsgACAFQQFqIgg2AhQgCCAGTw0MIAAgBUECaiIJNgIUAkAgByAIai0AAEH1AEcNACAGIAlGDQ0gACAFQQNqIgg2AhQgByAJai0AAEHsAEcNACAIIAZGDQ0gACAFQQRqNgIUIAcgCGotAABB7ABGDQULIANBCTYCcCADQRhqIAQQ6oGAgAAgA0HwAGogAygCGCADKAIcEPGBgIAAIQUMEAsgACAFQQFqIgg2AhQgCCAGTw0MIAAgBUECaiIJNgIUAkAgByAIai0AAEHyAEcNACAGIAlGDQ0gACAFQQNqIgg2AhQgByAJai0AAEH1AEcNACAIIAZGDQ0gACAFQQRqNgIUIAcgCGotAABB5QBGDQULIANBCTYCcCADQShqIAQQ6oGAgAAgA0HwAGogAygCKCADKAIsEPGBgIAAIQUMDwsgACAFQQFqIgg2AhQgCCAGTw0MIAAgBUECaiIJNgIUAkAgByAIai0AAEHhAEcNACAGIAlGDQ0gACAFQQNqIgg2AhQgByAJai0AAEHsAEcNACAIIAZGDQ0gACAFQQRqIgk2AhQgByAIai0AAEHzAEcNACAJIAZGDQ0gACAFQQVqNgIUIAcgCWotAABB5QBGDQULIANBCTYCcCADQThqIAQQ6oGAgAAgA0HwAGogAygCOCADKAI8EPGBgIAAIQUMDgsgA0EKOgBwIANB8ABqIAEgAhD6gYCAACAAEOuAgIAAIQUMDQsgA0ELOgBwIANB8ABqIAEgAhD6gYCAACAAEOuAgIAAIQUMDAsgA0EHOgBwIANB8ABqIAEgAhD6gYCAACAAEOuAgIAAIQUMCwsgA0GAAjsBcCADQfAAaiABIAIQ+oGAgAAgABDrgICAACEFDAoLIANBADsBcCADQfAAaiABIAIQ+oGAgAAgABDrgICAACEFDAkLIAAgBUEBajYCFCADQcAAaiAAQQAQm4CAgAAgAykDQEIDUQ0HIANBwABqIAEgAhD+gYCAACAAEOuAgIAAIQUMCAsgAEEANgIIIAAgBUEBajYCFCADQeQAaiAEIAAQ64GAgAAgAygCaCEFIAMoAmRBAkYNByADIAMoAmw2AnggAyAFNgJ0IANBBToAcCADQfAAaiABIAIQ+oGAgAAgABDrgICAACEFDAcLIAhBUGpB/wFxQQpJDQELIANBCjYCcCADQQhqIAQQ6YGAgAAgA0HwAGogAygCCCADKAIMEPGBgIAAIAAQ64CAgAAhBQwFCyADQdAAaiAAQQEQm4CAgAACQCADKQNQQgNSDQAgAygCWCEFDAULIANB0ABqIAEgAhD+gYCAACAAEOuAgIAAIQUMBAsgA0EFNgJwIANBEGogBBDqgYCAACADQfAAaiADKAIQIAMoAhQQ8YGAgAAhBQwDCyADQQU2AnAgA0EgaiAEEOqBgIAAIANB8ABqIAMoAiAgAygCJBDxgYCAACEFDAILIANBBTYCcCADQTBqIAQQ6oGAgAAgA0HwAGogAygCMCADKAI0EPGBgIAAIQUMAQsgAygCSCEFCyADQYABaiSAgICAACAFC44CAQV/I4CAgIAAQSBrIgEkgICAgAACQAJAAkACQCAAKAIUIgIgACgCECIDTw0AIABBDGohBCAAKAIMIQUDQAJAIAUgAmotAABBd2oOMgAABAQABAQEBAQEBAQEBAQEBAQEBAQEAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQDBAsgACACQQFqIgI2AhQgAyACRw0ACwsgAUEDNgIUIAFBCGogAEEMahDpgYCAACABQRRqIAEoAgggASgCDBDxgYCAACECDAILIAAgAkEBajYCFEEAIQIMAQsgAUEGNgIUIAEgBBDpgYCAACABQRRqIAEoAgAgASgCBBDxgYCAACECCyABQSBqJICAgIAAIAILwAIBBn8jgICAgABBMGsiASSAgICAAAJAAkACQAJAAkACQCAAKAIUIgIgACgCECIDTw0AIABBDGohBCAAKAIMIQUDQAJAIAUgAmotAAAiBkF3ag4kAAAEBAAEBAQEBAQEBAQEBAQEBAQEBAQABAQEBAQEBAQEBAQGAwsgACACQQFqIgI2AhQgAyACRw0ACwsgAUEDNgIkIAFBEGogAEEMahDsgYCAACABQSRqIAEoAhAgASgCFBDxgYCAACECDAQLIAZB/QBGDQELIAFBFjYCJCABQQhqIAQQ7IGAgAAgAUEkaiABKAIIIAEoAgwQ8YGAgAAhAgwCCyAAIAJBAWo2AhRBACECDAELIAFBFTYCJCABQRhqIAQQ7IGAgAAgAUEkaiABKAIYIAEoAhwQ8YGAgAAhAgsgAUEwaiSAgICAACACC8UDAQd/I4CAgIAAQTBrIgEkgICAgAACQAJAAkACQAJAAkAgACgCFCICIAAoAhAiA08NACAAQQxqIQQgACgCDCEFA0ACQCAFIAJqLQAAIgZBd2oOJAAABAQABAQEBAQEBAQEBAQEBAQEBAQEAAQEBAQEBAQEBAQEBgMLIAAgAkEBaiICNgIUIAMgAkcNAAsLIAFBAjYCJCABQQhqIABBDGoQ7IGAgAAgAUEkaiABKAIIIAEoAgwQ8YGAgAAhAgwECyAGQd0ARg0BCyABQRY2AiQgASAEEOyBgIAAIAFBJGogASgCACABKAIEEPGBgIAAIQIMAgsgACACQQFqNgIUQQAhAgwBCyAAIAJBAWoiAjYCFAJAIAIgA08NAAJAA0AgBSACai0AACIHQXdqIgZBF0sNAUEBIAZ0QZOAgARxRQ0BIAAgAkEBaiICNgIUIAMgAkcNAAwCCwsgB0HdAEcNACABQRU2AiQgAUEYaiAEEOyBgIAAIAFBJGogASgCGCABKAIcEPGBgIAAIQIMAQsgAUEWNgIkIAFBEGogBBDsgYCAACABQSRqIAEoAhAgASgCFBDxgYCAACECCyABQTBqJICAgIAAIAILgAUBCH8jgICAgABBwABrIgIkgICAgAACQAJAAkAgASgCACIDKAIUIgQgAygCECIFTw0AIANBDGohBiADKAIMIQcDQCAHIARqLQAAIghBd2oiCUEXSw0CQQEgCXRBk4CABHFFDQIgAyAEQQFqIgQ2AhQgBSAERw0ACwsgAkEDNgI0IAJBKGogA0EMahDsgYCAACAAIAJBNGogAigCKCACKAIsEPGBgIAANgIEQQEhCQwBCwJAAkACQAJAIAhB/QBGDQAgAS0ABA0CIAhBLEYNASACQQg2AjQgAkEgaiAGEOyBgIAAIAAgAkE0aiACKAIgIAIoAiQQ8YGAgAA2AgRBASEJDAQLQQAhCSAAQQA6AAEMAwtBASEJIAMgBEEBaiIENgIUAkAgBCAFTw0AA0AgByAEai0AACIBQXdqIghBGUsNAwJAQQEgCHRBk4CABHENACAIQRlHDQQgAEEBOgABQQAhCQwFCyADIARBAWoiBDYCFCAFIARHDQALCyACQQU2AjQgAkEQaiAGEOyBgIAAIAAgAkE0aiACKAIQIAIoAhQQ8YGAgAA2AgQMAgtBACEJIAFBADoABAJAIAhBIkYNACACQRE2AjQgAiAGEOyBgIAAIAAgAkE0aiACKAIAIAIoAgQQ8YGAgAA2AgRBASEJDAILIABBAToAAQwBCwJAIAFB/QBGDQAgAkERNgI0IAJBCGogBhDsgYCAACAAIAJBNGogAigCCCACKAIMEPGBgIAANgIEQQEhCQwBCyACQRU2AjQgAkEYaiAGEOyBgIAAIAAgAkE0aiACKAIYIAIoAhwQ8YGAgAA2AgRBASEJCyAAIAk6AAAgAkHAAGokgICAgAALgwQBCH8jgICAgABBMGsiAiSAgICAAAJAAkACQCABKAIAIgMoAhQiBCADKAIQIgVPDQAgA0EMaiEGIAMoAgwhBwNAIAcgBGotAAAiCEF3aiIJQRdLDQJBASAJdEGTgIAEcUUNAiADIARBAWoiBDYCFCAFIARHDQALCyACQQI2AiQgAkEYaiADQQxqEOyBgIAAIAAgAkEkaiACKAIYIAIoAhwQ8YGAgAA2AgRBASEJDAELAkACQAJAIAhB3QBGDQAgAS0ABA0BIAhBLEYNAiACQQc2AiQgAkEQaiAGEOyBgIAAIAAgAkEkaiACKAIQIAIoAhQQ8YGAgAA2AgRBASEJDAMLQQAhCSAAQQA6AAEMAgsgAEEBOgABQQAhCSABQQA6AAQMAQtBASEJIAMgBEEBaiIENgIUAkACQCAEIAVPDQADQCAHIARqLQAAIgFBd2oiCEEXSw0CQQEgCHRBk4CABHFFDQIgAyAEQQFqIgQ2AhQgBSAERw0ACwsgAkEFNgIkIAIgBhDsgYCAACAAIAJBJGogAigCACACKAIEEPGBgIAANgIEDAELAkAgAUHdAEcNACACQRU2AiQgAkEIaiAGEOyBgIAAIAAgAkEkaiACKAIIIAIoAgwQ8YGAgAA2AgRBASEJDAELIABBAToAAUEAIQkLIAAgCToAACACQTBqJICAgIAAC4MEAQh/I4CAgIAAQTBrIgIkgICAgAACQAJAAkAgASgCACIDKAIUIgQgAygCECIFTw0AIANBDGohBiADKAIMIQcDQCAHIARqLQAAIghBd2oiCUEXSw0CQQEgCXRBk4CABHFFDQIgAyAEQQFqIgQ2AhQgBSAERw0ACwsgAkECNgIkIAJBGGogA0EMahDpgYCAACAAIAJBJGogAigCGCACKAIcEPGBgIAANgIEQQEhCQwBCwJAAkACQCAIQd0ARg0AIAEtAAQNASAIQSxGDQIgAkEHNgIkIAJBEGogBhDpgYCAACAAIAJBJGogAigCECACKAIUEPGBgIAANgIEQQEhCQwDC0EAIQkgAEEAOgABDAILIABBAToAAUEAIQkgAUEAOgAEDAELQQEhCSADIARBAWoiBDYCFAJAAkAgBCAFTw0AA0AgByAEai0AACIBQXdqIghBF0sNAkEBIAh0QZOAgARxRQ0CIAMgBEEBaiIENgIUIAUgBEcNAAsLIAJBBTYCJCACIAYQ6YGAgAAgACACQSRqIAIoAgAgAigCBBDxgYCAADYCBAwBCwJAIAFB3QBHDQAgAkEVNgIkIAJBCGogBhDpgYCAACAAIAJBJGogAigCCCACKAIMEPGBgIAANgIEQQEhCQwBCyAAQQE6AAFBACEJCyAAIAk6AAAgAkEwaiSAgICAAAukBQIFfwJ+I4CAgIAAQTBrIgIkgICAgAACQAJAAkACQAJAAkACQAJAIAEoAhQiAyABKAIQIgRPDQAgASgCDCEFA0ACQCAFIANqLQAAIgZBd2oOJQAABAQABAQEBAQEBAQEBAQEBAQEBAQEAAQEBAQEBAQEBAQEBAMECyABIANBAWoiAzYCFCAEIANHDQALCyACQQU2AhggAiABQQxqEOmBgIAAIAJBGGogAigCACACKAIEEPGBgIAAIQMgAEEBNgIAIAAgAzYCBAwGCyABIANBAWo2AhQgAkEIaiABQQAQm4CAgAAgAikDCCIHQgNRDQQgAikDECEIAkACQCAHpw4DAAQBAAsgAkEDOgAYIAIgCDcDICACQRhqIAJBL2ojgYCAgABBuPnBgABqEPqBgIAAIQMMAgsgCEJ/VQ0CIAJBAjoAGCACIAg3AyAgAkEYaiACQS9qI4GAgIAAQcDywYAAahD9gYCAACEDDAELAkAgBkFQakH/AXFBCkkNACABIAJBL2ojgYCAgABBwPLBgABqEKOAgIAAIAEQ64CAgAAhAyAAQQE2AgAgACADNgIEDAULIAJBCGogAUEBEJuAgIAAAkAgAikDCCIHQgNSDQAgACACKAIQNgIEIABBATYCAAwFCyACKQMQIQgCQAJAIAenDgMAAwEACyACQQM6ABggAiAINwMgIAJBGGogAkEvaiOBgICAAEG4+cGAAGoQ+oGAgAAhAwwBCyAIQn9VDQEgAkECOgAYIAIgCDcDICACQRhqIAJBL2ojgYCAgABBwPLBgABqEP2BgIAAIQMLIAAgAyABEOuAgIAANgIEQQEhAwwBCyAAIAg3AwhBACEDCyAAIAM2AgAMAQsgACACKAIQNgIEIABBATYCAAsgAkEwaiSAgICAAAueBgIFfwJ+I4CAgIAAQTBrIgIkgICAgAACQAJAAkACQAJAAkACQAJAIAEoAhQiAyABKAIQIgRPDQAgASgCDCEFA0ACQCAFIANqLQAAIgZBd2oOJQAABAQABAQEBAQEBAQEBAQEBAQEBAQEAAQEBAQEBAQEBAQEBAMECyABIANBAWoiAzYCFCAEIANHDQALCyACQQU2AhggAiABQQxqEOyBgIAAIAJBGGogAigCACACKAIEEPGBgIAAIQMgAEEBOwEAIAAgAzYCBAwGCyABIANBAWo2AhQgAkEIaiABQQAQnICAgAAgAikDCCIHQgNRDQQgAikDECEIAkACQAJAIAenDgMAAQIACyACQQM6ABggAiAINwMgIAJBGGogAkEvaiOBgICAAEGo+cGAAGoQ+oGAgAAhAwwDCyAIQoCABFQNAyACQQE6ABggAiAINwMgIAJBGGogAkEvaiOBgICAAEGw8sGAAGoQ/YGAgAAhAwwCCyAIQoCABFQNAiACQQI6ABggAiAINwMgIAJBGGogAkEvaiOBgICAAEGw8sGAAGoQ/YGAgAAhAwwBCwJAIAZBUGpB/wFxQQpJDQAgASACQS9qI4GAgIAAQbDywYAAahCigICAACABEOqAgIAAIQMgAEEBOwEAIAAgAzYCBAwFCyACQQhqIAFBARCcgICAAAJAIAIpAwgiB0IDUg0AIAAgAigCEDYCBCAAQQE7AQAMBQsgAikDECEIAkACQAJAIAenDgMAAQIACyACQQM6ABggAiAINwMgIAJBGGogAkEvaiOBgICAAEGo+cGAAGoQ+oGAgAAhAwwCCyAIQoCABFQNAiACQQE6ABggAiAINwMgIAJBGGogAkEvaiOBgICAAEGw8sGAAGoQ/YGAgAAhAwwBCyAIQoCABFQNASACQQI6ABggAiAINwMgIAJBGGogAkEvaiOBgICAAEGw8sGAAGoQ/YGAgAAhAwsgACADIAEQ6oCAgAA2AgRBASEDDAELIAAgCD0BAkEAIQMLIAAgAzsBAAwBCyAAIAIoAhA2AgQgAEEBOwEACyACQTBqJICAgIAAC7gDAQZ/I4CAgIAAQSBrIgIkgICAgAACQAJAAkACQAJAIAEoAhQiAyABKAIQIgRPDQAgAUEMaiEFIAEoAgwhBgNAIAYgA2otAABBd2oiB0EZSw0CAkBBASAHdEGTgIAEcQ0AIAdBGUcNA0EAIQcgAUEANgIIIAEgA0EBajYCFCACQRRqIAUgARDugYCAACACKAIYIQEgAigCFEECRw0EIABBgICAgHg2AgAgACABNgIEDAULIAEgA0EBaiIDNgIUIAQgA0cNAAsLIAJBBTYCFCACQQhqIAFBDGoQ7IGAgAAgAkEUaiACKAIIIAIoAgwQ8YGAgAAhAyAAQYCAgIB4NgIAIAAgAzYCBAwCCyABIAJBFGojgYCAgABB+PLBgABqEKKAgIAAIAEQ6oCAgAAhAyAAQYCAgIB4NgIAIAAgAzYCBAwBCyACKAIcIgNBAEgNAQJAAkAgAw0AQQEhBgwBCxCfgYCAAEEBIQcgA0EBEJuBgIAAIgZFDQILAkAgA0UNACAGIAEgA/wKAAALIAAgAzYCCCAAIAY2AgQgACADNgIACyACQSBqJICAgIAADwsgByADEK6DgIAAAAu4AwEGfyOAgICAAEEgayICJICAgIAAAkACQAJAAkACQCABKAIUIgMgASgCECIETw0AIAFBDGohBSABKAIMIQYDQCAGIANqLQAAQXdqIgdBGUsNAgJAQQEgB3RBk4CABHENACAHQRlHDQNBACEHIAFBADYCCCABIANBAWo2AhQgAkEUaiAFIAEQ64GAgAAgAigCGCEBIAIoAhRBAkcNBCAAQYCAgIB4NgIAIAAgATYCBAwFCyABIANBAWoiAzYCFCAEIANHDQALCyACQQU2AhQgAkEIaiABQQxqEOmBgIAAIAJBFGogAigCCCACKAIMEPGBgIAAIQMgAEGAgICAeDYCACAAIAM2AgQMAgsgASACQRRqI4GAgIAAQfjywYAAahCjgICAACABEOuAgIAAIQMgAEGAgICAeDYCACAAIAM2AgQMAQsgAigCHCIDQQBIDQECQAJAIAMNAEEBIQYMAQsQn4GAgABBASEHIANBARCbgYCAACIGRQ0CCwJAIANFDQAgBiABIAP8CgAACyAAIAM2AgggACAGNgIEIAAgAzYCAAsgAkEgaiSAgICAAA8LIAcgAxCug4CAAAALhhYBEH8jgICAgABBwABrIgYkgICAgAACQAJAAkAgASgCFCIHIAEoAhAiCE8NACABQQxqIQkgASgCDCEKA0AgCiAHai0AACILQXdqIgxBF0sNAkEBIAx0QZOAgARxRQ0CIAEgB0EBaiIHNgIUIAggB0cNAAsLIAZBBTYCMCAGQQhqIAFBDGoQ7IGAgAAgBkEwaiAGKAIIIAYoAgwQ8YGAgAAhDEGAgICAeCEHDAELAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgC0HbAEYNACALQfsARg0BQYCAgIB4IQcgASAGQT9qI4GAgIAAQajzwYAAahCigICAACABEOqAgIAAIQwMEwsgASABLQAYQX9qIgw6ABggDEH/AXFFDQEgASAHQQFqNgIUIAZBAToALCAGIAE2AiggBkEwaiAGQShqEKiAgIAAAkAgBi0AMEEBRw0AIAYoAjQhDEGAgICAeCEHDA8LIAYtADFBAUcNBCAGQTBqIAYoAigQrICAgABBgICAgHghByAGKAI0IQwCQCAGKAIwIg1BgICAgHhHDQAMDwsgBigCOCEOIAZBMGogBkEoahCogICAAAJAIAYtADBBAUcNACAGKAI0IQkMDgsgBi0AMUEBRw0DIAZBMGogBigCKBCsgICAACAGKAI0IQkgBigCMCILQYCAgIB4Rg0NIAYoAjghDyAGQTBqIAZBKGoQqICAgAACQCAGLQAwQQFHDQAgBigCNCEQDA0LIAYtADFBAUcNAiAGQTBqIAYoAigQrICAgAAgBigCNCEQIAYoAjAiCEGAgICAeEYNDCAGKAI4IREgBkEwaiAGQShqEKiAgIAAAkACQCAGLQAwQQFHDQAgBigCNCESDAELAkAgBi0AMUEBRw0AIAZBMGogBigCKBCsgICAACAGKAI0IRIgBigCMCIKQYCAgIB4Rg0BIAYoAjghEyANIQcMEAtBAyOBgICAACIHQdDywYAAaiAHQdjywYAAahDogICAACESCwJAIAhFDQAgECAIQQEQnIGAgAALIBIhEAwMCyABIAEtABhBf2oiDDoAGAJAIAxB/wFxRQ0AQQEhFCABIAdBAWo2AhQgBkEBOgAkIAYgATYCICAGQTBqIAZBIGoQp4CAgAACQCAGLQAwRQ0AQYCAgIB4IQ1BgICAgHghC0GAgICAeCEIQYCAgIB4IQoMBwtBgICAgHghCkGAgICAeCEIQYCAgIB4IQtBgICAgHghDQNAAkACQAJAAkACQAJAIAYtADFBAUcNACAGKAIgIgdBADYCCCAHIAcoAhRBAWo2AhQgBkEwaiAHQQxqIAcQ7oGAgAAgBigCNCEMIAYoAjBBAkYNDCAGQShqIAwgBigCOBC2gICAAAJAIAYtAChBAUcNACAGKAIsIQwMDQsCQAJAAkACQAJAIAYtACkOBAECAwQACyAHEI6AgIAAIgwNEAwJCyANQYCAgIB4Rg0HQQEhFCOBgICAAEGJo8CAAGpBFBDpgICAACEMDBELIAtBgICAgHhGDQVBASEUI4GAgIAAQZ2jwIAAakECEOmAgIAAIQwMEAsgCEGAgICAeEYNA0EBIRQjgYCAgABBn6PAgABqQQoQ6YCAgAAhDAwPCyAKQYCAgIB4Rg0BQQEhDiOBgICAAEGpo8CAAGpBCBDpgICAACEMQQEhB0EBIRQMEAsCQAJAAkAgDUGAgICAeEYNAAJAAkACQCALQYCAgIB4RiIHDQAgCEGAgICAeEYiFA0BIApBgICAgHhGDQIgFSEMIA0hBwwXC0EBIRQjgYCAgABBnaPAgABqQQIQ5oCAgAAhDAwECyOBgICAAEGfo8CAAGpBChDmgICAACEMDAILI4GAgIAAQamjwIAAakEIEOaAgIAAIQwgCEUNASAQIAhBARCcgYCAAAwBC0EBIRQjgYCAgABBiaPAgABqQRQQ5oCAgAAhDEGAgICAeCENDA8LIAtFDQAgCSALQQEQnIGAgAALQQAhDgJAIA0NAEEAIQ0MDwsgFSANQQEQnIGAgAAMDgsCQAJAIAcQj4CAgAAiDA0AIAZBMGogBxCsgICAACAGKAI0IRIgBigCMCIKQYCAgIB4Rw0BIBIhDAtBASEOQQEhB0EBIRQMEAsgBigCOCETDAMLAkACQCAHEI+AgIAAIgwNACAGQTBqIAcQrICAgAAgBigCNCEMIAYoAjAiCEGAgICAeEcNAQtBASEUQYCAgIB4IQgMDAsgBigCOCERIAwhEAwCCwJAAkAgBxCPgICAACIMDQAgBkEwaiAHEKyAgIAAIAYoAjQhDCAGKAIwIgtBgICAgHhHDQELQQEhFEGAgICAeCELDAsLIAYoAjghDyAMIQkMAQsCQAJAIAcQj4CAgAAiDA0AIAZBMGogBxCsgICAACAGKAI0IQwgBigCMCINQYCAgIB4Rw0BC0EBIRRBgICAgHghDQwKCyAGKAI4IQ4gDCEVCyAGQTBqIAZBIGoQp4CAgAAgBi0AMA0HDAALCyAGQRg2AjAgBkEYaiAJEOyBgIAAIAZBMGogBigCGCAGKAIcEPGBgIAAIQxBgICAgHghBwwRCyAGQRg2AjAgBkEQaiAJEOyBgIAAIAZBMGogBigCECAGKAIUEPGBgIAAIQxBgICAgHghBwwQC0ECI4GAgIAAIgdB0PLBgABqIAdB2PLBgABqEOiAgIAAIRAMCQtBASOBgICAACIHQdDywYAAaiAHQdjywYAAahDogICAACEJDAkLQYCAgIB4IQdBACOBgICAACIMQdDywYAAaiAMQdjywYAAahDogICAACEMDAkLQQEhFAwBCyAGKAI0IQwLQQEhB0EBIQ4LIApBgICAgHhGDQELIApFDQAgEiAKQQEQnIGAgAALAkAgCEH/////B3FFDQAgFEUNACAQIAhBARCcgYCAAAsCQCALQf////8HcUEARyAHcUUNACAJIAtBARCcgYCAAAtBgICAgHghBwJAIA1B/////wdxQQBHIA5xRQ0AIBUgDUEBEJyBgIAACwsgASABLQAYQQFqOgAYIAEQpYCAgAAhDQJAAkAgB0GAgICAeEYNACANRQ0FAkAgB0UNACAMIAdBARCcgYCAAAsCQCALRQ0AIAkgC0EBEJyBgIAACwJAIAhFDQAgECAIQQEQnIGAgAALIAoNASANIQwMBwsgDUUNBgJAIA0oAgANACANKAIIIgdFDQAgDSgCBCAHQQEQnIGAgAALIA1BFEEEEJyBgIAADAYLIBIgCkEBEJyBgIAAIA0hDAwFCwJAIAtFDQAgCSALQQEQnIGAgAALIBAhCQtBgICAgHghBwJAIA1FDQAgDCANQQEQnIGAgAALIAkhDAsgASABLQAYQQFqOgAYIAEQpoCAgAAhDQJAIAdBgICAgHhGDQAgDUUNAQJAIAdFDQAgDCAHQQEQnIGAgAALAkAgC0UNACAJIAtBARCcgYCAAAsCQCAIRQ0AIBAgCEEBEJyBgIAACyAKDQIgDSEMDAMLIA1FDQICQCANKAIADQAgDSgCCCIHRQ0AIA0oAgQgB0EBEJyBgIAACyANQRRBBBCcgYCAAAwCCyAAIBM2AiwgACASNgIoIAAgCjYCJCAAIBE2AiAgACAQNgIcIAAgCDYCGCAAIA82AhQgACAJNgIQIAAgCzYCDCAAIA42AggMAgsgEiAKQQEQnIGAgAAgDSEMC0GAgICAeCEHIAwgARDqgICAACEMCyAAIAc2AgAgACAMNgIEIAZBwABqJICAgIAAC1YBAX8Qn4GAgAACQCACQQEQm4GAgAAiA0UNAAJAIAJFDQAgAyABIAL8CgAACyAAIAI2AgwgACADNgIIIAAgAjYCBCAAQQM6AAAPC0EBIAIQroOAgAAAC4oDAQJ/I4CAgIAAQSBrIgIkgICAgAAQn4GAgAACQEGAAUEBEJuBgIAAIgNFDQAgAiADNgIMIAJBgAE2AgggAiACQQhqNgIUIANB+wA6AAAgAkEBNgIQIAJBAToAHCOBgICAACEDIAIgAkEUajYCGAJAAkAgAkEYaiADQd6pwIAAakECIAFBwABqEPuAgIAAIgMNACACQRhqI4GAgIAAQeCpwIAAakEGIAFBzABqEPuAgIAAIgMNACACQRhqI4GAgIAAQeapwIAAakERIAFBGGoQ+YCAgAAiAw0AIAJBGGojgYCAgABB96nAgABqQQUgARD8gICAACIDDQACQCACLQAcRQ0AI4GAgIAAIQMgAigCGCgCACADQdqkwIAAakEBEJmBgIAACyAAIAIpAgg3AgAgAEEIaiACQQhqQQhqKAIANgIADAELIABBgICAgHg2AgAgACADNgIEIAIoAggiAEUNACACKAIMIABBARCcgYCAAAsgAkEgaiSAgICAAA8LQQFBgAEQroOAgAAAC40DAQJ/I4CAgIAAQSBrIgIkgICAgAAQn4GAgAACQEGAAUEBEJuBgIAAIgNFDQAgAiADNgIMIAJBgAE2AgggAiACQQhqNgIUIANB+wA6AAAgAkEBNgIQIAJBAToAHCOBgICAACEDIAIgAkEUajYCGAJAAkAgAkEYaiADQd6pwIAAakECIAFBKGoQ+4CAgAAiAw0AIAJBGGojgYCAgABB4KnAgABqQQYgAUE0ahD7gICAACIDDQAgAkEYaiOBgICAAEHmqcCAAGpBESABEPmAgIAAIgMNAAJAIAItABxFDQACQCACKAIYKAIAIgMoAgAgAygCCCIBRw0AIAMgAUEBQQFBARCPgYCAACADKAIIIQELIAMgAUEBajYCCCADKAIEIAFqQf0AOgAACyAAIAIpAgg3AgAgAEEIaiACQQhqQQhqKAIANgIADAELIABBgICAgHg2AgAgACADNgIEIAIoAggiAEUNACACKAIMIABBARCcgYCAAAsgAkEgaiSAgICAAA8LQQFBgAEQroOAgAAAC+oCAQJ/I4CAgIAAQSBrIgIkgICAgAAQn4GAgAACQEGAAUEBEJuBgIAAIgNFDQAgAiADNgIMIAJBgAE2AgggAiACQQhqNgIUIANB+wA6AAAgAkEBNgIQIAJBAToAHCOBgICAACEDIAIgAkEUajYCGAJAAkAgAkEYaiADQfypwIAAakERIAFBCGoQ+4CAgAAiAw0AIAJBGGojgYCAgABBjarAgABqQQYgARD6gICAACIDDQACQCACLQAcRQ0AAkAgAigCGCgCACIDKAIAIAMoAggiAUcNACADIAFBAUEBQQEQj4GAgAAgAygCCCEBCyADIAFBAWo2AgggAygCBCABakH9ADoA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AXFFDQEgAigC8A8iCkGAgICAeEYNASACKALsDyELIAAgCjYCDCAAIAs2AgggACAKNgIEIABBATYCAAwICyACI4qAgIAArUIghiAKrYQiBTcD6A8gAkHoC2ojgYCAgABB9YLAgABqIAJB6A9qEMOAgIAAIAIoAuwLIgogAigC8AsgAkHoD2oQgYCAgAAgAi0A6A9BAXFFDQEgAigC8A8iC0GAgICAeEYNASACKALsDyEMIAAgCzYCDCAAIAw2AgggACALNgIEIABBATYCACACKALoCyIARQ0HIAogAEEBEJyBgIAADAcLIAJB6AJqQQhqIQwgAkHoD2oQgoCAgAAgAkIAIAIpA/APIAItAOgPQQFxGzcDcCACQegPahCDgICAACACQegPaiACKALoDyIQIAIoAuwPIgsQrYOAgAAgAkH4AGogAigC7A8iCiACKALwDxDFgICAAAJAIAIoAugPIg9BgICAgHhyQYCAgIB4Rg0AIAogD0EBEJyBgIAACyACI4yAgIAArUIghiACQfAAaq2ENwPoDyACQZAIaiOBgICAACIKQciBwIAAaiACQegPahDDgICAACACIBYgAkH4AGqthCIWNwPoDyACQZwIaiAKQdyBwIAAaiACQegPahDDgICAACACQfgHaiAMELSDgIAAIAJBhAhqIApB0qjAgABqQQcQxYCAgAAgAiAFNwPoByACIAIpA3A3A/AHIAJB6A9qIAJB6AdqELGAgIAAAkACQAJAAkACQCACKALoD0GAgICAeEcNACACIAIoAuwPNgLoAyACQegLaiACQegDahC3gICAACACQegDahC8gICAACACKQPoCyEFIAAgAigC8As2AgwgACAFNwIEIABBATYCAAwBCyACIAIpAugPIgU3A+gLIAJB6AtqIAIoAuwLIg8gAkHoD2pBCGoiDCgCABD3gICAACAFpyEKIAIoAugLQQRGDQEgDCACQegLakEIaikCADcDACACIAIpAugLNwPoDyACI42AgIAArUIghiACQegPaq2ENwPQASACQegDaiOBgICAAEHpiMCAAGogAkHQAWoQw4CAgAAgAkHoD2oQvYCAgAAgAikC6AMhBSAAIAIoAvADNgIMIAAgBTcCBCAAQQE2AgAgCkUNACAPIApBARCcgYCAAAsgAkHoB2oQuICAgAAMAQsgAiACKQLsCyIFNwPoAyOBgICAACENIAJB9AtqKAIAIQ4gAigC7AMhDCACIA1BkLPAgABqNgL0DyACIAwgDmo2AvAPIAIgDDYC7A8gAkGAgMQANgLoDyACQcAAaiACQegPahCGgYCAAAJAIAWnIg1FDQAgDCANQQEQnIGAgAALIAJB6AtqQThqIAJB6AdqQThqKQMANwMAIAJB6AtqQTBqIAJB6AdqQTBqKQMANwMAIAJB6AtqQShqIAJB6AdqQShqKQMANwMAIAJB6AtqQSBqIAJB6AdqQSBqKQMANwMAIAJB6AtqQRhqIAJB6AdqQRhqKQMANwMAIAJB6AtqQRBqIAJB6AdqQRBqKQMANwMAIAJB6AtqQQhqIAJB6AdqQQhqKQMANwMAIAIgAikD6Ac3A+gLIAJBADYCsAIgAkEANgKoAiACQcgCaiOBgICAACIMQdmowIAAakEEEMWAgIAAIAJB6ANqIAxB3ajAgABqQRQQr4CAgAAgAi0A6ANBBkYNBiACQdABakEQaiACQegDakEQaikDADcDACACQdABakEIaiACQegDakEIaikDADcDACACIAIpA+gDNwPQASOBgICAACEMIAJB6ANqIAJBqAJqIAJByAJqIAJB0AFqEIuBgIAAIAJB6ANqEL6AgIAAIAJB0AFqIAxB8ajAgABqQQcQxYCAgAAgAkIANwOQASACQQI6AIgBIAIgAikDcDcDmAEgAkHoA2ogAkGoAmogAkHQAWogAkGIAWoQi4GAgAAgAkHoA2oQvoCAgAAgAkHIAmogDEH4qMCAAGpBEhDFgICAACACIBY3A+gDIAJB0AFqIAxBnZ/AgABqIAJB6ANqEMOAgIAAIAJBoAFqQQRyIAIoAtQBIgwgAigC2AEQxYCAgAAgAkEDOgCgASACQegDaiACQagCaiACQcgCaiACQaABahCLgYCAACACQegDahC+gICAAAJAIAIoAtABIg1FDQAgDCANQQEQnIGAgAALIAJByAJqI4GAgIAAIgxBiqnAgABqQQwQxYCAgAAgAkHoA2ogDEGWqcCAAGpBDxCvgICAACACLQDoA0EGRg0HIAJB0AFqQRBqIAJB6ANqQRBqKQMANwMAIAJB0AFqQQhqIgwgAkHoA2pBCGoiESkDADcDACACIAIpA+gDNwPQASOBgICAACENIAJB6ANqIAJBqAJqIAJByAJqIAJB0AFqEIuBgIAAIAJB6ANqEL6AgIAAIAJB0AFqIA1BpanAgABqQQ4QxYCAgAAgAkG4AWpBBHIgAigCRCIOIAIoAkgQxYCAgAAgAkEDOgC4ASACQegDaiACQagCaiACQdABaiACQbgBahCLgYCAACACQegDahC+gICAACACQcgCakEIaiACQagCakEIaigCACINNgIAIAJB2wFqIA02AAAgAkHoD2pBIGogAkHoC2pBCGoiDSkDADcDACACQegPakEoaiACQegLakEQaikDADcDACACQegPakEwaiACQYAMaikDADcDACACQegPakE4aiACQegLakEgaikDADcDACACQagQaiACQegLakEoaikDADcDACACQbAQaiACQegLakEwaikDADcDACACQbgQaiACQegLakE4aikDADcDACACIAIpAqgCNwDTASACIAIpA+gLNwOAECACQegPakEIaiACQdcBaikAADcAACACQQU6AOgPIAIgAikA0AE3AOkPIAJB6AtqIAJB6A9qELCAgIAAIAIoAugLQYCAgIB4Rw0BIAIgAigC7As2AsgCIAJB6ANqIAJByAJqELeAgIAAIAJByAJqELyAgIAAIAwgESgCACINNgIAIAIgAikD6AMiBTcD0AEgAEEMaiANNgIAIAAgBTcCBCAAQQE2AgAgAkHoD2oQuYCAgAACQCACKAJAIgBFDQAgDiAAQQEQnIGAgAALIApFDQAgDyAKQQEQnIGAgAALAkAgAigCeCIARQ0AIAIoAnwgAEEBEJyBgIAACyALRQ0HIBAgC0EBEJyBgIAADAcLIAwgDSgCACIENgIAIAIgAikC6AsiBTcD0AEgAEEMaiAENgIAIAAgBTcCBCAAQQA2AgAgAkHoD2oQuYCAgAACQCACKAJAIgBFDQAgDiAAQQEQnIGAgAALAkAgCkUNACAPIApBARCcgYCAAAsCQCACKAJ4IgBFDQAgAigCfCAAQQEQnIGAgAALAkAgC0UNACAQIAtBARCcgYCAAAsCQCACKAK4AyIARQ0AIAIoArwDIABBARCcgYCAAAsCQCACKAJQIgBFDQAgAigCVCAAQQEQnIGAgAALAkAgCUUNACACKAL0AiAJQQEQnIGAgAALAkAgB0UNACAIIAdBARCcgYCAAAsgAkEMahC7gICAAAJAIANFDQAgBiADQQEQnIGAgAALAkAgASgCDCIAQYCAgIB4ckGAgICAeEYNACABKAIQIABBARCcgYCAAAsgASgCGCIAQYCAgIB4ckGAgICAeEYNFQwUCwJAIAIoAugLIgtFDQAgCiALQQEQnIGAgAALIAIgBTcD6A8gAEEEaiOBgICAAEHvncCAAGogAkHoD2oQw4CAgAAgAEEBNgIADAULQQFBHhCug4CAAAALQQAgAkHoD2ojgYCAgAAiAkH4qsCAAGpBACACIAJBkPTBgABqEO6DgIAAAAtBBEEYEKSDgIAAAAsgAiACKALsAzYC0AEjgYCAgAAiAUGzqcCAAGpBKyACQdABaiABQfDzwYAAaiABQYD0wYAAahCAhICAAAALIAIgAigC7AM2AtABI4GAgIAAIgFBs6nAgABqQSsgAkHQAWogAUHw88GAAGogAUGA9MGAAGoQgISAgAAACyACKAK4AyIARQ0BIAIoArwDIABBARCcgYCAAAwBCyACIAIoAuwPNgLoAyACQegLaiACQegDahC3gICAACACQegDahC8gICAACACQegHakEIaiACQegLakEIaigCACIKNgIAIAIgAikD6AsiBTcD6AcgAEEMaiAKNgIAIAAgBTcCBCAAQQE2AgALAkAgAigCUCIARQ0AIAIoAlQgAEEBEJyBgIAACyAJRQ0AIAIoAvQCIAlBARCcgYCAAAsgB0UNByAIIAdBARCcgYCAAAwHCyAUQQFzIQsLIAJByAJqEOWAgIAAIAJB6A9qQQhqIg5CADcDACACQegPakEQaiISQgA3AwAgAkHoD2pBGGoiFEIANwMAIAJBqAJqQQhqIA4pAwA3AwAgAkGoAmpBEGogEikDADcDACACQagCakEYaiAUKQMANwMAIAJCADcD6A8gAiACKQPoDzcDqAIgAiACQagCajYC6A8gAkHoD2ohDiACQagCahCggoCAAAJAIAhFDQAgESAIQQEQnIGAgAALAkAgDUUNACATIA1BARCcgYCAAAsgCyAQRXJBAUcNAQwCCyAQRQ0BCyAPIBBBARCcgYCAAAsgDEUNACAKIAxBARCcgYCAAAsgCUUNACAHIAlBARCcgYCAAAsgAikCRCEFIAAgAigCTDYCDCAAIAU3AgQgAEEBNgIACwJAIARFDQAgAigCECAEQQEQnIGAgAALAkAgAigCGCIARQ0AIAIoAhwgAEEBEJyBgIAACwJAIAIoAiQi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KAIANgIMIAEjgYCAgAAiAEGircCAAGpBBiACQQxqIABBtPbBgABqEOuDgIAAIQAgAkEQaiSAgICAACAAC4cJAgR/A34jgICAgABB4AJrIgMkgICAgAAgA0E4akIANwMAIANBMGpCADcDACADQShqQgA3AwAgA0EgakIANwMAIANBGGpCADcDACADQRBqQgA3AwAgA0EIakIANwMAIANCADcDAAJAAkAgAkHBAEkNACADQcAAakEoaiEEAkBBwQBFDQAgBEEAQcEA/AsACyADQcAAakEYaiOBgICAAEG4r8CAAGoiBUEYaikDADcDACADQcAAakEQaiAFQRBqKQMANwMAIANBwABqQQhqIAVBCGopAwA3AwAgAyACQQZ2IgatNwNgIAMgBSkDADcDQCADQcAAaiABIAYQoIGAgAACQCACQT9xIgVFDQAgBCABIAJBwP///wdxaiAF/AoAAAsgAyAFOgCoAQJAQfAARQ0AIANBsAFqIANBwABqQfAA/AoAAAsgA0GwAWpBKGoiASADLQCYAiICaiIFQYABOgAAIAKtIgdCO4YgAykD0AEiCEIJhiIJIAdCA4aEIgdCgP4Dg0IohoQgB0KAgPwHg0IYhiAHQoCAgPgPg0IIhoSEIAhCAYZCgICA+A+DIAhCD4hCgID8B4OEIAhCH4hCgP4DgyAJQjiIhISEIQgCQAJAAkAgAkE/Rg0AAkAgAkE/cyIERQ0AIAVBAWpBACAE/AsACyACQThzQQdLDQELIANBsAFqIAFBARCggYCAACADQdACakIANwMAIANByAJqQgA3AwAgA0HAAmpCADcDACADQbgCakIANwMAIANBsAJqQgA3AwAgA0GoAmpCADcDACADQgA3A6ACIAMgCDcD2AIgA0GwAWogA0GgAmpBARCggYCAAAwBCyADIAg3A5ACIANBsAFqIAFBARCggYCAAAsgAyADKALMASICQRh0IAJBgP4DcUEIdHIgAkEIdkGA/gNxIAJBGHZycjYCHCADIAMoAsgBIgJBGHQgAkGA/gNxQQh0ciACQQh2QYD+A3EgAkEYdnJyNgIYIAMgAygCxAEiAkEYdCACQYD+A3FBCHRyIAJBCHZBgP4DcSACQRh2cnI2AhQgAyADKALAASICQRh0IAJBgP4DcUEIdHIgAkEIdkGA/gNxIAJBGHZycjYCECADIAMoArwBIgJBGHQgAkGA/gNxQQh0ciACQQh2QYD+A3EgAkEYdnJyNgIMIAMgAygCuAEiAkEYdCACQYD+A3FBCHRyIAJBCHZBgP4DcSACQRh2cnI2AgggAyADKAK0ASICQRh0IAJBgP4DcUEIdHIgAkEIdkGA/gNxIAJBGHZycjYCBCADIAMoArABIgJBGHQgAkGA/gNxQQh0ciACQQh2QYD+A3EgAkEYdnJyNgIADAELIAJFDQAgAyABIAL8CgAACyAAIAMpAwA3AAAgAEE4aiADQThqKQMANwAAIABBMGogA0EwaikDADcAACAAQShqIANBKGopAwA3AAAgAEEgaiADQSBqKQMANwAAIABBGGogA0EYaikDADcAACAAQRBqIANBEGopAwA3AAAgAEEIaiADQQhqKQMANwAAIANB4AJqJICAgIAAC80BAQN/I4CAgIAAQRBrIgIkgICAgAACQAJAAkACQAJAQQAgACgCACIDQX9qIgQgBCADSxsOBAABAgMACyACIAA2AgwgASOBgICAACIAQYStwIAAakEEIAJBDGogAEGk9sGAAGoQ64OAgAAhAAwDCyABI4GAgIAAQYitwIAAakEGEO+DgIAAIQAMAgsgASOBgICAAEGOrcCAAGpBDRDvg4CAACEADAELIAEjgYCAgABBm63AgABqQQcQ74OAgAAhAAsgAkEQaiSAgICAACAAC1IBAX8jgICAgABBEGsiAiSAgICAACACIAA2AgwgASOBgICAACIAQaKtwIAAakEGIAJBDGogAEG09sGAAGoQ64OAgAAhACACQRBqJICAgIAAIAALpAgBAn8jgICAgABBEGsiAiSAgICAAAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAALQAADhQAAQIDBAUGBwgJCgsMDQ4PEBESEwALIAEjgYCAgABBqK3AgABqQQgQ74OAgAAhAAwTCyABI4GAgIAAQbCtwIAAakEGEO+DgIAAIQAMEgsgAiAAQQhqNgIMIAEjgYCAgAAiA0G2rcCAAGpBCiADQcCtwIAAakEMIABBBGogA0HE9sGAAGogA0HMrcCAAGpBCiACQQxqIANB1PbBgABqEO2DgIAAIQAMEQsgASOBgICAAEHWrcCAAGpBEBDvg4CAACEADBALIAIgAEEBajYCDCABI4GAgIAAIgBB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ovoKQo29yf4LQoy9yf4LIAMoAiAiAUHBgtmBfUkbIAMoAiQiBK1WGyADKAIoIgWtVhsgAygCLCIGrVYbIAMoAjAiB61WGyADKAI4IgggAygCNCIJcUF/RxsgAygCPCIKrXxCIIinENqBgIAAQf8BcUEBRw0AQQBBfyAEIAFyIAVyIAZyIAdyIAlyIAhyIApyGxDagYCAAEH/AXENACAAIAo2AiAgACAINgIcIAAgCTYCGCAAIAc2AhQgACAGNgIQIAAgBTYCDCAAIAQ2AgggACABNgIEQQAhAgsgACACNgIACyADQcAAaiSAgICAAAt+AQF/I4CAgIAAQdACayIDJICAgIAAAkBB1ABFDQAgA0GEAWogAkHUAPwKAAALIANBDGogA0GEAWoQw4GAgAAgA0GEAWogA0EMaiABEMWBgIAAIANB/AFqIANBhAFqEMaBgIAAIAAgA0H8AWoQrYGAgAAgA0HQAmokgICAgAALggcBA38jgICAgABBEGsiASSAgICAACAAQQA6AAAgASAANgIMIAFBDGohAiAAEKCCgIAAIABBADoAASABIABBAWoiAzYCDCADEKCCgIAAIABBADoAAiABIABBAmoiAzYCDCADEKCCgIAAIABBADoAAyABIABBA2oiAzYCDCADEKCCgIAAIABBADoABCABIABBBGoiAzYCDCADEKCCgIAAIABBADoABSABIABBBWoiAzYCDCADEKCCgIAAIABBADoABiABIABBBmoiAzYCDCADEKCCgIAAIABBADoAByABIABBB2oiAzYCDCADEKCCgIAAIABBADoACCABIABBCGoiAzYCDCADEKCCgIAAIABBADoACSABIABBCWoiAzYCDCADEKCCgIAAIABBADoACiABIABBCmoiAzYCDCADEKCCgIAAIABBADoACyABIABBC2oiAzYCDCADEKCCgIAAIABBADoADCABIABBDGoiAzYCDCADEKCCgIAAIABBADoADSABIABBDWoiAzYCDCADEKCCgIAAIABBADoADiABIABBDmoiAzYCDCADEKCCgIAAIABBADoADyABIABBD2oiAzYCDCADEKCCgIAAIABBADoAECABIABBEGoiAzYCDCADEKCCgIAAIABBADoAESABIABBEWoiAzYCDCADEKCCgIAAIABBADoAEiABIABBEmoiAzYCDCADEKCCgIAAIABBADoAEyABIABBE2oiAzYCDCADEKCCgIAAIABBADoAFCABIABBFGoiAzYCDCADEKCCgIAAIABBADoAFSABIABBFWoiAzYCDCADEKCCgIAAIABBADoAFiABIABBFmoiAzYCDCADEKCCgIAAIABBADoAFyABIABBF2oiAzYCDCADEKCCgIAAIABBADoAGCABIABBGGoiAzYCDCADEKCCgIAAIABBADoAGSABIABBGWoiAzYCDCADEKCCgIAAIABBADoAGiABIABBGmoiAzYCDCADEKCCgIAAIABBADoAGyABIABBG2oiAzYCDCADEKCCgIAAIABBADoAHCABIABBHGoiAzYCDCADEKCCgIAAIABBADoAHSABIABBHWoiAzYCDCADEKCCgIAAIABBADoAHiABIABBHmoiAzYCDCADEKCCgIAAIABBADoAHyABIABBH2oiADYCDCAAEKCCgIAAIAFBEGokgICAgAALZAEBfyOAgICAAEEQayICJICAgIAAIAIgATYCBCACIAA2AgAgAiOJgICAAEGngICAAGqtQiCGIAKthDcDCCOBgICAAEHznsCAAGogAkEIahDngICAACEBIAJBEGokgICAgAAgAQu1AQEEfyOAgICAAEEQayICJICAgIAAQQEhAwJAAkACQCABQQFxDQAgAkEEaiAAIAEQsYOAgAAMAQsgAUEBdiEEQQAhBQJAIAFBAkkNABCfgYCAACAEQQEQm4GAgAAiA0UNAiAEIQULAkAgBEUNACADIAAgBPwKAAALIAIgBDYCDCACIAM2AgggAiAFNgIECyACQQRqEO+BgIAAIQEgAkEQaiSAgICAACABDwtBASAEEK6DgIAAAAuEAQEBfyOAgICAAEEgayIDJICAgIAAIAMgAjYCDCADIAE2AgggAyAANgIEIAMjj4CAgACtQiCGIANBBGqthDcDECADI4mAgIAAQamAgIAAaq1CIIYgA0EIaq2ENwMYI4GAgIAAQYmFwIAAaiADQRBqEOeAgIAAIQIgA0EgaiSAgICAACACC2QBAX8jgICAgABBEGsiAiSAgICAACACIAE2AgQgAiAANgIAIAIjiYCAgABBp4CAgABqrUIghiACrYQ3AwgjgYCAgABBh5/AgABqIAJBCGoQ54CAgAAhASACQRBqJICAgIAAIAELZgEBfyOAgICAAEEQayICJICAgIAAAkACQCAAKAIMRQ0AIAAhAQwBCyACQQhqIAFBDGoQ7YGAgAAgACACKAIIIAIoAgwQ8YGAgAAhASAAQRRBBBCcgYCAAAsgAkEQaiSAgICAACABC2YBAX8jgICAgABBEGsiAiSAgICAAAJAAkAgACgCDEUNACAAIQEMAQsgAkEIaiABQQxqEOqBgIAAIAAgAigCCCACKAIMEPGBgIAAIQEgAEEUQQQQnIGAgAALIAJBEGokgICAgAAgAQumDgJHfwF+I4CAgIAAQcAAayICJICAgIAAIAEoAgwiA0EBcSEEIAEoAgghBSABKAIEIQYgASgCACEHIAAoAgAhCAJAIANBAkkNACADQQF2IQlBACEKA0AgAkEYaiILQgA3AwAgAkEQaiIMQgA3AwAgAkEIaiINQgA3AwAgAkIANwMAIAcgBygCECIOQQJqNgIQIAcoAgAhASAHKAIEIQAgAiAHKAIIIg82AiggAiAANgIkIAIgATYCICAHKAIMIRAgAiAPNgI4IAIgADYCNCACIAE2AjAgAiAQIA5qIgFBGHQgAUGA/gNxQQh0ciABQQh2QYD+A3EgAUEYdnJyNgIsIAIgAUEBaiIBQRh0IAFBgP4DcUEIdHIgAUEIdkGA/gNxIAFBGHZycjYCPCACIAggAkEgahCcgoCAACAGIApqIgEtAAAhDiABQQFqLQAAIQ8gAUECai0AACEQIAFBA2otAAAhESABQQRqLQAAIRIgAUEFai0AACETIAFBBmotAAAhFCABQQdqLQAAIRUgAUEIai0AACEWIAFBCWotAAAhFyABQQpqLQAAIRggAUELai0AACEZIAFBDGotAAAhGiABQQ1qLQAAIRsgAUEOai0AACEcIAFBD2otAAAhHSABQRBqLQAAIR4gAUERai0AACEfIAFBEmotAAAhICABQRNqLQAAISEgAUEUai0AACEiIAFBFWotAAAhIyABQRZqLQAAISQgAUEXai0AACElIAFBGGotAAAhJiABQRlqLQAAIScgAUEaai0AACEoIAFBG2otAAAhKSABQRxqLQAAISogAUEdai0AACErIAFBHmotAAAhLCANLQAAIQ0gDC0AACEMIAstAAAhCyACLQAAIS0gAi0AASEuIAItAAIhLyACLQADITAgAi0ABCExIAItAAUhMiACLQAGITMgAi0AByE0IAItAAkhNSACLQAKITYgAi0ACyE3IAItAAwhOCACLQANITkgAi0ADiE6IAItAA8hOyACLQARITwgAi0AEiE9IAItABMhPiACLQAUIT8gAi0AFSFAIAItABYhQSACLQAXIUIgAi0AGSFDIAItABohRCACLQAbIUUgAi0AHCFGIAItAB0hRyACLQAeIUggBSAKaiIAQR9qIAItAB8gAUEfai0AAHM6AAAgAEEeaiBIICxzOgAAIABBHWogRyArczoAACAAQRxqIEYgKnM6AAAgAEEbaiBFIClzOgAAIABBGmogRCAoczoAACAAQRlqIEMgJ3M6AAAgAEEYaiALICZzOgAAIABBF2ogQiAlczoAACAAQRZqIEEgJHM6AAAgAEEVaiBAICNzOgAAIABBFGogPyAiczoAACAAQRNqID4gIXM6AAAgAEESaiA9ICBzOgAAIABBEWogPCAfczoAACAAQRBqIAwgHnM6AAAgAEEPaiA7IB1zOgAAIABBDmogOiAcczoAACAAQQ1qIDkgG3M6AAAgAEEMaiA4IBpzOgAAIABBC2ogNyAZczoAACAAQQpqIDYgGHM6AAAgAEEJaiA1IBdzOgAAIABBCGogDSAWczoAACAAQQdqIDQgFXM6AAAgAEEGaiAzIBRzOgAAIABBBWogMiATczoAACAAQQRqIDEgEnM6AAAgAEEDaiAwIBFzOgAAIABBAmogLyAQczoAACAAQQFqIC4gD3M6AAAgACAtIA5zOgAAIApBIGohCiAJQX9qIgkNAAsLAkAgBEUNACAHIAcoAhAiAUEBajYCECAHKAIMIQAgBykCACFJIAcoAgghByACQRhqQgA3AgAgAkIANwIQIAIgBzYCCCACIEk3AgAgAiAAIAFqIgFBGHQgAUGA/gNxQQh0ciABQQh2QYD+A3EgAUEYdnJyNgIMIAJBIGogCCACEJyCgIAAIAItACAhByACLQAhIQogAi0AIiEJIAItACMhCyACLQAkIQwgAi0AJSENIAItACYhDiACLQAnIQ8gAi0AKCEQIAItACkhESACLQAqIRIgAi0AKyETIAItACwhFCACLQAtIRUgAi0ALiEWIAYgA0H+////AHFBBHQiAGoiAS0AACEXIAEtAAEhGCABLQACIRkgAS0AAyEaIAEtAAQhGyABLQAFIRwgAS0ABiEdIAEtAAchHiABLQAIIR8gAS0ACSEgIAEtAAohISABLQALISIgAS0ADCEjIAEtAA0hJCABLQAOISUgBSAAaiIAIAEtAA8gAi0AL3M6AA8gACAlIBZzOgAOIAAgJCAVczoADSAAICMgFHM6AAwgACAiIBNzOgALIAAgISASczoACiAAICAgEXM6AAkgACAfIBBzOgAIIAAgHiAPczoAByAAIB0gDnM6AAYgACAcIA1zOgAFIAAgGyAMczoABCAAIBogC3M6AAMgACAZIAlzOgACIAAgGCAKczoAASAAIBcgB3M6AAALIAJBwABqJICAgIAAC0oBAX8gACgCACEAAkAgASgCCCICQYCAgBBxDQACQCACQYCAgCBxDQAgACABENGDgIAADwsgACABENeDgIAADwsgACABENaDgIAAC0oBAX8gACgCACEAAkAgASgCCCICQYCAgBBxDQACQCACQYCAgCBxDQAgACABEM6DgIAADwsgACABENWDgIAADwsgACABENSDgIAAC5MCAQJ/I4CAgIAAQRBrIgIkgICAgAACQAJAAkACQAJAIAAoAgAOBAABAgMACyACQQRqIAEjgYCAgABB46/AgABqQRcQ54OAgAAgAkEEahDlg4CAACEADAMLIAJBBGogASOBgICAACIDQfqvwIAAakEYEOeDgIAAIAJBBGogAEEEaiADQfj3wYAAahDkg4CAABDlg4CAACEADAILIAJBBGogASOBgICAAEGSsMCAAGpBFxDng4CAACACQQRqEOWDgIAAIQAMAQsgAkEEaiABI4GAgIAAIgNBqbDAgABqQRkQ54OAgAAgAkEEaiAAQQRqIANB+PfBgABqEOSDgIAAEOWDgIAAIQALIAJBEGokgICAgAAgAAvuAgECfyOAgICAAEEQayICJICAgIAAAkACQAJAAkACQAJAIAAoAgAOBQABAgMEAAsgAkEEaiABI4GAgIAAIgNB7bDAgABqQRcQ54OAgAAgAkEEaiAAQQRqIANB+PfBgABqEOSDgIAAEOWDgIAAIQAMBAsgAkEEaiABI4GAgIAAIgNBhLHAgABqQRwQ54OAgAAgAkEEaiAAQQRqIANB+PfBgABqEOSDgIAAEOWDgIAAIQAMAwsgAkEEaiABI4GAgIAAIgNBoLHAgABqQR0Q54OAgAAgAkEEaiAAQQRqIANB+PfBgABqEOSDgIAAEOWDgIAAIQAMAgsgAkEE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wABLGyIERQ0AIANBoAFqIAJqQQAgBPwLAAsCQCACRQ0AIANBoAFqIAEgAvwKAAALIANBBmpBAmogA0GgAWpBAmotAAA6AAAgA0HQAGoiAiADQaABakEPaikAADcDACADQdgAaiIBIANBoAFqQRdqKQAANwMAIANB4ABqIgQgA0GgAWpBH2opAAA3AwAgA0HoAGoiBSADQaABakEnaikAADcDACADQfAAaiIGIANBoAFqQS9qKQAANwMAIANB+ABqIgcgA0GgAWpBN2opAAA3AwAgA0GAAWoiCCADQaABakE/ai8AADsBACADIAMvAKABOwEGIAMgAykApwE3A0ggAygAowEhCSADQQZqQQ9qIAIpAwA3AAAgA0EGakEXaiABKQMANwAAIANBBmpBH2ogBCkDADcAACADQQZqQSdqIAUpAwA3AAAgA0EGakEvaiAGKQMANwAAIANBBmpBN2ogBykDADcAACADQQZqQT9qIAgvAQA7AAAgAyAJNgAJIAMgAykDSDcADSOBgICAACECIANBoAFqIANBBmoQpYGAgAACQEHUAEUNACADQfgBaiACQaSywIAAakHUAPwKAAALIANByABqIANB+AFqIANBoAFqIAMtAPQBIgQQrIGAgAACQCADLQAGIgFBfmpBBEkNACABDQILQQEhAiABRRDZgYCAAEF/c0EBcRDZgYCAACAEcRDZgYCAAEH/AXFBAUcNAAJAQdQARQ0AIABBBGogA0HIAGpB1AD8CgAAC0EAIQILIAAgAjYCACADQYADaiSAgICAAA8LIANBAzYCzAIjgYCAgAAiAkHorMCAAGpBCyADQcwCaiACQeT1wYAAaiACQfT1wYAAahCAhICAAAALwgECAn8BfkEBIQZBBCEHAkACQCAEIAVqQX9qQQAgBGtxrSADrX4iCEIgiKdFDQBBACEDDAELAkAgCKciA0GAgICAeCAEa00NAEEAIQMMAQsCQAJAAkACQCABRQ0AIAIgBSABbCAEIAMQnYGAgAAhBwwBCwJAIAMNACAEIQcMAgsQn4GAgAAgAyAEEJuBgIAAIQcLIAcNACAAIAQ2AgQMAQsgACAHNgIEQQAhBgtBCCEHCyAAIAdqIAM2AgAgACAGNgIAC8gBAQF/I4CAgIAAQRBrIgUkgICAgAACQCAEDQBBAEEAEK6DgIAAAAsCQCACIAFqIgEgAk8NAEEAQQAQroOAgAAACyAFQQRqIAAoAgAiAiAAKAIEIAEgAkEBdCICIAEgAksbIgJBCEEEQQEgBEGBCEkbIARBAUYbIgEgAiABSxsiAiADIAQQjoGAgAACQCAFKAIEQQFHDQAgBSgCCCAFKAIMEK6DgIAAAAsgBSgCCCEEIAAgAjYCACAAIAQ2AgQgBUEQaiSAgICAAAtXAQF/AkAgAiABayICIAAoAgAgACgCCCIDa00NACAAIAMgAkEBQQEQj4GAgAAgACgCCCEDCwJAIAJFDQAgACgCBCADaiABIAL8CgAACyAAIAMgAmo2AggLDAAgACABEKSCgIAACwwAIAAgARCrgoCAAAsMACAAIAEQo4KAgAALqgIBBn8jgICAgABBMGsiASSAgICAACAAKAIEIQICQCAAKAIIIgNFDQAgAiEEA0ACQAJAAkACQCAELQAADgUDAwMBAgALAkACQCAEQQRqKAIAIgUNAEEAIQVBACEGDAELIAEgBTYCJCABQQA2AiAgASAFNgIUIAFBADYCECABIARBCGooAgAiBTYCKCABIAU2AhggBEEMaigCACEGQQEhBQsgASAGNgIsIAEgBTYCHCABIAU2AgwgAUEMahCMgYCAAAwCCyAEQQRqKAIAIgVFDQEgBEEIaigCACAFQQEQnIGAgAAMAQsgBEEEahCUgYCAAAsgBEEYaiEEIANBf2oiAw0ACwsCQCAAKAIAIgRFDQAgAiAEQRhsQQgQnIGAgAALIAFBMGokgICAgAAL3AEBAX8jgICAgABBMGsiAySAgICAAAJAAkAgAkEBcQ0AIANBgoDEADYCCCADQgI3AiQgAyACNgIgIAMgATYCHCADIANBCGo2AiwgA0EQaiADQRxqEJaBgIAAAkAgAygCCCICQYKAxABGDQAgACADKAIMNgIIIAAgAjYCBCAAQYCAgIB4NgIAIAMoAhAiAEUNAiADKAIUIABBARCcgYCAAAwCCyAAIAMpAhA3AgAgAEEIaiADQRBqQQhqKAIANgIADAELIABCgICAgIiAwAg3AgALIANBMGokgICAgAAL3QMBA38jgICAgABBwABrIgIkgICAgAAgAkEYaiABEOKAgIAAAkACQAJAAkACQCACLQAYRQ0AIAItABkhAwJAIAEoAhAoAgBBgoDEAEcNACABKAIERQ0AIAEoAghFDQMLEJ+BgIAAQQhBARCbgYCAACIERQ0DIAQgAzoAACACQQE2AiQgAiAENgIgIAJBCDYCHCACQShqQRBqIAFBEGooAgA2AgAgAkEoakEIaiABQQhqKQIANwMAIAIgASkCADcDKCACQRBqIAJBKGoQ4oCAgAACQCACLQAQRQ0AIAItABEhA0EBIQEDQAJAIAEgAigCHEcNAAJAIAIoAjgoAgBBgoDEAEcNACACKAIsRQ0AIAIoAjBFDQgLIAJBHGogAUEBQQFBARCPgYCAACACKAIgIQQLIAQgAWogAzoAACACIAFBAWoiATYCJCACQQhqIAJBKGoQ4oCAgAAgAi0ACSEDIAItAAgNAAsLIAAgAikCHDcCACAAQQhqIAJBHGpBCGooAgA2AgAMAQsgAEEANgIIIABCgICAgBA3AgALIAJBwABqJICAgIAADwsjgYCAgABB1PfBgABqEMmDgIAAAAtBAUEIEK6DgIAAAAsjgYCAgABB1PfBgABqEMmDgIAAAAvoAQECfyOAgICAAEEwayICJICAgIAAAkACQCABKAIIIgNBAXENACABKAIEIQEgAkGCgMQANgIIIAJCAjcCJCACIAM2AiAgAiABNgIcIAIgAkEIajYCLCACQRBqIAJBHGoQmIGAgAACQCACKAIIIgFBgoDEAEYNACAAIAIoAgw2AgggACABNgIEIABBgICAgHg2AgAgAigCECIARQ0CIAIoAhQgAEEBEJyBgIAADAILIAAgAikCEDcCACAAQQhqIAJBEGpBCGooAgA2AgAMAQsgAEKAgICAiIDACDcCAAsgAkEwaiSAgICAAAvdAwEDfyOAgICAAEHAAGsiAiSAgICAACACQRhqIAEQ4oCAgAACQAJAAkACQAJAIAItABhFDQAgAi0AGSEDAkAgASgCECgCAEGCgMQARw0AIAEoAgRFDQAgASgCCEUNAwsQn4GAgABBCEEBEJuBgIAAIgRFDQMgBCADOgAAIAJBATYCJCACIAQ2AiAgAkEINgIcIAJBKGpBEGogAUEQaigCADYCACACQShqQQhqIAFBCGopAgA3AwAgAiABKQIANwMoIAJBEGogAkEoahDigICAAAJAIAItABBFDQAgAi0AESEDQQEhAQNAAkAgASACKAIcRw0AAkAgAigCOCgCAEGCgMQARw0AIAIoAixFDQAgAigCMEUNCAsgAkEcaiAB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A0GAAWogA0HUAGogA0EEahCxgYCAACADIAMoAqQBNgJQIAMgAykCnAE3AkggAyADKQKUATcCQCADIAMpAowBNwI4IAMgAykChAE3AjAgAyADKAKAAUEHajYCLCADQdQAaiADQSxqEMqBgIAAIAMgAygCeEEAIAMtAHwiFGsiAXE2AvwBIAMgAygCdCABcTYC+AEgAyADKAJwIAFxNgL0ASADIAMoAmwgAXE2AvABIAMgAygCaCABcTYC7AEgAyADKAJkIAFxNgLoASADIAMoAmAgAXE2AuQBIAMgAygCXCABcTYC4AEgAyADKAJYIAFxNgLcASADIAMoAlQgAXE2AtgBIANBgAJqIANB2AFqELSBgIAAIAMoAoQCIQYgAygCiAIhByADKAKMAiEJIAMoApACIQsgAygClAIhDCADKAKYAiENIAMoApwCIQ4gAygCoAIhFSADQfz//wcgAygCpAIiAWsiFiABc0EAIAMoAoACIhdBAXEQ2YGAgAAgAnMQ2YGAgABBf3NBAXEQ2YGAgABB/wFxayIBcSAWczYCzAIgAyAVQfz///8AIBVrIgJzIAFxIAJzNgLIAiADIA5B/P///wAgDmsiFXMgAXEgFXM2AsQCIAMgDUH8////ACANayIOcyABcSAOczYCwAIgAyAMQfz///8AIAxrIg1zIAFxIA1zNgK8AiADIAtB/P///wAgC2siDHMgAXEgDHM2ArgCIAMgCUH8////ACAJayILcyABcSALczYCtAIgAyAHQfz///8AIAdrIglzIAFxIAlzNgKwAiADIAZB/P3//wAgBmsiB3MgAXEgB3M2AqwCIAMgF0G84f//ACAXayIGcyABcSAGczYCqAIgA0GoAWogA0GoAmoQtIGAgAAgECAKKQIANwMAIBEgCCkCADcDACASIAQpAgA3AwAgEyAFKQIANwMAIANBADoA0AEgAyADKQIENwOAAQJAQdQARQ0AIAAgA0GAAWpB1AD8CgAACyAAIBQgD3EQ2YGAgAA6AFQgA0HQAmokgICAgAALkwwBGn8jgICAgABB8AFrIgIkgICAgAACQAJAAkACQAJAIAEtAAAiA0F+akEESQ0AIANFDQEgAkEDNgJ4I4GAgIAAIgFBtLTAgABqQQsgAkH4AGogAUHY+cGAAGogAUHo+cGAAGoQgISAgAAACyABQQFqIQQgA0EGcUECRg0BIANBBUcNAiAAIARBABDZgYCAABCkgYCAAAwDCyOBgICAACEDQQEQ2YGAgAAhAQJAQdQARQ0AIAAgA0Hgs8CAAGpB1AD8CgAACyAAIAE6AFQMAgsgACAEIANBAXEQ2YGAgAAQpIGAgAAMAQsgAkH4AGogBBCugYCAACACKAKcASIDQf///wFLIANB////AUYgAigChAEiBSACKAKAASIGcSACKAKIASIHcSACKAKMASIIcSACKAKQASIJcSACKAKUASIKcSACKAKYASILcUH///8fRnEgAigCfCIMIAIoAngiDUHRB2pBGnZqQcAAakH///8fS3FyENmBgIAAQX9zQQFxENmBgIAAIQQgAkH4AGogAUEhahCugYCAACACKAKcASIOQf///wFLIA5B////AUYgAigChAEiDyACKAKAASIQcSACKAKIASIRcSACKAKMASIScSACKAKQASITcSACKAKUASIUcSACKAKYASIVcUH///8fRnEgAigCfCIWIAIoAngiF0HRB2pBGnZqQcAAakH///8fS3FyENmBgIAAQX9zQQFxENmBgIAAIRggAkEgaiIZIAtBACAEQf8BcWsiAXE2AgAgAkEYaiILIAkgAXE2AgAgAkEQaiIJIAcgAXE2AgAgAkEIaiIHIAYgAXE2AgAgAiADIAFxNgIkIAIgCiABcTYCHCACIAggAXE2AhQgAiAFIAFxNgIMIAIgDCABcTYCBCACIA0gAXE2AgAgAkEoakEIaiIDIBBBACAYQf8BcWsiAXE2AgAgAkEoakEQaiIFIBEgAXE2AgAgAkEoakEYaiIGIBMgAXE2AgAgAkEoakEgaiIIIBUgAXE2AgAgAiAWIAFxNgIsIAIgFyABcTYCKCACIA8gAXE2AjQgAiASIAFxNgI8IAIgFCABcTYCRCACIA4gAXE2AkwgAkH4AGpBIGoiASAIKQIANwMAIAJB+ABqQRhqIg4gBikCADcDACACQfgAakEQaiIKIAUpAgA3AwAgAkH4AGpBCGoiDCADKQIANwMAIAIgAikCKDcDeCACQcgBaiACQfgAaiACQShqELGBgIAAIAIoAsgBIQ0gAigCzAEhDyACKALQASEQIAIoAtQBIREgAigC2AEhEiACKALcASETIAIoAuABIRQgAigC5AEhFSACKALoASEWIAIoAuwBIRcgASAZKQIANwMAIA4gCykCADcDACAKIAkpAgA3AwAgDCAHKQIANwMAIAIgAikCADcDeCACQcgBaiACQfgAaiACELGBgIAAIAJB0ABqIAJByAFqIAIQsYGAgAAgDCAHKQIANwMAIAogCSkCADcDACAOIAspAgA3AwAgASAZKQIANwMAIAIgAikCADcDeCACKAJQIQEgAigCVCEOIAIoAlghGSACKAJcIQsgAigCYCEJIAIoAmQhByACKAJoIQogAigCbCEMIAIoAnAhGiACKAJ0IRsgAkHAAWogCCkCADcDACACQfgAakHAAGogBikCADcDACACQbABaiAFKQIANwMAIAJBqAFqIAMpAgA3AwAgAiACKQIoNwOgASACIBsgF2tB/P//B2o2AuwBIAIgGiAWa0H8////AGo2AugBIAIgDCAVa0H8////AGo2AuQBIAIgCiAUa0H8////AGo2AuABIAIgByATa0H8////AGo2AtwBIAIgCSASa0H8////AGo2AtgBIAIgCyARa0H8////AGo2AtQBIAIgGSAQa0H8////AGo2AtABIAIgDiAPa0H8/f//AGo2AswBIAIgASANa0HD4f//AGo2AsgBIAJByAFqELCBgIAAIQECQEHQAEUNACAAIAJB+ABqQdAA/AoAAAsgAEEAOgBQIAAgASAYcRDZgYCAACAEcRDZgYCAADoAVAsgAkHwAWokgICAgAALDwAgACgCACABEM+BgIAAC0oBAX8gACgCACEAAkAgASgCCCICQYCAgBBxDQACQCACQYCAgCBxDQAgACABEM6DgIAADwsgACABENWDgIAADwsgACABENSDgIAAC3sBAn8jgICAgABBEGsiAiSAgICAACACIAAoAgAiA0EEajYCDCABI4GAgIAAIgBB3bTAgABqQQkgAEHmtMCAAGpBCyADIABBiPrBgABqIABB8bTAgABqQQkgAkEMaiAAQZj6wYAAahDtg4CAACEAIAJBEGokgICAgAAgAAtKAQF/IAAoAgAhAAJAIAEoAggiAkGAgIAQcQ0AAkAgAkGAgIAgcQ0AIAAgARDRg4CAAA8LIAAgARDXg4CAAA8LIAAgARDWg4CAAAtDAQF/AkAgASgCCCICQYCAgBBxDQACQCACQYCAgCBxDQAgACABENGDgIAADwsgACABENeDgIAADwsgACABENaDgIAAC80BAQN/I4CAgIAAQRBrIgIkgICAgAACQAJAAkACQAJAQQAgACgCACIDQX9qIgQgBCADSxsOBAABAgMACyACIAA2AgwgASOBgICAACIAQb+0wIAAakEEIAJBDGogAEH4+cGAAGoQ64OAgAAhAAwDCyABI4GAgIAAQcO0wIAAakEGEO+DgIAAIQAMAgsgASOBgICAAEHJtMCAAGpBDRDvg4CAACEADAELIAEjgYCAgABB1rTAgABqQQcQ74OAgAAhAAsgAkEQaiSAgICAACAAC4AFASh/IAIoAgAhBCABKAIAIQUgAigCBCEGIAEoAgQhByACKAIIIQggASgCCCEJIAIoAgwhCiABKAIMIQsgAigCECEMIAEoAhAhDSACKAIUIQ4gASgCFCEPIAIoAhghECABKAIYIREgAigCHCESIAEoAhwhEyACKAIgIRQgASgCICEVIAIoAiQhFiABKAIkIRcgAigCKCEYIAEoAighGSACKAIsIRogASgCLCEbIAIoAjAhHCABKAIwIR0gAigCNCEeIAEoAjQhHyACKAI4ISAgASgCOCEhIAIoAjwhIiABKAI8ISMgAigCQCEkIAEoAkAhJSACKAJEISYgASgCRCEnIAIoAkghKCABKAJIISkgAigCTCEqIAEoAkwhKyAAIAItAFAgAS0AUCIBc0EAIANrcSABczoAUCAAICsgKiArc0EAIANB/wFxayIBcXM2AkwgACApICggKXMgAXFzNgJIIAAgJyAmICdzIAFxczYCRCAAICUgJCAlcyABcXM2AkAgACAjICIgI3MgAXFzNgI8IAAgISAgICFzIAFxczYCOCAAIB8gHiAfcyABcXM2AjQgACAdIBwgHXMgAXFzNgIwIAAgGyAaIBtzIAFxczYCLCAAIBkgGCAZcyABcXM2AiggACAXIBYgF3MgAXFzNgIkIAAgFSAUIBVzIAFxczYCICAAIBMgEiATcyABcXM2AhwgACARIBAgEXMgAXFzNgIYIAAgDyAOIA9zIAFxczYCFCAAIA0gDCANcyABcXM2AhAgACALIAogC3MgAXFzNgIMIAAgCSAIIAlzIAFxczYCCCAAIAcgBiAHcyABcXM2AgQgACAFIAQgBXMgAXFzNgIAC4YBAQF/I4CAgIAAQdAAayICJICAgIAAIAJBIGogAUEgaikCADcDACACQRhqIAFBGGopAgA3AwAg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QQZ0cjoAFiAAIANBGHZBA3EgCEECdHI6AA8gACAIQRZ2QQ9xIAlBBHRyOgAMIAAgCUEUdkE/cSAKQQZ0cjoACSAAIARBGHZBA3EgAUECdHI6AAILjgQBHH8gACABKAIEIAEoAiQiAkEWdiIDQQZ0aiADQdEHbCABKAIAaiIEQRp2aiIFQf///x9xIgYgBEH///8fcSIHQdEHaiIIQRp2akHAAGoiCUEadiAFQRp2IAEoAghqIgNB////H3EiCmoiC0EadiADQRp2IAEoAgxqIgxB////H3EiDWoiDkEadiAMQRp2IAEoAhBqIg9B////H3EiEGoiEUEadiAPQRp2IAEoAhRqIhJB////H3EiE2oiFEEadiASQRp2IAEoAhhqIhVB////H3EiFmoiF0EadiAVQRp2IAEoAhxqIhhB////H3EiGWoiGkEadiAYQRp2IAEoAiBqIhtB////H3EiHGoiHUEadiAbQRp2IAJB////AXFqIgFqQf///wFxIAFzQQAgAUH///8BSyAJQf///x9LIAwgA3EgD3EgEnEgFnEgGHEgG3FB////H0YgAUH///8BRnFxchDZgYCAAEH/AXFrIgJxIAFzNgIkIAAgHSAbcyACQf///x9xIgFxIBxzNgIgIAAgGiAYcyABcSAZczYCHCAAIBcgFXMgAXEgFnM2AhggACAUIBJzIAFxIBNzNgIUIAAgESAPcyABcSAQczYCECAAIA4gDHMgAXEgDXM2AgwgACABIAsgA3NxIApzNgIIIAAgASAJIAVzcSAGczYCBCAAIAEgCCAEc3EgB3M2AgALqQQDA38IfgN/IAAgAigCACIEIAEoAgBqIgWtIAMoAgAiBq19IgdC/////w+DIAYgAjUCHCABNQIcfCACNQIYIAE1Ahh8IAI1AhQgATUCFHwgAjUCECABNQIQfCACNQIMIAE1Agx8IAI1AgggATUCCHwgBSAESa0gATUCBHwgAjUCBHwiCEIgiHwiCUIgiHwiCkIgiHwiC0IgiHwiDEIgiHwiDUIgiHwiDkL/////D4MgAygCHCICrX0gDUL/////D4MgAygCGCIErX0gDEL/////D4MgAygCFCIFrX0gC0L/////D4MgAygCECIPrX0gCkL/////D4MgAygCDCIQrX0gCUL/////D4MgAygCCCIRrX0gCEL/////D4MgAygC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BHM2AhwgACACKAIYIAEoAhgiBHMgA3EgBHM2AhggACACKAIUIAEoAhQiBHMgA3EgBHM2AhQgACACKAIQIAEoAhAiBHMgA3EgBHM2AhAgACACKAIMIAEoAgwiBHMgA3EgBHM2AgwgACACKAIIIAEoAggiBHMgA3EgBHM2AgggACACKAIEIAEoAgQiBHMgA3EgBHM2AgQgACACKAIAIAEoAgAiAXMgA3EgAXM2AgALiQQBBn8jgICAgABB0AJrIgIkgICAgAAgAkHYAGogAUHQAGoQy4GAgAAgAiACKAJ8QQAgAi0AgAEiA2siBHE2AvwBIAIgAigCeCAEcTYC+AEgAiACKAJ0IARxNgL0ASACIAIoAnAgBHE2AvABIAIgAigCbCAEcTYC7AEgAiACKAJoIARxNgLoASACIAIoAmQgBHE2AuQBIAIgAigCYCAEcTYC4AEgAiACKAJcIARxNgLcASACIAIoAlggBHE2AtgBIAJBIGoiBCABQSBqKQIANwMAIAJBGGoiBSABQRhqKQIANwMAIAJBEGoiBiABQRBqKQIANwMAIAJBCGoiByABQQhqKQIANwMAIAIgASkCADcDACACQYACaiACIAJB2AFqELGBgIAAIAQgAUHIAGopAgA3AwAgBSABQcAAaikCADcDACAGIAFBOGopAgA3AwAgByABQTBqKQIANwMAIAIgASkCKDcDACACQagCaiACIAJB2AFqELGBgIAAIAJBhAFqIAJBgAJqELSBgIAAIAJBrAFqIAJBqAJqELSBgIAAIAJBADoA1AECQEHUAEUiAQ0AIAIgAkGEAWpB1AD8CgAACyACIAM6AFQjgYCAgAAhBAJAIAENACACQYQBaiAEQeS4wIAAakHUAPwKAAALIAAgAkGEAWogAiADEKyBgIAAIAJB0AJqJICAgIAAC4sHATp/IAIoAgAhBCABKAIAIQUgAigCBCEGIAEoAgQhByACKAIIIQggASgCCCEJIAIoAgwhCiABKAIMIQsgAigCECEMIAEoAhAhDSACKAIUIQ4gASgCFCEPIAIoAhghECABKAIYIREgAigCHCESIAEoAhwhEyACKAIgIRQgASgCICEVIAIoAiQhFiABKAIkIRcgAigCKCEYIAEoAighGSACKAIsIRogASgCLCEbIAIoAjAhHCABKAIwIR0gAigCNCEeIAEoAjQhHyACKAI4ISAgASgCOCEhIAIoAjwhIiABKAI8ISMgAigCQCEkIAEoAkAhJSACKAJEISYgASgCRCEnIAIoAkghKCABKAJIISkgAigCTCEqIAEoAkwhKyACKAJQISwgASgCUCEtIAIoAlQhLiABKAJUIS8gAigCWCEwIAEoAlghMSACKAJcITIgASgCXCEzIAIoAmAhNCABKAJgITUgAigCZCE2IAEoAmQhNyACKAJoITggASgCaCE5IAIoAmwhOiABKAJsITsgAigCcCE8IAEoAnAhPSAAIAIoAnQgASgCdCICc0EAIANB/wFxayIBcSACczYCdCAAID0gPCA9cyABcXM2AnAgACA7IDogO3MgAXFzNgJsIAAgOSA4IDlzIAFxczYCaCAAIDcgNiA3cyABcXM2AmQgACA1IDQgNXMgAXFzNgJgIAAgMyAyIDNzIAFxczYCXCAAIDEgMCAxcyABcXM2AlggACAvIC4gL3MgAXFzNgJUIAAgLSAsIC1zIAFxczYCUCAAICsgKiArcyABcXM2AkwgACApICggKXMgAXFzNgJIIAAgJyAmICdzIAFxczYCRCAAICUgJCAlcyABcXM2AkAgACAjICIgI3MgAXFzNgI8IAAgISAgICFzIAFxczYCOCAAIB8gHiAfcyABcXM2AjQgACAdIBwgHXMgAXFzNgIwIAAgGyAaIBtzIAFxczYCLCAAIBkgGCAZcyABcXM2AiggACAXIBYgF3MgAXFzNgIkIAAgFSAUIBVzIAFxczYCICAAIBMgEiATcyABcXM2AhwgACARIBAgEXMgAXFzNgIYIAAgDyAOIA9zIAFxczYCFCAAIA0gDCANcyABcXM2AhAgACALIAogC3MgAXFzNgIMIAAgCSAIIAlzIAFxczYCCCAAIAcgBiAHcyABcXM2AgQgACAFIAQgBXMgAXFzNgIAC9ACAQN/I4CAgIAAQYABayICJICAgIAAIAJBCGpByABqIAFByABqKQIANwMAIAJBCGpBwABqIAFBwABqKQIANwMAIAJBCGpBOGogAUE4aikCADcDACACQQhqQTBqIAFBMGopAgA3AwAgAkEIakEIaiABQQhqKQIANwMAIAJBCGpBEGogAUEQaikCADcDACACQQhqQRhqIAFBGGopAgA3AwAgAkEIakEgaiABQSBqKQIANwMAIAIgASkCKDcDMCACIAEpAgA3AwggAkH4AGojgYCAgAAiA0Gct8CAAGoiBEEgaikCADcDACACQfAAaiAEQRhqKQIANwMAIAJB6ABqIARBEGopAgA3AwAgAkHgAGogBEEIaikCADcDACACIAQpAgA3A1ggACACQQhqIANBxLfAgABqIAEtAFAQ2YGAgAAQwoGAgAAgAkGAAWokgICAgAALoigBU38jgICAgABBsARrIgMkgICAgAAgA0HgA2pBIGoiBCABQSBqIgUpAgA3AwAgA0HgA2pBGGoiBiABQRhqIgcpAgA3AwAgA0HgA2pBEGoiCCABQRBqIgkpAgA3AwAgA0HgA2pBCGoiCiABQQhqIgspAgA3AwAgAyABKQIANwPgAyADIANB4ANqIAIQsYGAgAAgBCABQcgAaiIMKQIANwMAIAYgAUHAAGoiDSkCADcDACAIIAFBOGoiDikCADcDACAKIAFBMGoiDykCADcDACADIAEpAig3A+ADIANBKGogA0HgA2ogAkEoahCxgYCAACAEIAFB8ABqIhApAgA3AwAgBiABQegAaiIRKQIANwMAIAggAUHgAGoiEikCADcDACAKIAFB2ABqIhMpAgA3AwAgAyABKQJQNwPgAyADQYgEaiADQeADaiACQdAAahCxgYCAACADKAKIBCEEIAMoAowEIQYgAygCkAQhCCADKAKUBCEKIAMoApgEIRQgAygCnAQhFSADKAKgBCEWIAMoAqQEIRcgAygCqAQhGCADKAKsBCEZIAMoAgAhGiADKAIoIRsgAygCBCEcIAMoAiwhHSADKAIMIR4gAygCNCEfIAMoAhQhICADKAI8ISEgAygCHCEiIAMoAkQhIyADKAIkISQgAygCTCElIAMoAgghJiADKAIwIScgAygCECEoIAMoAjghKSADKAIYISogAygCQCErIAMoAiAhLCADKAJIIS0gDygCACEPIAsoAgAhCyAOKAIAIQ4gCSgCACEJIA0oAgAhDSAHKAIAIQcgDCgCACEMIAUoAgAhBSABKAIoIS4gASgCACEvIAEoAiwhMCABKAIEITEgASgCNCEyIAEoAgwhMyABKAI8ITQgASgCFCE1IAEoAkQhNiABKAIcITcgAyABKAJMIjggASgCJCI5ajYC3AMgAyAMIAVqNgLYAyADIDYgN2o2AtQDIAMgDSAHajYC0AMgAyA0IDVqNgLMAyADIA4gCWo2AsgDIAMgMiAzajYCxAMgAyAPIAtqNgLAAyADIDAgMWo2ArwDIAMgLiAvajYCuAMgAigCKCE6IAIoAgAhOyACKAIsITwgAigCBCE9IAIoAjAhPiACKAIIIT8gAigCNCFAIAIoAgwhQSACKAI4IUIgAigCECFDIAIoAjwhRCACKAIUIUUgAigCQCFGIAIoAhghRyACKAJEIUggAigCHCFJIAIoAkghSiACKAIgIUsgAyACKAJMIkwgAigCJCJNajYChAQgAyBKIEtqNgKABCADIEggSWo2AvwDIAMgRiBHajYC+AMgAyBEIEVqNgL0AyADIEIgQ2o2AvADIAMgQCBBajYC7AMgAyA+ID9qNgLoAyADIDwgPWo2AuQDIAMgOiA7ajYC4AMgA0GQA2ogA0G4A2ogA0HgA2oQsYGAgAAgA0HQAGpBIGoiTiADKAKwAyAsIC1qa0H6//+/AWo2AgAgA0HQAGpBGGoiTyADKAKoAyAqICtqa0H6//+/AWo2AgAgA0HQAGpBEGoiUCADKAKgAyAoIClqa0H6//+/AWo2AgAgA0HQAGpBCGoiUSADKAKYAyAmICdqa0H6//+/AWo2AgAgAyADKAK0AyAkICVqa0H6//8LajYCdCADIAMoAqwDICIgI2prQfr//78BajYCbCADIAMoAqQDICAgIWprQfr//78BajYCZCADIAMoApwDIB4gH2prQfr//78BajYCXCADIAMoApQDIBwgHWprQfr8/78BajYCVCADIAMoApADIBogG2prQZrS/78BajYCUCADIDggASgCdCJSajYC3AMgAyAMIBAoAgAiEGo2AtgDIAMgNiABKAJsIgxqNgLUAyADIA0gESgCACI2ajYC0AMgAyA0IAEoAmQiDWo2AswDIAMgDiASKAIAIjRqNgLIAyADIDIgASgCXCIOajYCxAMgAyAPIBMoAgAiMmo2AsADIAMgMCABKAJUIg9qNgK8AyADIC4gASgCUCIBajYCuAMgAyBMIAIoAnQiLmo2AoQEIAMgSiACKAJwIjBqNgKABCADIEggAigCbCJKajYC/AMgAyBGIAIoAmgiSGo2AvgDIAMgRCACKAJkIkZqNgL0AyADIEIgAigCYCJEajYC8AMgAyBAIAIoAlwiQmo2AuwDIAMgPiACKAJYIkBqNgLoAyADIDwgAigCVCI+ajYC5AMgAyA6IAIoAlAiAmo2AuADIANBkANqIANBuANqIANB4ANqELGBgIAAIAMoApADITogAygClAMhPCADKAKYAyERIAMoApwDIRIgAygCoAMhEyADKAKkAyE4IAMoAqgDIUwgAygCrAMhUyADKAKwAyFUIAMoArQDIVUgAyBSIDlqNgLcAyADIBAgBWo2AtgDIAMgDCA3ajYC1AMgAyA2IAdqNgLQAyADIA0gNWo2AswDIAMgNCAJajYCyAMgAyAOIDNqNgLEAyADIDIgC2o2AsADIAMgDyAxajYCvAMgAyABIC9qNgK4AyADIC4gTWo2AoQEIAMgMCBLajYCgAQgAyBKIElqNgL8AyADIEggR2o2AvgDIAMgRiBFajYC9AMgAyBEIENqNgLwAyADIEIgQWo2AuwDIAMgQCA/ajYC6AMgAyA+ID1qNgLkAyADIAIgO2o2AuADIANBkANqIANBuANqIANB4ANqELGBgIAAIAMgAygCtAMgGSAkamtB+v//C2o2ApwBIAMgAygCsAMgGCAsamtB+v//vwFqNgKYASADIAMoAqwDIBcgImprQfr//78BajYClAEgAyADKAKoAyAWICpqa0H6//+/AWo2ApABIAMgAygCpAMgFSAgamtB+v//vwFqNgKMASADIAMoAqADIBQgKGprQfr//78BajYCiAEgAyADKAKcAyAKIB5qa0H6//+/AWo2AoQBIAMgAygCmAMgCCAmamtB+v//vwFqNgKAASADIAMoApQDIAYgHGprQfr8/78BajYCfCADIAMoApADIAQgGmprQZrS/78BajYCeCADKAKIBCEBIAMoAowEIQIgAygCkAQhGiADKAKUBCEcIAMoApgEIR4gAygCnAQhICADKAKgBCEiIAMoAqQEISQgAygCqAQhJiADIAMoAqwEQRVsNgKEBCADICZBFWw2AoAEIAMgJEEVbDYC/AMgAyAiQRVsNgL4AyADICBBFWw2AvQDIAMgHkEVbDYC8AMgAyAcQRVsNgLsAyADIBpBFWw2AugDIAMgAkEVbDYC5AMgAyABQRVsNgLgAyADQaABaiADQeADahCvgYCAACADKAKgASEBIAMoAighAiADKAKkASEaIAMoAiwhHCADKAKoASEeIAMoAjAhICADKAKsASEiIAMoAjQhJCADKAKwASEmIAMoAjghKCADKAK0ASEqIAMoAjwhLCADKAK4ASEPIAMoAkAhCyADKAK8ASEOIAMoAkQhCSADKALAASENIAMoAkghByADIAMoAkwiDCADKALEASIFa0H8//8HajYC7AEgAyAHIA1rQfz///8AajYC6AEgAyAJIA5rQfz///8AajYC5AEgAyALIA9rQfz///8AajYC4AEgAyAsICprQfz///8AajYC3AEgAyAoICZrQfz///8AajYC2AEgAyAkICJrQfz///8AajYC1AEgAyAgIB5rQfz///8AajYC0AEgAyAcIBprQfz9//8AajYCzAEgAyACIAFrQbzh//8AajYCyAEgA0HwAWpBIGoiLiAHIA1qNgIAIANB8AFqQRhqIg0gCyAPajYCACADQfABakEQaiIPICggJmo2AgAgA0HwAWpBCGoiJiAgIB5qNgIAIAMgDCAFajYClAIgAyAJIA5qNgKMAiADICwgKmo2AoQCIAMgJCAiajYC/AEgAyAcIBpqNgL0ASADIAIgAWo2AvABIAMgVSAZICVqa0H6//8LaiIZQQdsNgKEBCADIFQgGCAtamtB+v//vwFqIhhBB2w2AoAEIAMgUyAXICNqa0H6//+/AWoiF0EHbDYC/AMgAyBMIBYgK2prQfr//78BaiIaQQdsNgL4AyADIDggFSAhamtB+v//vwFqIhxBB2w2AvQDIAMgEyAUIClqa0H6//+/AWoiHkEHbDYC8AMgAyASIAogH2prQfr//78BaiIfQQdsNgLsAyADIBEgCCAnamtB+v//vwFqIiBBB2w2AugDIAMgPCAGIB1qa0H6/P+/AWoiHUEHbDYC5AMgAyA6IAQgG2prQZrS/78BaiIbQQdsNgLgAyADQZgCaiADQeADahCvgYCAACADIAMoArwCQQNsNgKEBCADIAMoArgCQQNsNgKABCADIAMoArQCQQNsNgL8AyADIAMoArACQQNsNgL4AyADIAMoAqwCQQNsNgL0AyADIAMoAqgCQQNsNgLwAyADIAMoAqQCQQNsNgLsAyADIAMoAqACQQNsNgLoAyADIAMoApwCQQNsNgLkAyADIAMoApgCQQNsNgLgAyADQbgDaiADQeADahCvgYCAACADKAIAIQEgAygCBCECIAMoAgghBCADKAIMIQYgAygCECEIIAMoAhQhCiADKAIYIRQgAygCHCEVIAMoAiAhFiADIAMoAiQiIUEJbDYCtAMgAyAWQQlsNgKwAyADIBVBCWw2AqwDIAMgFEEJbDYCqAMgAyAKQQlsNgKkAyADIAhBCWw2AqADIAMgBkEJbDYCnAMgAyAEQQlsNgKYAyADIAJBCWw2ApQDIAMgAUEJbDYCkAMgA0HoAmogA0GQA2oQr4GAgAAgAyADKAKMA0EHbDYC5AIgAyADKAKIA0EHbDYC4AIgAyADKAKEA0EHbDYC3AIgAyADKAKAA0EHbDYC2AIgAyADKAL8AkEHbDYC1AIgAyADKAL4AkEHbDYC0AIgAyADKAL0AkEHbDYCzAIgAyADKALwAkEHbDYCyAIgAyADKALsAkEHbDYCxAIgAyADKALoAkEHbDYCwAIgA0HgA2ogA0HAAmoQr4GAgAAgA0GQA2pBIGogTikCADcDACADQZADakEYaiBPKQIANwMAIANBkANqQRBqIFApAgA3AwAgA0GQA2pBCGogUSkCADcDACADIAMpAlA3A5ADIANB6AJqIANBkANqIANByAFqELGBgIAAIANBkANqIANBuANqIANB+ABqELGBgIAAIAMoApADISIgAygC6AIhIyADKAKUAyEkIAMoAuwCISUgAygCmAMhJyADKALwAiEoIAMoApwDISkgAygC9AIhKiADKAKgAyErIAMoAvgCISwgAygCpAMhLSADKAL8AiELIAMoAqgDIQ4gAygCgAMhCSADKAKsAyEHIAMoAoQDIQwgAygCsAMhBSADKAKIAyEvIAMgAygCjAMgAygCtANrQfz//wdqNgLcAyADIC8gBWtB/P///wBqNgLYAyADIAwgB2tB/P///wBqNgLUAyADIAkgDmtB/P///wBqNgLQAyADIAsgLWtB/P///wBqNgLMAyADICwgK2tB/P///wBqNgLIAyADICogKWtB/P///wBqNgLEAyADICggJ2tB/P///wBqNgLAAyADICUgJGtB/P3//wBqNgK8AyADICMgImtBvOH//wBqNgK4AyAAIANBuANqEK+BgIAAIANBuANqQSBqIC4pAgA3AwAgA0G4A2pBGGogDSkCADcDACADQbgDakEQaiAPKQIANwMAIANBuANqQQhqICYpAgA3AwAgAyADKQLwATcDuAMgA0GQA2ogA0G4A2ogA0HIAWoQsYGAgAAgA0G4A2ogA0HgA2ogA0H4AGoQsYGAgAAgAygCkAMhIiADKAK4AyEjIAMoApQDISQgAygCvAMhJSADKAKYAyEmIAMoAsADIScgAygCnAMhKCADKALEAyEpIAMoAqADISogAygCyAMhKyADKAKkAyEsIAMoAswDIS0gAygCqAMhDyADKALQAyELIAMoAqwDIQ4gAygC1AMhCSADKAKwAyENIAMoAtgDIQcgAyADKALcAyADKAK0A2o2AoQEIAMgByANajYCgAQgAyAJIA5qNgL8AyADIAsgD2o2AvgDIAMgLSAsajYC9AMgAyArICpqNgLwAyADICkgKGo2AuwDIAMgJyAmajYC6AMgAyAlICRqNgLkAyADICMgImo2AuADIABBKGogA0HgA2oQr4GAgAAgAyAZNgKEBCADIBg2AoAEIAMgFzYC/AMgAyAaNgL4AyADIBw2AvQDIAMgHjYC8AMgAyAfNgLsAyADICA2AugDIAMgHTYC5AMgAyAbNgLgAyADQZADaiADQeADaiADQfABahCxgYCAACADICFBA2w2AoQEIAMgFkEDbDYCgAQgAyAVQQNsNgL8AyADIBRBA2w2AvgDIAMgCkEDbDYC9AMgAyAIQQNsNgLwAyADIAZBA2w2AuwDIAMgBEEDbDYC6AMgAyACQQNsNgLkAyADIAFBA2w2AuADIANBuANqIANB4ANqIANB0ABqELGBgIAAIAMoApADIQEgAygCuAMhAiADKAKUAyEEIAMoArwDIQYgAygCmAMhCCADKALAAyEKIAMoApwDIRQgAygCxAMhFSADKAKgAyEWIAMoAsgDIRcgAygCpAMhGCADKALMAyEZIAMoAqgDIRogAygC0AMhGyADKAKsAyEcIAMoAtQDIR0gAygCsAMhHiADKALYAyEfIAMgAygC3AMgAygCtANqNgKEBCADIB8gHmo2AoAEIAMgHSAcajYC/AMgAyAbIBpqNgL4AyADIBkgGGo2AvQDIAMgFyAWajYC8AMgAyAVIBRqNgLsAyADIAogCGo2AugDIAMgBiAEajYC5AMgAyACIAFqNgLgAyAAQdAAaiADQeADahCvgYCAACADQbAEaiSAgICAAAvKBQECfyOAgICAAEGgLmsiAySAgICAAAJAQfgARSIEDQAgA0GgEGogAUH4APwKAAALIANBsBFqIAJBGGopAgA3AgAgA0GoEWogAkEQaikCADcCACADQaARaiACQQhqKQIANwIAIAMgAikCADcCmBECQEGYAUUNACADQQhqIANBoBBqQZgB/AoAAAsjgYCAgABBxLfAgABqIQICQCAEDQAgA0GgH2ogAkH4APwKAAALAkAgBA0AIANBoB9qQfgAaiACQfgA/AoAAAsCQCAEDQAgA0GgH2pB8AFqIAJB+AD8CgAACwJAIAQNACADQaAfakHoAmogAkH4APwKAAALAkAgBA0AIANBoB9qQeADaiACQfgA/AoAAAsCQCAEDQAgA0GgH2pB2ARqIAJB+AD8CgAACwJAIAQNACADQaAfakHQBWogAkH4APwKAAALAkAgBA0AIANBoB9qQcgGaiACQfgA/AoAAAsCQCAEDQAgA0HgJmogAkH4APwKAAALAkAgBA0AIANB4CZqQfgAaiACQfgA/AoAAAsCQCAEDQAgA0HgJmpB8AFqIAJB+AD8CgAACwJAIAQNACADQeAmakHoAmogAkH4APwKAAALAkAgBA0AIANB4CZqQeADaiACQfgA/AoAAAsCQCAEDQAgA0HgJmpB2ARqIAJB+AD8CgAACwJAIAQNACADQeAmakHQBWogAkH4APwKAAALAkAgBA0AIANB4CZqQcgGaiACQfgA/AoAAAsCQEHAB0UiBA0AIANBoBBqIANBoB9qQcAH/AoAAAsCQCAEDQAgA0GgEGpBwAdqIANB4CZqQcAH/AoAAAsCQEGAD0UNACADQaABaiADQaAQakGAD/wKAAALAkBBwgBFDQAgA0GgEGpBAEHCAPwLAAsgACADQQhqQQEgA0GgAWpBASADQaAQakEBEMmBgIAAIANBoC5qJICAgIAACwwAIAAgARDBgYCAAAvRCQEMfyOAgICAAEHwAmsiAySAgICAACOBgICAACEEAkBB+ABFIgUNACADQQhqIARBuLnAgABqQfgA/AoAAAsgA0H4AWogA0EIaiABIAIgAsBBB3UiBHMgBGtB/wFxIgRBAUYQ2YGAgAAQwoGAgAACQCAFDQAgA0EIaiADQfgBakH4APwKAAALIANB+AFqIANBCGogAUH4AGogBEECRhDZgYCAABDCgYCAAAJAIAUNACADQQhqIANB+AFqQfgA/AoAAAsgA0H4AWogA0EIaiABQfABaiAEQQNGENmBgIAAEMKBgIAAAkAgBQ0AIANBCGogA0H4AWpB+AD8CgAACyADQfgBaiADQQhqIAFB6AJqIARBBEYQ2YGAgAAQwoGAgAACQCAFDQAgA0EIaiADQfgBakH4APwKAAALIANB+AFqIANBCGogAUHgA2ogBEEFRhDZgYCAABDCgYCAAAJAIAUNACADQQhqIANB+AFqQfgA/AoAAAsgA0H4AWogA0EIaiABQdgEaiAEQQZGENmBgIAAEMKBgIAAAkAgBQ0AIANBCGogA0H4AWpB+AD8CgAACyADQfgBaiADQQhqIAFB0AVqIARBB0YQ2YGAgAAQwoGAgAACQCAFDQAgA0EIaiADQfgBakH4APwKAAALIANB+AFqIANBCGogAUHIBmogBEEIRhDZgYCAABDCgYCAAAJAIAUNACADQQhqIANB+AFqQfgA/AoAAAsgAkGAAXFBB3YQ2YGAgAAhASADQYABakEgaiADQQhqQSBqKQIANwMAIANBgAFqQRhqIANBCGpBGGopAgA3AwAgA0GAAWpBEGogA0EIakEQaikCADcDACADQYABakEIaiADQQhqQQhqKQIANwMAIAMgAykCCDcDgAEgAygCUCEEIAMoAkwhAiADKAJIIQYgAygCRCEHIAMoAkAhCCADKAI8IQkgAygCOCEKIAMoAjQhCyADKAIwIQwgAygCVCENIANBgAFqQfAAaiADQQhqQfAAaikCADcDACADQYABakHoAGogA0EIakHoAGopAgA3AwAgA0GAAWpB4ABqIANBCGpB4ABqKQIANwMAIANBgAFqQdgAaiADQQhqQdgAaikCADcDACADIAMpAlg3A9ABIANB/P//ByANayINQRZ2Ig5B0QdsIAxrQbzh//8AaiIMQf///x9xNgKoASADIA5BBnQgC2sgDEEadmpB/P3//wBqIgtB////H3E2AqwBIAMgC0EadiAKa0H8////AGoiCkH///8fcTYCsAEgAyAKQRp2IAlrQfz///8AaiIJQf///x9xNgK0ASADIAlBGnYgCGtB/P///wBqIghB////H3E2ArgBIAMgCEEadiAHa0H8////AGoiB0H///8fcTYCvAEgAyAHQRp2IAZrQfz///8AaiIGQf///x9xNgLAASADIAZBGnYgAmtB/P///wBqIgJB////H3E2AsQBIAMgAkEadiAEa0H8////AGoiBEH///8fcTYCyAEgAyAEQRp2IA1B////AXFqNgLMASADQfgBaiADQQhqIANBgAFqIAEQ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fEL/////D1atIAc1Ajx8Qv////8PVq0gJjUCAHxC/////w9WGyAHNQJEfUL/////B3xCIIinENqBgIAAISIgISAgKQMANwMAIB8gHikDADcDACAaIB0pAwA3AwAgByAHKQMINwOAFSAHQYACaiAHQYAVaiAcELaBgIAAIAdBwAFqIAdBCGogB0GAAmogGxDAgYCAACAhICcpAgA3AwAgHyAlKQIANwMAIBogIykCADcDACAHIAcpAuAUNwOAFSAHQbALaiAHQYAVaiAcELaBgIAAIAdB4AFqIAdBKGogB0GwC2ogIhDAgYCAACAHQbgKakEgaiApKQIANwMAIAdBuApqQRhqICopAgA3AwAgB0G4CmpBEGogKykCADcDACAHQbgKakEIaiAsKQIANwMAIAcgCCkCADcDuAogLSgCACEcIAhBxABqKAIAIR0gLigCACEeIAhBPGooAgAhICAvKAIAISMgCEE0aigCACEkIDAoAgAhJSAIQSxqKAIAISYgMSgCACEnIAhBzABqKAIAISkgDEEgaiA2KQIANwIAIAxBGGogNSkCADcCACAMQRBqIDQpAgA3AgAgDEEIaiAzKQIANwIAIAwgMikCADcCACAHQfz//wcgKWsiKUEWdiIqQdEHbCAna0G84f//AGoiJ0H///8fcTYC4AogByAqQQZ0ICZrICdBGnZqQfz9//8AaiImQf///x9xNgLkCiAHICZBGnYgJWtB/P///wBqIiVB////H3E2AugKIAcgJUEadiAka0H8////AGoiJEH///8fcTYC7AogByAkQRp2ICNrQfz///8AaiIjQf///x9xNgLwCiAHICNBGnYgIGtB/P///wBqIiBB////H3E2AvQKIAcgIEEadiAea0H8////AGoiHkH///8fcTYC+AogByAeQRp2IB1rQfz///8AaiIdQf///x9xNgL8CiAHIB1BGnYgHGtB/P///wBqIhxB////H3E2AoALIAcgHEEadiApQf///wFxajYChAsgB0HACWogCCAHQbgKaiAbEMKBgIAAAkBB+ABFIggNACAHQYAVaiAHQcAJakH4APwKAAALAkAgCA0AIBUgB0HACWpB+AD8CgAACwJAIAgNACAUIAdBwAlqQfgA/AoAAAsCQCAIDQAgEyAHQcAJakH4APwKAAALAkAgCA0AIBIgB0HACWpB+AD8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A2xqIA5B0QdsIBpB////H3EiJkEDbGoiJ0EadmoiKUEadiAQQf///x9xIipBA2xqIhpB////H3FrQfz///8AajYCACAHQbgKakEQaiIQIAdByABqQRBqIg4oAgAiKyAaQRp2IBFB////H3EiLEEDbGoiLUEadiASQf///x9xIi5BA2xqIh9B////H3FrQfz///8AajYCACAHQbgKakEYaiIRIAdByABqQRhqIhooAgAiLyAfQRp2IDVB////H3EiNUEDbGoiMEEadiA2Qf///x9xIjZBA2xqIjFB////H3FrQfz///8AajYCACAHQbgKakEgaiISIAdByABqQSBqIh8oAgAiKCAxQRp2ICJB////H3EiIkEDbGoiMUEadiAPQf///x9xIg9BA2xqIgFB////H3FrQfz///8AajYCACAHIAcoAkgiCSAnQf///x9xa0G84f//AGo2ArgKIAcgBygCTCInIClB////H3FrQfz9//8AajYCvAogByAHKAJUIikgLUH///8fcWtB/P///wBqNgLECiAHIAcoAlwiLSAwQf///x9xa0H8////AGo2AswKIAcgBygCZCIwIDFB////H3FrQfz///8AajYC1AogByAHKAJsIjEgJEH///8BcSABQRp2amtB/P//B2o2AtwKIAcgIyAxajYCjBQgByAPIChqNgKIFCAHICIgMGo2AoQUIAcgNiAvajYCgBQgByA1IC1qNgL8EyAHIC4gK2o2AvgTIAcgLCApajYC9BMgByAqIDRqNgLwEyAHICUgJ2o2AuwTIAcgJiAJajYC6BMgCCAfKQIANwMAIBsgGikCADcDACALIA4pAgA3AwAgDCANKQIANwMAIAcgBykCSDcDsAsgB0GAFWogB0GwC2ogB0HACWoQsYGAgAAgBygCoBUhNCAHKAKcFSE1IAcoApgVITYgBygClBUhIiAHKAKQFSEPIAcoAowVISMgBygCiBUhJCAHKAKAFSElIAcoAqQVISYgBygChBUhJyAHIDNBAXQ2AtQLIAcgMkEBdDYC0AsgByAgQQF0NgLMCyAHIB5BAXQ2AsgLIAcgHUEBdDYCxAsgByAYQQF0NgLACyAHIBdBAXQ2ArwLIAcgHEEBdDYCuAsgByAWQQF0NgK0CyAHIBVBAXQ2ArALIAdBgBVqIAdBsAtqIAdBuApqELGBgIAAIAdBgAJqQSBqIBIpAgA3AwAgB0GAAmpBGGogESkCADcDACAHQYACakEQaiAQKQIANwMAIAdBgAJqQQhqICEpAgA3AwAgByAHKQK4CjcDgAIgB0GwC2ogB0GAAmogB0HoE2oQsYGAgAAgBygC0AshFSAHKALMCyEWIAcoAsgLIRwgBygCxAshFyAHKALACyEYIAcoArwLIR0gBygCuAshHiAHKAK0CyEgIAcoArALITIgBygC1AshMyAIIB8pAgA3AwAgGyAaKQIANwMAIAsgDikCADcDACAMIA0pAgA3AwAgByAHKQJINwOwCyAHQYACaiAHQbALaiAZELGBgIAAIAdBsAtqIAdBgAJqIBQQsYGAgAAgByAHKALUC0EDdCIIQRZ2IhtB0QdsIAcoArALQQN0aiILQf///x9xNgLQFSAHIBtBBnQgBygCtAtBA3RqIAtBGnZqIhtB////H3E2AtQVIAcgMiAmQRhsIgtBFnYiDEHRB2wgJUEYbGoiDUH///8fcUEHbGogMyAMQQZ0ICdBGGxqIA1BGnZqIgxBGnYgJEEYbGoiDUEadiAjQRhsaiIOQRp2IA9BGGxqIhpBGnYgIkEYbGoiH0EadiA2QRhsaiIyQRp2IDVBGGxqIjVBGnYgNEEYbGoiNEEadiALQfj//wFxakEHbGoiC0EWdiIzQdEHbGoiNkH///8fcTYCqBUgByAbQRp2IAcoArgLQQN0aiIbQf///x9xNgLYFSAHICAgDEH///8fcUEHbGogM0EGdGogNkEadmoiDEH///8fcTYCrBUgByAbQRp2IAcoArwLQQN0aiIbQf///x9xNgLcFSAHIB4gDUH///8fcUEHbGogDEEadmoiDEH///8fcTYCsBUgByAbQRp2IAcoAsALQQN0aiIbQf///x9xNgLgFSAHIB0gDkH///8fcUEHbGogDEEadmoiDEH///8fcTYCtBUgByAbQRp2IAcoAsQLQQN0aiIbQf///x9xNgLkFSAHIBggGkH///8fcUEHbGogDEEadmoiDEH///8fcTYCuBUgByAbQRp2IAcoAsgLQQN0aiIbQf///x9xNgLoFSAHIBcgH0H///8fcUEHbGogDEEadmoiDEH///8fcTYCvBUgByAbQRp2IAcoAswLQQN0aiIbQf///x9xNgLsFSAHIBwgMkH///8fcUEHbGogDEEadmoiDEH///8fcTYCwBUgByAbQRp2IAcoAtALQQN0aiIbQf///x9xNgLwFSAHIBYgNUH///8fcUEHbGogDEEadmoiDEH///8fcTYCxBUgByAbQRp2IAhB+P//AXFqNgL0FSAHIBUgNEH///8fcUEHbGogDEEadmoiCEH///8fcTYCyBUgByAIQRp2IAtB////AXFqNgLMFQJAQfgARSILDQAgB0HwEmogB0GAFWpB+AD8CgAACyATQX9qIhMNAAsgCkF/aiEKAkAgAkUNACAHQbgKaiAKaiEOIAdBwAlqIApqIRpBACEbIAUhCCADIQwDQCAGIBtGDQQgB0HACWpBIGogCEEgai0AADoAACAHQcAJakEYaiAIQRhqKQAANwMAIAdBwAlqQRBqIAhBEGopAAA3AwAgB0HACWpBCGogCEEIaikAADcDACAHIAgpAAA3A8AJIBIgCEHBAGotAAA6AAAgESAIQTlqKQAANwMAIBAgCEExaikAADcDACAhIAhBKWopAAA3AwAgByAIQSFqKQAANwO4CiAEIBtGDQMCQEHAB0UiDQ0AIAdBsAtqIAxBwAf8CgAACwJAIA0NACAHQYAVaiAMQcAHakHAB/wKAAALIAdB6BNqIAdBsAtqIBotAAAQx4GAgAAgB0GAAmogB0HwEmogB0HoE2oQxIGAgAACQCALDQAgB0HwEmogB0GAAmpB+AD8CgAACyAHQegTaiAHQYAVaiAOLQAAEMeBgIAAIAdBgAJqIAdB8BJqIAdB6BNqEMSBgIAAAkAgCw0AIAdB8BJqIAdBgAJqQfgA/AoAAAsgCEHCAGohCCAMQYAPaiEMIAIgG0EBaiIbRw0ACwsgCg0ACwJAQfgARQ0AIAAgB0HwEmpB+AD8CgAACyAHQcAcaiSAgICAAA8LIAQgBCOBgICAAEHY+8GAAGoQzIOAgAAACyAGIAYjgYCAgABByPvBgABqEMyDgIAAAAuTPwcGfwF+AX8BfgZ/A34CfyOAgICAAEGQBGsiAiSAgICAACACQcADakEgaiIDIAFBIGopAgA3AwAgAkHAA2pBGGoiBCABQRhqKQIANwMAIAJBwANqQRBqIgUgAUEQaikCADcDACACQcADakEIaiIGIAFBCGopAgA3AwAgAiABKQIANwPAAyACQegDaiACQcADahCygYCAACADIAJB6ANqQSBqIgcpAgAiCDcDACAEIAJB6ANqQRhqIgkpAgAiCjcDACACQZgDakEIaiILIAJB6ANqQQhqIgwpAgA3AwAgAkGYA2pBEGoiDSACQegDakEQaiIOKQIANwMAIAJBmANqQRhqIg8gCjcDACACQZgDakEgaiIQIAg3AwAgAiACKQLoAyIINwPAAyACIAg3A5gDIAJBCGogAkGYA2ogARCxgYCAACADIAJBCGpBIGopAgA3AwAgBCACQQhqQRhqKQIANwMAIAUgAkEIakEQaikCADcDACAGIAJBCGpBCGopAgA3AwAgAiACKQIINwPAAyACQegDaiACQcADahCygYCAACADIAcpAgAiCDcDACAEIAkpAgAiCjcDACALIAwpAgA3AwAgDSAOKQIANwMAIA8gCjcDACAQIAg3AwAgAiACKQLoAyIINwPAAyACIAg3A5gDIAJBMGogAkGYA2ogARCxgYCAACADIAJBMGpBIGopAgA3AwAgBCACQTBqQRhqKQIANwMAIAUgAkEwakEQaikCADcDACAGIAJBMGpBCGopAgA3AwAgAiACKQIwNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCACIINwMAIAQgCSkCACIKNwMAIAsgDCkCADcDACANIA4pAgA3AwAgDyAKNwMAIBAgCDcDACACIAIpAugDIgg3A8ADIAIgCDcDmAMgAkHYAGogAkGYA2ogAkEwahCxgYCAACADIAJB2ABqQSBqKQIANwMAIAQgAkHYAGpBGGopAgA3AwAgBSACQdgAakEQaikCADcDACAGIAJB2ABqQQhqKQIANwMAIAIgAikCWDcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgAiCDcDACAEIAkpAgAiCjcDACALIAwpAgA3AwAgDSAOKQIANwMAIA8gCjcDACAQIAg3AwAgAiACKQLoAyIINwPAAyACIAg3A5gDIAJBgAFqIAJBmANqIAJBMGoQsYGAgAAgAyACQYABakEgaikCADcDACAEIAJBgAFqQRhqKQIANwMAIAUgAkGAAWpBEGopAgA3AwAgBiACQYABakEIaikCADcDACACIAIpAoABNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIAIgg3AwAgBCAJKQIAIgo3AwAgCyAMKQIANwMAIA0gDikCADcDACAPIAo3AwAgECAINwMAIAIgAikC6AMiCDcDwAMgAiAINwOYAyACQagBaiACQZgDaiACQQhqELGBgIAAIAMgAkGoAWpBIGopAgA3AwAgBCACQagBakEYaikCADcDACAFIAJBqAFqQRBqKQIANwMAIAYgAkGoAWpBCGopAgA3AwAgAiACKQKoATcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCACIINwMAIAQgCSkCACIKNwMAIAsgDCkCADcDACANIA4pAgA3AwAgDyAKNwMAIBAgCDcDACACIAIpAugDIgg3A8ADIAIgCDcDmAMgAkHQAWogAkGYA2ogAkGoAWoQsYGAgAAgAyACQdABakEgaikCADcDACAEIAJB0AFqQRhqKQIANwMAIAUgAkHQAWpBEGopAgA3AwAgBiACQdABakEIaikCADcDACACIAIpAtABNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAcpAgAiCDcDACAEIAkpAgAiCjcDACALIAwpAgA3AwAgDSAOKQIANwMAIA8gCjcDACAQIAg3AwAgAiACKQLoAyIINwPAAyACIAg3A5gDIAJB+AFqIAJBmANqIAJB0AFqELGBgIAAIAMgAkH4AWpBIGopAgA3AwAgBCACQfgBakEYaikCADcDACAFIAJB+AFqQRBqKQIANwMAIAYgAkH4AWpBCGopAgA3AwAgAiACKQL4ATcDwANBLCELA0AgAkHoA2ogAkHAA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikC6AM3A8ADIAtBf2oiCw0ACyACQegDakEgaiIJIAJBwANqQSBqIgQpAwA3AwAgAkHoA2pBGGoiDCACQcADakEYaiIFKQMANwMAIAJB6ANqQRBqIg4gAkHAA2pBEGoiBikDADcDACACQegDakEIaiILIAJBwANqQQhqIgcpAwA3AwAgAiACKQPAAzcD6AMgAkGgAmogAkHoA2ogAkH4AWoQsYGAgAAgBCACQaACakEgaikCADcDACAFIAJBoAJqQRhqKQIANwMAIAYgAkGgAmpBEGopAgA3AwAgByACQaACakEIaikCADcDACACIAIpAqACNwPAA0HYACEDA0AgAkHoA2ogAkHAA2oQsoGAgAAgBCAJKQIANwMAIAUgDCkCADcDACAGIA4pAgA3AwAgByALKQIANwMAIAIgAikC6AM3A8ADIANBf2oiAw0ACyACQegDakEgaiIJIAJBwANqQSBqIgQpAwA3AwAgAkHoA2pBGGoiDCACQcADakEYaiIFKQMANwMAIAJB6ANqQRBqIg4gAkHAA2pBEGoiBikDADcDACACQegDakEIaiILIAJBwANqQQhqIgcpAwA3AwAgAiACKQPAAzcD6AMgAkHIAmogAkHoA2ogAkGgAmoQsYGAgAAgBCACQcgCakEgaikCADcDACAFIAJByAJqQRhqKQIANwMAIAYgAkHIAmpBEGopAgA3AwAgByACQcgCakEIaikCADcDACACIAIpAsgCNwPAA0EsIQMDQCACQegDaiACQcADahCygYCAACAEIAkpAgA3AwAgBSAMKQIANwMAIAYgDikCADcDACAHIAspAgA3AwAgAiACKQLoAzcDwAMgA0F/aiIDDQALIAJB6ANqQSBqIgQgAkHAA2pBIGoiAykDADcDACACQegDakEYaiIFIAJBwANqQRhqIgkpAwA3AwAgAkHoA2pBEGoiBiACQcADakEQaiIMKQMANwMAIAJB6ANqQQhqIgcgAkHAA2pBCGoiDikDADcDACACIAIpA8ADNwPoAyACQcADaiACQegDaiACQfgBahCxgYCAACACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCACIINwMAIAJBmANqQQhqIgsgBykCADcDACACQZgDakEQaiINIAYpAgA3AwAgAkGYA2pBGGoiDyAFKQIANwMAIAJBmANqQSBqIhAgCDcDACACIAIpAugDIgg3A8ADIAIgCDcDmAMgAkHAA2ogAkGYA2ogAkEwahCxgYCAACACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIAIgg3AwAgCyAHKQIANwMAIA0gBikCADcDACAPIAUpAgA3AwAgECAINwMAIAIgAikC6AMiCDcDwAMgAiAINwOYAyACQcADaiACQZgDaiACQdABahCxgYCAACACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpAugDNwPAAyACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikC6AM3A8ADIAJB6ANqIAJBwANqELKBgIAAIAMgBCkCACIINwMAIAsgBykCADcDACANIAYpAgA3AwAgDyAFKQIANwMAIBAgCDcDACACIAIpAugDIgg3A8ADIAIgCDcDmAMgAkHAA2ogAkGYA2ogAkEIahCxgYCAACACQegDaiACQcADahCygYCAACADIAQpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQLoAzcDwAMgAkHoA2ogAkHAA2oQsoGAgAAgAyAEKQIAIgg3AwAgAkHwAmpBCGoiDSAHKQIAIhE3AwAgAkHwAmpBEGoiDyAGKQIAIhI3AwAgAkHwAmpBGGoiECAFKQIAIhM3AwAgAkHwAmpBIGoiFCAINwMAIAIgAikC6AMiCjcDwAMgAiAKNwPwAiADIAg3AwAgCSATNwMAIAwgEjcDACAOIBE3AwAgAiAKNwPAAyACQegDaiACQcADaiACQfACahCxgYCAACAAIAEoAgQgAigC7ANrIAEoAiQgAigCjARrQfz//wdqIhVBFnYiA0EGdGogASgCACACKALoA2sgA0HRB2xqQbzh//8AaiIDQRp2akH8/f//AGoiBCADciABKAIIIAIoAvADayAEQRp2akH8////AGoiBXIgASgCDCACKAL0A2sgBUEadmpB/P///wBqIgZyIAEoAhAgAigC+ANrIAZBGnZqQfz///8AaiIHciABKAIUIAIoAvwDayAHQRp2akH8////AGoiCXIgASgCGCACKAKABGsgCUEadmpB/P///wBqIgxyIAEoAhwgAigChARrIAxBGnZqQfz///8AaiIOciABKAIgIAIoAogEayAOQRp2akH8////AGoiC3JB////H3EgC0EadiAVQf///wFxaiIBckUgBEHAAHMgA0HQB3NxIAFBgICAHnNxIAVxIAZxIAdxIAlxIAxxIA5xIAtxQf///x9GchDZgYCAADoAKCAAQSBqIBQpAwA3AgAgAEEYaiAQKQMANwIAIABBEGogDykDADcCACAAQQhqIA0pAwA3AgAgACACKQPwAjcCACACQZAEaiSAgICAAAuYPgUGfwF+AX8BfgZ/I4CAgIAAQeADayICJICAgIAAIAJBkANqQSBqIgMgAUEgaikCADcDACACQZADakEYaiIEIAFBGGopAgA3AwAgAkGQA2pBEGoiBSABQRBqKQIANwMAIAJBkANqQQhqIgYgAUEIaikCADcDACACIAEpAgA3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgAkG4A2pBIGoiBykCACIINwMAIAQgAkG4A2pBGGoiCSkCACIKNwMAIAJB6AJqQQhqIgsgAkG4A2pBCGoiDCkCADcDACACQegCakEQaiINIAJBuANqQRBqIg4pAgA3AwAgAkHoAmpBGGoiDyAKNwMAIAJB6AJqQSBqIhAgCDcDACACIAIpArgDIgg3A5ADIAIgCDcD6AIgAiACQegCaiABELGBgIAAIAMgAkEgaikCADcDACAEIAJBGGopAgA3AwAgBSACQRBqKQIANwMAIAYgAkEIaikCADcDACACIAIpAgA3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCACIINwMAIAQgCSkCACIKNwMAIAsgDCkCADcDACANIA4pAgA3AwAgDyAKNwMAIBAgCDcDACACIAIpArgDIgg3A5ADIAIgCDcD6AIgAkEoaiACQegCaiABELGBgIAAIAMgAkEoakEgaikCADcDACAEIAJBKGpBGGopAgA3AwAgBSACQShqQRBqKQIANwMAIAYgAkEoakEIaikCADcDACACIAIpAig3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIAIgg3AwAgBCAJKQIAIgo3AwAgCyAMKQIANwMAIA0gDikCADcDACAPIAo3AwAgECAINwMAIAIgAikCuAMiCDcDkAMgAiAINwPoAiACQdAAaiACQegCaiACQShqELGBgIAAIAMgAkHQAGpBIGopAgA3AwAgBCACQdAAakEYaikCADcDACAFIAJB0ABqQRBqKQIANwMAIAYgAkHQAGpBCGopAgA3AwAgAiACKQJQNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCACIINwMAIAQgCSkCACIKNwMAIAsgDCkCADcDACANIA4pAgA3AwAgDyAKNwMAIBAgCDcDACACIAIpArgDIgg3A5ADIAIgCDcD6AIgAkH4AGogAkHoAmogAkEoahCxgYCAACADIAJB+ABqQSBqKQIANwMAIAQgAkH4AGpBGGopAgA3AwAgBSACQfgAakEQaikCADcDACAGIAJB+ABqQQhqKQIANwMAIAIgAikCeDcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCACIINwMAIAQgCSkCACIKNwMAIAsgDCkCADcDACANIA4pAgA3AwAgDyAKNwMAIBAgCDcDACACIAIpArgDIgg3A5ADIAIgCDcD6AIgAkGgAWogAkHoAmogAhCxgYCAACADIAJBoAFqQSBqKQIANwMAIAQgAkGgAWpBGGopAgA3AwAgBSACQaABakEQaikCADcDACAGIAJBoAFqQQhqKQIANwMAIAIgAikCoAE3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgAiCDcDACAEIAkpAgAiCjcDACALIAwpAgA3AwAgDSAOKQIANwMAIA8gCjcDACAQIAg3AwAgAiACKQK4AyIINwOQAyACIAg3A+gCIAJByAFqIAJB6AJqIAJBoAFqELGBgIAAIAMgAkHIAWpBIGopAgA3AwAgBCACQcgBakEYaikCADcDACAFIAJByAFqQRBqKQIANwMAIAYgAkHIAWpBCGopAgA3AwAgAiACKQLIATcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIANwMAIAQgCSkCADcDACAFIA4pAgA3AwAgBiAMKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACADIAcpAgA3AwAgBCAJKQIANwMAIAUgDikCADcDACAGIAwpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgAyAHKQIAIgg3AwAgBCAJKQIAIgo3AwAgCyAMKQIANwMAIA0gDikCADcDACAPIAo3AwAgECAINwMAIAIgAikCuAMiCDcDkAMgAiAINwPoAiACQfABaiACQegCaiACQcgBahCxgYCAACADIAJB8AFqQSBqKQIANwMAIAQgAkHwAWpBGGopAgA3AwAgBSACQfABakEQaikCADcDACAGIAJB8AFqQQhqKQIANwMAIAIgAikC8AE3A5ADQSwhCwNAIAJBuANqIAJBkANqELKBgIAAIAMgBykCADcDACAEIAkpAgA3AwAgBSAOKQIANwMAIAYgDCkCADcDACACIAIpArgDNwOQAyALQX9qIgsNAAsgAkG4A2pBIGoiCSACQZADakEgaiIEKQMANwMAIAJBuANqQRhqIgwgAkGQA2pBGGoiBSkDADcDACACQbgDakEQaiIOIAJBkANqQRBqIgYpAwA3AwAgAkG4A2pBCGoiCyACQZADakEIaiIHKQMANwMAIAIgAikDkAM3A7gDIAJBmAJqIAJBuANqIAJB8AFqELGBgIAAIAQgAkGYAmpBIGopAgA3AwAgBSACQZgCakEYaikCADcDACAGIAJBmAJqQRBqKQIANwMAIAcgAkGYAmpBCGopAgA3AwAgAiACKQKYAjcDkANB2AAhAwNAIAJBuANqIAJBkANqELKBgIAAIAQgCSkCADcDACAFIAwpAgA3AwAgBiAOKQIANwMAIAcgCykCADcDACACIAIpArgDNwOQAyADQX9qIgMNAAsgAkG4A2pBIGoiCSACQZADakEgaiIEKQMANwMAIAJBuANqQRhqIgwgAkGQA2pBGGoiBSkDADcDACACQbgDakEQaiIOIAJBkANqQRBqIgYpAwA3AwAgAkG4A2pBCGoiCyACQZADakEIaiIHKQMANwMAIAIgAikDkAM3A7gDIAJBwAJqIAJBuANqIAJBmAJqELGBgIAAIAQgAkHAAmpBIGopAgA3AwAgBSACQcACakEYaikCADcDACAGIAJBwAJqQRBqKQIANwMAIAcgAkHAAmpBCGopAgA3AwAgAiACKQLAAjcDkANBLCEDA0AgAkG4A2ogAkGQA2oQsoGAgAAgBCAJKQIANwMAIAUgDCkCADcDACAGIA4pAgA3AwAgByALKQIANwMAIAIgAikCuAM3A5ADIANBf2oiAw0ACyACQbgDakEgaiIDIAJBkANqQSBqIgQpAwA3AwAgAkG4A2pBGGoiBSACQZADakEYaiIJKQMANwMAIAJBuANqQRBqIgYgAkGQA2pBEGoiDCkDADcDACACQbgDakEIaiIHIAJBkANqQQhqIg4pAwA3AwAgAiACKQOQAzcDuAMgAkGQA2ogAkG4A2ogAkHwAWoQsYGAgAAgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgAiCDcDACACQegCakEIaiILIAcpAgA3AwAgAkHoAmpBEGoiDSAGKQIANwMAIAJB6AJqQRhqIg8gBSkCADcDACACQegCakEgaiIQIAg3AwAgAiACKQK4AyIINwOQAyACIAg3A+gCIAJBkANqIAJB6AJqIAJBKGoQsYGAgAAgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCACIINwMAIAsgBykCADcDACANIAYpAgA3AwAgDyAFKQIANwMAIBAgCDcDACACIAIpArgDIgg3A5ADIAIgCDcD6AIgAkGQA2ogAkHoAmogAkHIAWoQsYGAgAAgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCADcDACAJIAUpAgA3AwAgDCAGKQIANwMAIA4gBykCADcDACACIAIpArgDNwOQAyACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCACIINwMAIAsgBykCADcDACANIAYpAgA3AwAgDyAFKQIANwMAIBAgCDcDACACIAIpArgDIgg3A5ADIAIgCDcD6AIgAkGQA2ogAkHoAmogARCxgYCAACACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIANwMAIAkgBSkCADcDACAMIAYpAgA3AwAgDiAHKQIANwMAIAIgAikCuAM3A5ADIAJBuANqIAJBkANqELKBgIAAIAQgAykCACIINwMAIAsgBykCADcDACANIAYpAgA3AwAgDyAFKQIANwMAIBAgCDcDACACIAIpArgDIgg3A5ADIAIgCDcD6AIgAkGQA2ogAkHoAmogAhCxgYCAACACQbgDaiACQZADahCygYCAACAEIAMpAgA3AwAgCSAFKQIANwMAIAwgBikCADcDACAOIAcpAgA3AwAgAiACKQK4AzcDkAMgAkG4A2ogAkGQA2oQsoGAgAAgBCADKQIAIgg3AwAgCyAHKQIANwMAIA0gBikCADcDACAPIAUpAgA3AwAgECAINwMAIAIgAikCuAMiCDcDkAMgAiAINwPoAiAAIAJB6AJqIAEQsYGAgAAgACABKAIEIAEoAiQiDUEWdiIDQQZ0aiADQdEHbCABKAIAaiIDQRp2aiIEIANyIARBGnYgASgCCGoiBXIgBUEadiABKAIMaiIGciAGQRp2IAEoAhBqIgdyIAdBGnYgASgCFGoiCXIgCUEadiABKAIYaiIMciAMQRp2IAEoAhxqIg5yIA5BGnYgASgCIGoiC3JB////H3EgC0EadiANQf///wFxaiIBckUgBEHAAHMgA0HQB3NxIAFBgICAHnNxIAVxIAZxIAdxIAlxIAxxIA5xIAtxQf///x9GchDZgYCAAEF/c0EBcRDZgYCAADoAKCACQeADaiSAgICAAAsZACABI4GAgIAAQdC7wIAAakEMEO+DgIAACxQAIAAoAgAgACgCBCABEMGDgIAAC10BAX8jgICAgABBEGsiAiSAgICAACACI5KAgIAArUIghiAArYQ3AwgjgYCAgAAhACABKAIAIAEoAgQgAEHvisCAAGogAkEIahC4g4CAACEBIAJBEGokgICAgAAgAQubAwEDfyOAgICAAEEgayICJICAgIAAIAIgADYCCEHAACEDQQEhBAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAC8AACAAQQJqLQAAQRB0ciIAQf8BcQ4XFgABAgMEBQYHCAkKCwwNDg8QERIVExQWC0ECIQQMFQtBAyEEDBQLQQQhBAwTC0EFIQQMEgtBBiEEDBELQQkhBAwQC0EKIQQMDwtBDCEEDA4LQTAhBAwNC0ExIQQMDAtBEiEEDAsLQRMhBAwKC0EUIQQMCQtBFSEEDAgLQRYhBAwHC0EXIQQMBgtBGCEEDAULQRohBAwEC0EeIQQMAwtBgAEhAwwBC0HAASEDCyAAQQt2QSBxIABBCHZyIANyIQQLIAIgBDoADyACI5OAgIAArUIghiACQQ9qrYQ3AxAgAiOJgICAAEHCgICAAGqtQiCGIAJBCGqthDcDGCOBgICAACEAIAEoAgAgASgCBCAAQdy7wIAAaiACQRBqELiDgIAAIQAgAkEgaiSAgICAACAACw8AIAAoAgAgARDRgYCAAAuLCAECfyOAgICAAEEgayICJICAgIAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAAtAAAOFwABAgMEBQYHCAkKCwwNDg8QERITFBUWAAsgASOBgICAAEHxu8CAAGpBBxDvg4CAACEADBYLIAEjgYCAgABB+LvAgABqQQcQ74OAgAAhAAwVCyABI4GAgIAAQf+7wIAAakEKEO+DgIAAIQAMFAsgASOBgICAAEGJvMCAAGpBDBDvg4CAACEADBMLIAEjgYCAgABBlbzAgABqQQQQ74OAgAAhAAwSCyABI4GAgIAAQZm8wIAAakEREO+DgIAAIQAMEQsgASOBgICAAEGqvMCAAGpBBBDvg4CAACEADBALIAEjgYCAgABBrrzAgABqQQoQ74OAgAAhAAwPCyABI4GAgIAAQbi8wIAAakEKEO+DgIAAIQAMDgsgASOBgICAAEHCvMCAAGpBCBDvg4CAACEADA0LIAEjgYCAgABByrzAgABqQQMQ74OAgAAhAAwMCyABI4GAgIAAQc28wIAAakENEO+DgIAAIQAMCwsgASOBgICAAEHavMCAAGpBDxDvg4CAACEADAoLIAEjgYCAgABB6bzAgABqQQ0Q74OAgAAhAAwJCyABI4GAgIAAQfa8wIAAakEOEO+DgIAAIQAMCAsgASOBgICAAEGEvcCAAGpBCRDvg4CAACEADAcLIAEjgYCAgABBjb3AgABqQQcQ74OAgAAhAAwGCyABI4GAgIAAQZS9wIAAakEPEO+DgIAAIQAMBQsgASOBgICAAEGjvcCAAGpBDRDvg4CAACEADAQLIAEjgYCAgABBsL3AgABqQQkQ74OAgAAhAAwDCyAALQACIQMgAiAALQABOgAPI4GAgIAAIQAgAiOJgICAAEHDgICAAGqtQiCGIABBqPzBgABqIANBA3RqrYQ3AxggAiOUgICAAK1CIIYgAkEPaq2ENwMQIAEoAgAgASgCBCAAQcefwIAAaiACQRBqELiDgIAAIQAMAgsgAC0AAiEDIAIgAC0AAToADyOBgICAACEAIAIjiYCAgABBw4CAgABqrUIghiAAQaj8wYAAaiADQQN0aq2ENwMYIAIjlICAgACtQiCGIAJBD2qthDcDECABKAIAIAEoAgQgAEHxn8CAAGogAkEQahC4g4CAACEADAELIAAtAAIhAyACIAAtAAE6AA8jgYCAgAAhACACI4mAgIAAQcOAgIAAaq1CIIYgAEGo/MGAAGogA0EDdGqthDcDGCACI5SAgIAArUIghiACQQ9qrYQ3AxAgASgCACABKAIEIABB3p/AgABqIAJBEGoQuIOAgAAhAAsgAkEgaiSAgICAACAAC0oBAX8gACgCACEAAkAgASgCCCICQYCAgBBxDQACQCACQYCAgCBxDQAgACABEM6DgIAADwsgACABENWDgIAADwsgACABENSDgIAAC0oBAX8gACgCACEAAkAgASgCCCICQYCAgBBxDQACQCACQYCAgCBxDQAgACABENGDgIAADwsgACABENeDgIAADwsgACABENaDgIAACw8AIAAoAgAgARDVgYCAAAvpAwMEfwF+An8jgICAgABBMGsiAiSAgICAAEEAIQMgAkEANgIYIAIgADYCICACQQhqIAJBGGoQ2IGAgAACQAJAIAIoAggNAANAIAIoAgxBAUcNAiADQQFqIQMgAkEIaiACQRhqENiBgIAAIAIoAghFDQALCyACIAIpAgw3AygjgYCAgAAiA0GhvsCAAGpBDSACQShqIANB2PzBgABqIANB6PzBgABqEICEgIAAAAsgAkEANgIUIAIgADYCECACQQA2AggjlYCAgAAhACABKAIAIQQgASgCBCEFIAJBGGogAkEIahDYgYCAAAJAAkAgAigCGA0AIACtQiCGIAJBKGqthCEGA0AgAigCHCIHQQFHDQIgAigCICEAIAIgAigCFCIBQQFqIgg2AhQgAiAANgIoIAIgBjcDGCAEIAUjgYCAgABB74rAgABqIAJBGGoQuIOAgAANAgJAIAFBf0YN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ayIDJICAgIAAAkACQAJAAkAgACgCCCIEIAAoAgRPDQAgACAEQQFqNgIIIAAoAgAgBGotAAAhBAwBCyADQQQ2AhQgA0EMaiAAIANBFGoQ3oGAgAAgAy0ADA0BIAMtAA0hBAsCQAJAAkACQAJAAkACQAJAAkACQAJAIARB/wFxQV5qDlQCAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAABQAAAAYAAAAAAAAABwAAAAgACQEACyADQQw2AhQgACADQRRqEN+BgIAAIQIMCwsgACABIAIQ4IGAgAAhAgwKCwJAIAIoAggiACACKAIARw0AIAIQs4OAgAALIAIoAgQgAGpBIjoAACACIABBAWo2AggMBwsCQCACKAIIIgAgAigCAEcNACACELODgIAACyACKAIEIABqQdwAOgAAIAIgAEEBajYCCAwGCwJAIAIoAggiACACKAIARw0AIAIQs4OAgAALIAIoAgQgAGpBLzoAACACIABBAWo2AggMBQsCQCACKAIIIgAgAigCAEcNACACELODgIAACyACKAIEIABqQQg6AAAgAiAAQQFqNgIIDAQLAkAgAigCCCIAIAIoAgBHDQAgAhCzg4CAAAsgAigCBCAAakEMOgAAIAIgAEEBajYCCAwDCwJAIAIoAggiACACKAIARw0AIAIQs4OAgAALIAIoAgQgAGpBCjoAACACIABBAWo2AggMAgsCQCACKAIIIgAgAigCAEcNACACELODgIAACyACKAIEIABqQQ06AAAgAiAAQQFqNgIIDAELAkAgAigCCCIAIAIoAgBHDQAgAhCzg4CAAAsgAigCBCAAakEJOgAAIAIgAEEBajYCCAtBACECDAELIAMoAhAhAgsgA0EgaiSAgICAACACC1wBAX8jgICAgABBEGsiAySAgICAACADQQhqIAEoAgAgASgCBCABKAIIEOOBgIAAIAIgAygCCCADKAIMEPGBgIAAIQEgAEEBOgAAIAAgATYCBCADQRBqJICAgIAAC1ABAX8jgICAgABBEGsiAiSAgICAACACQQhqIAAoAgAgACgCBCAAKAIIEOOBgIAAIAEgAigCCCACKAIMEPGBgIAAIQAgAkEQaiSAgICAACAAC5MOAQh/I4CAgIAAQSBrIgMkgICAgAAC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IAEgA0EEahDigYCAAAwHCwJAIAIoAggiCEUNACAFIARJDQUCQCAFIARrIgYgAigCACAIa00NACACIAggBkEBQQEQhoKAgAAgAigCCCEICwJAIAZFDQAgAigCBCAIaiAHIARqIAb8CgAACyABIAVBAWo2AgggAiAIIAZqIgE2AgggACABNgIIIABBATYCACAAIAIoAgQ2AgQMBwsgBSAESQ0HIABBADYCACAAIAUgBGs2AgggACAHIARqNgIEIAEgBUEBajYCCAwGCyAFIARJDQQCQCAFIARrIgYgAigCACACKAIIIghrTQ0AIAIgCCAGQQFBARCGgoCAACACKAIIIQgLAkAgBkUNACACKAIEIAhqIAcgBGogBvwKAAALIAEgBUEBajYCCCACIAggBmo2AgggAUEBIAIQ3YGAgAAiBUUNAAsgAEECNgIAIAAgBTYCBAwECyADQQQ2AgQgACABIANBBGoQ4oGAgAAMAwsgBSAGI4GAgIAAQbj9wYAAahDMg4CAAAALIAQgBSAGI4GAgIAAQcj9wYAAahDYg4CAAAALIAQgBSAGI4GAgIAAQej9wYAAahDYg4CAAAALIANBEGokgICAgAAPCyAEIAUgBiOBgICAAEHY/cGAAGoQ2IOAgAAAC2EBAn8jgICAgABBEGsiAiSAgICAACACQQhqIAEoAgAgASgCBCIDIAEoAghBAWoiASADIAEgA0kbEOOBgIAAIAIoAgwhASAAIAIoAgg2AgAgACABNgIEIAJBEGokgICAgAALUgEBfyOAgICAAEEQayICJICAgIAAIAJBCGogASgCACABKAIEIAEoAggQ44GAgAAgAigCDCEBIAAgAigCCDYCACAAIAE2AgQgAkEQaiSAgICAAAu1BgEGfyOAgICAAEEgayIDJICAgIAAAkACQAJAAkACQAJAA0AgASgCCCEEIAFBARDlgYCAACABKAIIIgUgASgCBCIGRg0BIAUgBk8NAgJAIAEoAgAiByAFai0AACIIQdwARg0AAkAgCEEiRg0AIAEgBUEBajYCCCADQRA2AhQgACABIANBFGoQ4oGAgAAMCAsCQCACKAIIIghFDQACQAJAIAUgBEkNAAJAIAUgBGsiBiACKAIAIAhrTQ0AIAIgCCAGQQFBARCGgoCAACACKAIIIQgLAkAgBkUNACACKAIEIAhqIAcgBGogBvwK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DQIgECADTw0DIBFBAWohESACIBBqIRMgEi0AACEUIBBBf2ohECASQX9qIRIgFCATLQAARg0ACyAHIAlrIBFrIQcgBSEQIAYNBQwECyAQDQILIAUgDCAGGyIQIAkgECAJSxshEyAJIRACQAJAAkADQCATIBBGDQEgCiAQRg0CIAggEGogA08NAyAPIBBqIREgBCAQaiESIBBBAWohECASLQAAIBEtAABGDQALIAcgDWshByANIRAgBkUNBQwGCyABIAg2AhgCQCAGDQAgASAFNgIgCyAAIAc2AgggACAINgIEIABBATYCAA8LIAogBSOBgICAAEHQ/8GAAGoQzIOAgAAACyADIAggCWoiECADIBBLGyADI4GAgIAAQeD/wYAAahDMg4CAAAALIBAgAyOBgICAAEGAgMKAAGoQzIOAgAAACyARIAUjgYCAgABB8P/BgABqEMyDgIAAAAsgASAQNgIgIBAhDAsgByAFayIIIANJDQALCyABQQA2AhggAEEANgIAC1ABAX8Qn4GAgAACQEEUQQQQm4GAgAAiAw0AQQRBFBCkg4CAAAALIAMgAjYCECADIAE2AgwgAyAAKQIANwIAIANBCGogAEEIaigCADYCACADCyABAX8CQCAAKAIAIgFFDQAgACgCBCABQQEQnIGAgAALCxkAIAEjgYCAgABBmMfAgABqQQUQ74OAgAALFAAgACgCBCAAKAIIIAEQuYOAgAALqQIBBn8gACgCCCECAkACQCABQYABTw0AQQEhAwwBCwJAIAFBgBBPDQBBAiEDDAELQQNBBCABQYCABEkbIQMLIAIhBAJAIAMgACgCACACa00NACAAIAIgA0EBQQEQhoKAgAAgACgCCCEECyAAKAIEIARqIQQCQAJAAkAgAUGAAUkNACABQT9xQYB/ciEFIAFBBnYhBiABQYAQSQ0BIAFBDHYhByAGQT9xQYB/ciEGAkAgAUGAgARJDQAgBCAFOgADIAQgBjoAAiAEIAdBP3FBgH9yOgABIAQgAUESdkFwcjoAAAwDCyAEIAU6AAIgBCAGOgABIAQgB0HgAXI6AAAMAgsgBCABOgAADAELIAQgBToAASAEIAZBwAFyOgAACyAAIAMgAmo2AghBAAtUAQF/AkAgAiAAKAIAIAAoAggiA2tNDQAgACADIAJBAUEBEIaCgIAAIAAoAgghAwsCQCACRQ0AIAAoAgQgA2ogASAC/AoAAAsgACADIAJqNgIIQQALzwICAX8BfiOAgICAAEHAAGsiAiSAgICAACAAKAIAIQAgAkEANgI8IAJCgICAgBA3AjQgAiOBgICAAEGY/8GAAGo2AhwgAkKggICABjcCICACIAJBNGo2AhgCQCAAIAJBGGoQ+IGAgAANACACQQhqQQhqIAJBNGpBCGooAgA2AgAgAiACKQI0NwMIIAIjj4CAgACtQiCGIgMgAEEQaq2ENwMoIAIgAyAAQQxqrYQ3AyAgAiOJgICAAEHKgICAAGqtQiCGIAJBCGqthDcDGCOBgICAACEAIAEoAgAgASgCBCAAQY2gwIAAaiACQRhqELiDgIAAIQACQCACKAIIIgFFDQAgAigCDCABQQEQnIGAgAALIAJBwABqJICAgIAAIAAPCyOBgICAACIAQeHGwIAAakE3IAJBCGogAEGw/8GAAGogAEHA/8GAAGoQgISAgAAAC7cFAAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAAoAgAOGQABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgACyABIAAoAgQgACgCCBDvg4CAAA8LIABBBGogARCNgoCAABoACyABI4GAgIAAQc3HwIAAakEYEO+DgIAADwsgASOBgICAAEHlx8CAAGpBGxDvg4CAAA8LIAEjgYCAgABBgMjAgABqQRoQ74OAgAAPCyABI4GAgIAAQZrIwIAAakEZEO+DgIAADwsgASOBgICAAEGzyMCAAGpBDBDvg4CAAA8LIAEjgYCAgABBv8jAgABqQRMQ74OAgAAPCyABI4GAgIAAQdLIwIAAakETEO+DgIAADwsgASOBgICAAEHlyMCAAGpBDhDvg4CAAA8LIAEjgYCAgABB88jAgABqQQ4Q74OAgAAPCyABI4GAgIAAQYHJwIAAakEMEO+DgIAADwsgASOBgICAAEGNycCAAGpBDhDvg4CAAA8LIAEjgYCAgABBm8nAgABqQQ4Q74OAgAAPCyABI4GAgIAAQanJwIAAakETEO+DgIAADwsgASOBgICAAEG8ycCAAGpBGhDvg4CAAA8LIAEjgYCAgABB1snAgABqQT4Q74OAgAAPCyABI4GAgIAAQZTKwIAAakEUEO+DgIAADwsgASOBgICAAEGoysCAAGpBNBDvg4CAAA8LIAEjgYCAgABB3MrAgABqQSwQ74OAgAAPCyABI4GAgIAAQYjLwIAAakEkEO+DgIAADwsgASOBgICAAEGsy8CAAGpBDhDvg4CAAA8LIAEjgYCAgABBusvAgABqQRMQ74OAgAAPCyABI4GAgIAAQc3LwIAAakEcEO+DgIAADwsgASOBgICAAEHpy8CAAGpBGBDvg4CAAAumAQIBfwF+I4CAgIAAQSBrIgIkgICAgAACQAJAIAAoAgAiACgCDEUNACACI4+AgIAArUIghiIDIABBEGqthDcDGCACIAMgAEEMaq2ENwMQIAIjl4CAgACtQiCGIACthDcDCCOBgICAACEAIAEoAgAgASgCBCAAQfiDwIAAaiACQQhqELiDgIAAIQAMAQsgACABEPiBgIAAIQALIAJBIGokgICAgAAgAAuaAQEBfyOAgICAAEEwayIDJICAgIAAIAMgAjYCDCADIAE2AgggA0EQakEIaiAAQQhqKQMANwMAIAMgACkDADcDECADI4mAgIAAQcyAgIAAaq1CIIYgA0EIaq2ENwMoIAMjmICAgACtQiCGIANBEGqthDcDICOBgICAAEHHhcCAAGogA0EgahD8gYCAACEAIANBMGokgICAgAAgAAvxAgQBfwF8AX4CfyOAgICAAEEwayICJICAgIAAAkACQAJAAkAgAC0AAEF9ag4FAQAAAAIACyACQRBqQQhqIABBCGopAwA3AwAgAiAAKQMANwMQIAJBEGogARCogoCAACEADAILAkACQCAAKwMIIgO9IgRC////////////AINC//////////f/AFUNACADIAJBEGoQj4KAgAAgAkEQamshACACQRBqIQUMAQsjgYCAgAAiAEGw38CAAGogAEGz38CAAGogBEJ/VSIGGyAAQbffwIAAaiAEQv////////8Hg1AiABshBUEDQQQgBhtBAyAAGyEACyACIAA2AgwgAiAFNgIIIAIjiYCAgABBzoCAgABqrUIghiACQQhqrYQ3AygjgYCAgAAhACABKAIAIAEoAgQgAEGynsCAAGogAkEoahC4g4CAACEADAELIAEjgYCAgABBgczAgABqQQQQ74OAgAAhAAsgAkEwaiSAgICAACAAC7UBAQR/I4CAgIAAQRBrIgIkgICAgABBASEDAkACQAJAIAFBAXEN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rUIghiACrYQ3AwgjgYCAgAAhACABKAIAIAEoAgQgAEHlnsCAAGogAkEIahC4g4CAACEADBELIAIgACkDCDcDACACI4yAgIAArUIghiACrYQ3AwgjgYCAgAAhACABKAIAIAEoAgQgAEHXnsCAAGogAkEIahC4g4CAACEADBALIAIgACkDCDcDACACI5qAgIAArUIghiACrYQ3AwgjgYCAgAAhACABKAIAIAEoAgQgAEHXnsCAAGogAkEIahC4g4CAACEADA8LIAIgACsDCDkDACACI5uAgIAArUIghiACrYQ3AwgjgYCAgAAhACABKAIAIAEoAgQgAEGynsCAAGogAkEIahC4g4CAACEADA4LIAIgACgCBDYCACACI5yAgIAArUIghiACrYQ3AwgjgYCAgAAhACABKAIAIAEoAgQgAEHHnsCAAGogAkEIahC4g4CAACEADA0LIAIgACkCBDcCACACI4mAgIAAQduAgIAAaq1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABB/4TAgABqIAJBCGoQuIOAgAAhAAwMCyABI4GAgIAAQefCwYAAakEKEO+DgIAAIQAMCwsgASOBgICAAEHxwsGAAGpBChDvg4CAACEADAoLIAEjgYCAgABB+8LBgABqQQwQ74OAgAAhAAwJCyABI4GAgIAAQYfDwYAAakEOEO+DgIAAIQAMCAsgASOBgICAAEGVw8GAAGpBCBDvg4CAACEADAcLIAEjgYCAgABBncPBgABqQQMQ74OAgAAhAAwGCyABI4GAgIAAQaDDwYAAakEEEO+DgIAAIQAMBQsgASOBgICAAEGkw8GAAGpBDBDvg4CAACEADAQLIAEjgYCAgABBsMPBgABqQQ8Q74OAgAAhAAwDCyABI4GAgIAAQb/DwYAAakENEO+DgIAAIQAMAgsgASOBgICAAEHMw8GAAGpBDhDvg4CAACEADAELIAEgACgCBCAAKAIIEO+DgIAAIQALIAJBEGokgICAgAAgAAv8AQEBfyOAgICAAEEQayICJICAgIAAAkACQCAAKQMAQv///////////wCDQoCAgICAgID4/wBTDQAgAiOdgICAAK1CIIYgAK2ENwMII4GAgIAAIQAgASgCACABKAIEIABB74rAgABqIAJBCGoQuIOAgAAhAAwBCyACQQA6AAQgAiABNgIAIAIj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ASgCCCIEa00NACABIAQgA0EBQQEQvYKAgAAgASgCCCEECwJAIANFDQAgASgCBCAEaiACIAP8CgAACyAAIAM2AgQgASAEIANqNgIIIABBBDoAAAtZAQF/AkAgAyABKAIAIAEoAggiBGtNDQAgASAEIANBAUEBEL2CgIAAIAEoAgghBAsCQCADRQ0AIAEoAgQgBGogAiAD/AoAAAsgAEEEOgAAIAEgBCADajYCCAtXAQF/AkAgACgCACIAQQxqKAIAIgFFDQAgAEEQaigCACABQQEQnIGAgAALAkAgAEF/Rg0AIAAgACgCBCIBQX9qNgIEIAFBAUcNACAAQRhBBBCcgYCAAAsLTQEBfyOAgICAAEEQayIGJICAgIAAIAYgAjYCDCAGIAE2AgggACAGQQhqI4GAgIAAQdyEwoAAaiICIAZBDGogAiADIAQgBRCBhICAAAALJgEBfyOBgICAACIAQYnIwYAAakHvACAAQcCDwoAAahDIg4CAAAAL4AIBBX8jgICAgABBEGsiASSAgICAABCfgYCAAEGABCECAkACQEGABEEBEJuBgIAAIgNFDQAgASADNgIIIAFBgAQ2AgQCQAJAAkAgA0GABBCXg4CAAA0AQYAEIQIDQCOegICAACgCACIEQcQARw0CIAEgAjYCDCABQQRqIAJBAUEBQQEQvYKAgAAgASgCCCIDIAEoAgQiAhCXg4CAAEUNAAsLIAEgAxCig4CAACIENgIMAkAgAiAETQ0AAkACQCAEDQBBASEFIAMgAkEBEJyBgIAADAELIAMgAkEBIAQQnYGAgAAiBUUNBQsgASAENgIEIAEgBTYCCAsgACABKQIENwIAIABBCGogAUEEakEIaigCADYCAAwBCyAAIAQ2AgggAEKAgICACDcCACACRQ0AIAMgAkEBEJyBgIAACyABQRBqJICAgIAADwtBAUGABBCug4CAAAALQQEgBBCug4CAAAALugMBA38jgICAgABBoANrIgMkgICAgAACQAJAAkAgAkH/AksNAAJAIAJFDQAgA0EUaiABIAL8CgAACyADQRRqIAJqQQA6AAAgA0GUA2ogA0EUaiACQQFqEMqDgIAAAkAgAygClANBAUcNACADI4GAgIAAQfCCwoAAaikDADcCDEGBgICAeCECDAILAkAgAygCmAMQnIOAgAAiAQ0AQYCAgIB4IQIMAgsC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KAIAQQFqNgIAQQIhAQsgAQutAwEDfyOAgICAAEEwayIBJICAgIAAQQMhAgJAIAAtAA0NAEEBIQIjgYCAgABBlI/CgABqKAIAQQFLDQAQ2oKAgABB/wFxIQILIAEgAjoADyABIAAoAgg2AhAgASAAKAIAIAAoAgQQ4IKAgAAgASABKQMANwIUI4GAgIAAQeyOwoAAai0AACEAIAEgAUEPajYCJCABIAFBFGo2AiAgASABQRBqNgIcAkACQAJAIABFDQAjgYCAgAAiAEHsjsKAAGpBAToAACAAQeiOwoAAaiICKAIAIQAgAkEANgIAIAANAQsgAUIANwMoIAFBHGogAUEoaiOBgICAAEGIg8KAAGoQ4YKAgAAgAUEoahCwgoCAAAwBCyOBgICAACECIAFBHGogAEEIahDYgoCAACIDQQRqIAJB0IPCgABqEOGCgIAAIANBADoAACACQeyOwoAAakEBOgAAIAJB6I7CgABqIgMoAgAhAiADIAA2AgAgASACNgIsIAFBATYCKCACRQ0AIAIgAigCACIAQX9qNgIAIABBAUcNACABQShqQQRqEMuCgIAACyABQTBqJICAgIAAC/EBAgN/An4jgICAgABBEGsiAySAgICAACADIAEgAigCDCIEEYSAgIAAgICAgABBBCECIAEhBQJAAkAgAykDAELtuq22zYXU9eMAhSADKQMIQviCmb2V7sbFuX+FhFANACADIAEgBBGEgICAAICAgIAAIAMpAwghBiADKQMAIQcjgYCAgAAhAgJAIAdCp9inm8aCuao4hSAGQqCV0ou2oPv3FYWEQgBRDQAgAkHNyMGAAGohAUEMIQIMAgsgAUEEaiEFQQghAgsgASACaigCACECIAUoAgAhAQsgACACNgIEIAAgATYCACADQRBqJICAgIAAC8wCAwJ/AX4BfyOAgICAAEEgayIDJICAgIAAENeCgIAAIQQgACkCACEFIAMgAjYCGCADIAE2AhQgAyAFNwIMAkACQCOmgICAACgCACIGQQJLDQAgA0EMakEAENuCgIAADAELIAMgBkF4ajYCHCADQQxqIANBHGoQ24KAgAALAkACQAJAAkAgACgCCC0AAA4EAAECAwALIANBDGogASACKAIkQQAQ0oKAgAAgAy0ADCADKAIQEK+CgIAADAILIANBDGogASACKAIkQQEQ0oKAgAAg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AkBBACAAKAIIIgQoAgQiBSAEKQMIIgZC/////w8gBkL/////D1Qbp2siByAHIAVLGyIHIAIgByACSRsiCEUNACAEKAIAIAYgBa0iCSAGIAlUG6dqIAEgCPwKAAALIAQgBiAIrXw3AwgCQCAHIAJPDQAjgYCAgABBmILCgABqKQMAIgZC/wGDQgRRDQAgACgCBCEEAkACQCAALQAAIgJBBEsNACACQQNHDQELIAQoAgAhBwJAIARBBGooAgAiAigCACIFRQ0AIAcgBRGCgICAAICAgIAACwJAIAIoAgQiBUUNACAHIAUgAigCCBCcgYCAAAsgBEEMQQQQnIGAgAALIAAgBjcCAEEBIQMLIAMLxQEBBH8jgICAgABBEGsiAySAgICAACADQQhqIAAoAgggASACEMKCgIAAAkAgAy0ACCICQQRGDQAgACgCBCEEAkACQCAALQAAIgFBBEsNACABQQNHDQELIAQoAgAhBQJAIARBBGooAgAiASgCACIGRQ0AIAUgBhGCgICAAICAgIAACwJAIAEoAgQiBkUNACAFIAYgASgCCBCcgYCAAAsgBEEMQQQQnIGAgAALIAAgAykDCDcCAAsgA0EQaiSAgICAACACQQRHCxQAIAEgACgCACAAKAIEEO+DgIAAC0gAAkAgACgCAEGAgICAeEYNACABIAAoAgQgACgCCBDvg4CAAA8LIAEoAgAgASgCBCAAKAIMKAIAIgAoAgAgACgCBBC4g4CAAAsbACAAI4GAgIAAQaiFwoAAajYCBCAAIAE2AgALDAAgACABKQIANwMAC1sBAn8gASgCBCECIAEoAgAhAxCfgYCAAAJAQQhBBBCbgYCAACIBDQBBBEEIEKSDgIAAAAsgASACNgIEIAEgAzYCACAAI4GAgIAAQaiFwoAAajYCBCAAIAE2AgALxAECA38BfiOAgICAAEEgayICJICAgIAAAkAgASgCAEGAgICAeEcNACABKAIMIQMgAkEUakEIaiIEQQA2AgAgAkKAgICAEDcCFCACQRRqI4GAgIAAQYyEwoAAaiADKAIAIgMoAgAgAygCBBC4g4CAABogAkEIakEIaiAEKAIAIgM2AgAgAiACKQIUIgU3AwggAUEIaiADNgIAIAEgBTcCAAsgACABNgIAIAAjgYCAgABBuIXCgABqNgIEIAJBIGokgICAgAALtAICA38BfiOAgICAAEEwayICJICAgIAAAkAgASgCAEGAgICAeEcNACABKAIMIQMgAkEkakEIaiIEQQA2AgAgAkKAgICAEDcCJCACQSRqI4GAgIAAQYyEwoAAaiADKAIAIgMoAgAgAygCBBC4g4CAABogAkEYakEIaiAEKAIAIgM2AgAgAiACKQIkIgU3AxggAUEIaiADNgIAIAEgBTcCAAsgASkCACEFIAFCgICAgBA3AgAgAkEIakEIaiIDIAFBCGoiASgCADYCACABQQA2AgAgAiAFNwMIEJ+BgIAAAkBBDEEEEJuBgIAAIgENAEEEQQwQpIOAgAAACyABIAIpAwg3AgAgAUEIaiADKAIANgIAIAAjgYCAgABBuIXCgABqNgIEIAAgATYCACACQTBqJICAgIAAC0cAAkACQAJAIAENACADRQ0BEJ+BgIAAIAMgAhCbgYCAACICDQEMAgsgACABIAIgAxCdgYCAACICRQ0BCyACDwsQ0YKAgAAACwIAC00BAX8jgICAgABBEGsiAiSAgICAACABKAIAIAJBCGoQiICAgAAgACACKAIMIgE2AgggACACKAIINgIEIAAgATYCACACQRBqJICAgIAAC2EBAX8jgICAgABBEGsiBCSAgICAACABKAIAIAIgAyAEQQRqEImAgIAAQQIhAQJAIAQtAARBAXFFDQAgACAEKAIMNgIEIAQtAAhBAEchAQsgACABNgIAIARBEGokgICAgAALCAAQioCAgAALCgAgABCKg4CAAAujLQELfyOAgICAAEEQayIBJICAgIAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAjgYCAgABBrI/CgABqKAIYIgINAAJAI4GAgIAAQYSTwoAAaigCACIDDQAjgYCAgAAiBEGEk8KAAGoiBUEANgIUIAVCfzcCDCAFQoCAhICAgMAANwIEIARBrI/CgABqQQA2ArwDIAUgAUEIakFwcUHYqtWqBXMiAzYCAAsjp4CAgAAhBSOogICAACAFSQ0BI6eAgIAAIQVBACECI6iAgIAAIAVrQdkASQ0AI6eAgIAAIQQjqICAgAAhBiOBgICAAEGsj8KAAGoiBSAGIARrIgY2AsQDIAUgBDYCwAMgBSAENgIQIAUgBjYCtAMgBSAGNgKwAyAFIAM2AiQgBUF/NgIgQQAhBANAI4GAgIAAQayPwoAAaiAE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CwJAIAFBgBBPDQBBAiEDDAELQQNBBCABQYCABEkbIQMLIAIhBAJAIAMgACgCACACa00NACAAIAIgAxCrg4CAACAAKAIIIQQLIAAoAgQgBGohBAJAAkACQCABQYABSQ0AIAFBP3FBgH9yIQUgAUEGdiEGIAFBgBBJDQEgAUEMdiEHIAZBP3FBgH9yIQYCQCABQYCABEkNACAEIAU6AAMgBCAGOgACIAQgB0E/cUGAf3I6AAEgBCABQRJ2QXByOgAADAMLIAQgBToAAiAEIAY6AAEgBCAHQeABcjoAAAwCCyAEIAE6AAAMAQsgBCAFOgABIAQgBkHAAXI6AAALIAAgAyACajYCCEEAC58BAQF/I4CAgIAAQRBrIgMkgICAgAACQCACIAFqIgEgAk8NAEEAQQAQroOAgAAACyADQQRqIAAoAgAiAiAAKAIEIAEgAkEBdCICIAEgAksbIgJBCCACQQhLGyICELCDgIAAAkAgAygCBEEBRw0AIAMoAgggAygCDBCug4CAAAALIAMoAgghASAAIAI2AgAgACABNgIEIANBEGokgICAgAALUAEBfwJAIAIgACgCACAAKAIIIgNrTQ0AIAAgAyACEKuDgIAAIAAoAgghAwsCQCACRQ0AIAAoAgQgA2ogASAC/AoAAAsgACADIAJqNgIIQQALswUBBH8jgICAgABBMGsiAySAgICAACADIAI2AgggAyABNgIEIANBIGogA0EEahCDhICAAAJAAkACQAJAIAMoAiAiBEUNACADKAIkIQEgAygCLEUNAgJAAkAgAg0AQQEhBQwBCxCfgYCAACACQQEQm4GAgAAiBUUNAgtBACEGIANBADYCFCADIAU2AhAgAyACNgIMAkAgASACTQ0AIANBDGpBACABEKuDgIAAIAMoAgwhAiADKAIQIQUgAygCFCEGCwJAIAFFDQAgBSAGaiAEIAH8CgAACyADIAYgAWoiATYCFAJAIAIgAWtBAksNACADQQxqIAFBAxCrg4CAACADKAIQIQUgAygCFCEBCyAFIAFqIgIjgYCAgABBm8rBgABqIgQvAAA7AAAgAkECaiAEQQJqLQAAOgAAIAMgAUEDaiICNgIUIAMgAykCBDcCGCADQSBqIANBGGoQg4SAgAACQCADKAIgIgZFDQADQCADKAIsIQUCQCADKAIkIgEgAygCDCACa00NACADQQxqIAIgARCrg4CAACADKAIUIQILIAMoAhAhBAJAIAFFDQAgBCACaiAGIAH8CgAACyADIAIgAWoiAjYCFAJAIAVFDQACQCADKAIMIAJrQQJLDQAgA0EMaiACQQMQq4OAgAAgAygCECEEIAMoAhQhAgsgBCACaiIBI4GAgIAAQZvKwYAAaiIELwAAOwAAIAFBAmogBEECai0AADoAACADIAJBA2oiAjYCFAsgA0EgaiADQRhqEIOEgIAAIAMoAiAiBg0ACwsgACADKQIMNwIAIABBCGogA0EMakEIaigCADYCAAwDCyAAQQA2AgggAEKAgICAGDcCAAwCC0EBIAIQroOAgAAACyAAIAE2AgggACAENgIEIABBgICAgHg2AgALIANBMGokgICAgAALHAACQCAARQ0AIAAgARCkg4CAAAALELKDgIAAAAvlAQEEfyOAgICAAEEQayICJICAgIAAAkACQAJAIAEoAgAiAyABKAIIIgRHDQAgAkEEaiAEIAEoAgQgBEEBaiIDELCDgIAAIAIoAgRBAUYNASABIAIoAgg2AgQLIAEoAgQiBSAEakEAOgAAAkACQCADIARBAWoiAUsNACAFIQQMAQsCQCABDQBBASEEIAUgA0EBEJyBgIAADAELIAUgA0EBIAEQnYGAgAAiBEUNAgsgACABNgIEIAAgBDYCACACQRBqJICAgIAADwsgAigCCCACKAIMEK6DgIAAAAtBASABEK6DgIAAAAuQAQACQAJAIANBAE4NAEEBIQFBBCECQQAhAwwBCwJAAkACQAJAIAFFDQAgAiABQQEgAxCdgYCAACEBDAELAkAgAw0AQQEhAQwCCxCfgYCAACADQQEQm4GAgAAhAQsgAQ0AQQEhASAAQQE2AgQMAQsgACABNgIEQQAhAQtBCCECCyAAIAJqIAM2AgAgACABNgIAC9EDAQZ/I4CAgIAAQRBrIgMkgICAgAACQAJAAkACQAJAAkAgAkEBcQ0AIAEtAAAiBEUNAkEAIQUgASEGQQAhBwNAIAZBAWohBgJAAkAgBMBBf0oNAAJAIARB/wFxQYABRg0AIAYgBEEDcUEYdyIIQQV0QYCAgIAEcSAIQYCAgAhxQQd0IAhBgICAgAJxcnJBHXZqIARBAXZBAnFqIARBAnZBAnFqIQYgB0UgBXIhBQwCCyAHIAYvAAAiBGohByAGIARqQQJqIQYMAQsgBiAEQf8BcSIEaiEGIAcgBGohBwsgBi0AACIEDQALQQAhBCAFIAdBEElxDQFBACEIIAdBAXQiBEEATg0BDAULIAJBAXYhBAsgBA0BC0EBIQZBACEEDAELEJ+BgIAAQQEhCCAEQQEQm4GAgAAiBkUNAQsgA0EANgIIIAMgBjYCBCADIAQ2AgACQCADI4GAgIAAQcyGwoAAaiABIAIQuIOAgABFDQAjgYCAgAAiBEHFycGAAGpB1gAgA0EPaiAEQeSGwoAAaiAEQfSGwoAAahCAhICAAAALIAAgAykCADcCACAAQQhqIANBCGooAgA2AgAgA0EQaiSAgICAAA8LIAggBBCug4CAAAALJQEBfyOBgICAACIAQZ7KwYAAakEjIABBhIfCgABqEMiDgIAAAAt7AQN/I4CAgIAAQRBrIgEkgICAgAAgAUEEaiAAKAIAIgIgACgCBCACQQF0IgJBCCACQQhLGyICELCDgIAAAkAgASgCBEEBRw0AIAEoAgggASgCDBCug4CAAAALIAEoAgghAyAAIAI2AgAgACADNgIEIAFBEGokgICAgAALawECfyABKAIEIQICQAJAAkAgASgCCCIBDQBBASEDDAELEJ+BgIAAIAFBARCbgYCAACIDRQ0BCwJAIAFFDQAgAyACIAH8CgAACyAAIAE2AgggACADNgIEIAAgATYCAA8LQQEgARCug4CAAAALDwAgAEEMaiABEIWEgIAAC7UDAQV/I4CAgIAAQSBrIgMkgICAgABBACEEAkACQAJAIAJBAWoiBUEASA0AEJ+BgIAAQQEhBCAFQQEQm4GAgAAiBkUNAAJAIAJFDQAgBiABIAL8CgAACwJAIAJBB0sNAAJAIAINAEEAIQdBACEEDAQLAkAgAS0AAA0AQQEhBEEAIQcMBAtBASEEIAJBAUYNAgJAIAEtAAENAEEBIQcMBAtBAiEHIAJBAkYNAiABLQACRQ0DQQMhByACQQNGDQIgAS0AA0UNA0EEIQcgAkEERg0CIAEtAARFDQNBBSEHIAJBBUYNAiABLQAFRQ0DIAIhB0EAIQQgAkEGRg0DIAJBBiABLQAGIgQbIQcgBEUhBAwDCyADQQhqQQAgASACEP+DgIAAIAMoAgwhByADKAIIIQQMAgsgBCAFEK6DgIAAAAsgAiEHQQAhBAsCQAJAIARBAXFFDQAgACACNgIIIAAgBjYCBCAAIAU2AgAgACAHNgIMDAELIAMgAjYCHCADIAY2AhggAyAFNgIUIAMgA0EUahCvg4CAACAAIAMpAwA3AgQgAEGAgICAeDYCAAsgA0EgaiSAgICAAAvIAQEEfyOAgICAAEEQayICJICAgIAAQQEhAwJAIAEoAgAiBEEnIAEoAgQiBSgCECIBEYGAgIAAgICAgAANACACIAAoAgBBgQIQuoOAgAACQAJAIAItAA0iA0GBAUkNACAEIAIoAgAgARGBgICAAICAgIAARQ0BQQEhAwwCCyAEIAIgAi0ADCIAaiADIABrIAUoAgwRgICAgACAgICAAEUNAEEBIQMMAQsgBEEnIAERgYCAgACAgICAACEDCyACQRBqJICAgIAAIAML9AQBCH8jgICAgABBEGsiBCSAgICAAAJAAkACQCADQQFxDQAgAi0AACIFDQFBACEFDAILIAAgAiADQQF2IAEoAgwRgICAgACAgICAACEFDAELIAEoAgwhBkEAIQcDQCACQQFqIQgCQAJAAkACQAJAAkACQCAFwEF/Sg0AIAVB/wFxIglBgAFGDQEgCUHAAUYNAkGggICABiEKAkAgBUEBcUUNACACQQVqIQggAigAASEKC0EAIQkgBUECcQ0DIAghAkEAIQgMBAsCQCAAIAggBUH/AXEiBSAGEYCAgIAAgICAgAANACAIIAVqIQIMBgtBASEFDAcLAkAgACACQQNqIgUgAi8AASICIAYRgICAgACAgICAAA0AIAUgAmohAgwFC0EBIQUMBgsgBCABNgIEIAQgADYCACAEQqCAgIAGNwIIIAMgB0EDdGoiBSgCACAEIAUoAgQRgYCAgACAgICAAEUNAkEBIQUMBQsgCEECaiECIAgvAAAhCAsCQAJAIAVBBHENACACIQsMAQsgAkECaiELIAIvAAAhCQsCQAJAIAVBCHENACALIQIMAQsgC0ECaiECIAsvAAAhBwsCQCAFQRBxRQ0AIAMgCEH//wNxQQN0ai8BBCEICwJAIAVBIHFFDQAgAyAJQf//A3FBA3RqLwEEIQkLIAQgCTsBDiAEIAg7AQwgBCAKNgIIIAQgATYCBCAEIAA2AgACQCADIAdBA3RqIgUoAgAgBCAFKAIEEYGAgIAAgICAgABFDQBBASEFDAQLIAdBAWohBwwBCyAHQQFqIQcgCCECCyACLQAAIgUNAAtBACEFCyAEQRBqJICAgIAAIAUL4AcBD38jgICAgABBEGsiAySAgICAAEEBIQQCQCACKAIAIgVBIiACKAIEIgYoAhAiBxGBgICAAICAgIAADQACQAJAIAENAEEAIQhBACECDAELQQAhCUEAIAFrIQpBACEIIAEhCyAAIQwCQANAIAwgC2ohDUEAIQICQANAIAwgAmoiDi0AACIPQYF/akH/AXFBoQFJDQEgD0EiRg0BIA9B3ABGDQEgCyACQQFqIgJHDQALIAggC2ohCAwCCyAOQQFqIQwgCCACaiELAkACQAJAAkAgDiwAACIPQX9MDQAgD0H/AXEhDwwBCyAMLQAAQT9xIRAgD0EfcSERIA5BAmohDAJAIA9BX0sNACARQQZ0IBByIQ8MAQsgEEEGdCAMLQAAQT9xciEQIA5BA2ohDAJAIA9BcE8NACAQIBFBDHRyIQ8MAQsgDC0AACEPIA5BBGohDCAQQQZ0IA9BP3FyIBFBEnRBgIDwAHFyIg9BgIDEAEcNACALIQgMAQsgAyAPQYGABBC6g4CAAAJAIAMtAA0iDiADLQAMIhBrIhFB/wFxQQFGDQACQAJAIAkgC0sNAAJAIAlFDQACQCAJIAFJDQAgCSABRg0BDAILIAAgCWosAABBQEgNAQsgC0UNAQJAIAsgAUkNACALIApqDQEMAgsgACAIaiACaiwAAEG/f0oNAQsgACABIAkgCCACaiOBgICAAEGUh8KAAGoQu4OAgAAACyAFIAAgCWogCCAJayACaiAGKAIMIgsRgICAgACAgICAAA0CAkACQCAOQYEBSQ0AIAUgAygCACAHEYGAgIAAgICAgAANBAwBCyAFIAMgEGogESALEYCAgIAAgICAgAANAwsCQAJAIA9BgAFPDQBBASEODAELAkAgD0GAEE8NAEECIQ4MAQtBA0EEIA9BgIAESRshDgsgDiAIaiACaiEJCwJAAkAgD0GAAU8NAEEBIQ8MAQsCQCAPQYAQTw0AQQIhDwwBC0EDQQQgD0GAgARJGyEPCyAPIAhqIAJqIQgLIA0gDGsiCw0BDAILC0EBIQQMAgsCQCAJIAhLDQBBACECAkAgCUUNAAJAIAkgAUkNACAJIQIgCSABRg0BDAILIAkhAiAAIAlqLAAAQUBIDQELAkAgCA0AQQAhCAwCCwJAIAggAUkNACAIIAFGDQIgAiEJDAELIAAgCGosAABBv39KDQEgAiEJCyAAIAEgCSAII4GAgIAAQaSHwoAAahC7g4CAAAALIAUgACACaiAIIAJrIAYoAgwRgICAgACAgICAAA0AIAVBIiAHEYGAgIAAgICAgAAhBAsgA0EQaiSAgICAACAEC8IGAQN/I4CAgIAAQSBrIgMkgICAgAACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAQ4oAgEBAQEBAQEBAwUBAQQBAQEBAQEBAQEBAQEBAQEBAQEBAQgBAQEBBwALIAFB3ABGDQULIAJBAXFFDQcgAUH/BU0NByABEPmDgIAARQ0HIANBDGpBAmpBADoAACADQQA7AQwgAyOBgICAAEGD0sGAAGoiBCABQRR2ai0AADoADyADIAQgAUEEdkEPcWotAAA6ABMgAyAEIAFBCHZBD3FqLQAAOgASIAMgBCABQQx2QQ9xai0AADoAESADIAQgAUEQdkEPcWotAAA6ABAgA0EMaiABQQFyZ0ECdiICaiIFQfsAOgAAIAVBf2pB9QA6AAAgA0EMaiACQX5qIgJqQdwAOgAAIANBDGpBCGoiBSAEIAFBD3FqLQAAOgAAIAAgAykBDDcAACADQf0AOgAVIABBCGogBS8BADsAAAwICyAAQgA3AQIgAEHc4AA7AQAMCgsgAEIANwECIABB3OgBOwEADAkLIABCADcBAiAAQdzkATsBAAwICyAAQgA3AQIgAEHc3AE7AQAMBwsgAEIANwECIABB3LgBOwEADAYLIAJBgAJxRQ0BIABCADcBAiAAQdzOADsBAAwFCyACQf///wdxQYCABE8NAwsgARD6g4CAAA0BIANBFmpBAmpBADoAACADQQA7ARYgAyOBgICAAEGD0sGAAGoiBCABQRR2ai0AADoAGSADIAQgAUEEdkEPcWotAAA6AB0gAyAEIAFBCHZBD3FqLQAAOgAcIAMgBCABQQx2QQ9xai0AADoAGyADIAQgAUEQdkEPcWotAAA6ABogA0EWaiABQQFyZ0ECdiICaiIFQfsAOgAAIAVBf2pB9QA6AAAgA0EWaiACQX5qIgJqQdwAOgAAIANBFmpBCGoiBSAEIAFBD3FqLQAAOgAAIAAgAykBFjcAACADQf0AOgAfIABBCGogBS8BADsAAAtBCiEBDAMLIAAgATYCAEGBASEBQYABIQIMAgsgAEIANwECIABB3MQAOwEAC0ECIQFBACECCyAAIAE6AA0gACACOgAMIANBIGokgICAgAALEwAgACABIAIgAyAEEPWDgIAAAAsPACAAKAIAIAEQvYOAgAAL4wIBA38jgICAgABBEGsiAiSAgICAAAJAAkACQCABKAIIIgNBgICAEHENACADQYCAgCBxDQEgAUEBQQFBACACQQZqIAAoAgAgAkEGakEKEMaDgIAAIgBqQQogAGsQx4OAgAAhAAwCCyAAKAIAIQBBACEDA0AgAkEGaiADakEHaiOBgICAAEGD0sGAAGogAEEPcWotAAA6AAAgA0F/aiEDIABBD0shBCAAQQR2IQAgBA0ACyABQQEjgYCAgABBk9LBgABqQQIgAkEGaiADakEIakEAIANrEMeDgIAAIQAMAQsgACgCACEAQQAhAwNAIAJBBmogA2pBB2ojgYCAgABBldLBgABqIABBD3FqLQAAOgAAIANBf2ohAyAAQQ9LIQQgAEEEdiEAIAQNAAsgAUEBI4GAgIAAQZPSwYAAakECIAJBBmogA2pBCGpBACADaxDHg4CAACEACyACQRBqJICAgIAAIAALEgAgACgCACkDACABEL+DgIAAC9QCAQN/I4CAgIAAQSBrIgIkgICAgAACQAJAAkAgASgCCCIDQYCAgBBxDQAgA0GAgIAgcQ0BIAFBAUEBQQAgAkEMaiAAIAJBDGpBFBDNg4CAACIDakEUIANrEMeDgIAAIQMMAgtBACEDA0AgAkEMaiADakEPaiOBgICAAEGD0sGAAGogAKdBD3FqLQAAOgAAIANBf2ohAyAAQg9WIQQgAEIEiCEAIAQNAAsgAUEBI4GAgIAAQZPSwYAAakECIAJBDGogA2pBEGpBACADaxDHg4CAACEDDAELQQAhAwNAIAJBDGogA2pBD2ojgYCAgABBldLBgABqIACnQQ9xai0AADoAACADQX9qIQMgAEIPViEEIABCBIghACAEDQALIAFBASOBgICAAEGT0sGAAGpBAiACQQxqIANqQRBqQQAgA2sQx4OAgAAhAwsgAkEgaiSAgICAACADCxwAIAAoAgAgASAAKAIEKAIMEYGAgIAAgICAgAALDgAgAiAAIAEQwoOAgAALswUBB38CQAJAIAAoAggiA0GAgIDAAXFFDQACQAJAIANBgICAgAFxDQAC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AAJAAkACQAJAIAAvAQwiA0UNACACQQhqIAFBCGopAgA3AwAgAiABKQIANwMAAkAgACkCCCIEpyIFQYCAgAhxDQAgAigCBCEGDAILIAAoAgAgAigCACACKAIEIgEgACgCBCgCDBGAgICAAICAgIAADQIgACAFQYCAgP95cUGwgICAAnIiBTYCCCACQgE3AwBBACEGQQAgAyABQf//A3FrIgEgASADSxshAwwBCyAAKAIAIAAoAgQgARDqg4CAACEBDAILAkACQCACKAIMIgcNAEEAIQgMAQsgAigCCCEBQQAhCANAAkACQAJAAkACQCABLwEADgMAAQIACyABQQRqKAIAIQkMAwsgAUECai8BACIJDQFBASEJDAILIAFBCGooAgAhCQwBCyAJQfb/F2ogCUGc/x9qcSAJQZj4N2ogCUHwsR9qcXNBEXZBAWohCQsgAUEMaiEBIAkgCGohCCAHQX9qIgcNAAsLAkACQAJAIAggBmoiASADQf//A3FPDQAgAyABayEGQQAhAUEAIQMCQAJAAkAgBUEddkEDcQ4EAgABAAILIAYhAwwBCyAGQf7/A3FBAXYhAwsgBUH///8AcSEJIAAoAgQhCCAAKAIAIQcDQCABQf//A3EgA0H//wNxTw0CIAFBAWohASAHIAkgCCgCEBGBgICAAICAgIAARQ0ADAQLCyAAKAIAIAAoAgQgAhDqg4CAACEBDAELIAcgCCACEOqDgIAADQFBACEFIAYgA2tB//8DcSEDA0AgBUH//wNxIgYgA0khASAGIANPDQEgBUEBaiEFIAcgCSAIKAIQEYGAgIAAgICAgABFDQALCyAAIAQ3AggMAQtBASEBCyACQRBqJICAgIAAIAELmgEBA38jgICAgABBEGsiAiSAgICAACAALQAAIQNBACEAA0AgAkEOaiAAakEBaiOBgICAAEGD0sGAAGogA0EPcWotAAA6AAAgAEF/aiEAIANB/wFxIgRBBHYhAyAEQQ9LDQALIAFBASOBgICAAEGT0sGAAGpBAiACQQ5qIABqQQJqQQAgAGsQx4OAgAAhACACQRBqJICAgIAAIAALmgEBA38jgICAgABBEGsiAiSAgICAACAALQAAIQNBACEAA0AgAkEOaiAAakEBaiOBgICAAEGV0sGAAGogA0EPcWotAAA6AAAgAEF/aiEAIANB/wFxIgRBBHYh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IAQNACOBgICAACEHQQEhBSAGKAIAIAdBqtLBgABqQQIgBigCBCgCDBGAgICAAICAgIAADQELQQEhBSADQQE6AA8gAyOBgICAAEHEh8KAAGo2AhQgAyAGKQIANwIAIAMgBikCCDcCGCADIANBD2o2AgggAyADNgIQIAEgA0EQaiACKAIMEYGAgIAAgICAgAANACOBgICAACEFIAMoAhAgBUGn0sGAAGpBAiADKAIUKAIMEYCAgIAAgICAgAAhBQsgACAFOgAIIAAgBEEBajYCACADQSBqJICAgIAAIAALxwEBA38gAC0ACCEBAkACQCAAKAIAIgINACABIQMMAQtBASEDAkACQCABQQFxDQAgACgCBCEBIAJBAUcNASAALQAJQQFxRQ0BIAEtAApBgAFxDQEjgYCAgAAhAkEBIQMgASgCACACQa3SwYAAakEBIAEoAgQoAgwRgICAgACAgICAAEUNAQsgACADOgAIDAELI4GAgIAAIQMgACABKAIAIANBrNLBgABqQQEgASgCBCgCDBGAgICAAICAgIAAIgM6AAgLIANBAXEL9gMBBX8jgICAgABBIGsiBSSAgICAAEEBIQYCQCAALQAEDQAgAC0ABSEHAkAgACgCACIILQAKQYABcQ0AQQEhBiOBgICAACEJIAgoAgAgCUGl0sGAAGogCUGu0sGAAGogB0EBcSIHG0ECQQMgBxsgCCgCBCgCDBGAgICAAICAgIAADQEgCCgCACABIAIgCCgCBCgCDBGAgICAAICAgIAADQEjgYCAgAAhAiAIKAIAIAJBsdLBgABqQQIgCCgCBCgCDBGAgICAAICAgIAADQEgAyAIIAQoAgwRgYCAgACAgICAACEGDAELQQEhBgJAIAdBAXENACOBgICAACEHIAgoAgAgB0Gz0sGAAGpBAyAIKAIEKAIMEYCAgIAAgICAgAANAQtBASEGIAVBAToADyAFI4GAgIAAQcSHwoAAajYCFCAFIAgpAgA3AgAgBSAIKQIINwIYIAUgBUEPajYCCCAFIAU2AhAgBSABIAIQ44OAgAANACAFI4GAgIAAQbHSwYAAakECEOODgIAADQACQCADIAVBEGogBCgCDBGBgICAAICAgIAARQ0AQQEhBgwBCyOBgICAACEGIAUoAhAgBkGn0sGAAGpBAiAFKAIUKAIMEYCAgIAAgICAgAAhBgsgAEEBOgAFIAAgBjoABCAFQSBqJICAgIAAIAALOQAgACABKAIAIAIgAyABKAIEKAIMEYCAgIAAgICAgAA6AAggACABNgIEIAAgA0U6AAkgAEEANgIAC0kAAkAgAkGAgMQARg0AIAAgAiABKAIQEYGAgIAAgICAgABFDQBBAQ8LAkAgAw0AQQAPCyAAIAMgBCABKAIMEYCAgIAAgICAgAAL8QYBCH8CQAJAIAEgAEEDakF8cSICIABrIgNJDQAgASADayIEQQRJDQAgBEEDcSEFQQAhBkEAIQECQCACIABGDQBBACEHQQAhAQJAIAAgAmsiCEF8Sw0AQQAhB0EAIQEDQCABIAAgB2oiAiwAAEG/f0pqIAJBAWosAABBv39KaiACQQJqLAAAQb9/SmogAkEDaiwAAEG/f0pqIQEgB0EEaiIHDQALCyAAIAdqIQIDQCABIAIsAABBv39KaiEBIAJBAWohAiAIQQFqIggNAAsLIAAgA2ohCAJAIAVFDQAgCCAEQfz///8HcWoiAiwAAEG/f0ohBiAFQQFGDQAgBiACLAABQb9/SmohBiAFQQJGDQAgBiACLAACQb9/SmohBgsgBEECdiEDIAYgAWohBwNAIAghBiADRQ0CIANBwAEgA0HAAUkbIgRBA3EhBQJAAkAgBEECdCIJQfAHcSIIDQBBACECDAELQQAhAiAGIQEDQCABQQxqKAIAIgBBf3NBB3YgAEEGdnJBgYKECHEgAUEIaigCACIAQX9zQQd2IABBBnZyQYGChAhxIAFBBGooAgAiAEF/c0EHdiAAQQZ2ckGBgoQIcSABKAIAIgBBf3NBB3YgAEEGdnJBgYKECHEgAmpqamohAiABQRBqIQEgCEFwaiIIDQALCyADIARrIQMgBiAJaiEIIAJBCHZB/4H8B3EgAkH/gfwHcWpBgYAEbEEQdiAHaiEHIAVFDQALIAYgBEH8AXFBAnRqIgIoAgAiAUF/c0EHdiABQQZ2ckGBgoQIcSEBAkAgBUEBRg0AIAIoAgQiCEF/c0EHdiAIQQZ2ckGBgoQIcSABaiEBIAVBAkYNACACKAIIIgJBf3NBB3YgAkEGdnJBgYKECHEgAWohAQsgAUEIdkH/gRxxIAFB/4H8B3FqQYGABGxBEHYgB2ohBwwBCwJAIAENAEEADwsgAUEDcSEIAkACQCABQQRPDQBBACECQQAhBwwBCyABQXxxIQNBACECQQAhBwNAIAcgACACaiIBLAAAQb9/SmogAUEBaiwAAEG/f0pqIAFBAmosAABBv39KaiABQQNqLAAAQb9/SmohByADIAJBBGoiAkcNAAsLIAhFDQAgACACaiEBA0AgByABLAAAQb9/SmohByABQQFqIQEgCEF/aiIIDQALCyAHC9kFAQh/I4CAgIAAQRBrIgMkgICAgAACQAJAIAIoAgQiBEUNACAAIAIoAgAgBCABKAIMEYCAgIAAgICAgABFDQBBASEFDAELAkAgAigCDCIEDQBBACEFDAELIAIoAggiBiAEQQxsaiEHIAZBDGohBCADQQxqIQgDQCAGIQIgBCEGAkACQAJAAkAgAi8BAA4DAAIBAAsCQAJAIAIoAgQiAkHBAEkNACABQQxqKAIAIQQDQAJAIAAjgYCAgABBudLBgABqQcAAIAQRgICAgACAgICAAEUNAEEBIQUMCAsgAkFAaiICQcAASw0ADAILCyACRQ0DCyAAI4GAgIAAQbnSwYAAaiACIAFBDGooAgARgICAgACAgICAAEUNAkEBIQUMBAsgACACKAIEIAIoAgggAUEMaigCABGAgICAAICAgIAARQ0BQQEhBQwDCyACLwECIQUgCEEAOgAAIANBADYCCAJAAkACQAJAAkACQAJAIAIvAQAOAwABAgALIAIoAgQhCQwDCyACLwECIgINAUEBIQkMAwsgAigCCCEJDAELIAJB9v8XaiACQZz/H2pxIAJBmPg3aiACQfCxH2pxc0ERdkEBaiEJCwJAIAlBBkkNAEEAIAlBBSOBgICAAEHch8KAAGoQ2IOAgAAACyAJDQBBACEJDAELIANBCGogCWohAgJAAkAgCUEBcQ0AIAUhBAwBCyACQX9qIgIgBSAFQf//A3FBCm4iBEEKbGtBMHI6AAALIAlBAUYNACACQX5qIQIDQCACIARB//8DcSIFQQpuIgpBCnBBMHI6AAAgAkEBaiAEIApBCmxrQTByOgAAIAVB5ABuIQQgAiADQQhqRyEFIAJBfmohAiAFDQALCyAAIANBCGogCSABQQxqKAIAEYCAgIAAgICAgABFDQBBASEFDAILQQAhBSAGQQBBDCAGIAdGIgIbaiEEIAJFDQALCyADQRBqJICAgIAAIAULtwMBBX8jgICAgABBIGsiBSSAgICAAEEBIQYCQCAAKAIAIgcgASACIAAoAgQiCCgCDCIJEYCAgIAAgICAgAANAAJAAkAgAC0ACkGAAXENAEEBIQYgByOBgICAAEGp0sGAAGpBASAJEYCAgIAAgICAgAANAiADIAAgBCgCDBGBgICAAICAgIAARQ0BDAILIAcjgYCAgABBqtLBgABqQQIgCRGAgICAAICAgIAADQFBASEGIAVBAToADyAFIAg2AgQgBSAHNgIAIAUjgYCAgABBxIfCgABqNgIUIAUgACkCCDcCGCAFIAVBD2o2AgggBSAFNgIQIAMgBUEQaiAEKAIMEYGAgIAAgICAgAANASOBgICAACEBIAUoAhAgAUGn0sGAAGpBAiAFKAIUKAIMEYCAgIAAgICAgAANAQsCQCACDQAgAC0ACkGAAXENACOBgICAACECQQEhBiAAKAIAIAJBrdLBgABqQQEgACgCBCgCDBGAgICAAICAgIAADQELI4GAgIAAIQYgACgCACAGQazSwYAAakEBIAAoAgQoAgwRgICAgACAgICAACEGCyAFQSBqJICAgIAAIAYL/gEBAX8jgICAgABBEGsiBySAgICAACAAKAIAIAEgAiAAKAIEKAIMEYCAgIAAgICAgAAhAiAHQQA6AA0gByACOgAMIAcgADYCCCAHQQhqIAMgBCAFIAYQ5oOAgAAhBiAHLQANIgIgBy0ADCIBciEAAkAgAkEBRw0AIAFBAXENAAJAIAYoAgAiAC0ACkGAAXENACOBgICAACECIAAoAgAgAkG30sGAAGpBAiAAKAIEKAIMEYCAgIAAgICAgAAhAAwBCyOBgICAACECIAAoAgAgAkG20sGAAGpBASAAKAIEKAIMEYCAgIAAgICAgAAhAAsgB0EQaiSAgICAACAAQQFxC4wCAQF/I4CAgIAAQRBrIgskgICAgAAgACgCACABIAIgACgCBCgCDBGAgICAAICAgIAAIQIgC0EAOgANIAsgAjoADCALIAA2AgggC0EIaiADIAQgBSAGEOaDgIAAIAcgCCAJIAoQ5oOAgAAhCiALLQANIgIgCy0ADCIBciEAAkAgAkEBRw0AIAFBAXENAAJAIAooAgAiAC0ACkGAAXENACOBgICAACECIAAoAgAgAkG30sGAAGpBAiAAKAIEKAIMEYCAgIAAgICAgAAhAAwBCyOBgICAACECIAAoAgAgAkG20sGAAGpBASAAKAIEKAIMEYCAgIAAgICAgAAhAAsgC0EQaiSAgICAACAAQQFxC00BAX8jgICAgABBEGsiBiSAgICAACAGIAI2AgwgBiABNgIIIAAgBkEIaiOBgICAAEGsjsKAAGoiAiAGQQxqIAIgAyAEIAUQgYSAgAAACx4AIAAoAgAgASACIAAoAgQoAgwRgICAgACAgICAAAv5BgMLfwN+AX8jgICAgABBoAFrIgMkgICAgAACQEGgAUUNACADQQBBoAH8CwALAkACQAJAAkAgACgCoAEiBCACSQ0AIARBKU8NASABIAJBAnRqIQUCQAJAAkAgBEUNACAEQQFqIQYgBEECdCECQQAhB0EAIQgDQCADIAdBAnRqIQkDQCAHIQogCSELIAEgBUYNCCALQQRqIQkgCkEBaiEHIAEoAgAhDCABQQRqIg0hASAMRQ0ACyAMrSEOQgAhDyACIQwgCiEBIAAhCQNAIAFBKE8NBCALIA8gCzUCAHwgCTUCACAOfnwiED4CACAQQiCIIQ8gC0EEaiELIAFBAWohASAJQQRqIQkgDEF8aiIMDQALIAQhCwJAIBBCgICAgBBUDQAgCiAEaiILQShPDQMgAyALQQJ0aiAPpzYCACAGIQsLIAggCyAKaiILIAggC0sbIQggDSEBDAALC0EAIQhBACELA0AgASAFRg0GIAtBAWohCyABKAIAIQkgAUEEaiIHIQEgCUUNACAIIAtBf2oiASAIIAFLGyEIIAchAQwACwsgC0EoI4GAgIAAQeyHwoAAahDMg4CAAAALIAFBKCOBgICAAEHsh8KAAGoQzIOAgAAACyAEQSlPDQEgAkEBaiERIAJBAnQhBiAAIARBAnRqIQ1BACEKIAAhCUEAIQgCQANAIAMgCkECdGohBwNAIAohDCAHIQsgCSANRg0FIAtBBGohByAMQQFqIQogCSgCACEFIAlBBGoiBCEJIAVFDQALIAWtIQ5CACEPIAYhBSAMIQkgASEHA0AgCUEoTw0CIAsgDyALNQIAfCAHNQIAIA5+fCIQPgIAIBBCIIghDyALQQRqIQsgCUEBaiEJIAdBBGohByAFQXxqIgUNAAsgAiELAkACQCAQQoCAgIAQVA0AIAwgAmoiC0EoTw0BIAMgC0ECdGogD6c2AgAgESELCyAIIAsgDGoiCyAIIAtLGyEIIAQhCQwBCwsgC0EoI4GAgIAAQeyHwoAAahDMg4CAAAALIAlBKCOBgICAAEHsh8KAAGoQzIOAgAAAC0EAIARBKCOBgICAAEHsh8KAAGoQ2IOAgAAAC0EAIARBKCOBgICAAEHsh8KAAGoQ2IOAgAAACwJAQaABRQ0AIAAgA0GgAfwKAAALIAAgCDYCoAEgA0GgAWokgICAgAAgAAvcBAEJfwJAAkACQCABQYAKTw0AIAFBBXYhAgJAAkACQCAAKAKgASIDRQ0AIANBf2ohBCADQQJ0IABqQXxqIQUgAyACakECdCAAakF8aiEGIANBKUkhAwNAIANFDQIgAiAEaiIHQShPDQMgBiAFKAIANgIAIAZBfGohBiAFQXxqIQUgBEF/aiIEQX9HDQALCyABQR9xIQYCQCABQSBJDQAgAkECdCIERQ0AIABBACAE/AsACyAAKAKgASIEIAJqIQUCQCAGDQAgACAFNgKgASAADwsgBUF/aiIDQSdLDQMgBSEIIAAgA0ECdGooAgBBICAGayIDdiIHRQ0EAkAgBUEnSw0AIAAgBUECdGogBzYCACAFQQFqIQgMBQsgBUEoI4GAgIAAQeyHwoAAahDMg4CAAAALIARBKCOBgICAAEHsh8KAAGoQzIOAgAAACyAHQSgjgYCAgABB7IfCgABqEMyDgIAAAAsjgYCAgAAiBEGu08GAAGpBHSAEQeyHwoAAahDag4CAAAALIANBKCOBgICAAEHsh8KAAGoQzIOAgAAACwJAIAJBAWoiCSAFTw0AAkAgBEEBcQ0AIAAgBUF/aiIFQQJ0aiIHIAdBfGooAgAgA3YgBygCACAGdHI2AgALIARBAkYNACAFQQJ0IABqQXRqIQQDQCAEQQhqIgcgBEEEaiIBKAIAIgogA3YgBygCACAGdHI2AgAgASAEKAIAIAN2IAogBnRyNgIAIARBeGohBCAJIAVBfmoiBUkNAAsLIAAgAkECdGoiBCAEKAIAIAZ0NgIAIAAgCDYCoAEgAAuiAwEEfwJAAkACQAJAAkACQAJAIAcgCFgNACAHIAh9IAhYDQMCQCAHIAZ9IAZYDQAgByAGQgGGfSAIQgGGWg0DCyAGIAhYDQYgByAGIAh9Igh9IAhWDQYgAyACTQ0BQQAgAyACI4GAgIAAQdyIwoAAahDYg4CAAAALIABBADYCAA8LIAEgA2ohCUEAIQogASELAkACQANAIAMgCkYNASAKQQFqIQogC0F/aiILIANqIgwtAABBOUYNAAsgDCAMLQAAQQFqOgAAIApBf2oiCkUNASAMQQFqQTAgCvwLAAwBCwJAAkAgAw0AQTEhCgwBCyABQTE6AABBMCEKIANBf2oiC0UNACABQQFqQTAgC/wLAAsgBEEBasEiBCAFwUwNACADIAJPDQAgCSAKOgAAIANBAWohAwsgAyACSw0CDAMLIAMgAk0NAkEAIAMgAiOBgICAAEHsiMKAAGoQ2IOAgAAACyAAQQA2AgAPC0EAIAMgAiOBgICAAEHMiMKAAGoQ2IOAgAAACyAAIAQ7AQggACADNgIEIAAgATYCAA8LIABBADYCAAtNAQF/I4CAgIAAQRBrIgYkgICAgAAgBiACNgIMIAYgATYCCCAAIAZBCGojgYCAgABBvI7CgABqIgIgBkEMaiACIAMgBCAFEIGEgIAAAAunCwIHfwN+AkACQAJAAkACQAJAIAFBCEkNACABQQdxIgJFDQUjgYCAgAAhAyAAKAKgASIEQSlPDQECQCAEDQAgAEEANgKgAQwGCyAEQQJ0IgVBfGoiBkECdkEBaiIHQQNxIQggA0Gs4cGAAGogAkECdGooAgAgAnatIQkCQAJAIAZBDE8NAEIAIQogACECDAELIAdB/P///wdxIQNCACEKIAAhAgNAIAIgAjUCACAJfiAKfCIKPgIAIAJBBGoiBiAGNQIAIAl+IApCIIh8Igo+AgAgAkEIaiIGIAY1AgAgCX4gCkIgiHwiCj4CACACQQxqIgYgBjUCACAJfiAKQiCIfCILPgIAIAtCIIghCiACQRBqIQIgA0F8aiIDDQALCwJAIAhFDQAgCEECdCEDA0AgAiACNQIAIAl+IAp8Igs+AgAgAkEEaiECIAtCIIghCiADQXxqIgMNAAsLAkAgC0KAgICAEFQNACAEQShGDQMgACAFaiAKpzYCACAEQQFqIQQLIAAgBDYCoAEMBQsjgYCAgAAhAiAAKAKgASIGQSlPDQICQCAGDQAgAEEANgKgASAADwsgAkGs4cGAAGogAUECdGo1AgAhCSAGQQJ0IghBfGoiAkECdkEBaiIDQQNxIQQCQAJAIAJBDE8NAEIAIQogACECDAELIANB/P///wdxIQNCACEKIAAhAgNAIAIgAjUCACAJfiAKfCIKPgIAIAJBBGoiASABNQIAIAl+IApCIIh8Igo+AgAgAkEIaiIBIAE1AgAgCX4gCkIgiHwiCj4CACACQQxqIgEgATUCACAJfiAKQiCIfCILPgIAIAtCIIghCiACQRBqIQIgA0F8aiIDDQALCwJAIARFDQAgBEECdCEDA0AgAiACNQIAIAl+IAp8Igs+AgAgAkEEaiECIAtCIIghCiADQXxqIgMNAAsLAkAgC0KAgICAEFQNACAGQShGDQQgACAIaiAKpzYCACAGQQFqIQYLIAAgBjYCoAEgAA8LQQAgBEEoI4GAgIAAQeyHwoAAahDYg4CAAAALQShBKCOBgICAAEHsh8KAAGoQzIOAgAAAC0EAIAZBKCOBgICAAEHsh8KAAGoQ2IOAgAAAC0EoQSgjgYCAgABB7IfCgABqEMyDgIAAAAsCQAJAAkAgAUEIcUUNACAAKAKgASIEQSlPDQECQAJAIAQNAEEAIQQMAQsgBEECdCIHQXxqIgJBAnZBAWoiA0EDcSEIAkACQCACQQxPDQBCACEJIAAhAgwBCyADQfz///8HcSEDQgAhCSAAIQIDQCACIAI1AgBC4esXfiAJfCIJPgIAIAJBBGoiBiAGNQIAQuHrF34gCUIgiHwiCT4CACACQQhqIgYgBjUCAELh6xd+IAlCIIh8Igk+AgAgAkEMaiIGIAY1AgBC4esXfiAJQiCIfCIKPgIAIApCIIghCSACQRBqIQIgA0F8aiIDDQALCwJAIAhFDQAgCEECdCEDA0AgAiACNQIAQuHrF34gCXwiCj4CACACQQRqIQIgCkIgiCEJIANBfGoiAw0ACwsgCkKAgICAEFQNACAEQShGDQMgACAHaiAJpzYCACAEQQFqIQQLIAAgBDYCoAELAkAgAUEQcUUNACAAI4GAgIAAQdThwYAAakECEPCDgIAAGgsCQCABQSBxRQ0AIAAjgYCAgABB3OHBgABqQQMQ8IOAgAAaCwJAIAFBwABxRQ0AIAAjgYCAgABB6OHBgABqQQUQ8IOAgAAaCwJAIAFBgAFxRQ0AIAAjgYCAgABB/OHBgABqQQoQ8IOAgAAaCwJAIAFBgAJxRQ0AIAAjgYCAgABBpOLBgABqQRMQ8IOAgAAaCyAAIAEQ8YOAgAAaIAAPC0EAIARBKCOBgICAAEHsh8KAAGoQ2IOAgAAAC0EoQSgjgYCAgABB7IfCgABqEMyDgIAAAAvhBwIDfwF+I4CAgIAAQdAAayIFJICAgIAAIAUgAzYCBCAFIAI2AgACQAJAAkACQCABQYECSQ0AQf0BIQYDQAJAAkAgACAGaiIHQQNqLAAAQb9/Sg0AIAdBAmosAABBv39MDQEgBkECaiEGDAULIAZBA2ohBgwECyAHQQFqLAAAQb9/Sg0CIAcsAABBv39KDQMgBkF8aiIGQX1HDQALQQAhBgwCCyAFIAE2AgwgBSAANgIIQQAhBkEBIQcMAgsgBkEBaiEGCyAFIAA2AggjgYCAgAAhByAFIAY2AgwgB0Hw5MGAAGpBASAGIAFJIgYbIQdBBUEAIAYbIQYLIAUgBjYCFCAFIAc2AhACQAJAIAIgAUsNACADIAFNDQEgAyECCyAFIAI2AiAgBSOVgICAAK1CIIYgBUEgaq2ENwMoIAUjiYCAgABBnYGAgABqrUIghiIIIAVBEGqthDcDOCAFIAggBUEIaq2ENwMwI4GAgIAAQdSAwIAAaiAFQShqIAQQyIOAgAAACwJAAkACQAJAAkAgAiADSw0AAkACQCACRQ0AIAIgAU8NACAAIAJqLAAAQUBIDQELIAMhAgsgBSACNgIYIAIgAU8NAkEAIQcgAkUNAQNAAkAgACACaiwAAEG/f0wNACACIQcMAwsgAkF/aiICDQAMAgsLIAUjlYCAgACtQiCGIgggBUEEaq2ENwMwIAUgCCAFrYQ3AyggBSOJgICAAEGdgYCAAGqtQiCGIgggBUEQaq2ENwNAIAUgCCAFQQhqrYQ3AzgjgYCAgABBqIDAgABqIAVBKGogBBDIg4CAAAALIAcgAUYNAAJAAkAgACAHaiIALAAAIgZBf0oNACAALQABQT9xIQIgBkEfcSEBIAZBX0sNASABQQZ0IAJyIQYMAwsgBSAGQf8BcTYCHEEBIQYMAwsgAkEGdCAALQACQT9xciECAkAgBkFwTw0AIAIgAUEMdHIhBgwCCyACQQZ0IAAtAANBP3FyIAFBEnRBgIDwAHFyIgZBgIDEAEcNAQsgBBD2g4CAAAALIAUgBjYCHAJAIAZBgAFPDQBBASEGDAELAkAgBkGAEE8NAEECIQYMAQtBA0EEIAZBgIAESRshBgsgBSAHNgIgIAUgBiAHajYCJCAFI4mAgIAAIgdBnYGAgABqrUIghiIIIAVBEGqthDcDSCAFIAggBUEIaq2ENwNAIAUgB0GegYCAAGqtQiCGIAVBIGqthDcDOCAFI5aAgIAArUIghiAFQRxqrYQ3AzAgBSOVgICAAK1CIIYgBUEYaq2ENwMoI4GAgIAAQf2AwIAAaiAFQShqIAQQyIOAgAAACxoAI4GAgIAAQfXkwYAAakErIAAQ2oOAgAAAC1UBAn9BASECAkAgACABEL2DgIAADQAjgYCAgAAhAyABKAIAIANB/PHBgABqQQIgASgCBCgCDBGAgICAAICAgIAADQAgAEEEaiABEL2DgIAAIQILIAILvQwDCX8BfgJ/AkACQAJAIARFDQBBASEFQQAhBkEAIQdBASEIAkAgBEEBRg0AQQEhCUEBIQpBACELQQEhBUEAIQYDQAJAAkAgBiALaiIMIARPDQACQCADIAlqLQAAQf8BcSIJIAMgDGotAAAiDEkNAAJAIAkgDEYNAEEBIQVBACELIAohBiAKQQFqIQoMAwtBACALQQFqIgkgCSAFRiIMGyELIAlBACAMGyAKaiEKDAILIAogC2pBAWoiCiAGayEFQQAhCwwBCyAMIAQjgYCAgABBvI3CgABqEMyDgIAAAAsgCiALaiIJIARJDQALQQEhCUEBIQpBACELQQEhCEEAIQcDQAJAAkACQCAHIAtqIgwgBE8NACADIAlqLQAAQf8BcSIJIAMgDGotAAAiDEsNAQJAIAkgDEYNAEEBIQhBACELIAohByAKQQFqIQoMAwtBACALQQFqIgkgCSAIRiIMGyELIAlBACAMGyAKaiEKDAILIAwgBCOBgICAAEG8jcKAAGoQzIOAgAAACyAKIAtqQQFqIgogB2shCEEAIQsLIAogC2oiCSAESQ0ACwsCQAJAAkACQCAEIAYgByAGIAdLIgsbIg1JDQAgBSAIIAsbIgogDWoiCyAKSQ0BIAsgBEsNAQJAAkAgAyADIApqIA0QnYOAgABFDQAgBEEDcSEJAkACQCAEQX9qQQNPDQBCACEOQQAhCgwBCyAEQXxxIQxCACEOQQAhCgNAQgEgAyAKaiILQQNqMQAAhkIBIAtBAmoxAACGQgEgC0EBajEAAIZCASALMQAAhiAOhISEhCEOIAwgCkEEaiIKRw0ACwsCQCAJRQ0AIAMgCmohCwNAQgEgCzEAAIYgDoQhDiALQQFqIQsgCUF/aiIJDQALCyAEIA1rIgsgDSALIA1LG0EBaiEKQX8hByANIQVBfyELDAELIARBf2ohB0EBIQZBACELQQEhDEEAIQgCQANAIAwiCSALaiIPIARPDQEgBCALayAJQX9zaiIMIARPDQkgByALIAhqayIFIARPDQgCQAJAAkAgAyAMai0AAEH/AXEiDCADIAVqLQAAIgVJDQAgDCAFRg0BIAlBAWohDEEAIQtBASEGIAkhCAwCCyAPQQFqIgwgCGshBkEAIQsMAQtBACALQQFqIgwgDCAGRiIFGyELIAxBACAFGyAJaiEMCyAGIApHDQALC0EBIQZBACELQQEhDEEAIQ8CQANAIAwiCSALaiIQIARPDQEgBCALayAJQX9zaiIMIARPDQUgByALIA9qayIFIARPDQYCQAJAAkAgAyAMai0AAEH/AXEiDCADIAVqLQAAIgVLDQAgDCAFRg0BIAlBAWohDEEAIQtBASEGIAkhDwwCCyAQQQFqIgwgD2shBkEAIQsMAQtBACALQQFqIgwgDCAGRiIFGyELIAxBACAFGyAJaiEMCyAGIApHDQALCyAEIA8gCCAPIAhLG2shBQJAAkAgCg0AQgAhDkEAIQpBACEHDAELIApBA3EhDEEAIQcCQAJAIApBBE8NAEIAIQ5BACEJDAELIApBfHEhBkIAIQ5BACEJA0BCASADIAlqIgtBA2oxAACGQgEgC0ECajEAAIZCASALQQFqMQAAhkIBIAsxAACGIA6EhISEIQ4gBiAJQQRqIglHDQALCyAMRQ0AIAMgCWohCwNAQgEgCzEAAIYgDoQhDiALQQFqIQsgDEF/aiIMDQALCyAEIQsLIAAgBDYCPCAAIAM2AjggACACNgI0IAAgATYCMCAAIAs2AiggACAHNgIkIAAgAjYCICAAQQA2AhwgACAKNgIYIAAgBTYCFCAAIA02AhAgACAONwMIIABBATYCAA8LQQAgDSAEI4GAgIAAQfyNwoAAahDYg4CAAAALIAogCyAEI4GAgIAAQeyNwoAAahDYg4CAAAALIAwgBCOBgICAAEHMjcKAAGoQzIOAgAAACyAFIAQjgYCAgABB3I3CgABqEMyDgIAAAAsgAEEANgI8IAAgAzYCOCAAIAI2AjQgACABNgIwIABBADoADiAAQYECOwEMIAAgAjYCCCAAQgA3AwAPCyAFIAQjgYCAgABB3I3CgABqEMyDgIAAAAsgDCAEI4GAgIAAQcyNwoAAahDMg4CAAAAL3QIBBX9BACEBI4GAgIAAQaDlwYAAaiICIAJBAEEQIABBq50ESRsiAyADQQhyIgMgAiADQQJ0aigCAEELdCAAQQt0IgNLGyIEIARBBHIiBCACIARBAnRqKAIAQQt0IANLGyIEIARBAnIiBCACIARBAnRqKAIAQQt0IANLGyIEIARBAWoiBCACIARBAnRqKAIAQQt0IANLGyIEIARBAWoiBCACIARBAnRqKAIAQQt0IANLGyIEQQJ0aigCAEELdCICIANGIAIgA0lqIARqIgRBAnRqIgUoAgBBFXYhAkH/BSEDAkACQCAEQR9LDQAgBSgCBEEVdiEDIARFDQELIAVBfGooAgBB////AHEhAQsCQCADIAJBf3NqRQ0AIAAgAWshACADQX9qIQRBACEDA0AgAyOBgICAAEGvysGAAGogAmotAABqIgMgAEsNASAEIAJBAWoiAkcNAAsLIAJBAXELzgcBB38CQAJAAkAgAEEgSQ0AAkAgAEH/AE8NAEEBIQEMAwsCQAJAIABBgIAESQ0AIABBgIAISQ0BIABB/v//AHEiAUGunQtHIABB4P//AHFB4M0KRyABQZ7wCkdxcSAAQZCodGpBcUlxIABBgJB0akHebElxIABBgIB0akGedElxIABBsNlzakF7SXEgAEGA/kdqQfrmVElxIABB8IM4SXEhAQwECyOBgICAAEHM7MGAAGoiAkECaiEBIABBCHZB/wFxIQNBACEEAkADQCABIQUgBCACLQABIgFqIQYCQAJAIAItAAAiAiADRg0AIAIgA0sNAwwBCwJAIAYgBEkNACAGQZwCSw0AI4GAgIAAQZjtwYAAaiAEaiECA0AgAUUNAiABQX9qIQEgAi0AACEEIAJBAWohAiAEIABB/wFxRw0ADAYLCyAEIAZBnAIjgYCAgABBnI7CgABqENiDgIAAAAsgBUEAQQIgBSOBgICAAEHM7MGAAGpBzABqIgdGG2ohASAGIQQgBSECIAUgB0cNAAsLQQEhAUEAIQIDQCACQQFqIQUCQAJAI4GAgIAAQbTvwYAAaiACaiwAACIEQQBIDQAgBSECDAELAkAgBUGkAkYNACAEQf8AcUEIdCOBgICAAEG078GAAGogAmpBAWotAAByIQQgAkECaiECDAELI4GAgIAAQYyOwoAAahD2g4CAAAALIAAgBGsiAEEASA0EIAFBAXMhASACQaQCRw0ADAQLCyOBgICAAEGk5sGAAGoiAkECaiEBIABBCHZB/wFxIQNBACEEA0AgASEFIAQgAi0AASIBaiEGAkACQCACLQAAIgIgA0YNACACIANNDQEMBAsCQCAGIARJDQAgBkHUAUsNACOBgICAAEGA58GAAGogBGohAgNAIAFFDQIgAUF/aiEBIAItAAAhBCACQQFqIQIgBCAAQf8BcUcNAAwECwsgBCAGQdQBI4GAgIAAQZyOwoAAahDYg4CAAAALIAVBAEECIAUjgYCAgABBpObBgABqQdwAakYiBxtqIQEgBiEEIAUhAiAHRQ0ADAILC0EAIQEMAQsgAEH//wNxIQRBASEBQQAhAgNAIAJBAWohBQJAAkAjgYCAgABB1OjBgABqIAJqLAAAIgBBAEgNACAFIQIMAQsCQCAFQfgDRg0AIABB/wBxQQh0I4GAgIAAQdTowYAAaiACakEBai0AAHIhACACQQJqIQIMAQsjgYCAgABBjI7CgABqEPaDgIAAAAsgBCAAayIEQQBIDQEgAUEBcyEBIAJB+ANHDQALCyABQQFxCxUAIAFpQQFGIABBgICAgHggAWtNcQtmAgF/AX4jgICAgABBIGsiAySAgICAACADIAE2AgwgAyAANgIIIAMjlYCAgACtQiCGIgQgA0EMaq2ENwMYIAMgBCADQQhqrYQ3AxAjgYCAgABBzYLAgABqIANBEGogAhDIg4CAAAALZgIBfwF+I4CAgIAAQSBrIgMkgICAgAAgAyABNgIMIAMgADYCCCADI5WAgIAArUIghiIEIANBDGqthDcDGCADIAQgA0EIaq2ENwMQI4GAgIAAQY+EwIAAaiADQRBqIAIQyIOAgAAAC2YCAX8BfiOAgICAAEEgayIDJICAgIAAIAMgATYCDCADIAA2AgggAyOVgICAAK1CIIYiBCADQQxqrYQ3AxggAyAEIANBCGqthDcDECOBgICAAEHIhMCAAGogA0EQaiACEMiDgIAAAAumAgEFfwJAAkACQAJAIAJBA2pBfHEiBCACRw0AIANBeGohBUEAIQQMAQsgAyAEIAJrIgQgAyAESRshBAJAIANFDQBBACEGIAFB/wFxIQdBASEIA0AgAiAGai0AACAHRg0EIAQgBkEBaiIGRw0ACwsgBCADQXhqIgVLDQELIAFB/wFxQYGChAhsIQYDQEGAgoQIIAIgBGoiBygCACAGcyIIayAIckGAgoQIIAdBBGooAgAgBnMiB2sgB3JxQYCBgoR4cUGAgYKEeEcNASAEQQhqIgQgBU0NAAsLAkAgAyAERg0AIAFB/wFxIQZBASEIA0ACQCACIARqLQAAIAZHDQAgBCEGDAMLIAMgBEEBaiIERw0ACwtBACEICyAAIAY2AgQgACAINgIAC4EBAQF/I4CAgIAAQSBrIgUkgICAgAAgBSABNgIEIAUgADYCACAFIAM2AgwgBSACNgIIIAUjiYCAgAAiAUGfgYCAAGqtQiCGIAVBCGqthDcDGCAFIAFBnYGAgABqrUIghiAFrYQ3AxAjgYCAgABB64rAgABqIAVBEGogBBDIg4CAAAAL1wICAX8BfiOAgICAAEHAAGsiCCSAgICAACAIIAI2AgQgCCABNgIAIAggBDYCDCAIIAM2AgggCCOBgICAACICQYTywYAAaiAAQf8BcUECdCIBaigCADYCFCAIIAJBzI7CgABqIAFqKAIANgIQAkAgBUUNACAIIAY2AhwgCCAFNgIYIAgjq4CAgACtQiCGIAhBGGqthDcDKCAII4mAgIAAIgVBn4GAgABqrUIghiIJIAhBCGqthDcDOCAIIAkgCK2ENwMwIAggBUGdgYCAAGqtQiCGIAhBEGqthDcDICOBgICAAEHjh8CAAGogCEEgaiAHEMiDgIAAAAsgCCOJgICAACIFQZ+BgIAAaq1CIIYiCSAIQQhqrYQ3AzAgCCAJIAithDcDKCAIIAVBnYGAgABqrUIghiAIQRBqrYQ3AyAjgYCAgABBrIfAgABqIAhBIGogBxDIg4CAAAALHAAgASgCACABKAIEIAAoAgAgACgCBBC4g4CAAAvKBAEHfwJAIAEoAgQiAkUNACABKAIAIQNBACEEAkADQCAEQQFqIQUCQAJAIAMgBGotAAAiBsAiB0F/TA0AIAUhBAwBCwJAAkACQAJAAkACQAJAAkACQAJAAkAjgYCAgABB8OLBgABqIAZqLQAAQX5qDgMAAQINCyADIAVqI4GAgIAAQYijwIAAaiAFIAJJGywAAEFATg0MIARBAmohBAwKCyADIAVqI4GAgIAAQYijwIAAaiAFIAJJGywAACEIIAZBoH5qDg4BAwMDAwMDAwMDAwMDAgMLIAMgBWojgYCAgABBiKPAgABqIAUgAkkbLAAAIQggBkGQfmoOBQQDAwMFAwsgCEFgcUGgf0cNCQwGCyAIQZ9/Sg0IDAULAkAgB0EfakH/AXFBDEkNACAHQX5xQW5HDQggCEFATg0IDAULIAhBQE4NBwwECyAHQQ9qQf8BcUECSw0GIAhBQE4NBgwCCyAIQfAAakH/AXFBME8NBQwBCyAIQY9/Sg0ECyADIARBAmoiBWojgYCAgABBiKPAgABqIAUgAkkbLAAAQb9/Sg0DIAMgBEEDaiIFaiOBgICAAEGIo8CAAGogBSACSRssAABBv39KDQMgBEEEaiEEDAELIAMgBEECaiIFaiOBgICAAEGIo8CAAGogBSACSRssAABBQE4NAiAEQQNqIQQLIAQhBSAEIAJJDQALCyAAIAQ2AgQgACADNgIAIAEgAiAFazYCBCABIAMgBWo2AgAgACAFIARrNgIMIAAgAyAEajYCCA8LIABBADYCAAscACAAKAIAIAEgACgCBCgCEBGBgICAAICAgIAAC8oBAQF/I4CAgIAAQSBrIgIkgICAgAACQAJAIAAtAARBAUcNACACIAAtAAU6AA8gAiOVgICAAK1CIIYgAK2ENwMYIAIjkoCAgACtQiCGIAJBD2qthDcDECOBgICAACEAIAEoAgAgASgCBCAAQe+BwIAAaiACQRBqELiDgIAAIQAMAQsgAiOVgICAAK1CIIYgAK2ENwMQI4GAgIAAIQAgASgCACABKAIEIABBoILAgABqIAJBEGoQuIOAgAAhAAsgAkEgaiSAgICAACAAC2cBAn8gACgCBCECIAAoAgAhAwJAIAAoAggiAC0AAEUNACADI4GAgIAAQf7xwYAAakEEIAIoAgwRgICAgACAgICAAEUNAEEBDwsgACABQQpGOgAAIAMgASACKAIQEYGAgIAAgICAgAALbgEGfiAAIANC/////w+DIgUgAUL/////D4MiBn4iByADQiCIIgggBn4iBiAFIAFCIIgiCX58IgVCIIZ8Igo3AwAgACAIIAl+IAUgBlStQiCGIAVCIIiEfCAKIAdUrXwgBCABfiADIAJ+fHw3AwgLC+yOAgIAQYCAwAALkPIBaW50ZXJuYWwgZXJyb3I6IGVudGVyZWQgdW5yZWFjaGFibGUgY29kZQ5iZWdpbiA8PSBlbmQgKMAEIDw9IMAQKSB3aGVuIHNsaWNpbmcgYMABYMAAC2J5dGUgaW5kZXggwBYgaXMgb3V0IG9mIGJvdW5kcyBvZiBgwAFgwAALYnl0ZSBpbmRleCDAJiBpcyBub3QgYSBjaGFyIGJvdW5kYXJ5OyBpdCBpcyBpbnNpZGUgwAggKGJ5dGVzIMAGKSBvZiBgwAFgwAARcmVjZWlwdF9leGVjdXRvcl/AAAhkaWQ6dDNuOsAAwAE6wAE6wAAaaW52YWxpZCB1dGYtOCBzZXF1ZW5jZSBvZiDAEiBieXRlcyBmcm9tIGluZGV4IMAAKmluY29tcGxldGUgdXRmLTggYnl0ZSBzZXF1ZW5jZSBmcm9tIGluZGV4IMAAFnNsaWNlIGluZGV4IHN0YXJ0cyBhdCDADSBidXQgZW5kcyBhdCDAACVFeGVjdXRvcjogVGFyZ2V0IEFQSSByZXR1cm5lZCBzdGF0dXMgwAAgaW5kZXggb3V0IG9mIGJvdW5kczogdGhlIGxlbiBpcyDAEiBidXQgdGhlIGluZGV4IGlzIMAAEkludmFsaWQgY2hhcmFjdGVyIMANIGF0IHBvc2l0aW9uIMAAwAkgYXQgbGluZSDACCBjb2x1bW4gwAAScmFuZ2Ugc3RhcnQgaW5kZXggwCIgb3V0IG9mIHJhbmdlIGZvciBzbGljZSBvZiBsZW5ndGggwAAQcmFuZ2UgZW5kIGluZGV4IMAiIG91dCBvZiByYW5nZSBmb3Igc2xpY2Ugb2YgbGVuZ3RoIMAAB3N0cmluZyDAAA9pbnZhbGlkIGxlbmd0aCDACywgZXhwZWN0ZWQgwAAPaW52YWxpZCB2YWx1ZTogwAssIGV4cGVjdGVkIMAADmludmFsaWQgdHlwZTogwAssIGV4cGVjdGVkIMAAHUludmFsaWQgZW5jbGF2ZSBwcml2YXRlIGtleTogwAAeRmFpbGVkIHRvIGRlY29kZSBwcml2YXRlIGtleTogwAAnRmFpbGVkIHRvIGRlY29kZSBlcGhlbWVyYWwgcHVibGljIGtleTogwAAVRmFpbGVkIHRvIGRlY29kZSBpdjogwAAdRmFpbGVkIHRvIGRlY29kZSBjaXBoZXJ0ZXh0OiDAACFGYWlsZWQgdG8gcGFyc2UgZXhlY3V0ZSByZXF1ZXN0OiDAABBhc3NlcnRpb24gYGxlZnQgwBcgcmlnaHRgIGZhaWxlZAogIGxlZnQ6IMAJCiByaWdodDogwAAQYXNzZXJ0aW9uIGBsZWZ0IMAQIHJpZ2h0YCBmYWlsZWQ6IMAJCiAgbGVmdDogwAkKIHJpZ2h0OiDAACVJbnZhbGlkIGVwaGVtZXJhbCBwdWJsaWMga2V5IGZvcm1hdDogwAAgRmFpbGVkIHRvIHBhcnNlIHBheW91dCBkZXRhaWxzOiDAAA9TaWduaW5nIGVycm9yOiDAACVGYWlsZWQgdG8gaW5pdGlhbGl6ZSBBRVMtR0NNIGNpcGhlcjogwAAnRXhlY3V0b3I6IEZpcmluZyBibGluZCBlZ3Jlc3MgUE9TVCB0bzogwAAbRmFpbGVkIHRvIGRlY29kZSBhdXRoIHRhZzogwAAnRXhlY3V0b3I6IFNpbXVsYXRlZCBIVFRQIG91dGFnZSEgQ29kZTogwAATRGVjcnlwdGlvbiBmYWlsZWQ6IMAAHEhUVFAgZWdyZXNzIHdlYmhvb2sgZmFpbGVkOiDAAB5QbGFpbnRleHQgaXMgbm90IHZhbGlkIFVURi04OiDAAMACOiDAAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvYWxsb2Mvc3JjL2NvbGxlY3Rpb25zL2J0cmVlL21hcC9lbnRyeS5ycwBsaWJyYXJ5L2NvcmUvc3JjL251bS9mbHQyZGVjL3N0cmF0ZWd5L2dyaXN1LnJzAC9Vc2Vycy9lZHljdS8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL3NlYzEtMC43LjMvc3JjL3BvaW50LnJzAGxpYnJhcnkvYWxsb2Mvc3JjL2ZtdC5ycwBsaWJyYXJ5L2NvcmUvc3JjL251bS9kaXlfZmxvYXQucnMAbGlicmFyeS9zdGQvc3JjL3N5cy9zeW5jL211dGV4L25vX3RocmVhZHMucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvY29uc3Qtb2lkLTAuOS42L3NyYy9hcmNzLnJzAC9Vc2Vycy9lZHljdS8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL3NlcmRlX2pzb24tMS4wLjE1MC9zcmMvZXJyb3IucnMAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9jb3JlL3NyYy9zbGljZS9pdGVyLnJzAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvY29yZS9zcmMvc3RyL3BhdHRlcm4ucnMAbGlicmFyeS9jb3JlL3NyYy9udW0vZmx0MmRlYy9zdHJhdGVneS9kcmFnb24ucnMAbGlicmFyeS9jb3JlL3NyYy9udW0vYmlnbnVtLnJzAGxpYnJhcnkvY29yZS9zcmMvZm10L251bS5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9rMjU2LTAuMTMuNC9zcmMvYXJpdGhtZXRpYy9tdWwucnMAbGlicmFyeS9zdGQvc3JjL3N5cy9pby9pb19zbGljZS93YXNpLnJzAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvYWxsb2Mvc3JjL3N0cmluZy5ycwBsaWJyYXJ5L3N0ZC9zcmMvcGFuaWNraW5nLnJzAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvYWxsb2Mvc3JjL2NvbGxlY3Rpb25zL2J0cmVlL25hdmlnYXRlLnJzAC9Vc2Vycy9lZHljdS8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL2NpcGhlci0wLjQuNC9zcmMvc3RyZWFtX2NvcmUucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvc2VyZGVfanNvbi0xLjAuMTUwL3NyYy9pby9jb3JlLnJzAGxpYnJhcnkvY29yZS9zcmMvdW5pY29kZS9wcmludGFibGUucnMAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9hbGxvYy9zcmMvY29sbGVjdGlvbnMvYnRyZWUvbm9kZS5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9zZXJkZV9qc29uLTEuMC4xNTAvc3JjL2RlLnJzAGxpYnJhcnkvY29yZS9zcmMvZm10L21vZC5ycwBsaWJyYXJ5L3N0ZC9zcmMvaW8vbW9kLnJzAGxpYnJhcnkvYWxsb2Mvc3JjL3Jhd192ZWMvbW9kLnJzAGxpYnJhcnkvY29yZS9zcmMvbnVtL2ZsdDJkZWMvbW9kLnJzAGxpYnJhcnkvc3RkL3NyYy90aHJlYWQvaWQucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvc2VyZGVfanNvbi0xLjAuMTUwL3NyYy9yZWFkLnJzAGxpYnJhcnkvc3RkL3NyYy9hbGxvYy5ycwBleGVjdXRvci9zcmMvbGliLnJzAC9Vc2Vycy9lZHljdS8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL2l0b2EtMS4wLjE4L3NyYy9saWIucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvZ2VuZXJpYy1hcnJheS0wLjE0Ljcvc3JjL2xpYi5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9jb25zdC1vaWQtMC45LjYvc3JjL2xpYi5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9oZXgtMC40LjMvc3JjL2xpYi5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9rMjU2LTAuMTMuNC9zcmMvYXJpdGhtZXRpYy9zY2FsYXIvd2lkZTMyLnJzAC9Vc2Vycy9lZHljdS8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL2Flcy0wLjguNC9zcmMvc29mdC9maXhzbGljZTMyLnJzAAVIVFRQIMAUIFNlcnZpY2UgVW5hdmFpbGFibGUAFW1lbW9yeSBhbGxvY2F0aW9uIG9mIMANIGJ5dGVzIGZhaWxlZAAQZmxvYXRpbmcgcG9pbnQgYMABYAALY2hhcmFjdGVyIGDAAWAACWludGVnZXIgYMABYAAJYm9vbGVhbiBgwAFgAA9taXNzaW5nIGZpZWxkIGDAAWAAEWR1cGxpY2F0ZSBmaWVsZCBgwAFgAAhkaWQ6dDNuOsAGI2tleS0xAC8AEU9iamVjdElkZW50aWZpZXIowAEpAA1BUFBMSUNBVElPTiBbwANdICjAASkACVBSSVZBVEUgW8ADXSAowAEpABJDT05URVhULVNQRUNJRklDIFvAA10gKMABKQAGRXJyb3IowAgsIGxpbmU6IMAKLCBjb2x1bW46IMABKQAVbWVtb3J5IGFsbG9jYXRpb24gb2YgwEcgYnl0ZXMgZmFpbGVkCnNraXBwaW5nIGJhY2t0cmFjZSBwcmludGluZyB0byBhdm9pZCBwb3RlbnRpYWwgcmVjdXJzaW9uCgA1ZmF0YWwgcnVudGltZSBlcnJvcjogZmFpbGVkIHRvIGluaXRpYXRlIHBhbmljLCBlcnJvciDACywgYWJvcnRpbmcKABVtZW1vcnkgYWxsb2NhdGlvbiBvZiDADiBieXRlcyBmYWlsZWQKAAxwYW5pY2tlZCBhdCDAAjoKwDMKdGhyZWFkIHBhbmlja2VkIHdoaWxlIHByb2Nlc3NpbmcgcGFuaWMuIGFib3J0aW5nLgoACQp0aHJlYWQgJ8ADJyAowA4pIHBhbmlja2VkIGF0IMACOgrAAQoAGWFib3J0aW5nIGR1ZSB0byBwYW5pYyBhdCDAAjoKwAEKAGVwaGVtZXJhbF9wdWJsaWNfa2V5aXZjaXBoZXJ0ZXh0YXV0aF90YWdzdHJ1Y3QgRWNpZXNFbnZlbG9wZSB3aXRoIDQgZWxlbWVudHNyZWNpcGllbnRfYWNjb3VudGFtb3VudHN0cnVjdCBQYXlvdXRQYXlsb2FkIHdpdGggMiBlbGVtZW50c2VudmVsb3BlZm9yY2VfaHR0cF9mYWlsX2NvZGVzdHJ1Y3QgRXhlY3V0ZVJlcXVlc3Qgd2l0aCAyIGVsZW1lbnRzcmVjaXBpZW50fXN0cnVjdCBFY2llc0VudmVsb3Blc3RydWN0IFBheW91dFBheWxvYWRzdHJ1Y3QgRXhlY3V0ZVJlcXVlc3RlcGhlbWVyYWxQdWJsaWNLZXllcGhlbWVyYWxfcHVia2V5ZXBoZW1lcmFsX3B1YmxpY19rZXljaXBoZXJ0ZXh0YXV0aFRhZ21hY2EgRGlzcGxheSBpbXBsZW1lbnRhdGlvbiByZXR1cm5lZCBhbiBlcnJvciB1bmV4cGVjdGVkbHlFcnJvck5vdCBpbXBsZW1lbnRlZCBpbiBleGVjdXRvckV4ZWN1dG9yOiBJbml0aWF0aW5nIHNlY3VyZSBibGluZCBleGVjdXRpb24uLi5leGVjdXRlOiBtaXNzaW5nIGlucHV0IHBheWxvYWRFeGVjdXRvcjogRGVjcnlwdGluZyBFQ0lFUyBwYXlsb2FkLi4uRXhlY3V0b3I6IERlY3J5cHRlZCBFQ0lFUyBwYXlsb2FkIHN1Y2Nlc3NmdWxseWh0dHBzOi8vdHJlYXN1cnkuc2FuZGJveC50ZXN0L3BheW91dENvbnRlbnQtVHlwZWFwcGxpY2F0aW9uL2pzb25FeGVjdXRvcjogUGF5b3V0IHNldHRsZWQgb24tY2hhaW4vdGFyZ2V0IEFQSSBzdWNjZXNzZnVsbHkuc2V0dGxlZHR5cGVKc29uV2ViU2lnbmF0dXJlMjAyMGNyZWF0ZWR2ZXJpZmljYXRpb25NZXRob2Rwcm9vZlB1cnBvc2Vhc3NlcnRpb25NZXRob2RzaWduYXR1cmVWYWx1ZWNhbGxlZCBgUmVzdWx0Ojp1bndyYXAoKWAgb24gYW4gYEVycmAgdmFsdWVpZGlzc3VlcmNyZWRlbnRpYWxTdWJqZWN0cHJvb2ZyZWNpcGllbnRfYWNjb3VudGFtb3VudHN0YXR1c3RpbWVzdGFtcGIyOWQyZjZlZTkwMTFmYWI1MDQ2ZWI3MTkwZjQ3YzIxNmU1MjQzOGZhMGZiYTY3NTE2ZTdjMWUzNzY2NzNlOWFIS0RGIGV4cGFuc2lvbiBmYWlsZWQADAAAAGFzc2VydGlvbiBmYWlsZWQ6IGVkZ2UuaGVpZ2h0ID09IHNlbGYuaGVpZ2h0IC0gMWFzc2VydGlvbiBmYWlsZWQ6IHNyYy5sZW4oKSA9PSBkc3QubGVuKClhc3NlcnRpb24gZmFpbGVkOiBlZGdlLmhlaWdodCA9PSBzZWxmLm5vZGUuaGVpZ2h0IC0gMVN0cmVhbUNpcGhlckVycm9yY2FsbGVkIGBSZXN1bHQ6OnVud3JhcCgpYCBvbiBhbiBgRXJyYCB2YWx1ZQAAAGfmCWqFrme7cvNuPDr1T6V/Ug5RjGgFm6vZgx8ZzeBbaW52YWxpZCB0YWdFcnJvcmtpbmRwb3NpdGlvbkFzbjFDcnlwdG9Qb2ludEVuY29kaW5nVmVyc2lvbkxlbmd0aERhdGVUaW1lRmFpbGVkSW5jb21wbGV0ZWV4cGVjdGVkX2xlbmFjdHVhbF9sZW5JbmRlZmluaXRlTGVuZ3RodGFnTm9uY2Fub25pY2FsT2lkTWFsZm9ybWVkT2lkVW5rbm93bm9pZFNldER1cGxpY2F0ZVNldE9yZGVyaW5nT3ZlcmZsb3dPdmVybGVuZ3RoUmVhZGVyVGFnTW9kZVVua25vd25UYWdOdW1iZXJJbnZhbGlkVGFnVW5leHBlY3RlZGV4cGVjdGVkYWN0dWFsVGFnVW5rbm93bmJ5dGVUcmFpbGluZ0RhdGFkZWNvZGVkcmVtYWluaW5nVXRmOFZhbHVlTm9uZVNvbWUAAAAAAAAAZ+YJaoWuZ7ty8248OvVPpX9SDlGMaAWbq9mDHxnN4FtMYXlvdXRFcnJvclNpZ25FcnJvcjo6Tm9TaWduaW5nS2V5U2lnbkVycm9yOjpTaWduaW5nRmFpbGVkU2lnbkVycm9yOjpQdWJrZXlGb3JtYXRTaWduRXJyb3I6OkVuY29kaW5nRmFpbGVkY2FsbGVkIGBSZXN1bHQ6OnVud3JhcCgpYCBvbiBhbiBgRXJyYCB2YWx1ZUh0dHBFcnJvcjo6RWdyZXNzRGVuaWVkSHR0cEVycm9yOjpQbGFjZWhvbGRlckRlbmllZEh0dHBFcnJvcjo6UGxhY2Vob2xkZXJVbmtub3duSHR0cEVycm9yOjpQbGFjZWhvbGRlck5vVXNlckNvbnRleHRIdHRwRXJyb3I6OlVwc3RyZWFtRXJyb3JmYWxzZV1VdGY4RXJyb3J2YWxpZF91cF90b2Vycm9yX2xlbk5vbmVTb21lAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAIQAAACEAAABBAAAAIQAAADAxMjM0NTY3ODlhYmNkZWYBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEFBNtCMXtK/O6BIr+bcrrr+////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAaW52YWxpZCB0YWdBc24xQ3J5cHRvUG9pbnRFbmNvZGluZ1ZlcnNpb25VdGY4RXJyb3J2YWxpZF91cF90b2Vycm9yX2xlbkVycm9ya2luZHBvc2l0aW9uTGVuZ3RoRGF0ZVRpbWVGYWlsZWRJbmNvbXBsZXRlZXhwZWN0ZWRfbGVuYWN0dWFsX2xlbkluZGVmaW5pdGVMZW5ndGh0YWdOb25jYW5vbmljYWxPaWRNYWxmb3JtZWRPaWRVbmtub3dub2lkU2V0RHVwbGljYXRlU2V0T3JkZXJpbmdPdmVyZmxvd092ZXJsZW5ndGhSZWFkZXJUYWdNb2RlVW5rbm93blRhZ051bWJlckludmFsaWRUYWdVbmV4cGVjdGVkZXhwZWN0ZWRhY3R1YWxUYWdVbmtub3duYnl0ZVRyYWlsaW5nRGF0YWRlY29kZWRyZW1haW5pbmdVdGY4VmFsdWVOb25lU29tZQAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO4BlQEcClsCE1yZANZL1AFJ8JwBOg0NA+p5RAK5QRwAfGUrAlq6HgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxsNtFmiCT6H/K6HEUiqo9FeuEkuSQbOjNa9SnIdKGMMPkvwqpf1RvKIgOAdZ+Q+QAAAAAAAAAAAAAAAAAAAAAcX/Eiq60cRXGBvWdrAgSIsTkvwqpf1RvKIgOAdZ+Q+QsVrE9qM1l1200dAfFCiiK/v///////////////////8+DErUQyM/gwjnHjvy5gKikm+13/ePZWh/Poz+zUpysY3J5cHRvIGVycm9yBlRhZygweMMgAABpAgACOiDAASkAQk9PTEVBTklOVEVHRVJCSVQgU1RSSU5HT0NURVQgU1RSSU5HTlVMTE9CSkVDVCBJREVOVElGSUVSUkVBTEVOVU1FUkFURURVVEY4U3RyaW5nU0VRVUVOQ0VTRVROdW1lcmljU3RyaW5nUHJpbnRhYmxlU3RyaW5nVGVsZXRleFN0cmluZ1ZpZGVvdGV4U3RyaW5nSUE1U3RyaW5nVVRDVGltZUdlbmVyYWxpemVkVGltZVZpc2libGVTdHJpbmdCTVBTdHJpbmdwcmltaXRpdmVjb25zdHJ1Y3RlZEFyY0ludmFsaWRhcmNBcmNUb29CaWdCYXNlMTI4RGlnaXRFeHBlY3RlZGFjdHVhbEVtcHR5TGVuZ3RoTm90RW5vdWdoQXJjc1RyYWlsaW5nRG90Lk9JRCBtYWxmb3JtZWRPZGQgbnVtYmVyIG9mIGRpZ2l0c0ludmFsaWQgc3RyaW5nIGxlbmd0aAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAAEAAgADAAQABQAGAAcACAAJAP//////////////////CgALAAwADQAOAA8A/////////////////////////////////////////////////////////////////////woACwAMAA0ADgAPAP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wAAEAAgADAAQABQAGAAcACAAJAA//////////////////+gALAAwADQAOAA8AD/////////////////////////////////////////////////////////////////////oACwAMAA0ADgAPAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////IGF0IGxpbmUgYSBEaXNwbGF5IGltcGxlbWVudGF0aW9uIHJldHVybmVkIGFuIGVycm9yIHVuZXhwZWN0ZWRseUVycm9yYXNzZXJ0aW9uIGZhaWxlZDogc2VsZi5pc19jaGFyX2JvdW5kYXJ5KG5ld19sZW4pRU9GIHdoaWxlIHBhcnNpbmcgYSBsaXN0RU9GIHdoaWxlIHBhcnNpbmcgYW4gb2JqZWN0RU9GIHdoaWxlIHBhcnNpbmcgYSBzdHJpbmdFT0Ygd2hpbGUgcGFyc2luZyBhIHZhbHVlZXhwZWN0ZWQgYDpgZXhwZWN0ZWQgYCxgIG9yIGBdYGV4cGVjdGVkIGAsYCBvciBgfWBleHBlY3RlZCBpZGVudGV4cGVjdGVkIHZhbHVlZXhwZWN0ZWQgYCJgaW52YWxpZCBlc2NhcGVpbnZhbGlkIG51bWJlcm51bWJlciBvdXQgb2YgcmFuZ2VpbnZhbGlkIHVuaWNvZGUgY29kZSBwb2ludGNvbnRyb2wgY2hhcmFjdGVyIChcdTAwMDAtXHUwMDFGKSBmb3VuZCB3aGlsZSBwYXJzaW5nIGEgc3RyaW5na2V5IG11c3QgYmUgYSBzdHJpbmdpbnZhbGlkIHZhbHVlOiBleHBlY3RlZCBrZXkgdG8gYmUgYSBudW1iZXIgaW4gcXVvdGVzZmxvYXQga2V5IG11c3QgYmUgZmluaXRlIChnb3QgTmFOIG9yICsvLWluZilsb25lIGxlYWRpbmcgc3Vycm9nYXRlIGluIGhleCBlc2NhcGV0cmFpbGluZyBjb21tYXRyYWlsaW5nIGNoYXJhY3RlcnN1bmV4cGVjdGVkIGVuZCBvZiBoZXggZXNjYXBlcmVjdXJzaW9uIGxpbWl0IGV4Y2VlZGVkbnVsbAAAAAAAAAAAAPA/AAAAAAAAJEAAAAAAAABZQAAAAAAAQI9AAAAAAACIw0AAAAAAAGr4QAAAAACAhC5BAAAAANASY0EAAAAAhNeXQQAAAABlzc1BAAAAIF+gAkIAAADodkg3QgAAAKKUGm1CAABA5ZwwokIAAJAexLzWQgAANCb1awxDAIDgN3nDQUMAoNiFVzR2QwDITmdtwatDAD2RYORY4UNAjLV4Ha8VRFDv4tbkGktEktVNBs/wgET2SuHHAi21RLSd2XlDeOpEkQIoLCqLIEU1AzK39K1URQKE/uRx2YlFgRIfL+cnwEUh1+b64DH0ReqMoDlZPilGJLAIiO+NX0YXbgW1tbiTRpzJRiLjpshGA3zY6pvQ/kaCTcdyYUIzR+Mgec/5EmhHG2lXQ7gXnkexoRYq087SRx1KnPSHggdIpVzD8SljPUjnGRo3+l1ySGGg4MR49aZIecgY9tay3EhMfc9Zxu8RSZ5cQ/C3a0ZJxjNU7KUGfElcoLSzJ4SxSXPIoaAx5eVJjzrKCH5eG0qaZH7FDhtRSsD93XbSYYVKMH2VFEe6uko+bt1sbLTwSs7JFIiH4SRLQfwZaukZWkupPVDiMVCQSxNN5Fo+ZMRLV2Cd8U19+UttuARuodwvTETzwuTk6WNMFbDzHV7kmEwbnHCldR3PTJFhZodpcgNN9fk/6QNPOE1y+I/jxGJuTUf7OQ67/aJNGXrI0Sm9102fmDpGdKwNTmSf5KvIi0JOPcfd1roud04MOZWMafqsTqdD3feBHOJOkZTUdaKjFk+1uUkTi0xMTxEUDuzWr4FPFpkRp8wbtk9b/9XQv6LrT5m/heK3RSFQfy8n2yWXVVBf+/BR7/yKUBudNpMV3sBQYkQE+JoV9VB7VQW2AVsqUW1VwxHheGBRyCo0VhmXlFF6NcGr37zJUWzBWMsLFgBSx/Euvo4bNFI5rrptciJpUsdZKQkPa59SHdi5Zemi01IkTii/o4sIU61h8q6Mrj5TDH1X7Rctc1NPXK3oXfinU2Oz2GJ19t1THnDHXQm6ElQlTDm1i2hHVC6fh6KuQn1UfcOUJa1JslRc9PluGNzmVHNxuIoekxxV6EazFvPbUVWiGGDc71KGVcoeeNOr57tVPxMrZMtw8VUO2DU9/swlVhJOg8w9QFtWyxDSnyYIkVb+lMZHMErFVj06uFm8nPpWZiQTuPWhMFeA7Rcmc8pkV+Done8P/ZlXjLHC9Sk+0FfvXTNztE0EWGs1AJAhYTlYxUIA9Gm5b1i7KYA44tOjWCo0oMbayNhYNUFIeBH7DlnBKC3r6lxDWfFy+KUlNHhZrY92Dy9BrlnMGappvejiWT+gFMTsohdaT8gZ9aeLTVoyHTD5SHeCWn4kfDcbFbdani1bBWLa7FqC/FhDfQgiW6M7L5ScilZbjAo7uUMtjFuX5sRTSpzBWz0gtuhcA/ZbTajjIjSEK1wwSc6VoDJhXHzbQbtIf5VcW1IS6hrfylx5c0vScMsAXVdQ3gZN/jRdbeSVSOA9al3Erl0trGagXXUatThXgNRdEmHiBm2gCV6rfE0kRARAXtbbYC1VBXRezBK5eKoGqV5/V+cWVUjfXq+WUC41jRNfW7zkeYJwSF9y610Yo4x+XyezOu/lF7Nf8V8Ja9/d51/tt8tFV9UdYPRSn4tWpVJgsSeHLqxOh2Cd8Sg6VyK9YAKXWYR2NfJgw/xvJdTCJmH0+8suiXNcYXh9P701yJFh1lyPLEM6xmEMNLP308j7YYcA0HqEXTFiqQCEmeW0ZWLUAOX/HiKbYoQg719T9dBipejqN6gyBWPPouVFUn86Y8GFr2uTj3BjMmebRnizpGP+QEJYVuDZY59oKfc1LBBkxsLzdEM3RGR4szBSFEV5ZFbgvGZZlq9kNgw24Pe942RDj0PYda0YZRRzVE7T2E5l7Mf0EIRHg2Xo+TEVZRm4ZWF4flq+H+5lPQuP+NbTImYMzrK2zIhXZo+BX+T/ao1m+bC77t9iwmY4nWrql/v2ZoZEBeV9uixn1Eojr470YWeJHexasnGWZ+skp/EeDsxnE3cIV9OIAWjXlMosCOs1aA06/TfKZWtoSET+Yp4foWha1b37hWfVaLFKrXpnwQppr06srOC4QGlaYtfXGOd0afE6zQ3fIKpp1kSgaItU4GkMVshCrmkUao9retMZhElqcwZZSCDlf2oIpDctNO+zagqNhTgB6+hqTPCmhsElH2swVij0mHdTa7trMjF/VYhrqgZ//d5qvmsqZG9eywLzazU9CzZ+wydsggyOw120XWzRxziaupCSbMb5xkDpNMdsN7j4kCMC/Wwjc5s6ViEybetPQsmrqWZt5uOSuxZUnG1wzjs1jrTRbQzCisKxIQZuj3ItMx6qO26ZZ/zfUkpxbn+B+5fnnKVu32H6fSEE224sfbzulOIQb3acayo6G0VvlIMGtQhiem89EiRxRX2wb8wWbc2WnORvf1zIgLzDGXDPOX3QVRpQcEOInETrIIRwVKrDFSYpuXDplDSbb3PvcBHdAMElqCNxVhRBMS+SWHFrWZH9uraOcePXet40MsNx3I0ZFsL+93FT8Z+bcv4tctT2Q6EHv2JyifSUiclul3KrMfrre0rNcgtffHONTgJzzXZb0DDiNnOBVHIEvZpsc9B0xyK24KFzBFJ5q+NY1nOGpleWHO8LdBTI9t1xdUF0GHp0Vc7SdXSemNHqgUerdGP/wjKxDOF0PL9zf91PFXULr1Df1KNKdWdtkgtlpoB1wAh3Tv7PtHXxyhTi/QPqddb+TK1+QiB2jD6gWB5TVHYvTsju5WeJdrthemrfwb92FX2MoivZ83ZanC+Lds8od3CD+y1UA193JjK9nBRik3ewfuzDmTrId1ye5zRASf53+cIQIcjtMni481QpOqlneKUwqrOIk514Z15KcDV80ngB9lzMQhsHeYIzdH8T4jx5MaCoL0wNcnk9yJI7n5CmeU16dwrHNNx5cKyKZvygEXqMVy2AOwlGem+tOGCKi3t6ZWwjfDY3sXp/RywbBIXlel5Z9yFF5hp725c6NevPUHvSPYkC5gOFe0aNK4PfRLp7TDj7sQtr8HtfBnqezoUkfPaHGEZCp1l8+lTPa4kIkHw4KsPGqwrEfMf0c7hWDfl8+PGQZqxQL307lxrAa5JjfQo9IbAGd5h9TIwpXMiUzn2w95k5/RwDfpx1AIg85Dd+A5MAqkvdbX7iW0BKT6qiftpy0BzjVNd+kI8E5BsqDX+62YJuUTpCfymQI8rlyHZ/M3SsPB97rH+gyOuF88zhf2luZi1pbmZOYU51dXV1dXV1dWJ0bnVmcnV1dXV1dXV1dXV1dXV1dXV1dQAAIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMDEyMzQ1Njc4OWFiY2RlZmludGVybmFsIGVycm9yOiBlbnRlcmVkIHVucmVhY2hhYmxlIGNvZGUwMDAxMDIwMzA0MDUwNjA3MDgwOTEwMTExMjEzMTQxNTE2MTcxODE5MjAyMTIyMjMyNDI1MjYyNzI4MjkzMDMxMzIzMzM0MzUzNjM3MzgzOTQwNDE0MjQzNDQ0NTQ2NDc0ODQ5NTA1MTUyNTM1NDU1NTY1NzU4NTk2MDYxNjI2MzY0NjU2NjY3Njg2OTcwNzE3MjczNzQ3NTc2Nzc3ODc5ODA4MTgyODM4NDg1ODY4Nzg4ODk5MDkxOTI5Mzk0OTU5Njk3OTg5OQMDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgME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AAAAIggQAC8AAAB3AQAALwAAACIIEAAvAAAAZgEAAA0AAAAiCBAALwAAAEwBAAAiAAAAIggQAC8AAAB2AAAABQAAACIIEAAvAAAAdwAAAAUAAAAiCBAALwAAAHgAAAAFAAAAIggQAC8AAAB5AAAABQAAACIIEAAvAAAAegAAAAUAAAAiCBAALwAAAHsAAAAFAAAAIggQAC8AAADCAAAACQAAACIIEAAvAAAA+wAAAA0AAAAiCBAALwAAAAIBAAASAAAAdAYQACEAAAAuAAAACQAAAAIIEAAfAAAAZgYAABUAAAACCBAAHwAAAJQGAAAVAAAAAggQAB8AAACVBgAAFQAAAAIIEAAfAAAAcwUAACgAAAACCBAAHwAAAHMFAAASAAAAqAoQACUAAAAaAAAANgAAAKgKEAAlAAAACgAAACsAAAAAAAAABAAAAAQAAAClAAAAAAAAAAQAAAAEAAAApgAAAPF4EADzeBAA9XgQAADp9wIEbmFtZQAODWV4ZWN1dG9yLndhc20ByNcCiAQAS19aTjhleGVjdXRvcjRob3N0MTBpbnRlcmZhY2VzN2xvZ2dpbmc0aW5mbzExd2l0X2ltcG9ydDIxN2g3NzgzMjA1NWNlMzM2ZmRjRQFMX1pOOGV4ZWN1dG9yNGhvc3QxMGludGVyZmFjZXM3bG9nZ2luZzVlcnJvcjExd2l0X2ltcG9ydDIxN2g1OGVkYzQyNDRhZWYwMGU0RQJLX1pOOGV4ZWN1dG9yNGhvc3QxMGludGVyZmFjZXM1Y2xvY2s2bm93X21zMTF3aXRfaW1wb3J0MTE3aGE5YzNmYmUzYzVlNDQ0MzdFA1VfWk44ZXhlY3V0b3I0aG9zdDZ0ZW5hbnQxNHRlbmFudF9jb250ZXh0MTB0ZW5hbnRfZGlkMTF3aXRfaW1wb3J0MTE3aDE5YmQxZmFkZmEzMzg5NzBFBFxfWk44ZXhlY3V0b3I0aG9zdDEwaW50ZXJmYWNlczIyaHR0cF93aXRoX3BsYWNlaG9sZGVyczRjYWxsMTJ3aXRfaW1wb3J0MTAxN2g5ZjMzYThiZjczY2Y2NzRlRQVLX1pOOGV4ZWN1dG9yNGhvc3QxMGludGVyZmFjZXM3c2lnbmluZzRzaWduMTF3aXRfaW1wb3J0MjE3aGI1ZjkwMTg0ZDdhMDQ2NGZFBn1fWk45MF8kTFQkd2FzaS4uaW1wb3J0cy4ud2FzaS4uaW8uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJHdhc2kuLmltcG9ydHMuLl9ydC4uV2FzbVJlc291cmNlJEdUJDRkcm9wNGRyb3AxN2hmZmM1OTk2OGYxZTc1NDlkRQeGAV9aTjk5XyRMVCR3YXNpLi5pbXBvcnRzLi53YXNpLi5pby4uc3RyZWFtcy4uT3V0cHV0U3RyZWFtJHUyMCRhcyR1MjAkd2FzaS4uaW1wb3J0cy4uX3J0Li5XYXNtUmVzb3VyY2UkR1QkNGRyb3A0ZHJvcDE3aDAwMGI0MTM2MWYyYzhmYjJFCFZfWk40d2FzaTdpbXBvcnRzNHdhc2kyaW81ZXJyb3I1RXJyb3IxNXRvX2RlYnVnX3N0cmluZzExd2l0X2ltcG9ydDExN2hmNWNjMGQ4ZWVkODMxYjhiRQlpX1pONHdhc2k3aW1wb3J0czR3YXNpMmlvN3N0cmVhbXMxMk91dHB1dFN0cmVhbTI0YmxvY2tpbmdfd3JpdGVfYW5kX2ZsdXNoMTF3aXRfaW1wb3J0MjE3aDU5OTE5YjNkYWM1NWI2MmNFCk1fWk40d2FzaTdpbXBvcnRzNHdhc2kzY2xpNnN0ZGVycjEwZ2V0X3N0ZGVycjExd2l0X2ltcG9ydDAxN2hmYTgzYTY1ZDQwNTNmYTVhRQspX193YXNtX2ltcG9ydF9lbnZpcm9ubWVudF9nZXRfZW52aXJvbm1lbnQMF19fd2FzbV9pbXBvcnRfZXhpdF9leGl0DRFfX3dhc21fY2FsbF9jdG9ycw48X1pOMTBzZXJkZV9jb3JlMmRlOU1hcEFjY2VzczEwbmV4dF92YWx1ZTE3aGIyYzIzMTg1MzAyYWQwZmFFD1FfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDE4cGFyc2Vfb2JqZWN0X2NvbG9uMTdoMzYxMWU3OTg2OGI1YWZkN0UQTV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTRpZ25vcmVfaW50ZWdlcjE3aDdlOTgyYmM1NWZkMmM1ZDNFETJfWk4xMHNlcmRlX2pzb24yZGUxMGZyb21fdHJhaXQxN2hiZWZhNzhlNGUyNDEwMTAyRRKPAV9aTjk4XyRMVCQkUkYkbXV0JHUyMCRzZXJkZV9qc29uLi5kZS4uRGVzZXJpYWxpemVyJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplciRHVCQxOGRlc2VyaWFsaXplX3N0cnVjdDE3aDkwOGMwNzkxZDZmMjU5MzRFEzJfWk4xMHNlcmRlX2pzb24yZGUxMGZyb21fdHJhaXQxN2hkM2RmMDgzZWY1YjM4NTY0RRSPAV9aTjk4XyRMVCQkUkYkbXV0JHUyMCRzZXJkZV9qc29uLi5kZS4uRGVzZXJpYWxpemVyJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplciRHVCQxOGRlc2VyaWFsaXplX3N0cnVjdDE3aDAyNzk5MTJjNmIwZjJjN2JFFUtfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDEycGFyc2VfbnVtYmVyMTdoODdhN2Q3MjM4ZWFlNWZlMkUWTV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTRwYXJzZV9leHBvbmVudDE3aDYzNDBiZmI2MGQ5YzE3MjJFF0xfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDEzcGFyc2VfZGVjaW1hbDE3aDFhNWI1MTg3ZTEwMmM4NGFFGE1fWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDE0ZjY0X2Zyb21fcGFydHMxN2gzNTJlODg3MzBkM2ZiZDkyRRlNX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxNHBhcnNlX2V4cG9uZW50MTdoM2JiM2E4MzJjMjJlNmUwN0UaVV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMjJwYXJzZV9kZWNpbWFsX292ZXJmbG93MTdoYTFkOGEwYzRlNmQyZjM3NUUbTF9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTNwYXJzZV9pbnRlZ2VyMTdoOWFiNTc3NTU4ODQ1YzE4NEUcTF9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTNwYXJzZV9pbnRlZ2VyMTdoYzFmNWE5YWVkMjAyZGYzN0UdUV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMThwYXJzZV9sb25nX2ludGVnZXIxN2hjYTkwZmQyMjQ2MGFhZTZhRR5OX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxNWlnbm9yZV9leHBvbmVudDE3aGFhYjdjYzFiZGI3OWViMWNFH01fWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDE0aWdub3JlX2ludGVnZXIxN2hlMzhlYzBjZTkyYjg3MDgzRSBOX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxNWlnbm9yZV9leHBvbmVudDE3aDQ5YjM5ZTZkN2MyMDQyNzBFIVZfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDIzcGFyc2VfZXhwb25lbnRfb3ZlcmZsb3cxN2hmNjViMTQwYTZlN2EyMmNmRSJqX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxN3BlZWtfaW52YWxpZF90eXBlMTdoYzE0Y2RlY2U2MjBjYmMyYkUubGx2bS4xMjAxNDk1NjExNzA0NTY5MjU2OSNqX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxN3BlZWtfaW52YWxpZF90eXBlMTdoZmUwZDA5MmI4ODAxMGQ2ZEUubGx2bS4xMjAxNDk1NjExNzA0NTY5MjU2OSRRX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxOHBhcnNlX29iamVjdF9jb2xvbjE3aDAyY2Q4MGIyYTRhMWUxYmNFJUVfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDdlbmRfbWFwMTdoY2YyOTI5ZjhhNDEzM2U3NEUmRV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkN2VuZF9zZXExN2hlYWJhYWM0NDFmN2JlZTU3RSeGAV9aTjgwXyRMVCRzZXJkZV9qc29uLi5kZS4uTWFwQWNjZXNzJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLk1hcEFjY2VzcyRHVCQxM25leHRfa2V5X3NlZWQxMmhhc19uZXh0X2tleTE3aGUyMGQ4ZGQ1ODU3OTg0NzJFKI4BX1pOODBfJExUJHNlcmRlX2pzb24uLmRlLi5TZXFBY2Nlc3MkTFQkUiRHVCQkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uU2VxQWNjZXNzJEdUJDE3bmV4dF9lbGVtZW50X3NlZWQxNmhhc19uZXh0X2VsZW1lbnQxN2g0ZjVhZTIzNzBhNWViYjY3RSmOAV9aTjgwXyRMVCRzZXJkZV9qc29uLi5kZS4uU2VxQWNjZXNzJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlNlcUFjY2VzcyRHVCQxN25leHRfZWxlbWVudF9zZWVkMTZoYXNfbmV4dF9lbGVtZW50MTdoZjcwMTRkMWMyMzU1ODUzZkUqfF9aTjg2XyRMVCRjb3JlLi5tYXJrZXIuLlBoYW50b21EYXRhJExUJFQkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplU2VlZCRHVCQxMWRlc2VyaWFsaXplMTdoYTBiY2VkNWQ4NWE5OGI1Y0UrjAFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMTVkZXNlcmlhbGl6ZV91MTYxN2g0ODkzOWIzZDgxMTQ5NTc5RSyPAV9aTjk4XyRMVCQkUkYkbXV0JHUyMCRzZXJkZV9qc29uLi5kZS4uRGVzZXJpYWxpemVyJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplciRHVCQxOGRlc2VyaWFsaXplX3N0cmluZzE3aDBjYmE1MThkYWY0OWZkNzdFLY8BX1pOOThfJExUJCRSRiRtdXQkdTIwJHNlcmRlX2pzb24uLmRlLi5EZXNlcmlhbGl6ZXIkTFQkUiRHVCQkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uRGVzZXJpYWxpemVyJEdUJDE4ZGVzZXJpYWxpemVfc3RyaW5nMTdoNTM2ODA0Y2Q2MGJiY2QyYUUujwFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMThkZXNlcmlhbGl6ZV9zdHJ1Y3QxN2hlZTVkOWMzNmM2ZjFmMjViRS93X1pOMTBzZXJkZV9jb3JlM3NlcjVpbXBsczYyXyRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZSR1MjAkZm9yJHUyMCQkUkYkVCRHVCQ5c2VyaWFsaXplMTdoMzlmYWQxNjkyODMyNjYyOEUwLl9aTjEwc2VyZGVfanNvbjNzZXI2dG9fdmVjMTdoMmUyNjMxNmUzMjRjYmQ5MUUxLl9aTjEwc2VyZGVfanNvbjNzZXI2dG9fdmVjMTdoYmY1NmMyMjk1OTdjNWM1OEUyLl9aTjEwc2VyZGVfanNvbjNzZXI2dG9fdmVjMTdoZjEzMzFkZTVmOTFjYTM4YkUzxQFfWk4xNjFfJExUJGV4ZWN1dG9yLi5fLi4kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJGV4ZWN1dG9yLi5FY2llc0VudmVsb3BlJEdUJC4uZGVzZXJpYWxpemUuLl9fVmlzaXRvciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5WaXNpdG9yJEdUJDlleHBlY3RpbmcxN2g0NzZhNDFjMDliZDc1YjM2RTTFAV9aTjE2MV8kTFQkZXhlY3V0b3IuLl8uLiRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5kZS4uRGVzZXJpYWxpemUkdTIwJGZvciR1MjAkZXhlY3V0b3IuLlBheW91dFBheWxvYWQkR1QkLi5kZXNlcmlhbGl6ZS4uX19WaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aDZkODA3ODRlZjk1ODgzYjhFNcYBX1pOMTYyXyRMVCRleGVjdXRvci4uXy4uJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRleGVjdXRvci4uRXhlY3V0ZVJlcXVlc3QkR1QkLi5kZXNlcmlhbGl6ZS4uX19WaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aDNmYTQ2Njk2Njk0ZDc3MzRFNsoBX1pOMTY2XyRMVCRleGVjdXRvci4uXy4uJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRleGVjdXRvci4uRWNpZXNFbnZlbG9wZSRHVCQuLmRlc2VyaWFsaXplLi5fX0ZpZWxkVmlzaXRvciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5WaXNpdG9yJEdUJDl2aXNpdF9zdHIxN2hlMzcxZjJkZmU0OTBkNGM0RTdaX1pONDlfJExUJFQkdTIwJGFzJHUyMCRhbGxvYy4uc3RyaW5nLi5TcGVjVG9TdHJpbmckR1QkMTRzcGVjX3RvX3N0cmluZzE3aGFmY2U0YTdiZTRmMWQ1ZjdFOKQBX1pONGNvcmUzcHRyMTI5ZHJvcF9pbl9wbGFjZSRMVCQkTFQkZXhlY3V0b3IuLkNvbXBvbmVudCR1MjAkYXMkdTIwJGV4ZWN1dG9yLi5leHBvcnRzLi5zeW5vZC4uYWdlbnQuLmNvbnRyYWN0cy4uR3Vlc3QkR1QkLi5leGVjdXRlLi5WQ1JlY2VpcHQkR1QkMTdoMTc1NmQyODExOTg1MjViMEU5pgFfWk40Y29yZTNwdHIxMzFkcm9wX2luX3BsYWNlJExUJCRMVCRleGVjdXRvci4uQ29tcG9uZW50JHUyMCRhcyR1MjAkZXhlY3V0b3IuLmV4cG9ydHMuLnN5bm9kLi5hZ2VudC4uY29udHJhY3RzLi5HdWVzdCRHVCQuLmV4ZWN1dGUuLlNpZ25lZFByb29mJEdUJDE3aDQ5NDE2MmMxMjczNmI4Y2FFOkxfWk40Y29yZTNwdHI0MmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJDE3aDRhY2U1MzczMjk3MDkyOThFO09fWk40Y29yZTNwdHI0NWRyb3BfaW5fcGxhY2UkTFQkZXhlY3V0b3IuLkV4ZWN1dGVSZXF1ZXN0JEdUJDE3aDg5MzkwYWE2ZTJlNjhkMjVFPE9fWk40Y29yZTNwdHI0NWRyb3BfaW5fcGxhY2UkTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJEdUJDE3aDlhMTNlYWRmOWY0Y2QxZDJFPWVfWk40Y29yZTNwdHI2N2Ryb3BfaW5fcGxhY2UkTFQkZXhlY3V0b3IuLmhvc3QuLmludGVyZmFjZXMuLnNpZ25pbmcuLlNpZ25FcnJvciRHVCQxN2g3M2RmMzBmNDIwNGRkNjk0RT5rX1pONGNvcmUzcHRyNzNkcm9wX2luX3BsYWNlJExUJGNvcmUuLm9wdGlvbi4uT3B0aW9uJExUJHNlcmRlX2pzb24uLnZhbHVlLi5WYWx1ZSRHVCQkR1QkMTdoMzY3M2U5YWRmMWVlZmU0ZUU/cl9aTjRjb3JlM3B0cjgwZHJvcF9pbl9wbGFjZSRMVCRleGVjdXRvci4uaG9zdC4uaW50ZXJmYWNlcy4uaHR0cF93aXRoX3BsYWNlaG9sZGVycy4uUmVxdWVzdCRHVCQxN2hkOWU1MmNiOGNlYTVlNzVjRUBSX1pONTNfJExUJGNvcmUuLmZtdC4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gxYjY1NTM2Y2QzM2ExZTFjRUFfX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkMTB3cml0ZV9jaGFyMTdoMDA1MWU2YWY3YTc1MWVmOEVCXV9aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2gwODhkMjk3MjQxOTlkYTNiRUMoX1pONWFsbG9jM2ZtdDZmb3JtYXQxN2gzZGE0YTRjMzhkN2EwZDgwRURZX1pONjBfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoOWU4ZDBmMmE0N2UzZTg3MkVFd19aTjg3XyRMVCRUJHUyMCRhcyR1MjAkYWxsb2MuLnNsaWNlLi4kTFQkaW1wbCR1MjAkJHU1YiRUJHU1ZCQkR1QkLi50b192ZWNfaW4uLkNvbnZlcnRWZWMkR1QkNnRvX3ZlYzE3aDRjZjI0NjgxMThkOTY5OTdFRoIBX1pOODlfJExUJGV4ZWN1dG9yLi5Db21wb25lbnQkdTIwJGFzJHUyMCRleGVjdXRvci4uZXhwb3J0cy4uc3lub2QuLmFnZW50Li5jb250cmFjdHMuLkd1ZXN0JEdUJDE0Y29tcG9zZV9hY3Rpb24xN2hiOWRlOThiMDVmZTBmNzEwRUd6X1pOODlfJExUJGV4ZWN1dG9yLi5Db21wb25lbnQkdTIwJGFzJHUyMCRleGVjdXRvci4uZXhwb3J0cy4uc3lub2QuLmFnZW50Li5jb250cmFjdHMuLkd1ZXN0JEdUJDdleGVjdXRlMTdoOGM1MjU3ODA1NzAyYTU2NEVIsQJfWk44OV8kTFQkZXhlY3V0b3IuLkNvbXBvbmVudCR1MjAkYXMkdTIwJGV4ZWN1dG9yLi5leHBvcnRzLi5zeW5vZC4uYWdlbnQuLmNvbnRyYWN0cy4uR3Vlc3QkR1QkN2V4ZWN1dGUxXzE2OF8kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uc2VyLi5TZXJpYWxpemUkdTIwJGZvciR1MjAkJExUJGV4ZWN1dG9yLi5Db21wb25lbnQkdTIwJGFzJHUyMCRleGVjdXRvci4uZXhwb3J0cy4uc3lub2QuLmFnZW50Li5jb250cmFjdHMuLkd1ZXN0JEdUJC4uZXhlY3V0ZS4uQ2xhaW1TdWJqZWN0JEdUJDlzZXJpYWxpemUxN2hlNWVjNjFhYzVhMWU5ZGUxRUlKX1pOOGV4ZWN1dG9yNDBfX2xpbmtfY3VzdG9tX3NlY3Rpb25fZGVzY3JpYmluZ19pbXBvcnRzMTdoOWI0YmVjNTMzZjYxNmFkNkVKNGNhYmlfcG9zdF9zeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjY29tcG9zZS1hY3Rpb25LKnN5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNjb21wb3NlLWFjdGlvbkwkc3lub2Q6YWdlbnQvY29udHJhY3RzQDEuMC4wI2V2YWx1YXRlTSNzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZXhlY3V0ZU4lc3lub2Q6YWdlbnQvY29udHJhY3RzQDEuMC4wI2dldC10cmFjZU+cAl9aTjVhbGxvYzExY29sbGVjdGlvbnM1YnRyZWU0bm9kZTIxMEhhbmRsZSRMVCRhbGxvYy4uY29sbGVjdGlvbnMuLmJ0cmVlLi5ub2RlLi5Ob2RlUmVmJExUJGFsbG9jLi5jb2xsZWN0aW9ucy4uYnRyZWUuLm5vZGUuLm1hcmtlci4uTXV0JEMkSyRDJFYkQyRhbGxvYy4uY29sbGVjdGlvbnMuLmJ0cmVlLi5ub2RlLi5tYXJrZXIuLkxlYWYkR1QkJEMkYWxsb2MuLmNvbGxlY3Rpb25zLi5idHJlZS4ubm9kZS4ubWFya2VyLi5FZGdlJEdUJDE2aW5zZXJ0X3JlY3Vyc2luZzE3aDkzNTA3MTg1Y2Y3MzEzYWZFUD5fWk4xM2NyeXB0b19jb21tb243S2V5SW5pdDE0bmV3X2Zyb21fc2xpY2UxN2gyNTI0Y2NiNTczNDI1MDg4RVFDX1pOMzRfJExUJEFsZyR1MjAkYXMkdTIwJGFlYWQuLkFlYWQkR1QkN2RlY3J5cHQxN2hiZDk4ZDQyMGMwYWY5NmIyRVJjX1pONzBfJExUJGNpcGhlci4uZXJyb3JzLi5TdHJlYW1DaXBoZXJFcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aGQ1OTQ4MzgxYzU5OWQwNzlFU0JfWk40aGtkZjE3SGtkZiRMVCRIJEMkSSRHVCQxN2V4cGFuZF9tdWx0aV9pbmZvMTdoYjVhZjY1ZmUxOGUwNzRhOEVUN19aTjRoa2RmMTdIa2RmJExUJEgkQyRJJEdUJDdleHRyYWN0MTdoNGQ4NjJlY2Y2YmE4MWIyM0VVlQFfWk4xM2dlbmVyaWNfYXJyYXkxMmltcGxfemVyb2l6ZTg3XyRMVCRpbXBsJHUyMCR6ZXJvaXplLi5aZXJvaXplJHUyMCRmb3IkdTIwJGdlbmVyaWNfYXJyYXkuLkdlbmVyaWNBcnJheSRMVCRUJEMkTiRHVCQkR1QkN3plcm9pemUxN2g0ZmYyYWFmOGU4YjRhMjdjRVZsX1pONzNfJExUJHNlcmRlX2pzb24uLm51bWJlci4uTnVtYmVyJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uc2VyLi5TZXJpYWxpemUkR1QkOXNlcmlhbGl6ZTE3aDkyNTAyYzhjOGQwNmY0ZWFFV1RfWk44ZXhlY3V0b3I3ZXhwb3J0czVzeW5vZDVhZ2VudDljb250cmFjdHMyMF9leHBvcnRfZXhlY3V0ZV9jYWJpMTdoMDJkYzY4NzFkY2I5MjE5ZkVYVV9aTjhleGVjdXRvcjdleHBvcnRzNXN5bm9kNWFnZW50OWNvbnRyYWN0czIxX2V4cG9ydF9ldmFsdWF0ZV9jYWJpMTdoMzAwODk0NmFhOGFiNTBjZUVZVl9aTjhleGVjdXRvcjdleHBvcnRzNXN5bm9kNWFnZW50OWNvbnRyYWN0czIyX2V4cG9ydF9nZXRfdHJhY2VfY2FiaTE3aGRkYjk0MDBkMjdhOGEyMWVFWltfWk44ZXhlY3V0b3I3ZXhwb3J0czVzeW5vZDVhZ2VudDljb250cmFjdHMyN19leHBvcnRfY29tcG9zZV9hY3Rpb25fY2FiaTE3aGRlOGYwNjQ5NmIyYjMyYTZFW0dfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2g3OGE0Zjg0MzViZDA2MGM5RVxHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoOTEyNmQ2MTdiODZlMWE0MUVdKV9aTjRobWFjMTFnZXRfZGVyX2tleTE3aDQ5MjcyMzFhNjAxMDhiMGNFXm1fWk41NV8kTFQkc2VjMS4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoM2ZhNDJmY2M2ZDRjZmRmN0UubGx2bS4xOTU1NDA4NzEyODQ4NzA1MzA5X1VfWk41Nl8kTFQkZGVyLi5sZW5ndGguLkxlbmd0aCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDExNjMxMTYxMDgzYTUzMmZFYFdfWk41OF8kTFQkZGVyLi5lcnJvci4uRXJyb3JLaW5kJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMWFlNjM0NDdkMmZhY2MxMkVhX19aTjY2XyRMVCRjb3JlLi5vcHRpb24uLk9wdGlvbiRMVCRUJEdUJCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDJjMjczMDkxMzQ3MTZmOGNFYokBX1pOMTA2XyRMVCRjb3JlLi5pdGVyLi5hZGFwdGVycy4uR2VuZXJpY1NodW50JExUJEkkQyRSJEdUJCR1MjAkYXMkdTIwJGNvcmUuLml0ZXIuLnRyYWl0cy4uaXRlcmF0b3IuLkl0ZXJhdG9yJEdUJDRuZXh0MTdoMmIxMWMwODJiMWQ0ZDZmMEVjU19aTjE0ZWxsaXB0aWNfY3VydmUxMHNlY3JldF9rZXkxOFNlY3JldEtleSRMVCRDJEdUJDEwZnJvbV9zbGljZTE3aDAwZjVkMDExNzA1NWM1YzJFZDxfWk4xNGVsbGlwdGljX2N1cnZlNGVjZGgxNGRpZmZpZV9oZWxsbWFuMTdoNmI2Y2JiNGY5ZGY0MmFhMEVlc19aTjg1XyRMVCRlbGxpcHRpY19jdXJ2ZS4uZWNkaC4uU2hhcmVkU2VjcmV0JExUJEMkR1QkJHUyMCRhcyR1MjAkY29yZS4ub3BzLi5kcm9wLi5Ecm9wJEdUJDRkcm9wMTdoYjk3NzE1NjMxZTM1MDEzYUVmO19aTjEwc2VyZGVfY29yZTJkZTVFcnJvcjEzbWlzc2luZ19maWVsZDE3aDQxY2NlMTUyYTBhNzlhYmZFZ3tfWk42Nl8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkVycm9yJEdUJDZjdXN0b20xN2gxMTFkYzRkMTI2NWQyZThkRS5sbHZtLjcxMTMzMzQyMjU3NzQwNDQzMzVoPF9aTjEwc2VyZGVfY29yZTJkZTVFcnJvcjE0aW52YWxpZF9sZW5ndGgxN2g5OGJjMTMwYzg0MGJlYzRlRWk9X1pOMTBzZXJkZV9jb3JlMmRlNUVycm9yMTVkdXBsaWNhdGVfZmllbGQxN2gzMzcyMjlhNWFiMjM2YTQwRWo9X1pOMTBzZXJkZV9qc29uNWVycm9yNUVycm9yMTJmaXhfcG9zaXRpb24xN2hkMDMwNjRkOTE0ZTJjY2NmRWs9X1pOMTBzZXJkZV9qc29uNWVycm9yNUVycm9yMTJmaXhfcG9zaXRpb24xN2hmYWRiZDk2MjdmNTljNDk5RWxpX1pONTRfJExUJEFsZyR1MjAkYXMkdTIwJGNpcGhlci4uYmxvY2suLkJsb2NrRW5jcnlwdE11dCRHVCQyNGVuY3J5cHRfd2l0aF9iYWNrZW5kX211dDE3aGI1M2NjNGEyNWY0MDY3NWJFbUdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gwY2RhODZjNGY0NmI1MDRjRW5HX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoNGMwYjRjODIxODIzZDlkMEVvcF9aTjgzXyRMVCRleGVjdXRvci4uaG9zdC4uaW50ZXJmYWNlcy4uc2lnbmluZy4uU2lnbkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoNmY4ODMzY2NiZGM1NTdhNkVwf19aTjk4XyRMVCRleGVjdXRvci4uaG9zdC4uaW50ZXJmYWNlcy4uaHR0cF93aXRoX3BsYWNlaG9sZGVycy4uSHR0cEVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoODZmMWQ4YThiZDMwMjhlM0VxSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoMGFiNzdmMjRkZTE4Nzc4YkVyTF9aTjRjb3JlM3B0cjQyZHJvcF9pbl9wbGFjZSRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckR1QkMTdoNGFjZTUzNzMyOTcwOTI5OEVzV19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hiMWEzZmI5NzUzM2ZkZDg1RXRfX1pONWFsbG9jMTFjb2xsZWN0aW9uczVidHJlZTNtYXA1ZW50cnkyOFZhY2FudEVudHJ5JExUJEskQyRWJEMkQSRHVCQ2aW5zZXJ0MTdoMWU2ZmY0OGFhZmI2OTM4ZkV1Yl9aTjY5XyRMVCRjb3JlLi5hbGxvYy4ubGF5b3V0Li5MYXlvdXRFcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDZlMDMyODIyODkzMzU2ZjRFdk5fWk44ZXhlY3V0b3I0aG9zdDEwaW50ZXJmYWNlczIyaHR0cF93aXRoX3BsYWNlaG9sZGVyczRjYWxsMTdoYTE3MzU3MGRlZmY2MDIwZkV3Pl9aTjhleGVjdXRvcjRob3N0MTBpbnRlcmZhY2VzN3NpZ25pbmc0c2lnbjE3aGI1N2UxNmIwYWQxNmZkNzlFeKYBX1pOMTAwXyRMVCQkUkYkbXV0JHUyMCRzZXJkZV9qc29uLi5zZXIuLlNlcmlhbGl6ZXIkTFQkVyRDJEYkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uc2VyLi5TZXJpYWxpemVyJEdUJDEzc2VyaWFsaXplX3N0cjE3aDBhNGRhOGE0ZmRmM2IwYmVFLmxsdm0uNzE5MTEzNjMxMjg3ODY5MjQyOXlGX1pOMTBzZXJkZV9jb3JlM3NlcjEyU2VyaWFsaXplTWFwMTVzZXJpYWxpemVfZW50cnkxN2gwN2Q3MzUxZTk2YmI3ZTkwRXpGX1pOMTBzZXJkZV9jb3JlM3NlcjEyU2VyaWFsaXplTWFwMTVzZXJpYWxpemVfZW50cnkxN2gzZDg4ZGVlYTFkYmFiMjQwRXtGX1pOMTBzZXJkZV9jb3JlM3NlcjEyU2VyaWFsaXplTWFwMTVzZXJpYWxpemVfZW50cnkxN2g2MTZkNmYyMzRjYmM1MjJjRXxGX1pOMTBzZXJkZV9jb3JlM3NlcjEyU2VyaWFsaXplTWFwMTVzZXJpYWxpemVfZW50cnkxN2g3YjA0MzAwM2Q1MGE5Y2FiRX2jAV9aTjEwc2VyZGVfanNvbjV2YWx1ZTNzZXI4MV8kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uc2VyLi5TZXJpYWxpemUkdTIwJGZvciR1MjAkc2VyZGVfanNvbi4udmFsdWUuLlZhbHVlJEdUJDlzZXJpYWxpemUxN2hlYjk0MjdiNzI3NmU0NDdiRS5sbHZtLjcxOTExMzYzMTI4Nzg2OTI0Mjl+R19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDdhYWVjY2VlY2M3YjJmNThFf0dfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hhZDZjOGI0ODU2YjY0ZDhhRYABSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoMWNiYTNmZWU1ZTc2YzY1MEWBAV5fWk40Y29yZTNmbXQzbnVtNTJfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGVidWckdTIwJGZvciR1MjAkdXNpemUkR1QkM2ZtdDE3aGNkZjk1MjQ0ODA5OGJlNTZFggEwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aDk0ZDZmY2QzMjJmMzczZDZFgwFMX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2g0YWNlNTM3MzI5NzA5Mjk4RYQBX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhFhQFdX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aDA4OGQyOTcyNDE5OWRhM2JFhgGCAV9aTjk1XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5pdGVyLi50cmFpdHMuLmNvbGxlY3QuLkZyb21JdGVyYXRvciRMVCRjaGFyJEdUJCRHVCQ5ZnJvbV9pdGVyMTdoOThhNmIwYmZlZmEwZDM2MUWHAZIBX1pOMTBzZXJkZV9jb3JlMmRlNWltcGxzODdfJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRjb3JlLi5vcHRpb24uLk9wdGlvbiRMVCRUJEdUJCRHVCQxMWRlc2VyaWFsaXplMTdoYmE3MmIyNmQ2NTdkOWMxZEWIAUdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2g3ZWNiYjY4NGRlN2U1ODJjRYkBR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDkzOGEwMTNiMTlmNjk0ZGVFigFHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoZDM1ZmJjNWYyYjJmZmJmNUWLAVZfWk41YWxsb2MxMWNvbGxlY3Rpb25zNWJ0cmVlM21hcDI1QlRyZWVNYXAkTFQkSyRDJFYkQyRBJEdUJDZpbnNlcnQxN2gzNDg1M2FhZDhlNzllMjAyRYwBmwFfWk45OV8kTFQkYWxsb2MuLmNvbGxlY3Rpb25zLi5idHJlZS4ubWFwLi5JbnRvSXRlciRMVCRLJEMkViRDJEEkR1QkJHUyMCRhcyR1MjAkY29yZS4ub3BzLi5kcm9wLi5Ecm9wJEdUJDRkcm9wMTdoZjgwZjEwMjRlYWNiNjQ1MUUubGx2bS4xMDMxOTc3NTExNzQwNjk5NzAxMI0BWF9aTjE0ZWxsaXB0aWNfY3VydmUxMHB1YmxpY19rZXkxOFB1YmxpY0tleSRMVCRDJEdUJDE1ZnJvbV9zZWMxX2J5dGVzMTdoMmI3NWI3OGM5MmE2Yjk3YUWOAWFfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQxMWZpbmlzaF9ncm93MTdoMzc4MmEzZTQ1NmQ2YWZlOEUubGx2bS4zNzk2MjA2Mzg5OTIyMDUxMDEwjwFaX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkN3Jlc2VydmUyMWRvX3Jlc2VydmVfYW5kX2hhbmRsZTE3aDFjOWE5NmI5YTU0MjJlNGJFkAGrAV9aTjEzMl8kTFQkYWxsb2MuLnZlYy4uVmVjJExUJFQkQyRBJEdUJCR1MjAkYXMkdTIwJGFsbG9jLi52ZWMuLnNwZWNfZXh0ZW5kLi5TcGVjRXh0ZW5kJExUJCRSRiRUJEMkY29yZS4uc2xpY2UuLml0ZXIuLkl0ZXIkTFQkVCRHVCQkR1QkJEdUJDExc3BlY19leHRlbmQxN2hmOTU2NWQ4YzY5MzE2NWE1RZEBS19aTjQ2XyRMVCRUJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkV4cGVjdGVkJEdUJDNmbXQxN2hiMDFlYzA4YjkxMDFjN2IzRZIBS19aTjQ2XyRMVCRUJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkV4cGVjdGVkJEdUJDNmbXQxN2hlZDNkN2MzZDk2ODIzMzY4RZMBS19aTjQ2XyRMVCRUJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkV4cGVjdGVkJEdUJDNmbXQxN2hmOTE3YmQ3ODYwYWEyNTVkRZQBgAFfWk40Y29yZTNwdHI2OGRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnZlYy4uVmVjJExUJHNlcmRlX2pzb24uLnZhbHVlLi5WYWx1ZSRHVCQkR1QkMTdoNzAzYzU4MGJkMzA4YTMxNkUubGx2bS4xMDkzNjY3NTg1NjkxNzU3MTI2NpUBXF9aTjU4XyRMVCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkR1QkJHUyMCRhcyR1MjAkaGV4Li5Gcm9tSGV4JEdUJDhmcm9tX2hleDE3aDRhNGQ4MDMxMDEzNjJiOGJFlgGFAV9aTjk4XyRMVCRhbGxvYy4udmVjLi5WZWMkTFQkVCRHVCQkdTIwJGFzJHUyMCRhbGxvYy4udmVjLi5zcGVjX2Zyb21faXRlci4uU3BlY0Zyb21JdGVyJExUJFQkQyRJJEdUJCRHVCQ5ZnJvbV9pdGVyMTdoZWIyYjE1YzAxMGY4ZmQzNkWXAVxfWk41OF8kTFQkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEdUJCR1MjAkYXMkdTIwJGhleC4uRnJvbUhleCRHVCQ4ZnJvbV9oZXgxN2g3NmJkYzBiZjI4YmU4YWE0RZgBhQFfWk45OF8kTFQkYWxsb2MuLnZlYy4uVmVjJExUJFQkR1QkJHUyMCRhcyR1MjAkYWxsb2MuLnZlYy4uc3BlY19mcm9tX2l0ZXIuLlNwZWNGcm9tSXRlciRMVCRUJEMkSSRHVCQkR1QkOWZyb21faXRlcjE3aGRhYzYzMzllY2Y1ZTBkNjBFmQFGX1pONWFsbG9jM3ZlYzE2VmVjJExUJFQkQyRBJEdUJDE3ZXh0ZW5kX2Zyb21fc2xpY2UxN2hhNjBiZjVlNDBlMjMyMmRmRZoBZF9aTjcwXyRMVCRhbGxvYy4udmVjLi5WZWMkTFQkVCRDJEEkR1QkJHUyMCRhcyR1MjAkY29yZS4ub3BzLi5kcm9wLi5Ecm9wJEdUJDRkcm9wMTdoN2ViMzE0Y2JhM2M4YjQxZkWbASpfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxMl9fX3J1c3RfYWxsb2OcASxfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxNF9fX3J1c3RfZGVhbGxvY50BLF9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzE0X19fcnVzdF9yZWFsbG9jngFIX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjNDJfX19ydXN0X2FsbG9jX2Vycm9yX2hhbmRsZXJfc2hvdWxkX3BhbmljX3YynwFBX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMzVfX19ydXN0X25vX2FsbG9jX3NoaW1faXNfdW5zdGFibGVfdjKgATBfWk40c2hhMjZzaGEyNTYxMWNvbXByZXNzMjU2MTdoNjRiOWFjZDJhZWI1NDVhY0WhAU1fWk40azI1NjEwYXJpdGhtZXRpYzZzY2FsYXI0d2lkZTEwV2lkZVNjYWxhcjExcmVkdWNlX2ltcGwxN2hmMjFiZDQ3YTY1MzZiYWE5RaIBU19aTjRrMjU2MTBhcml0aG1ldGljNnNjYWxhcjR3aWRlMTBXaWRlU2NhbGFyMTdtdWxfc2hpZnRfdmFydGltZTE3aDA5MTM1OTM3Y2Q2NzhkMDhFowE6X1pONGsyNTYxMGFyaXRobWV0aWM2c2NhbGFyNlNjYWxhcjNtdWwxN2g2ODJiMjA4MjViYWE0Nzg5RaQBnQFfWk4xMTlfJExUJGsyNTYuLmFyaXRobWV0aWMuLmFmZmluZS4uQWZmaW5lUG9pbnQkdTIwJGFzJHUyMCRlbGxpcHRpY19jdXJ2ZS4ucG9pbnQuLkRlY29tcHJlc3NQb2ludCRMVCRrMjU2Li5TZWNwMjU2azEkR1QkJEdUJDEwZGVjb21wcmVzczE3aDNlNWM1OWEzMzIyODVlMWFFpQGlAV9aTjExOV8kTFQkazI1Ni4uYXJpdGhtZXRpYy4uYWZmaW5lLi5BZmZpbmVQb2ludCR1MjAkYXMkdTIwJGVsbGlwdGljX2N1cnZlLi5zZWMxLi5Gcm9tRW5jb2RlZFBvaW50JExUJGsyNTYuLlNlY3AyNTZrMSRHVCQkR1QkMThmcm9tX2VuY29kZWRfcG9pbnQxN2g1NjRmYzA2OTU4NDUwNTZhRaYBR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDBmZjM1ZDc5N2JlMmMwYmNFpwFHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMjRmYjg4ZDFmNWQzNjQ2MUWoAUdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2g2M2FlNjg1ZDVmNzQ4ZDFlRakBR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aGFjMTI4ZWFiNzYyMzBhNGJFqgFeX1pONGNvcmUzZm10M251bTUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRlYnVnJHUyMCRmb3IkdTIwJHVzaXplJEdUJDNmbXQxN2hjZGY5NTI0NDgwOThiZTU2RasBbl9aTjU1XyRMVCRzZWMxLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gzZmE0MmZjYzZkNGNmZGY3RS5sbHZtLjEzOTE1MDA0MTI5NTcwOTQ2Njc0rAGGAV9aTjg5XyRMVCRrMjU2Li5hcml0aG1ldGljLi5hZmZpbmUuLkFmZmluZVBvaW50JHUyMCRhcyR1MjAkc3VidGxlLi5Db25kaXRpb25hbGx5U2VsZWN0YWJsZSRHVCQxOGNvbmRpdGlvbmFsX3NlbGVjdDE3aDBlYzIwOGU5NDk1ZTVjYjlFrQF9X1pOOThfJExUJGsyNTYuLmFyaXRobWV0aWMuLmFmZmluZS4uQWZmaW5lUG9pbnQkdTIwJGFzJHUyMCRlbGxpcHRpY19jdXJ2ZS4ucG9pbnQuLkFmZmluZUNvb3JkaW5hdGVzJEdUJDF4MTdoNTcyMmMzNTU5MTllMzQwNkWuAWRfWk40azI1NjEwYXJpdGhtZXRpYzVmaWVsZDExZmllbGRfMTB4MjYxN0ZpZWxkRWxlbWVudDEweDI2MjBmcm9tX2J5dGVzX3VuY2hlY2tlZDE3aDczNzY0ZmZhOWU1MmJiOTVFrwFeX1pONGsyNTYxMGFyaXRobWV0aWM1ZmllbGQxMWZpZWxkXzEweDI2MTdGaWVsZEVsZW1lbnQxMHgyNjE0bm9ybWFsaXplX3dlYWsxN2g1MjRmM2E0NTk2MjIyZDdiRbABYl9aTjRrMjU2MTBhcml0aG1ldGljNWZpZWxkMTFmaWVsZF8xMHgyNjE3RmllbGRFbGVtZW50MTB4MjYxOG5vcm1hbGl6ZXNfdG9femVybzE3aGJlMDE4NTA0MTI1ZWJhM2FFsQFSX1pONGsyNTYxMGFyaXRobWV0aWM1ZmllbGQxMWZpZWxkXzEweDI2MTdGaWVsZEVsZW1lbnQxMHgyNjNtdWwxN2g1YmI4ZjVhOGE4ZDM5NzI1RbIBVV9aTjRrMjU2MTBhcml0aG1ldGljNWZpZWxkMTFmaWVsZF8xMHgyNjE3RmllbGRFbGVtZW50MTB4MjY2c3F1YXJlMTdoY2YzZDg2NWE5NzZjMzE1OUWzAVdfWk40azI1NjEwYXJpdGhtZXRpYzVmaWVsZDExZmllbGRfMTB4MjYxN0ZpZWxkRWxlbWVudDEweDI2OHRvX2J5dGVzMTdoMWU0OTIwOWIxYzNkZjJkNUW0AVhfWk40azI1NjEwYXJpdGhtZXRpYzVmaWVsZDExZmllbGRfMTB4MjYxN0ZpZWxkRWxlbWVudDEweDI2OW5vcm1hbGl6ZTE3aDNiYmUzMDVhZDJjYmE1ZDFFtQFxX1pOMTNjcnlwdG9fYmlnaW50NHVpbnQ3YWRkX21vZDUyXyRMVCRpbXBsJHUyMCRjcnlwdG9fYmlnaW50Li51aW50Li5VaW50JExUJF8kR1QkJEdUJDdhZGRfbW9kMTdoNDRlZTliNDhiODFkZWJiZUW2AXFfWk4xM2NyeXB0b19iaWdpbnQ0dWludDduZWdfbW9kNTJfJExUJGltcGwkdTIwJGNyeXB0b19iaWdpbnQuLnVpbnQuLlVpbnQkTFQkXyRHVCQkR1QkN25lZ19tb2QxN2hmYzEwMGY3Njk1M2U3ZThkRbcBR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDAxOGI0ZjhlZGFkNjExNTRFuAFHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMGFmMzhkNzQ5NDBjOTFiM0W5AUdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gxZGIzMzdhYTZkOTZkYWE1RboBR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDZjNzRiZjg4ODJhM2YzMThFuwFHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoOWNmMjUzN2Q0MDZjY2JjOUW8AboBX1pONGsyNTYxMzVfJExUJGltcGwkdTIwJGVsbGlwdGljX2N1cnZlLi5maWVsZC4uRmllbGRCeXRlc0VuY29kaW5nJExUJGsyNTYuLlNlY3AyNTZrMSRHVCQkdTIwJGZvciR1MjAkY3J5cHRvX2JpZ2ludC4udWludC4uVWludCRMVCQ4X3VzaXplJEdUJCRHVCQxOGRlY29kZV9maWVsZF9ieXRlczE3aGUyNDcwMTYwNjYzMmVlYmJFvQFVX1pONTZfJExUJGRlci4ubGVuZ3RoLi5MZW5ndGgkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gxMTYzMTE2MTA4M2E1MzJmRb4BV19aTjU4XyRMVCRkZXIuLmVycm9yLi5FcnJvcktpbmQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gxYWU2MzQ0N2QyZmFjYzEyRb8BX19aTjY2XyRMVCRjb3JlLi5vcHRpb24uLk9wdGlvbiRMVCRUJEdUJCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDY1MjNhY2Q4ODk4NjA0NGFFwAGDAV9aTjg2XyRMVCRjcnlwdG9fYmlnaW50Li51aW50Li5VaW50JExUJF8kR1QkJHUyMCRhcyR1MjAkc3VidGxlLi5Db25kaXRpb25hbGx5U2VsZWN0YWJsZSRHVCQxOGNvbmRpdGlvbmFsX3NlbGVjdDE3aDI1OTIwOTZhMGQ4YmZlYWRFwQFPX1pONGsyNTYxMGFyaXRobWV0aWMxMHByb2plY3RpdmUxNVByb2plY3RpdmVQb2ludDl0b19hZmZpbmUxN2gwZDAwMzc0MmZmNjgxNzZhRcIBjgFfWk45N18kTFQkazI1Ni4uYXJpdGhtZXRpYy4ucHJvamVjdGl2ZS4uUHJvamVjdGl2ZVBvaW50JHUyMCRhcyR1MjAkc3VidGxlLi5Db25kaXRpb25hbGx5U2VsZWN0YWJsZSRHVCQxOGNvbmRpdGlvbmFsX3NlbGVjdDE3aDU0MTZiNmQyNDRiNTQxN2VFwwGhAV9aTjEzMF8kTFQkazI1Ni4uYXJpdGhtZXRpYy4ucHJvamVjdGl2ZS4uUHJvamVjdGl2ZVBvaW50JHUyMCRhcyR1MjAkY29yZS4uY29udmVydC4uRnJvbSRMVCRrMjU2Li5hcml0aG1ldGljLi5hZmZpbmUuLkFmZmluZVBvaW50JEdUJCRHVCQ0ZnJvbTE3aGY1OTdkOTdlODliZDBkM2NFxAFiX1pONGsyNTYxMGFyaXRobWV0aWMxMHByb2plY3RpdmUxNVByb2plY3RpdmVQb2ludDNhZGQxN2g3Njk1YzdhZTg4NDA2ZjExRS5sbHZtLjU2ODM0MDc0NzI1NDcxMjE0MDbFAcABX1pONGsyNTYxMGFyaXRobWV0aWMzbXVsMTQxXyRMVCRpbXBsJHUyMCRjb3JlLi5vcHMuLmFyaXRoLi5NdWwkTFQkJFJGJGsyNTYuLmFyaXRobWV0aWMuLnNjYWxhci4uU2NhbGFyJEdUJCR1MjAkZm9yJHUyMCRrMjU2Li5hcml0aG1ldGljLi5wcm9qZWN0aXZlLi5Qcm9qZWN0aXZlUG9pbnQkR1QkM211bDE3aGU3YzRlNmFhNmUxY2FmMTBFxgFxX1pONzhfJExUJGsyNTYuLmFyaXRobWV0aWMuLnByb2plY3RpdmUuLlByb2plY3RpdmVQb2ludCR1MjAkYXMkdTIwJGdyb3VwLi5DdXJ2ZSRHVCQ5dG9fYWZmaW5lMTdoMWNlY2YwMTc3ZGMxY2U1NUXHAUBfWk40azI1NjEwYXJpdGhtZXRpYzNtdWwxMUxvb2t1cFRhYmxlNnNlbGVjdDE3aDBmZjI1YWI5NTdlMTRlMmVFyAFPX1pONGsyNTYxMGFyaXRobWV0aWMzbXVsMjlSYWRpeDE2RGVjb21wb3NpdGlvbiRMVCRfJEdUJDNuZXcxN2g4NmUxNGRhZWY5MzA0MWE4RckBNF9aTjRrMjU2MTBhcml0aG1ldGljM211bDdsaW5jb21iMTdoMGFkOTAwOTIzYTRjZjFjOEXKAUFfWk40azI1NjEwYXJpdGhtZXRpYzVmaWVsZDEyRmllbGRFbGVtZW50NHNxcnQxN2g4YmFjZTY0M2ZkOGE5MTAyRcsBQ19aTjRrMjU2MTBhcml0aG1ldGljNWZpZWxkMTJGaWVsZEVsZW1lbnQ2aW52ZXJ0MTdoOWRjN2JkODJlMjhhNmNlZEXMAWBfWk42N18kTFQkZWxsaXB0aWNfY3VydmUuLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoODgwMDA1ZWNlZDA2ZDFkY0XNAUlfWk40NF8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDI1MzMxYzQ5YzNkYjk4M2FFzgFfX1pONjZfJExUJGRlci4udGFnLi5udW1iZXIuLlRhZ051bWJlciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNTY1ODliMjU0MzBhNzdkNUXPAU9fWk41MF8kTFQkZGVyLi50YWcuLlRhZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aGZjN2NlY2NjZTcyNWRlM2VF0AFJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hkMzRhMmZhMTRkYjEzYzNhRdEBUV9aTjUyXyRMVCRkZXIuLnRhZy4uVGFnJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hkNWNkYTM1NDgwYWM5MDYxRdIBR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aGQxYzdhMzM0YjhjNjU1NmZF0wFHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoZmQ5MTVhYjk0Zjc3NWYwNkXUAUlfWk40NF8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDVmYmIwZjk1NWNjZTkwMDNF1QFfX1pONjZfJExUJGNvbnN0X29pZC4uT2JqZWN0SWRlbnRpZmllciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZmQwNmIxMjhiNmZmN2VhMEXWAVlfWk42MF8kTFQkY29uc3Rfb2lkLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gyOGM0MWEyNTFiNTNmZWY5RdcBXV9aTjY0XyRMVCRjb25zdF9vaWQuLk9iamVjdElkZW50aWZpZXIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hmNzQ4ZjYyMTMxNjM3OWY2RdgBNF9aTjljb25zdF9vaWQ0YXJjczRBcmNzOHRyeV9uZXh0MTdoYzJjOGY2MGJlMTYxOWJmN0XZAShfWk42c3VidGxlOWJsYWNrX2JveDE3aDU3MWJiMzIzMDIwYWVjNGNF2gGiAV9aTjEzY3J5cHRvX2JpZ2ludDljdF9jaG9pY2UxMDZfJExUJGltcGwkdTIwJGNvcmUuLmNvbnZlcnQuLkZyb20kTFQkY3J5cHRvX2JpZ2ludC4uY3RfY2hvaWNlLi5DdENob2ljZSRHVCQkdTIwJGZvciR1MjAkc3VidGxlLi5DaG9pY2UkR1QkNGZyb20xN2gzYWYwYWVmZmIzZTI4YjkyRdsBXF9aTjYzXyRMVCRoZXguLmVycm9yLi5Gcm9tSGV4RXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDhhMDcxZmI1NzYwMzA0YWVF3AFtX1pONzlfJExUJGhleC4uQnl0ZXNUb0hleENoYXJzJHUyMCRhcyR1MjAkY29yZS4uaXRlci4udHJhaXRzLi5pdGVyYXRvci4uSXRlcmF0b3IkR1QkNG5leHQxN2g1Nzk2NjcxZmNiNGZiMjUxRd0BT19aTjEwc2VyZGVfanNvbjRyZWFkMTJwYXJzZV9lc2NhcGUxN2hkZDU2OTUxYzk4ZTY3ZDQzRS5sbHZtLjMxMDI5OTMzODMwNTA2NDA0OTbeAS5fWk4xMHNlcmRlX2pzb240cmVhZDVlcnJvcjE3aGI2Mjk3YzY4MjVmN2I4ZjhF3wEuX1pOMTBzZXJkZV9qc29uNHJlYWQ1ZXJyb3IxN2hkYTcyYzk1MTc1OTllYmEzReABPl9aTjEwc2VyZGVfanNvbjRyZWFkMjBwYXJzZV91bmljb2RlX2VzY2FwZTE3aGU4MzUzODQ2MDgyYjM2YTZF4QEuX1pOMTBzZXJkZV9qc29uNHJlYWQ1ZXJyb3IxN2g5YjQwMDE2OGZhOWI0NDlhReIBR19aTjEwc2VyZGVfanNvbjRyZWFkNWVycm9yMTdoMGRmYmFmZDM2NGQzNDgwY0UubGx2bS4zMTAyOTkzMzgzMDUwNjQwNDk24wFeX1pOMTBzZXJkZV9qc29uNHJlYWQ5U2xpY2VSZWFkMTdwb3NpdGlvbl9vZl9pbmRleDE3aGYwYTkxMTJjNWQxNjE2ZjBFLmxsdm0uMzEwMjk5MzM4MzA1MDY0MDQ5NuQBLl9aTjEwc2VyZGVfanNvbjRyZWFkNWVycm9yMTdoZWZiY2IxMTFhYWY5MzQwOEXlAVtfWk4xMHNlcmRlX2pzb240cmVhZDlTbGljZVJlYWQxNHNraXBfdG9fZXNjYXBlMTdoZWFmZjAzYzFmZmRhYTVmMUUubGx2bS4zMTAyOTkzMzgzMDUwNjQwNDk25gFHX1pOMTBzZXJkZV9qc29uNHJlYWQ5U2xpY2VSZWFkMTlza2lwX3RvX2VzY2FwZV9zbG93MTdoYzA3NjZjZmMxNDQ4NDk2YUXnAWlfWk42OF8kTFQkc2VyZGVfanNvbi4ucmVhZC4uU3RyUmVhZCR1MjAkYXMkdTIwJHNlcmRlX2pzb24uLnJlYWQuLlJlYWQkR1QkMTBpZ25vcmVfc3RyMTdoM2FkZWYyOWZhOGJhNTkxYkXoAWtfWk43MF8kTFQkc2VyZGVfanNvbi4ucmVhZC4uU2xpY2VSZWFkJHUyMCRhcyR1MjAkc2VyZGVfanNvbi4ucmVhZC4uUmVhZCRHVCQxMGlnbm9yZV9zdHIxN2gxOWZhNTQwMDE3NmY0Y2VhRekBbF9aTjY4XyRMVCRzZXJkZV9qc29uLi5yZWFkLi5TdHJSZWFkJHUyMCRhcyR1MjAkc2VyZGVfanNvbi4ucmVhZC4uUmVhZCRHVCQxM3BlZWtfcG9zaXRpb24xN2g3NjczOTQwMzEwMDI0MzRiReoBZl9aTjY4XyRMVCRzZXJkZV9qc29uLi5yZWFkLi5TdHJSZWFkJHUyMCRhcyR1MjAkc2VyZGVfanNvbi4ucmVhZC4uUmVhZCRHVCQ4cG9zaXRpb24xN2gzZDAxMDdkMmIyYzJiMGFlResBZ19aTjY4XyRMVCRzZXJkZV9qc29uLi5yZWFkLi5TdHJSZWFkJHUyMCRhcyR1MjAkc2VyZGVfanNvbi4ucmVhZC4uUmVhZCRHVCQ5cGFyc2Vfc3RyMTdoMmM0ZGUxYzE0MTczNTk5OUXsAW5fWk43MF8kTFQkc2VyZGVfanNvbi4ucmVhZC4uU2xpY2VSZWFkJHUyMCRhcyR1MjAkc2VyZGVfanNvbi4ucmVhZC4uUmVhZCRHVCQxM3BlZWtfcG9zaXRpb24xN2g3ZDIwYzEyYTU2NzhjYjJiRe0BaF9aTjcwXyRMVCRzZXJkZV9qc29uLi5yZWFkLi5TbGljZVJlYWQkdTIwJGFzJHUyMCRzZXJkZV9qc29uLi5yZWFkLi5SZWFkJEdUJDhwb3NpdGlvbjE3aDhiMGRlMzZjNTY4NDJhMDJF7gFpX1pONzBfJExUJHNlcmRlX2pzb24uLnJlYWQuLlNsaWNlUmVhZCR1MjAkYXMkdTIwJHNlcmRlX2pzb24uLnJlYWQuLlJlYWQkR1QkOXBhcnNlX3N0cjE3aGFkMzRlODUxMDJhNjJlNzlF7wE1X1pOMTBzZXJkZV9qc29uNWVycm9yMTBtYWtlX2Vycm9yMTdoM2Y2NzlmNTQ3MWQwZTFiZUXwAUJfWk40Y29yZTNzdHI3cGF0dGVybjE0VHdvV2F5U2VhcmNoZXI5bmV4dF9iYWNrMTdoYzNmNWI5YWRhNjBiZmEzYkXxATZfWk4xMHNlcmRlX2pzb241ZXJyb3I1RXJyb3I2c3ludGF4MTdoYTEwNzY1NDY4ODg3ZDE0NEXyAUxfWk40Y29yZTNwdHI0MmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJDE3aDRmYTU2ZGE2NzJmOWQ4MTNF8wFSX1pONTNfJExUJGNvcmUuLmZtdC4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gxYjY1NTM2Y2QzM2ExZTFjRfQBV19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hiMWEzZmI5NzUzM2ZkZDg1RfUBX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhF9gFdX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aDA4OGQyOTcyNDE5OWRhM2JF9wFaX1pONjFfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDBhZTI3NzIyZDIwNGQzMzdF+AFgX1pONjdfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvckNvZGUkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGVmYTk5ZTNlMWZlNGEzYzRF+QFcX1pONjNfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZTg2OTI0M2RkN2UzMTI5MUX6AWlfWk42Nl8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkVycm9yJEdUJDEyaW52YWxpZF90eXBlMTdoN2I1ZDViZWRmNWRhZjYzZkX7AWVfWk43Ml8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkpzb25VbmV4cGVjdGVkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g0OWFiNmQ4NDE5NzgzNWQxRfwBfF9aTjY2XyRMVCRzZXJkZV9qc29uLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uRXJyb3IkR1QkNmN1c3RvbTE3aDk4YmZhMjM0NDU0NTE4YjRFLmxsdm0uMTY0MTQ3Nzk3MjI3NDQ2Nzc5Mzf9AWpfWk42Nl8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkVycm9yJEdUJDEzaW52YWxpZF92YWx1ZTE3aGVlOTNjNzQxMjk4ZTZiMmRF/gFCX1pOMTBzZXJkZV9qc29uMmRlMTJQYXJzZXJOdW1iZXIxMmludmFsaWRfdHlwZTE3aDQ1NmZhMjJlZDNiMzdmNjhF/wFMX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxM3BhcnNlX2RlY2ltYWwxN2hiZDk4NDFhNWE5MTVkYmZiRYACTV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTRmNjRfZnJvbV9wYXJ0czE3aDFjM2FlYTNjMjE2YWNiNzBFgQJNX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxNHBhcnNlX2V4cG9uZW50MTdoZjZkM2YzOTNiNTE1MzNlYkWCAlVfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDIycGFyc2VfZGVjaW1hbF9vdmVyZmxvdzE3aGU5OTA1OWU1Mjc4NGQxZThFgwJRX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxOHBhcnNlX2xvbmdfaW50ZWdlcjE3aDU0MGU5NmFhMjUwMGVlZjJFhAJWX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQyM3BhcnNlX2V4cG9uZW50X292ZXJmbG93MTdoZmQ3ZWY3ZjcyZmJiMWZhYUWFAmFfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQxMWZpbmlzaF9ncm93MTdoOTE0MWE5NzgwY2RjMmRmZkUubGx2bS4zNzE1MjY0NzAwMzg4NjAwMDU0hgJaX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkN3Jlc2VydmUyMWRvX3Jlc2VydmVfYW5kX2hhbmRsZTE3aGE4NDQ3NWFiZDllYmQ0NDdFhwJJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g3ODk0Mjg4Mjk0YmJhMjg2RYgCSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoY2Q4MmFjZjcyNzNjMWMyMUWJAjBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoNGE4MTQxMDExYTk0YzRkOUWKAkxfWk40Y29yZTNwdHI0MmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJDE3aDRmYTU2ZGE2NzJmOWQ4MTNFiwJfX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkMTB3cml0ZV9jaGFyMTdoMDA1MWU2YWY3YTc1MWVmOEWMAl1fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoMDg4ZDI5NzI0MTk5ZGEzYkWNAl5fWk42NV8kTFQkc2VyZGVfanNvbi4uaW8uLmltcC4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDYxOGQ1NjhhMGI1MTJhMTBFjgJDX1pOMzhfJExUJHU2NCR1MjAkYXMkdTIwJGl0b2EuLlVuc2lnbmVkJEdUJDNmbXQxN2g0MTliODg5YTcxYjBjMDJjRY8CXF9aTjQ1XyRMVCRmNjQkdTIwJGFzJHUyMCR6bWlqLi5wcml2YXRlLi5TZWFsZWQkR1QkMjB3cml0ZV90b196bWlqX2J1ZmZlcjE3aGI0ZDM1YWE1OWQzYzZhYjRFkAI3X1pOMTF3aXRfYmluZGdlbjJydDE0cnVuX2N0b3JzX29uY2UxN2hkMGI2NjlmM2I2NTU5OGQxRZECM19aTjExd2l0X2JpbmRnZW4ycnQ3Q2xlYW51cDNuZXcxN2g3NzllOTIzMjQyY2E0M2U0RZICYF9aTjY2XyRMVCR3aXRfYmluZGdlbi4ucnQuLkNsZWFudXAkdTIwJGFzJHUyMCRjb3JlLi5vcHMuLmRyb3AuLkRyb3AkR1QkNGRyb3AxN2gxNjE0YTZkYTVmZGFjZWU0RZMCZF9aTjcxXyRMVCRwb2x5dmFsLi5iYWNrZW5kLi5zb2Z0Li5VMzJ4NCR1MjAkYXMkdTIwJGNvcmUuLm9wcy4uYXJpdGguLk11bCRHVCQzbXVsMTdoZTQ2ZDcyN2Y4Y2JmOGE0OUWUAnNfWk43OF8kTFQkcG9seXZhbC4uYmFja2VuZC4uc29mdC4uUG9seXZhbCR1MjAkYXMkdTIwJHVuaXZlcnNhbF9oYXNoLi5VaGZCYWNrZW5kJEdUJDEwcHJvY19ibG9jazE3aDBiNDQ0OWY0NjhlODhhZTlFlQJJX1pON3BvbHl2YWw3YmFja2VuZDRzb2Z0N1BvbHl2YWwxOW5ld193aXRoX2luaXRfYmxvY2sxN2hlM2I0OTQ5YTU3ZGI1M2YwRZYCc19aTjgxXyRMVCRwb2x5dmFsLi5iYWNrZW5kLi5zb2Z0Li5Qb2x5dmFsJHUyMCRhcyR1MjAkdW5pdmVyc2FsX2hhc2guLlVuaXZlcnNhbEhhc2gkR1QkOGZpbmFsaXplMTdoYzQwODM4NjVjOTQ4NzZlMkWXAjVfWk4zYWVzNHNvZnQ4Zml4c2xpY2UxMG1lbXNoaWZ0MzIxN2hiM2M2ODZjZGU4MjhlMDkzRZgCNl9aTjNhZXM0c29mdDhmaXhzbGljZTExeG9yX2NvbHVtbnMxN2g0MzcxMmE1MDUzMjIyYmViRZkCOF9aTjNhZXM0c29mdDhmaXhzbGljZTEzbWl4X2NvbHVtbnNfMTE3aGJjOTA1NTU1MmUzZTBlYjhFmgI4X1pOM2FlczRzb2Z0OGZpeHNsaWNlMTNtaXhfY29sdW1uc18zMTdoNmU1Zjc1MTJjMjQ5MWU4OEWbAjNfWk4zYWVzNHNvZnQ4Zml4c2xpY2U5c3ViX2J5dGVzMTdoNjY5YTI4YWUxZDY2Yzk0MEWcAjlfWk4zYWVzNHNvZnQ4Zml4c2xpY2UxNGFlczI1Nl9lbmNyeXB0MTdoNjgzMTUxMDYzNjQwMDMwOEWdAj5fWk4zYWVzNHNvZnQ4Zml4c2xpY2UxOWFlczI1Nl9rZXlfc2NoZWR1bGUxN2gwZGQ4MGYxNWQ2ZjYyNzZmRZ4CT19aTjUwXyRMVCRhZWFkLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNGE5Nzk0YTc5ODY2NjE3MUWfAmBfWk42N18kTFQkY3J5cHRvX2NvbW1vbi4uSW52YWxpZExlbmd0aCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoYjEzNjY2YzNhYjdhNzRmMUWgAk9fWk43emVyb2l6ZTdiYXJyaWVyMjBvcHRpbWl6YXRpb25fYmFycmllcjE2Y3VzdG9tX2JsYWNrX2JveDE3aGFlMDg4YzQ1OTIxZTZhNzZFoQKrAV9aTjEzM18kTFQkJExUJHNlcmRlX2NvcmUuLmRlLi5XaXRoRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJC4uZm10Li5Mb29rRm9yRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2gzM2E2MTRiNDA0ZjUwMWIyRaICqQFfWk4xMzNfJExUJCRMVCRzZXJkZV9jb3JlLi5kZS4uV2l0aERlY2ltYWxQb2ludCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQuLmZtdC4uTG9va0ZvckRlY2ltYWxQb2ludCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aGVlMDE2YzExYzNmOTgwNmFFowLCAV9aTjE1OF8kTFQkc2VyZGVfY29yZS4uZGUuLmltcGxzLi4kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJHUxNiRHVCQuLmRlc2VyaWFsaXplLi5QcmltaXRpdmVWaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aGRmNGMyMzE5MTgwYTMzMGRFpALCAV9aTjE1OF8kTFQkc2VyZGVfY29yZS4uZGUuLmltcGxzLi4kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJHU2NCRHVCQuLmRlc2VyaWFsaXplLi5QcmltaXRpdmVWaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aDZhNjM5MDI4ZTdkMGZiNGVFpQJHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoYmJjNWYyZDdmOGMzZjFiMUWmAjBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoNWZiZTc0OTMyNjAyZDliNEWnAlFfWk41Ml8kTFQkJFJGJHN0ciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5FeHBlY3RlZCRHVCQzZm10MTdoNjllYzMzMDM2Yjk2NDBhN0WoAl5fWk42NV8kTFQkc2VyZGVfY29yZS4uZGUuLlVuZXhwZWN0ZWQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGIxMTBiN2Y0MGUwMjJmNWJFqQJkX1pONzFfJExUJHNlcmRlX2NvcmUuLmRlLi5XaXRoRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g0ZTgzZjY3YzRlYzAyMTU3RaoCZF9aTjcxXyRMVCRkeW4kdTIwJHNlcmRlX2NvcmUuLmRlLi5FeHBlY3RlZCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoY2JhNDhlYzk1M2IyNWUzZEWrAnNfWk44MF8kTFQkc2VyZGVfY29yZS4uZGUuLmltcGxzLi5TdHJpbmdWaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aGU2MDQxZDVhYTQyMTg1NDJFrAIwX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMThfX19ydXN0X3N0YXJ0X3BhbmljrQInX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTBydXN0X3BhbmljrgIuX1pOM3N0ZDJpbzVXcml0ZTl3cml0ZV9mbXQxN2gwYTg3MjBkYWY5NTJmZGMzRa8Cc19aTjRjb3JlM3B0cjgxZHJvcF9pbl9wbGFjZSRMVCRjb3JlLi5yZXN1bHQuLlJlc3VsdCRMVCQkTFAkJFJQJCRDJHN0ZC4uaW8uLmVycm9yLi5FcnJvciRHVCQkR1QkMTdoN2ZjZGRjMWU1ZWE1NTJhZEWwAlZfWk40Y29yZTNwdHI1MmRyb3BfaW5fcGxhY2UkTFQkc3RkLi5zeXMuLnN0ZGlvLi53YXNpcDIuLlN0ZGVyciRHVCQxN2gxMDMxMDc1YWEzZDkxMjZlRbECKV9aTjNzdGQ3cHJvY2VzczVhYm9ydDE3aDlkNDNjZDIyMGI2MDA0YWRFsgIpX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTFfX19yZGxfYWxsb2OzAipfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxMl9fX3J1c3RfYWJvcnS0AitfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxM19fX3JkbF9kZWFsbG9jtQIrX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTNfX19yZGxfcmVhbGxvY7YCLl9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzE3cnVzdF9iZWdpbl91bndpbmS3AkVfWk4zc3RkM3N5czliYWNrdHJhY2UyNl9fcnVzdF9lbmRfc2hvcnRfYmFja3RyYWNlMTdoZWJjZWE0OTI5MzQ5ZjRjYUW4AjhfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMyNl9fX3J1c3RfYWxsb2NfZXJyb3JfaGFuZGxlcrkCKl9aTjNzdGQ1YWxsb2M4cnVzdF9vb20xN2hlOThhOGYwZjFiY2I2NTQyRboCRV9aTjM2XyRMVCRUJHUyMCRhcyR1MjAkY29yZS4uYW55Li5BbnkkR1QkN3R5cGVfaWQxN2g5ZjA2NDNlY2MwZGY5ZTNiRbsCRV9aTjM2XyRMVCRUJHUyMCRhcyR1MjAkY29yZS4uYW55Li5BbnkkR1QkN3R5cGVfaWQxN2hhMDNkYjg0Njc4ZDU2ZDFkRbwCSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoYWQ4YzllZWUzNjcyMjE1YkW9AlpfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQ3cmVzZXJ2ZTIxZG9fcmVzZXJ2ZV9hbmRfaGFuZGxlMTdoMjQ3ZmMwMDkwNmRiODcxY0W+AkhfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQxMWZpbmlzaF9ncm93MTdoNzNlNTEyODYwODQyMjRiYkW/Ai5fWk4zc3RkMmlvNWVycm9yNUVycm9yM25ldzE3aGZhNWUzMjk1MzE4ZmFkMTZFwAI3X1pOM3N0ZDJpbzVXcml0ZTE3aXNfd3JpdGVfdmVjdG9yZWQxN2hiMGZkMTdjZDM2MDYwNWJjRcECOF9aTjNzdGQyaW81V3JpdGUxOHdyaXRlX2FsbF92ZWN0b3JlZDE3aDk1NzA4NDA1MjU5ZTVmZWNFwgIuX1pOM3N0ZDJpbzVXcml0ZTl3cml0ZV9hbGwxN2g5N2U1ODNkYWM2N2YyZGU1RcMCLl9aTjNzdGQyaW81V3JpdGU5d3JpdGVfZm10MTdoNWNlNmZmMmRmMjI4NzZjZUXEAi5fWk4zc3RkMmlvNVdyaXRlOXdyaXRlX2ZtdDE3aDhjNGUzODRkN2M1ZTRiZGFFxQKAAV9aTjNzdGQyaW81aW1wbHM3NF8kTFQkaW1wbCR1MjAkc3RkLi5pby4uV3JpdGUkdTIwJGZvciR1MjAkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEMkQSRHVCQkR1QkMTR3cml0ZV92ZWN0b3JlZDE3aDk4YmQxNTlhZjEzMjMzNDFFxgKDAV9aTjNzdGQyaW81aW1wbHM3NF8kTFQkaW1wbCR1MjAkc3RkLi5pby4uV3JpdGUkdTIwJGZvciR1MjAkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEMkQSRHVCQkR1QkMTdpc193cml0ZV92ZWN0b3JlZDE3aDM4NDVjZTgxMmRmZjNhZGJFxwKEAV9aTjNzdGQyaW81aW1wbHM3NF8kTFQkaW1wbCR1MjAkc3RkLi5pby4uV3JpdGUkdTIwJGZvciR1MjAkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEMkQSRHVCQkR1QkMTh3cml0ZV9hbGxfdmVjdG9yZWQxN2gxNjY3NWUxNmIzYjRiNjBiRcgCdl9aTjNzdGQyaW81aW1wbHM3NF8kTFQkaW1wbCR1MjAkc3RkLi5pby4uV3JpdGUkdTIwJGZvciR1MjAkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEMkQSRHVCQkR1QkNWZsdXNoMTdoNDUzZDQxYjhiYWRhNWZmNEXJAnZfWk4zc3RkMmlvNWltcGxzNzRfJExUJGltcGwkdTIwJHN0ZC4uaW8uLldyaXRlJHUyMCRmb3IkdTIwJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRDJEEkR1QkJEdUJDV3cml0ZTE3aDY1OTBiN2VhN2I2MDUzNGRFygJ6X1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQ5d3JpdGVfYWxsMTdoYTQyNWJmODJkYmM3NjM0OUXLAj5fWk41YWxsb2M0c3luYzE2QXJjJExUJFQkQyRBJEdUJDlkcm9wX3Nsb3cxN2gwZmU4MWNjZDc5ODRiMzA5RcwCNV9aTjRjb3JlOXBhbmlja2luZzEzYXNzZXJ0X2ZhaWxlZDE3aGIyMDJjM2Q0MmJjODFjOTZFzQI8X1pOM3N0ZDZ0aHJlYWQyaWQ4VGhyZWFkSWQzbmV3OWV4aGF1c3RlZDE3aDIxMWI5Zjc5ZmIzOTcxZTFFzgIsX1pOM3N0ZDNlbnYxMWN1cnJlbnRfZGlyMTdoNmFiMzA5NDkzNWJiMGE5NEXPAidfWk4zc3RkM2VudjdfdmFyX29zMTdoMGZhYWYwMjQyY2EzNDBmMkXQAlRfWk4zc3RkM3N5czNwYWw2Y29tbW9uMTRzbWFsbF9jX3N0cmluZzI0cnVuX3dpdGhfY3N0cl9hbGxvY2F0aW5nMTdoMzY2ZjA0MDI1OGQ0NzI3ZkXRAkJfWk4zc3RkM3N5czNwYWw2d2FzaXAyN2hlbHBlcnMxNGFib3J0X2ludGVybmFsMTdoMGUyZTY3ZjI0NzM4OTFjYkXSAj5fWk4zc3RkM3N5czliYWNrdHJhY2UxM0JhY2t0cmFjZUxvY2s1cHJpbnQxN2gyMDhkZjgyNGE1MDdkOTZhRdMCf19aTjk4XyRMVCRzdGQuLnN5cy4uYmFja3RyYWNlLi5CYWNrdHJhY2VMb2NrLi5wcmludC4uRGlzcGxheUJhY2t0cmFjZSR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZGI4NWE0ZWRmZmMwMzc5YUXUAkVfWk4zc3RkM3N5czliYWNrdHJhY2UyNl9fcnVzdF9lbmRfc2hvcnRfYmFja3RyYWNlMTdoODgwMzZlNjU4Yzk5MTQ4Y0XVAkhfWk4zc3RkNWFsbG9jOHJ1c3Rfb29tMjhfJHU3YiQkdTdiJGNsb3N1cmUkdTdkJCR1N2QkMTdoYThjNDk5YTE5ZjFlMTVmMEXWAlJfWk4zc3RkOXBhbmlja2luZzEzcGFuaWNfaGFuZGxlcjI4XyR1N2IkJHU3YiRjbG9zdXJlJHU3ZCQkdTdkJDE3aDNhMzllNzBiM2RjYmE3MjVF1wIuX1pOM3N0ZDNzeXM5YmFja3RyYWNlNGxvY2sxN2gzYjVkNmM1ZDhkMjcxOTYyRdgCQl9aTjNzdGQ0c3luYzZwb2lzb241bXV0ZXgxNE11dGV4JExUJFQkR1QkNGxvY2sxN2gzMGNmNDA4NDRiNTIyZmY2RdkCO19aTjNzdGQ1YWxsb2MyNGRlZmF1bHRfYWxsb2NfZXJyb3JfaG9vazE3aGVhNWNkZTFkNDNmZDA0MzJF2gI2X1pOM3N0ZDVwYW5pYzE5Z2V0X2JhY2t0cmFjZV9zdHlsZTE3aDZjOGU4ODA5YTU0NGNmNWZF2wJbX1pOM3N0ZDZ0aHJlYWQ3Y3VycmVudDE3d2l0aF9jdXJyZW50X25hbWUyOF8kdTdiJCR1N2IkY2xvc3VyZSR1N2QkJHU3ZCQxN2g0NzNlMjBlZWZmMWIxMTlmRdwCSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoYjFmMzU1NjI5Njc0NTliY0XdAjZfWk4zc3RkOXBhbmlja2luZzE1cGFuaWNfd2l0aF9ob29rMTdoYjUzZmI4OTI3NWZmYjY1Y0XeAjtfWk4zc3RkOXBhbmlja2luZzExcGFuaWNfY291bnQ4aW5jcmVhc2UxN2hlZmE3MGE2ZTBhNmUwYzM2Rd8CM19aTjNzdGQ5cGFuaWNraW5nMTJkZWZhdWx0X2hvb2sxN2g5ZmM0MTVlNTRkM2IwZTdmReACNV9aTjNzdGQ5cGFuaWNraW5nMTRwYXlsb2FkX2FzX3N0cjE3aDE1MzZkMDM2ZDMzODVhMzBF4QJRX1pOM3N0ZDlwYW5pY2tpbmcxMmRlZmF1bHRfaG9vazI4XyR1N2IkJHU3YiRjbG9zdXJlJHU3ZCQkdTdkJDE3aDFmNmVmM2IxOGMxNmMyZDhF4gJRX1pONTJfJExUJCRSRiRtdXQkdTIwJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDA1ZDdjOTFmMGE1MzNjZDNF4wJHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoZmZkNTljMDUxYjNiNTczZEXkAjJfWk40Y29yZTNmbXQ1V3JpdGUxMHdyaXRlX2NoYXIxN2gzZGZkNWM3ZGYwMDU0MTc1ReUCMl9aTjRjb3JlM2ZtdDVXcml0ZTEwd3JpdGVfY2hhcjE3aDNmODc1M2EzZDliYWQzOGVF5gIyX1pONGNvcmUzZm10NVdyaXRlMTB3cml0ZV9jaGFyMTdoYjBmOTljOGM1Y2NkYTE0NEXnAjBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoM2FlOTIzMjQ2MzkwN2VmZUXoAjBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoNmYwYzk0MzY3YzNmZjQxNkXpAjBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoODJhYzI0NTQ1Yzg5YjAyYUXqAjBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoYjM3OGE1OTVhNzc3NzUwY0XrApoBX1pONGNvcmUzcHRyMTE5ZHJvcF9pbl9wbGFjZSRMVCRzdGQuLmlvLi5kZWZhdWx0X3dyaXRlX2ZtdC4uQWRhcHRlciRMVCRzdGQuLmlvLi5jdXJzb3IuLkN1cnNvciRMVCQkUkYkbXV0JHUyMCQkdTViJHU4JHU1ZCQkR1QkJEdUJCRHVCQxN2g5MzJmZTIxYTI4ZmI5ODk4RewCkQJfWk40Y29yZTNwdHIyMzhkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5ib3hlZC4uY29udmVydC4uJExUJGltcGwkdTIwJGNvcmUuLmNvbnZlcnQuLkZyb20kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJCR1MjAkZm9yJHUyMCRhbGxvYy4uYm94ZWQuLkJveCRMVCRkeW4kdTIwJGNvcmUuLmVycm9yLi5FcnJvciR1MmIkY29yZS4ubWFya2VyLi5TZW5kJHUyYiRjb3JlLi5tYXJrZXIuLlN5bmMkR1QkJEdUJC4uZnJvbS4uU3RyaW5nRXJyb3IkR1QkMTdoMGJiNDQwNjM5YmM3NjY5M0XtAkxfWk40Y29yZTNwdHI0MmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJDE3aDk3NGRmYjU0MmU0OTQwOWZF7gJQX1pONGNvcmUzcHRyNDZkcm9wX2luX3BsYWNlJExUJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRHVCQkR1QkMTdoZjc1YmE3NjQxNzE1NDk4N0XvAmlfWk40Y29yZTNwdHI3MWRyb3BfaW5fcGxhY2UkTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLkZvcm1hdFN0cmluZ1BheWxvYWQkR1QkMTdoMzc3YmRiYTM3ZGEzZTZiNEXwAjVfWk40Y29yZTVlcnJvcjVFcnJvcjExZGVzY3JpcHRpb24xN2hmODE5YjViMzRlZmY0ZGI3RfECLl9aTjRjb3JlNWVycm9yNUVycm9yNWNhdXNlMTdoYjA4Y2IzNDhjNzMxMTY0ZEXyAjBfWk40Y29yZTVlcnJvcjVFcnJvcjdwcm92aWRlMTdoZDYwYzBkYmM0MWFiYmFhMEXzAjBfWk40Y29yZTVlcnJvcjVFcnJvcjd0eXBlX2lkMTdoOGQ5MzMwMjFkYmVjMzYzOUX0AjdfWk40Y29yZTVwYW5pYzEyUGFuaWNQYXlsb2FkNmFzX3N0cjE3aDk4ODk0MTJjMmU0ZThlNjBF9QJfX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkMTB3cml0ZV9jaGFyMTdoMDA1MWU2YWY3YTc1MWVmOEX2Al1fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoMDg4ZDI5NzI0MTk5ZGEzYkX3AmVfWk42MF8kTFQkc3RkLi5pby4uc3RkaW8uLlN0ZGVyclJhdyR1MjAkYXMkdTIwJHN0ZC4uaW8uLldyaXRlJEdUJDE0d3JpdGVfdmVjdG9yZWQxN2hmZWE4MDY1Njk1NzBkY2EyRfgCYV9aTjY2XyRMVCRzdGQuLnN5cy4uc3RkaW8uLndhc2lwMi4uU3RkZXJyJHUyMCRhcyR1MjAkc3RkLi5pby4uV3JpdGUkR1QkNXdyaXRlMTdoOWMxZjBjNWE5MDcwNjFhYkX5AmFfWk42Nl8kTFQkc3RkLi5zeXMuLnN0ZGlvLi53YXNpcDIuLlN0ZGVyciR1MjAkYXMkdTIwJHN0ZC4uaW8uLldyaXRlJEdUJDVmbHVzaDE3aDVjODY0NDcyNzExYzI0NjdF+gJ0X1pOODFfJExUJHN0ZC4uaW8uLmRlZmF1bHRfd3JpdGVfZm10Li5BZGFwdGVyJExUJFQkR1QkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoYTE5ODVkZjFkYThlNjljMkX7AnRfWk44MV8kTFQkc3RkLi5pby4uZGVmYXVsdF93cml0ZV9mbXQuLkFkYXB0ZXIkTFQkVCRHVCQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2hiZGFkOGQ0YjY5MTVhYTUyRfwCdF9aTjgxXyRMVCRzdGQuLmlvLi5kZWZhdWx0X3dyaXRlX2ZtdC4uQWRhcHRlciRMVCRUJEdUJCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aGNkY2MxOWQ2ZDgwNzA1N2RF/QJzX1pOODZfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5TdGF0aWNTdHJQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hlODhlZTYzM2JiNzc4MzMxRf4Cdl9aTjg5XyRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uRm9ybWF0U3RyaW5nUGF5bG9hZCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZWNjNWUzMzVjNGU2NWQ4OUX/AnpfWk45M18kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLlN0YXRpY1N0clBheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5wYW5pYy4uUGFuaWNQYXlsb2FkJEdUJDNnZXQxN2gzMTJlMjU2ODFiZGE4NmJmRYADfV9aTjkzXyRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uU3RhdGljU3RyUGF5bG9hZCR1MjAkYXMkdTIwJGNvcmUuLnBhbmljLi5QYW5pY1BheWxvYWQkR1QkNmFzX3N0cjE3aDUzODdmMTIyMDBiNWY4MzhFgQN/X1pOOTNfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5TdGF0aWNTdHJQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4ucGFuaWMuLlBhbmljUGF5bG9hZCRHVCQ4dGFrZV9ib3gxN2hhNWIwNjJiYjM5MTVhOWUxRYIDfV9aTjk2XyRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uRm9ybWF0U3RyaW5nUGF5bG9hZCR1MjAkYXMkdTIwJGNvcmUuLnBhbmljLi5QYW5pY1BheWxvYWQkR1QkM2dldDE3aDkzNDQ1OWE5NzBiZjU4MjNFgwOCAV9aTjk2XyRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uRm9ybWF0U3RyaW5nUGF5bG9hZCR1MjAkYXMkdTIwJGNvcmUuLnBhbmljLi5QYW5pY1BheWxvYWQkR1QkOHRha2VfYm94MTdoYmZhNTgxZmQ1MzY2YTIwOEWEAwxjYWJpX3JlYWxsb2OFA0xfWk40d2FzaTVwcm94eTQwX19saW5rX2N1c3RvbV9zZWN0aW9uX2Rlc2NyaWJpbmdfaW1wb3J0czE3aGQxNzVjYWNmMzI5OTZkZGRFhgNJX1pONHdhc2k3aW1wb3J0czR3YXNpMmlvNWVycm9yNUVycm9yMTV0b19kZWJ1Z19zdHJpbmcxN2hiZjk5MzJlYjY1ZjQ4YjZkRYcDXF9aTjR3YXNpN2ltcG9ydHM0d2FzaTJpbzdzdHJlYW1zMTJPdXRwdXRTdHJlYW0yNGJsb2NraW5nX3dyaXRlX2FuZF9mbHVzaDE3aDA3M2U2OTZkNTM2MjhhNzhFiANAX1pONHdhc2k3aW1wb3J0czR3YXNpM2NsaTZzdGRlcnIxMGdldF9zdGRlcnIxN2g5NmY2ZDQ2ODNhMTZjMzMzRYkDBm1hbGxvY4oDCGRsbWFsbG9jiwMNcHJlcGVuZF9hbGxvY4wDBGZyZWWNAwZkbGZyZWWOAwZjYWxsb2OPAwdyZWFsbG9jkAMNZGlzcG9zZV9jaHVua5EDDnBvc2l4X21lbWFsaWdukgMRaW50ZXJuYWxfbWVtYWxpZ26TAwVfRXhpdJQDGV9fd2FzaWxpYmNfZW5zdXJlX2Vudmlyb26VAx1fX3dhc2lsaWJjX2luaXRpYWxpemVfZW52aXJvbpYDBWFib3J0lwMGZ2V0Y3dkmAMEc2Jya5kDJXdhc2lwMl9saXN0X3R1cGxlMl9zdHJpbmdfc3RyaW5nX2ZyZWWaAxtlbnZpcm9ubWVudF9nZXRfZW52aXJvbm1lbnSbAwlleGl0X2V4aXScAwZnZXRlbnadAwZtZW1jbXCeAwtfX3N0cmNocm51bJ8DCF9fc3RwY3B5oAMGc3RyY3B5oQMGc3RyZHVwogMGc3RybGVuowMHc3RybmNtcKQDN19aTjVhbGxvYzVhbGxvYzE4aGFuZGxlX2FsbG9jX2Vycm9yMTdoYWZmZWIyMzYyYWI0NzA2YUWlA5wCX1pOMjU0XyRMVCRhbGxvYy4uYm94ZWQuLmNvbnZlcnQuLiRMVCRpbXBsJHUyMCRjb3JlLi5jb252ZXJ0Li5Gcm9tJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQkdTIwJGZvciR1MjAkYWxsb2MuLmJveGVkLi5Cb3gkTFQkZHluJHUyMCRjb3JlLi5lcnJvci4uRXJyb3IkdTJiJGNvcmUuLm1hcmtlci4uU2VuZCR1MmIkY29yZS4ubWFya2VyLi5TeW5jJEdUJCRHVCQuLmZyb20uLlN0cmluZ0Vycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoYTJjODgyMmIwODA0YTUwYUWmA54CX1pOMjU2XyRMVCRhbGxvYy4uYm94ZWQuLmNvbnZlcnQuLiRMVCRpbXBsJHUyMCRjb3JlLi5jb252ZXJ0Li5Gcm9tJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQkdTIwJGZvciR1MjAkYWxsb2MuLmJveGVkLi5Cb3gkTFQkZHluJHUyMCRjb3JlLi5lcnJvci4uRXJyb3IkdTJiJGNvcmUuLm1hcmtlci4uU2VuZCR1MmIkY29yZS4ubWFya2VyLi5TeW5jJEdUJCRHVCQuLmZyb20uLlN0cmluZ0Vycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hlZDcwMmE4MjZlZDY2MTk0RacDMF9aTjRjb3JlM2ZtdDVXcml0ZTl3cml0ZV9mbXQxN2hlYzQwMTIzZWE2MDU2ZTkwRagDTF9aTjRjb3JlM3B0cjQyZHJvcF9pbl9wbGFjZSRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckR1QkMTdoMDRiNzVkZjk5YzYwZjVhM0WpA1JfWk41M18kTFQkY29yZS4uZm10Li5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDFiNjU1MzZjZDMzYTFlMWNFqgNfX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkMTB3cml0ZV9jaGFyMTdoMDA1MWU2YWY3YTc1MWVmOEWrA1pfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQ3cmVzZXJ2ZTIxZG9fcmVzZXJ2ZV9hbmRfaGFuZGxlMTdoNmU3YWYxNzRiYWRhOGVlM0WsA11fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoMDg4ZDI5NzI0MTk5ZGEzYkWtAzxfWk41YWxsb2M2c3RyaW5nNlN0cmluZzE1ZnJvbV91dGY4X2xvc3N5MTdoODAzMGRhZGFiNzFiZmVhMkWuAzNfWk41YWxsb2M3cmF3X3ZlYzEyaGFuZGxlX2Vycm9yMTdoYzMxMDMyMGFlMDU2OGRiMUWvA0RfWk41YWxsb2MzZmZpNWNfc3RyN0NTdHJpbmcxOV9mcm9tX3ZlY191bmNoZWNrZWQxN2g1Yjk5M2MyYjFjOTkwMTE5RbADSF9aTjVhbGxvYzdyYXdfdmVjMjBSYXdWZWNJbm5lciRMVCRBJEdUJDExZmluaXNoX2dyb3cxN2hlNDkyZGQ3MDNhMTQ1YTVmRbEDNl9aTjVhbGxvYzNmbXQ2Zm9ybWF0MTJmb3JtYXRfaW5uZXIxN2g0NzljZmI1Njk3ZjFmYzc4RbIDOF9aTjVhbGxvYzdyYXdfdmVjMTdjYXBhY2l0eV9vdmVyZmxvdzE3aDQ2Nzk5ZWFjZjE1Y2ZmODNFswNDX1pONWFsbG9jN3Jhd192ZWMxOVJhd1ZlYyRMVCRUJEMkQSRHVCQ4Z3Jvd19vbmUxN2hmZDE3ZmJhZTVmNTQ2OGJkRbQDW19aTjYwXyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5jbG9uZS4uQ2xvbmUkR1QkNWNsb25lMTdoMTlkZjZiODRkYzRmM2ExNEW1A2BfWk42N18kTFQkYWxsb2MuLnN0cmluZy4uRnJvbVV0ZjhFcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoOWFhZGI2ZjAwNGQ2NTVjYkW2A3lfWk44MV8kTFQkJFJGJCR1NWIkdTgkdTVkJCR1MjAkYXMkdTIwJGFsbG9jLi5mZmkuLmNfc3RyLi5DU3RyaW5nLi5uZXcuLlNwZWNOZXdJbXBsJEdUJDEzc3BlY19uZXdfaW1wbDE3aGQyMDI4NWNhMmNhYWM4YTNFtwNGX1pONDFfJExUJGNoYXIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gwZjgxNTRlYjI0ZTM4Yjc0RbgDJl9aTjRjb3JlM2ZtdDV3cml0ZTE3aGRmYjAxY2EyMGIzZjE0YTBFuQNFX1pONDBfJExUJHN0ciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDk2ZjZmMmI4MWFlMzk3MGNFugNTX1pONGNvcmU0Y2hhcjdtZXRob2RzMjJfJExUJGltcGwkdTIwJGNoYXIkR1QkMTZlc2NhcGVfZGVidWdfZXh0MTdoOGZkMTRiYzQ4M2Q4NjZiZEW7AzJfWk40Y29yZTNzdHIxNnNsaWNlX2Vycm9yX2ZhaWwxN2g1MzhlYmNhOWQwMjQ1MmUyRbwDR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDQyZjQwN2I0MzU1Y2I5MTBFvQNcX1pONGNvcmUzZm10M251bTUwXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRlYnVnJHUyMCRmb3IkdTIwJHUzMiRHVCQzZm10MTdoM2Q1ZGQ2NjUxMjIwYzRjOEW+A0dfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hhMzEwZTQ5YjE3ZjQyMDYzRb8DXF9aTjRjb3JlM2ZtdDNudW01MF8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EZWJ1ZyR1MjAkZm9yJHUyMCR1NjQkR1QkM2ZtdDE3aDIxN2Y1YjdiMjRkMjBlMmVFwANHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoZTc2YmEzYThkMzdiZGQ3NEXBA0dfWk40Ml8kTFQkc3RyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2gxMzU3NzRiY2M2NzNmMDhjRcIDLl9aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIzcGFkMTdoMzY5YjAyYzE0NzlhYTY1ZEXDA0hfWk40M18kTFQkYm9vbCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoOThhY2VmZWJlYjA4MTViZEXEA0hfWk40M18kTFQkY2hhciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNWFkYjc5YmJlMjYxNzM4MUXFA0lfWk40NF8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDBmNjI5YWQ2MTFiNzdkMDlFxgNLX1pONGNvcmUzZm10M251bTNpbXAyMV8kTFQkaW1wbCR1MjAkdTMyJEdUJDEwX2ZtdF9pbm5lcjE3aDc4ZWM2YzA1OTI0NWVjYzJFxwM4X1pONGNvcmUzZm10OUZvcm1hdHRlcjEycGFkX2ludGVncmFsMTdoYjczOWEyOTA2NmQxOTIxOEXIAzBfWk40Y29yZTlwYW5pY2tpbmc5cGFuaWNfZm10MTdoZmU4YmY3ZjkzZTkyNWYxYkXJA0xfWk40Y29yZTlwYW5pY2tpbmcxMXBhbmljX2NvbnN0MjNwYW5pY19jb25zdF9kaXZfYnlfemVybzE3aGE0OTRlYzRkN2Y5NDhhMjNFygNAX1pONGNvcmUzZmZpNWNfc3RyNENTdHIxOWZyb21fYnl0ZXNfd2l0aF9udWwxN2g0ZjA0N2U2NmMzZDIyYWY2RcsDM19aTjRjb3JlM3N0cjhjb252ZXJ0czlmcm9tX3V0ZjgxN2hmZjQxMDQxMDBiMjcwOWM1RcwDOl9aTjRjb3JlOXBhbmlja2luZzE4cGFuaWNfYm91bmRzX2NoZWNrMTdoNjFlZDc1YmZkYjJiZjM5YkXNA0tfWk40Y29yZTNmbXQzbnVtM2ltcDIxXyRMVCRpbXBsJHUyMCR1NjQkR1QkMTBfZm10X2lubmVyMTdoMDdhY2Q0MjY2NzJmMWQxZEXOA2FfWk40Y29yZTNmbXQzbnVtM2ltcDUxXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTgkR1QkM2ZtdDE3aDMzYjM1MmQ3NGNmNDdhMDdFzwNiX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJGk2NCRHVCQzZm10MTdoNjM5Yjc4MWY0M2RhYmJhNkXQA2JfWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTE2JEdUJDNmbXQxN2gwZDE2ODRiMDU5ZTYyMDJhRdEDYl9aTjRjb3JlM2ZtdDNudW0zaW1wNTJfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCR1MzIkR1QkM2ZtdDE3aDFjNzI4NGRmMGMwMzNlOGNF0gNiX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHU2NCRHVCQzZm10MTdoYThmZDgzY2QzNTA5MWE0NUXTAz9fWk40Y29yZTNmbXQ5Rm9ybWF0dGVyMTlwYWRfZm9ybWF0dGVkX3BhcnRzMTdoOGFjZTZiODg2ZjhkODlkMkXUA15fWk40Y29yZTNmbXQzbnVtNTJfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uTG93ZXJIZXgkdTIwJGZvciR1MjAkdTgkR1QkM2ZtdDE3aGQwNGU3MDQxYjY4MmVlYmZF1QNeX1pONGNvcmUzZm10M251bTUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLlVwcGVySGV4JHUyMCRmb3IkdTIwJHU4JEdUJDNmbXQxN2gwZDFlMDU2MzI5ODM1MWVhRdYDX19aTjRjb3JlM2ZtdDNudW01M18kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5Mb3dlckhleCR1MjAkZm9yJHUyMCR1MzIkR1QkM2ZtdDE3aGM4YzRjYjFhMjdhZjlhM2VF1wNfX1pONGNvcmUzZm10M251bTUzXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLlVwcGVySGV4JHUyMCRmb3IkdTIwJHUzMiRHVCQzZm10MTdoMWQwZDA4Y2ZkNjFmNTliNEXYAzpfWk40Y29yZTVzbGljZTVpbmRleDE2c2xpY2VfaW5kZXhfZmFpbDE3aDRjMTkyNDMyMDVkZjkzNzhF2QMwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aGRiYTEwZmM0MmZkYjliYTBF2gMsX1pONGNvcmU5cGFuaWNraW5nNXBhbmljMTdoNjA5NzE3MTg0NTMyMTU1YUXbA0lfWk40Y29yZTNudW03Zmx0MmRlYzhzdHJhdGVneTVncmlzdTE2Zm9ybWF0X2V4YWN0X29wdDE3aGU3ZGVhMDVmNzBkM2Q5ODNF3ANGX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k2ZHJhZ29uMTJmb3JtYXRfZXhhY3QxN2hmNGZhMTk3MmJmMzIwOGFhRd0DO19aTjRjb3JlM251bTdmbHQyZGVjMTdkaWdpdHNfdG9fZGVjX3N0cjE3aDhhN2UxY2Q3MjQ3NjBlN2NF3gNFX1pONGNvcmUzZm10NWZsb2F0MjlmbG9hdF90b19kZWNpbWFsX2NvbW1vbl9leGFjdDE3aDdmNDYyNTU2MGI4YWVjOTZF3wNMX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k1Z3Jpc3UxOWZvcm1hdF9zaG9ydGVzdF9vcHQxN2g4YjRjNDUyZmJkYTgyMjg0ReADSV9aTjRjb3JlM251bTdmbHQyZGVjOHN0cmF0ZWd5NmRyYWdvbjE1Zm9ybWF0X3Nob3J0ZXN0MTdoOWZmZGQ1YjBkMzcxMDYzOUXhA0hfWk40Y29yZTNmbXQ1ZmxvYXQzMmZsb2F0X3RvX2RlY2ltYWxfY29tbW9uX3Nob3J0ZXN0MTdoZTFiYWU0NmNmYjkzNzE0OUXiA2BfWk40Y29yZTNmbXQ1ZmxvYXQ1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJGY2NCRHVCQzZm10MTdoYzk3ZDA3YTA4YjJhYmVhNkXjA2dfWk42OF8kTFQkY29yZS4uZm10Li5idWlsZGVycy4uUGFkQWRhcHRlciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aGVlNGE3YWVjZDBkYjA2OTlF5AM7X1pONGNvcmUzZm10OGJ1aWxkZXJzMTBEZWJ1Z1R1cGxlNWZpZWxkMTdoNTgwZGM0ODY0ZDc4OTk2YUXlAzxfWk40Y29yZTNmbXQ4YnVpbGRlcnMxMERlYnVnVHVwbGU2ZmluaXNoMTdoMzg4NzEzMjc5Y2Y4ZDJhOEXmAzxfWk40Y29yZTNmbXQ4YnVpbGRlcnMxMURlYnVnU3RydWN0NWZpZWxkMTdoZTE2ZmM3OTdiNzE5ZDc1MkXnAzdfWk40Y29yZTNmbXQ5Rm9ybWF0dGVyMTFkZWJ1Z190dXBsZTE3aDQwNWM3Yzk5OGExOTgxOGVF6ANGX1pONGNvcmUzZm10OUZvcm1hdHRlcjEycGFkX2ludGVncmFsMTJ3cml0ZV9wcmVmaXgxN2gzMDE0YzIyMWRiMmM2OWI5RekDNl9aTjRjb3JlM3N0cjVjb3VudDE0ZG9fY291bnRfY2hhcnMxN2gzOTFlMTlmMjJjMGE4M2M1ReoDQV9aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIyMXdyaXRlX2Zvcm1hdHRlZF9wYXJ0czE3aDYzMjdhNTc4MDJlNDRmODBF6wNFX1pONGNvcmUzZm10OUZvcm1hdHRlcjI1ZGVidWdfdHVwbGVfZmllbGQxX2ZpbmlzaDE3aDliOWM3MzdiNDYzNWU1ZjVF7ANGX1pONGNvcmUzZm10OUZvcm1hdHRlcjI2ZGVidWdfc3RydWN0X2ZpZWxkMV9maW5pc2gxN2gyZDhkMzUxMjg2YTM1MDZlRe0DRl9aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIyNmRlYnVnX3N0cnVjdF9maWVsZDJfZmluaXNoMTdoMTIxOTMxZDhhNDgzNTBlMkXuAzVfWk40Y29yZTlwYW5pY2tpbmcxM2Fzc2VydF9mYWlsZWQxN2g0ODRhMTM0OGRiNDU3OTdlRe8DNF9aTjRjb3JlM2ZtdDlGb3JtYXR0ZXI5d3JpdGVfc3RyMTdoYTQyMzJhYWRkYjU2MTQxM0XwAzxfWk40Y29yZTNudW02YmlnbnVtOEJpZzMyeDQwMTBtdWxfZGlnaXRzMTdoN2FhN2UxNjVhODBhZjkxZEXxAzlfWk40Y29yZTNudW02YmlnbnVtOEJpZzMyeDQwOG11bF9wb3cyMTdoNjVlNjY5OWNlZDM4Y2M4YkXyA1lfWk40Y29yZTNudW03Zmx0MmRlYzhzdHJhdGVneTVncmlzdTE2Zm9ybWF0X2V4YWN0X29wdDE0cG9zc2libHlfcm91bmQxN2g5ZDkxZmE2M2UzM2U0M2Y3RfMDNV9aTjRjb3JlOXBhbmlja2luZzEzYXNzZXJ0X2ZhaWxlZDE3aGQ3YTU3Yzc2ZDI1M2Q3OWNF9ANCX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k2ZHJhZ29uOW11bF9wb3cxMDE3aGE3NmRkYTc1MTIzZDcxNjdF9QM1X1pONGNvcmUzc3RyMTlzbGljZV9lcnJvcl9mYWlsX3J0MTdoMzQwYWY1N2MyZGJkMzlmM0X2AzJfWk40Y29yZTZvcHRpb24xM3Vud3JhcF9mYWlsZWQxN2g2ZmRiMjUzY2QyOWUwMDgwRfcDZF9aTjcxXyRMVCRjb3JlLi5vcHMuLnJhbmdlLi5SYW5nZSRMVCRJZHgkR1QkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoODlkYTAzZDVlOTAxZjExM0X4AzlfWk40Y29yZTNzdHI3cGF0dGVybjExU3RyU2VhcmNoZXIzbmV3MTdoOThlZjJkZTNiNjdmODQwYkX5A1BfWk40Y29yZTd1bmljb2RlMTJ1bmljb2RlX2RhdGExNWdyYXBoZW1lX2V4dGVuZDExbG9va3VwX3Nsb3cxN2hkN2IxNzUzZTk4Y2ZkM2JkRfoDPF9aTjRjb3JlN3VuaWNvZGU5cHJpbnRhYmxlMTJpc19wcmludGFibGUxN2gwYmY1MWZkNmRjZTNlNjMyRfsDRV9aTjRjb3JlNWFsbG9jNmxheW91dDZMYXlvdXQxOWlzX3NpemVfYWxpZ25fdmFsaWQxN2hiYjNkNjJlYzA3NDYwNzNiRfwDS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2gzMTE3NGMyMjE0YzA4ZWI4Rf0DS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2gyYWI0MGZkMzIwOGY5ZjRlRf4DS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2g0OGUwY2ZhOTE3MmFlYzI5Rf8DOV9aTjRjb3JlNXNsaWNlNm1lbWNocjE0bWVtY2hyX2FsaWduZWQxN2gyNmNjMGI1YTI1MDc5NTIyRYAEMl9aTjRjb3JlNnJlc3VsdDEzdW53cmFwX2ZhaWxlZDE3aGNjMjVjNDIwZDJiYzI4YTJFgQQ7X1pONGNvcmU5cGFuaWNraW5nMTlhc3NlcnRfZmFpbGVkX2lubmVyMTdoYjFiN2MwZjliNzU2ODkxZkWCBFhfWk41OV8kTFQkY29yZS4uZm10Li5Bcmd1bWVudHMkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDZiYmNhMGJiNTU4NWE5YzZFgwR1X1pOODdfJExUJGNvcmUuLnN0ci4ubG9zc3kuLlV0ZjhDaHVua3MkdTIwJGFzJHUyMCRjb3JlLi5pdGVyLi50cmFpdHMuLml0ZXJhdG9yLi5JdGVyYXRvciRHVCQ0bmV4dDE3aDg5YzE3MmFjODUzNTFjMDVFhAReX1pONTdfJExUJGNvcmUuLmZtdC4uRm9ybWF0dGVyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2g0NjVkMzMyYTJhODAxZGJiRYUEX19aTjY2XyRMVCRjb3JlLi5zdHIuLmVycm9yLi5VdGY4RXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDU3YTIzMDBmYWFhN2E0ODJFhgRpX1pONjhfJExUJGNvcmUuLmZtdC4uYnVpbGRlcnMuLlBhZEFkYXB0ZXIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aGI3MDEyY2M5YmMwODE1NGJFhwQIX19tdWx0aTMH8h8sAA9fX3N0YWNrX3BvaW50ZXIBH0dPVC5kYXRhLmludGVybmFsLl9fbWVtb3J5X2Jhc2UCPkdPVC5kYXRhLmludGVybmFsLl9aTjEwc2VyZGVfanNvbjJkZTVQT1cxMDE3aDVlNDkwZDE3Y2E3NDMzMjBFA25HT1QuZnVuYy5pbnRlcm5hbC5fWk42M18kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hlODY5MjQzZGQ3ZTMxMjkxRQRuR09ULmZ1bmMuaW50ZXJuYWwuX1pONjNfJExUJGhleC4uZXJyb3IuLkZyb21IZXhFcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoOGEwNzFmYjU3NjAzMDRhZUUFckdPVC5mdW5jLmludGVybmFsLl9aTjY3XyRMVCRlbGxpcHRpY19jdXJ2ZS4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g4ODAwMDVlY2VkMDZkMWRjRQZyR09ULmZ1bmMuaW50ZXJuYWwuX1pONjdfJExUJGNyeXB0b19jb21tb24uLkludmFsaWRMZW5ndGgkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGIxMzY2NmMzYWI3YTc0ZjFFB2FHT1QuZnVuYy5pbnRlcm5hbC5fWk41MF8kTFQkYWVhZC4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDRhOTc5NGE3OTg2NjYxNzFFCHJHT1QuZnVuYy5pbnRlcm5hbC5fWk42N18kTFQkYWxsb2MuLnN0cmluZy4uRnJvbVV0ZjhFcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoOWFhZGI2ZjAwNGQ2NTVjYkUJHkdPVC5kYXRhLmludGVybmFsLl9fdGFibGVfYmFzZQp0R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHUxNiRHVCQzZm10MTdoMGQxNjg0YjA1OWU2MjAyYUULkQFHT1QuZnVuYy5pbnRlcm5hbC5fWk45OF8kTFQkZXhlY3V0b3IuLmhvc3QuLmludGVyZmFjZXMuLmh0dHBfd2l0aF9wbGFjZWhvbGRlcnMuLkh0dHBFcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDg2ZjFkOGE4YmQzMDI4ZTNFDHRHT1QuZnVuYy5pbnRlcm5hbC5fWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTY0JEdUJDNmbXQxN2hhOGZkODNjZDM1MDkxYTQ1RQ2CAUdPVC5mdW5jLmludGVybmFsLl9aTjgzXyRMVCRleGVjdXRvci4uaG9zdC4uaW50ZXJmYWNlcy4uc2lnbmluZy4uU2lnbkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoNmY4ODMzY2NiZGM1NTdhNkUOWkdPVC5kYXRhLmludGVybmFsLl9aTjhleGVjdXRvcjdleHBvcnRzNXN5bm9kNWFnZW50OWNvbnRyYWN0czlfUkVUX0FSRUExN2g5YzEyMWZhM2IyMWI4MWMxRQ92R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1NF8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHVzaXplJEdUJDNmbXQxN2hiNjVkNjljNTc0ZDc2NThlRRBAR09ULmRhdGEuaW50ZXJuYWwuX1pOMTBzZXJkZV9qc29uM3NlcjZFU0NBUEUxN2g3NzczYTFiMWRlOGZmMzdkRRFiR09ULmRhdGEuaW50ZXJuYWwuX1pOMTBzZXJkZV9qc29uM3NlcjlGb3JtYXR0ZXIxN3dyaXRlX2NoYXJfZXNjYXBlMTBIRVhfRElHSVRTMTdoZmQyMWM4MWI5NTAwNWRkN0USc0dPVC5mdW5jLmludGVybmFsLl9aTjRjb3JlM2ZtdDNudW0zaW1wNTFfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCR1OCRHVCQzZm10MTdoMzNiMzUyZDc0Y2Y0N2EwN0UTcEdPVC5mdW5jLmludGVybmFsLl9aTjRjb3JlM2ZtdDNudW01Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5Mb3dlckhleCR1MjAkZm9yJHUyMCR1OCRHVCQzZm10MTdoZDA0ZTcwNDFiNjgyZWViZkUUcUdPVC5mdW5jLmludGVybmFsLl9aTjY2XyRMVCRkZXIuLnRhZy4ubnVtYmVyLi5UYWdOdW1iZXIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDU2NTg5YjI1NDMwYTc3ZDVFFXRHT1QuZnVuYy5pbnRlcm5hbC5fWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTMyJEdUJDNmbXQxN2gxYzcyODRkZjBjMDMzZThjRRZYR09ULmZ1bmMuaW50ZXJuYWwuX1pONDFfJExUJGNoYXIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gwZjgxNTRlYjI0ZTM4Yjc0RRdyR09ULmZ1bmMuaW50ZXJuYWwuX1pONjdfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvckNvZGUkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGVmYTk5ZTNlMWZlNGEzYzRFGHdHT1QuZnVuYy5pbnRlcm5hbC5fWk43Ml8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkpzb25VbmV4cGVjdGVkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g0OWFiNmQ4NDE5NzgzNWQxRRlaR09ULmZ1bmMuaW50ZXJuYWwuX1pONDNfJExUJGJvb2wkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDk4YWNlZmViZWIwODE1YmRFGnRHT1QuZnVuYy5pbnRlcm5hbC5fWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkaTY0JEdUJDNmbXQxN2g2MzliNzgxZjQzZGFiYmE2RRt2R09ULmZ1bmMuaW50ZXJuYWwuX1pONzFfJExUJHNlcmRlX2NvcmUuLmRlLi5XaXRoRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g0ZTgzZjY3YzRlYzAyMTU3RRxaR09ULmZ1bmMuaW50ZXJuYWwuX1pONDNfJExUJGNoYXIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDVhZGI3OWJiZTI2MTczODFFHXJHT1QuZnVuYy5pbnRlcm5hbC5fWk40Y29yZTNmbXQ1ZmxvYXQ1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJGY2NCRHVCQzZm10MTdoYzk3ZDA3YTA4YjJhYmVhNkUeF0dPVC5kYXRhLmludGVybmFsLmVycm5vH5EBR09ULmZ1bmMuaW50ZXJuYWwuX1pOOThfJExUJHN0ZC4uc3lzLi5iYWNrdHJhY2UuLkJhY2t0cmFjZUxvY2suLnByaW50Li5EaXNwbGF5QmFja3RyYWNlJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hkYjg1YTRlZGZmYzAzNzlhRSA4R09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDVhbGxvYzRIT09LMTdoYzczYTIwNTNlNzJiM2IxOEUhTUdPVC5mdW5jLmludGVybmFsLl9aTjNzdGQ1YWxsb2MyNGRlZmF1bHRfYWxsb2NfZXJyb3JfaG9vazE3aGVhNWNkZTFkNDNmZDA0MzJFIo0BR09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDRzeW5jNG1wbWM1d2FrZXIxN2N1cnJlbnRfdGhyZWFkX2lkNURVTU1ZMjhfJHU3YiQkdTdiJGNsb3N1cmUkdTdkJCR1N2QkMjNfX1JVU1RfU1REX0lOVEVSTkFMX1ZBTDE3aDU1MmE0YThmNzFlMTliYjBFI0JHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkNnRocmVhZDdjdXJyZW50MmlkMklEMTdoYTc4YTJmODJlZWI2MTQ3M0UkPEdPVC5kYXRhLmludGVybmFsLl9aTjNzdGQ5cGFuaWNraW5nNEhPT0sxN2g3OTc4YmRhMWZlNjRjM2NiRSVYR09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDlwYW5pY2tpbmcxMXBhbmljX2NvdW50MThHTE9CQUxfUEFOSUNfQ09VTlQxN2gzZTA1ZWJlOWQ4NTc1NzU2RSZER09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDZ0aHJlYWQ3Y3VycmVudDdDVVJSRU5UMTdoNDljZjE0YTg5ZGI2YjkyMkUnHUdPVC5kYXRhLmludGVybmFsLl9faGVhcF9iYXNlKBxHT1QuZGF0YS5pbnRlcm5hbC5fX2hlYXBfZW5kKSRHT1QuZGF0YS5pbnRlcm5hbC5fX3dhc2lsaWJjX2Vudmlyb24qV0dPVC5kYXRhLmludGVybmFsLl9aTjRjb3JlM251bTdmbHQyZGVjOHN0cmF0ZWd5NWdyaXN1MTJDQUNIRURfUE9XMTAxN2g4MDJkNzMzMTA5YjQ3OTg2RStqR09ULmZ1bmMuaW50ZXJuYWwuX1pONTlfJExUJGNvcmUuLmZtdC4uQXJndW1lbnRzJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g2YmJjYTBiYjU1ODVhOWM2RQkRAgAHLnJvZGF0YQEFLmRhdGEA+gEJcHJvZHVjZXJzAghsYW5ndWFnZQIEUnVzdAADQzExAAxwcm9jZXNzZWQtYnkFBXJ1c3RjHTEuOTMuMCAoMjU0YjU5NjA3IDIwMjYtMDEtMTkpBWNsYW5nXzIxLjEuNC13YXNpLXNkayAoaHR0cHM6Ly9naXRodWIuY29tL2xsdm0vbGx2bS1wcm9qZWN0IDIyMmZjMTFmMmI4ZjI1ZjZhMGY0OTc2MjcyZWYxYmI3YmY0OTUyMWQpDXdpdC1jb21wb25lbnQGMC4yMC4xEHdpdC1iaW5kZ2VuLXJ1c3QGMC40NS4wDXdpdC1iaW5kZ2VuLWMGMC4xNy4wAKQBD3RhcmdldF9mZWF0dXJlcwkrC2J1bGstbWVtb3J5Kw9idWxrLW1lbW9yeS1vcHQrFmNhbGwtaW5kaXJlY3Qtb3ZlcmxvbmcrDmV4dGVuZGVkLWNvbnN0KwptdWx0aXZhbHVlKw9tdXRhYmxlLWdsb2JhbHMrE25vbnRyYXBwaW5nLWZwdG9pbnQrD3JlZmVyZW5jZS10eXBlcysIc2lnbi1leHQ');
    const module1 = base64Compile('AGFzbQEAAAABJAVgA39/fwBgAX8AYAp/f39/f39/f39/AGACf38AYAR/f39/AAMKCQAAAQECAAMEAQQFAXABCQkHMAoBMAAAATEAAQEyAAIBMwADATQABAE1AAUBNgAGATcABwE4AAgIJGltcG9ydHMBAAqBAQkNACAAIAEgAkEAEQAACw0AIAAgASACQQERAAALCQAgAEECEQEACwkAIABBAxEBAAsbACAAIAEgAiADIAQgBSAGIAcgCCAJQQQRAgALDQAgACABIAJBBREAAAsLACAAIAFBBhEDAAsPACAAIAEgAiADQQcRBAALCQAgAEEIEQEACwAvCXByb2R1Y2VycwEMcHJvY2Vzc2VkLWJ5AQ13aXQtY29tcG9uZW50BzAuMjQxLjI');
    const module2 = base64Compile('AGFzbQEAAAABJAVgA39/fwBgAX8AYAp/f39/f39/f39/AGACf38AYAR/f39/AAI9CgABMAAAAAExAAAAATIAAQABMwABAAE0AAIAATUAAAABNgADAAE3AAQAATgAAQAIJGltcG9ydHMBcAEJCQkPAQBBAAsJAAECAwQFBgcIAC8JcHJvZHVjZXJzAQxwcm9jZXNzZWQtYnkBDXdpdC1jb21wb25lbnQHMC4yNDEuMg');
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'host:interfaces/clock@2.1.0': {
        'now-ms': exports0['2'],
      },
      'host:interfaces/http-with-placeholders@2.1.0': {
        call: exports0['4'],
      },
      'host:interfaces/logging@2.1.0': {
        error: exports0['1'],
        info: exports0['0'],
      },
      'host:interfaces/signing@2.1.0': {
        sign: exports0['5'],
      },
      'host:tenant/tenant-context@1.0.0': {
        'tenant-did': exports0['3'],
      },
      'wasi:cli/environment@0.2.0': {
        'get-environment': exports0['8'],
      },
      'wasi:cli/exit@0.2.0': {
        exit: trampoline3,
      },
      'wasi:cli/stderr@0.2.4': {
        'get-stderr': trampoline2,
      },
      'wasi:io/error@0.2.4': {
        '[method]error.to-debug-string': exports0['6'],
        '[resource-drop]error': trampoline0,
      },
      'wasi:io/streams@0.2.4': {
        '[method]output-stream.blocking-write-and-flush': exports0['7'],
        '[resource-drop]output-stream': trampoline1,
      },
    }));
    memory0 = exports1.memory;
    realloc0 = exports1.cabi_realloc;
    
    try {
      realloc0Async = WebAssembly.promising(exports1.cabi_realloc);
    } catch(err) {
      realloc0Async = exports1.cabi_realloc;
    }
    
    ({ exports: exports2 } = yield instantiateCore(yield module2, {
      '': {
        $imports: exports0.$imports,
        '0': trampoline4,
        '1': trampoline5,
        '2': trampoline6,
        '3': trampoline7,
        '4': trampoline8,
        '5': trampoline9,
        '6': trampoline10,
        '7': trampoline11,
        '8': trampoline12,
      },
    }));
    postReturn0 = exports1['cabi_post_synod:agent/contracts@1.0.0#compose-action'];
    
    try {
      postReturn0Async = WebAssembly.promising(exports1['cabi_post_synod:agent/contracts@1.0.0#compose-action']);
    } catch(err) {
      postReturn0Async = exports1['cabi_post_synod:agent/contracts@1.0.0#compose-action'];
    }
    
    contracts100ComposeAction = exports1['synod:agent/contracts@1.0.0#compose-action'];
    contracts100GetTrace = exports1['synod:agent/contracts@1.0.0#get-trace'];
    contracts100Evaluate = exports1['synod:agent/contracts@1.0.0#evaluate'];
    contracts100Execute = exports1['synod:agent/contracts@1.0.0#execute'];
  })();
  let promise, resolve, reject;
  function runNext (value) {
    try {
      let done;
      do {
        ({ value, done } = gen.next(value));
      } while (!(value instanceof Promise) && !done);
      if (done) {
        if (resolve) resolve(value);
        else return value;
      }
      if (!promise) promise = new Promise((_resolve, _reject) => (resolve = _resolve, reject = _reject));
      value.then(runNext, reject);
    }
    catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }
  const maybeSyncReturn = runNext(null);
  return promise || maybeSyncReturn;
})();

await $init;
const contracts100 = {
  composeAction: composeAction,
  evaluate: evaluate,
  execute: execute,
  getTrace: getTrace,
  
};

export { contracts100 as contracts, contracts100 as 'synod:agent/contracts@1.0.0',  }