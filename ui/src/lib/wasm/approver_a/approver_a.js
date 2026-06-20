"use components";
import { info } from '../../wasm-env.js';
import { environment, exit as exit$1, stderr } from '@bytecodealliance/preview2-shim/cli';
import { error, streams } from '@bytecodealliance/preview2-shim/io';
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

const { Error: Error$1 } = error;

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

const handleTable0 = [T_FLAG, 0];
handleTable0._createdReps = new Set();


const captureTable0= new Map();
let captureCnt0= 0;

HANDLE_TABLES[0] = handleTable0;

const _trampoline5 = function(arg0, arg1) {
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
_trampoline5.fnName = 'wasi:io/error@0.2.6#toDebugString';

const _trampoline6 = function(arg0, arg1, arg2, arg3) {
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
_trampoline6.fnName = 'wasi:io/streams@0.2.6#blockingWriteAndFlush';

const _trampoline7 = function(arg0) {
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
_trampoline7.fnName = 'wasi:cli/environment@0.2.6#getEnvironment';
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
  importFn: _trampoline5,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 5,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline5.manuallyAsync,
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
  importFn: _trampoline6,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 6,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline6.manuallyAsync,
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
  importFn: _trampoline7,
},
);

const $init = (() => {
  let gen = (function* _initGenerator () {
    const module0 = base64Compile('AGFzbQEAAAABjwEUYAF/AGAEf39/fwBgA39/fwF/YAJ/fwBgAn9/AX9gA39/fwBgAAF/YAAAYAZ/f39/f38AYAV/f39/fwBgBH9/f38Bf2AJf39/f39/f39/AX9gAn5/AX9gAnx/AX9gAX8Bf2AGf39/f39/AX9gA35/fwF/YAV/f39/fwF/YAh/f39/f39/fwBgBX9+fn5+AALsAggdaG9zdDppbnRlcmZhY2VzL2xvZ2dpbmdAMi4xLjAEaW5mbwAFE3dhc2k6aW8vZXJyb3JAMC4yLjQUW3Jlc291cmNlLWRyb3BdZXJyb3IAABV3YXNpOmlvL3N0cmVhbXNAMC4yLjQcW3Jlc291cmNlLWRyb3Bdb3V0cHV0LXN0cmVhbQAAE3dhc2k6aW8vZXJyb3JAMC4yLjQdW21ldGhvZF1lcnJvci50by1kZWJ1Zy1zdHJpbmcAAxV3YXNpOmlvL3N0cmVhbXNAMC4yLjQuW21ldGhvZF1vdXRwdXQtc3RyZWFtLmJsb2NraW5nLXdyaXRlLWFuZC1mbHVzaAABFXdhc2k6Y2xpL3N0ZGVyckAwLjIuNApnZXQtc3RkZXJyAAYad2FzaTpjbGkvZW52aXJvbm1lbnRAMC4yLjAPZ2V0LWVudmlyb25tZW50AAATd2FzaTpjbGkvZXhpdEAwLjIuMARleGl0AAAD0gHQAQcIBAkEAgoICwsLCwAAAAAAAQcCAAQEAgMDAAsLCwsEBAUKBgcEBAQMDQcEAwEDAAcEBwUKAAADAwMDBAkIBQ4BAQEBAQ4BAwEBAAgHAAUFBwEEAAAABg4DBgMECQ4ABQUEBAQEBAICAgIAAAAAAAMDBQMDBAIBAQMCAgIEBAMDAwMDCgcDAQYODgIAAAQEAwIEAAcHBwQOAAAADgIEBAQODgIDBAQDAwEHBQQKAgUJBAQCAgQEAg8FBQUQBAQBBREEAgkABA4OBQUFAQkSBBMEBQFwAUdHBQMBABEGpQEYfwFBgIDAAAt/AEEAC38AQZWVwAALfwBBlZfAAAt/AEGAnMEAC38AQQcLfwBBCAt/AEEHC38AQcSgwQALfwBBCQt/AEGYnMEAC38AQQoLfwBBkPzAAAt/AEEBC38AQbCcwQALfwBBDgt/AEHInMEAC38AQcScwQALfwBBuJzBAAt/AEHQoMEAC38AQYCAxAALfwBBjJvBAAt/AEHEAAt/AEHGAAsHhgMKBm1lbW9yeQIANGNhYmlfcG9zdF9zeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjY29tcG9zZS1hY3Rpb24AIipzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjY29tcG9zZS1hY3Rpb24AIyRzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZXZhbHVhdGUAJCNzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZXhlY3V0ZQAlJXN5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNnZXQtdHJhY2UAJi5jYWJpX3Bvc3Rfc3lub2Q6YWdlbnQvY29udHJhY3RzQDEuMC4wI2V2YWx1YXRlACItY2FiaV9wb3N0X3N5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNleGVjdXRlACIvY2FiaV9wb3N0X3N5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNnZXQtdHJhY2UAIgxjYWJpX3JlYWxsb2MAiwEJYgEAQQELRhocHx4bHcQBLVpgNUNjxQFpiwFyggFtb4EBbG6DAWtxN39+R4ABSUh1UExNT1FOS3R9fHB2hQGKAYkBe4QBiAGGAYcBanOtAawBeHp3eUFCjAG9Ac0BswG5AdYBCrXiA9ABAgALph0FCn8BfgR/AX4HfyOAgICAAEGgAWsiBiSAgICAAAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCABKAIAIgcvAZIDIghBC0kNAEEFIQlBBCEKIAEoAggiC0EFSQ0BQQAhDCALIQogC0F7ag4CAQMCCyAHQYwCaiIJIAEoAggiC0EMbGohDQJAAkAgC0EBaiIKIAhNDQAgDSACKQIANwIAIA1BCGogAkEIaigCADYCAAwBCwJAIAggC2siDkEMbCIMRQ0AIAkgCkEMbGogDSAM/AoAAAsgDUEIaiACQQhqKAIANgIAIA0gAikCADcCACAOQRhsIg1FDQAgByAKQRhsaiAHIAtBGGxqIA38CgAACyAHIAtBGGxqIg1BEGogA0EQaikDADcDACANIAMpAwA3AwAgDUEIaiADQQhqKQMANwMAIAcgCEEBajsBkgMgASgCBCEPDA8LIAEoAgQhCBCsgICAAEGYA0EIEKiAgIAAIg1FDQMgDUEANgKIAiANIAcvAZIDIApBf3NqIgk7AZIDIAlBDE8NBCAHIApBDGxqIgFBjAJqKAIAIQ4gAUGQAmopAgAhEAJAIAlBDGwiDEUNACANQYwCaiABQZgCaiAM/AoAAAsgByAKQRhsaiEBAkAgCUEYbCIJRQ0AIA0gAUEYaiAJ/AoAAAsgByAKOwGSAyAGQewAakEMaiABQQhqKQIANwIAIAZBgAFqIAFBEGopAgA3AgAgBiABKQIANwJwIAchESAIIQ8MAgsgC0F5aiEMQQYhCQsgASgCBCEIEKyAgIAAQZgDQQgQqICAgAAiDUUNAyANQQA2AogCIA0gBy8BkgMgCUF/c2oiCjsBkgMgCkEMTw0EIAcgCUEMbGoiAUGMAmooAgAhDiABQZACaikCACEQAkAgCkEMbCILRQ0AIA1BjAJqIAFBmAJqIAv8CgAACyAHIAlBGGxqIQECQCAKQRhsIgpFDQAgDSABQRhqIAr8CgAACyAHIAk7AZIDIAZB7ABqQQxqIAFBCGopAgA3AgAgBkGAAWogAUEQaikCADcCACAGIAEpAgA3AnAgDS8BkgMhCkEAIQ8gDSERIAwhCwsgEUGMAmogC0EMbGohAQJAAkAgCkH//wNxIgkgC0sNACABIAIpAgA3AgAgAUEIaiACQQhqKAIANgIADAELAkAgCSALayIJQQxsIgxFDQAgAUEMaiABIAz8CgAACyABQQhqIAJBCGooAgA2AgAgASACKQIANwIAIAlBGGwiAUUNACARIAtBGGxqIgJBGGogAiAB/AoAAAsgESALQRhsaiIBQRBqIANBEGopAwA3AwAgASADKQMANwMAIAZB0ABqQQhqIgIgBkHsAGpBCGopAgA3AwAgBkHQAGpBEGoiCSAGQewAakEQaikCADcDACAGQdAAakEYaiIMIAZB7ABqQRhqKAIANgIAIAFBCGogA0EIaikDADcDACARIApBAWo7AZIDIAYgBikCbDcDUAJAIA5BgICAgHhHDQAgESEHDAwLIAZBIGpBGGogDCgCADYCACAGQSBqQRBqIAkpAwA3AwAgBkEgakEIaiACKQMANwMAIAYgBikDUDcDIAJAIAcoAogCIgENAEEAIQwMCwsgBkHsAGpBBGohEiAGQSBqQQRyIRNBACEMIA0hFCAQIRUgDiEWA0AgASECIAwgCEcNBSAHLwGQAyEHAkACQAJAIAIvAZIDIgxBC0kNACAGQcgAaiEXIAdBBU8NASAHIQpBBCEHDAILIAJBjAJqIgogB0EMbGohCCAHQQFqIQEgDEEBaiENAkACQCAHIAxJDQAgCCAVNwIEIAggFjYCACACIAdBGGxqIgggEykCADcCACAIQRBqIBNBEGopAgA3AgAgCEEIaiATQQhqKQIANwIADAELAkAgDCAHayIDQQxsIglFDQAgCiABQQxsaiAIIAn8CgAACyAIIBU3AgQgCCAWNgIAIAIgB0EYbGohCAJAIANBGGwiCkUNACACIAFBGGxqIAggCvwKAAALIAhBEGogE0EQaikCADcCACAIQQhqIBNBCGopAgA3AgAgCCATKQIANwIAIANBAnQiCEUNACACQZgDaiIDIAdBAnRqQQhqIAMgAUECdGogCPwKAAALIAIgDTsBkgMgAiABQQJ0aiAUNgKYAyABIAxBAmoiA08NDAJAIAwgB2siCkEBakEDcSIIRQ0AIAIgB0ECdGpBnANqIQcDQCAHKAIAIg0gATsBkAMgDSACNgKIAiAHQQRqIQcgAUEBaiEBIAhBf2oiCA0ACwsgCkEDSQ0MIAFBAnQgAmpBpANqIQcDQCAHQXRqKAIAIgggATsBkAMgCCACNgKIAiAHQXhqKAIAIgggAUEBajsBkAMgCCACNgKIAiAHQXxqKAIAIgggAUECajsBkAMgCCACNgKIAiAHKAIAIgggAUEDajsBkAMgCCACNgKIAiAHQRBqIQcgAyABQQRqIgFHDQAMDQsLIAchCgJAAkAgB0F7ag4CAgEACyAHQXlqIQogBkHAAGohF0EGIQcMAQtBACEKIAZBwABqIRdBBSEHCxCsgICAAEHIA0EIEKiAgIAAIg1FDQYgDUEAOwGSAyANQQA2AogCIA0gAi8BkgMgB0F/c2oiATsBkgMgBkGIAWpBCGoiCSACIAdBGGxqIgNBCGopAwA3AwAgBkGIAWpBEGoiGCADQRBqKQMANwMAIAYgAykDADcDiAEgAUEMTw0HIAJBjAJqIhkgB0EMbGoiAykCBCEQIAMoAgAhDiAHQQFqIQMCQCABQQxsIhpFDQAgDUGMAmogGSADQQxsaiAa/AoAAAsCQCABQRhsIgFFDQAgDSACIANBGGxqIAH8CgAACyACIAc7AZIDIBIgBikDiAE3AgAgEkEIaiAJKQMANwIAIBJBEGogGCkDADcCACANLwGSAyIBQQFqIQkgAUEMTw0IIAwgB2sgCUcNCSANQZgDaiEDAkAgCUECdCIJRQ0AIAMgAiAHQQJ0akGcA2ogCfwKAAALIAhBAWohDEEAIQcCQANAIAMgB0ECdGooAgAiCCAHOwGQAyAIIA02AogCIAcgAU8NASAHIAcgAUlqIgcgAU0NAAsLIAZB0ABqQQhqIhggBkHsAGpBCGopAgA3AwAgBkHQAGpBEGoiGSAGQewAakEQaikCADcDACAGQdAAakEYaiIaIAZB7ABqQRhqKAIANgIAIAYgAjYCSCAGIAYpAmw3A1AgBiANNgJAIBcoAgAiCEGMAmoiGyAKQQxsaiEDIApBAWohByAILwGSAyIBQQFqIQkCQAJAIAEgCksNACADIBU3AgQgAyAWNgIAIAggCkEYbGoiAyATKQIANwIAIANBEGogE0EQaikCADcCACADQQhqIBNBCGopAgA3AgAMAQsCQCABIAprIhdBDGwiHEUNACAbIAdBDGxqIAMgHPwKAAALIAMgFTcCBCADIBY2AgAgCCAKQRhsaiEDAkAgF0EYbCIWRQ0AIAggB0EYbGogAyAW/AoAAAsgA0EQaiATQRBqKQIANwIAIANBCGogE0EIaikCADcCACADIBMpAgA3AgAgF0ECdCIDRQ0AIAhBmANqIhcgCkECdGpBCGogFyAHQQJ0aiAD/AoAAAsgCCAJOwGSAyAIIAdBAnRqIBQ2ApgDAkAgByABQQJqIglPDQACQCABIAprIhdBAWpBA3EiA0UNACAIIApBAnRqQZwDaiEBA0AgASgCACIKIAc7AZADIAogCDYCiAIgAUEEaiEBIAdBAWohByADQX9qIgMNAAsLIBdBA0kNACAIIAdBAnRqQaQDaiEBA0AgAUF0aigCACIDIAc7AZADIAMgCDYCiAIgAUF4aigCACIDIAdBAWo7AZADIAMgCDYCiAIgAUF8aigCACIDIAdBAmo7AZADIAMgCDYCiAIgASgCACIDIAdBA2o7AZADIAMgCDYCiAIgAUEQaiEBIAkgB0EEaiIHRw0ACwsgBkEYaiIHIBooAgA2AgAgBkEQaiIBIBkpAwA3AwAgBkEIaiIIIBgpAwA3AwAgBiAGKQNQNwMAIA5BgICAgHhGDQogBkEgakEYaiAHKAIANgIAIAZBIGpBEGogASkDADcDACAGQSBqQQhqIAgpAwA3AwAgBiAGKQMANwMgIA0hFCAMIQggAiEHIBAhFSAOIRYgAigCiAIiAUUNCwwACwtBCEGYAxCrgYCAAAALQQAgCUELI4GAgIAAQfCTwYAAahDGgYCAAAALQQhBmAMQq4GAgAAAC0EAIApBCyOBgICAAEHwk8GAAGoQxoGAgAAACyOBgICAACIHQciOwIAAakE1IAdBkJTBgABqEMeBgIAAAAtBCEHIAxCrgYCAAAALQQAgAUELI4GAgIAAQfCTwYAAahDGgYCAAAALQQAgCUEMI4GAgIAAQYCUwYAAahDGgYCAAAALI4GAgIAAIgdBoI7AgABqQSggB0Hgk8GAAGoQx4GAgAAACyAAIAs2AgggACAPNgIEIAAgETYCAAwCCwJAAkACQAJAIAQoAgAiASgCACIIRQ0AIAEoAgQhAxCsgICAAEHIA0EIEKiAgIAAIgdFDQIgByAINgKYAyAHQQA7AZIDIAdBADYCiAIgA0EBaiIKRQ0DIAhBADsBkAMgCCAHNgKIAiABIAo2AgQgASAHNgIAIAwgA0YNASOBgICAACIHQfCNwIAAakEwIAdBwJPBgABqEMeBgIAAAAsjgYCAgABBsJPBgABqEMyBgIAAAAsgByAQNwOQAiAHIA42AowCIAdBATsBkgMgByAGKQIkNwIAIAcgDTYCnAMgB0EIaiAGQSxqKQIANwIAIAdBEGogBkE0aikCADcCACANQQE7AZADIA0gBzYCiAIgACARNgIAIAAgDzYCBCAAIAs2AggMAwtBCEHIAxCrgYCAAAALI4GAgIAAQdCTwYAAahDMgYCAAAALIAAgCzYCCCAAIA82AgQgACAHNgIACyAGQaABaiSAgICAAAu5AgEFfyABKAIIIQIgASgCBCEDAkAgACgCACIBKAIAIAEoAggiBEcNACABIARBAUEBQQEQi4CAgAAgASgCCCEECyABIARBAWoiBTYCCCABKAIEIARqQdsAOgAAAkACQCACRQ0AIAMgABCMgICAACIGDQEgAkEYbEFoaiEEIANBGGohBQJAA0AgBEUNAQJAIAEoAgAgASgCCCIGRw0AIAEgBkEBQQFBARCLgICAACABKAIIIQYLIAEgBkEBajYCCCABKAIEIAZqQSw6AAAgBEFoaiEEIAUgABCMgICAACEGIAVBGGohBSAGRQ0ADAMLCyABKAIIIQULAkAgASgCACAFRw0AIAEgBUEBQQFBARCLgICAACABKAIIIQULIAEgBUEBajYCCCABKAIEIAVqQd0AOgAAQQAhBgsgBgvIAQEBfyOAgICAAEEQayIFJICAgIAAAkAgBA0AQQBBABCugYCAAAALAkAgAiABaiIBIAJPDQBBAEEAEK6BgIAAAAsgBUEEaiAAKAIAIgIgACgCBCABIAJBAXQiAiABIAJLGyICQQhBBEEBIARBgQhJGyAEQQFGGyIBIAIgAUsbIgIgAyAEEI+AgIAAAkAgBSgCBEEBRw0AIAUoAgggBSgCDBCugYCAAAALIAUoAgghBCAAIAI2AgAgACAENgIEIAVBEGokgICAgAAL5AwBCX8CQAJAAkACQAJAAkACQAJAIAAtAAAOBgABAgMEBQALAkAgASgCACIAKAIAIAAoAggiAmtBA0sNACAAIAJBBEEBQQEQi4CAgAAgACgCCCECCyAAIAJBBGo2AgggACgCBCACakHu6rHjBjYAAAwFCyABKAIAIQICQCAALQABDQACQCACKAIAIAIoAggiAGtBBEsNACACIABBBUEBQQEQi4CAgAAgAigCCCEACyACIABBBWo2AgggAigCBCAAaiIAI4GAgIAAQf2OwIAAaiICKAAANgAAIABBBGogAkEEai0AADoAAAwFCwJAIAIoAgAgAigCCCIAa0EDSw0AIAIgAEEEQQFBARCLgICAACACKAIIIQALIAIgAEEEajYCCCACKAIEIABqQfTk1asGNgAADAQLIABBCGogARCngICAAA8LIAEgACAAKAIIIAAoAgwQjoCAgAAaDAILIAEgAEEEahCKgICAAA8LIAAoAgwhAwJAIAEoAgAiBCgCACAEKAIIIgJHDQAgBCACQQFBAUEBEIuAgIAAIAQoAgghAgsgBCACQQFqIgU2AgggBCgCBCACakH7ADoAAAJAIAMNAAJAIAQoAgAgBUcNACAEIAVBAUEBQQEQi4CAgAAgBCgCCCEFCyAEIAVBAWo2AgggBCgCBCAFakH9ADoAAAwBCwJAAkAgACgCBCICRQ0AAkAgACgCCCIGRQ0AAkACQCAGQQdxIgUNACAGIQAMAQsgBiEAA0AgAEF/aiEAIAIoApgDIQIgBUF/aiIFDQALCyAGQQhJDQADQCACKAKYAygCmAMoApgDKAKYAygCmAMoApgDKAKYAygCmAMhAiAAQXhqIgANAAsLAkACQCACLwGSA0UNAEEBIQdBACEGIAIhAAwBC0EAIQVBASEIA0AgCCEJIAIoAogCIgBFDQMgCUEBaiEIIAVBAWohBSACLwGQAyEGIAAhAiAGIAAvAZIDTw0ACyAGQQFqIQcCQCAFDQAgACECDAELIAVBf2ohCiAAIAdBAnRqQZgDaiECAkACQCAFQQdxDQAMAQsgCUEHcSEHQQAhCANAIAIoAgAiCUGYA2ohAiAHIAhBAWoiCEcNAAsgBSAIayEFC0EAIQcCQCAKQQdPDQAgACECIAkhAAwBCwNAIAIoAgAoApgDKAKYAygCmAMoApgDKAKYAygCmAMoApgDIghBmANqIQIgBUF4aiIFDQALIAAhAiAIIQALIAEgACACIAZBDGxqIgVBkAJqKAIAIAVBlAJqKAIAEI6AgIAAGiACIAZBGGxqIQUCQCAEKAIAIAQoAggiAkcNACAEIAJBAUEBQQEQi4CAgAAgBCgCCCECCyAEIAJBAWo2AgggBCgCBCACakE6OgAAIAUgARCMgICAACICDQMCQCADQX9qIgNFDQADQAJAAkAgByAALwGSA0kNAEEAIQZBASEIA0AgCCEJIAAoAogCIgJFDQYgCUEBaiEIIAZBAWohBiAALwGQAyEFIAIhACAFIAIvAZIDTw0ACyAFQQFqIQcCQCAGDQAgAiEADAILIAIgB0ECdGpBmANqIQgCQAJAIAZBB3ENACAGIQkMAQsgCUEHcSEHQQAhCQNAIAgoAgAiAEGYA2ohCCAHIAlBAWoiCUcNAAsgBiAJayEJC0EAIQcgBkF/akEHSQ0BA0AgCCgCACgCmAMoApgDKAKYAygCmAMoApgDKAKYAygCmAMiAEGYA2ohCCAJQXhqIgkNAAwCCwsgACECIAchBSAHQQFqIQcLIAVBGGwhBiACIAVBDGxqIgVBlAJqKAIAIQggBUGQAmooAgAhCQJAIAQoAgAgBCgCCCIFRw0AIAQgBUEBQQFBARCLgICAACAEKAIIIQULIAIgBmohBiAEIAVBAWo2AgggBCgCBCAFakEsOgAAIAEgACAJIAgQjoCAgAAaAkAgBCgCACAEKAIIIgJHDQAgBCACQQFBAUEBEIuAgIAAIAQoAgghAgsgBCACQQFqNgIIIAQoAgQgAmpBOjoAACAGIAEQjICAgAAiAg0FIANBf2oiAw0ACwsgBCgCCCEFCwJAIAQoAgAgBUcNACAEIAVBAUEBQQEQi4CAgAAgBCgCCCEFCyAEIAVBAWo2AgggBCgCBCAFakH9ADoAAAwBCyOBgICAAEGwlMGAAGoQzIGAgAAAC0EAIQILIAIL0AEBBH8gACgCACEDIAEoAgghBCABKAIEIQUCQCAALQAEQQFGDQACQCADKAIAIgEoAgAgASgCCCIGRw0AIAEgBkEBQQFBARCLgICAACABKAIIIQYLIAEgBkEBajYCCCABKAIEIAZqQSw6AAALIABBAjoABCADIAMgBSAEEI6AgIAAGgJAIAMoAgAiACgCACAAKAIIIgFHDQAgACABQQFBAUEBEIuAgIAAIAAoAgghAQsgACABQQFqNgIIIAAoAgQgAWpBOjoAACACIAMQjICAgAAL0gQBBX8CQCAAKAIAIgQoAgAgBCgCCCIARw0AIAQgAEEBQQFBARCLgICAACAEKAIIIQALIAQgAEEBaiIFNgIIIAQoAgQgAGpBIjoAAAN/QQAhAANAAkAgAyAARw0AAkAgA0UNAAJAIAMgBCgCACAFa00NACAEIAUgA0EBQQEQi4CAgAAgBCgCCCEFCwJAIANFDQAgBCgCBCAFaiACIAP8CgAACyAEIAUgA2oiBTYCCAsCQCAEKAIAIAVHDQAgBCAFQQFBAUEBEIuAgIAAIAQoAgghBQsgBCAFQQFqNgIIIAQoAgQgBWpBIjoAAEEADwsgAiAAaiEGIABBAWoiByEAIAYtAAAiCCOCgICAAGotAAAiBkUNAAsCQCAHQQFGDQACQCAHQX9qIgAgBCgCACAFa00NACAEIAUgAEEBQQEQi4CAgAAgBCgCCCEFCwJAIABFDQAgBCgCBCAFaiACIAD8CgAACyAEIAUgB2pBf2oiBTYCCAsgAyAHayEDIAIgB2ohAgJAIAZB9QBHDQAgBCgCACEAI4OAgIAAIgYgCEEPcWotAAAhByAGIAhBBHZqLQAAIQYCQCAAIAVrQQVLDQAgBCAFQQZBAUEBEIuAgIAAIAQoAgghBQsgBCgCBCAFaiIAIAc6AAUgACAGOgAEIABB3OrBgQM2AAAgBCAFQQZqIgU2AggMAQsCQCAEKAIAIAVrQQFLDQAgBCAFQQJBAUEBEIuAgIAAIAQoAgghBQsgBCgCBCAFaiIAIAY6AAEgAEHcADoAACAEIAVBAmoiBTYCCAwACwvCAQICfwF+QQEhBkEEIQcCQAJAIAQgBWpBf2pBACAEa3GtIAOtfiIIQiCIp0UNAEEAIQMMAQsCQCAIpyIDQYCAgIB4IARrTQ0AQQAhAwwBCwJAAkACQAJAIAFFDQAgAiAFIAFsIAQgAxCqgICAACEHDAELAkAgAw0AIAQhBwwCCxCsgICAACADIAQQqICAgAAhBwsgBw0AIAAgBDYCBAwBCyAAIAc2AgRBACEGC0EIIQcLIAAgB2ogAzYCACAAIAY2AgALlQMCA38DfiOAgICAAEHAAGsiCSSAgICAABCygICAAEGAgICAeCEKQYCAgIB4IQsCQCAAQQFxRQ0AIAKtQiCGIAGthCEMIAIhCwsCQCADQQFxRQ0AIAWtQiCGIASthCENIAUhCgsCQAJAIAZBAXENAEGAgICAeCEIDAELIAitQiCGIAethCEOCyAJIA43AjggCSAINgI0IAkgDTcCLCAJIAo2AiggCSAMNwIgIAkgCzYCHCAJQQxqIAlBHGoQoICAgAAgCSgCGCEIIAkoAhQhCyAJKAIQIQoCQAJAAkAgCSgCDEEBRw0AI4SAgIAAQQE6AAACQCAKIAhLDQAgCyEADAMLIAhFDQEgCyAKQQEgCBCqgICAACIADQJBASAIEK6BgIAAAAsjhICAgABBADoAAAJAIAogCEsNACALIQAMAgsgCEUNACALIApBASAIEKqAgIAAIgANAUEBIAgQroGAgAAAC0EBIQAgCyAKQQEQqYCAgAALI4SAgIAAIgogADYCBCAKIAg2AgggCUHAAGokgICAgAAgCguVAwIDfwN+I4CAgIAAQcAAayIJJICAgIAAELKAgIAAQYCAgIB4IQpBgICAgHghCwJAIABBAXFFDQAgAq1CIIYgAa2EIQwgAiELCwJAIANBAXFFDQAgBa1CIIYgBK2EIQ0gBSEKCwJAAkAgBkEBcQ0AQYCAgIB4IQgMAQsgCK1CIIYgB62EIQ4LIAkgDjcCOCAJIAg2AjQgCSANNwIsIAkgCjYCKCAJIAw3AiAgCSALNgIcIAlBDGogCUEcahChgICAACAJKAIYIQggCSgCFCELIAkoAhAhCgJAAkACQCAJKAIMQQFHDQAjhICAgABBAToAAAJAIAogCEsNACALIQAMAwsgCEUNASALIApBASAIEKqAgIAAIgANAkEBIAgQroGAgAAACyOEgICAAEEAOgAAAkAgCiAISw0AIAshAAwCCyAIRQ0AIAsgCkEBIAgQqoCAgAAiAA0BQQEgCBCugYCAAAALQQEhACALIApBARCpgICAAAsjhICAgAAiCiAANgIEIAogCDYCCCAJQcAAaiSAgICAACAKC5UDAgN/A34jgICAgABBwABrIgkkgICAgAAQsoCAgABBgICAgHghCkGAgICAeCELAkAgAEEBcUUNACACrUIghiABrYQhDCACIQsLAkAgA0EBcUUNACAFrUIghiAErYQhDSAFIQoLAkACQCAGQQFxDQBBgICAgHghCAwBCyAIrUIghiAHrYQhDgsgCSAONwI4IAkgCDYCNCAJIA03AiwgCSAKNgIoIAkgDDcCICAJIAs2AhwgCUEMaiAJQRxqEKCAgIAAIAkoAhghCCAJKAIUIQsgCSgCECEKAkACQAJAIAkoAgxBAUcNACOEgICAAEEBOgAAAkAgCiAISw0AIAshAAwDCyAIRQ0BIAsgCkEBIAgQqoCAgAAiAA0CQQEgCBCugYCAAAALI4SAgIAAQQA6AAACQCAKIAhLDQAgCyEADAILIAhFDQAgCyAKQQEgCBCqgICAACIADQFBASAIEK6BgIAAAAtBASEAIAsgCkEBEKmAgIAACyOEgICAACIKIAA2AgQgCiAINgIIIAlBwABqJICAgIAAIAoLlQMCA38DfiOAgICAAEHAAGsiCSSAgICAABCygICAAEGAgICAeCEKQYCAgIB4IQsCQCAAQQFxRQ0AIAKtQiCGIAGthCEMIAIhCwsCQCADQQFxRQ0AIAWtQiCGIASthCENIAUhCgsCQAJAIAZBAXENAEGAgICAeCEIDAELIAitQiCGIAethCEOCyAJIA43AjggCSAINgI0IAkgDTcCLCAJIAo2AiggCSAMNwIgIAkgCzYCHCAJQQxqIAlBHGoQoICAgAAgCSgCGCEIIAkoAhQhCyAJKAIQIQoCQAJAAkAgCSgCDEEBRw0AI4SAgIAAQQE6AAACQCAKIAhLDQAgCyEADAMLIAhFDQEgCyAKQQEgCBCqgICAACIADQJBASAIEK6BgIAAAAsjhICAgABBADoAAAJAIAogCEsNACALIQAMAgsgCEUNACALIApBASAIEKqAgIAAIgANAUEBIAgQroGAgAAAC0EBIQAgCyAKQQEQqYCAgAALI4SAgIAAIgogADYCBCAKIAg2AgggCUHAAGokgICAgAAgCgvoBgEHfwJAIAAoAgAiAUUNACAAKAIEIQICQAJAIAAoAggiA0UNAEEAIQQDQAJAAkAgBEUNACABIQAgBCEBDAELQQAhAAJAIAJFDQAgAiEFAkAgAkEHcSIGRQ0AA0AgBUF/aiEFIAEoApgDIQEgBkF/aiIGDQALCyACQQhJDQADQCABKAKYAygCmAMoApgDKAKYAygCmAMoApgDKAKYAygCmAMhASAFQXhqIgUNAAsLQQAhAgsCQAJAIAIgAS8BkgNPDQAgAiEHIAEhBQwBCwJAA0AgASgCiAIiBUUNASABLwGQAyEHIAFByANBmAMgABtBCBCpgICAACAAQQFqIQAgBSEBIAcgBS8BkgNJDQIMAAsLIAFByANBmAMgABtBCBCpgICAACOBgICAAEGglMGAAGoQzIGAgAAACyAHQQFqIQICQAJAIAANACAFIQQMAQsgBSACQQJ0akGYA2ohAQJAAkAgAEEHcSICDQAgACEGDAELIAAhBgNAIAZBf2ohBiABKAIAIgRBmANqIQEgAkF/aiICDQALC0EAIQIgAEEISQ0AA0AgASgCACgCmAMoApgDKAKYAygCmAMoApgDKAKYAygCmAMiBEGYA2ohASAGQXhqIgYNAAsLIAUgB0EYbGohAQJAIAUgB0EMbGoiACgCjAIiBUUNACAAQYwCaigCBCAFQQEQqYCAgAALAkACQAJAAkAgAS0AAA4FAwMDAQIACyABQQRqEJSAgIAADAILIAEoAgQiAEUNASABKAIIIABBARCpgICAAAwBCyABQQRqEJWAgIAAIAEoAgQiAEUNACABKAIIIABBGGxBCBCpgICAAAtBACEBIANBf2oiAw0ADAILCwJAIAINACABIQQMAQsCQAJAIAJBB3EiAA0AIAEhBCACIQEMAQsgASEEIAIhAQNAIAFBf2ohASAEKAKYAyEEIABBf2oiAA0ACwsgAkEISQ0AA0AgBCgCmAMoApgDKAKYAygCmAMoApgDKAKYAygCmAMoApgDIQQgAUF4aiIBDQALCwJAAkAgBCgCiAIiAA0AQZgDIQEMAQtBACEBA0AgBEHIA0GYAyABG0EIEKmAgIAAIAFBf2ohASAAIgUhBCAFKAKIAiIADQALQcgDQZgDIAEbIQEgBSEECyAEIAFBCBCpgICAAAsLigIBBH8jgICAgABBMGsiASSAgICAAAJAIAAoAggiAkUNACAAKAIEIQADQAJAAkACQAJAIAAtAAAOBQMDAwECAAsCQAJAIABBBGooAgAiAw0AQQAhA0EAIQQMAQsgASADNgIkIAFBADYCICABIAM2AhQgAUEANgIQIAEgAEEIaigCACIDNgIoIAEgAzYCGCAAQQxqKAIAIQRBASEDCyABIAQ2AiwgASADNgIcIAEgAzYCDCABQQxqEJeAgIAADAILIABBBGooAgAiA0UNASAAQQhqKAIAIANBARCpgICAAAwBCyAAQQRqEJiAgIAACyAAQRhqIQAgAkF/aiICDQALCyABQTBqJICAgIAAC+gCAQZ/I4CAgIAAQTBrIgEkgICAgAACQAJAAkACQCAALQAADgUDAwMBAgALIABBBGoQlICAgAAMAgsgACgCBCICRQ0BIAAoAgggAkEBEKmAgIAADAELIAAoAgghAwJAIAAoAgwiBEUNACADIQIDQAJAAkACQAJAIAItAAAOBQMDAwECAAsCQAJAIAJBBGooAgAiBQ0AQQAhBUEAIQYMAQsgASAFNgIkIAFBADYCICABIAU2AhQgAUEANgIQIAEgAkEIaigCACIFNgIoIAEgBTYCGCACQQxqKAIAIQZBASEFCyABIAY2AiwgASAFNgIcIAEgBTYCDCABQQxqEJeAgIAADAILIAJBBGooAgAiBUUNASACQQhqKAIAIAVBARCpgICAAAwBCyACQQRqEJiAgIAACyACQRhqIQIgBEF/aiIEDQALCyAAKAIEIgJFDQAgAyACQRhsQQgQqYCAgAALIAFBMGokgICAgAALkQcBCX8gACgCACEBAkACQCAAKAIgIgINACAAKAIMIQMgACgCCCEEIAAoAgQhBQwBCyAAKAIMIQMgACgCBCEFAkACQANAIAAgAkF/aiICNgIgAkACQCABQQFxIgRFDQAgBQ0AIAAoAgghBQJAIANFDQACQAJAIANBB3EiBg0AIAMhBAwBCyADIQQDQCAEQX9qIQQgBSgCmAMhBSAGQX9qIgYNAAsLIANBCEkNAANAIAUoApgDKAKYAygCmAMoApgDKAKYAygCmAMoApgDKAKYAyEFIARBeGoiBA0ACwsgAEIANwIIIAAgBTYCBEEBIQEgAEEBNgIAQQAhAwwBCyAERQ0CCyAAKAIIIQQCQAJAIAMgBS8BkgNPDQAgAyEHIAUhBgwBCwJAA0AgBSgCiAIiBkUNASAFLwGQAyEHIAVByANBmAMgBBtBCBCpgICAACAEQQFqIQQgBiEFIAcgBi8BkgNJDQIMAAsLIAVByANBmAMgBBtBCBCpgICAACOBgICAAEGglMGAAGoQzIGAgAAACyAHQQFqIQMCQAJAIAQNACAGIQUMAQsgBiADQQJ0akGYA2ohCAJAAkAgBEEHcSIDDQAgBCEJDAELIAQhCQNAIAlBf2ohCSAIKAIAIgVBmANqIQggA0F/aiIDDQALC0EAIQMgBEEISQ0AA0AgCCgCACgCmAMoApgDKAKYAygCmAMoApgDKAKYAygCmAMiBUGYA2ohCCAJQXhqIgkNAAsLIAAgAzYCDCAAQQA2AgggACAFNgIEIAYgB0EYbGohBAJAIAYgB0EMbGoiBigCjAIiCEUNACAGQYwCaigCBCAIQQEQqYCAgAALIAQQloCAgAAgAkUNAgwACwsjgYCAgABByJTBgABqEMyBgIAAAAsgACgCACEBQQAhBAsgAEEANgIAAkAgAUEBcUUNAAJAIAUNAAJAIANFDQACQAJAIANBB3EiBg0AIAMhBQwBCyADIQUDQCAFQX9qIQUgBCgCmAMhBCAGQX9qIgYNAAsLIANBCEkNAANAIAQoApgDKAKYAygCmAMoApgDKAKYAygCmAMoApgDKAKYAyEEIAVBeGoiBQ0ACwsgBCEFQQAhBAsCQAJAIAUoAogCIggNACAFIQYMAQsDQCAFQcgDQZgDIAQbQQgQqYCAgAAgBEEBaiEEIAgiBiEFIAYoAogCIggNAAsLIAZByANBmAMgBBtBCBCpgICAAAsLqgIBBn8jgICAgABBMGsiASSAgICAACAAKAIEIQICQCAAKAIIIgNFDQAgAiEEA0ACQAJAAkACQCAELQAADgUDAwMBAgALAkACQCAEQQRqKAIAIgUNAEEAIQVBACEGDAELIAEgBTYCJCABQQA2AiAgASAFNgIUIAFBADYCECABIARBCGooAgAiBTYCKCABIAU2AhggBEEMaigCACEGQQEhBQsgASAGNgIsIAEgBTYCHCABIAU2AgwgAUEMahCXgICAAAwCCyAEQQRqKAIAIgVFDQEgBEEIaigCACAFQQEQqYCAgAAMAQsgBEEEahCYgICAAAsgBEEYaiEEIANBf2oiAw0ACwsCQCAAKAIAIgRFDQAgAiAEQRhsQQgQqYCAgAALIAFBMGokgICAgAALlAYCC38CfiOAgICAAEHQAGsiBCSAgICAAAJAAkACQAJAAkACQCABKAIAIgVFDQAgAigCCCEGIAIoAgQhByABKAIEIQgCQANAIAVBjAJqIQkgBS8BkgMiCkEMbCELQX8hDAJAA0ACQCALDQAgCiEMDAILIAlBCGohDSAJQQRqIQ4gDEEBaiEMIAtBdGohCyAJQQxqIQkgByAOKAIAIAYgDSgCACINIAYgDUkbEKSBgIAAIg4gBiANayAOGyINQQBKIA1BAEhrQf8BcSINQQFGDQALIA1FDQILAkAgCEUNACAIQX9qIQggBSAMQQJ0aigCmAMhBQwBCwsgBCAMNgJIIARBADYCRCACKAIAIQkgAikCBCEPIAQpAkQhEAwCCyAEIAg2AkQgBCAFNgJAIAQpA0AhDyACKAIAIglFDQIgByAJQQEQqYCAgAAMAgsgAikCBCEPIAIoAgAhCUEAIQULIAlBgICAgHhHDQEgASEMCyAAIA+nIAxBGGxqIgkpAwA3AwAgCSADKQMANwMAIABBEGogCUEQaiILKQMANwMAIABBCGogCUEIaiIJKQMANwMAIAkgA0EIaikDADcDACALIANBEGopAwA3AwAMAQsgBCAQNwIcIAQgBTYCGCAEIAE2AhQgBCAPNwIMIAQgCTYCCAJAAkAgBUUNACAEQTBqQQhqIARBGGoiCUEIaigCADYCACAEIAkpAgA3AzAgBEHAAGpBCGogBEEIakEIaigCADYCACAEIAQpAgg3A0AgBEEkaiAEQTBqIARBwABqIAMgBEEUaiAEQSRqEImAgIAAIAQoAhQhAQwBCxCsgICAAEGYA0EIEKiAgIAAIglFDQIgAUEANgIEIAEgCTYCACAJQQA2AogCIAlBATsBkgMgCSAEKQIINwKMAiAJIAMpAwA3AwAgCUGUAmogBEEIakEIaigCADYCACAJQQhqIANBCGopAwA3AwAgCUEQaiADQRBqKQMANwMACyABIAEoAghBAWo2AgggAEEGOgAACyAEQdAAaiSAgICAAA8LQQhBmAMQq4GAgAAACwIACxsAIAAjgYCAgABB6JTBgABqIAEgAhC0gYCAAAsgAQF/AkAgACgCACIBRQ0AIAAoAgQgAUEBEKmAgIAACwsZACABI4GAgIAAQbmPwIAAakEFEMqBgIAAC6kCAQZ/IAAoAgghAgJAAkAgAUGAAU8NAEEBIQMMAQsCQCABQYAQTw0AQQIhAwwBC0EDQQQgAUGAgARJGyEDCyACIQQCQCADIAAoAgAgAmtNDQAgACACIANBAUEBEIuAgIAAIAAoAgghBAsgACgCBCAEaiEEAkACQAJAIAFBgAFJDQAgAUE/cUGAf3IhBSABQQZ2IQYgAUGAEEkNASABQQx2IQcgBkE/cUGAf3IhBgJAIAFBgIAESQ0AIAQgBToAAyAEIAY6AAIgBCAHQT9xQYB/cjoAASAEIAFBEnZBcHI6AAAMAwsgBCAFOgACIAQgBjoAASAEIAdB4AFyOgAADAILIAQgAToAAAwBCyAEIAU6AAEgBCAGQcABcjoAAAsgACADIAJqNgIIQQALVAEBfwJAIAIgACgCACAAKAIIIgNrTQ0AIAAgAyACQQFBARCLgICAACAAKAIIIQMLAkAgAkUNACAAKAIEIANqIAEgAvwKAAALIAAgAyACajYCCEEAC/4BAQF/EKyAgIAAAkBBHUEBEKiAgIAAIgJFDQAgAEEdNgIMIAAgAjYCCCAAQoGAgIDQAzcCACACI4GAgIAAQb6PwIAAaiIAKQAANwAAIAJBFWogAEEVaikAADcAACACQRBqIABBEGopAAA3AAAgAkEIaiAAQQhqKQAANwAAAkAgASgCACICQYCAgIB4Rg0AIAJFDQAgASgCBCACQQEQqYCAgAALAkAgASgCDCICQYCAgIB4Rg0AIAJFDQAgASgCECACQQEQqYCAgAALAkAgASgCGCICQYCAgIB4Rg0AIAJFDQAgASgCHCACQQEQqYCAgAALDwtBAUEdEK6BgIAAAAuUEwEMfyOAgICAAEHgAGsiAiSAgICAACOBgICAAEHbj8CAAGpBMyACQThqEICAgIAAAkACQAJAIAItADhBAXFFDQAgAigCQCIDQYCAgIB4Rw0BCyOBgICAAEGOkMCAAGpBHyACQThqEICAgIAAAkAgAi0AOEEBcUUNACACKAJAIgNBgICAgHhHDQELIAJBADYCDCACQQA2AgQQrICAgAACQAJAAkACQAJAAkACQEEGQQEQqICAgAAiA0UNACADI4GAgIAAQa2QwIAAaiIEKAAANgAAIANBBGogBEEEai8AADsAACACQQY2AjAgAiADNgIsIAJBBjYCKBCsgICAAEEIQQEQqICAgAAiA0UNASADQuHgwZP3zd2y5AA3AAAgAkEINgJEIAIgAzYCQCACQQg2AjwgAkEDOgA4IAJBEGogAkEEaiACQShqIAJBOGoQmYCAgAACQAJAAkACQCACLQAQDgcDAwMBAgADAAsCQAJAIAIoAhQiAw0AQQAhA0EAIQQMAQsgAiACKAIYIgQ2AlQgAiADNgJQIAJBADYCTCACIAQ2AkQgAiADNgJAIAJBADYCPEEBIQMgAigCHCEECyACIAQ2AlggAiADNgJIIAIgAzYCOCACQThqEJeAgIAADAILIAIoAhQiA0UNASACKAIYIANBARCpgICAAAwBCyACQRBqQQRyEJWAgIAAIAIoAhQiA0UNACACKAIYIANBGGxBCBCpgICAAAsQrICAgABBBkEBEKiAgIAAIgNFDQIgAyOBgICAAEGzkMCAAGoiBCgAADYAACADQQRqIARBBGovAAA7AAAgAkEGNgIwIAIgAzYCLCACQQY2AigQrICAgABBKEEBEKiAgIAAIgNFDQMgAyOBgICAAEG5kMCAAGoiBCkAADcAACADQSBqIARBIGopAAA3AAAgA0EYaiAEQRhqKQAANwAAIANBEGogBEEQaikAADcAACADQQhqIARBCGopAAA3AAAgAkEoNgJEIAIgAzYCQCACQSg2AjwgAkEDOgA4IAJBEGogAkEEaiACQShqIAJBOGoQmYCAgAACQAJAAkACQCACLQAQDgcDAwMBAgADAAsCQAJAIAIoAhQiAw0AQQAhA0EAIQQMAQsgAiACKAIYIgQ2AlQgAiADNgJQIAJBADYCTCACIAQ2AkQgAiADNgJAIAJBADYCPEEBIQMgAigCHCEECyACIAQ2AlggAiADNgJIIAIgAzYCOCACQThqEJeAgIAADAILIAIoAhQiA0UNASACKAIYIANBARCpgICAAAwBCyACQRBqQQRyEJWAgIAAIAIoAhQiA0UNACACKAIYIANBGGxBCBCpgICAAAsgAigCBCEFIAIoAgghBiACKAIMIQcQrICAgABBgAFBARCogICAACIDRQ0EIAIgAzYCPCACQYABNgI4IAIgAkE4ajYCKCADQfsAOgAAIAJBATYCQAJAAkACQAJAAkAgBw0AIANB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BGo2AggMAQsCQCAAKwMIIge9Qv///////////wCDQoCAgICAgID4/wBTDQACQCABKAIAIAEoAggiAGtBA0sNACABIABBBEEBQQEQi4CAgAAgASgCCCEACyABIABBBGo2AgggASgCBCAAakHu6rHjBjYAAAwBCwJAIAcgAkEIahCxgICAACACQQhqayIAIAEoAgAgASgCCCIEa00NACABIAQgAEEBQQEQi4CAgAAgASgCCCEECwJAIABFDQAgASgCBCAEaiACQQhqIAD8CgAACyABIAQgAGo2AggLIAJBMGokgICAgABBAA8LIABBFCOBgICAAEHIlcGAAGoQwoGAgAAACw0AIAAgARC5gICAAA8LDwAgACABIAIQu4CAgAAPCxEAIAAgASACIAMQvICAgAAPCwUAQQAPCwMADwu3BQACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAAKAIADhkAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYAAsgASAAKAIEIAAoAggQyoGAgAAPCyAAQQRqIAEQr4CAgAAaAAsgASOBgICAAEHhkMCAAGpBGBDKgYCAAA8LIAEjgYCAgABB+ZDAgABqQRsQyoGAgAAPCyABI4GAgIAAQZSRwIAAakEaEMqBgIAADwsgASOBgICAAEGukcCAAGpBGRDKgYCAAA8LIAEjgYCAgABBx5HAgABqQQwQyoGAgAAPCyABI4GAgIAAQdORwIAAakETEMqBgIAADwsgASOBgICAAEHmkcCAAGpBExDKgYCAAA8LIAEjgYCAgABB+ZHAgABqQQ4QyoGAgAAPCyABI4GAgIAAQYeSwIAAakEOEMqBgIAADwsgASOBgICAAEGVksCAAGpBDBDKgYCAAA8LIAEjgYCAgABBoZLAgABqQQ4QyoGAgAAPCyABI4GAgIAAQa+SwIAAakEOEMqBgIAADwsgASOBgICAAEG9ksCAAGpBExDKgYCAAA8LIAEjgYCAgABB0JLAgABqQRoQyoGAgAAPCyABI4GAgIAAQeqSwIAAakE+EMqBgIAADwsgASOBgICAAEGok8CAAGpBFBDKgYCAAA8LIAEjgYCAgABBvJPAgABqQTQQyoGAgAAPCyABI4GAgIAAQfCTwIAAakEsEMqBgIAADwsgASOBgICAAEGc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IAMgAhGAgICAAICAgIAACwJAIAEoAgQiAkUNACADIAIgASgCCBCpgICAAAsgAEEMQQQQqYCAgAAMAQsgACAEKQMANwIACyAEQRBqJICAgIAAC3EBAn8CQAJAIABB/wFxIgBBBEsNACAAQQNHDQELIAEoAgAhAgJAIAFBBGooAgAiACgCACIDRQ0AIAIgAxGAgICAAICAgIAACwJAIAAoAgQiA0UNACACIAMgACgCCBCpgICAAAsgAUEMQQQQqYCAgAALCyEAAkAgACgCAEUNACAAKAIEIgBBf0YNACAAEIKAgIAACwsJABDYgICAAAALcQEBfyOAgICAAEEQayICJICAgIAAAkACQAJAIAFBCEsNACABIABNDQELIAJBADYCDCACQQxqIAFBBCABQQRLGyAAEJiBgIAAIQFBACACKAIMIAEbIQEMAQsgABCQgYCAACEBCyACQRBqJICAgIAAIAELCQAQuICAgAAACwoAIAAQk4GAgAALnQEBAn8jgICAgABBEGsiBCSAgICAAAJAAkACQCACQQhLDQAgAiADTQ0BC0EAIQUgBEEANgIMIARBDGogAkEEIAJBBEsbIAMQmIGAgAANASAEKAIMIgJFDQECQCADIAEgAyABSRsiA0UNACACIAAgA/wKAAALIAAQk4GAgAAgAiEFDAELIAAgAxCWgYCAACEFCyAEQRBqJICAgIAAIAULOAIBfwF+I4CAgIAAQRBrIgEkgICAgAAgACkCACECIAEgADYCDCABIAI3AgQgAUEEahC+gICAAAALCwAgABDdgICAAAALDQAgASAAEMCAgIAAAAsvAQF/I4CAgIAAQRBrIgIkgICAgAAgAiABNgIMIAIgADYCCCACQQhqENuAgIAAAAsrAQF/IAAjgYCAgABByPjAgABqIgIpAgA3AgAgAEEIaiACQQhqKQIANwIACysBAX8gACOBgICAAEHY+MCAAGoiAikCADcCACAAQQhqIAJBCGopAgA3AgALFAAgACgCACAAKAIEIAEQuoGAgAALrQEBAX8jgICAgABBEGsiBSSAgICAAAJAIAIgAWoiASACTw0AQQBBABCugYCAAAALIAVBBGogACgCACICIAAoAgQgASACQQF0IgIgASACSxsiAkEIQQQgBEEBRhsiASACIAFLGyICIAMgBBDFgICAAAJAIAUoAgRBAUcNACAFKAIIIAUoAgwQroGAgAAACyAFKAIIIQQgACACNgIAIAAgBDYCBCAFQRBqJICAgIAAC8IBAgJ/AX5BASEGQQQhBwJAAkAgBCAFakF/akEAIARrca0gA61+IghCIIinRQ0AQQAhAwwBCwJAIAinIgNBgICAgHggBGtNDQBBACEDDAELAkACQAJAAkAgAUUNACACIAUgAWwgBCADEKqAgIAAIQcMAQsCQCADDQAgBCEHDAILEKyAgIAAIAMgBBCogICAACEHCyAHDQAgACAENgIEDAELIAAgBzYCBEEAIQYLQQghBwsgACAHaiADNgIAIAAgBjYCAAuTAQEBfxCsgICAAAJAAkBBDEEEEKiAgIAAIgNFDQAgAyACKQIANwIAIANBCGogAkEIaigCADYCABCsgICAAEEMQQQQqICAgAAiAkUNASACIAE6AAggAiADNgIAIAIjgYCAgABBxJnBgABqNgIEIAAgAq1CIIZCA4Q3AgAPC0EEQQwQq4GAgAAAC0EEQQwQq4GAgAAACwQAQQALsgcDCH8CfgJ/I4CAgIAAQSBrIgQkgICAgAACQAJAAkACQAJAIANFDQAgAkEEaiEFIANBA3QiBkF4akEDdkEBaiEHQQAhCAJAA0AgBSgCAA0BIAVBCGohBSAIQQFqIQggBkF4aiIGDQALIAchCAsgAyAISQ0BIAMgCEYNACABQQRqIQkgAyAIayEKIAIgCEEDdGohBwNAIApBA3QhCEEAIQJBACEFAkADQAJAIAggBUcNAEEBIQUMAgsgByAFaiEGIAVBCGoiAyEFIAZBBGooAgAiBkUNAAsgByADakF4aigCACEFIAYhAgsCQCABKAIADQAgARCPgYCAADYCBCABQQE2AgALIAQgCSAFIAJBgCAgAkGAIEkbIgsQjoGAgAACQAJAAkACQAJAAkACQCAEKAIAIgVBAkYNAEEAIQsgBUEBcQ0AIAQgBCgCBDYCECAEQRRqIARBEGoQjYGAgAAgBEEIakEoIARBFGoQxoCAgAACQCAEKAIQIgVBf0YNACAFEIGAgIAACyAEKQMIIgxCIIgiDachBSAEKAIIIQ4gBCgCDCELAkACQCAMp0H/AXEOBQQAAQYDBAsgDEKA/gODQoDGAFINDAwHCyAFLQAIQSNHDQsMBgsgDkGAfnFBBHIhDiALIQULAkAgBQ0AI4GAgIAAQeCWwYAAaikDACEMDAoLIAdBBGohBiAIQXhqQQN2QQFqIQ9BACEDAkADQCAFIAYoAgAiAkkNASAGQQhqIQYgA0EBaiEDIAUgAmshBSAIQXhqIggNAAsgDyEDCyAKIANJDQgCQCAKIANHDQAgBUUNByOBgICAACIFQf35wIAAakHPACAFQYiXwYAAahDAgYCAAAALIAcgA0EDdGoiBygCBCIIIAVPDQEjgYCAgAAiBUHa+cCAAGpBxwAgBUH4lsGAAGoQwIGAgAAACyANQhtRDQMMCAsgCiADayEKIAcgCCAFazYCBCAHIAcoAgAgBWo2AgAgDkH/AXEiBUEESw0BIAVBA0YNAQwCCyAFLQAIQSNHDQYLIAsoAgAhCAJAIAtBBGooAgAiBSgCACIGRQ0AIAggBhGAgICAAICAgIAACwJAIAUoAgQiBkUNACAIIAYgBSgCCBCpgICAAAsgC0EMQQQQqYCAgAALIAoNAAsLIABBBDoAAAwDCyAIIAMgAyOBgICAAEGYl8GAAGoQxoGAgAAACyADIAogCiOBgICAAEGYl8GAAGoQxoGAgAAACyAAIAw3AgALIARBIGokgICAgAAL4QMDBH8CfgJ/I4CAgIAAQSBrIgQkgICAgAACQAJAAkACQCADRQ0AIAFBBGohBQNAAkAgASgCAA0AIAEQj4GAgAA2AgQgAUEBNgIACyAEIAUgAiADQYAgIANBgCBJGyIGEI6BgIAAAkACQAJAAkACQCAEKAIAIgdBAkYNAEEAIQYgB0EBcQ0AIAQgBCgCBDYCECAEQRRqIARBEGoQjYGAgAAgBEEIakEoIARBFGoQxoCAgAACQCAEKAIQIgZBf0YNACAGEIGAgIAACyAEKQMIIghCIIgiCachBgJAAkAgCKdB/wFxDgUDAAEFAgMLIAhCgP4Dg0KAxgBSDQkMBQsgBi0ACEEjRw0IDAQLIAYNASOBgICAAEHglsGAAGopAwAhCAwHCyAJQhtRDQIMBgsgAyAGSQ0EIAIgBmohAiADIAZrIQMMAQsgBi0ACEEjRw0EIAYoAgAhCgJAIAZBBGooAgAiBygCACILRQ0AIAogCxGAgICAAICAgIAACwJAIAcoAgQiC0UNACAKIAsgBygCCBCpgICAAAsgBkEMQQQQqYCAgAALIAMNAAsLIABBBDoAAAwCCyAGIAMgAyOBgICAAEHolsGAAGoQxoGAgAAACyAAIAg3AgALIARBIGokgICAgAALiAIBAX8jgICAgABBEGsiBCSAgICAACAAQQQ6AAAgBCABNgIIIAQgACkCADcDACAEI4GAgIAAQfyVwYAAaiACIAMQtIGAgAAhAyAELQAAIQECQAJAAkAgA0UNACABQQRHDQEjgYCAgAAiBEHo+MCAAGpBrQEgBEGUlsGAAGoQwIGAgAAACyAEKAIEIQACQCABQQRLDQAgAUEDRw0CCyAAKAIAIQMCQCAAQQRqKAIAIgEoAgAiAkUNACADIAIRgICAgACAgICAAAsCQCABKAIEIgJFDQAgAyACIAEoAggQqYCAgAALIABBDEEEEKmAgIAADAELIAAgBCkDADcCAAsgBEEQaiSAgICAAAuIAgEBfyOAgICAAEEQayIEJICAgIAAIABBBDoAACAEIAE2AgggBCAAKQIANwMAIAQjgYCAgABBpJbBgABqIAIgAxC0gYCAACEDIAQtAAAhAQJAAkACQCADRQ0AIAFBBEcNASOBgICAACIEQej4wIAAakGtASAEQZSWwYAAahDAgYCAAAALIAQoAgQhAAJAIAFBBEsNACABQQNHDQILIAAoAgAhAwJAIABBBGooAgAiASgCACICRQ0AIAMgAhGAgICAAICAgIAACwJAIAEoAgQiAkUNACADIAIgASgCCBCpgICAAAsgAEEMQQQQqYCAgAAMAQsgACAEKQMANwIACyAEQRBqJICAgIAAC+oCAQV/AkACQCADDQBBACEEDAELIANBA3EhBQJAAkAgA0EETw0AQQAhBkEAIQQMAQsgAkEcaiEHIANB/P///wBxIQhBACEGQQAhBANAIAcoAgAgB0F4aigCACAHQXBqKAIAIAdBaGooAgAgBGpqamohBCAHQSBqIQcgCCAGQQRqIgZHDQALCwJAIAVFDQAgBkEDdCACakEEaiEHA0AgBygCACAEaiEEIAdBCGohByAFQX9qIgUNAAsLIANBA3QhBwJAIAQgASgCACABKAIIIgVrTQ0AIAEgBSAEQQFBARDEgICAAAsgAiAHaiEIIAEoAgghBwNAIAIoAgAhBgJAIAJBBGooAgAiBSABKAIAIAdrTQ0AIAEgByAFQQFBARDEgICAACABKAIIIQcLAkAgBUUNACABKAIEIAdqIAYgBfwKAAALIAEgByAFaiIHNgIIIAJBCGoiAiAIRw0ACwsgAEEEOgAAIAAgBDYCBAsEAEEBC9sCAQV/AkAgA0UNACADQQNxIQQCQAJAIANBBE8NAEEAIQVBACEGDAELIAJBHGohByADQfz///8AcSEIQQAhBUEAIQYDQCAHKAIAIAdBeGooAgAgB0FwaigCACAHQWhqKAIAIAZqampqIQYgB0EgaiEHIAggBUEEaiIFRw0ACwsCQCAERQ0AIAVBA3QgAmpBBGohBwNAIAcoAgAgBmohBiAHQQhqIQcgBEF/aiIEDQALCyADQQN0IQQCQCAGIAEoAgAgASgCCCIHa00NACABIAcgBkEBQQEQxICAgAAgASgCCCEHCyACIARqIQUDQCACKAIAIQQCQCACQQRqKAIAIgYgASgCACAHa00NACABIAcgBkEBQQEQxICAgAAgASgCCCEHCwJAIAZFDQAgASgCBCAHaiAEIAb8CgAACyABIAcgBmoiBzYCCCACQQhqIgIgBUcNAAsLIABBBDoAAAsJACAAQQQ6AAALYAEBfwJAIAMgASgCACABKAIIIgRrTQ0AIAEgBCADQQFBARDEgICAACABKAIIIQQLAkAgA0UNACABKAIEIARqIAIgA/wKAAALIAAgAzYCBCABIAQgA2o2AgggAEEEOgAAC1kBAX8CQCADIAEoAgAgASgCCCIEa00NACABIAQgA0EBQQEQxICAgAAgASgCCCEECwJAIANFDQAgASgCBCAEaiACIAP8CgAACyAAQQQ6AAAgASAEIANqNgIIC1cBAX8CQCAAKAIAIgBBDGooAgAiAUUNACAAQRBqKAIAIAFBARCpgICAAAsCQCAAQX9GDQAgACAAKAIEIgFBf2o2AgQgAUEBRw0AIABBGEEEEKmAgIAACwtNAQF/I4CAgIAAQRBrIgYkgICAgAAgBiACNgIMIAYgATYCCCAAIAZBCGojgYCAgABBpJnBgABqIgIgBkEMaiACIAMgBCAFENWBgIAAAAsmAQF/I4GAgIAAIgBB7fzAgABqQe8AIABBiJjBgABqEMCBgIAAAAvgAgEFfyOAgICAAEEQayIBJICAgIAAEKyAgIAAQYAEIQICQAJAQYAEQQEQqICAgAAiA0UNACABIAM2AgggAUGABDYCBAJAAkACQCADQYAEEJ6BgIAADQBBgAQhAgNAI4iAgIAAKAIAIgRBxABHDQIgASACNgIMIAFBBGogAkEBQQFBARDEgICAACABKAIIIgMgASgCBCICEJ6BgIAARQ0ACwsgASADEKmBgIAAIgQ2AgwCQCACIARNDQACQAJAIAQNAEEBIQUgAyACQQEQqYCAgAAMAQsgAyACQQEgBBCqgICAACIFRQ0FCyABIAQ2AgQgASAFNgIICyAAIAEpAgQ3AgAgAEEIaiABQQRqQQhqKAIANgIADAELIAAgBDYCCCAAQoCAgIAINwIAIAJFDQAgAyACQQEQqYCAgAALIAFBEGokgICAgAAPC0EBQYAEEK6BgIAAAAtBASAEEK6BgIAAAAu6AwEDfyOAgICAAEGgA2siAySAgICAAAJAAkACQCACQf8CSw0AAkAgAkUNACADQRRqIAEgAvwKAAALIANBFGogAmpBADoAACADQZQDaiADQRRqIAJBAWoQwYGAgAACQCADKAKUA0EBRw0AIAMjgYCAgABBuJfBgABqKQMANwIMQYGAgIB4IQIMAgsCQCADKAKYAxCjgYCAACIBDQBBgICAgHghAgwCCwJAAkAgARCpgYCAACICDQBBASEEDAELEKyAgIAAIAJBARCogICAACIERQ0DCwJAIAJFDQAgBCABIAL8CgAACyADIAI2AhAgAyAENgIMDAELIANBCGogASACENeAgIAAIAMoAgghAgsCQAJAIAJBgYCAgHhGDQAgACADKQIMNwIEIAAgAjYCAAwBCwJAIAMtAAxBA0cNACADKAIQIgIoAgAhBAJAIAJBBGooAgAiASgCACIFRQ0AIAQgBRGAgICAAICAgIAACwJAIAEoAgQiBUUNACAEIAUgASgCCBCpgICAAAsgAkEMQQQQqYCAgAALIABBgICAgHg2AgALIANBoANqJICAgIAADwtBASACEK6BgIAAAAufAgEEfyOAgICAAEEQayIDJICAgIAAIAMgASACELKBgIAAAkACQAJAIAMoAgAiAkGAgICAeEcNACADKAIIIQECQAJAIAMoAgQiBBCjgYCAACIFRQ0AAkACQCAFEKmBgIAAIgINAEEBIQYMAQsQrICAgAAgAkEBEKiAgIAAIgZFDQULAkAgAkUNACAGIAUgAvwKAAALIAAgAjYCCCAAIAY2AgQgACACNgIADAELIABBgICAgHg2AgALIARBADoAACABRQ0BIAQgAUEBEKmAgIAADAELIABBgYCAgHg2AgAgACOBgICAAEG4l8GAAGopAwA3AgQgAkUNACADKAIEIAJBARCpgICAAAsgA0EQaiSAgICAAA8LQQEgAhCugYCAAAALCQAQnYGAgAAAC2ABAX8jgICAgABBEGsiBCSAgICAACAEIAM6AAcgBCOJgICAAK1CIIYgBEEHaq2ENwMIIAAgASOBgICAAEGEhMCAAGogBEEIaiACEYGAgIAAgICAgAAgBEEQaiSAgICAAAvZAgMDfwF+BH8jgICAgABBEGsiAiSAgICAACABKAIEIQMgASgCACEEIAAtAAAhACACQQRqENWAgIAAIAIpAgghBQJAIAIoAgQiAUGAgICAeEcNACAFQv8Bg0IDUg0AIAVCIIinIgYoAgAhBwJAIAZBBGooAgAiCCgCACIJRQ0AIAcgCRGAgICAAICAgIAACwJAIAgoAgQiCUUNACAHIAkgCCgCCBCpgICAAAsgBkEMQQQQqYCAgAALAkACQAJAAkAgBCOBgICAAEGH+8CAAGpBESADKAIMIgMRgoCAgACAgICAAA0AIABBAXENASAEI4GAgIAAQZj7wIAAakHYACADEYKAgIAAgICAgABFDQELQQEhBCABQYCAgIB4ckGAgICAeEcNAQwCC0EAIQQgAUGAgICAeHJBgICAgHhGDQELIAWnIAFBARCpgICAAAsgAkEQaiSAgICAACAECwsAIAAQ3ICAgAAACzoBAn8jioCAgAAoAgAhASOLgICAACECIAAoAgAgACgCBCABIAIgARsRg4CAgACAgICAABC4gICAAAALqwEBA38jgICAgABBEGsiASSAgICAAAJAIAAoAgAiAigCBCIDQQFxDQAgAUGAgICAeDYCACOBgICAACECIAEgADYCDCABIAJB7JjBgABqIAAoAgQgACgCCCIALQAIIAAtAAkQ5ICAgAAACyACKAIAIQIgASADQQF2NgIEIAEgAjYCACABI4GAgIAAQYiZwYAAaiAAKAIEIAAoAggiAC0ACCAALQAJEOSAgIAAAAuOAQEDfyOAgICAAEEQayIAJICAgIAAI4GAgIAAQZWcwYAAaiIBLQAAIQIgAUEBOgAAIAAgAjoADwJAIAJBAUcNACOBgICAACECQQAgAEEPaiOMgICAACACQfD7wIAAakHBACACQcCXwYAAahDTgICAAAALI4GAgIAAIQIgAEEQaiSAgICAACACQZWcwYAAagtyAQJ/I4CAgIAAQRBrIgEkgICAgAAgAC0AACECIABBAToAACABIAI6AA8CQCACQQFHDQAjgYCAgAAhAEEAIAFBD2ojjICAgAAgAEHw+8CAAGpBwQAgAEHAl8GAAGoQ04CAgAAACyABQRBqJICAgIAAIAALnAQCA38BfiOAgICAAEEgayICJICAgIAAAkAQq4CAgABB/wFxDQAjgYCAgABBlpzBgABqIgMtAAAhBCADQQE6AAAjhYCAgACtQiCGIQUCQAJAIAQNACACQgA3AwAgAiABNgIMIAIgBSACQQxqrYQ3AxggAkEQaiACI4GAgIAAQbmMwIAAaiACQRhqELWAgIAAIAItABAgAigCFBC2gICAACACELeAgIAAIAJCADcDEBDegICAACEBAkACQAJAAkAQ4YCAgABB/wFxDgQAAQIDAAsgAkEYaiACQRBqI42AgIAAQYqAgIAAakEAENmAgIAAIAItABggAigCHBC2gICAAAwCCyACQRhqIAJBEGojjYCAgABBioCAgABqQQEQ2YCAgAAgAi0AGCACKAIcELaAgIAADAELIAJBGGogAkEQaiOBgICAAEGR/MCAAGpBnQEQtYCAgAAgAi0AGCACKAIcELaAgIAACyABQQA6AAAgAkEQahC3gICAAAwBCyACQgA3AwAgAiABNgIMIAIgBSACQQxqrYQ3AxggAkEQaiACI4GAgIAAQZWLwIAAaiACQRhqELWAgIAAIAItABAgAigCFBC2gICAACACELeAgIAACyACQSBqJICAgIAADwsgAiABNgIQIAIjhYCAgACtQiCGIAJBEGqthDcDGCOBgICAACIBQe2KwIAAaiACQRhqIAFB+JfBgABqEMCBgIAAAAuqAgEFfyOAgICAAEEQayIAJICAgIAAQQMhAQJAI4GAgIAAQZycwYAAai0AAEF/aiICQf8BcUEDSQ0AIABBBGojgYCAgABB3/zAgABqQQ4Q1oCAgABBAiECAkAgACgCBCIDQYCAgIB4Rg0AIAAoAgghBAJAAkACQAJAAkAgACgCDEF/ag4EAQICAAILIAQoAABB5uqx4wZHDQFBAiEBQQEhAiADDQMMBAsgBC0AAEEwRg0BC0EBIQFBACECIANFDQIMAQtBAyEBQQIhAiADRQ0BCyAEIANBARCpgICAAAsjgYCAgABBnJzB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IgcgBkEBajYCAAJAAkAgBygCBEUNACAFQQhqIAAgASgCFBGDgICAAICAgIAAIAUgBDoARSAFIAM6AEQgBSACNgJAIAUgBSkDCDcCOCOQgICAACICKAIEIAVBOGogAigCCCgCFBGDgICAAICAgIAADAELIAUgACABKAIUEYOAgIAAgICAgAAgBSAEOgBFIAUgAzoARCAFIAI2AkAgBSAFKQMANwI4IAVBOGoQ5oCAgAALI4GAgIAAQcCcwYAAakEAOgAAI5CAgIAAIgIgAigCAEF/ajYCAAJAIAMNACAFQgA3A0ggBUE4aiAFQcgAaiOBgICAAEG9/cCAAGpB2wAQtYCAgAAgBS0AOCAFKAI8ELaAgIAAIAVByABqELeAgIAADAELIAAgARC0gICAAAALELiAgIAAAAttAQJ/I5GAgIAAIgEgASgCACICQQFqNgIAQQAhAQJAIAJBAEgNAEEBIQEjgYCAgABBwJzBgABqLQAADQAjgYCAgAAiAUHAnMGAAGogADoAACABQbycwYAAaiIBIAEoAgBBAWo2AgBBAiEBCyABC60DAQN/I4CAgIAAQTBrIgEkgICAgABBAyECAkAgAC0ADQ0AQQEhAiOBgICAAEG8nMGAAGooAgBBAUsNABDhgICAAEH/AXEhAgsgASACOgAPIAEgACgCCDYCECABIAAoAgAgACgCBBDngICAACABIAEpAwA3AhQjgYCAgABBlJzBgABqLQAAIQAgASABQQ9qNgIkIAEgAUEUajYCICABIAFBEGo2AhwCQAJAAkAgAEUNACOBgICAACIAQZScwYAAakEBOgAAIABBkJzBgABqIgIoAgAhACACQQA2AgAgAA0BCyABQgA3AyggAUEcaiABQShqI4GAgIAAQdCXwYAAahDogICAACABQShqELeAgIAADAELI4GAgIAAIQIgAUEcaiAAQQhqEN+AgIAAIgNBBGogAkGYmMGAAGoQ6ICAgAAgA0EAOgAAIAJBlJzBgABqQQE6AAAgAkGQnMGAAGoiAygCACECIAMgADYCACABIAI2AiwgAUEBNgIoIAJFDQAgAiACKAIAIgBBf2o2AgAgAEEBRw0AIAFBKGpBBGoQ0oCAgAALIAFBMGokgICAgAAL8QECA38CfiOAgICAAEEQayIDJICAgIAAIAMgASACKAIMIgQRg4CAgACAgICAAEEE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KAIAQYCAgIB4Rg0AIAEgACgCBCAAKAIIEMqBgIAADwsgASgCACABKAIEIAAoAgwoAgAiACgCACAAKAIEELSBgIAACxsAIAAjgYCAgABB8JnBgABqNgIEIAAgATYCAAsMACAAIAEpAgA3AwALWwECfyABKAIEIQIgASgCACEDEKyAgIAAAkBBCEEEEKiAgIAAIgENAEEEQQgQq4GAgAAACyABIAI2AgQgASADNgIAIAAjgYCAgABB8JnBgABqNgIEIAAgATYCAAvEAQIDfwF+I4CAgIAAQSBrIgIkgICAgAACQCABKAIAQYCAgIB4Rw0AIAEoAgwhAyACQRRqQQhqIgRBADYCACACQoCAgIAQNwIUIAJBFGojgYCAgABB1JjBgABqIAMoAgAiAygCACADKAIEELSBgIAAGiACQQhqQQhqIAQoAgAiAzYCACACIAIpAhQiBTcDCCABQQhqIAM2AgAgASAFNwIACyAAIAE2AgAgACOBgICAAEGAmsGAAGo2AgQgAkEgaiSAgICAAAu0AgIDfwF+I4CAgIAAQTBrIgIkgICAgAACQCABKAIAQYCAgIB4Rw0AIAEoAgwhAyACQSRqQQhqIgRBADYCACACQoCAgIAQNwIkIAJBJGojgYCAgABB1JjBgABqIAMoAgAiAygCACADKAIEELSBgIAAGiACQRhqQQhqIAQoAgAiAzYCACACIAIpAiQiBTcDGCABQQhqIAM2AgAgASAFNwIACyABKQIAIQUgAUKAgICAEDcCACACQQhqQQhqIgMgAUEIaiIBKAIANgIAIAFBADYCACACIAU3AwgQrICAgAACQEEMQQQQqICAgAAiAQ0AQQRBDBCrgYCAAAALIAEgAikDCDcCACABQQhqIAMoAgA2AgAgACOBgICAAEGAmsGAAGo2AgQgACABNgIAIAJBMGokgICAgAALRwACQAJAAkAgAQ0AIANFDQEQrICAgAAgAyACEKiAgIAAIgINAQwCCyAAIAEgAiADEKqAgIAAIgJFDQELIAIPCxDYgICAAAALAgALTQEBfyOAgICAAEEQayICJICAgIAAIAEoAgAgAkEIahCDgICAACAAIAIoAgwiATYCCCAAIAIoAgg2AgQgACABNgIAIAJBEGokgICAgAALYQEBfyOAgICAAEEQayIEJICAgIAAIAEoAgAgAiADIARBBGoQhICA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QXxqIQIgAUF7aiEBA0AgAUEEaiEBQYCChAggAkEEaiICKAIAIgNrIANyQYCBgoR4cUGAgYKEeEYNAAsDQCABQQFqIQEgAi0AACEDIAJBAWohAiADDQALCyABIABrC4cBAQJ/AkAgAg0AQQAPCwJAAkAgAC0AACIDDQBBACEDDAELIABBAWohACACQX9qIQICQANAIANB/wFxIAEtAAAiBEcNASAERQ0BIAJBAEYNASACQX9qIQIgAUEBaiEBIAAtAAAhAyAAQQFqIQAgAw0AC0EAIQMLIANB/wFxIQMLIAMgAS0AAGsLDQAgASAAEL+AgIAAAAsUACAAKAIEIAAoAgggARC1gYCAAAsUACAAKAIEIAAoAgggARC6gYCAAAscAAJAIABFDQAgACABEKuBgIAAAAsQsYGAgAAAC+UBAQR/I4CAgIAAQRBrIgIkgICAgAACQAJAAkAgASgCACIDIAEoAggiBEcNACACQQRqIAQgASgCBCAEQQFqIgMQsIGAgAAgAigCBEEBRg0BIAEgAigCCDYCBAsgASgCBCIFIARqQQA6AAACQAJAIAMgBEEBaiIBSw0AIAUhBAwBCwJAIAENAEEBIQQgBSADQQEQqYCAgAAMAQsgBSADQQEgARCqgICAACIERQ0CCyAAIAE2AgQgACAENgIAIAJBEGokgICAgAAPCyACKAIIIAIoAgwQroGAgAAAC0EBIAEQroGAgAAAC5ABAAJAAkAgA0EATg0AQQEhAUEEIQJBACEDDAELAkACQAJAAkAgAUUNACACIAFBASADEKqAgIAAIQEMAQsCQCADDQBBASEBDAILEKyAgIAAIANBARCogICAACEBCyABDQBBASEBIABBATYCBAwBCyAAIAE2AgRBACEBC0EIIQILIAAgAmogAzYCACAAIAE2AgALJQEBfyOBgICAACIAQaT+wIAAakEjIABBlJvBgABqEMCBgIAAAAu1AwEFfyOAgICAAEEgayIDJICAgIAAQQAhBAJAAkACQCACQQFqIgVBAEgNABCsgICAAEEBIQQgBUEBEKiAgIAAIgZFDQACQCACRQ0AIAYgASAC/AoAAAsCQCACQQdLDQACQCACDQBBACEHQQAhBAwECwJAIAEtAAANAEEBIQRBACEHDAQLQQEhBCACQQFGDQICQCABLQABDQBBASEHDAQLQQIhByACQQJG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ASEGDAELAkAgBkGAEE8NAEECIQYMAQtBA0EEIAZBgIAESRshBgsgBSAHNgIgIAUgBiAHajYCJCAFI42AgIAAIgdBwYCAgABqrUIghiIIIAVBEGqthDcDSCAFIAggBUEIaq2ENwNAIAUgB0HCgICAAGqtQiCGIAVBIGqthDcDOCAFI5aAgIAArUIghiAFQRxqrYQ3AzAgBSOHgICAAK1CIIYgBUEYaq2ENwMoI4GAgIAAQdWAwIAAaiAFQShqIAQQwIGAgAAACxoAI4GAgIAAQayGwYAAakErIAAQx4GAgAAAC1UBAn9BASECAkAgACABELiBgIAADQAjgYCAgAAhAyABKAIAIANBm5PBgABqQQIgASgCBCgCDBGCgICAAICAgIAADQAgAEEEaiABELiBgIAAIQILIAIL3QIBBX9BACEBI4GAgIAAQdiGwYAAaiICIAJBAEEQIABBq50ESRsiAyADQQhyIgMgAiADQQJ0aigCAEELdCAAQQt0IgNLGyIEIARBBHIiBCACIARBAnRqKAIAQQt0IANLGyIEIARBAnIiBCACIARBAnRqKAIAQQt0IANLGyIEIARBAWoiBCACIARBAnRqKAIAQQt0IANLGyIEIARBAWoiBCACIARBAnRqKAIAQQt0IANLGyIEQQJ0aigCAEELdCICIANGIAIgA0lqIARqIgRBAnRqIgUoAgBBFXYhAkH/BSEDAkACQCAEQR9LDQAgBSgCBEEVdiEDIARFDQELIAVBfGooAgBB////AHEhAQsCQCADIAJBf3NqRQ0AIAAgAWshACADQX9qIQRBACEDA0AgAyOBgICAAEG1/sCAAGogAmotAABqIgMgAEsNASAEIAJBAWoiAkcNAAsLIAJBAXELzgcBB38CQAJAAkAgAEEgSQ0AAkAgAEH/AE8NAEEBIQEMAwsCQAJAIABBgIAESQ0AIABBgIAISQ0BIABB/v//AHEiAUGunQtHIABB4P//AHFB4M0KRyABQZ7wCkdxcSAAQZCodGpBcUlxIABBgJB0akHebElxIABBgIB0akGedElxIABBsNlzakF7SXEgAEGA/kdqQfrmVElxIABB8IM4SXEhAQwECyOBgICAAEGEjsGAAGoiAkECaiEBIABBCHZB/wFxIQNBACEEAkADQCABIQUgBCACLQABIgFqIQYCQAJAIAItAAAiAiADRg0A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cnMAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9hbGxvYy9zcmMvc3RyaW5nLnJzAGxpYnJhcnkvc3RkL3NyYy9wYW5pY2tpbmcucnMAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9hbGxvYy9zcmMvY29sbGVjdGlvbnMvYnRyZWUvbmF2aWdhdGUucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvc2VyZGVfanNvbi0xLjAuMTUwL3NyYy9pby9jb3JlLnJzAGxpYnJhcnkvY29yZS9zcmMvdW5pY29kZS9wcmludGFibGUucnMAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9hbGxvYy9zcmMvY29sbGVjdGlvbnMvYnRyZWUvbm9kZS5ycwBsaWJyYXJ5L2NvcmUvc3JjL2ZtdC9tb2QucnMAbGlicmFyeS9zdGQvc3JjL2lvL21vZC5ycwBsaWJyYXJ5L2FsbG9jL3NyYy9yYXdfdmVjL21vZC5ycwBsaWJyYXJ5L3N0ZC9zcmMvdGhyZWFkL2lkLnJzAGxpYnJhcnkvc3RkL3NyYy9hbGxvYy5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9pdG9hLTEuMC4xOC9zcmMvbGliLnJzABVtZW1vcnkgYWxsb2NhdGlvbiBvZiDADSBieXRlcyBmYWlsZWQALwAVbWVtb3J5IGFsbG9jYXRpb24gb2YgwEcgYnl0ZXMgZmFpbGVkCnNraXBwaW5nIGJhY2t0cmFjZSBwcmludGluZyB0byBhdm9pZCBwb3RlbnRpYWwgcmVjdXJzaW9uCgA1ZmF0YWwgcnVudGltZSBlcnJvcjogZmFpbGVkIHRvIGluaXRpYXRlIHBhbmljLCBlcnJvciDACywgYWJvcnRpbmcKABVtZW1vcnkgYWxsb2NhdGlvbiBvZiDADiBieXRlcyBmYWlsZWQKAAxwYW5pY2tlZCBhdCDAAjoKwDMKdGhyZWFkIHBhbmlja2VkIHdoaWxlIHByb2Nlc3NpbmcgcGFuaWMuIGFib3J0aW5nLgoACQp0aHJlYWQgJ8ADJyAowA4pIHBhbmlja2VkIGF0IMACOgrAAQoAGWFib3J0aW5nIGR1ZSB0byBwYW5pYyBhdCDAAjoKwAEKAGFzc2VydGlvbiBmYWlsZWQ6IGVkZ2UuaGVpZ2h0ID09IHNlbGYuaGVpZ2h0IC0gMWFzc2VydGlvbiBmYWlsZWQ6IHNyYy5sZW4oKSA9PSBkc3QubGVuKClhc3NlcnRpb24gZmFpbGVkOiBlZGdlLmhlaWdodCA9PSBzZWxmLm5vZGUuaGVpZ2h0IC0gMWZhbHNlYSBEaXNwbGF5IGltcGxlbWVudGF0aW9uIHJldHVybmVkIGFuIGVycm9yIHVuZXhwZWN0ZWRseUVycm9yTm90IGltcGxlbWVudGVkIGluIGFwcHJvdmVyLWFBcHByb3ZlciBBIChUcmVhc3VyeSk6IEV2YWx1YXRpbmcgcGF5b3V0IHJlcXVlc3QuLi5BcHByb3ZlciBBIChUcmVhc3VyeSk6IEFwcHJvdmVkc3RhdHVzcmVhc29uQWx3YXlzIGFwcHJvdmUgKFRyZWFzdXJ5IHBvbGljeSBtYXRjaGVzKUVPRiB3aGlsZSBwYXJzaW5nIGEgbGlzdEVPRiB3aGlsZSBwYXJzaW5nIGFuIG9iamVjdEVPRiB3aGlsZSBwYXJzaW5nIGEgc3RyaW5nRU9GIHdoaWxlIHBhcnNpbmcgYSB2YWx1ZWV4cGVjdGVkIGA6YGV4cGVjdGVkIGAsYCBvciBgXWBleHBlY3RlZCBgLGAgb3IgYH1gZXhwZWN0ZWQgaWRlbnRleHBlY3RlZCB2YWx1ZWV4cGVjdGVkIGAiYGludmFsaWQgZXNjYXBlaW52YWxpZCBudW1iZXJudW1iZXIgb3V0IG9mIHJhbmdlaW52YWxpZCB1bmljb2RlIGNvZGUgcG9pbnRjb250cm9sIGNoYXJhY3RlciAoXHUwMDAwLVx1MDAxRikgZm91bmQgd2hpbGUgcGFyc2luZyBhIHN0cmluZ2tleSBtdXN0IGJlIGEgc3RyaW5naW52YWxpZCB2YWx1ZTogZXhwZWN0ZWQga2V5IHRvIGJlIGEgbnVtYmVyIGluIHF1b3Rlc2Zsb2F0IGtleSBtdXN0IGJlIGZpbml0ZSAoZ290IE5hTiBvciArLy1pbmYpbG9uZSBsZWFkaW5nIHN1cnJvZ2F0ZSBpbiBoZXggZXNjYXBldHJhaWxpbmcgY29tbWF0cmFpbGluZyBjaGFyYWN0ZXJzdW5leHBlY3RlZCBlbmQgb2YgaGV4IGVzY2FwZXJlY3Vyc2lvbiBsaW1pdCBleGNlZWRlZHV1dXV1dXV1YnRudWZydXV1dXV1dXV1dXV1dXV1dXV1AAAiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwMTIzNDU2Nzg5YWJjZGVmaW50ZXJuYWwgZXJyb3I6IGVudGVyZWQgdW5yZWFjaGFibGUgY29kZQAwMDAxMDIwMzA0MDUwNjA3MDgwOTEwMTExMjEzMTQxNTE2MTcxODE5MjAyMTIyMjMyNDI1MjYyNzI4MjkzMDMxMzIzMzM0MzUzNjM3MzgzOTQwNDE0MjQzNDQ0NTQ2NDc0ODQ5NTA1MTUyNTM1NDU1NTY1NzU4NTk2MDYxNjI2MzY0NjU2NjY3Njg2OTcwNzE3MjczNzQ3NTc2Nzc3ODc5ODA4MTgyODM4NDg1ODY4Nzg4ODk5MDkxOTI5Mzk0OTU5Njk3OTg5OQMDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMB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ZSBleGhhdXN0ZWRtYWluPHVubmFtZWQ+Qm94PGR5biBBbnk+dGhyZWFkIGNhdXNlZCBub24tdW53aW5kaW5nIHBhbmljLiBhYm9ydGluZy4KZGVzY3JpcHRpb24oKSBpcyBkZXByZWNhdGVkOyB1c2UgRGlzcGxheQAAz7/iLKNb2rsBenekHsKxJ2NhcGFjaXR5IG92ZXJmbG93AHAABwAtAQEBAgECAQFICzAVEAFlBwIGAgIBBCMBHhtbCzoJCQEYBAEJAQMBBSsDOwkqGAEgNwEBAQQIBAEDBwoCHQE6AQEBAgQIAQkBCgIaAQICOQEEAgQCAgMDAR4CAwELAjkBBAUBAgQBFAIWBgEBOgEBAgEECAEHAwoCHgE7AQEBDAEJASgBAwE3AQEDBQMBBAcCCwIdAToBAgIBAQMDAQQHAgsCHAI5AgEBAgQIAQkBCgIdAUgBBAECAwEBCAFRAQIHDAhiAQIJCwdJAhsBAQEBATcOAQUBAgULASQJAWYEAQYBAgICGQIEAxAEDQECAgYBDwEAAwAEHAMdAh4CQAIBBwgBAgsJAS0DAQF1AiIBdgMEAgkBBgPbAgIBOgEBBwEBAQECCAYKAgEwLgIMFAQwCgQDJgkMAiAEAgY4AQECAwEBBTgIAgKYAwENAQcEAQYBAwLGQAABwyEAA40BYCAABmkCAAQBCiACUAIAAQMBBAEZAgUBlwIaEg0BJggZCwEBLAMwAQIEAgICASQBQwYCAgICDAEIAS8BMwEBAwICBQIBASoCCAHuAQIBBAEAAQAQEBAAAgAB4gGVBQADAQIFBCgDBAGlAgAEQQUAAk0GRgsxBHsBNg8pAQICCgMxBAICBwE9AyQFAQg+AQwCNAkBAQgEAgFfAwIEBgECAZ0BAwgVAjkCAQEBAQwBCQEOBwMFQwECBgEBAgEBAwQDAQEOAlUIAgMBARcBUQECBgEBAgEBAgEC6wECBAYCAQIbAlUIAgEBAmoBAQECCGUBAQECBAEFAAkBAvUBCgQEAZAEAgIEASAKKAYCBAgBCQYCAy4NAQLGAQEDAQHJBwEGAQFSFgIHAQIBAnoGAwEBAgEHAQFIAgMBAQEAAgsCNAUFAxcBAAEGDwAMAwMABTsHAAE/BFEBCwIAAgAuAhcABQMGCAgCBx4ElAMANwQyCAEOARYFAQ8ABwERAgcBAgEFZAGgBwAB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AAAAAAQAAAAEAAAANwAAADgAAAAMAAAABAAAADkAAAA4AAAADAAAAAQAAAA6AAAAOQAAALRMEAA7AAAAPAAAAD0AAAA7AAAAPgAAAAAAAAAIAAAABAAAAD8AAAAqAAAADAAAAAQAAABAAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAP////+TBRAAvQQQACAAAAAcAAAABQAAAIcEEAAbAAAAfgsAACYAAACHBBAAGwAAAIcLAAAaAAAAlAIQABsAAABXAgAABQAAAAUEEAAlAAAAGgAAADYAAAAFBBAAJQAAAAoAAAArAAAAkEkQAJJJEACUSRAAAJ2KAQRuYW1lABAPYXBwcm92ZXJfYS53YXNtAax72AEATl9aTjEwYXBwcm92ZXJfYTRob3N0MTBpbnRlcmZhY2VzN2xvZ2dpbmc0aW5mbzExd2l0X2ltcG9ydDIxN2hhMjY4ZWI1NzNhODFjZTcyRQF9X1pOOTBfJExUJHdhc2kuLmltcG9ydHMuLndhc2kuLmlvLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCR3YXNpLi5pbXBvcnRzLi5fcnQuLldhc21SZXNvdXJjZSRHVCQ0ZHJvcDRkcm9wMTdoZmZjNTk5NjhmMWU3NTQ5ZEUChgFfWk45OV8kTFQkd2FzaS4uaW1wb3J0cy4ud2FzaS4uaW8uLnN0cmVhbXMuLk91dHB1dFN0cmVhbSR1MjAkYXMkdTIwJHdhc2kuLmltcG9ydHMuLl9ydC4uV2FzbVJlc291cmNlJEdUJDRkcm9wNGRyb3AxN2gwMDBiNDEzNjFmMmM4ZmIyRQNWX1pONHdhc2k3aW1wb3J0czR3YXNpMmlvNWVycm9yNUVycm9yMTV0b19kZWJ1Z19zdHJpbmcxMXdpdF9pbXBvcnQxMTdoZjVjYzBkOGVlZDgzMWI4YkUEaV9aTjR3YXNpN2ltcG9ydHM0d2FzaTJpbzdzdHJlYW1zMTJPdXRwdXRTdHJlYW0yNGJsb2NraW5nX3dyaXRlX2FuZF9mbHVzaDExd2l0X2ltcG9ydDIxN2g1OTkxOWIzZGFjNTViNjJjRQVNX1pONHdhc2k3aW1wb3J0czR3YXNpM2NsaTZzdGRlcnIxMGdldF9zdGRlcnIxMXdpdF9pbXBvcnQwMTdoZmE4M2E2NWQ0MDUzZmE1YUUGKV9fd2FzbV9pbXBvcnRfZW52aXJvbm1lbnRfZ2V0X2Vudmlyb25tZW50BxdfX3dhc21faW1wb3J0X2V4aXRfZXhpdAgRX193YXNtX2NhbGxfY3RvcnMJnAJfWk41YWxsb2MxMWNvbGxlY3Rpb25zNWJ0cmVlNG5vZGUyMTBIYW5kbGUkTFQkYWxsb2MuLmNvbGxlY3Rpb25zLi5idHJlZS4ubm9kZS4uTm9kZVJlZiRMVCRhbGxvYy4uY29sbGVjdGlvbnMuLmJ0cmVlLi5ub2RlLi5tYXJrZXIuLk11dCRDJEskQyRWJEMkYWxsb2MuLmNvbGxlY3Rpb25zLi5idHJlZS4ubm9kZS4ubWFya2VyLi5MZWFmJEdUJCRDJGFsbG9jLi5jb2xsZWN0aW9ucy4uYnRyZWUuLm5vZGUuLm1hcmtlci4uRWRnZSRHVCQxNmluc2VydF9yZWN1cnNpbmcxN2g3NDI4MGYxOWY4NGU2OTdjRQpAX1pOMTBzZXJkZV9jb3JlM3NlcjEwU2VyaWFsaXplcjExY29sbGVjdF9zZXExN2g3NmRiMDZjOGY0ZjQzOTMxRQtaX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkN3Jlc2VydmUyMWRvX3Jlc2VydmVfYW5kX2hhbmRsZTE3aDg1YzA2MTU2ZDU4NDY1ZTFFDKMBX1pOMTBzZXJkZV9qc29uNXZhbHVlM3NlcjgxXyRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkOXNlcmlhbGl6ZTE3aDg4MWY2YTRkNWRhZWU5NzhFLmxsdm0uNzQ5NjcwMjU5ODQ0MjYxNDM0OA1GX1pOMTBzZXJkZV9jb3JlM3NlcjEyU2VyaWFsaXplTWFwMTVzZXJpYWxpemVfZW50cnkxN2g3ZmJkOTYwNzUyNDg5YjUwRQ47X1pOMTBzZXJkZV9qc29uM3NlcjE4Zm9ybWF0X2VzY2FwZWRfc3RyMTdoMWVmYWVmNmUwMjg2M2NhM0UPYV9aTjVhbGxvYzdyYXdfdmVjMjBSYXdWZWNJbm5lciRMVCRBJEdUJDExZmluaXNoX2dyb3cxN2g5Y2RkOTA1NTkzMDA1Nzk0RS5sbHZtLjc0OTY3MDI1OTg0NDI2MTQzNDgQV19aTjEwYXBwcm92ZXJfYTdleHBvcnRzNXN5bm9kNWFnZW50OWNvbnRyYWN0czIwX2V4cG9ydF9leGVjdXRlX2NhYmkxN2gwNzJmMGM2ODEyNTgxZmFiRRFYX1pOMTBhcHByb3Zlcl9hN2V4cG9ydHM1c3lub2Q1YWdlbnQ5Y29udHJhY3RzMjFfZXhwb3J0X2V2YWx1YXRlX2NhYmkxN2gzMTlhOGIyZDA3NTllOTAwRRJZX1pOMTBhcHByb3Zlcl9hN2V4cG9ydHM1c3lub2Q1YWdlbnQ5Y29udHJhY3RzMjJfZXhwb3J0X2dldF90cmFjZV9jYWJpMTdoOTQ1YzE0Nzk0MTJiYzI0YkUTXl9aTjEwYXBwcm92ZXJfYTdleHBvcnRzNXN5bm9kNWFnZW50OWNvbnRyYWN0czI3X2V4cG9ydF9jb21wb3NlX2FjdGlvbl9jYWJpMTdoMDc3NWU1NWNiYjMzZjY2ZEUUsQFfWk40Y29yZTNwdHIxMTdkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5jb2xsZWN0aW9ucy4uYnRyZWUuLm1hcC4uQlRyZWVNYXAkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEMkc2VyZGVfanNvbi4udmFsdWUuLlZhbHVlJEdUJCRHVCQxN2hhYTBjZjUwY2EyMDk1OWY4RS5sbHZtLjY1MTIzNjMyNjExMDkyOTMwNDIVZF9aTjcwXyRMVCRhbGxvYy4udmVjLi5WZWMkTFQkVCRDJEEkR1QkJHUyMCRhcyR1MjAkY29yZS4ub3BzLi5kcm9wLi5Ecm9wJEdUJDRkcm9wMTdoNTMyMTdkNzk0YWM5NjAyMUUWaF9aTjRjb3JlM3B0cjQ1ZHJvcF9pbl9wbGFjZSRMVCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkMTdoODg5ZWE5ZTdkMjkwMmI1OEUubGx2bS42NTEyMzYzMjYxMTA5MjkzMDQyF5oBX1pOOTlfJExUJGFsbG9jLi5jb2xsZWN0aW9ucy4uYnRyZWUuLm1hcC4uSW50b0l0ZXIkTFQkSyRDJFYkQyRBJEdUJCR1MjAkYXMkdTIwJGNvcmUuLm9wcy4uZHJvcC4uRHJvcCRHVCQ0ZHJvcDE3aDkxNDEyYWQ0OTZkMDRkNDJFLmxsdm0uNjUxMjM2MzI2MTEwOTI5MzA0Mhh/X1pONGNvcmUzcHRyNjhkcm9wX2luX3BsYWNlJExUJGFsbG9jLi52ZWMuLlZlYyRMVCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkJEdUJDE3aGZhNzBmZTkwYTkwOWE0ZmJFLmxsdm0uNjUxMjM2MzI2MTEwOTI5MzA0MhlWX1pONWFsbG9jMTFjb2xsZWN0aW9uczVidHJlZTNtYXAyNUJUcmVlTWFwJExUJEskQyRWJEMkQSRHVCQ2aW5zZXJ0MTdoNTA3Yzk4YzM2YzZlNjI4NkUaTV9aTjEwYXBwcm92ZXJfYTQwX19saW5rX2N1c3RvbV9zZWN0aW9uX2Rlc2NyaWJpbmdfaW1wb3J0czE3aDk1ZDZlYzE2YzMyNjA3ZWFFGzBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoYWE2YWJmMWJhOGU4YmIyNUUcTF9aTjRjb3JlM3B0cjQyZHJvcF9pbl9wbGFjZSRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckR1QkMTdoMzAzODVjN2I3MTIzYzI5Y0UdUl9aTjUzXyRMVCRjb3JlLi5mbXQuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMWI2NTUzNmNkMzNhMWUxY0UeX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhFH11fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoMDg4ZDI5NzI0MTk5ZGEzYkUghgFfWk45M18kTFQkYXBwcm92ZXJfYS4uQ29tcG9uZW50JHUyMCRhcyR1MjAkYXBwcm92ZXJfYS4uZXhwb3J0cy4uc3lub2QuLmFnZW50Li5jb250cmFjdHMuLkd1ZXN0JEdUJDE0Y29tcG9zZV9hY3Rpb24xN2g3NDA5N2IwNDAyNTViZTk2RSF/X1pOOTNfJExUJGFwcHJvdmVyX2EuLkNvbXBvbmVudCR1MjAkYXMkdTIwJGFwcHJvdmVyX2EuLmV4cG9ydHMuLnN5bm9kLi5hZ2VudC4uY29udHJhY3RzLi5HdWVzdCRHVCQ4ZXZhbHVhdGUxN2g0OGI0YTU3MTRjYjAyYjUxRSI0Y2FiaV9wb3N0X3N5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNjb21wb3NlLWFjdGlvbiMqc3lub2Q6YWdlbnQvY29udHJhY3RzQDEuMC4wI2NvbXBvc2UtYWN0aW9uJCRzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZXZhbHVhdGUlI3N5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNleGVjdXRlJiVzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZ2V0LXRyYWNlJ2xfWk43M18kTFQkc2VyZGVfanNvbi4ubnVtYmVyLi5OdW1iZXIkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZSRHVCQ5c2VyaWFsaXplMTdoMWViZGMyYmMxODg0YmNhMkUoKl9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzEyX19fcnVzdF9hbGxvYyksX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTRfX19ydXN0X2RlYWxsb2MqLF9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzE0X19fcnVzdF9yZWFsbG9jK0hfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGM0Ml9fX3J1c3RfYWxsb2NfZXJyb3JfaGFuZGxlcl9zaG91bGRfcGFuaWNfdjIsQV9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzM1X19fcnVzdF9ub19hbGxvY19zaGltX2lzX3Vuc3RhYmxlX3YyLWBfWk42N18kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yQ29kZSR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZWZhOTllM2UxZmU0YTNjNEUuXF9aTjYzXyRMVCRzZXJkZV9qc29uLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGU4NjkyNDNkZDdlMzEyOTFFL15fWk42NV8kTFQkc2VyZGVfanNvbi4uaW8uLmltcC4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDYxOGQ1NjhhMGI1MTJhMTBFMENfWk4zOF8kTFQkdTY0JHUyMCRhcyR1MjAkaXRvYS4uVW5zaWduZWQkR1QkM2ZtdDE3aDQxOWI4ODlhNzFiMGMwMmNFMVxfWk40NV8kTFQkZjY0JHUyMCRhcyR1MjAkem1pai4ucHJpdmF0ZS4uU2VhbGVkJEdUJDIwd3JpdGVfdG9fem1pal9idWZmZXIxN2hiNGQzNWFhNTlkM2M2YWI0RTI3X1pOMTF3aXRfYmluZGdlbjJydDE0cnVuX2N0b3JzX29uY2UxN2hkMGI2NjlmM2I2NTU5OGQxRTMwX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMThfX19ydXN0X3N0YXJ0X3BhbmljNCdfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxMHJ1c3RfcGFuaWM1Ll9aTjNzdGQyaW81V3JpdGU5d3JpdGVfZm10MTdoMGE4NzIwZGFmOTUyZmRjM0U2c19aTjRjb3JlM3B0cjgxZHJvcF9pbl9wbGFjZSRMVCRjb3JlLi5yZXN1bHQuLlJlc3VsdCRMVCQkTFAkJFJQJCRDJHN0ZC4uaW8uLmVycm9yLi5FcnJvciRHVCQkR1QkMTdoN2ZjZGRjMWU1ZWE1NTJhZEU3Vl9aTjRjb3JlM3B0cjUyZHJvcF9pbl9wbGFjZSRMVCRzdGQuLnN5cy4uc3RkaW8uLndhc2lwMi4uU3RkZXJyJEdUJDE3aDEwMzEwNzVhYTNkOTEyNmVFOClfWk4zc3RkN3Byb2Nlc3M1YWJvcnQxN2g5ZDQzY2QyMjBiNjAwNGFkRTkpX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTFfX19yZGxfYWxsb2M6Kl9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzEyX19fcnVzdF9hYm9ydDsrX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTNfX19yZGxfZGVhbGxvYzwrX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTNfX19yZGxfcmVhbGxvYz0uX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTdydXN0X2JlZ2luX3Vud2luZD5FX1pOM3N0ZDNzeXM5YmFja3RyYWNlMjZfX3J1c3RfZW5kX3Nob3J0X2JhY2t0cmFjZTE3aGViY2VhNDkyOTM0OWY0Y2FFPzhfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMyNl9fX3J1c3RfYWxsb2NfZXJyb3JfaGFuZGxlckAqX1pOM3N0ZDVhbGxvYzhydXN0X29vbTE3aGU5OGE4ZjBmMWJjYjY1NDJFQUVfWk4zNl8kTFQkVCR1MjAkYXMkdTIwJGNvcmUuLmFueS4uQW55JEdUJDd0eXBlX2lkMTdoOWYwNjQzZWNjMGRmOWUzYkVCRV9aTjM2XyRMVCRUJHUyMCRhcyR1MjAkY29yZS4uYW55Li5BbnkkR1QkN3R5cGVfaWQxN2hhMDNkYjg0Njc4ZDU2ZDFkRUNJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hhZDhjOWVlZTM2NzIyMTViRURaX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkN3Jlc2VydmUyMWRvX3Jlc2VydmVfYW5kX2hhbmRsZTE3aDI0N2ZjMDA5MDZkYjg3MWNFRUhfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQxMWZpbmlzaF9ncm93MTdoNzNlNTEyODYwODQyMjRiYkVGLl9aTjNzdGQyaW81ZXJyb3I1RXJyb3IzbmV3MTdoZmE1ZTMyOTUzMThmYWQxNkVHN19aTjNzdGQyaW81V3JpdGUxN2lzX3dyaXRlX3ZlY3RvcmVkMTdoYjBmZDE3Y2QzNjA2MDViY0VIOF9aTjNzdGQyaW81V3JpdGUxOHdyaXRlX2FsbF92ZWN0b3JlZDE3aDk1NzA4NDA1MjU5ZTVmZWNFSS5fWk4zc3RkMmlvNVdyaXRlOXdyaXRlX2FsbDE3aDk3ZTU4M2RhYzY3ZjJkZTVFSi5fWk4zc3RkMmlvNVdyaXRlOXdyaXRlX2ZtdDE3aDVjZTZmZjJkZjIyODc2Y2VFSy5fWk4zc3RkMmlvNVdyaXRlOXdyaXRlX2ZtdDE3aDhjNGUzODRkN2M1ZTRiZGFFTIABX1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQxNHdyaXRlX3ZlY3RvcmVkMTdoOThiZDE1OWFmMTMyMzM0MUVNgwFfWk4zc3RkMmlvNWltcGxzNzRfJExUJGltcGwkdTIwJHN0ZC4uaW8uLldyaXRlJHUyMCRmb3IkdTIwJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRDJEEkR1QkJEdUJDE3aXNfd3JpdGVfdmVjdG9yZWQxN2gzODQ1Y2U4MTJkZmYzYWRiRU6EAV9aTjNzdGQyaW81aW1wbHM3NF8kTFQkaW1wbCR1MjAkc3RkLi5pby4uV3JpdGUkdTIwJGZvciR1MjAkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEMkQSRHVCQkR1QkMTh3cml0ZV9hbGxfdmVjdG9yZWQxN2gxNjY3NWUxNmIzYjRiNjBiRU92X1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQ1Zmx1c2gxN2g0NTNkNDFiOGJhZGE1ZmY0RVB2X1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQ1d3JpdGUxN2g2NTkwYjdlYTdiNjA1MzRkRVF6X1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQ5d3JpdGVfYWxsMTdoYTQyNWJmODJkYmM3NjM0OUVSPl9aTjVhbGxvYzRzeW5jMTZBcmMkTFQkVCRDJEEkR1QkOWRyb3Bfc2xvdzE3aDBmZTgxY2NkNzk4NGIzMDlFUzVfWk40Y29yZTlwYW5pY2tpbmcxM2Fzc2VydF9mYWlsZWQxN2hiMjAyYzNkNDJiYzgxYzk2RVQ8X1pOM3N0ZDZ0aHJlYWQyaWQ4VGhyZWFkSWQzbmV3OWV4aGF1c3RlZDE3aDIxMWI5Zjc5ZmIzOTcxZTFFVSxfWk4zc3RkM2VudjExY3VycmVudF9kaXIxN2g2YWIzMDk0OTM1YmIwYTk0RVYnX1pOM3N0ZDNlbnY3X3Zhcl9vczE3aDBmYWFmMDI0MmNhMzQwZjJFV1RfWk4zc3RkM3N5czNwYWw2Y29tbW9uMTRzbWFsbF9jX3N0cmluZzI0cnVuX3dpdGhfY3N0cl9hbGxvY2F0aW5nMTdoMzY2ZjA0MDI1OGQ0NzI3ZkVYQl9aTjNzdGQzc3lzM3BhbDZ3YXNpcDI3aGVscGVyczE0YWJvcnRfaW50ZXJuYWwxN2gwZTJlNjdmMjQ3Mzg5MWNiRVk+X1pOM3N0ZDNzeXM5YmFja3RyYWNlMTNCYWNrdHJhY2VMb2NrNXByaW50MTdoMjA4ZGY4MjRhNTA3ZDk2YUVaf19aTjk4XyRMVCRzdGQuLnN5cy4uYmFja3RyYWNlLi5CYWNrdHJhY2VMb2NrLi5wcmludC4uRGlzcGxheUJhY2t0cmFjZSR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZGI4NWE0ZWRmZmMwMzc5YUVbRV9aTjNzdGQzc3lzOWJhY2t0cmFjZTI2X19ydXN0X2VuZF9zaG9ydF9iYWNrdHJhY2UxN2g4ODAzNmU2NThjOTkxNDhjRVxIX1pOM3N0ZDVhbGxvYzhydXN0X29vbTI4XyR1N2IkJHU3YiRjbG9zdXJlJHU3ZCQkdTdkJDE3aGE4YzQ5OWExOWYxZTE1ZjBFXVJfWk4zc3RkOXBhbmlja2luZzEzcGFuaWNfaGFuZGxlcjI4XyR1N2IkJHU3YiRjbG9zdXJlJHU3ZCQkdTdkJDE3aDNhMzllNzBiM2RjYmE3MjVFXi5fWk4zc3RkM3N5czliYWNrdHJhY2U0bG9jazE3aDNiNWQ2YzVkOGQyNzE5NjJFX0JfWk4zc3RkNHN5bmM2cG9pc29uNW11dGV4MTRNdXRleCRMVCRUJEdUJDRsb2NrMTdoMzBjZjQwODQ0YjUyMmZmNkVgO19aTjNzdGQ1YWxsb2MyNGRlZmF1bHRfYWxsb2NfZXJyb3JfaG9vazE3aGVhNWNkZTFkNDNmZDA0MzJFYTZfWk4zc3RkNXBhbmljMTlnZXRfYmFja3RyYWNlX3N0eWxlMTdoNmM4ZTg4MDlhNTQ0Y2Y1ZkViW19aTjNzdGQ2dGhyZWFkN2N1cnJlbnQxN3dpdGhfY3VycmVudF9uYW1lMjhfJHU3YiQkdTdiJGNsb3N1cmUkdTdkJCR1N2QkMTdoNDczZTIwZWVmZjFiMTE5ZkVjSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoYjFmMzU1NjI5Njc0NTliY0VkNl9aTjNzdGQ5cGFuaWNraW5nMTVwYW5pY193aXRoX2hvb2sxN2hiNTNmYjg5Mjc1ZmZiNjVjRWU7X1pOM3N0ZDlwYW5pY2tpbmcxMXBhbmljX2NvdW50OGluY3JlYXNlMTdoZWZhNzBhNmUwYTZlMGMzNkVmM19aTjNzdGQ5cGFuaWNraW5nMTJkZWZhdWx0X2hvb2sxN2g5ZmM0MTVlNTRkM2IwZTdmRWc1X1pOM3N0ZDlwYW5pY2tpbmcxNHBheWxvYWRfYXNfc3RyMTdoMTUzNmQwMzZkMzM4NWEzMEVoUV9aTjNzdGQ5cGFuaWNraW5nMTJkZWZhdWx0X2hvb2syOF8kdTdiJCR1N2IkY2xvc3VyZSR1N2QkJHU3ZCQxN2gxZjZlZjNiMThjMTZjMmQ4RWlRX1pONTJfJExUJCRSRiRtdXQkdTIwJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDA1ZDdjOTFmMGE1MzNjZDNFakdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hmZmQ1OWMwNTFiM2I1NzNkRWsyX1pONGNvcmUzZm10NVdyaXRlMTB3cml0ZV9jaGFyMTdoM2RmZDVjN2RmMDA1NDE3NUVsMl9aTjRjb3JlM2ZtdDVXcml0ZTEwd3JpdGVfY2hhcjE3aDNmODc1M2EzZDliYWQzOGVFbTJfWk40Y29yZTNmbXQ1V3JpdGUxMHdyaXRlX2NoYXIxN2hiMGY5OWM4YzVjY2RhMTQ0RW4wX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aDNhZTkyMzI0NjM5MDdlZmVFbzBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoNmYwYzk0MzY3YzNmZjQxNkVwMF9aTjRjb3JlM2ZtdDVXcml0ZTl3cml0ZV9mbXQxN2g4MmFjMjQ1NDVjODliMDJhRXEwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aGIzNzhhNTk1YTc3Nzc1MGNFcpoBX1pONGNvcmUzcHRyMTE5ZHJvcF9pbl9wbGFjZSRMVCRzdGQuLmlvLi5kZWZhdWx0X3dyaXRlX2ZtdC4uQWRhcHRlciRMVCRzdGQuLmlvLi5jdXJzb3IuLkN1cnNvciRMVCQkUkYkbXV0JHUyMCQkdTViJHU4JHU1ZCQkR1QkJEdUJCRHVCQxN2g5MzJmZTIxYTI4ZmI5ODk4RXORAl9aTjRjb3JlM3B0cjIzOGRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLmJveGVkLi5jb252ZXJ0Li4kTFQkaW1wbCR1MjAkY29yZS4uY29udmVydC4uRnJvbSRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckR1QkJHUyMCRmb3IkdTIwJGFsbG9jLi5ib3hlZC4uQm94JExUJGR5biR1MjAkY29yZS4uZXJyb3IuLkVycm9yJHUyYiRjb3JlLi5tYXJrZXIuLlNlbmQkdTJiJGNvcmUuLm1hcmtlci4uU3luYyRHVCQkR1QkLi5mcm9tLi5TdHJpbmdFcnJvciRHVCQxN2gwYmI0NDA2MzliYzc2NjkzRXRMX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2g5NzRkZmI1NDJlNDk0MDlmRXVQX1pONGNvcmUzcHRyNDZkcm9wX2luX3BsYWNlJExUJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRHVCQkR1QkMTdoZjc1YmE3NjQxNzE1NDk4N0V2aV9aTjRjb3JlM3B0cjcxZHJvcF9pbl9wbGFjZSRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uRm9ybWF0U3RyaW5nUGF5bG9hZCRHVCQxN2gzNzdiZGJhMzdkYTNlNmI0RXc1X1pONGNvcmU1ZXJyb3I1RXJyb3IxMWRlc2NyaXB0aW9uMTdoZjgxOWI1YjM0ZWZmNGRiN0V4Ll9aTjRjb3JlNWVycm9yNUVycm9yNWNhdXNlMTdoYjA4Y2IzNDhjNzMxMTY0ZEV5MF9aTjRjb3JlNWVycm9yNUVycm9yN3Byb3ZpZGUxN2hkNjBjMGRiYzQxYWJiYWEwRXowX1pONGNvcmU1ZXJyb3I1RXJyb3I3dHlwZV9pZDE3aDhkOTMzMDIxZGJlYzM2MzlFezdfWk40Y29yZTVwYW5pYzEyUGFuaWNQYXlsb2FkNmFzX3N0cjE3aDk4ODk0MTJjMmU0ZThlNjBFfF9fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2gwMDUxZTZhZjdhNzUxZWY4RX1dX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aDA4OGQyOTcyNDE5OWRhM2JFfmVfWk42MF8kTFQkc3RkLi5pby4uc3RkaW8uLlN0ZGVyclJhdyR1MjAkYXMkdTIwJHN0ZC4uaW8uLldyaXRlJEdUJDE0d3JpdGVfdmVjdG9yZWQxN2hmZWE4MDY1Njk1NzBkY2EyRX9hX1pONjZfJExUJHN0ZC4uc3lzLi5zdGRpby4ud2FzaXAyLi5TdGRlcnIkdTIwJGFzJHUyMCRzdGQuLmlvLi5Xcml0ZSRHVCQ1d3JpdGUxN2g5YzFmMGM1YTkwNzA2MWFiRYABYV9aTjY2XyRMVCRzdGQuLnN5cy4uc3RkaW8uLndhc2lwMi4uU3RkZXJyJHUyMCRhcyR1MjAkc3RkLi5pby4uV3JpdGUkR1QkNWZsdXNoMTdoNWM4NjQ0NzI3MTFjMjQ2N0WBAXRfWk44MV8kTFQkc3RkLi5pby4uZGVmYXVsdF93cml0ZV9mbXQuLkFkYXB0ZXIkTFQkVCRHVCQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2hhMTk4NWRmMWRhOGU2OWMyRYIBdF9aTjgxXyRMVCRzdGQuLmlvLi5kZWZhdWx0X3dyaXRlX2ZtdC4uQWRhcHRlciRMVCRUJEdUJCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aGJkYWQ4ZDRiNjkxNWFhNTJFgwF0X1pOODFfJExUJHN0ZC4uaW8uLmRlZmF1bHRfd3JpdGVfZm10Li5BZGFwdGVyJExUJFQkR1QkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoY2RjYzE5ZDZkODA3MDU3ZEWEAXNfWk44Nl8kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLlN0YXRpY1N0clBheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGU4OGVlNjMzYmI3NzgzMzFFhQF2X1pOODlfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5Gb3JtYXRTdHJpbmdQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hlY2M1ZTMzNWM0ZTY1ZDg5RYYBel9aTjkzXyRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uU3RhdGljU3RyUGF5bG9hZCR1MjAkYXMkdTIwJGNvcmUuLnBhbmljLi5QYW5pY1BheWxvYWQkR1QkM2dldDE3aDMxMmUyNTY4MWJkYTg2YmZFhwF9X1pOOTNfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5TdGF0aWNTdHJQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4ucGFuaWMuLlBhbmljUGF5bG9hZCRHVCQ2YXNfc3RyMTdoNTM4N2YxMjIwMGI1ZjgzOEWIAX9fWk45M18kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLlN0YXRpY1N0clBheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5wYW5pYy4uUGFuaWNQYXlsb2FkJEdUJDh0YWtlX2JveDE3aGE1YjA2MmJiMzkxNWE5ZTFFiQF9X1pOOTZfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5Gb3JtYXRTdHJpbmdQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4ucGFuaWMuLlBhbmljUGF5bG9hZCRHVCQzZ2V0MTdoOTM0NDU5YTk3MGJmNTgyM0WKAYIBX1pOOTZfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5Gb3JtYXRTdHJpbmdQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4ucGFuaWMuLlBhbmljUGF5bG9hZCRHVCQ4dGFrZV9ib3gxN2hiZmE1ODFmZDUzNjZhMjA4RYsBDGNhYmlfcmVhbGxvY4wBTF9aTjR3YXNpNXByb3h5NDBfX2xpbmtfY3VzdG9tX3NlY3Rpb25fZGVzY3JpYmluZ19pbXBvcnRzMTdoZDE3NWNhY2YzMjk5NmRkZEWNAUlfWk40d2FzaTdpbXBvcnRzNHdhc2kyaW81ZXJyb3I1RXJyb3IxNXRvX2RlYnVnX3N0cmluZzE3aGJmOTkzMmViNjVmNDhiNmRFjgFcX1pONHdhc2k3aW1wb3J0czR3YXNpMmlvN3N0cmVhbXMxMk91dHB1dFN0cmVhbTI0YmxvY2tpbmdfd3JpdGVfYW5kX2ZsdXNoMTdoMDczZTY5NmQ1MzYyOGE3OEWPAUBfWk40d2FzaTdpbXBvcnRzNHdhc2kzY2xpNnN0ZGVycjEwZ2V0X3N0ZGVycjE3aDk2ZjZkNDY4M2ExNmMzMzNFkAEGbWFsbG9jkQEIZGxtYWxsb2OSAQ1wcmVwZW5kX2FsbG9jkwEEZnJlZZQBBmRsZnJlZZUBBmNhbGxvY5YBB3JlYWxsb2OXAQ1kaXNwb3NlX2NodW5rmAEOcG9zaXhfbWVtYWxpZ26ZARFpbnRlcm5hbF9tZW1hbGlnbpoBBV9FeGl0mwEZX193YXNpbGliY19lbnN1cmVfZW52aXJvbpwBHV9fd2FzaWxpYmNfaW5pdGlhbGl6ZV9lbnZpcm9unQEFYWJvcnSeAQZnZXRjd2SfAQRzYnJroAEld2FzaXAyX2xpc3RfdHVwbGUyX3N0cmluZ19zdHJpbmdfZnJlZaEBG2Vudmlyb25tZW50X2dldF9lbnZpcm9ubWVudKIBCWV4aXRfZXhpdKMBBmdldGVudqQBBm1lbWNtcKUBC19fc3RyY2hybnVspgEIX19zdHBjcHmnAQZzdHJjcHmoAQZzdHJkdXCpAQZzdHJsZW6qAQdzdHJuY21wqwE3X1pONWFsbG9jNWFsbG9jMThoYW5kbGVfYWxsb2NfZXJyb3IxN2hhZmZlYjIzNjJhYjQ3MDZhRawBnAJfWk4yNTRfJExUJGFsbG9jLi5ib3hlZC4uY29udmVydC4uJExUJGltcGwkdTIwJGNvcmUuLmNvbnZlcnQuLkZyb20kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJCR1MjAkZm9yJHUyMCRhbGxvYy4uYm94ZWQuLkJveCRMVCRkeW4kdTIwJGNvcmUuLmVycm9yLi5FcnJvciR1MmIkY29yZS4ubWFya2VyLi5TZW5kJHUyYiRjb3JlLi5tYXJrZXIuLlN5bmMkR1QkJEdUJC4uZnJvbS4uU3RyaW5nRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hhMmM4ODIyYjA4MDRhNTBhRa0BngJfWk4yNTZfJExUJGFsbG9jLi5ib3hlZC4uY29udmVydC4uJExUJGltcGwkdTIwJGNvcmUuLmNvbnZlcnQuLkZyb20kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJCR1MjAkZm9yJHUyMCRhbGxvYy4uYm94ZWQuLkJveCRMVCRkeW4kdTIwJGNvcmUuLmVycm9yLi5FcnJvciR1MmIkY29yZS4ubWFya2VyLi5TZW5kJHUyYiRjb3JlLi5tYXJrZXIuLlN5bmMkR1QkJEdUJC4uZnJvbS4uU3RyaW5nRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGVkNzAyYTgyNmVkNjYxOTRFrgEzX1pONWFsbG9jN3Jhd192ZWMxMmhhbmRsZV9lcnJvcjE3aGMzMTAzMjBhZTA1NjhkYjFFrwFEX1pONWFsbG9jM2ZmaTVjX3N0cjdDU3RyaW5nMTlfZnJvbV92ZWNfdW5jaGVja2VkMTdoNWI5OTNjMmIxYzk5MDExOUWwAUhfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQxMWZpbmlzaF9ncm93MTdoZTQ5MmRkNzAzYTE0NWE1ZkWxAThfWk41YWxsb2M3cmF3X3ZlYzE3Y2FwYWNpdHlfb3ZlcmZsb3cxN2g0Njc5OWVhY2YxNWNmZjgzRbIBeV9aTjgxXyRMVCQkUkYkJHU1YiR1OCR1NWQkJHUyMCRhcyR1MjAkYWxsb2MuLmZmaS4uY19zdHIuLkNTdHJpbmcuLm5ldy4uU3BlY05ld0ltcGwkR1QkMTNzcGVjX25ld19pbXBsMTdoZDIwMjg1Y2EyY2FhYzhhM0WzAUZfWk40MV8kTFQkY2hhciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDBmODE1NGViMjRlMzhiNzRFtAEmX1pONGNvcmUzZm10NXdyaXRlMTdoZGZiMDFjYTIwYjNmMTRhMEW1AUVfWk40MF8kTFQkc3RyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoOTZmNmYyYjgxYWUzOTcwY0W2AVNfWk40Y29yZTRjaGFyN21ldGhvZHMyMl8kTFQkaW1wbCR1MjAkY2hhciRHVCQxNmVzY2FwZV9kZWJ1Z19leHQxN2g4ZmQxNGJjNDgzZDg2NmJkRbcBMl9aTjRjb3JlM3N0cjE2c2xpY2VfZXJyb3JfZmFpbDE3aDUzOGViY2E5ZDAyNDUyZTJFuAFcX1pONGNvcmUzZm10M251bTUwXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRlYnVnJHUyMCRmb3IkdTIwJHUzMiRHVCQzZm10MTdoM2Q1ZGQ2NjUxMjIwYzRjOEW5AUdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hlNzZiYTNhOGQzN2JkZDc0RboBR19aTjQyXyRMVCRzdHIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDEzNTc3NGJjYzY3M2YwOGNFuwEuX1pONGNvcmUzZm10OUZvcm1hdHRlcjNwYWQxN2gzNjliMDJjMTQ3OWFhNjVkRbwBSF9aTjQzXyRMVCRib29sJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g5OGFjZWZlYmViMDgxNWJkRb0BSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoMGY2MjlhZDYxMWI3N2QwOUW+AUtfWk40Y29yZTNmbXQzbnVtM2ltcDIxXyRMVCRpbXBsJHUyMCR1MzIkR1QkMTBfZm10X2lubmVyMTdoNzhlYzZjMDU5MjQ1ZWNjMkW/AThfWk40Y29yZTNmbXQ5Rm9ybWF0dGVyMTJwYWRfaW50ZWdyYWwxN2hiNzM5YTI5MDY2ZDE5MjE4RcABMF9aTjRjb3JlOXBhbmlja2luZzlwYW5pY19mbXQxN2hmZThiZjdmOTNlOTI1ZjFiRcEBQF9aTjRjb3JlM2ZmaTVjX3N0cjRDU3RyMTlmcm9tX2J5dGVzX3dpdGhfbnVsMTdoNGYwNDdlNjZjM2QyMmFmNkXCATpfWk40Y29yZTlwYW5pY2tpbmcxOHBhbmljX2JvdW5kc19jaGVjazE3aDYxZWQ3NWJmZGIyYmYzOWJFwwFLX1pONGNvcmUzZm10M251bTNpbXAyMV8kTFQkaW1wbCR1MjAkdTY0JEdUJDEwX2ZtdF9pbm5lcjE3aDA3YWNkNDI2NjcyZjFkMWRFxAFiX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHUzMiRHVCQzZm10MTdoMWM3Mjg0ZGYwYzAzM2U4Y0XFAWJfWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTY0JEdUJDNmbXQxN2hhOGZkODNjZDM1MDkxYTQ1RcYBOl9aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsMTdoNGMxOTI0MzIwNWRmOTM3OEXHASxfWk40Y29yZTlwYW5pY2tpbmc1cGFuaWMxN2g2MDk3MTcxODQ1MzIxNTVhRcgBRl9aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIxMnBhZF9pbnRlZ3JhbDEyd3JpdGVfcHJlZml4MTdoMzAxNGMyMjFkYjJjNjliOUXJATZfWk40Y29yZTNzdHI1Y291bnQxNGRvX2NvdW50X2NoYXJzMTdoMzkxZTE5ZjIyYzBhODNjNUXKATRfWk40Y29yZTNmbXQ5Rm9ybWF0dGVyOXdyaXRlX3N0cjE3aGE0MjMyYWFkZGI1NjE0MTNFywE1X1pONGNvcmUzc3RyMTlzbGljZV9lcnJvcl9mYWlsX3J0MTdoMzQwYWY1N2MyZGJkMzlmM0XMATJfWk40Y29yZTZvcHRpb24xM3Vud3JhcF9mYWlsZWQxN2g2ZmRiMjUzY2QyOWUwMDgwRc0BZF9aTjcxXyRMVCRjb3JlLi5vcHMuLnJhbmdlLi5SYW5nZSRMVCRJZHgkR1QkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoODlkYTAzZDVlOTAxZjExM0XOAVBfWk40Y29yZTd1bmljb2RlMTJ1bmljb2RlX2RhdGExNWdyYXBoZW1lX2V4dGVuZDExbG9va3VwX3Nsb3cxN2hkN2IxNzUzZTk4Y2ZkM2JkRc8BPF9aTjRjb3JlN3VuaWNvZGU5cHJpbnRhYmxlMTJpc19wcmludGFibGUxN2gwYmY1MWZkNmRjZTNlNjMyRdABS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2gzMTE3NGMyMjE0YzA4ZWI4RdEBS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2gyYWI0MGZkMzIwOGY5ZjRlRdIBS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2g0OGUwY2ZhOTE3MmFlYzI5RdMBOV9aTjRjb3JlNXNsaWNlNm1lbWNocjE0bWVtY2hyX2FsaWduZWQxN2gyNmNjMGI1YTI1MDc5NTIyRdQBMl9aTjRjb3JlNnJlc3VsdDEzdW53cmFwX2ZhaWxlZDE3aGNjMjVjNDIwZDJiYzI4YTJF1QE7X1pONGNvcmU5cGFuaWNraW5nMTlhc3NlcnRfZmFpbGVkX2lubmVyMTdoYjFiN2MwZjliNzU2ODkxZkXWAVhfWk41OV8kTFQkY29yZS4uZm10Li5Bcmd1bWVudHMkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDZiYmNhMGJiNTU4NWE5YzZF1wEIX19tdWx0aTMHwQ4YAA9fX3N0YWNrX3BvaW50ZXIBH0dPVC5kYXRhLmludGVybmFsLl9fbWVtb3J5X2Jhc2UCQEdPVC5kYXRhLmludGVybmFsLl9aTjEwc2VyZGVfanNvbjNzZXI2RVNDQVBFMTdoNzc3M2ExYjFkZThmZjM3ZEUDYkdPVC5kYXRhLmludGVybmFsLl9aTjEwc2VyZGVfanNvbjNzZXI5Rm9ybWF0dGVyMTd3cml0ZV9jaGFyX2VzY2FwZTEwSEVYX0RJR0lUUzE3aGZkMjFjODFiOTUwMDVkZDdFBF1HT1QuZGF0YS5pbnRlcm5hbC5fWk4xMGFwcHJvdmVyX2E3ZXhwb3J0czVzeW5vZDVhZ2VudDljb250cmFjdHM5X1JFVF9BUkVBMTdoOGE1OWNhNWYyMDI2MmU5YkUFdkdPVC5mdW5jLmludGVybmFsLl9aTjRjb3JlM2ZtdDNudW0zaW1wNTRfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCR1c2l6ZSRHVCQzZm10MTdoYjY1ZDY5YzU3NGQ3NjU4ZUUGckdPVC5mdW5jLmludGVybmFsLl9aTjY3XyRMVCRzZXJkZV9qc29uLi5lcnJvci4uRXJyb3JDb2RlJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hlZmE5OWUzZTFmZTRhM2M0RQd0R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHUzMiRHVCQzZm10MTdoMWM3Mjg0ZGYwYzAzM2U4Y0UIF0dPVC5kYXRhLmludGVybmFsLmVycm5vCZEBR09ULmZ1bmMuaW50ZXJuYWwuX1pOOThfJExUJHN0ZC4uc3lzLi5iYWNrdHJhY2UuLkJhY2t0cmFjZUxvY2suLnByaW50Li5EaXNwbGF5QmFja3RyYWNlJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hkYjg1YTRlZGZmYzAzNzlhRQo4R09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDVhbGxvYzRIT09LMTdoYzczYTIwNTNlNzJiM2IxOEULTUdPVC5mdW5jLmludGVybmFsLl9aTjNzdGQ1YWxsb2MyNGRlZmF1bHRfYWxsb2NfZXJyb3JfaG9vazE3aGVhNWNkZTFkNDNmZDA0MzJFDI0BR09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDRzeW5jNG1wbWM1d2FrZXIxN2N1cnJlbnRfdGhyZWFkX2lkNURVTU1ZMjhfJHU3YiQkdTdiJGNsb3N1cmUkdTdkJCR1N2QkMjNfX1JVU1RfU1REX0lOVEVSTkFMX1ZBTDE3aDU1MmE0YThmNzFlMTliYjBFDR5HT1QuZGF0YS5pbnRlcm5hbC5fX3RhYmxlX2Jhc2UOQkdPVC5kYXRhLmludGVybmFsLl9aTjNzdGQ2dGhyZWFkN2N1cnJlbnQyaWQySUQxN2hhNzhhMmY4MmVlYjYxNDczRQ90R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHU2NCRHVCQzZm10MTdoYThmZDgzY2QzNTA5MWE0NUUQPEdPVC5kYXRhLmludGVybmFsLl9aTjNzdGQ5cGFuaWNraW5nNEhPT0sxN2g3OTc4YmRhMWZlNjRjM2NiRRFYR09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDlwYW5pY2tpbmcxMXBhbmljX2NvdW50MThHTE9CQUxfUEFOSUNfQ09VTlQxN2gzZTA1ZWJlOWQ4NTc1NzU2RRJER09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDZ0aHJlYWQ3Y3VycmVudDdDVVJSRU5UMTdoNDljZjE0YTg5ZGI2YjkyMkUTHUdPVC5kYXRhLmludGVybmFsLl9faGVhcF9iYXNlFBxHT1QuZGF0YS5pbnRlcm5hbC5fX2hlYXBfZW5kFSRHT1QuZGF0YS5pbnRlcm5hbC5fX3dhc2lsaWJjX2Vudmlyb24WWEdPVC5mdW5jLmludGVybmFsLl9aTjQxXyRMVCRjaGFyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMGY4MTU0ZWIyNGUzOGI3NEUXakdPVC5mdW5jLmludGVybmFsLl9aTjU5XyRMVCRjb3JlLi5mbXQuLkFyZ3VtZW50cyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNmJiY2EwYmI1NTg1YTljNkUJEQIABy5yb2RhdGEBBS5kYXRhAPoBCXByb2R1Y2VycwIIbGFuZ3VhZ2UCBFJ1c3QAA0MxMQAMcHJvY2Vzc2VkLWJ5BQVydXN0Yx0xLjkzLjAgKDI1NGI1OTYwNyAyMDI2LTAxLTE5KQVjbGFuZ18yMS4xLjQtd2FzaS1zZGsgKGh0dHBzOi8vZ2l0aHViLmNvbS9sbHZtL2xsdm0tcHJvamVjdCAyMjJmYzExZjJiOGYyNWY2YTBmNDk3NjI3MmVmMWJiN2JmNDk1MjFkKQ13aXQtY29tcG9uZW50BjAuMjAuMRB3aXQtYmluZGdlbi1ydXN0BjAuNDUuMA13aXQtYmluZGdlbi1jBjAuMTcuMACkAQ90YXJnZXRfZmVhdHVyZXMJKwtidWxrLW1lbW9yeSsPYnVsay1tZW1vcnktb3B0KxZjYWxsLWluZGlyZWN0LW92ZXJsb25nKw5leHRlbmRlZC1jb25zdCsKbXVsdGl2YWx1ZSsPbXV0YWJsZS1nbG9iYWxzKxNub250cmFwcGluZy1mcHRvaW50Kw9yZWZlcmVuY2UtdHlwZXMrCHNpZ24tZXh0');
    const module1 = base64Compile('AGFzbQEAAAABFwRgA39/fwBgAn9/AGAEf39/fwBgAX8AAwUEAAECAwQFAXABBAQHHAUBMAAAATEAAQEyAAIBMwADCCRpbXBvcnRzAQAKNQQNACAAIAEgAkEAEQAACwsAIAAgAUEBEQEACw8AIAAgASACIANBAhECAAsJACAAQQMRAwALAC8JcHJvZHVjZXJzAQxwcm9jZXNzZWQtYnkBDXdpdC1jb21wb25lbnQHMC4yNDEuMg');
    const module2 = base64Compile('AGFzbQEAAAABFwRgA39/fwBgAn9/AGAEf39/fwBgAX8AAiQFAAEwAAAAATEAAQABMgACAAEzAAMACCRpbXBvcnRzAXABBAQJCgEAQQALBAABAgMALwlwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQENd2l0LWNvbXBvbmVudAcwLjI0MS4y');
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'host:interfaces/logging@2.1.0': {
        info: exports0['0'],
      },
      'wasi:cli/environment@0.2.0': {
        'get-environment': exports0['3'],
      },
      'wasi:cli/exit@0.2.0': {
        exit: trampoline3,
      },
      'wasi:cli/stderr@0.2.4': {
        'get-stderr': trampoline2,
      },
      'wasi:io/error@0.2.4': {
        '[method]error.to-debug-string': exports0['1'],
        '[resource-drop]error': trampoline0,
      },
      'wasi:io/streams@0.2.4': {
        '[method]output-stream.blocking-write-and-flush': exports0['2'],
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