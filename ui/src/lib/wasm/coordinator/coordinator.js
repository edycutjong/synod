"use components";
import { get, info, put } from '../../wasm-env.js';
import { invoke } from '../../wasm-host.js';
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

function _lowerFlatOption(meta) {
  const f = _lowerFlatVariant(meta);
  return function _lowerFlatOptionInner(ctx) {
    _debugLog('[_lowerFlatOption()] args', { ctx });
    
    const v = ctx.vals[0];
    if (v === null) {
      ctx.vals[0] = { tag: 'none' };
    } else {
      const isNotOptionObject = typeof v !== 'object'
      || Object.keys(v).length !== 2
      || !('tag' in v)
      || !(v.tag === 'some' || v.tag === 'none')
      || !('val' in v);
      if (isNotOptionObject) {
        ctx.vals[0] = { tag: 'some', val: v };
      }
    }
    
    f(ctx);
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

const _trampoline5 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  var ptr1 = arg2;
  var len1 = arg3;
  var result1 = new Uint8Array(memory0.buffer.slice(ptr1, ptr1 + len1 * 1));
  var ptr2 = arg4;
  var len2 = arg5;
  var result2 = new Uint8Array(memory0.buffer.slice(ptr2, ptr2 + len2 * 1));
  _debugLog('[iface="host:interfaces/kv-store@2.1.0", function="put"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'put',
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
      fn: () => put(result0, result1, result2),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

var variant4 = ret;
switch (variant4.tag) {
  case 'ok': {
    const e = variant4.val;
    dataView(memory0).setInt8(arg6 + 0, 0, true);
    
    break;
  }
  case 'err': {
    const e = variant4.val;
    dataView(memory0).setInt8(arg6 + 0, 1, true);
    
    var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
    var ptr3= encodeRes.ptr;
    var len3 = encodeRes.len;
    
    dataView(memory0).setUint32(arg6 + 8, len3, true);
    dataView(memory0).setUint32(arg6 + 4, ptr3, true);
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant4, valueType: typeof variant4});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="host:interfaces/kv-store@2.1.0", function="put"][Instruction::Return]', {
  funcName: 'put',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline5.fnName = 'host:interfaces/kv-store@2.1.0#put';

const _trampoline6 = function(arg0, arg1, arg2, arg3, arg4) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  var ptr1 = arg2;
  var len1 = arg3;
  var result1 = new Uint8Array(memory0.buffer.slice(ptr1, ptr1 + len1 * 1));
  _debugLog('[iface="host:interfaces/kv-store@2.1.0", function="get"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'get',
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
      fn: () => get(result0, result1),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

var variant5 = ret;
switch (variant5.tag) {
  case 'ok': {
    const e = variant5.val;
    dataView(memory0).setInt8(arg4 + 0, 0, true);
    var variant3 = e;
    if (variant3 === null || variant3=== undefined) {
      dataView(memory0).setInt8(arg4 + 4, 0, true);
    } else {
      const e = variant3;
      dataView(memory0).setInt8(arg4 + 4, 1, true);
      var val2 = e;
      var len2 = Array.isArray(val2) ? val2.length : val2.byteLength;
      var ptr2 = realloc0(0, 0, 1, len2 * 1);
      
      let valData2;
      const valLenBytes2 = len2 * 1;
      if (Array.isArray(val2)) {
        // Regular array likely containing numbers, write values to memory
        let offset = 0;
        const dv2 = new DataView(memory0.buffer);
        for (const v of val2) {
          _requireValidNumericPrimitive.bind(null, 'u8')(v);
          dv2.setUint8(ptr2+ offset, v, true);
          offset += 1;
        }
      } else {
        // TypedArray / ArrayBuffer-like, direct copy
        valData2 = new Uint8Array(val2.buffer || val2, val2.byteOffset, valLenBytes2);
        const out2 = new Uint8Array(memory0.buffer, ptr2, valLenBytes2);
        out2.set(valData2);
      }
      
      dataView(memory0).setUint32(arg4 + 12, len2, true);
      dataView(memory0).setUint32(arg4 + 8, ptr2, true);
    }
    
    break;
  }
  case 'err': {
    const e = variant5.val;
    dataView(memory0).setInt8(arg4 + 0, 1, true);
    
    var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
    var ptr4= encodeRes.ptr;
    var len4 = encodeRes.len;
    
    dataView(memory0).setUint32(arg4 + 8, len4, true);
    dataView(memory0).setUint32(arg4 + 4, ptr4, true);
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant5, valueType: typeof variant5});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="host:interfaces/kv-store@2.1.0", function="get"][Instruction::Return]', {
  funcName: 'get',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline6.fnName = 'host:interfaces/kv-store@2.1.0#get';

const _trampoline7 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  var ptr1 = arg2;
  var len1 = arg3;
  var result1 = TEXT_DECODER_UTF8.decode(new Uint8Array(memory0.buffer, ptr1, len1));
  var ptr2 = arg4;
  var len2 = arg5;
  var result2 = new Uint8Array(memory0.buffer.slice(ptr2, ptr2 + len2 * 1));
  _debugLog('[iface="host:interfaces/contracts-call@2.1.0", function="invoke"] [Instruction::CallInterface] (sync, @ enter)');
  const hostProvided = true;
  
  let parentTask;
  let task;
  let subtask;
  
  const createTask = () => {
    const results = createNewCurrentTask({
      componentIdx: -1,
      isAsync: false,
      entryFnName: 'invoke',
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
      fn: () => invoke({
        targetContract: result0,
        functionName: result1,
        input: result2,
      }),
    })
  };
} catch (e) {
  ret = { tag: 'err', val: getErrorPayload(e) };
}

var variant11 = ret;
switch (variant11.tag) {
  case 'ok': {
    const e = variant11.val;
    dataView(memory0).setInt8(arg6 + 0, 0, true);
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
    
    dataView(memory0).setUint32(arg6 + 8, len3, true);
    dataView(memory0).setUint32(arg6 + 4, ptr3, true);
    
    break;
  }
  case 'err': {
    const e = variant11.val;
    dataView(memory0).setInt8(arg6 + 0, 1, true);
    var variant10 = e;
    switch (variant10.tag) {
      case 'not-allowlisted': {
        const e = variant10.val;
        dataView(memory0).setInt8(arg6 + 4, 0, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr4= encodeRes.ptr;
        var len4 = encodeRes.len;
        
        dataView(memory0).setUint32(arg6 + 12, len4, true);
        dataView(memory0).setUint32(arg6 + 8, ptr4, true);
        break;
      }
      case 'no-execution-context': {
        dataView(memory0).setInt8(arg6 + 4, 1, true);
        break;
      }
      case 'target-unknown': {
        const e = variant10.val;
        dataView(memory0).setInt8(arg6 + 4, 2, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr5= encodeRes.ptr;
        var len5 = encodeRes.len;
        
        dataView(memory0).setUint32(arg6 + 12, len5, true);
        dataView(memory0).setUint32(arg6 + 8, ptr5, true);
        break;
      }
      case 'depth-exceeded': {
        dataView(memory0).setInt8(arg6 + 4, 3, true);
        break;
      }
      case 'reentrant': {
        const e = variant10.val;
        dataView(memory0).setInt8(arg6 + 4, 4, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr6= encodeRes.ptr;
        var len6 = encodeRes.len;
        
        dataView(memory0).setUint32(arg6 + 12, len6, true);
        dataView(memory0).setUint32(arg6 + 8, ptr6, true);
        break;
      }
      case 'inner-failed': {
        const e = variant10.val;
        dataView(memory0).setInt8(arg6 + 4, 5, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr7= encodeRes.ptr;
        var len7 = encodeRes.len;
        
        dataView(memory0).setUint32(arg6 + 12, len7, true);
        dataView(memory0).setUint32(arg6 + 8, ptr7, true);
        break;
      }
      case 'inner-trapped': {
        const e = variant10.val;
        dataView(memory0).setInt8(arg6 + 4, 6, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr8= encodeRes.ptr;
        var len8 = encodeRes.len;
        
        dataView(memory0).setUint32(arg6 + 12, len8, true);
        dataView(memory0).setUint32(arg6 + 8, ptr8, true);
        break;
      }
      case 'encoding-failed': {
        const e = variant10.val;
        dataView(memory0).setInt8(arg6 + 4, 7, true);
        
        var encodeRes = _utf8AllocateAndEncode(e, realloc0, memory0);
        var ptr9= encodeRes.ptr;
        var len9 = encodeRes.len;
        
        dataView(memory0).setUint32(arg6 + 12, len9, true);
        dataView(memory0).setUint32(arg6 + 8, ptr9, true);
        break;
      }
      default: {
        throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant10.tag)}\` (received \`${variant10}\`) specified for \`InvokeError\``);
      }
    }
    
    break;
  }
  default: {
    _debugLog("ERROR: invalid value (expected result as object with 'tag' member)", { value: variant11, valueType: typeof variant11});
    throw new TypeError('invalid variant specified for result');
  }
}
_debugLog('[iface="host:interfaces/contracts-call@2.1.0", function="invoke"][Instruction::Return]', {
  funcName: 'invoke',
  paramCount: 0,
  async: false,
  postReturn: false
});
task.resolve([ret]);
task.exit();
}
_trampoline7.fnName = 'host:interfaces/contracts-call@2.1.0#invoke';

const handleTable0 = [T_FLAG, 0];
handleTable0._createdReps = new Set();


const captureTable0= new Map();
let captureCnt0= 0;

HANDLE_TABLES[0] = handleTable0;

const _trampoline8 = function(arg0, arg1) {
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
_trampoline8.fnName = 'wasi:io/error@0.2.6#toDebugString';

const _trampoline9 = function(arg0, arg1, arg2, arg3) {
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
_trampoline9.fnName = 'wasi:io/streams@0.2.6#blockingWriteAndFlush';

const _trampoline10 = function(arg0) {
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
_trampoline10.fnName = 'wasi:cli/environment@0.2.6#getEnvironment';
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
  paramLiftFns: [_liftFlatStringAny,_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  }),_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  })],
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
  paramLiftFns: [_liftFlatStringAny,_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  }),_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  })],
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
  paramLiftFns: [_liftFlatStringAny,_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', 
    _lowerFlatOption({
      caseMetas: [
      [ 'none', null, 0, 0, 0 ],
      [ 'some', _lowerFlatList({
        elemLowerFn: _lowerFlatU8,
        elemSize32: 1,
        elemAlign32: 1,
      }), 8, 4, 2],
      ],
      variantSize32: 12,
      variantAlign32: 4,
      variantPayloadOffset32: 4,
      variantFlatCount: 3,
    })
    , 16, 4, 4 ],
    [ 'err', _lowerFlatStringAny, 16, 4, 4 ],
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
  importFn: _trampoline6,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 6,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline6.manuallyAsync,
  paramLiftFns: [_liftFlatStringAny,_liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', 
    _lowerFlatOption({
      caseMetas: [
      [ 'none', null, 0, 0, 0 ],
      [ 'some', _lowerFlatList({
        elemLowerFn: _lowerFlatU8,
        elemSize32: 1,
        elemAlign32: 1,
      }), 8, 4, 2],
      ],
      variantSize32: 12,
      variantAlign32: 4,
      variantPayloadOffset32: 4,
      variantFlatCount: 3,
    })
    , 16, 4, 4 ],
    [ 'err', _lowerFlatStringAny, 16, 4, 4 ],
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
  paramLiftFns: [_liftFlatRecord({ fieldMetas: [['targetContract', _liftFlatStringAny, 8, 4],['functionName', _liftFlatStringAny, 8, 4],['input', _liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  }), 8, 4],], size32: 24, align32: 4 })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', _lowerFlatList({
      elemLowerFn: _lowerFlatU8,
      elemSize32: 1,
      elemAlign32: 1,
    }), 16, 4, 4 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'not-allowlisted', _lowerFlatStringAny, 8, 4, 2 ],[ 'no-execution-context', null, 0, 0, 0 ],[ 'target-unknown', _lowerFlatStringAny, 8, 4, 2 ],[ 'depth-exceeded', null, 0, 0, 0 ],[ 'reentrant', _lowerFlatStringAny, 8, 4, 2 ],[ 'inner-failed', _lowerFlatStringAny, 8, 4, 2 ],[ 'inner-trapped', _lowerFlatStringAny, 8, 4, 2 ],[ 'encoding-failed', _lowerFlatStringAny, 8, 4, 2 ],],
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
  importFn: _trampoline7,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 7,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline7.manuallyAsync,
  paramLiftFns: [_liftFlatRecord({ fieldMetas: [['targetContract', _liftFlatStringAny, 8, 4],['functionName', _liftFlatStringAny, 8, 4],['input', _liftFlatList({
    elemLiftFn: _liftFlatU8,
    elemAlign32: 1,
    elemSize32: 1,
    typedArray: Uint8Array,
  }), 8, 4],], size32: 24, align32: 4 })],
  resultLowerFns: [
  _lowerFlatResult({
    caseMetas: [
    [ 'ok', _lowerFlatList({
      elemLowerFn: _lowerFlatU8,
      elemSize32: 1,
      elemAlign32: 1,
    }), 16, 4, 4 ],
    [ 'err', _lowerFlatVariant({
      caseMetas: [[ 'not-allowlisted', _lowerFlatStringAny, 8, 4, 2 ],[ 'no-execution-context', null, 0, 0, 0 ],[ 'target-unknown', _lowerFlatStringAny, 8, 4, 2 ],[ 'depth-exceeded', null, 0, 0, 0 ],[ 'reentrant', _lowerFlatStringAny, 8, 4, 2 ],[ 'inner-failed', _lowerFlatStringAny, 8, 4, 2 ],[ 'inner-trapped', _lowerFlatStringAny, 8, 4, 2 ],[ 'encoding-failed', _lowerFlatStringAny, 8, 4, 2 ],],
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
  importFn: _trampoline8,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 8,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline8.manuallyAsync,
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
  importFn: _trampoline9,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 9,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline9.manuallyAsync,
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
  importFn: _trampoline10,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 10,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline10.manuallyAsync,
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
  importFn: _trampoline10,
},
);

const $init = (() => {
  let gen = (function* _initGenerator () {
    const module0 = base64Compile('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AAhBAUcNACAAIAIoAgw2AgQgAEEBOgAADAELIAAgAi0ACToAASAAQQA6AAALIAJBEGokgICAgAALjwMBC38jgICAgABBMGsiAiSAgICAACACQRxqIAFBCGooAgA2AgAgAkGAAToAICACQQA2AhAgAkKAgICAEDcCCCACIAEpAgA3AhQgACACQQhqIAEgASABIAEQlYCAgAACQCAAKAIAIgNBgICAgHhGDQAgAigCHCIBIAIoAhgiBE8NACACQRRqIQUgACgCHCEGIAAoAhghByAAKAIQIQggACgCDCEJIAAoAgQhCiACKAIUIQsCQANAIAsgAWotAABBd2oiDEEXSw0BQQEgDHRBk4CABHFFDQEgBCABQQFqIgFHDQALIAIgBDYCHAwBCyACIAE2AhwgAkEWNgIkIAIgBRCPgYCAACACQSRqIAIoAgAgAigCBBCVgYCAACEBIABBgICAgHg2AgAgACABNgIEAkAgA0UNACAKIANBARD/gICAAAsCQCAJRQ0AIAggCUEBEP+AgIAACyAHRQ0AIAYgB0EBEP+AgIAACwJAIAIoAggiAUUNACACKAIMIAFBARD/gICAAAsgAkEwaiSAgICAAAvEEwEPfyOAgICAAEEwayIGJICAgIAAAkACQAJAIAEoAhQiByABKAIQIghPDQAgAUEMaiEJIAEoAgwhCgNAIAogB2otAAAiC0F3aiIMQRdLDQJBASAMdEGTgIAEcUUNAiABIAdBAWoiBzYCFCAIIAdHDQALCyAGQQU2AiAgBiABQQxqEI+BgIAAIAZBIGogBigCACAGKAIEEJWBgIAAIQxBgICAgHghBwwBCwJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgC0HbAEYNACALQfsARg0BQYCAgIB4IQcgASAGQS9qI4GAgIAAQYDZwYAAahCmgICAACABENeAgIAAIQwMEQsgASABLQAYQX9qIgw6ABggDEH/AXFFDQEgASAHQQFqNgIUIAZBAToAHCAGIAE2AhggBkEgaiAGQRhqEJCAgIAAAkAgBi0AIEEBRw0AIAYoAiQhDEGAgICAeCEHDA0LIAYtACFBAUcNAyAGQSBqIAYoAhgQnYCAgABBgICAgHghByAGKAIkIQwCQCAGKAIgIgtBgICAgHhHDQAMDQsgBigCKCENIAZBIGogBkEYahCQ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ahC/gICAACACQYABaiAJQaObwIAAakEFEMWAgIAAIAJBwAJqIAJBOGoQsYCAgAAgAi0AwAJBBkYNBSACQeABakEQaiACQcACakEQaikDADcDACACQeABakEIaiACQcACakEIaiINKQMANwMAIAIgAikDwAI3A+ABI4GAgIAAIQkgAkHAAmogAkGIBWogAkGAAWogAkHgAWoQ2oCAgAAgAkHAAmoQv4CAgAAgAkHgAWogCUHynsCAAGpBEhDFgICAACACQQE6AMAGIAIgAi0AeEEBcToAwQYgAkHAAmogAkGIBWogAkHgAWogAkHABmoQ2oCAgAAgAkHAAmoQv4CAgAAgAkHIBGpBDGogAkGIBWpBCGooAgA2AgAgAiACKQKIBTcCzAQgAkEFOgDIBCACQcACaiACQcgEahCvgICAACACKALAAkGAgICAeEYNBiACQeAEakEIaiIOIA0oAgA2AgAgAiACKQLAAjcD4AQgAkHAAmojgYCAgAAiCUGEn8CAAGoiDUEKEMWAgIAAIAJBwAJqQQxqIAlB9J3AgABqQQgQxYCAgAAgAkHgAmogDigCADYCACACIAIpA+AENwLYAiACQewEaiACQcACahDpgICAACACQcACahC+gICAACACQYABaiANQQoQxYCAgAAgAkGAAWpBDGoiESAJQfydwIAAakEIEMWAgIAAIAJBgAFqQRhqIg4gCUGOn8CAAGpBHRDFgICAACACKAL4BCESIAIoAvQEIQ0gAigC8AQhCQJAAkAgAigC7AQiFEEIRg0AIAJBwAJqIAJByANqEMeCgIAAIAJBzAJqIhUgEBDHgoCAACACQcACakEYaiAPEMeCgIAAIAJB4AFqI4GAgIAAQeigwIAAakEHEMWAgIAAAkAgAigCzAIiD0UNACACKALQAiAPQQEQ/4CAgAALIBUgAikC4AE3AgAgFUEIaiACQeABakEIaigCADYCACACQeABaiACQcACahCugICAACACKALgASIPQYCAgIB4Rw0BIAIgAigC5AE2AogFI4GAgIAAIgFBvaDAgABqQSsgAkGIBWogAUGI2sGAAGogAUGY28GAAGoQh4OAgAAACyACQQA2AsgCIAIgEjYCxAIgAiANNgLAAiACQeABaiACQcACahCWgICAAAJAAkAgAi0A4AFBBkYNACACQcACakEQaiACQeABakEQ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CwJAIA1FDQAgFCANQQEQ/4CAgAALIAJBwAJqIAJByANqEMeCgIAAIAJBzAJqIg0gEBDHgoCAACACQdgCaiAPEMeCgIAAIAJB2AVqI4GAgIAAQbSgwIAAakEJEMWAgIAAAkAgAigCzAIiD0UNACACKALQAiAPQQEQ/4CAgAALIA0gAikC2AU3AgAgDUEIaiACQdgFakEIaigCADYCACACQdgFaiACQcACahCugICAACACKALYBSINQYCAgIB4Rg0NI4GAgIAAQbGdwIAAakELIAogCyACKALcBSIPIAIoAuAFIAJB2AVqEIGAgIAAAkAgAi0A2AVBAXFFDQAgAigC4AUiC0GAgICAeEYNACACKALcBSEKIAAgCzYCDCAAIAo2AgggACALNgIEIABBATYCACANRQ0SIA8gDUEBEP+AgIAADBILAkAgDUUNACAPIA1BARD/gICAAAsgAiAFNwPYBSACQcgFaiOBgICAAEH8gsCAAGogAkHYBWoQw4CAgAAgAigCzAUiCyACKALQBSACQdgFahCAgICAAAJAIAItANgFQQFxRQ0AIAIoAuAFIg1BgICAgHhGDQAgAigC3AUhCiAAIA02AgwgACAKNgIIIAAgDTYCBCAAQQE2AgAgAigCyAUiAEUNEiALIABBARD/gICAAAwSCyACQbAFaiEGAkAgAigCyAUiCUUNACALIAlBARD/gICAAAsgAEEANgIAIAAgBikCADcCBCAAQQxqIAZBCGooAgA2AgAgAkHAAmoQvoCAgAACQCACKAK8BSIARQ0AIA4gAEEBEP+AgIAACyACQeABahC+gICAACACQYgFahC8gICAACACQYABahC+gICAACACQcgEahC8gICAACACQYwEahC+gICAAAJAIAdFDQAgDCAHQQEQ/4CAgAALIAJByANqEL6AgIAAAkAgAigCvAMiAEUNACAKIABBARD/gICAAAsCQCACKAKwAyIARQ0AIAIoArQDIABBARD/gICAAAsgAkEQahC9gICAAAJAIANFDQAgBCADQQEQ/4CAgAALAkAgASgCDCIAQYCAgIB4ckGAgICAeEYNACABKAIQIABBARD/gICAAAsgASgCGCIAQYCAgIB4ckGAgICAeEYNGgwZCyOBgICAAEGxncCAAGpBCyAKIAsgAigC3AUiECACKALgBSACQdgFahCBgICAAAJAAkACQCACLQDYBUEBcUUNACACKALgBSIKQYCAgIB4Rg0AIAIoAtwFIQsgACAKNgIMIAAgCzYCCCAAIAo2AgQgAEEBNgIAAkAgD0UNACAQIA9BARD/gICAAAsgAkHAAmoQvoCAgABBASAOdCIAQdUBcQ0BIABBCnFFDQIMFQsCQCAPRQ0AIBAgD0EBEP+AgIAACwJAAkAgDkEFRw0AIAIgFDYCxAUgAiASNgLABSACIAk2ArwFDAELIAIgFDYC5AUgAiASNgLgBSACIAk2AtwFIAIgDjYC2AUgAiOHgICAAK1CIIYgAkHYBWqthDcDyAUgAkG8BWojgYCAgABBiojAgABqIAJByAVqEMOAgIAAQQEgAigC2AV0QfUBcUUNACACKALcBSIJRQ0AIAIoAuAFIAlBARD/gICAAAsgAkHgAWpBDGohCSACQdgFaiOBgICAAEHvoMCAAGpBBhDFgICAAAJAIAIoAuwBIgpFDQAgAigC8AEgCkEBEP+AgIAACyAJIAIpAtgFNwIAIAlBCGogAkHYBWpBCGoiCSgCADYCACACQdgFaiACQbwFahDHgoCAAAJAIAIoAvgBIgpFDQAgAigC/AEgCkEBEP+AgIAACyANIAIpAtgFNwIAIA1BCGogCSgCADYCACACIBM3A+AFIAIgBTcD2AUgAkHIBWojgYCAgABB14HAgABqIAJB2AVqEMOAgIAAIAIoAswFIQkgAigC0AUhCyACQdgFaiACQeABahCwgICAACACKALYBSIKQYCAgIB4Rg0PI4GAgIAAQayewIAAakEKIAkgCyACKALcBSINIAIoAuAFIAJB2AVqEIGAgIAAAkACQCACLQDYBUEBcUUNACACKALgBSILQYCAgIB4Rg0AIAIoAtwFIQ4gACALNgIMIAAgDjYCCCAAIAs2AgQgAEEBNgIAIApFDQEgDSAKQQEQ/4CAgAAMAQsCQCAKRQ0AIA0gCkEBEP+AgIAACyACIAggAkG8BWqthDcD2AUgAkHsBWojgYCAgABBv4bAgABqIAJB2AVqEMOAgIAAIABBDGogAkH0BWooAgA2AgAgACACKQLsBTcCBCAAQQE2AgALAkAgAigCyAUiAEUNACAJIABBARD/gICAAAsCQCACKAK8BSIARQ0AIAIoAsAFIABBARD/gICAAAsgAkHAAmoQvoCAgAAMFAsgCUUNEyASIAlBARD/gICAAAwTCyAJRQ0SIBIgCUEBEP+AgIAADBILI4GAgIAAQbGdwIAAakELIAogCyACKALkASIQIAIoAugBIAJB4AFqEIGAgIAAAkACQAJAIAItAOABQQFxRQ0AIAIoAugBIgpBgICAgHhGDQAgAigC5AEhCyAAIAo2AgwgACALNgIIIAAgCjYCBCAAQQE2AgACQCAPRQ0AIBAgD0EBEP+AgIAACyACQcACahC+gICAAEEBIBR0IgBB1QFxDQEgAEEKcUUNAgwVCwJAIA9FDQAgECAPQQEQ/4CAgAALAkACQCAUQQVHDQAgAiASNgLgBSACIA02AtwFIAIgCTYC2AUMAQsgAiASNgLsASACIA02AugBIAIgCTYC5AEgAiAUNgLgASACI4eAgIAArUIghiACQeABaq2ENwOIBSACQdgFaiOBgICAAEGKiMCAAGogAkGIBWoQw4CAgABBASACKALgAXRB9QFxRQ0AIAIoAuQBIglFDQAgAigC6AEgCUEBEP+AgIAACyACQeABaiOBgICAAEH1oMCAAGpBBhDFgICAAAJAIAIoAowBIglFDQAgAigCkAEgCUEBEP+AgIAACyARIAIpAuABNwIAIBFBCGogAkHgAWpBCGoiCSgCADYCACACQeABaiACQdgFahDHgoCAAAJAIAIoApgBIgpFDQAgAigCnAEgCkEBEP+AgIAACyAOIAIpAuABNwIAIA5BCGogCSgCADYCACACIBM3A+gBIAIgBTcD4AEgAkGIBWojgYCAgABB14HAgABqIAJB4AFqEMOAgIAAIAIoAowFIQkgAigCkAUhCyACQeABaiACQYABahCwgICAACACKALgASIKQYCAgIB4Rg0PI4GAgIAAQayewIAAakEKIAkgCyACKALkASINIAIoAugBIAJB4AFqEIGAgIAAAkACQCACLQDgAUEBcUUNACACKALoASILQYCAgIB4Rg0AIAIoAuQBIQ4gACALNgIMIAAgDjYCCCAAIAs2AgQgAEEBNgIAIApFDQEgDSAKQQEQ/4CAgAAMAQsCQCAKRQ0AIA0gCkEBEP+AgIAACyACIAggAkHYBWqthDcD4AEgAkH8BGojgYCAgABBv4bAgABqIAJB4AFqEMOAgIAAIABBDGogAkGEBWooAgA2AgAgACACKQL8BDcCBCAAQQE2AgALAkAgAigCiAUiAEUNACAJIABBARD/gICAAAsCQCACKALYBSIARQ0AIAIoAtwFIABBARD/gICAAAsgAkHAAmoQvoCAgAAMFAsgCUUNEyANIAlBARD/gICAAAwTCyAJRQ0SIA0gCUEBEP+AgIAADBILI4GAgIAAQbGdwIAAakELIAogCyACKALkASINIAIoAugBIAJB4AFqEIGAgIAAAkACQCACLQDgAUEBcUUNACACKALoASIKQYCAgIB4Rg0AIAIoAuQBIQsgACAKNgIMIAAgCzYCCCAAIAo2AgQgAEEBNgIAIAlFDQEgDSAJQQEQ/4CAgAAMAQsCQCAJRQ0AIA0gCUEBEP+AgIAACyACQeABaiOBgICAAEHvoMCAAGpBBhDFgICAAAJAIAIoApgEIglFDQAgAigCnAQgCUEBEP+AgIAACyASIAIpAuABNwIAIBJBCGogAkHgAWpBCGooAgA2AgAgAiOHgICAAK1CIIYgAkGAAWqthCIINwPgASACQbAEaiOBgICAAEHXhsCAAGogAkHgAWoQw4CAgAACQCACKAKkBCIJRQ0AIAIoAqgEIAlBARD/gICAAAsgDiACKQKwBDcCACAOQQhqIAJBsARqQQhqKAIANgIAIAIjhoCAgACtQiCGIAJBiARqrYQ3A+gBIAIgBTcD4AEgAkGIBWojgYCAgABB14HAgABqIAJB4AFqEMOAgIAAIAIoAowFIQkgAigCkAUhCyACQeABaiACQYwEahCwgICAACACKALgASIKQYCAgIB4Rg0OI4GAgIAAQayewIAAakEKIAkgCyACKALkASINIAIoAugBIAJB4AFqEIGAgIAAAkACQCACLQDgAUEBcUUNACACKALoASILQYCAgIB4Rg0AIAIoAuQBIQ4gACALNgIMIAAgDjYCCCAAIAs2AgQgAEEBNgIAIApFDQEgDSAKQQEQ/4CAgAAMAQsCQCAKRQ0AIA0gCkEBEP+AgIAACyACIAg3A+ABIAJBvARqI4GAgIAAQeCHwIAAaiACQeABahDDgICAACAAQQxqIAJBxARqKAIANgIAIAAgAikCvAQ3AgQgAEEBNgIACyACKAKIBSIARQ0AIAkgAEEBEP+AgIAACyACQcACahC+gICAAEEBIAIoAoABdEH1AXFFDRIgAigChAEiAEUNEiACKAKIASAAQQEQ/4CAgAAMEgtBAUElEMGCgIAAAAtBAUEKEMGCgIAAAAsgAiACKALEAjYC4AEjgYCAgAAiAUG9oMCAAGpBKyACQeABaiABQYjawYAAaiABQfjbwYAAahCHg4CAAAALIAIgAigCxAI2AuABI4GAgIAAIgFBvaDAgABqQSsgAkHgAWogAUGI2sGAAGogAUHI28GAAGoQh4OAgAAACyACIAIoAsQCNgLgASOBgICAACIBQb2gwIAAakErIAJB4AFqIAFBiNrBgABqIAFBuNvBgABqEIeDgIAAAAsgAiACKALEAjYC4AEjgYCAgAAiAUG9oMCAAGpBKyACQeABaiABQYjawYAAaiABQajbwYAAahCHg4CAAAALIAIgAigCxAI2AuABI4GAgIAAIgFBvaDAgABqQSsgAkHgAWogAUGI2sGAAGogAUH42sGAAGoQh4OAgAAACyACIAIoAsQCNgLgASOBgICAACIBQb2gwIAAakErIAJB4AFqIAFBiNrBgABqIAFB6NrBgABqEIeDgIAAAAsgAiACKALEAjYC4AEjgYCAgAAiAUG9oMCAAGpBKyACQeABaiABQYjawYAAaiABQdjawYAAahCHg4CAAAALIAIgAigCxAI2AtgFI4GAgIAAIgFBvaDAgABqQSsgAkHYBWogAUGI2sGAAGogAUGo2sGAAGoQh4OAgAAACyACIAIoAtwFNgLIBSOBgICAACIBQb2gwIAAakErIAJByAVqIAFBiNrBgABqIAFBmNrBgABqEIeDgIAAAAsgAiACKALcBTYC3AYjgYCAgAAiAUG9oMCAAGpBKyACQdwGaiABQYjawYAAaiABQbjawYAAahCHg4CAAAALIAIgAigC5AE2AqwFI4GAgIAAIgFBvaDAgABqQSsgAkGsBWogAUGI2sGAAGogAUGI28GAAGoQh4OAgAAACyACIAIoAuQBNgLIBCOBgICAACIBQb2gwIAAakErIAJByARqIAFBiNrBgABqIAFB2NvBgABqEIeDgIAAAAsgAkHAAmoQvoCAgAALAkAgAigCvAUiAEUNACAOIABBARD/gICAAAsgCUUNACASIAlBARD/gICAAAsgAkHgAWoQvoCAgAAgAkGIBWoQvICAgAALIAJBgAFqEL6AgIAAIAJByARqELyAgIAACyACQYwEahC+gICAAAsCQCAHRQ0AIAwgB0EBEP+AgIAACwJAIAIoAsgDIgBFDQAgAigCzAMgAEEBEP+AgIAACyAGQQpBARD/gICAAAJAIAIoAuADIgBFDQAgAigC5AMgAEEBEP+AgIAACwJAIAIoArwDIgBFDQAgAigCwAMgAEEBEP+AgIAACwJAIAIoArADIgBFDQAgAigCtAMgAEEBEP+AgIAACyACQRBqEL2AgIAACyADRQ0AIAQgA0EBEP+AgIAACwJAIAEoAgwiAEGAgICAeEYNACAARQ0AIAEoAhAgAEEBEP+AgIAACyABKAIYIgBBgICAgHhyQYCAgIB4Rg0BCyABKAIcIABBARD/gICAAAsgAkHgBmokgICAgAAL/gEBAX8QgoGAgAACQEEeQQEQ/oCAgAAiAkUNACAAQR42AgwgACACNgIIIABCgYCAgOADNwIAIAIjgYCAgABB+6DAgABqIgApAAA3AAAgAkEWaiAAQRZqKQAANwAAIAJBEGogAEEQaikAADcAACACQQhqIABBCGopAAA3AAACQCABKAIAIgJBgICAgHhGDQAgAkUNACABKAIEIAJBARD/gICAAAsCQCABKAIMIgJBgICAgHhGDQAgAkUNACABKAIQIAJBARD/gICAAAsCQCABKAIYIgJBgICAgHhGDQAgAkUNACABKAIcIAJBARD/gICAAAsPC0EBQR4QwYKAgAAAC4AdBQJ/AX4GfwJ+An8jgICAgABB8AFrIgIkgICAgAACQAJAAkACQAJAAkACQAJAAkACQCABKAIAIgNBgICAgHhHDQAQgoGAgABBIEEBEP6AgIAAIgNFDQEgAEEgNgIMIAAgAzYCCCAAQoGAgICABDcCACADI4GAgIAAQZmhwIAAaiIAKQAANwAAIANBGGogAEEYaikAADcAACADQRBqIABBEGopAAA3AAAgA0EIaiAAQQhqKQAANwAADAcLIAEpAgQhBCACQQA2AlAgAiAEQiCIPgJMIAIgBKciBTYCSCACQRhqIAJByABqEJyAgIAAAkAgAigCGEGAgICAeEcNACACIAIoAhw2AjwgAiODgICAAK1CIIYgAkE8aq2ENwNwIAJByABqI4GAgIAAQbyHwIAAaiACQfAAahDEgoCAAAJAIAIoAjwiBigCAA0AIAYoAggiB0UNACAGKAIEIAdBARD/gICAAAsgBkEUQQQQ/4CAgAAgAkGQAWpBCGogAkHIAGpBCGooAgAiBjYCACACQYABakEIaiAGNgIAIAIgAikCSCIENwOQASACIAQ3A4ABIABBDGogBjYCACAAIAQ3AgQgAEEBNgIADAYLIAJBCGogAkEYakEIaigCADYCACACIAIpAhg3AwAgAiOEgICAAEGJgICAAGqtQiCGIAKthCIENwMYIAJByABqI4GAgIAAQc+CwIAAaiACQRhqEMSCgIAAIAIoAkghBiACKAJMIgcgAigCUCACQcgAahCAgICAAAJAIAItAEhBAXFFDQAgAigCUCIIQYCAgIB4Rg0AIAIoAkwhCSAAIAg2AgwgACAJNgIIIAAgCDYCBCAAQQE2AgAgBkUNBSAHIAZBARD/gICAAAwFCwJAIAZFDQAgByAGQQEQ/4CAgAALIAIgBDcDSCACQQxqI4GAgIAAIgZByIHAgABqIAJByABqEMSCgIAAIAZBsZ3AgABqQQsgAigCECIGIAIoAhQgAkHIAGoQgoCAgAACQCACLQBIQQFxDQACQAJAIAItAExBAXFFDQAgAigCVCIHQYCAgIB4Rg0AIAIoAlAhCCACQQA2ApgBIAIgBzYClAEgAiAINgKQASACQcgAaiACQZABahCUgICAACACKAJIIglBgICAgHhHDQEgAiACKAJMNgKQASACQYABaiACQZABahC4gICAACACQZABahC7gICAACACQfAAakEIaiACQYABakEIaigCACIJNgIAIAIgAikDgAEiBDcDcCAAQQxqIAk2AgAgACAENwIEIABBATYCACAHRQ0GIAggB0EBEP+AgIAADAYLIAIgBDcDSCAAQQRqI4GAgIAAQY6HwIAAaiACQcgAahDEgoCAACAAQQE2AgAMBQsgAkEYakEYaiACQcgAakEYaikCADcCACACQRhqQSBqIAJByABqQSBqKAIANgIAIAJBJGogAkHMAGoiCkEIaigCADYCACACIAIpAlg3AiggAiAKKQIAIgs3A3AgAiAJNgIYIAIgCzcCHAJAIAdFDQAgCCAHQQEQ/4CAgAALIAJBADYCRCACQoCAgIDAADcCPCACQQA2AoABIAIjhoCAgACtQiCGIAJBgAFqrYQiDDcDUCACIAQ3A0ggAkGQAWojgYCAgAAiCEHXgcCAAGogAkHIAGoQxIKAgAAgAigCkAEhByACQcgAaiAIQayewIAAakEKIAIoApQBIgkgAigCmAEQ+YCAgAAgAikCUCELIAIoAkwhCCACKAJIDQMgCEGAgICAeEYNAiACKAJQIQ0gAkEANgKYASACIAs+ApABIAIgC0IgiD4ClAEgAkHIAGogAkGQAWoQl4CAgAACQAJAIAIoAkhBgICAgHhGDQACQCACKAJEIg4gAigCPEcNACACQTxqEO6AgIAACyACKAJAIA5BJGxqIgogAikCSDcCACAKQQhqIAJByABqQQhqKQIANwIAIApBEGogAkHIAGpBEGopAgA3AgAgCkEYaiACQcgAakEYaikCADcCACAKQSBqIAJByABqQSBqKAIANgIAIAIgDkEBajYCRAwBCwJAIAIoAkwiCigCAA0AIAooAggiDkUNACAKKAIEIA5BARD/gICAAAsgCkEUQQQQ/4CAgAALIAhFDQIgDSAIQQEQ/4CAgAAMAgsgAjUCTCEEIAAgAigCUCIHNgIEIABBATYCACAAIAQgB61CIIaENwIIDAMLQQFBIBDBgoCAAAALAkAgB0UNACAJIAdBARD/gICAAAsgAkEBNgKAASACIAw3A1AgAiAENwNIIAJBkAFqI4GAgIAAIghB14HAgABqIAJByABqEMSCgIAAIAIoApABIQcgAkHIAGogCEGsnsCAAGpBCiACKAKUASIJIAIoApgBEPmAgIAAIAIpAlAhCyACKAJMIQggAigCSA0AAkAgCEGAgICAeEYNACACKAJQIQ0gAkEANgKYASACIAs+ApABIAIgC0IgiD4ClAEgAkHIAGogAkGQAWoQl4CAgAACQAJAIAIoAkhBgICAgHhGDQACQCACKAJEIg4gAigCPEcNACACQTxqEO6AgIAACyACKAJAIA5BJGxqIgogAikCSDcCACAKQQhqIAJByABqQQhqKQIANwIAIApBEGogAkHIAGpBEGopAgA3AgAgCkEYaiACQcgAakEYaikCADcCACAKQSBqIAJByABqQSBqKAIANgIAIAIgDkEBajYCRAwBCwJAIAIoAkwiCigCAA0AIAooAggiDkUNACAKKAIEIA5BARD/gICAAAsgCkEUQQQQ/4CAgAALIAhFDQAgDSAIQQEQ/4CAgAALAkAgB0UNACAJIAdBARD/gICAAAsgAkECNgKAASACIAw3A1AgAiAENwNIIAJBkAFqI4GAgIAAIghB14HAgABqIAJByABqEMSCgIAAIAIoApABIQcgAkHIAGogCEGsnsCAAGpBCiACKAKUASIJIAIoApgBEPmAgIAAIAIpAlAhCyACKAJMIQggAigCSA0AAkAgCEGAgICAeEYNACACKAJQIQ0gAkEANgKYASACIAs+ApABIAIgC0IgiD4ClAEgAkHIAGogAkGQAWoQl4CAgAACQAJAIAIoAkhBgICAgHhGDQACQCACKAJEIg4gAigCPEcNACACQTxqEO6AgIAACyACKAJAIA5BJGxqIgogAikCSDcCACAKQQhqIAJByABqQQhqKQIANwIAIApBEGogAkHIAGpBEGopAgA3AgAgCkEYaiACQcgAakEYaikCADcCACAKQSBqIAJByABqQSBqKAIANgIAIAIgDkEBajYCRAwBCwJAIAIoAkwiCigCAA0AIAooAggiDkUNACAKKAIEIA5BARD/gICAAAsgCkEUQQQQ/4CAgAALIAhFDQAgDSAIQQEQ/4CAgAALAkAgB0UNACAJIAdBARD/gICAAAsgAkEANgJ4IAJBADYCcCACQZABaiOBgICAACIHQbmhwIAAakEIEMWAgIAAIAJBqAFqQQRyIAIoAgQgAigCCBDFgICAACACQQM6AKgBIAJByABqIAJB8ABqIAJBkAFqIAJBqAFqENqAgIAAIAJByABqEL+AgIAAIAJBkAFqIAdBy5vAgABqQQYQxYCAgAAgAkHAAWpBBHIgAigCKCACKAIsEMWAgIAAIAJBAzoAwAEgAkHIAGogAkHwAGogAkGQAWogAkHAAWoQ2oCAgAAgAkHIAGoQv4CAgAAgAkGQAWogB0HRm8CAAGpBDRDFgICAACACQdgBakEEciACKAI0IAIoAjgQxYCAgAAgAkEDOgDYASACQcgAaiACQfAAaiACQZABaiACQdgBahDagICAACACQcgAahC/gICAACACQYABaiAHQcGhwIAAakEFEMWAgIAAIAJByABqIAJBPGoQ9ICAgAACQCACLQBIQQZHDQAgAiACKAJMNgKQASOBgICAACIBQb2gwIAAakErIAJBkAFqIAFBiNrBgABqIAFBiNzBgABqEIeDgIAAAAsgAkGQAWpBEGogAkHIAGpBEGopAwA3AwAgAkGQAWpBCGogAkHIAGpBCGopAwA3AwAgAiACKQNINwOQASACQcgAaiACQfAAaiACQYABaiACQZABahDagICAACACQcgAahC/gICAACACQZABakEMaiACQfAAakEI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ZAEBfyOAgICAAEEQayICJICAgIAAIAIgATYCBCACIAA2AgAgAiOEgICAAEGUgICAAGqtQiCGIAKthDcDCCOBgICAAEHYlcCAAGogAkEIahDRgICAACEBIAJBEGokgICAgAAgAQsUACAAKAIAIAAoAgQgARDSgoCAAAu1AQEEfyOAgICAAEEQayICJICAgIAAQQEhAwJAAkACQCABQQFxDQAgAkEEaiAAIAEQxIKAgAAMAQsgAUEBdiEEQQAhBQJAIAFBAkkNABCCgYCAACAEQQEQ/oCAgAAiA0UNAiAEIQULAkAgBEUNACADIAAgBPwKAAALIAIgBDYCDCACIAM2AgggAiAFNgIECyACQQRqEJKBgIAAIQEgAkEQaiSAgICAACABDwtBASAEEMGCgIAAAAuEAQEBfyOAgICAAEEgayIDJICAgIAAIAMgAjYCDCADIAE2AgggAyAANgIEIAMjiICAgACtQiCGIANBBGqthDcDECADI4SAgIAAQZaAgIAAaq1CIIYgA0EIaq2ENwMYI4GAgIAAQbOEwIAAaiADQRBqENGAgIAAIQIgA0EgaiSAgICAACACC2QBAX8jgICAgABBEGsiAiSAgICAACACIAE2AgQgAiAANgIAIAIjhICAgABBlICAgABqrUIghiACrYQ3AwgjgYCAgABB7JXAgABqIAJBCGoQ0YCAgAAhASACQRBqJICAgIAAIAELrQIBBH8jgICAgABBEGsiAiSAgICAACABQQA2AgggASABKAIUQQFqNgIUIAJBBGogAUEMaiABEJGBgIAAIAIoAgghAwJAAkACQCACKAIEIgRBAkcNACAAQYCAgIB4NgIAIAAgAzYCBAwBCyACKAIMIQECQAJAIARBAXFFDQBBACEFAkAgAUEASA0AAkAgAQ0AQQEhBAwDCxCCgYCAAEEBIQUgAUEBEP6AgIAAIgQNAgsgBSABEMGCgIAAAAtBACEFIAFBAEgNAgJAIAENAEEBIQQMAQsQgoGAgABBASEFIAFBARD+gICAACIERQ0CCwJAIAFFDQAgBCADIAH8CgAACyAAIAE2AgggACAENgIEIAAgATYCAAsgAkEQaiSAgICAAA8LIAUgARDBgoCAAAALywMBCX8jgICAgABBIGsiAiSAgICAAAJAAkACQAJAAkAgASgCFCIDIAEoAhAiBE8NAEEAIARrIQUgA0ECaiEDIAFBDGohBiABKAIMIQcCQANAIAcgA2oiCEF+ai0AACIJQXdqIgpBF0sNAUEBIAp0QZOAgARxRQ0BIAEgA0F/ajYCFCAFIANBAWoiA2pBAkcNAAwCCwsgCUHuAEcNACABIANBf2oiCjYCFCAKIARPDQIgASADNgIUAkAgCEF/ai0AAEH1AEcNACADIAogBCAKIARLGyIKRg0DIAEgA0EBaiIHNgIUIAgtAABB7ABHDQAgByAKRg0DIAEgA0ECajYCFCAIQQFqLQAAQewARg0CCyACQQk2AhQgAkEIaiAGEJCBgIAAIAJBFGogAigCCCACKAIMEJWBgIAAIQMMAwsgAkEUaiABEK2AgIAAAkAgAi0AFEEBRw0AIAAgAigCGDYCBCAAQQE6AAAMBAsgACACLQAVOgABIABBADoAAAwDCyAAQYAEOwEADAILIAJBBTYCFCACIAYQkIGAgAAgAkEUaiACKAIAIAIoAgQQlYGAgAAhAwsgAEEBOgAAIAAgAzYCBAsgAkEgaiSAgICAAAvRAwEJfyOAgICAAEEgayICJICAgIAAAkACQAJAAkACQCABKAIUIgMgASgCECIETw0AQQAgBGshBSADQQJqIQMgAUEMaiEGIAEoAgwhBwJAA0AgByADaiIIQX5qLQAAIglBd2oiCkEXSw0BQQEgCnRBk4CABHFFDQEgASADQX9qNgIUIAUgA0EBaiIDakECRw0ADAILCyAJQe4ARw0AIAEgA0F/aiIKNgIUIAogBE8NAiABIAM2AhQCQCAIQX9qLQAAQfUARw0AIAMgCiAEIAogBEsbIgpGDQMgASADQQFqIgc2AhQgCC0AAEHsAEcNACAHIApGDQMgASADQQJqNgIUIAhBAWotAABB7ABGDQILIAJBCTYCFCACQQhqIAYQkIGAgAAgAkEUaiACKAIIIAIoAgwQlYGAgAAhAwwDCyACQRRqIAEQrICAgAACQCACLwEUQQFHDQAgACACKAIYNgIEIABBATsBAAwECyAAIAIvARY7AQQgAEEBOwECIABBADsBAAwDCyAAQQA2AgAMAgsgAkEFNgIUIAIgBhCQgYCAACACQRRqIAIoAgAgAigCBBCVgYCAACEDCyAAQQE7AQAgACADNgIECyACQSBqJICAgIAAC2YBAX8jgICAgABBEGsiAiSAgICAAAJAAkAgACgCDEUNACAAIQEMAQsgAkEIaiABQQxqEJCBgIAAIAAgAigCCCACKAIMEJWBgIAAIQEgAEEUQQQQ/4CAgAALIAJBEGokgICAgAAgAQumCQEHfyOAgICAAEGwAWsiAySAgICAACADIAI6ABAgAyABNgIMIANBkAFqIANBDGoQqoCAgAACQAJAAkACQAJAAkACQCADLQCQAUEBRg0AIAMtAJEBQQFHDQIgA0GQAWogAygCDCIBENSAgIAAIAMoApABIgJBgICAgHhHDQELIAMoApQBIQIgAEEGOgAAIAAgAjYCBAwFCyADKAKUASEEIAMoApgBIQUgA0EANgIcIANBADYCFCADIAU2AoABIAMgBDYCfCADIAI2AnggARCNgICAACIFRQ0BIABBBjoAACAAIAU2AgQMAgsgAEEANgIMIABBADYCBCAAQQU6AAAMAwsgACABEJGAgIAAIAAtAABBBkcNAQsCQCACRQ0AIAQgAkEBEP+AgIAACyADQRRqENmAgIAADAELIANBIGpBEGogAEEQaikDADcDACADQSBqQQhqIABBCGopAwA3AwAgAyAAKQMANwMgIANBkAFqIANBFGogA0H4AGogA0EgahDagICAAAJAAkACQAJAIAMtAJABDgcDAwMBAgADAAsgA0GQAWpBBHIQ2YCAgAAMAgsgAygClAEiAkUNASADKAKYASACQQEQ/4CAgAAMAQsgA0GQAWpBBHIQ84CAgAAgAygClAEiAkUNACADKAKYASACQRhsQQgQ/4CAgAALIANB+ABqIANBDGoQqoCAgAACQAJAAkAgAy0AeA0AIANBOGpBBGohASADQZABakEEciEGIANBkAFqQQRqIQQDQCADLQB5QQFHDQIgA0H4AGogAygCDCICENSAgIAAAkAgAygCeCIFQYCAgIB4Rw0AIAMoAnwhBwwECyADKAKAASEIIAMoAnwhCQJAAkAgAhCNgICAACIHDQAgA0H4AGogAhCRgICAACADLQB4QQZHDQEgAygCfCEHCyAFRQ0EIAkgBUEBEP+AgIAADAQLIAQgAykDeDcCACAEQRBqIANB+ABqQRBqKQMANwIAIARBCGogA0H4AGpBCGopAwA3AgAgA0E4akEIaiADQZABakEIaikCADcDACADQThqQRBqIANBkAFqQRBqKQIANwMAIANBOGpBGGogA0GQAWpBGGoo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P4ciBoUgBn0gAkEIahCxgYCAACEAAkAgBUJ/VQ0AIABBf2oiAEETSw0DIAJBCGogAGpBLToAAAsCQEEUIABrIgQgASgCACABKAIIIgNrTQ0AIAEgAyAEQQFBARDwgICAACABKAIIIQMLAkAgBEUNACABKAIEIANqIAJBCGogAGogBPwKAAALIAEgAyAEajYCCAwBCwJAIAArAwgiB71C////////////AINCgICAgICAgPj/AFMNAAJAIAEoAgAgASgCCCIAa0EDSw0AIAEgAEEEQQFBARDwgICAACABKAIIIQALIAEgAEEEajYCCCABKAIEIABqQe7qseMGNgAADAELAkAgByACQQhqELKBgIAAIAJBCGprIgAgASgCACABKAIIIgRrTQ0AIAEgBCAAQQFBARDwgICAACABKAIIIQQLAkAgAEUNACABKAIEIARqIAJBCGogAPwKAAALIAEgBCAAajYCCAsgAkEwaiSAgICAAEEADwsgAEEUI4GAgIAAQcTdwYAAahDdgoCAAAALuQIBBX8gASgCCCECIAEoAgQhAwJAIAAoAgAiASgCACABKAIIIgRHDQAgASAEQQFBAUEBEPCAgIAAIAEoAgghBAsgASAEQQFqIgU2AgggASgCBCAEakHbADoAAAJAAkAgAkUNACADIAAQ5YCAgAAiBg0BIAJBGGxBaGohBCADQRhqIQUCQANAIARFDQECQCABKAIAIAEoAggiBkcNACABIAZBAUEBQQEQ8ICAgAAgASgCCCEGCyABIAZBAWo2AgggASgCBCAGakEsOgAAIARBaGohBCAFIAAQ5YCAgAAhBiAFQRhqIQUgBkUNAAwDCwsgASgCCCEFCwJAIAEoAgAgBUcNACABIAVBAUEBQQEQ8ICAgAAgASgCCCEFCyABIAVBAWo2AgggASgCBCAFakHdADoAAEEAIQYLIAYL5AwBCX8CQAJAAkACQAJAAkACQAJAIAAtAAAOBgABAgMEBQALAkAgASgCACIAKAIAIAAoAggiAmtBA0sNACAAIAJBBEEBQQEQ8ICAgAAgACgCCCECCyAAIAJBBGo2AgggACgCBCACakHu6rHjBjYAAAwFCyABKAIAIQICQCAALQABDQACQCACKAIAIAIoAggiAGtBBEsNACACIABBBUEBQQEQ8ICAgAAgAigCCCEACyACIABBBWo2Aggg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IANBBDYCFCADQQxqIAAgA0EUahCFgYCAACADLQAMDQEgAy0ADSEECwJAAkACQAJAAkACQAJAAkACQAJAAkAgBEH/AXFBXmoOVAIAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAFAAAABgAAAAAAAAAHAAAACAAJAQALIANBDDYCFCAAIANBFGoQhoGAgAAhAgwLCyAAIAEgAhCHgYCAACECDAoLAkAgAigCCCIAIAIoAgBHDQAgAhDGgoCAAAsgAigCBCAAakEiOgAAIAIgAEEBajYCCAwHCwJAIAIoAggiACACKAIARw0AIAIQxoKAgAALIAIoAgQgAGpB3AA6AAAgAiAAQQFqNgIIDAYLAkAgAigCCCIAIAIoAgBHDQAgAhDGgoCAAAsgAigCBCAAakEvOgAAIAIgAEEBajYCCAwFCwJAIAIoAggiACACKAIARw0AIAIQxoKAgAALIAIoAgQgAGpBCDoAACACIABBAWo2AggMBAsCQCACKAIIIgAgAigCAEcNACACEMaCgIAACyACKAIEIABqQQw6AAAgAiAAQQFqNgIIDAMLAkAgAigCCCIAIAIoAgBHDQAgAhDGgoCAAAsgAigCBCAAakEKOgAAIAIgAEEBajYCCAwCCwJAIAIoAggiACACKAIARw0AIAIQxoKAgAALIAIoAgQgAGpBDToAACACIABBAWo2AggMAQsCQCACKAIIIgAgAigCAEcNACACEMaCgIAACyACKAIEIABqQQk6AAAgAiAAQQFqNgIIC0EAIQIMAQsgAygCECECCyADQSBqJICAgIAAIAILXAEBfyOAgICAAEEQayIDJICAgIAAIANBCGogASgCACABKAIEIAEoAggQioGAgAAgAiADKAIIIAMoAgwQlYGAgAAhASAAQQE6AAAgACABNgIEIANBEGokgICAgAALUAEBfyOAgICAAEEQayICJICAgIAAIAJBCGogACgCACAAKAIEIAAoAggQioGAgAAgASACKAIIIAIoAgwQlYGAgAAhACACQRBqJICAgIAAIAALkw4BCH8jgICAgABBIGsiAySAgICAAAJAAkACQAJAAkAgACgCBCIEIAAoAggiBUkNAAJAAkAgBCAFa0EDSw0AIAAgBDYCCCADQQQ2AhQgA0EM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akETEPaCgIAADwsgASOBgICAAEG4r8CAAGpBGhD2goCAAA8LIAEjgYCAgABB0q/AgABqQT4Q9oKAgAAPCyABI4GAgIAAQZCwwIAAakEUEPaCgIAADwsgASOBgICAAEGksMCAAGpBNBD2goCAAA8LIAEjgYCAgABB2LDAgABqQSwQ9oKAgAAPCyABI4GAgIAAQYSxwIAAakEkEPaCgIAADwsgASOBgICAAEGoscCAAGpBDhD2goCAAA8LIAEjgYCAgABBtrHAgABqQRMQ9oKAgAAPCyABI4GAgIAAQcmxwIAAakEcEPaCgIAADwsgASOBgICAAEHlscCAAGpBGBD2goCAAAumAQIBfwF+I4CAgIAAQSBrIgIkgICAgAACQAJAIAAoAgAiACgCDEUNACACI4iAgIAArUIghiIDIABBEGqthDcDGCACIAMgAEEMaq2ENwMQIAIjjICAgACtQiCGIACthDcDCCOBgICAACEAIAEoAgAgASgCBCAAQaKDwIAAaiACQQhqEMqCgIAAIQAMAQsgACABEJyBgIAAIQALIAJBIGokgICAgAAgAAuaAQEBfyOAgICAAEEwayIDJICAgIAAIAMgAjYCDCADIAE2AgggA0EQakEIaiAAQQhqKQMANwMAIAMgACkDADcDECADI4SAgIAAQZ+AgIAAaq1CIIYgA0EIaq2ENwMoIAMjjYCAgACtQiCGIANBEGqthDcDICOBgICAAEHxhMCAAGogA0EgahCggYCAACEAIANBMGokgICAgAAgAAvxAgQBfwF8AX4CfyOAgICAAEEwayICJICAgIAAAkACQAJAAkAgAC0AAEF9ag4FAQAAAAIACyACQRBqQQhqIABBCGopAwA3AwAgAiAAKQMANwMQIAJBEGogARC7gYCAACEADAILAkACQCAAKwMIIgO9IgRC////////////AINC//////////f/AFUNACADIAJBEGoQsoGAgAAgAkEQamshACACQRBqIQUMAQsjgYCAgAAiAEGwxcCAAGogAEGzxcCAAGogBEJ/VSIGGyAAQbfFwIAAaiAEQv////////8Hg1AiABshBUEDQQQgBhtBAyAAGyEACyACIAA2AgwgAiAFNgIIIAIjhICAgABBoYCAgABqrUIghiACQQhqrYQ3AygjgYCAgAAhACABKAIAIAEoAgQgAEGXlcCAAGogAkEoahDKgoCAACEADAELIAEjgYCAgABB/bHAgABqQQQQ9oKAgAAhAAsgAkEwaiSAgICAACAAC7UBAQR/I4CAgIAAQRBrIgIkgICAgABBASEDAkACQAJAIAFBAXENACACQQRqIAAgARDEgoCAAAwBCyABQQF2IQRBACEFAkAgAUECSQ0AEIKBgIAAIARBARD+gICAACIDRQ0CIAQhBQsCQCAERQ0AIAMgACAE/AoAAAsgAiAENgIMIAIgAzYCCCACIAU2AgQLIAJBBGoQkoGAgAAhASACQRBqJICAgIAAIAEPC0EBIAQQwYKAgAAAC5oBAQF/I4CAgIAAQTBrIgMkgICAgAAgAyACNgIMIAMgATYCCCADQRBqQQhqIABBCGopAwA3AwAgAyAAKQMANwMQIAMjhICAgABBn4CAgABqrUIghiADQQhqrYQ3AyggAyONgICAAK1CIIYgA0EQaq2ENwMgI4GAgIAAQdKEwIAAaiADQSBqEKCBgIAAIQAgA0EwaiSAgICAACAAC44BAwF/AXwBfiOAgICAAEEQayIDJICAgIAAAkACQAJAAkAgACgCAA4DAAECAAsgACsDCCEEIANBAzoAACADIAQ5AwgMAgsgACkDCCEFIANBAToAACADIAU3AwgMAQsgACkDCCEFIANBAjoAACADIAU3AwgLIAMgASACEJ6BgIAAIQAgA0EQaiSAgICAACAAC3IBAn9BACEDIAJBACABQQFxGyIBQRhsIQICQAJAIAFB1arVKksNAAJAIAINAEEIIQRBACEBDAILEIKBgIAAQQghAyACQQgQ/oCAgAAiBA0BCyADIAIQwYKAgAAACyAAQQA2AgggACAENgIEIAAgATYCAAuCAQEBfyOAgICAAEEQayICJICAgIAAIAJBDGogAUEUaigAADYAACAAQQU6AAAgAiABKQAMNwAEIAAgAikAATcAASAAQQhqIAJBCGopAAA3AAACQCABKAIAIgBBgICAgHhGDQAgAEUNACABKAIEIABBARD/gICAAAsgAkEQaiSAgICAAAuCAQEBfyOAgICAAEEQayICJICAgIAAIAJBDGogAUEUaigAADYAACAAQQU6AAAgAiABKQAMNwAEIAAgAikAATcAASAAQQhqIAJBCGopAAA3AAACQCABKAIAIgBBgICAgHhGDQAgAEUNACABKAIEIABBARD/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cjoABCAAKAIAIAEgAhD2goCAACECIANBEGokgICAgAAgAgsZACABI4GAgIAAQciowYAAakEDEPaCgIAACxkAIAEjgYCAgABBy6jBgABqQQMQ9oKAgAALFAAgACgCACAAKAIEIAEQy4KAgAALGwAgACOBgICAAEGQ4sGAAGogASACEMqCgIAACxQAIAEgACgCACAAKAIEEPaCgIAAC+MGAQF/I4CAgIAAQRBrIgIkgICAgAACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAALQAADhIAAQIDBAUGBwgJCgsMDQ4PEBEACyACIAAtAAE6AAAgAiOOgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABBypXAgABqIAJBCGoQyoKAgAAhAAwRCyACIAApAwg3AwAgAiOFgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABBvJXAgABqIAJBCGoQyoKAgAAhAAwQCyACIAApAwg3AwAgAiOPgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABBvJXAgABqIAJBCGoQyoKAgAAhAAwPCyACIAArAwg5AwAgAiOQgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABBl5XAgABqIAJBCGoQyoKAgAAhAAwOCyACIAAoAgQ2AgAgAiORgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABBrJXAgABqIAJBCGoQyoKAgAAhAAwNCyACIAApAgQ3AgAgAiOEgICAAEGugICAAGqtQiCGIAKthDcDCCOBgICAACEAIAEoAgAgASgCBCAAQamEwIAAaiACQQhqEMqCgIAAIQAMDAsgASOBgICAAEHOqMGAAGpBChD2goCAACEADAsLIAEjgYCAgABB2KjBgABqQQoQ9oKAgAAhAAwKCyABI4GAgIAAQeKowYAAakEMEPaCgIAAIQAMCQsgASOBgICAAEHuqMGAAGpBDhD2goCAACEADAgLIAEjgYCAgABB/KjBgABqQQgQ9oKAgAAhAAwHCyABI4GAgIAAQYSpwYAAakEDEPaCgIAAIQAMBgsgASOBgICAAEGHqcGAAGpBBBD2goCAACEADAULIAEjgYCAgABBi6nBgABqQQwQ9oKAgAAhAAwECyABI4GAgIAAQZepwYAAakEPEPaCgIAAIQAMAwsgASOBgICAAEGmqcGAAGpBDRD2goCAACEADAILIAEjgYCAgABBs6nBgABqQQ4Q9oKAgAAhAAwBCyABIAAoAgQgACgCCBD2goCAACEACyACQRBqJICAgIAAIAAL/AEBAX8jgICAgABBEGsiAiSAgICAAAJAAkAgACkDAEL///////////8Ag0KAgICAgICA+P8AUw0AIAIjkoCAgACtQiCGIACthDcDCCOBgICAACEAIAEoAgAgASgCBCAAQYqIwIAAaiACQQhqEMqCgIAAIQAMAQsgAkEAOgAEIAIgATYCACACI5KAgIAArUIghiAArYQ3AwgCQCACI4GAgIAAIgBBkOLBgABqIABBiojAgABqIAJBCGoQyoKAgAANAAJAIAItAAQNACABI4GAgIAAQcGpwYAAakECEPaCgIAADQELQQAhAAwBC0EBIQALIAJBEGokgICAgAAgAAsWACAAIAIgASgCDBGAgICAAICAgIAACxkAIAEjgYCAgABBw6nBgABqQQkQ9oKAgAALGQAgASOBgICAAEHMqcGAAGpBCBD2goCAAAsJABDHgYCAAAALhQEBAX8jgICAgABBIGsiAiSAgICAACACIAAgARDAgYCAADYCBCACQgA3AwggAiOTgICAAK1CIIYgAkEEaq2ENwMYIAJBEGogAkEIaiOBgICAAEGFl8CAAGogAkEYahDCgYCAACACLQAQIAIoAhQQw4GAgAAgAkEIahDEgYCAABDFgYCAAAALiAIBAX8jgICAgABBEGsiBCSAgICAACAAQQQ6AAAgBCABNgIIIAQgACkCADcDACAEI4GAgIAAQeziwYAAaiACIAMQyoKAgAAhAyAELQAAIQECQAJAAkAgA0UNACABQQRHDQEjgYCAgAAiBEH0qcGAAGpBrQEgBEHE4sGAAGoQ2YKAgAAACyAEKAIEIQACQCABQQRLDQAgAUEDRw0CCyAAKAIAIQMCQCAAQQRqKAIAIgEoAgAiAkUNACADIAIRgYCAgACAgICAAAsCQCABKAIEIgJFDQAgAyACIAEoAggQ/4CAgAALIABBDEEEEP+AgIAADAELIAAgBCkDADcCAAsgBEEQaiSAgICAAAtxAQJ/AkACQCAAQf8BcSIAQQRLDQAgAEEDRw0BCyABKAIAIQICQCABQQRqKAIAIgAoAgAiA0UNACACIAMRgYCAgACAgICAAAsCQCAAKAIEIgNFDQAgAiADIAAoAggQ/4CAgAALIAFBDEEEEP+AgIAACwshAAJAIAAoAgBFDQAgACgCBCIAQX9GDQAgABCFgICAAAsLCQAQ5YGAgAAAC3EBAX8jgICAgABBEGsiAiSAgICAAAJAAkACQCABQQhLDQAgASAATQ0BCyACQQA2AgwgAkEMaiABQQQgAUEESxsgABClgoCAACEBQQAgAigCDCABGyEBDAELIAAQnYKAgAAhAQsgAkEQaiSAgICAACABCwkAEMWBgIAAAAsKACAAEKCCgIAAC50BAQJ/I4CAgIAAQRBrIgQkgICAgAACQAJAAkAgAkEISw0AIAIgA00NAQtBACEFIARBADYCDCAEQQxqIAJBBCACQQRLGyADEKWCgIAADQEgBCgCDCICRQ0BAkAgAyABIAMgAUkbIgNFDQAgAiAAIAP8CgAACyAAEKCCgIAAIAIhBQwBCyAAIAMQo4KAgAAhBQsgBEEQaiSAgICAACAFCzgCAX8BfiOAgICAAEEQayIBJICAgIAAIAApAgAhAiABIAA2AgwgASACNwIEIAFBBGoQy4GAgAAACwsAIAAQ6oGAgAAACw0AIAEgABDNgYCAAAALLwEBfyOAgICAAEEQayICJICAgIAAIAIgATYCDCACIAA2AgggAkEIahDogYCAAAALKwEBfyAAI4GAgIAAQdSpwYAAaiICKQIANwIAIABBCGogAkEIaikCADcCAAsrAQF/IAAjgYCAgABB5KnBgABqIgIpAgA3AgAgAEEIaiACQQhqKQIANwIACxQAIAAoAgAgACgCBCABENKCgIAAC60BAQF/I4CAgIAAQRBrIgUkgICAgAACQCACIAFqIgEgAk8NAEEAQQAQwYKAgAAACyAFQQRqIAAoAgAiAiAAKAIEIAEgAkEBdCICIAEgAksbIgJBCEEEIARBAUYbIgEgAiABSxsiAiADIAQQ0oGAgAACQCAFKAIEQQFHDQAgBSgCCCAFKAIMEMGCgIAAAAsgBSgCCCEEIAAgAjYCACAAIAQ2AgQgBUEQaiSAgICAAAvCAQICfwF+QQEhBkEEIQcCQAJAIAQgBWpBf2pBACAEa3GtIAOtfiIIQiCIp0UNAEEAIQMMAQsCQCAIpyIDQYCAgIB4IARrTQ0AQQAhAwwBCwJAAkACQAJAIAFFDQAgAiAFIAFsIAQgAxCAgYCAACEHDAELAkAgAw0AIAQhBwwCCxCCgYCAACADIAQQ/oCAgAAhBwsgBw0AIAAgBDYCBAwBCyAAIAc2AgRBACEGC0EIIQcLIAAgB2ogAzYCACAAIAY2AgALkwEBAX8QgoGAgAACQAJAQQxBBBD+gICAACIDRQ0AIAMgAikCADcCACADQQhqIAJBCGooAgA2AgAQgoGAgABBDEEEEP6AgIAAIgJFDQEgAiABOgAIIAIgAzYCACACI4GAgIAAQfTlwYAAajYCBCAAIAKtQiCGQgOENwIADwtBBEEMELiCgIAAAAtBBEEMELiCgIAAAAsEAEEAC7IHAwh/An4CfyOAgICAAEEgayIEJICAgIAAAkACQAJAAkACQCADRQ0AIAJBBGohBSADQQN0IgZBeGpBA3ZBAWohB0EAIQgCQANAIAUoAgANASAFQQhqIQUgCEEBaiEIIAZBeGoiBg0ACyAHIQgLIAMgCEkNASADIAhGDQAgAUEEaiEJIAMgCGshCiACIAhBA3RqIQcDQCAKQQN0IQhBACECQQAhBQJAA0ACQCAIIAVHDQBBASEFDAILIAcgBWohBiAFQQhqIgMhBSAGQQRqKAIAIgZFDQALIAcgA2pBeGooAgAhBSAGIQILAkAgASgCAA0AIAEQnIKAgAA2AgQgAUEBNgIACyAEIAkgBSACQYAgIAJBgCBJGyILEJuCgIAAAkACQAJAAkACQAJAAkAgBCgCACIFQQJGDQBBACELIAVBAXENACAEIAQoAgQ2AhAgBEEUaiAEQRBqEJqCgIAAIARBCGpBKCAEQRRqENOBgIAAAkAgBCgCECIFQX9GDQAgBRCEgICAAAsgBCkDCCIMQiCIIg2nIQUgBCgCCCEOIAQoAgwhCwJAAkAgDKdB/wFxDgUEAAEGAwQLIAxCgP4Dg0KAxgBSDQwMBwsgBS0ACEEjRw0LDAYLIA5BgH5xQQRyIQ4gCyEFCwJAIAUNACOBgICAAEGQ48GAAGopAwAhDAwKCyAHQQRqIQYgCEF4akEDdkEBaiEPQQAhAwJAA0AgBSAGKAIAIgJJDQEgBkEIaiEGIANBAWohAyAFIAJrIQUgCEF4aiIIDQALIA8hAwsgCiADSQ0IAkAgCiADRw0AIAVFDQcjgYCAgAAiBUGJq8GAAGpBzwAgBUG448GAAGoQ2YKAgAAACyAHIANBA3RqIgcoAgQiCCAFTw0BI4GAgIAAIgVB5qrBgABqQccAIAVBqOPBgABqENmCgIAAAAsgDUIbUQ0DDAgLIAogA2shCiAHIAggBWs2AgQgByAHKAIAIAVqNgIAIA5B/wFxIgVBBEsNASAFQQNGDQEMAgsgBS0ACEEjRw0GCyALKAIAIQgCQCALQQRqKAIAIgUoAgAiBkUNACAIIAYRgYCAgACAgICAAAsCQCAFKAIEIgZFDQAgCCAGIAUoAggQ/4CAgAALIAtBDEEEEP+AgIAACyAKDQALCyAAQQQ6AAAMAwsgCCADIAMjgYCAgABByOPBgABqEOSCgIAAAAsgAyAKIAojgYCAgABByOPBgABqEOSCgIAAAAsgACAMNwIACyAEQSBqJICAgIAAC+EDAwR/An4CfyOAgICAAEEgayIEJICAgIAAAkACQAJAAkAgA0UNACABQQRqIQUDQAJAIAEoAgANACABEJyCgIAANgIEIAFBATYCAAsgBCAFIAIgA0GAICADQYAgSRsiBhCbgoCAAAJAAkACQAJAAkAgBCgCACIHQQJGDQBBACEGIAdBAXENACAEIAQoAgQ2AhAgBEEUaiAEQRBqEJqCgIAAIARBCGpBKCAEQRRqENOBgIAAAkAgBCgCECIGQX9GDQAgBhCEgICAAAsgBCkDCCIIQiCIIgmnIQYCQAJAIAinQf8BcQ4FAwABBQIDCyAIQoD+A4NCgMYAUg0JDAULIAYtAAhBI0cNCAwECyAGDQEjgYCAgABBkOPBgABqKQMAIQgMBwsgCUIbUQ0CDAYLIAMgBkkNBCACIAZqIQIgAyAGayEDDAELIAYtAAhBI0cNBCAGKAIAIQoCQCAGQQRqKAIAIgcoAgAiC0UNACAKIAsRgYCAgACAgICAAAsCQCAHKAIEIgtFDQAgCiALIAcoAggQ/4CAgAALIAZBDEEEEP+AgIAACyADDQALCyAAQQQ6AAAMAgsgBiADIAMjgYCAgABBmOPBgABqEOSCgIAAAAsgACAINwIACyAEQSBqJICAgIAAC4gCAQF/I4CAgIAAQRBrIgQkgICAgAAgAEEEOgAAIAQgATYCCCAEIAApAgA3AwAgBCOBgICAAEGs4sGAAGogAiADEMqCgIAAIQMgBC0AACEBAkACQAJAIANFDQAgAUEERw0BI4GAgIAAIgRB9KnBgABqQa0BIARBxOLBgABqENmCgIAAAAsgBCgCBCEAAkAgAUEESw0AIAFBA0cNAgsgACgCACEDAkAgAEEEaigCACIBKAIAIgJFDQAgAyACEYGAgIAAgICAgAALAkAgASgCBCICRQ0AIAMgAiABKAIIEP+AgIAACyAAQQxBBBD/gICAAAwBCyAAIAQpAwA3AgALIARBEGokgICAgAALiAIBAX8jgICAgABBEGsiBCSAgICAACAAQQQ6AAAgBCABNgIIIAQgACkCADcDACAEI4GAgIAAQdTiwYAAaiACIAMQyoKAgAAhAyAELQAAIQECQAJAAkAgA0UNACABQQRHDQEjgYCAgAAiBEH0qcGAAGpBrQEgBEHE4sGAAGoQ2YKAgAAACyAEKAIEIQACQCABQQRLDQAgAUEDRw0CCyAAKAIAIQMCQCAAQQRqKAIAIgEoAgAiAkUNACADIAIRgYCAgACAgICAAAsCQCABKAIEIgJFDQAgAyACIAEoAggQ/4CAgAALIABBDEEEEP+AgIAADAELIAAgBCkDADcCAAsgBEEQaiSAgICAAAvqAgEFfwJAAkAgAw0AQQAhBAwBCyADQQNxIQUCQAJAIANBBE8NAEEAIQZBACEEDAELIAJBHGohByADQfz///8AcSEIQQAhBkEAIQQDQCAHKAIAIAdBeGooAgAgB0FwaigCACAHQWhqKAIAIARqampqIQQgB0EgaiEHIAggBkEEaiIGRw0ACwsCQCAFRQ0AIAZBA3QgAmpBBGohBwNAIAcoAgAgBGohBCAHQQhqIQcgBUF/aiIFDQALCyADQQN0IQcCQCAEIAEoAgAgASgCCCIFa00NACABIAUgBEEBQQEQ0YGAgAALIAIgB2ohCCABKAIIIQcDQCACKAIAIQYCQCACQQRqKAIAIgUgASgCACAHa00NACABIAcgBUEBQQEQ0YGAgAAgASgCCCEHCwJAIAVFDQAgASgCBCAHaiAGIAX8CgAACyABIAcgBWoiBzYCCCACQQhqIgIgCEcNAAsLIABBBDoAACAAIAQ2AgQLBABBAQvbAgEFfwJAIANFDQAgA0EDcSEEAkACQCADQQRPDQBBACEFQQAhBgwBCyACQRxqIQcgA0H8////AHEhCEEAIQVBACEGA0AgBygCACAHQXhqKAIAIAdBcGooAgAgB0FoaigCACAGampqaiEGIAdBIGohByAIIAVBBGoiBUcNAAsLAkAgBEUNACAFQQN0IAJqQQRqIQcDQCAHKAIAIAZqIQYgB0EIaiEHIARBf2oiBA0ACwsgA0EDdCEEAkAgBiABKAIAIAEoAggiB2tNDQAgASAHIAZBAUEBENGBgIAAIAEoAgghBwsgAiAEaiEFA0AgAigCACEEAkAgAkEEaigCACIGIAEoAgAgB2tNDQAgASAHIAZBAUEBENGBgIAAIAEoAgghBwsCQCAGRQ0AIAEoAgQgB2ogBCAG/AoAAAsgASAHIAZqIgc2AgggAkEIaiICIAVHDQALCyAAQQQ6AAALCQAgAEEEOgAAC2ABAX8CQCADIAEoAgAgASgCCCIEa00NACABIAQgA0EBQQEQ0YGAgAAgASgCCCEECwJAIANFDQAgASgCBCAEaiACIAP8CgAACyAAIAM2AgQgASAEIANqNgIIIABBBDoAAAtZAQF/AkAgAyABKAIAIAEoAggiBGtNDQAgASAEIANBAUEBENGBgIAAIAEoAgghBAsCQCADRQ0AIAEoAgQgBGogAiAD/AoAAAsgAEEEOgAAIAEgBCADajYCCAtXAQF/AkAgACgCACIAQQxqKAIAIgFFDQAgAEEQaigCACABQQEQ/4CAgAALAkAgAEF/Rg0AIAAgACgCBCIBQX9qNgIEIAFBAUcNACAAQRhBBBD/gICAAAsLTQEBfyOAgICAAEEQayIGJICAgIAAIAYgAjYCDCAGIAE2AgggACAGQQhqI4GAgIAAQdTlwYAAaiICIAZBDGogAiADIAQgBRCIg4CAAAALJgEBfyOBgICAACIAQfmtwYAAakHvACAAQbjkwYAAahDZgoCAAAAL4AIBBX8jgICAgABBEGsiASSAgICAABCCgYCAAEGABCECAkACQEGABEEBEP6AgIAAIgNFDQAgASADNgIIIAFBgAQ2AgQCQAJAAkAgA0GABBCrgoCAAA0AQYAEIQIDQCOUgICAACgCACIEQcQARw0CIAEgAjYCDCABQQRqIAJBAUEBQQEQ0YGAgAAgASgCCCIDIAEoAgQiAhCrgoCAAEUNAAsLIAEgAxC2goCAACIENgIMAkAgAiAETQ0AAkACQCAEDQBBASEFIAMgAkEBEP+AgIAADAELIAMgAkEBIAQQgIGAgAAiBUUNBQsgASAENgIEIAEgBTYCCAsgACABKQIENwIAIABBCGogAUEEakEIaigCADYCAAwBCyAAIAQ2AgggAEKAgICACDcCACACRQ0AIAMgAkEBEP+AgIAACyABQRBqJICAgIAADwtBAUGABBDBgoCAAAALQQEgBBDBgoCAAAALugMBA38jgICAgABBoANrIgMkgICAgAACQAJAAkAgAkH/AksNAAJAIAJFDQAgA0EUaiABIAL8CgAACyADQRRqIAJqQQA6AAAgA0GUA2ogA0EUaiACQQFqENuCgIAAAkAgAygClANBAUcNACADI4GAgIAAQejjwYAAaikDADcCDEGBgICAeCECDAILAkAgAygCmAMQsIKAgAAiAQ0AQYCAgIB4IQIMAgsCQAJAIAEQtoKAgAAiAg0AQQEhBAwBCxCCgYCAACACQQEQ/oCAgAAiBEUNAwsCQCACRQ0AIAQgASAC/AoAAAsgAyACNgIQIAMgBDYCDAwBCyADQQhqIAEgAhDkgYCAACADKAIIIQILAkACQCACQYGAgIB4Rg0AIAAgAykCDDcCBCAAIAI2AgAMAQsCQCADLQAMQQNHDQAgAygCECICKAIAIQQCQCACQQRqKAIAIgEoAgAiBUUNACAEIAURgYCAgACAgICAAAsCQCABKAIEIgVFDQAgBCAFIAEoAggQ/4CAgAALIAJBDEEEEP+AgIAACyAAQYCAgIB4NgIACyADQaADaiSAgICAAA8LQQEgAhDBgoCAAAALnwIBBH8jgICAgABBEGsiAySAgICAACADIAEgAhDIgoCAAAJAAkACQCADKAIAIgJBgICAgHhHDQAgAygCCCEBAkACQCADKAIEIgQQsIKAgAAiBUUNAAJAAkAgBRC2goCAACICDQBBASEGDAELEIKBgIAAIAJBARD+gICAACIGRQ0FCwJAIAJFDQAgBiAFIAL8CgAACyAAIAI2AgggACAGNgIEIAAgAjYCAAwBCyAAQYCAgIB4NgIACyAEQQA6AAAgAUUNASAEIAFBARD/gICAAAwBCyAAQYGAgIB4NgIAIAAjgYCAgABB6OPBgABqKQMANwIEIAJFDQAgAygCBCACQQEQ/4CAgAALIANBEGokgICAgAAPC0EBIAIQwYKAgAAACwkAEKqCgIAAAAtgAQF/I4CAgIAAQRBrIgQkgICAgAAgBCADOgAHIAQjlYCAgACtQiCGIARBB2qthDcDCCAAIAEjgYCAgABBiojAgABqIARBCGogAhGCgICAAICAgIAAIARBEGokgICAgAAL2QIDA38BfgR/I4CAgIAAQRBrIgIkgICAgAAgASgCBCEDIAEoAgAhBCAALQAAIQAgAkEEahDigYCAACACKQIIIQUCQCACKAIEIgFBgICAgHhHDQAgBUL/AYNCA1INACAFQiCIpyIGKAIAIQcCQCAGQQRqKAIAIggoAgAiCUUNACAHIAkRgYCAgACAgICAAAsCQCAIKAIEIglFDQAgByAJIAgoAggQ/4CAgAALIAZBDEEEEP+AgIAACwJAAkACQAJAIAQjgYCAgABBk6zBgABqQREgAygCDCIDEYOAgIAAgICAgAANACAAQQFxDQEgBCOBgICAAEGkrMGAAGpB2AAgAxGDgICAAICAgIAARQ0BC0EBIQQgAUGAgICAeHJBgICAgHhHDQEMAgtBACEEIAFBgICAgHhyQYCAgIB4Rg0BCyAFpyABQQEQ/4CAgAALIAJBEGokgICAgAAgBAsLACAAEOmBgIAAAAs6AQJ/I5aAgIAAKAIAIQEjl4CAgAAhAiAAKAIAIAAoAgQgASACIAEbEYSAgIAAgICAgAAQxYGAgAAAC6sBAQN/I4CAgIAAQRBrIgEkgICAgAACQCAAKAIAIgIoAgQiA0EBcQ0AIAFBgICAgHg2AgAjgYCAgAAhAiABIAA2AgwgASACQZzlwYAAaiAAKAIEIAAoAggiAC0ACCAALQAJEPGBgIAAAAsgAigCACECIAEgA0EBdjYCBCABIAI2AgAgASOBgICAAEG45cGAAGogACgCBCAAKAIIIgAtAAggAC0ACRDxgYCAAAALjgEBA38jgICAgABBEGsiACSAgICAACOBgICAAEHV78GAAGoiAS0AACECIAFBAToAACAAIAI6AA8CQCACQQFHDQAjgYCAgAAhAkEAIABBD2ojmICAgAAgAkH8rMGAAGpBwQAgAkHw48GAAGoQ4IGAgAAACyOBgICAACECIABBEGokgICAgAAgAkHV78GAAGoLcgECfyOAgICAAEEQayIBJICAgIAAIAAtAAAhAiAAQQE6AAAgASACOgAPAkAgAkEBRw0AI4GAgIAAIQBBACABQQ9qI5iAgIAAIABB/KzBgABqQcEAIABB8OPBgABqEOCBgIAAAAsgAUEQaiSAgICAACAAC5wEAgN/AX4jgICAgABBIGsiAiSAgICAAAJAEIGBgIAAQf8BcQ0AI4GAgIAAQdbvwYAAaiIDLQAAIQQgA0EBOgAAI4iAgIAArUIghiEFAkACQCAEDQAgAkIANwMAIAIgATYCDCACIAUgAkEMaq2ENwMYIAJBEGogAiOBgICAAEHJl8CAAGogAkEYahDCgYCAACACLQAQIAIoAhQQw4GAgAAgAhDEgYCAACACQgA3AxAQ64GAgAAhAQJAAkACQAJAEO6BgIAAQf8BcQ4EAAECAwALIAJBGGogAkEQaiOEgICAAEG1gICAAGpBABDmgYCAACACLQAYIAIoAhwQw4GAgAAMAgsgAkEYaiACQRBqI4SAgIAAQbWAgIAAakEBEOaBgIAAIAItABggAigCHBDDgYCAAAwBCyACQRhqIAJBEGojgYCAgABBna3BgABqQZ0BEMKBgIAAIAItABggAigCHBDDgYCAAAsgAUEAOgAAIAJBEGoQxIGAgAAMAQsgAkIANwMAIAIgATYCDCACIAUgAkEMaq2ENwMYIAJBEGogAiOBgICAAEGllsCAAGogAkEYahDCgYCAACACLQAQIAIoAhQQw4GAgAAgAhDEgYCAAAsgAkEgaiSAgICAAA8LIAIgATYCECACI4iAgIAArUIghiACQRBqrYQ3AxgjgYCAgAAiAUHxlMCAAGogAkEYaiABQajkwYAAahDZgoCAAAALqgIBBX8jgICAgABBEGsiACSAgICAAEEDIQECQCOBgICAAEHc78GAAGotAABBf2oiAkH/AXFBA0kNACAAQQRqI4GAgIAAQeutwYAAakEOEOOBgIAAQQIhAgJAIAAoAgQiA0GAgICAeEYNACAAKAIIIQQCQAJAAkACQAJAIAAoAgxBf2oOBAECAgACCyAEKAAAQebqseMGRw0BQQIhAUEBIQIgAw0DDAQLIAQtAABBMEYNAQtBASEBQQAhAiADRQ0CDAELQQMhAUECIQIgA0UNAQsgBCADQQEQ/4CAgAALI4GAgIAAQdzvwYAAaiIDIAMtAAAiAyABIAMbOgAAIANFDQBBAyECIANBBE8NAEGDgIQQIANBA3RB+AFxdiECCyAAQRBqJICAgIAAIAILvggDAn8EfgJ/I4CAgIAAQdAEayICJICAgIAAAkACQAJAAkAgAUUNAAJAIAEoAgAiAygCECIBRQ0AIANBFGooAgBBf2ohAwwECyOBgICAAEHg78GAAGopAwAiBFANASOBgICAAEGwrsGAAGpBACAEIAMpAwhRGyEBQQQhAwwDCyOBgICAAEHg78GAAGopAwAiBEIAUg0BC0EAIQEMAQsjgYCAgABBsK7BgABqQQAjmYCAgAApAwAgBFEbIQFBBCEDCyACIANBCSABGzYCDCACIAEjgYCAgABBtK7BgABqIAEbNgIIAkACQAJAI5mAgIAAKQMAIgVCAFINACOBgICAAEHo78GAAGopAwAhBANAIARCf1ENAiOBgICAAEHo78GAAGoiASAEQgF8IgUgASkDACIGIAYgBFEiARs3AwAgBiEEIAFFDQALI5mAgIAAIAU3AwALIAIgBTcDEAJAQYAERQ0AIAJBGGpBAEGABPwLAAsgAkIANwOgBCACQYAENgKcBCOEgICAACEBIAA1AgQhBCACIAJBGGo2ApgEIAA1AgAhBiACIAQgAUG2gICAAGqtQiCGIgWEIgQ3A8gEIAIgBiABQbeAgIAAaq1CIIaEIgY3A8AEIAIjhYCAgACtQiCGIAJBEGqthCIHNwO4BCACIAUgAkEIaq2EIgU3A7AEIAJBqARqIAJBmARqI4GAgIAAQbeYwIAAaiACQbAEahDXgYCAAAJAAkAgAi0AqAQiAUEERg0AAkAgAUEDSQ0AIAIoAqwEIgEoAgAhCAJAIAFBBGooAgAiAygCACIJRQ0AIAggCRGBgICAAICAgIAACwJAIAMoAgQiCUUNACAIIAkgAygCCBD/gICAAAsgAUEMQQQQ/4CAgAALIAAoAgxBJGooAgAhASAAKAIIIQAgAiAENwPIBCACIAY3A8AEIAIgBzcDuAQgAiAFNwOwBCACQagEaiAAI4GAgIAAQbeYwIAAaiACQbAEaiABEYKAgIAAgICAgAAgAigCrAQhAAJAIAItAKgEIgFBBEsNACABQQNHDQILIAAoAgAhAwJAIABBBGooAgAiASgCACIIRQ0AIAMgCBGBgICAAICAgIAACwJAIAEoAgQiCEUNACADIAggASgCCBD/gICAAAsgAEEMQQQQ/4CAgAAMAQsgAigCoAQiAUGBBE8NAiACQbAEaiAAKAIIIAJBGGogASAAKAIMKAIcEYKAgIAAgICAgAAgAigCtAQhAAJAIAItALAEIgFBBEsNACABQQNHDQELIAAoAgAhAwJAIABBBGooAgAiASgCACIIRQ0AIAMgCBGBgICAAICAgIAACwJAIAEoAgQiCEUNACADIAggASgCCBD/gICAAAsgAEEMQQQQ/4CAgAALIAJB0ARqJICAgIAADwsQ4YGAgAAAC0EAIAFBgAQjgYCAgABB9OTBgABqEOSCgIAAAAufAQIDfwF+I4CAgIAAQSBrIgIkgICAgAAgASgCBCEDIAEoAgAhBCACIAAoAgAiASkCADcCACACI5OAgIAArUIghiIFIAFBDGqthDcDGCACIAUgAUEIaq2ENwMQIAIjhICAgABBtoCAgABqrUIghiACrYQ3AwggBCADI4GAgIAAQeiBwIAAaiACQQhqEMqCgIAAIQEgAkEgaiSAgICAACABC5gGAQN/I4CAgIAAQdAAayIFJICAgIAAIAUgATYCICAFIAA2AhwgBSACNgIkAkACQAJAAkBBARDygYCAAEH/AXEiBkECRg0AIAZBAXFFDQEgBUEQaiAAIAEoAhgRhICAgACAgICAACAFIAUoAhRBACAFKAIQIgEbNgIsIAUgAUEBIAEbNgIoIAVCADcDMCAFI4SAgIAAIgFBtoCAgABqrUIghiAFQShqrYQ3A0AgBSABQbeAgIAAaq1CIIYgBUEkaq2ENwM4IAVByABqIAVBMGojgYCAgABB8JfAgABqIAVBOGoQwoGAgAAgBS0ASCAFKAJMEMOBgIAAIAVBMGoQxIGAgAAMAwsjmoCAgAAoAgAiBkF/Sg0BIAVCADcDSCAFQThqIAVByABqI4GAgIAAQdqrwYAAakHzABDCgYCAACAFLQA4IAUoAjwQw4GAgAAgBUHIAGoQxIGAgAAMAgsgBUIANwMwIAUjhICAgAAiAUG4gICAAGqtQiCGIAVBHGqthDcDQCAFIAFBt4CAgABqrUIghiAFQSRqrYQ3AzggBUHIAGogBUEwaiOBgICAAEHemMCAAGogBUE4ahDCgYCAACAFLQBIIAUoAkwQw4GAgAAgBUEwahDEgYCAAAwBCyOagICAACIHIAZBAWo2AgACQAJAIAcoAgRFDQAgBUEIaiAAIAEoAhQRhICAgACAgICAACAFIAQ6AEUgBSADOgBEIAUgAjYCQCAFIAUpAwg3AjgjmoCAgAAiAigCBCAFQThqIAIoAggoAhQRhICAgACAgICAAAwBCyAFIAAgASgCFBGEgICAAICAgIAAIAUgBDoARSAFIAM6AEQgBSACNgJAIAUgBSkDADcCOCAFQThqEPOBgIAACyOBgICAAEGA8MGAAGpBADoAACOagICAACICIAIoAgBBf2o2AgACQCADDQAgBUIANwNIIAVBOGogBUHIAGojgYCAgABBya7BgABqQdsAEMKBgIAAIAUtADggBSgCPBDDgYCAACAFQcgAahDEgYCAAAwBCyAAIAEQwYGAgAAACxDFgYCAAAALbQECfyObgICAACIBIAEoAgAiAkEBajYCAEEAIQECQCACQQBIDQBBASEBI4GAgIAAQYDwwYAAai0AAA0AI4GAgIAAIgFBgPDBgABqIAA6AAAgAUH878GAAGoiASABKAIAQQFqNgIAQQIhAQsgAQutAwEDfyOAgICAAEEwayIBJICAgIAAQQMhAgJAIAAtAA0NAEEBIQIjgYCAgABB/O/BgABqKAIAQQFLDQAQ7oGAgABB/wFxIQILIAEgAjoADyABIAAoAgg2AhAgASAAKAIAIAAoAgQQ9IGAgAAgASABKQMANwIUI4GAgIAAQdTvwYAAai0AACEAIAEgAUEPajYCJCABIAFBFGo2AiAgASABQRBqNgIcAkACQAJAIABFDQAjgYCAgAAiAEHU78GAAGpBAToAACAAQdDvwYAAaiICKAIAIQAgAkEANgIAIAANAQsgAUIANwMoIAFBHGogAUEoaiOBgICAAEGA5MGAAGoQ9YGAgAAgAUEoahDEgYCAAAwBCyOBgICAACECIAFBHGogAEEIahDsgYCAACIDQQRqIAJByOTBgABqEPWBgIAAIANBADoAACACQdTvwYAAakEBOgAAIAJB0O/BgABqIgMoAgAhAiADIAA2AgAgASACNgIsIAFBATYCKCACRQ0AIAIgAigCACIAQX9qNgIAIABBAUcNACABQShqQQRqEN+BgIAACyABQTBqJICAgIAAC/EBAgN/An4jgICAgABBEGsiAySAgICAACADIAEgAigCDCIEEYSAgIAAgICAgABBBCECIAEhBQJAAkAgAykDAELtuq22zYXU9eMAhSADKQMIQviCmb2V7sbFuX+FhFANACADIAEgBBGEgICAAICAgIAAIAMpAwghBiADKQMAIQcjgYCAgAAhAgJAIAdCp9inm8aCuao4hSAGQqCV0ou2oPv3FYWEQgBRDQAgAkG9rsGAAGohAUEMIQIMAgsgAUEEaiEFQQghAgsgASACaigCACECIAUoAgAhAQsgACACNgIEIAAgATYCACADQRBqJICAgIAAC8wCAwJ/AX4BfyOAgICAAEEgayIDJICAgIAAEOuBgIAAIQQgACkCACEFIAMgAjYCGCADIAE2AhQgAyAFNwIMAkACQCOcgICAACgCACIGQQJLDQAgA0EMakEAEO+BgIAADAELIAMgBkF4ajYCHCADQQxqIANBHGoQ74GAgAALAkACQAJAAkAgACgCCC0AAA4EAAECAwALIANBDGogASACKAIkQQAQ5oGAgAAgAy0ADCADKAIQEMOBgIAADAILIANBDGogASACKAIkQQEQ5oGAgAAgAy0ADCADKAIQEMOBgIAADAELI4GAgIAAQfDkwYAAaiIALQAAIQYgAEEAOgAAIAZFDQAgA0EMaiABI4GAgIAAQZ2twYAAakGdASACKAIkEYKAgIAAgICAgAAgAy0ADCADKAIQEMOBgIAACyAEQQA6AAAgA0EgaiSAgICAAAscACAAKAIAIAEgACgCBCgCDBGAgICAAICAgIAACw8AIAAoAgAgARDUgoCAAAuJAwEFfyOAgICAAEEQayICJICAgIAAIAJBADYCBAJAAkACQCABQYABSQ0AIAFBP3FBgH9yIQMgAUEGdiEEIAFBgBBJDQEgAUEMdiEFIARBP3FBgH9yIQQCQCABQYCABEkNACACIAM6AAcgAiAEOgAGIAIgBUE/cUGAf3I6AAUgAiABQRJ2QXByOgAEQQQhAQwDCyACIAM6AAYgAiAEOgAFIAIgBUHgAXI6AARBAyEBDAILIAIgAToABEEBIQEMAQsgAiADOgAFIAIgBEHAAXI6AARBAiEBCyACQQhqIAAoAgggAkEEaiABENaBgIAAAkAgAi0ACCIBQQRGDQAgACgCBCEEAkACQCAALQAAIgNBBEsNACADQQNHDQELIAQoAgAhBQJAIARBBGooAgAiAygCACIGRQ0AIAUgBhGBgICAAICAgIAACwJAIAMoAgQiBkUNACAFIAYgAygCCBD/gICAAAsgBEEMQQQQ/4CAgAALIAAgAikDCDcCAAsgAkEQaiSAgICAACABQQRHC7kCAQR/I4CAgIAAQRBrIgIkgICAgAAgAkEANgIMAkACQAJAIAFBgAFJDQAgAUE/cUGAf3IhAyABQQZ2IQQgAUGAEEkNASABQQx2IQUgBEE/cUGAf3IhBAJAIAFBgIAESQ0AIAIgAzoADyACIAQ6AA4gAiAFQT9xQYB/cjoADSACIAFBEnZBcHI6AAxBBCEBDAMLIAIgAzoADiACIAQ6AA0gAiAFQeABcjoADEEDIQEMAgsgAiABOgAMQQEhAQwBCyACIAM6AA0gAiAEQcABcjoADEECIQELAkAgASAAKAIIIgAoAgAgACgCCCIDa00NACAAIAMgAUEBQQEQ0YGAgAAgACgCCCEDCwJAIAFFDQAgACgCBCADaiACQQxqIAH8CgAACyAAIAMgAWo2AgggAkEQaiSAgICAAEEAC/sDBAV/AX4BfwF+I4CAgIAAQRBrIgIkgICAgAAgAkEANgIMAkACQAJAIAFBgAFJDQAgAUE/cUGAf3IhAyABQQZ2IQQgAUGAEEkNASABQQx2IQUgBEE/cUGAf3IhBAJAIAFBgIAESQ0AIAIgAzoADyACIAQ6AA4gAiAFQT9xQYB/cjoADSACIAFBEnZBcHI6AAxBBCEBDAMLIAIgAzoADiACIAQ6AA0gAiAFQeABcjoADEEDIQEMAgsgAiABOgAMQQEhAQwBCyACIAM6AA0gAiAEQcABcjoADEECIQELQQAhBgJAQQAgACgCCCIDKAIEIgUgAykDCCIHQv////8PIAdC/////w9UG6drIgQgBCAFSxsiBCABIAQgAUkbIghFDQAgAygCACAHIAWtIgkgByAJVBunaiACQQxqIAj8CgAACyADIAcgCK18NwMIAkAgBCABTw0AI4GAgIAAQZDjwYAAaikDACIHQv8Bg0IEUQ0AIAAoAgQhAwJAAkAgAC0AACIBQQRLDQAgAUEDRw0BCyADKAIAIQQCQCADQQRqKAIAIgEoAgAiBUUNACAEIAURgYCAgACAgICAAAsCQCABKAIEIgVFDQAgBCAFIAEoAggQ/4CAgAALIANBDEEEEP+AgIAACyAAIAc3AgBBASEGCyACQRBqJICAgIAAIAYLGwAgACOBgICAAEHU4sGAAGogASACEMqCgIAACxsAIAAjgYCAgABBrOLBgABqIAEgAhDKgoCAAAsbACAAI4GAgIAAQYTlwYAAaiABIAIQyoKAgAALGwAgACOBgICAAEHs4sGAAGogASACEMqCgIAAC3cBA38gACgCBCEBAkACQCAALQAAIgBBBEsNACAAQQNHDQELIAEoAgAhAgJAIAFBBGooAgAiACgCACIDRQ0AIAIgAxGBgICAAICAgIAACwJAIAAoAgQiA0UNACACIAMgACgCCBD/gICAAAsgAUEMQQQQ/4CAgAALCyABAX8CQCAAKAIAIgFFDQAgACgCBCABQQEQ/4CAgAALCyABAX8CQCAAKAIAIgFFDQAgACgCBCABQQEQ/4CAgAALCyABAX8CQCAAKAIAIgFFDQAgACgCBCABQQEQ/4CAgAALCy0BAX8CQCAAKAIAIgFBgICAgHhyQYCAgIB4Rg0AIAAoAgQgAUEBEP+AgIAACwsbACAAQSg2AgQgACOBgICAAEH2rsGAAGo2AgALCQAgAEEANgIACwIACysBAX8gACOBgICAAEGgr8GAAGoiAikCADcCACAAQQhqIAJBCGopAgA3AgALCQAgAEEANgIAC6kCAQZ/IAAoAgghAgJAAkAgAUGAAU8NAEEBIQMMAQsCQCABQYAQTw0AQQIhAwwBC0EDQQQgAUGAgARJGyEDCyACIQQCQCADIAAoAgAgAmtNDQAgACACIANBAUEBENGBgIAAIAAoAgghBAsgACgCBCAEaiEEAkACQAJAIAFBgAFJDQAgAUE/cUGAf3IhBSABQQZ2IQYgAUGAEEkNASABQQx2IQcgBkE/cUGAf3IhBgJAIAFBgIAESQ0AIAQgBToAAyAEIAY6AAIgBCAHQT9xQYB/cjoAASAEIAFBEnZBcHI6AAAMAwsgBCAFOgACIAQgBjoAASAEIAdB4AFyOgAADAILIAQgAToAAAwBCyAEIAU6AAEgBCAGQcABcjoAAAsgACADIAJqNgIIQQALVAEBfwJAIAIgACgCACAAKAIIIgNrTQ0AIAAgAyACQQFBARDRgYCAACAAKAIIIQMLAkAgAkUNACAAKAIEIANqIAEgAvwKAAALIAAgAyACajYCCEEAC1sBAn8gA0EDdCEDIAJBBGohAgNAAkAgAw0AIAAgAUEBQQAQjIKAgAAPCyADQXhqIQMgAigCACEEIAJBCGoiBSECIARFDQALIAAgASAFQXRqKAIAIAQQjIKAgAAL9gEBAX8jgICAgABBIGsiBCSAgICAAAJAAkAgASgCAEEBRw0AIAFBBGohAQwBCyABEJyCgIAANgIEIAFBATYCACABQQRqIQELIAQgASACIANBgCAgA0GAIEkbIgMQm4KAgAACQAJAIAQoAgAiAUECRg0AAkAgAUEBcUUNACAAQQQ6AAAgAEEANgIEDAILIAQgBCgCBDYCECAEQRRqIARBEGoQmoKAgAAgBEEIakEoIARBFGoQ04GAgAACQCAEKAIQIgFBf0YNACABEISAgIAACyAAIAQpAwg3AgAMAQsgAEEEOgAAIAAgAzYCBAsgBEEgaiSAgICAAAsJACAAQQQ6AAALWQEBfwJAIAIgACgCCCIAKAIAIAAoAggiA2tNDQAgACADIAJBAUEBENGBgIAAIAAoAgghAwsCQCACRQ0AIAAoAgQgA2ogASAC/AoAAAsgACADIAJqNgIIQQALmwIEA38BfgJ/AX5BACEDAkBBACAAKAIIIgQoAgQiBSAEKQMIIgZC/////w8gBkL/////D1Qbp2siByAHIAVLGyIHIAIgByACSRsiCEUNACAEKAIAIAYgBa0iCSAGIAlUG6dqIAEgCPwKAAALIAQgBiAIrXw3AwgCQCAHIAJPDQAjgYCAgABBkOPBgABqKQMAIgZC/wGDQgRRDQAgACgCBCEEAkACQCAALQAAIgJBBEsNACACQQNHDQELIAQoAgAhBwJAIARBBGooAgAiAigCACIFRQ0AIAcgBRGBgICAAICAgIAACwJAIAIoAgQiBUUNACAHIAUgAigCCBD/gICAAAsgBEEMQQQQ/4CAgAALIAAgBjcCAEEBIQMLIAMLxQEBBH8jgICAgABBEGsiAySAgICAACADQQhqIAAoAgggASACENaBgIAAAkAgAy0ACCICQQRGDQAgACgCBCEEAkACQCAALQAAIgFBBEsNACABQQNHDQELIAQoAgAhBQJAIARBBGooAgAiASgCACIGRQ0AIAUgBhGBgICAAICAgIAACwJAIAEoAgQiBkUNACAFIAYgASgCCBD/gICAAAsgBEEMQQQQ/4CAgAALIAAgAykDCDcCAAsgA0EQaiSAgICAACACQQRHCxQAIAEgACgCACAAKAIEEPaCgIAAC0gAAkAgACgCAEGAgICAeEYNACABIAAoAgQgACgCCBD2goCAAA8LIAEoAgAgASgCBCAAKAIMKAIAIgAoAgAgACgCBBDKgoCAAAsbACAAI4GAgIAAQaDmwYAAajYCBCAAIAE2AgALDAAgACABKQIANwMAC1sBAn8gASgCBCECIAEoAgAhAxCCgYCAAAJAQQhBBBD+gICAACIBDQBBBEEIELiCgIAAAAsgASACNgIEIAEgAzYCACAAI4GAgIAAQaDmwYAAajYCBCAAIAE2AgALxAECA38BfiOAgICAAEEgayICJICAgIAAAkAgASgCAEGAgICAeEcNACABKAIMIQMgAkEUakEIaiIEQQA2AgAgAkKAgICAEDcCFCACQRRqI4GAgIAAQYTlwYAAaiADKAIAIgMoAgAgAygCBBDKgoCAABogAkEIakEIaiAEKAIAIgM2AgAgAiACKQIUIgU3AwggAUEIaiADNgIAIAEgBTcCAAsgACABNgIAIAAjgYCAgABBsObBgABqNgIEIAJBIGokgICAgAALtAICA38BfiOAgICAAEEwayICJICAgIAAAkAgASgCAEGAgICAeEcNACABKAIMIQMgAkEkakEIaiIEQQA2AgAgAkKAgICAEDcCJCACQSRqI4GAgIAAQYTlwYAAaiADKAIAIgMoAgAgAygCBBDKgoCAABogAkEYakEIaiAEKAIAIgM2AgAgAiACKQIkIgU3AxggAUEIaiADNgIAIAEgBTcCAAsgASkCACEFIAFCgICAgBA3AgAgAkEIakEIaiIDIAFBCGoiASgCADYCACABQQA2AgAgAiAFNwMIEIKBgIAAAkBBDEEEEP6AgIAAIgENAEEEQQwQuIKAgAAACyABIAIpAwg3AgAgAUEIaiADKAIANgIAIAAjgYCAgABBsObBgABqNgIEIAAgATYCACACQTBqJICAgIAAC0cAAkACQAJAIAENACADRQ0BEIKBgIAAIAMgAhD+gICAACICDQEMAgsgACABIAIgAxCAgYCAACICRQ0BCyACDwsQ5YGAgAAACwIAC00BAX8jgICAgABBEGsiAiSAgICAACABKAIAIAJBCGoQhoCAgAAgACACKAIMIgE2AgggACACKAIINgIEIAAgATYCACACQRBqJICAgIAAC2EBAX8jgICAgABBEGsiBCSAgICAACABKAIAIAIgAyAEQQRqEIeAgIAAQQIhAQJAIAQtAARBAXFFDQAgACAEKAIMNgIEIAQtAAhBAEchAQsgACABNgIAIARBEGokgICAgAALCAAQiICAgAALCgAgABCegoCAAAujLQELfyOAgICAAEEQayIBJICAgIAAAkACQAJAAkACQAJAAkAC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CyALIABBAWoiAEcNAAsgAiEJDAILIAkgDGoiAEEBaiEJAkAgACACTw0AIAogDGotAABBCkcNAEEAIQogCSELIAkhAAwDCyACIAlPDQALCyACIAhGDQJBASEKIAghCyACIQALAkACQCAGLQAARQ0AIAUjgYCAgABB5tfBgABqQQQgBCgCDBGDgICAAICAgIAADQELIAAgCGshDkEAIQwCQCAAIAhGDQAgAyAAai0AAEEKRiEMCyABIAhqIQAgBiAMOgAAIAshCCAFIAAgDiAEKAIMEYOAgIAAgICAgABFDQELC0EBIQcLIAcL9QIBBX8jgICAgABBIGsiAySAgICAACAAKAIAIQRBASEFAkAgAC0ACA0AAkAgACgCBCIGLQAKQYABcQ0AQQEhBSOBgICAACEHIAYoAgAgB0GSuMGAAGogB0GWuMGAAGogBBtBAkEBIAQbIAYoAgQoAgwRg4CAgACAgICAAA0BIAEgBiACKAIMEYCAgIAAgICAgAAhBQwBCwJAIAQNACOBgICAACEHQQEhBSAGKAIAIAdBl7jBgABqQQIgBigCBCgCDBGDgICAAICAgIAADQELQQEhBSADQQE6AA8gAyOBgICAAEG86MGAAGo2AhQgAyAGKQIANwIAIAMgBikCCDcCGCADIANBD2o2AgggAyADNgIQIAEgA0EQaiACKAIMEYCAgIAAgICAgAANACOBgICAACEFIAMoAhAgBUGUuMGAAGpBAiADKAIUKAIMEYOAgIAAgICAgAAhBQsgACAFOgAIIAAgBEEBajYCACADQSBqJICAgIAAIAALxwEBA38gAC0ACCEBAkACQCAAKAIAIgINACABIQMMAQtBASEDAkACQCABQQFxDQAgACgCBCEBIAJBAUcNASAALQAJQQFxRQ0BIAEtAApBgAFxDQEjgYCAgAAhAkEBIQMgASgCACACQZq4wYAAakEBIAEoAgQoAgwRg4CAgACAgICAAEUNAQsgACADOgAIDAELI4GAgIAAIQMgACABKAIAIANBmbjBgABqQQEgASgCBCgCDBGDgICAAICAgIAAIgM6AAgLIANBAXELOQAgACABKAIAIAIgAyABKAIEKAIMEYOAgIAAgICAgAA6AAggACABNgIEIAAgA0U6AAkgAEEANgIAC0kAAkAgAkGAgMQARg0AIAAgAiABKAIQEYCAgIAAgICAgABFDQBBAQ8LAkAgAw0AQQAPCyAAIAMgBCABKAIMEYOAgIAAgICAgAAL8QYBCH8CQAJAIAEgAEEDakF8cSICIABrIgNJDQAgASADayIEQQRJDQAgBEEDcSEFQQAhBkEAIQECQCACIABGDQBBACEHQQAhAQJAIAAgAmsiCEF8Sw0AQQAhB0EAIQEDQCABIAAgB2oiAiwAAEG/f0pqIAJBAWosAABBv39KaiACQQJqLAAAQb9/SmogAkEDaiwAAEG/f0pqIQEgB0EEaiIHDQALCyAAIAdqIQIDQCABIAIsAABBv39KaiEBIAJBAWohAiAIQQFqIggNAAsLIAAgA2ohCAJAIAVFDQAgCCAEQfz///8HcWoiAiwAAEG/f0ohBiAFQQFGDQAgBiACLAABQb9/SmohBiAFQQJGDQAgBiACLAACQb9/SmohBgsgBEECdiEDIAYgAWohBwNAIAghBiADRQ0CIANBwAEgA0HAAUkbIgRBA3EhBQJAAkAgBEECdCIJQfAHcSIIDQBBACECDAELQQAhAiAGIQEDQCABQQxqKAIAIgBBf3NBB3YgAEEGdnJBgYKECHEgAUEIaigCACIAQX9zQQd2IABBBnZyQYGChAhxIAFBBGooAgAiAEF/c0EHdiAAQQZ2ckGBgoQIcSABKAIAIgBBf3NBB3YgAEEGdnJBgYKECHEgAmpqamohAiABQRBqIQEgCEFwaiIIDQALCyADIARrIQMgBiAJaiEIIAJBCHZB/4H8B3EgAkH/gfwHcWpBgYAEbEEQdiAHaiEHIAVFDQALIAYgBEH8AXFBAnRqIgIoAgAiAUF/c0EHdiABQQZ2ckGBgoQIcSEBAkAgBUEBRg0AIAIoAgQiCEF/c0EHdiAIQQZ2ckGBgoQIcSABaiEBIAVBAkYNACACKAIIIgJBf3NBB3YgAkEGdnJBgYKECHEgAWohAQsgAUEIdkH/gRxxIAFB/4H8B3FqQYGABGxBEHYgB2ohBwwBCwJAIAENAEEADwsgAUEDcSEIAkACQCABQQRPDQBBACECQQAhBwwBCyABQXxxIQNBACECQQAhBwNAIAcgACACaiIBLAAAQb9/SmogAUEBaiwAAEG/f0pqIAFBAmosAABBv39KaiABQQNqLAAAQb9/SmohByADIAJBBGoiAkcNAAsLIAhFDQAgACACaiEBA0AgByABLAAAQb9/SmohByABQQFqIQEgCEF/aiIIDQALCyAHC9kFAQh/I4CAgIAAQRBrIgMkgICAgAACQAJAIAIoAgQiBEUNACAAIAIoAgAgBCABKAIMEYOAgIAAgICAgABFDQBBASEFDAELAkAgAigCDCIEDQBBACEFDAELIAIoAggiBiAEQQxsaiEHIAZBDGohBCADQQxqIQgDQCAGIQIgBCEGAkACQAJAAkAgAi8BAA4DAAIBAAsCQAJAIAIoAgQiAkHBAEkNACABQQxqKAIAIQQDQAJAIAAjgYCAgABBm7jBgABqQcAAIAQRg4CAgACAgICAAEUNAEEBIQUMCAsgAkFAaiICQcAASw0ADAILCyACRQ0DCyAAI4GAgIAAQZu4wYAAaiACIAFBDGooAgARg4CAgACAgICAAEUNAkEBIQUMBAsgACACKAIEIAIoAgggAUEMaigCABGDgICAAICAgIAARQ0BQQEhBQwDCyACLwECIQUgCEEAOgAAIANBADYCCAJAAkACQAJAAkACQAJAIAIvAQAOAwABAgALIAIoAgQhCQwDCyACLwECIgINAUEBIQkMAwsgAigCCCEJDAELIAJB9v8XaiACQZz/H2pxIAJBmPg3aiACQfCxH2pxc0ERdkEBaiEJCwJAIAlBBkkNAEEAIAlBBSOBgICAAEHU6MGAAGoQ5IKAgAAACyAJDQBBACEJDAELIANBCGogCWohAgJAAkAgCUEBcQ0AIAUhBAwBCyACQX9qIgIgBSAFQf//A3FBCm4iBEEKbGtBMHI6AAALIAlBAUYNACACQX5qIQIDQCACIARB//8DcSIFQQpuIgpBCnBBMHI6AAAgAkEBaiAEIApBCmxrQTByOgAAIAVB5ABuIQQgAiADQQhqRyEFIAJBfmohAiAFDQALCyAAIANBCGogCSABQQxqKAIAEYOAgIAAgICAgABFDQBBASEFDAILQQAhBSAGQQBBDCAGIAdGIgIbaiEEIAJFDQALCyADQRBqJICAgIAAIAULHgAgACgCACABIAIgACgCBCgCDBGDgICAAICAgIAAC/kGAwt/A34BfyOAgICAAEGgAWsiAySAgICAAAJAQaABRQ0AIANBAEGgAfwLAAsCQAJAAkACQCAAKAKgASIEIAJJDQAgBEEpTw0BIAEgAkECdGohBQJAAkACQCAERQ0AIARBAWohBiAEQQJ0IQJBACEHQQAhCANAIAMgB0ECdGohCQNAIAchCiAJIQsgASAFRg0IIAtBBGohCSAKQQFqIQcgASgCACEMIAFBBGoiDSEBIAxFDQALIAytIQ5CACEPIAIhDCAKIQEgACEJA0AgAUEoTw0EIAsgDyALNQIAfCAJNQIAIA5+fCIQPgIAIBBCIIghDyALQQRqIQsgAUEBaiEBIAlBBGohCSAMQXxqIgwNAAsgBCELAkAgEEKAgICAEFQNACAKIARqIgtBKE8NAyADIAtBAnRqIA+nNgIAIAYhCwsgCCALIApqIgsgCCALSxshCCANIQEMAAsLQQAhCEEAIQsDQCABIAVGDQYgC0EBaiELIAEoAgAhCSABQQRqIgchASAJRQ0AIAggC0F/aiIBIAggAUsbIQggByEBDAALCyALQSgjgYCAgABB5OjBgABqEN2CgIAAAAsgAUEoI4GAgIAAQeTowYAAahDdgoCAAAALIARBKU8NASACQQFqIREgAkECdCEGIAAgBEECdGohDUEAIQogACEJQQAhCAJAA0AgAyAKQQJ0aiEHA0AgCiEMIAchCyAJIA1GDQUgC0EEaiEHIAxBAWohCiAJKAIAIQUgCUEEaiIEIQkgBUUNAAsgBa0hDkIAIQ8gBiEFIAwhCSABIQcDQCAJQShPDQIgCyAPIAs1AgB8IAc1AgAgDn58IhA+AgAgEEIgiCEPIAtBBGohCyAJQQFqIQkgB0EEaiEHIAVBfGoiBQ0ACyACIQsCQAJAIBBCgICAgBBUDQAgDCACaiILQShPDQEgAyALQQJ0aiAPpzYCACARIQsLIAggCyAMaiILIAggC0sbIQggBCEJDAELCyALQSgjgYCAgABB5OjBgABqEN2CgIAAAAsgCUEoI4GAgIAAQeTowYAAahDdgoCAAAALQQAgBEEoI4GAgIAAQeTowYAAahDkgoCAAAALQQAgBEEoI4GAgIAAQeTowYAAahDkgoCAAAALAkBBoAFFDQAgACADQaAB/AoAAAsgACAINgKgASADQaABaiSAgICAACAAC9wEAQl/AkACQAJAIAFBgApPDQAgAUEFdiECAkACQAJAIAAoAqABIgNFDQAgA0F/aiEEIANBAnQgAGpBfGohBSADIAJqQQJ0IABqQXxqIQYgA0EpSSEDA0AgA0UNAiACIARqIgdBKE8NAyAGIAUoAgA2AgAgBkF8aiEGIAVBfGohBSAEQX9qIgRBf0cNAAsLIAFBH3EhBgJAIAFBIEkNACACQQJ0IgRFDQAgAEEAIAT8CwALIAAoAqABIgQgAmohBQJAIAYNACAAIAU2AqABIAAPCyAFQX9qIgNBJ0sNAyAFIQggACADQQJ0aigCAEEgIAZrIgN2IgdFDQQCQCAFQSdLDQAgACAFQQJ0aiAHNgIAIAVBAWohCAwFCyAFQSgjgYCAgABB5OjBgABqEN2CgIAAAAsgBEEoI4GAgIAAQeTowYAAahDdgoCAAAALIAdBKCOBgICAAEHk6MGAAGoQ3YKAgAAACyOBgICAACIEQZC5wYAAakEdIARB5OjBgABqEOaCgIAAAAsgA0EoI4GAgIAAQeTowYAAahDdgoCAAAALAkAgAkEBaiIJIAVPDQACQCAEQQFxDQAgACAFQX9qIgVBAnRqIgcgB0F8aigCACADdiAHKAIAIAZ0cjYCAAsgBEECRg0AIAVBAnQgAGpBdGohBANAIARBCGoiByAEQQRqIgEoAgAiCiADdiAHKAIAIAZ0cjYCACABIAQoAgAgA3YgCiAGdHI2AgAgBEF4aiEEIAkgBUF+aiIFSQ0ACwsgACACQQJ0aiIEIAQoAgAgBnQ2AgAgACAINgKgASAAC6IDAQR/AkACQAJAAkACQAJAAkAgByAIWA0AIAcgCH0gCFgNAwJAIAcgBn0gBlgNACAHIAZCAYZ9IAhCAYZaDQMLIAYgCFgNBiAHIAYgCH0iCH0gCFYNBiADIAJNDQFBACADIAIjgYCAgABB1OnBgABqEOSCgIAAAAsgAEEANgIADwsgASADaiEJQQAhCiABIQsCQAJAA0AgAyAKRg0BIApBAWohCiALQX9qIgsgA2oiDC0AAEE5Rg0ACyAMIAwtAABBAWo6AAAgCkF/aiIKRQ0BIAxBAWpBMCAK/AsADAELAkACQCADDQBBMSEKDAELIAFBMToAAEEwIQogA0F/aiILRQ0AIAFBAWpBMCAL/AsACyAEQQFqwSIEIAXBTA0AIAMgAk8NACAJIAo6AAAgA0EBaiEDCyADIAJLDQIMAwsgAyACTQ0CQQAgAyACI4GAgIAAQeTpwYAAahDkgoCAAAALIABBADYCAA8LQQAgAyACI4GAgIAAQcTpwYAAahDkgoCAAAALIAAgBDsBCCAAIAM2AgQgACABNgIADwsgAEEANgIAC00BAX8jgICAgABBEGsiBiSAgICAACAGIAI2AgwgBiABNgIIIAAgBkEIaiOBgICAAEGk78GAAGoiAiAGQQxqIAIgAyAEIAUQiIOAgAAAC6cLAgd/A34CQAJAAkACQAJAAkAgAUEISQ0AIAFBB3EiAkUNBSOBgICAACEDIAAoAqABIgRBKU8NAQJAIAQNACAAQQA2AqABDAYLIARBAnQiBUF8aiIGQQJ2QQFqIgdBA3EhCCADQZTHwYAAaiACQQJ0aigCACACdq0hCQJAAkAgBkEMTw0AQgAhCiAAIQIMAQsgB0H8////B3EhA0IAIQogACECA0AgAiACNQIAIAl+IAp8Igo+AgAgAkEEaiIGIAY1AgAgCX4gCkIgiHwiCj4CACACQQhqIgYgBjUCACAJfiAKQiCIfCIKPgIAIAJBDGoiBiAGNQIAIAl+IApCIIh8Igs+AgAgC0IgiCEKIAJBEGohAiADQXxqIgMNAAsLAkAgCEUNACAIQQJ0IQMDQCACIAI1AgAgCX4gCnwiCz4CACACQQRqIQIgC0IgiCEKIANBfGoiAw0ACwsCQCALQoCAgIAQVA0AIARBKEYNAyAAIAVqIAqnNgIAIARBAWohBAsgACAENgKgAQwFCyOBgICAACECIAAoAqABIgZBKU8NAgJAIAYNACAAQQA2AqABIAAPCyACQZTHwYAAaiABQQJ0ajUCACEJIAZBAnQiCEF8aiICQQJ2QQFqIgNBA3EhBAJAAkAgAkEMTw0AQgAhCiAAIQIMAQsgA0H8////B3EhA0IAIQogACECA0AgAiACNQIAIAl+IAp8Igo+AgAgAkEEaiIBIAE1AgAgCX4gCkIgiHwiCj4CACACQQhqIgEgATUCACAJfiAKQiCIfCIKPgIAIAJBDGoiASABNQIAIAl+IApCIIh8Igs+AgAgC0IgiCEKIAJBEGohAiADQXxqIgMNAAsLAkAgBEUNACAEQQJ0IQMDQCACIAI1AgAgCX4gCnwiCz4CACACQQRqIQIgC0IgiCEKIANBfGoiAw0ACwsCQCALQoCAgIAQVA0AIAZBKEYNBCAAIAhqIAqnNgIAIAZBAWohBgsgACAGNgKgASAADwtBACAEQSgjgYCAgABB5OjBgABqEOSCgIAAAAtBKEEoI4GAgIAAQeTowYAAahDdgoCAAAALQQAgBkEoI4GAgIAAQeTowYAAahDkgoCAAAALQShBKCOBgICAAEHk6MGAAGoQ3YKAgAAACwJAAkACQCABQQhxRQ0AIAAoAqABIgRBKU8NAQJAAkAgBA0AQQAhBAwBCyAEQQJ0IgdBfGoiAkECdkEBaiIDQQNxIQgCQAJAIAJBDE8NAEIAIQkgACECDAELIANB/P///wdxIQNCACEJIAAhAgNAIAIgAjUCAELh6xd+IAl8Igk+AgAgAkEEaiIGIAY1AgBC4esXfiAJQiCIfCIJPgIAIAJBCGoiBiAGNQIAQuHrF34gCUIgiHwiCT4CACACQQxqIgYgBjUCAELh6xd+IAlCIIh8Igo+AgAgCkIgiCEJIAJBEGohAiADQXxqIgMNAAsLAkAgCEUNACAIQQJ0IQMDQCACIAI1AgBC4esXfiAJfCIKPgIAIAJBBGohAiAKQiCIIQkgA0F8aiIDDQALCyAKQoCAgIAQVA0AIARBKEYNAyAAIAdqIAmnNgIAIARBAWohBAsgACAENgKgAQsCQCABQRBxRQ0AIAAjgYCAgABBvMfBgABqQQIQ94KAgAAaCwJAIAFBIHFFDQAgACOBgICAAEHEx8GAAGpBAxD3goCAABoLAkAgAUHAAHFFDQAgACOBgICAAEHQx8GAAGpBBRD3goCAABoLAkAgAUGAAXFFDQAgACOBgICAAEHkx8GAAGpBChD3goCAABoLAkAgAUGAAnFFDQAgACOBgICAAEGMyMGAAGpBExD3goCAABoLIAAgARD4goCAABogAA8LQQAgBEEoI4GAgIAAQeTowYAAahDkgoCAAAALQShBKCOBgICAAEHk6MGAAGoQ3YKAgAAAC+EHAgN/AX4jgICAgABB0ABrIgUkgICAgAAgBSADNgIEIAUgAjYCAAJAAkACQAJAIAFBgQJJDQBB/QEhBgNAAkACQCAAIAZqIgdBA2osAABBv39KDQAgB0ECaiwAAEG/f0wNASAGQQJqIQYMBQsgBkEDaiEGDAQLIAdBAWosAABBv39KDQIgBywAAEG/f0oNAyAGQXxqIgZBfUcNAAtBACEGDAILIAUgATYCDCAFIAA2AghBACEGQQEhBwwCCyAGQQFqIQYLIAUgADYCCCOBgICAACEHIAUgBjYCDCAHQdjKwYAAakEBIAYgAUkiBhshB0EFQQAgBhshBgsgBSAGNgIUIAUgBzYCEAJAAkAgAiABSw0AIAMgAU0NASADIQILIAUgAjYCICAFI5OAgIAArUIghiAFQSBqrYQ3AyggBSOEgICAAEHwgICAAGqtQiCGIgggBUEQaq2ENwM4IAUgCCAFQQhqrYQ3AzAjgYCAgABB1IDAgABqIAVBKGogBBDZgoCAAAALAkACQAJAAkACQCACIANLDQACQAJAIAJFDQAgAiABTw0AIAAgAmosAABBQEgNAQsgAyECCyAFIAI2AhggAiABTw0CQQAhByACRQ0BA0ACQCAAIAJqLAAAQb9/TA0AIAIhBwwDCyACQX9qIgINAAwCCwsgBSOTgICAAK1CIIYiCCAFQQRqrYQ3AzAgBSAIIAWthDcDKCAFI4SAgIAAQfCAgIAAaq1CIIYiCCAFQRBqrYQ3A0AgBSAIIAVBCGqthDcDOCOBgICAAEGogMCAAGogBUEoaiAEENmCgIAAAAsgByABRg0AAkACQCAAIAdqIgAsAAAiBkF/Sg0AIAAtAAFBP3EhAiAGQR9xIQEgBkFfSw0BIAFBBnQgAnIhBgwDCyAFIAZB/wFxNgIcQQEhBgwDCyACQQZ0IAAtAAJBP3FyIQICQCAGQXBPDQAgAiABQQx0ciEGDAILIAJBBnQgAC0AA0E/cXIgAUESdEGAgPAAcXIiBkGAgMQARw0BCyAEEP2CgIAAAAsgBSAGNgIcAkAgBkGAAU8NAEEBIQYMAQsCQCAGQYAQTw0AQQIhBgwBC0EDQQQgBkGAgARJGyEGCyAFIAc2AiAgBSAGIAdqNgIkIAUjhICAgAAiB0HwgICAAGqtQiCGIgggBUEQaq2ENwNIIAUgCCAFQQhqrYQ3A0AgBSAHQfGAgIAAaq1CIIYgBUEgaq2ENwM4IAUjoYCAgACtQiCGIAVBHGqthDcDMCAFI5OAgIAArUIghiAFQRhqrYQ3AygjgYCAgABB/YDAgABqIAVBKGogBBDZgoCAAAALGgAjgYCAgABB3crBgABqQSsgABDmgoCAAAALVQECf0EBIQICQCAAIAEQzoKAgAANACOBgICAACEDIAEoAgAgA0Hk18GAAGpBAiABKAIEKAIMEYOAgIAAgICAgAANACAAQQRqIAEQzoKAgAAhAgsgAgu9DAMJfwF+An8CQAJAAkAgBEUNAEEBIQVBACEGQQAhB0EBIQgCQCAEQQFGDQBBASEJQQEhCkEAIQtBASEFQQAhBgNAAkACQCAGIAtqIgwgBE8NAAJAIAMgCWotAABB/wFxIgkgAyAMai0AACIMSQ0AAkAgCSAMRg0AQQEhBUEAIQsgCiEGIApBAWohCgwDC0EAIAtBAWoiCSAJIAVGIgwbIQsgCUEAIAwbIApqIQoMAgsgCiALakEBaiIKIAZrIQVBACELDAELIAwgBCOBgICAAEG07sGAAGoQ3YKAgAAACyAKIAtqIgkgBEkNAAtBASEJQQEhCkEAIQtBASEIQQAhBwNAAkACQAJAIAcgC2oiDCAETw0AIAMgCWotAABB/wFxIgkgAyAMai0AACIMSw0BAkAgCSAMRg0AQQEhCEEAIQsgCiEHIApBAWohCgwDC0EAIAtBAWoiCSAJIAhGIgwbIQsgCUEAIAwbIApqIQoMAgsgDCAEI4GAgIAAQbTuwYAAahDdgoCAAAALIAogC2pBAWoiCiAHayEIQQAhCwsgCiALaiIJIARJDQALCwJAAkACQAJAIAQgBiAHIAYgB0siCxsiDUkNACAFIAggCxsiCiANaiILIApJDQEgCyAESw0BAkACQCADIAMgCmogDRCxgoCAAEUNACAEQQNxIQkCQAJAIARBf2pBA08NAEIAIQ5BACEKDAELIARBfHEhDEIAIQ5BACEKA0BCASADIApqIgtBA2oxAACGQgEgC0ECajEAAIZCASALQQFqMQAAhkIBIAsxAACGIA6EhISEIQ4gDCAKQQRqIgpHDQALCwJAIAlFDQAgAyAKaiELA0BCASALMQAAhiAOhCEOIAtBAWohCyAJQX9qIgkNAAsLIAQgDWsiCyANIAsgDUsbQQFqIQpBfyEHIA0hBUF/IQsMAQsgBEF/aiEHQQEhBkEAIQtBASEMQQAhCAJAA0AgDCIJIAtqIg8gBE8NASAEIAtrIAlBf3NqIgwgBE8NCSAHIAsgCGprIgUgBE8NCAJAAkACQCADIAxqLQAAQf8BcSIMIAMgBWotAAAiBUkNACAMIAVGDQEgCUEBaiEMQQAhC0EBIQYgCSEIDAILIA9BAWoiDCAIayEGQQAhCwwBC0EAIAtBAWoiDCAMIAZGIgUbIQsgDEEAIAUbIAlqIQwLIAYgCkcNAAsLQQEhBkEAIQtBASEMQQAhDwJAA0AgDCIJIAtqIhAgBE8NASAEIAtrIAlBf3NqIgwgBE8NBSAHIAsgD2prIgUgBE8NBgJAAkACQCADIAxqLQAAQf8BcSIMIAMgBWotAAAiBUsNACAMIAVGDQEgCUEBaiEMQQAhC0EBIQYgCSEPDAILIBBBAWoiDCAPayEGQQAhCwwBC0EAIAtBAWoiDCAMIAZGIgUbIQsgDEEAIAUbIAlqIQwLIAYgCkcNAAsLIAQgDyAIIA8gCEsbayEFAkACQCAKDQBCACEOQQAhCkEAIQcMAQsgCkEDcSEMQQAhBwJAAkAgCkEETw0AQgAhDkEAIQkMAQsgCkF8cSEGQgAhDkEAIQkDQEIBIAMgCWoiC0EDajEAAIZCASALQQJqMQAAhkIBIAtBAWoxAACGQgEgCzEAAIYgDoSEhIQhDiAGIAlBBGoiCUcNAAsLIAxFDQAgAyAJaiELA0BCASALMQAAhiAOhCEOIAtBAWohCyAMQX9qIgwNAAsLIAQhCwsgACAENgI8IAAgAzYCOCAAIAI2AjQgACABNgIwIAAgCzYCKCAAIAc2AiQgACACNgIgIABBADYCHCAAIAo2AhggACAFNgIUIAAgDTYCECAAIA43AwggAEEBNgIADwtBACANIAQjgYCAgABB9O7BgABqEOSCgIAAAAsgCiALIAQjgYCAgABB5O7BgABqEOSCgIAAAAsgDCAEI4GAgIAAQcTuwYAAahDdgoCAAAALIAUgBCOBgICAAEHU7sGAAGoQ3YKAgAAACyAAQQA2AjwgACADNgI4IAAgAjYCNCAAIAE2AjAgAEEAOgAOIABBgQI7AQwgACACNgIIIABCADcDAA8LIAUgBCOBgICAAEHU7sGAAGoQ3YKAgAAACyAMIAQjgYCAgABBxO7BgABqEN2CgIAAAAvdAgEFf0EAIQEjgYCAgABBiMvBgABqIgIgAkEAQRAgAEGrnQRJGyIDIANBCHIiAyACIANBAnRqKAIAQQt0IABBC3QiA0sbIgQgBEEEciIEIAIgBEECdGooAgBBC3QgA0sbIgQgBEECciIEIAIgBEECdGooAgBBC3QgA0sbIgQgBEEBaiIEIAIgBEECdGooAgBBC3QgA0sbIgQgBEEBaiIEIAIgBEECdGooAgBBC3QgA0sbIgRBAnRqKAIAQQt0IgIgA0YgAiADSWogBGoiBEECdGoiBSgCAEEVdiECQf8FIQMCQAJAIARBH0sNACAFKAIEQRV2IQMgBEUNAQsgBUF8aigCAEH///8AcSEBCwJAIAMgAkF/c2pFDQAgACABayEAIANBf2ohBEEAIQMDQCADI4GAgIAAQZywwYAAaiACai0AAGoiAyAASw0BIAQgAkEBaiICRw0ACwsgAkEBcQvOBwEHfwJAAkACQCAAQSBJDQACQCAAQf8ATw0AQQEhAQwDCwJAAkAgAEGAgARJDQAgAEGAgAhJDQEgAEH+//8AcSIBQa6dC0cgAEHg//8AcUHgzQpHIAFBnvAKR3FxIABBkKh0akFxSXEgAEGAkHRqQd5sSXEgAEGAgHRqQZ50SXEgAEGw2XNqQXtJcSAAQYD+R2pB+uZUSXEgAEHwgzhJcSEBDAQLI4GAgIAAQbTSwYAAaiICQQJqIQEgAEEIdkH/AXEhA0EAIQQCQANAIAEhBSAEIAItAAEiAWohBgJAAkAgAi0AACICIANGDQAgAiADSw0DDAELAkAgBiAESQ0AIAZBnAJLDQAjgYCAgABBgNPBgABqIARqIQIDQCABRQ0CIAFBf2ohASACLQAAIQQgAkEBaiECIAQgAEH/AXFHDQAMBgsLIAQgBkGcAiOBgICAAEGU78GAAGoQ5IKAgAAACyAFQQBBAiAFI4GAgIAAQbTSwYAAakHMAGoiB0YbaiEBIAYhBCAFIQIgBSAHRw0ACwtBASEBQQAhAgNAIAJBAWohBQJAAkAjgYCAgABBnNXBgABqIAJqLAAAIgRBAEgNACAFIQIMAQsCQCAFQaQCRg0AIARB/wBxQQh0I4GAgIAAQZzVwYAAaiACakEBai0AAHIhBCACQQJqIQIMAQsjgYCAgABBhO/BgABqEP2CgIAAAAsgACAEayIAQQBIDQQgAUEBcyEBIAJBpAJHDQAMBAsLI4GAgIAAQYzMwYAAaiICQQJqIQEgAEEIdkH/AXEhA0EAIQQDQCABIQUgBCACLQABIgFqIQYCQAJAIAItAAAiAiADRg0AIAIgA00NAQwECwJAIAYgBEkNACAGQdQBSw0AI4GAgIAAQejMwYAAaiAEaiECA0AgAUUNAiABQX9qIQEgAi0AACEEIAJBAWohAiAEIABB/wFxRw0ADAQLCyAEIAZB1AEjgYCAgABBlO/BgABqEOSCgIAAAAsgBUEAQQIgBSOBgICAAEGMzMGAAGpB3ABqRiIHG2ohASAGIQQgBSECIAdFDQAMAgsLQQAhAQwBCyAAQf//A3EhBEEBIQFBACECA0AgAkEBaiEFAkACQCOBgICAAEG8zsGAAGogAmosAAAiAEEASA0AIAUhAgwBCwJAIAVB+ANGDQAgAEH/AHFBCHQjgYCAgABBvM7BgABqIAJqQQFqLQAAciEAIAJBAmohAgwBCyOBgICAAEGE78GAAGoQ/YKAgAAACyAEIABrIgRBAEgNASABQQFzIQEgAkH4A0cNAAsLIAFBAXELZgIBfwF+I4CAgIAAQSBrIgMkgICAgAAgAyABNgIMIAMgADYCCCADI5OAgIAArUIghiIEIANBDGqthDcDGCADIAQgA0EIaq2ENwMQI4GAgIAAQfCBwIAAaiADQRBqIAIQ2YKAgAAAC2YCAX8BfiOAgICAAEEgayIDJICAgIAAIAMgATYCDCADIAA2AgggAyOTgICAAK1CIIYiBCADQQxqrYQ3AxggAyAEIANBCGqthDcDECOBgICAAEG5g8CAAGogA0EQaiACENmCgIAAAAtmAgF/AX4jgICAgABBIGsiAySAgICAACADIAE2AgwgAyAANgIIIAMjk4CAgACtQiCGIgQgA0EMaq2ENwMYIAMgBCADQQhqrYQ3AxAjgYCAgABB8oPAgABqIANBEGogAhDZgoCAAAALpgIBBX8CQAJAAkACQCACQQNqQXxxIgQgAkcNACADQXhqIQVBACEEDAELIAMgBCACayIEIAMgBEkbIQQCQCADRQ0AQQAhBiABQf8BcSEHQQEhCANAIAIgBmotAAAgB0YNBCAEIAZBAWoiBkcNAAsLIAQgA0F4aiIFSw0BCyABQf8BcUGBgoQIbCEGA0BBgIKECCACIARqIgcoAgAgBnMiCGsgCHJBgIKECCAHQQRqKAIAIAZzIgdrIAdycUGAgYKEeHFBgIGChHhHDQEgBEEIaiIEIAVNDQALCwJAIAMgBEYNACABQf8BcSEGQQEhCANAAkAgAiAEai0AACAGRw0AIAQhBgwDCyADIARBAWoiBEcNAAsLQQAhCAsgACAGNgIEIAAgCDYCAAtYAQF/I4CAgIAAQRBrIgMkgICAgAAgAyABNgIEIAMgADYCACADI4SAgIAAQfCAgIAAaq1CIIYgA62ENwMII4GAgIAAQYqIwIAAaiADQQhqIAIQ2YKAgAAAC4EBAQF/I4CAgIAAQSBrIgUkgICAgAAgBSABNgIEIAUgADYCACAFIAM2AgwgBSACNgIIIAUjhICAgAAiAUHzgICAAGqtQiCGIAVBCGqthDcDGCAFIAFB8ICAgABqrUIghiAFrYQ3AxAjgYCAgABB2ofAgABqIAVBEGogBBDZgoCAAAAL1wICAX8BfiOAgICAAEHAAGsiCCSAgICAACAIIAI2AgQgCCABNgIAIAggBDYCDCAIIAM2AgggCCOBgICAACICQezXwYAAaiAAQf8BcUECdCIBaigCADYCFCAIIAJBtO/BgABqIAFqKAIANgIQAkAgBUUNACAIIAY2AhwgCCAFNgIYIAgjooCAgACtQiCGIAhBGGqthDcDKCAII4SAgIAAIgVB84CAgABqrUIghiIJIAhBCGqthDcDOCAIIAkgCK2ENwMwIAggBUHwgICAAGqtQiCGIAhBEGqthDcDICOBgICAAEGEhsCAAGogCEEgaiAHENmCgIAAAAsgCCOEgICAACIFQfOAgIAAaq1CIIYiCSAIQQhqrYQ3AzAgCCAJIAithDcDKCAIIAVB8ICAgABqrUIghiAIQRBqrYQ3AyAjgYCAgABBzYXAgABqIAhBIGogBxDZgoCAAAALHAAgASgCACABKAIEIAAoAgAgACgCBBDKgoCAAAscACAAKAIAIAEgACgCBCgCEBGAgICAAICAgIAAC2cBAn8gACgCBCECIAAoAgAhAwJAIAAoAggiAC0AAEUNACADI4GAgIAAQebXwYAAakEEIAIoAgwRg4CAgACAgICAAEUNAEEBDwsgACABQQpGOgAAIAMgASACKAIQEYCAgIAAgICAgAALbgEGfiAAIANC/////w+DIgUgAUL/////D4MiBn4iByADQiCIIgggBn4iBiAFIAFCIIgiCX58IgVCIIZ8Igo3AwAgACAIIAl+IAUgBlStQiCGIAVCIIiEfCAKIAdUrXwgBCABfiADIAJ+fHw3AwgLC9TvAQIAQYCAwAAL+NcBaW50ZXJuYWwgZXJyb3I6IGVudGVyZWQgdW5yZWFjaGFibGUgY29kZQ5iZWdpbiA8PSBlbmQgKMAEIDw9IMAQKSB3aGVuIHNsaWNpbmcgYMABYMAAC2J5dGUgaW5kZXggwBYgaXMgb3V0IG9mIGJvdW5kcyBvZiBgwAFgwAALYnl0ZSBpbmRleCDAJiBpcyBub3QgYSBjaGFyIGJvdW5kYXJ5OyBpdCBpcyBpbnNpZGUgwAggKGJ5dGVzIMAGKSBvZiBgwAFgwAAMc3lub2Q6Y29vcmQ6wAALc3lub2Q6c3RlcDrAATrAAMABOsABOsAAFnNsaWNlIGluZGV4IHN0YXJ0cyBhdCDADSBidXQgZW5kcyBhdCDAACBpbmRleCBvdXQgb2YgYm91bmRzOiB0aGUgbGVuIGlzIMASIGJ1dCB0aGUgaW5kZXggaXMgwAAqQ29vcmRpbmF0b3I6IEZldGNoaW5nIGV4ZWN1dGlvbiB0cmFjZSBmb3IgwAAjQ29vcmRpbmF0b3I6IENvbW1pdHRlZCB0cmFuc2FjdGlvbiDAAMAJIGF0IGxpbmUgwAggY29sdW1uIMAAEnJhbmdlIHN0YXJ0IGluZGV4IMAiIG91dCBvZiByYW5nZSBmb3Igc2xpY2Ugb2YgbGVuZ3RoIMAAEHJhbmdlIGVuZCBpbmRleCDAIiBvdXQgb2YgcmFuZ2UgZm9yIHNsaWNlIG9mIGxlbmd0aCDAAAdzdHJpbmcgwAAPaW52YWxpZCBsZW5ndGggwAssIGV4cGVjdGVkIMAAD2ludmFsaWQgdmFsdWU6IMALLCBleHBlY3RlZCDAAA5pbnZhbGlkIHR5cGU6IMALLCBleHBlY3RlZCDAACFGYWlsZWQgdG8gcGFyc2UgY29tcG9zZSByZXF1ZXN0OiDAAAtyZWNpcGllbnQ6IMAKLCBhbW91bnQ6IMAAEGFzc2VydGlvbiBgbGVmdCDAFyByaWdodGAgZmFpbGVkCiAgbGVmdDogwAkKIHJpZ2h0OiDAABBhc3NlcnRpb24gYGxlZnQgwBAgcmlnaHRgIGZhaWxlZDogwAkKICBsZWZ0OiDACQogcmlnaHQ6IMAAFVRyYW5zYWN0aW9uIEFib3J0ZWQ6IMAANEFwcHJvdmVyIEEgY29udHJhY3QgaW52b2NhdGlvbiB0cmFwcGVkIG9yIHJlamVjdGVkOiDAACtObyB0cmFuc2FjdGlvbiBoaXN0b3J5IGZvdW5kIGZvciBhY3Rpb25JZDogwAAbRmFpbGVkIHRvIHBhcnNlIGFjdGlvbiBJRDogwADAAjogwAApVHJhbnNhY3Rpb24gQWJvcnRlZDogQXBwcm92ZXIgQSBmYWlsZWQgLSDAAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvYWxsb2Mvc3JjL2NvbGxlY3Rpb25zL2J0cmVlL21hcC9lbnRyeS5ycwBsaWJyYXJ5L2NvcmUvc3JjL251bS9mbHQyZGVjL3N0cmF0ZWd5L2dyaXN1LnJzAGxpYnJhcnkvYWxsb2Mvc3JjL2ZtdC5ycwBsaWJyYXJ5L2NvcmUvc3JjL251bS9kaXlfZmxvYXQucnMAbGlicmFyeS9zdGQvc3JjL3N5cy9zeW5jL211dGV4L25vX3RocmVhZHMucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvc2VyZGVfanNvbi0xLjAuMTUwL3NyYy9lcnJvci5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9zZXJkZV9qc29uLTEuMC4xNTAvc3JjL3ZhbHVlL3Nlci5ycwAvcnVzdGMvMjU0YjU5NjA3ZDQ0MTdlOWRmZmJjMzA3MTM4YWU1Yzg2MjgwZmU0Yy9saWJyYXJ5L2NvcmUvc3JjL3N0ci9wYXR0ZXJuLnJzAGxpYnJhcnkvY29yZS9zcmMvbnVtL2ZsdDJkZWMvc3RyYXRlZ3kvZHJhZ29uLnJzAGxpYnJhcnkvY29yZS9zcmMvbnVtL2JpZ251bS5ycwBsaWJyYXJ5L2NvcmUvc3JjL2ZtdC9udW0ucnMAbGlicmFyeS9zdGQvc3JjL3N5cy9pby9pb19zbGljZS93YXNpLnJzAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvYWxsb2Mvc3JjL3N0cmluZy5ycwBsaWJyYXJ5L3N0ZC9zcmMvcGFuaWNraW5nLnJzAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvYWxsb2Mvc3JjL2NvbGxlY3Rpb25zL2J0cmVlL25hdmlnYXRlLnJzAC9Vc2Vycy9lZHljdS8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL3NlcmRlX2pzb24tMS4wLjE1MC9zcmMvaW8vY29yZS5ycwBsaWJyYXJ5L2NvcmUvc3JjL3VuaWNvZGUvcHJpbnRhYmxlLnJzAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvYWxsb2Mvc3JjL2NvbGxlY3Rpb25zL2J0cmVlL25vZGUucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvc2VyZGVfanNvbi0xLjAuMTUwL3NyYy9kZS5ycwBsaWJyYXJ5L2NvcmUvc3JjL2ZtdC9tb2QucnMAbGlicmFyeS9zdGQvc3JjL2lvL21vZC5ycwBsaWJyYXJ5L2FsbG9jL3NyYy9yYXdfdmVjL21vZC5ycwBsaWJyYXJ5L2NvcmUvc3JjL251bS9mbHQyZGVjL21vZC5ycwBsaWJyYXJ5L3N0ZC9zcmMvdGhyZWFkL2lkLnJzAC9Vc2Vycy9lZHljdS8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL3NlcmRlX2pzb24tMS4wLjE1MC9zcmMvcmVhZC5ycwBsaWJyYXJ5L3N0ZC9zcmMvYWxsb2MucnMAY29vcmRpbmF0b3Ivc3JjL2xpYi5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9pdG9hLTEuMC4xOC9zcmMvbGliLnJzACBDb29yZGluYXRvcjogU3RhZ2VkIHRyYW5zYWN0aW9uIMAOIGFzIHN1Ym1pdHRpbmcAFW1lbW9yeSBhbGxvY2F0aW9uIG9mIMANIGJ5dGVzIGZhaWxlZAAQZmxvYXRpbmcgcG9pbnQgYMABYAALY2hhcmFjdGVyIGDAAWAACWludGVnZXIgYMABYAAJYm9vbGVhbiBgwAFgAA9taXNzaW5nIGZpZWxkIGDAAWAAEWR1cGxpY2F0ZSBmaWVsZCBgwAFgAC8ABkVycm9yKMAILCBsaW5lOiDACiwgY29sdW1uOiDAASkAFW1lbW9yeSBhbGxvY2F0aW9uIG9mIMBHIGJ5dGVzIGZhaWxlZApza2lwcGluZyBiYWNrdHJhY2UgcHJpbnRpbmcgdG8gYXZvaWQgcG90ZW50aWFsIHJlY3Vyc2lvbgoANWZhdGFsIHJ1bnRpbWUgZXJyb3I6IGZhaWxlZCB0byBpbml0aWF0ZSBwYW5pYywgZXJyb3IgwAssIGFib3J0aW5nCgAVbWVtb3J5IGFsbG9jYXRpb24gb2YgwA4gYnl0ZXMgZmFpbGVkCgAMcGFuaWNrZWQgYXQgwAI6CsAzCnRocmVhZCBwYW5pY2tlZCB3aGlsZSBwcm9jZXNzaW5nIHBhbmljLiBhYm9ydGluZy4KAAkKdGhyZWFkICfAAycgKMAOKSBwYW5pY2tlZCBhdCDAAjoKwAEKABlhYm9ydGluZyBkdWUgdG8gcGFuaWMgYXQgwAI6CsABCgBwYXlvdXRJZGFtb3VudHJlY2lwaWVudHNhbHRsaW1pdGVudmVsb3BlcHJvb2Zmb3JjZUh0dHBGYWlsQ29kZWZvcmNlUGFpcmluZ0ZhaWxzdHJ1Y3QgQ29tcG9zZVJlcXVlc3Qgd2l0aCA5IGVsZW1lbnRzYWdlbnRJZGRlY2lzaW9ucmVhc29uc3RydWN0IFN5bm9kU3RlcFRyYWNlIHdpdGggMyBlbGVtZW50c2lkc3RhdHVzcGF5b3V0RGV0YWlsc3N0cnVjdCBTeW5vZEFjdGlvblN0YXRlIHdpdGggMyBlbGVtZW50c2ZhbHNlYWdlbnRJZGRlY2lzaW9ucmVhc29uYW1vdW50cmVjaXBpZW50c2FsdGxpbWl0ZW52ZWxvcGVwcm9vZmZvcmNlSHR0cEZhaWxDb2RlZm9yY2VQYWlyaW5nRmFpbGlkc3RhdHVzcGF5b3V0RGV0YWlsc3N0cnVjdCBDb21wb3NlUmVxdWVzdHN0cnVjdCBTeW5vZFN0ZXBUcmFjZXN0cnVjdCBTeW5vZEFjdGlvblN0YXRlYSBEaXNwbGF5IGltcGxlbWVudGF0aW9uIHJldHVybmVkIGFuIGVycm9yIHVuZXhwZWN0ZWRseUVycm9yQ29vcmRpbmF0b3I6IFN0YXJ0aW5nIGNvbXBvc2VfYWN0aW9uLi4uY29tcG9zZV9hY3Rpb246IG1pc3NpbmcgaW5wdXQgcGF5bG9hZHN1Ym1pdHRpbmdzeW5vZDpjb29yZENvb3JkaW5hdG9yOiBJbnZva2luZyBBcHByb3ZlciBBIChUcmVhc3VyeSkuLi5hcHByb3Zlci1hZXZhbHVhdGVhcHByb3ZlZEFsd2F5cyBhcHByb3ZlIChUcmVhc3VyeSBwb2xpY3kgbWF0Y2hlcylzeW5vZDpzdGVwQ29vcmRpbmF0b3I6IEludm9raW5nIEFwcHJvdmVyIEIgKENvbXBsaWFuY2UgWksgdmVyaWZpZXIpLi4uZm9yY2VfcGFpcmluZ19mYWlsYXBwcm92ZXItYlpLIGNvbXBsaWFuY2UgY2hlY2tzIHZlcmlmaWVkQ29vcmRpbmF0b3I6IEludm9raW5nIEV4ZWN1dG9yIChCbGluZCBkZWNyeXB0ICYgaHR0cCBlZ3Jlc3MpLi4uZm9yY2VfaHR0cF9mYWlsX2NvZGVleGVjdXRvcmV4ZWN1dGVCbGluZCBwYXlvdXQgd2ViaG9vayBzZXR0bGVkLCBWQyBpc3N1ZWRjb21taXR0ZWRjYWxsZWQgYFJlc3VsdDo6dW53cmFwKClgIG9uIGFuIGBFcnJgIHZhbHVlYWJvcnRlZGZhaWxlZHZldG9lZE5vdCBpbXBsZW1lbnRlZCBpbiBjb29yZGluYXRvcmdldF90cmFjZTogbWlzc2luZyBpbnB1dCBwYXlsb2FkYWN0aW9uSWRzdGVwc2Fzc2VydGlvbiBmYWlsZWQ6IGVkZ2UuaGVpZ2h0ID09IHNlbGYuaGVpZ2h0IC0gMWFzc2VydGlvbiBmYWlsZWQ6IHNyYy5sZW4oKSA9PSBkc3QubGVuKClhc3NlcnRpb24gZmFpbGVkOiBlZGdlLmhlaWdodCA9PSBzZWxmLm5vZGUuaGVpZ2h0IC0gMWZhbHNlSW52b2tlRXJyb3I6Ok5vdEFsbG93bGlzdGVkSW52b2tlRXJyb3I6Ok5vRXhlY3V0aW9uQ29udGV4dEludm9rZUVycm9yOjpUYXJnZXRVbmtub3duSW52b2tlRXJyb3I6OkRlcHRoRXhjZWVkZWRJbnZva2VFcnJvcjo6UmVlbnRyYW50SW52b2tlRXJyb3I6OklubmVyRmFpbGVkSW52b2tlRXJyb3I6OklubmVyVHJhcHBlZEludm9rZUVycm9yOjpFbmNvZGluZ0ZhaWxlZHNlcmlhbGl6ZV92YWx1ZSBjYWxsZWQgYmVmb3JlIHNlcmlhbGl6ZV9rZXkA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAABAAIAAwAEAAUABgAHAAgACQD//////////////////woACwAMAA0ADgAPAP////////////////////////////////////////////////////////////////////8KAAsADAANAA4ADwD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AABAAIAAwAEAAUABgAHAAgACQAP//////////////////oACwAMAA0ADgAPAA/////////////////////////////////////////////////////////////////////6AAsADAANAA4ADwAP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////yBhdCBsaW5lIGEgRGlzcGxheSBpbXBsZW1lbnRhdGlvbiByZXR1cm5lZCBhbiBlcnJvciB1bmV4cGVjdGVkbHlFcnJvcmFzc2VydGlvbiBmYWlsZWQ6IHNlbGYuaXNfY2hhcl9ib3VuZGFyeShuZXdfbGVuKUVPRiB3aGlsZSBwYXJzaW5nIGEgbGlzdEVPRiB3aGlsZSBwYXJzaW5nIGFuIG9iamVjdEVPRiB3aGlsZSBwYXJzaW5nIGEgc3RyaW5nRU9GIHdoaWxlIHBhcnNpbmcgYSB2YWx1ZWV4cGVjdGVkIGA6YGV4cGVjdGVkIGAsYCBvciBgXWBleHBlY3RlZCBgLGAgb3IgYH1gZXhwZWN0ZWQgaWRlbnRleHBlY3RlZCB2YWx1ZWV4cGVjdGVkIGAiYGludmFsaWQgZXNjYXBlaW52YWxpZCBudW1iZXJudW1iZXIgb3V0IG9mIHJhbmdlaW52YWxpZCB1bmljb2RlIGNvZGUgcG9pbnRjb250cm9sIGNoYXJhY3RlciAoXHUwMDAwLVx1MDAxRikgZm91bmQgd2hpbGUgcGFyc2luZyBhIHN0cmluZ2tleSBtdXN0IGJlIGEgc3RyaW5naW52YWxpZCB2YWx1ZTogZXhwZWN0ZWQga2V5IHRvIGJlIGEgbnVtYmVyIGluIHF1b3Rlc2Zsb2F0IGtleSBtdXN0IGJlIGZpbml0ZSAoZ290IE5hTiBvciArLy1pbmYpbG9uZSBsZWFkaW5nIHN1cnJvZ2F0ZSBpbiBoZXggZXNjYXBldHJhaWxpbmcgY29tbWF0cmFpbGluZyBjaGFyYWN0ZXJzdW5leHBlY3RlZCBlbmQgb2YgaGV4IGVzY2FwZXJlY3Vyc2lvbiBsaW1pdCBleGNlZWRlZG51bGwAAAAAAAAAAAAAAAAA8D8AAAAAAAAkQAAAAAAAAFlAAAAAAABAj0AAAAAAAIjDQAAAAAAAavhAAAAAAICELkEAAAAA0BJjQQAAAACE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IGVudGVyZWQgdW5yZWFjaGFibGUgY29kZTAwMDEwMjAzMDQwNTA2MDcwODA5MTAxMTEyMTMxNDE1MTYxNzE4MTkyMDIxMjIyMzI0MjUyNjI3MjgyOTMwMzEzMjMzMzQzNTM2MzczODM5NDA0MTQyNDM0NDQ1NDY0NzQ4NDk1MDUxNTI1MzU0NTU1NjU3NTg1OTYwNjE2MjYzNjQ2NTY2Njc2ODY5NzA3MTcyNzM3NDc1NzY3Nzc4Nzk4MDgxODI4Mzg0ODU4Njg3ODg4OTkwOTE5MjkzOTQ5NTk2OTc5ODk5AwMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQB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dGlvbiByZXR1cm5lZCBhbiBlcnJvciB3aGVuIHRoZSB1bmRlcmx5aW5nIHN0cmVhbSBkaWQgbm90ZmFpbGVkIHRvIHdyaXRlIHdob2xlIGJ1ZmZlcmFkdmFuY2luZyBJb1NsaWNlIGJleW9uZCBpdHMgbGVuZ3RoYWR2YW5jaW5nIGlvIHNsaWNlcyBiZXlvbmQgdGhlaXIgbGVuZ3RoZmlsZSBuYW1lIGNvbnRhaW5lZCBhbiB1bmV4cGVjdGVkIE5VTCBieXRlZmF0YWwgcnVudGltZSBlcnJvcjogcndsb2NrIGxvY2tlZCBmb3Igd3JpdGluZywgYWJvcnRpbmcKc3RhY2sgYmFja3RyYWNlOgpub3RlOiBTb21lIGRldGFpbHMgYXJlIG9taXR0ZWQsIHJ1biB3aXRoIGBSVVNUX0JBQ0tUUkFDRT1mdWxsYCBmb3IgYSB2ZXJib3NlIGJhY2t0cmFjZS4KY2Fubm90IHJlY3Vyc2l2ZWx5IGFjcXVpcmUgbXV0ZXgAbm90ZTogcnVuIHdpdGggYFJVU1RfQkFDS1RSQUNFPTFgIGVudmlyb25tZW50IHZhcmlhYmxlIHRvIGRpc3BsYXkgYSBiYWNrdHJhY2UKUlVTVF9CQUNLVFJBQ0VmYWlsZWQgdG8gZ2VuZXJhdGUgdW5pcXVlIHRocmVhZCBJRDogYml0c3BhY2UgZXhoYXVzdGVkbWFpbjx1bm5hbWVkPkJveDxkeW4gQW55PnRocmVhZCBjYXVzZWQgbm9uLXVud2luZGluZyBwYW5pYy4gYWJvcnRpbmcuCmRlc2NyaXB0aW9uKCkgaXMgZGVwcmVjYXRlZDsgdXNlIERpc3BsYXkAAM+/4iyjW9q7AXp3pB7CsSdFcnJvcmEgZm9ybWF0dGluZyB0cmFpdCBpbXBsZW1lbnRhdGlvbiByZXR1cm5lZCBhbiBlcnJvciB3aGVuIHRoZSB1bmRlcmx5aW5nIHN0cmVhbSBkaWQgbm90Y2FwYWNpdHkgb3ZlcmZsb3cAcAAHAC0BAQECAQIBAUgLMBUQAWUHAgYCAgEEIwEeG1sLOgkJARgEAQkBAwEFKwM7CSoYASA3AQEBBAgEAQMHCgIdAToBAQECBAgBCQEKAhoBAgI5AQQCBAICAwMBHgIDAQsCOQEEBQECBAEUAhYGAQE6AQECAQQI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MWNFAU9fWk4xMWNvb3JkaW5hdG9yNGhvc3QxMGludGVyZmFjZXM4a3Zfc3RvcmUzcHV0MTF3aXRfaW1wb3J0NDE3aDcyYWFkMWZhMDQ3OGQ5OTNFAk9fWk4xMWNvb3JkaW5hdG9yNGhvc3QxMGludGVyZmFjZXM4a3Zfc3RvcmUzZ2V0MTF3aXRfaW1wb3J0MzE3aDFlNTg4ZTNlYWMxODk5NGRFA1lfWk4xMWNvb3JkaW5hdG9yNGhvc3QxMGludGVyZmFjZXMxNGNvbnRyYWN0c19jYWxsNmludm9rZTExd2l0X2ltcG9ydDUxN2g1NDNhNTAwOWViMzQ0OWUzRQR9X1pOOTBfJExUJHdhc2kuLmltcG9ydHMuLndhc2kuLmlvLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCR3YXNpLi5pbXBvcnRzLi5fcnQuLldhc21SZXNvdXJjZSRHVCQ0ZHJvcDRkcm9wMTdoZmZjNTk5NjhmMWU3NTQ5ZEUFhgFfWk45OV8kTFQkd2FzaS4uaW1wb3J0cy4ud2FzaS4uaW8uLnN0cmVhbXMuLk91dHB1dFN0cmVhbSR1MjAkYXMkdTIwJHdhc2kuLmltcG9ydHMuLl9ydC4uV2FzbVJlc291cmNlJEdUJDRkcm9wNGRyb3AxN2gwMDBiNDEzNjFmMmM4ZmIyRQZWX1pONHdhc2k3aW1wb3J0czR3YXNpMmlvNWVycm9yNUVycm9yMTV0b19kZWJ1Z19zdHJpbmcxMXdpdF9pbXBvcnQxMTdoZjVjYzBkOGVlZDgzMWI4YkUHaV9aTjR3YXNpN2ltcG9ydHM0d2FzaTJpbzdzdHJlYW1zMTJPdXRwdXRTdHJlYW0yNGJsb2NraW5nX3dyaXRlX2FuZF9mbHVzaDExd2l0X2ltcG9ydDIxN2g1OTkxOWIzZGFjNTViNjJjRQhNX1pONHdhc2k3aW1wb3J0czR3YXNpM2NsaTZzdGRlcnIxMGdldF9zdGRlcnIxMXdpdF9pbXBvcnQwMTdoZmE4M2E2NWQ0MDUzZmE1YUUJKV9fd2FzbV9pbXBvcnRfZW52aXJvbm1lbnRfZ2V0X2Vudmlyb25tZW50ChdfX3dhc21faW1wb3J0X2V4aXRfZXhpdAsRX193YXNtX2NhbGxfY3RvcnMMPF9aTjEwc2VyZGVfY29yZTJkZTlNYXBBY2Nlc3MxMG5leHRfdmFsdWUxN2g0MmVkMTgzYzgzMWFmNGQyRQ1rX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxOHBhcnNlX29iamVjdF9jb2xvbjE3aGVkMDJiOWMyM2Y0MmY4NDhFLmxsdm0uMTA5MTM3NDYwMDI4NTc5NDAzNTIOTV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTRpZ25vcmVfaW50ZWdlcjE3aDIyZmRjNDRmMzEwZWU4MjVFDz5fWk4xMHNlcmRlX2NvcmUyZGU5U2VxQWNjZXNzMTJuZXh0X2VsZW1lbnQxN2gzNWM1ODgwMGY0MmE2ZTMyRRCOAV9aTjgwXyRMVCRzZXJkZV9qc29uLi5kZS4uU2VxQWNjZXNzJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlNlcUFjY2VzcyRHVCQxN25leHRfZWxlbWVudF9zZWVkMTZoYXNfbmV4dF9lbGVtZW50MTdoYjg4MjA5NzhlM2EyMjE4ZEURpwFfWk4xMHNlcmRlX2pzb241dmFsdWUyZGU4Ml8kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJHNlcmRlX2pzb24uLnZhbHVlLi5WYWx1ZSRHVCQxMWRlc2VyaWFsaXplMTdoZGI4YTA3NWM1MDc3YWFiYkUubGx2bS4xMDkxMzc0NjAwMjg1Nzk0MDM1MhI+X1pOMTBzZXJkZV9jb3JlMmRlOVNlcUFjY2VzczEybmV4dF9lbGVtZW50MTdoM2NhMjY1MTc1ZTVjNDVhYUUTPl9aTjEwc2VyZGVfY29yZTJkZTlTZXFBY2Nlc3MxMm5leHRfZWxlbWVudDE3aGQ3ZWIxNDFiZGU3YTkxOTlFFDJfWk4xMHNlcmRlX2pzb24yZGUxMGZyb21fdHJhaXQxN2gyNDBlNTBjYTY5ZTFiYTkyRRWPAV9aTjk4XyRMVCQkUkYkbXV0JHUyMCRzZXJkZV9qc29uLi5kZS4uRGVzZXJpYWxpemVyJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplciRHVCQxOGRlc2VyaWFsaXplX3N0cnVjdDE3aDJmZWNlOWE3NTUxNzU2NWRFFjJfWk4xMHNlcmRlX2pzb24yZGUxMGZyb21fdHJhaXQxN2gzZTFkMTJjNzE4NThjYTQ0RRcyX1pOMTBzZXJkZV9qc29uMmRlMTBmcm9tX3RyYWl0MTdoNjY1MjA0MzFlYmMyMmQwMUUYjwFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMThkZXNlcmlhbGl6ZV9zdHJ1Y3QxN2g4MWQzNmVhOGQ2MTExN2FhRRkyX1pOMTBzZXJkZV9qc29uMmRlMTBmcm9tX3RyYWl0MTdoODViMDQ5NTU3ZmQ0MTI3OUUajwFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMThkZXNlcmlhbGl6ZV9zdHJ1Y3QxN2hkYjI1ZWI0NWExN2I2YmVkRRtsX1pONGNvcmUzcHRyNDhkcm9wX2luX3BsYWNlJExUJGNvb3JkaW5hdG9yLi5Db21wb3NlUmVxdWVzdCRHVCQxN2g0NWJjNmYxNGJlMzA5NTE2RS5sbHZtLjEwOTEzNzQ2MDAyODU3OTQwMzUyHDJfWk4xMHNlcmRlX2pzb24yZGUxMGZyb21fdHJhaXQxN2g5ZWI0NDYzOTU3MGVjOGNlRR2PAV9aTjk4XyRMVCQkUkYkbXV0JHUyMCRzZXJkZV9qc29uLi5kZS4uRGVzZXJpYWxpemVyJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplciRHVCQxOGRlc2VyaWFsaXplX3N0cmluZzE3aGIwNTQ1YTIwZGY2ZTViZjJFHkxfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDEzcGFyc2VfZGVjaW1hbDE3aGNiNjRhMjIzZDBlZWJhY2JFH01fWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDE0ZjY0X2Zyb21fcGFydHMxN2gwYTc1MWU1NDZiNjk2NzAxRSBNX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxNHBhcnNlX2V4cG9uZW50MTdoODg2YjYyNjI5ZmUyYmI2YUUhVV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMjJwYXJzZV9kZWNpbWFsX292ZXJmbG93MTdoOGQxNDYxODhiNGM5ZmY1NUUiTF9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTNwYXJzZV9pbnRlZ2VyMTdoYzdjMzQxZWFiMDg1YzNlZkUjUV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMThwYXJzZV9sb25nX2ludGVnZXIxN2hiYTU2YzYyMzBlNmZjNTA3RSROX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxNWlnbm9yZV9leHBvbmVudDE3aDdlZWM2MzNkMWEyMjNjYzRFJVZfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDIzcGFyc2VfZXhwb25lbnRfb3ZlcmZsb3cxN2gxNWQ4ZTQ4NzdkOTA0ZjBkRSZqX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxN3BlZWtfaW52YWxpZF90eXBlMTdoMmE0YTQ4ZjZlNWU5MGI4M0UubGx2bS4xMDkxMzc0NjAwMjg1Nzk0MDM1MidFX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQ3ZW5kX21hcDE3aDM0NzdlZGVkODY5NjA3YTlFKEVfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDdlbmRfc2VxMTdoODI3YmRkYmM2M2Q5ZDY3M0UpT19aTjRjb3JlM3B0cjQ1ZHJvcF9pbl9wbGFjZSRMVCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkMTdoMDg4MjA1YjRkNTQ4OThkNEUqoAFfWk44MF8kTFQkc2VyZGVfanNvbi4uZGUuLk1hcEFjY2VzcyRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5NYXBBY2Nlc3MkR1QkMTNuZXh0X2tleV9zZWVkMTJoYXNfbmV4dF9rZXkxN2gyMGE3Y2VhNTA4MWJiN2M1RS5sbHZtLjEwOTEzNzQ2MDAyODU3OTQwMzUyK3xfWk44Nl8kTFQkY29yZS4ubWFya2VyLi5QaGFudG9tRGF0YSRMVCRUJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZVNlZWQkR1QkMTFkZXNlcmlhbGl6ZTE3aGY3ZTM4Y2E4YjNlMGM3NDFFLIwBX1pOOThfJExUJCRSRiRtdXQkdTIwJHNlcmRlX2pzb24uLmRlLi5EZXNlcmlhbGl6ZXIkTFQkUiRHVCQkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uRGVzZXJpYWxpemVyJEdUJDE1ZGVzZXJpYWxpemVfdTE2MTdoZmYwYjdjOWE3ZGVjYmFiMEUtjQFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMTZkZXNlcmlhbGl6ZV9ib29sMTdoNGQ3NGU4NTNjOGVkOTk2NkUuLl9aTjEwc2VyZGVfanNvbjNzZXI2dG9fdmVjMTdoMjVmMjU0ZDkxMTVkNTgwMUUvLl9aTjEwc2VyZGVfanNvbjNzZXI2dG9fdmVjMTdoMzUyYTY4NmEwM2VlMTBmY0UwLl9aTjEwc2VyZGVfanNvbjNzZXI2dG9fdmVjMTdoZTBhMzgxZjg4NDgzNzhiYkUxigFfWk4xMHNlcmRlX2pzb241dmFsdWUzc2VyODFfJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLnNlci4uU2VyaWFsaXplJHUyMCRmb3IkdTIwJHNlcmRlX2pzb24uLnZhbHVlLi5WYWx1ZSRHVCQ5c2VyaWFsaXplMTdoOWQ2YWE1Yjg4YjRlZTRlMkUyhgFfWk4xMWNvb3JkaW5hdG9yMV84NF8kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uc2VyLi5TZXJpYWxpemUkdTIwJGZvciR1MjAkY29vcmRpbmF0b3IuLlN5bm9kU3RlcFRyYWNlJEdUJDlzZXJpYWxpemUxN2g1YzFhYTg3Mzk4ODQxMDUzRTNOX1pOMTFjb29yZGluYXRvcjQwX19saW5rX2N1c3RvbV9zZWN0aW9uX2Rlc2NyaWJpbmdfaW1wb3J0czE3aDYxNGNiYjM4ZWUxZTc3YTRFNMwBX1pOMTY4XyRMVCRjb29yZGluYXRvci4uXy4uJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRjb29yZGluYXRvci4uQ29tcG9zZVJlcXVlc3QkR1QkLi5kZXNlcmlhbGl6ZS4uX19WaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aDAyNjEyYTVlOTA0M2QzZGFFNcwBX1pOMTY4XyRMVCRjb29yZGluYXRvci4uXy4uJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRjb29yZGluYXRvci4uU3lub2RTdGVwVHJhY2UkR1QkLi5kZXNlcmlhbGl6ZS4uX19WaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aGQwMjQzOTU4NDRjNWRiZmZFNs4BX1pOMTcwXyRMVCRjb29yZGluYXRvci4uXy4uJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRjb29yZGluYXRvci4uU3lub2RBY3Rpb25TdGF0ZSRHVCQuLmRlc2VyaWFsaXplLi5fX1Zpc2l0b3IkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uVmlzaXRvciRHVCQ5ZXhwZWN0aW5nMTdoMTZlNDAzY2NmM2Y3MjQ4ZEU30QFfWk4xNzNfJExUJGNvb3JkaW5hdG9yLi5fLi4kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJGNvb3JkaW5hdG9yLi5Db21wb3NlUmVxdWVzdCRHVCQuLmRlc2VyaWFsaXplLi5fX0ZpZWxkVmlzaXRvciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5WaXNpdG9yJEdUJDl2aXNpdF9zdHIxN2gyMzI3ZTZiN2JjNGY0ZDVjRThaX1pONDlfJExUJFQkdTIwJGFzJHUyMCRhbGxvYy4uc3RyaW5nLi5TcGVjVG9TdHJpbmckR1QkMTRzcGVjX3RvX3N0cmluZzE3aGY1M2Y5YjJmNmRlMmRiZTRFOYcBX1pONGNvcmUzcHRyMTAwZHJvcF9pbl9wbGFjZSRMVCRjb3JlLi5yZXN1bHQuLlJlc3VsdCRMVCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkQyRzZXJkZV9qc29uLi5lcnJvci4uRXJyb3IkR1QkJEdUJDE3aDQ3MjIzYTA4ODEzMjNlMWNFOkxfWk40Y29yZTNwdHI0MmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJDE3aDI2YjdhOGUyYTZhYmNkMmRFO09fWk40Y29yZTNwdHI0NWRyb3BfaW5fcGxhY2UkTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJEdUJDE3aDNhOWNiYTBlZmE5NWI1NGNFPE9fWk40Y29yZTNwdHI0NWRyb3BfaW5fcGxhY2UkTFQkc2VyZGVfanNvbi4udmFsdWUuLlZhbHVlJEdUJDE3aDA4ODIwNWI0ZDU0ODk4ZDRFPVJfWk40Y29yZTNwdHI0OGRyb3BfaW5fcGxhY2UkTFQkY29vcmRpbmF0b3IuLkNvbXBvc2VSZXF1ZXN0JEdUJDE3aDQ1YmM2ZjE0YmUzMDk1MTZFPlJfWk40Y29yZTNwdHI0OGRyb3BfaW5fcGxhY2UkTFQkY29vcmRpbmF0b3IuLlN5bm9kU3RlcFRyYWNlJEdUJDE3aGYyOGY3NWIxNTc4OGJjNWVFP2tfWk40Y29yZTNwdHI3M2Ryb3BfaW5fcGxhY2UkTFQkY29yZS4ub3B0aW9uLi5PcHRpb24kTFQkc2VyZGVfanNvbi4udmFsdWUuLlZhbHVlJEdUJCRHVCQxN2hjY2JkNzlmMjJjYzg0YWQ5RUBSX1pONTNfJExUJGNvcmUuLmZtdC4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gxYjY1NTM2Y2QzM2ExZTFjRUFfX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkMTB3cml0ZV9jaGFyMTdoMDA1MWU2YWY3YTc1MWVmOEVCXV9aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2gwODhkMjk3MjQxOTlkYTNiRUMoX1pONWFsbG9jM2ZtdDZmb3JtYXQxN2gzZGE0YTRjMzhkN2EwZDgwRURZX1pONjBfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoOWU4ZDBmMmE0N2UzZTg3MkVFd19aTjg3XyRMVCRUJHUyMCRhcyR1MjAkYWxsb2MuLnNsaWNlLi4kTFQkaW1wbCR1MjAkJHU1YiRUJHU1ZCQkR1QkLi50b192ZWNfaW4uLkNvbnZlcnRWZWMkR1QkNnRvX3ZlYzE3aGJhZjUyZjlmNDQ3NzJlZTFFRogBX1pOOTVfJExUJGNvb3JkaW5hdG9yLi5Db21wb25lbnQkdTIwJGFzJHUyMCRjb29yZGluYXRvci4uZXhwb3J0cy4uc3lub2QuLmFnZW50Li5jb250cmFjdHMuLkd1ZXN0JEdUJDE0Y29tcG9zZV9hY3Rpb24xN2g1OWVjNjQwYjg2YTU5YTc2RUeAAV9aTjk1XyRMVCRjb29yZGluYXRvci4uQ29tcG9uZW50JHUyMCRhcyR1MjAkY29vcmRpbmF0b3IuLmV4cG9ydHMuLnN5bm9kLi5hZ2VudC4uY29udHJhY3RzLi5HdWVzdCRHVCQ3ZXhlY3V0ZTE3aGRjYTQ3NzQ2OTg4NjkxYTVFSIIBX1pOOTVfJExUJGNvb3JkaW5hdG9yLi5Db21wb25lbnQkdTIwJGFzJHUyMCRjb29yZGluYXRvci4uZXhwb3J0cy4uc3lub2QuLmFnZW50Li5jb250cmFjdHMuLkd1ZXN0JEdUJDlnZXRfdHJhY2UxN2gxNTdhNjg5ZmY5ZDIzZGZhRUk0Y2FiaV9wb3N0X3N5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNjb21wb3NlLWFjdGlvbkoqc3lub2Q6YWdlbnQvY29udHJhY3RzQDEuMC4wI2NvbXBvc2UtYWN0aW9uSyRzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZXZhbHVhdGVMI3N5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNleGVjdXRlTSVzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjZ2V0LXRyYWNlTpwCX1pONWFsbG9jMTFjb2xsZWN0aW9uczVidHJlZTRub2RlMjEwSGFuZGxlJExUJGFsbG9jLi5jb2xsZWN0aW9ucy4uYnRyZWUuLm5vZGUuLk5vZGVSZWYkTFQkYWxsb2MuLmNvbGxlY3Rpb25zLi5idHJlZS4ubm9kZS4ubWFya2VyLi5NdXQkQyRLJEMkViRDJGFsbG9jLi5jb2xsZWN0aW9ucy4uYnRyZWUuLm5vZGUuLm1hcmtlci4uTGVhZiRHVCQkQyRhbGxvYy4uY29sbGVjdGlvbnMuLmJ0cmVlLi5ub2RlLi5tYXJrZXIuLkVkZ2UkR1QkMTZpbnNlcnRfcmVjdXJzaW5nMTdoYmEyOTZiZGQ2ODNmNDBlMkVPO19aTjEwc2VyZGVfY29yZTJkZTVFcnJvcjEzbWlzc2luZ19maWVsZDE3aGIxYTZmODcxNmE3NTNiOThFUGJfWk40NF8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGFmMmYyMWExYjg0NzYzNmVFLmxsdm0uNjYyNDQ1NjU1ODc1NDA1NTMzNVF7X1pONjZfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5FcnJvciRHVCQ2Y3VzdG9tMTdoZjA4ODExOTUxZmRlNzVlYkUubGx2bS42NjI0NDU2NTU4NzU0MDU1MzM1UjxfWk4xMHNlcmRlX2NvcmUyZGU1RXJyb3IxNGludmFsaWRfbGVuZ3RoMTdoOGU1Y2JiMmY2MTNkNjdhOUVTPV9aTjEwc2VyZGVfY29yZTJkZTVFcnJvcjE1ZHVwbGljYXRlX2ZpZWxkMTdoZjBlMTZiN2U5MGFhNjZmY0VUigFfWk4xMHNlcmRlX2NvcmUyZGU1aW1wbHM3OV8kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxMWRlc2VyaWFsaXplMTdoNDEwODMyM2MwMTkzMzYwN0VVkgFfWk4xMHNlcmRlX2NvcmUyZGU1aW1wbHM4N18kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJGNvcmUuLm9wdGlvbi4uT3B0aW9uJExUJFQkR1QkJEdUJDExZGVzZXJpYWxpemUxN2hiNDc2NzMwOTlkOWY3NTE3RVaSAV9aTjEwc2VyZGVfY29yZTJkZTVpbXBsczg3XyRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5kZS4uRGVzZXJpYWxpemUkdTIwJGZvciR1MjAkY29yZS4ub3B0aW9uLi5PcHRpb24kTFQkVCRHVCQkR1QkMTFkZXNlcmlhbGl6ZTE3aGZkYzgzYjIwNDM5NGM1NDBFVz1fWk4xMHNlcmRlX2pzb241ZXJyb3I1RXJyb3IxMmZpeF9wb3NpdGlvbjE3aGIzNThiN2RlMGNiN2RjMmZFWNMBX1pOMTc1XyRMVCRzZXJkZV9qc29uLi52YWx1ZS4uZGUuLiRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5kZS4uRGVzZXJpYWxpemUkdTIwJGZvciR1MjAkc2VyZGVfanNvbi4udmFsdWUuLlZhbHVlJEdUJC4uZGVzZXJpYWxpemUuLlZhbHVlVmlzaXRvciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5WaXNpdG9yJEdUJDl2aXNpdF9tYXAxN2hhZjIxMzM3ZTc3ZTA0NzQ3RVmBAV9aTjk5XyRMVCRhbGxvYy4uY29sbGVjdGlvbnMuLmJ0cmVlLi5tYXAuLkJUcmVlTWFwJExUJEskQyRWJEMkQSRHVCQkdTIwJGFzJHUyMCRjb3JlLi5vcHMuLmRyb3AuLkRyb3AkR1QkNGRyb3AxN2g5NmJjZTM5YjEyMGYzNDQxRVpWX1pONWFsbG9jMTFjb2xsZWN0aW9uczVidHJlZTNtYXAyNUJUcmVlTWFwJExUJEskQyRWJEMkQSRHVCQ2aW5zZXJ0MTdoOWVmYjE4MDMyYzUyMTlkOEVbS19aTjQ2XyRMVCRUJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkV4cGVjdGVkJEdUJDNmbXQxN2gyOTJiYzVlNmNkZDZhZWI3RVxLX1pONDZfJExUJFQkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uRXhwZWN0ZWQkR1QkM2ZtdDE3aDYwN2U3MzRjZTUzZWE1ZmRFXUtfWk40Nl8kTFQkVCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5FeHBlY3RlZCRHVCQzZm10MTdoOTEyZDM0NjJiOGUzMzVjZkVeS19aTjQ2XyRMVCRUJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkV4cGVjdGVkJEdUJDNmbXQxN2hkMzBhODI0ZmY0NzBmMDA0RV8wX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aDFmZjhiN2Y4ZDQ5Nzc3YTNFYExfWk40Y29yZTNwdHI0MmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJDE3aDI2YjdhOGUyYTZhYmNkMmRFYV9fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2gwMDUxZTZhZjdhNzUxZWY4RWJdX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aDA4OGQyOTcyNDE5OWRhM2JFY2xfWk43M18kTFQkc2VyZGVfanNvbi4ubnVtYmVyLi5OdW1iZXIkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZSRHVCQ5c2VyaWFsaXplMTdoMzQ3NzdiOTI2OGFkMTNlMEVkQF9aTjEwc2VyZGVfY29yZTNzZXIxMFNlcmlhbGl6ZXIxMWNvbGxlY3Rfc2VxMTdoNjQ2NmU4ZWE5Zjk4OWNmY0VlowFfWk4xMHNlcmRlX2pzb241dmFsdWUzc2VyODFfJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLnNlci4uU2VyaWFsaXplJHUyMCRmb3IkdTIwJHNlcmRlX2pzb24uLnZhbHVlLi5WYWx1ZSRHVCQ5c2VyaWFsaXplMTdoZTY2ZDM1ODMxNDhhN2NjYUUubGx2bS4zMjkwMDAzNTQyMDg3NjIyNDI5ZkZfWk4xMHNlcmRlX2NvcmUzc2VyMTJTZXJpYWxpemVNYXAxNXNlcmlhbGl6ZV9lbnRyeTE3aDVhMzFhYTg3ZTNlZGJkYjJFZztfWk4xMHNlcmRlX2pzb24zc2VyMThmb3JtYXRfZXNjYXBlZF9zdHIxN2gyMDBlYWIxZjNmOTZlOTg4RWhGX1pOMTBzZXJkZV9jb3JlM3NlcjEyU2VyaWFsaXplTWFwMTVzZXJpYWxpemVfZW50cnkxN2hmNjk2YzQxNzQxMDUwZmJjRWlMX1pOMTFjb29yZGluYXRvcjRob3N0MTBpbnRlcmZhY2VzMTRjb250cmFjdHNfY2FsbDZpbnZva2UxN2gyYjFjNTk3MjIwMTA0OGYzRWp8X1pOOTVfJExUJGNvb3JkaW5hdG9yLi5ob3N0Li5pbnRlcmZhY2VzLi5jb250cmFjdHNfY2FsbC4uSW52b2tlRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2g4MWM1YjYxNDg2NzE0MzQ1RWtJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2gwM2JmMDA4YWI5MTY5NDYwRWxMX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2gyNmI3YThlMmE2YWJjZDJkRW1XX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aGIxYTNmYjk3NTMzZmRkODVFbkNfWk41YWxsb2M3cmF3X3ZlYzE5UmF3VmVjJExUJFQkQyRBJEdUJDhncm93X29uZTE3aDkzYmU2ZDIyNjI5Yzc4NDlFb2JfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQxMWZpbmlzaF9ncm93MTdoYjRjYjA4YjU3OWZlNzgyOEUubGx2bS4xMDkyMDI0MzAzMjE4MDY5MzE3OXBaX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkN3Jlc2VydmUyMWRvX3Jlc2VydmVfYW5kX2hhbmRsZTE3aGU0YzQ0MjQ4Yzk3YWI3NjBFcUBfWk4xMHNlcmRlX2NvcmUzc2VyMTBTZXJpYWxpemVyMTFjb2xsZWN0X3NlcTE3aDA3M2ExZGVhY2U2NTlhMDdFcqMBX1pOMTBzZXJkZV9qc29uNXZhbHVlM3NlcjgxXyRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkOXNlcmlhbGl6ZTE3aDlkNmFhNWI4OGI0ZWU0ZTJFLmxsdm0uNjQzMjQ4OTU1OTc2Nzk5OTM4NHNkX1pONzBfJExUJGFsbG9jLi52ZWMuLlZlYyRMVCRUJEMkQSRHVCQkdTIwJGFzJHUyMCRjb3JlLi5vcHMuLmRyb3AuLkRyb3AkR1QkNGRyb3AxN2hmYTNjMDdhYzQzZTNjYTVkRXRAX1pOMTBzZXJkZV9jb3JlM3NlcjEwU2VyaWFsaXplcjExY29sbGVjdF9zZXExN2hmMDRlMmNiOGJjNjJmNzE2RXWZAV9aTjg2XyRMVCRzZXJkZV9qc29uLi52YWx1ZS4uc2VyLi5TZXJpYWxpemVNYXAkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZU1hcCRHVCQxNXNlcmlhbGl6ZV92YWx1ZTE3aDlkMGU2YjY4ZWNlNWM4ZjZFLmxsdm0uNjQzMjQ4OTU1OTc2Nzk5OTM4NHZiX1pONjdfJExUJGFsbG9jLi52ZWMuLlZlYyRMVCRUJEMkQSRHVCQkdTIwJGFzJHUyMCRjb3JlLi5jbG9uZS4uQ2xvbmUkR1QkNWNsb25lMTdoMWUwZDFkNGMxMmY3M2RkOEV3ZF9aTjcwXyRMVCRhbGxvYy4udmVjLi5WZWMkTFQkVCRDJEEkR1QkJHUyMCRhcyR1MjAkY29yZS4ub3BzLi5kcm9wLi5Ecm9wJEdUJDRkcm9wMTdoNjRmMDk3NTU0MDljNDhlNUV4gwFfWk44OV8kTFQkc2VyZGVfanNvbi4udmFsdWUuLnNlci4uU2VyaWFsaXplTWFwJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uc2VyLi5TZXJpYWxpemVTdHJ1Y3QkR1QkMTVzZXJpYWxpemVfZmllbGQxN2hjN2I4ZjA0MGUxMDNlZjEyRXlCX1pOMTFjb29yZGluYXRvcjRob3N0MTBpbnRlcmZhY2VzOGt2X3N0b3JlM2dldDE3aGQzZmY0ZGRiYTYzODJhYzRFelhfWk4xMWNvb3JkaW5hdG9yN2V4cG9ydHM1c3lub2Q1YWdlbnQ5Y29udHJhY3RzMjBfZXhwb3J0X2V4ZWN1dGVfY2FiaTE3aDIxYjVhMzlkNGM5ZjliNDlFe1lfWk4xMWNvb3JkaW5hdG9yN2V4cG9ydHM1c3lub2Q1YWdlbnQ5Y29udHJhY3RzMjFfZXhwb3J0X2V2YWx1YXRlX2NhYmkxN2hhNTA4NzQ4YjBlMTVjODUzRXxaX1pOMTFjb29yZGluYXRvcjdleHBvcnRzNXN5bm9kNWFnZW50OWNvbnRyYWN0czIyX2V4cG9ydF9nZXRfdHJhY2VfY2FiaTE3aDJhNjZiYTI5ZmFjNjYzNWNFfV9fWk4xMWNvb3JkaW5hdG9yN2V4cG9ydHM1c3lub2Q1YWdlbnQ5Y29udHJhY3RzMjdfZXhwb3J0X2NvbXBvc2VfYWN0aW9uX2NhYmkxN2hiNWI5YmIzYTQ2MDBmMjJmRX4qX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTJfX19ydXN0X2FsbG9jfyxfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxNF9fX3J1c3RfZGVhbGxvY4ABLF9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzE0X19fcnVzdF9yZWFsbG9jgQFIX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjNDJfX19ydXN0X2FsbG9jX2Vycm9yX2hhbmRsZXJfc2hvdWxkX3BhbmljX3YyggFBX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMzVfX19ydXN0X25vX2FsbG9jX3NoaW1faXNfdW5zdGFibGVfdjKDAYoBX1pOMTBzZXJkZV9qc29uNXZhbHVlNGZyb204NV8kTFQkaW1wbCR1MjAkY29yZS4uY29udmVydC4uRnJvbSRMVCRmNjQkR1QkJHUyMCRmb3IkdTIwJHNlcmRlX2pzb24uLnZhbHVlLi5WYWx1ZSRHVCQ0ZnJvbTE3aGJmZWExYzNlNDkzNmEzY2FFhAFPX1pOMTBzZXJkZV9qc29uNHJlYWQxMnBhcnNlX2VzY2FwZTE3aGRkNTY5NTFjOThlNjdkNDNFLmxsdm0uMzEwMjk5MzM4MzA1MDY0MDQ5NoUBLl9aTjEwc2VyZGVfanNvbjRyZWFkNWVycm9yMTdoYjYyOTdjNjgyNWY3YjhmOEWGAS5fWk4xMHNlcmRlX2pzb240cmVhZDVlcnJvcjE3aGRhNzJjOTUxNzU5OWViYTNFhwE+X1pOMTBzZXJkZV9qc29uNHJlYWQyMHBhcnNlX3VuaWNvZGVfZXNjYXBlMTdoZTgzNTM4NDYwODJiMzZhNkWIAS5fWk4xMHNlcmRlX2pzb240cmVhZDVlcnJvcjE3aDliNDAwMTY4ZmE5YjQ0OWFFiQFHX1pOMTBzZXJkZV9qc29uNHJlYWQ1ZXJyb3IxN2gwZGZiYWZkMzY0ZDM0ODBjRS5sbHZtLjMxMDI5OTMzODMwNTA2NDA0OTaKAV5fWk4xMHNlcmRlX2pzb240cmVhZDlTbGljZVJlYWQxN3Bvc2l0aW9uX29mX2luZGV4MTdoZjBhOTExMmM1ZDE2MTZmMEUubGx2bS4zMTAyOTkzMzgzMDUwNjQwNDk2iwEuX1pOMTBzZXJkZV9qc29uNHJlYWQ1ZXJyb3IxN2hlZmJjYjExMWFhZjkzNDA4RYwBW19aTjEwc2VyZGVfanNvbjRyZWFkOVNsaWNlUmVhZDE0c2tpcF90b19lc2NhcGUxN2hlYWZmMDNjMWZmZGFhNWYxRS5sbHZtLjMxMDI5OTMzODMwNTA2NDA0OTaNAUdfWk4xMHNlcmRlX2pzb240cmVhZDlTbGljZVJlYWQxOXNraXBfdG9fZXNjYXBlX3Nsb3cxN2hjMDc2NmNmYzE0NDg0OTZhRY4Ba19aTjcwXyRMVCRzZXJkZV9qc29uLi5yZWFkLi5TbGljZVJlYWQkdTIwJGFzJHUyMCRzZXJkZV9qc29uLi5yZWFkLi5SZWFkJEdUJDEwaWdub3JlX3N0cjE3aDE5ZmE1NDAwMTc2ZjRjZWFFjwFuX1pONzBfJExUJHNlcmRlX2pzb24uLnJlYWQuLlNsaWNlUmVhZCR1MjAkYXMkdTIwJHNlcmRlX2pzb24uLnJlYWQuLlJlYWQkR1QkMTNwZWVrX3Bvc2l0aW9uMTdoN2QyMGMxMmE1Njc4Y2IyYkWQAWhfWk43MF8kTFQkc2VyZGVfanNvbi4ucmVhZC4uU2xpY2VSZWFkJHUyMCRhcyR1MjAkc2VyZGVfanNvbi4ucmVhZC4uUmVhZCRHVCQ4cG9zaXRpb24xN2g4YjBkZTM2YzU2ODQyYTAyRZEBaV9aTjcwXyRMVCRzZXJkZV9qc29uLi5yZWFkLi5TbGljZVJlYWQkdTIwJGFzJHUyMCRzZXJkZV9qc29uLi5yZWFkLi5SZWFkJEdUJDlwYXJzZV9zdHIxN2hhZDM0ZTg1MTAyYTYyZTc5RZIBNV9aTjEwc2VyZGVfanNvbjVlcnJvcjEwbWFrZV9lcnJvcjE3aDNmNjc5ZjU0NzFkMGUxYmVFkwFCX1pONGNvcmUzc3RyN3BhdHRlcm4xNFR3b1dheVNlYXJjaGVyOW5leHRfYmFjazE3aGMzZjViOWFkYTYwYmZhM2JFlAEyX1pOMTBzZXJkZV9qc29uNWVycm9yNUVycm9yMmlvMTdoMjY5ZTQwZDllMjVlMWZkY0WVATZfWk4xMHNlcmRlX2pzb241ZXJyb3I1RXJyb3I2c3ludGF4MTdoYTEwNzY1NDY4ODg3ZDE0NEWWAUxfWk40Y29yZTNwdHI0MmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJDE3aDRmYTU2ZGE2NzJmOWQ4MTNFlwFSX1pONTNfJExUJGNvcmUuLmZtdC4uRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2gxYjY1NTM2Y2QzM2ExZTFjRZgBV19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hiMWEzZmI5NzUzM2ZkZDg1RZkBX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhFmgFdX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aDA4OGQyOTcyNDE5OWRhM2JFmwFaX1pONjFfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDBhZTI3NzIyZDIwNGQzMzdFnAFgX1pONjdfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvckNvZGUkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGVmYTk5ZTNlMWZlNGEzYzRFnQFcX1pONjNfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZTg2OTI0M2RkN2UzMTI5MUWeAWlfWk42Nl8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkVycm9yJEdUJDEyaW52YWxpZF90eXBlMTdoN2I1ZDViZWRmNWRhZjYzZkWfAWVfWk43Ml8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkpzb25VbmV4cGVjdGVkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g0OWFiNmQ4NDE5NzgzNWQxRaABfF9aTjY2XyRMVCRzZXJkZV9qc29uLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uRXJyb3IkR1QkNmN1c3RvbTE3aDk4YmZhMjM0NDU0NTE4YjRFLmxsdm0uMTY0MTQ3Nzk3MjI3NDQ2Nzc5MzehAWpfWk42Nl8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkVycm9yJEdUJDEzaW52YWxpZF92YWx1ZTE3aGVlOTNjNzQxMjk4ZTZiMmRFogFCX1pOMTBzZXJkZV9qc29uMmRlMTJQYXJzZXJOdW1iZXIxMmludmFsaWRfdHlwZTE3aDQ1NmZhMjJlZDNiMzdmNjhFowF6X1pOODJfJExUJHNlcmRlX2pzb24uLnZhbHVlLi5zZXIuLlNlcmlhbGl6ZXIkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZXIkR1QkMTNzZXJpYWxpemVfc2VxMTdoOWZkYjg0YzU3Mjc3NWViMEWkAXNfWk44Nl8kTFQkc2VyZGVfanNvbi4udmFsdWUuLnNlci4uU2VyaWFsaXplTWFwJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uc2VyLi5TZXJpYWxpemVNYXAkR1QkM2VuZDE3aGQ5NTNkOTUwNzdmNmIwOWFFpQF2X1pOODlfJExUJHNlcmRlX2pzb24uLnZhbHVlLi5zZXIuLlNlcmlhbGl6ZU1hcCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLnNlci4uU2VyaWFsaXplU3RydWN0JEdUJDNlbmQxN2g3YzY3MTJhMWE4YTU1MWJhRaYBQ19aTjVhbGxvYzdyYXdfdmVjMTlSYXdWZWMkTFQkVCRDJEEkR1QkOGdyb3dfb25lMTdoMDZjZTVlZjUzZmY4YmQ5YkWnAWFfWk41YWxsb2M3cmF3X3ZlYzIwUmF3VmVjSW5uZXIkTFQkQSRHVCQxMWZpbmlzaF9ncm93MTdoOTE0MWE5NzgwY2RjMmRmZkUubGx2bS4zNzE1MjY0NzAwMzg4NjAwMDU0qAFaX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkN3Jlc2VydmUyMWRvX3Jlc2VydmVfYW5kX2hhbmRsZTE3aGE4NDQ3NWFiZDllYmQ0NDdFqQFJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g3ODk0Mjg4Mjk0YmJhMjg2RaoBSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoY2Q4MmFjZjcyNzNjMWMyMUWrATBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoNGE4MTQxMDExYTk0YzRkOUWsAUxfWk40Y29yZTNwdHI0MmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJDE3aDRmYTU2ZGE2NzJmOWQ4MTNFrQFcX1pONTVfJExUJHN0ciR1MjAkYXMkdTIwJHNlcmRlX2pzb24uLnZhbHVlLi5pbmRleC4uSW5kZXgkR1QkMTBpbmRleF9pbnRvMTdoYjM3YWZkMTVmODU1M2YxOEWuAV9fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2gwMDUxZTZhZjdhNzUxZWY4Ra8BXV9aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2gwODhkMjk3MjQxOTlkYTNiRbABXl9aTjY1XyRMVCRzZXJkZV9qc29uLi5pby4uaW1wLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNjE4ZDU2OGEwYjUxMmExMEWxAUNfWk4zOF8kTFQkdTY0JHUyMCRhcyR1MjAkaXRvYS4uVW5zaWduZWQkR1QkM2ZtdDE3aDQxOWI4ODlhNzFiMGMwMmNFsgFcX1pONDVfJExUJGY2NCR1MjAkYXMkdTIwJHptaWouLnByaXZhdGUuLlNlYWxlZCRHVCQyMHdyaXRlX3RvX3ptaWpfYnVmZmVyMTdoYjRkMzVhYTU5ZDNjNmFiNEWzATdfWk4xMXdpdF9iaW5kZ2VuMnJ0MTRydW5fY3RvcnNfb25jZTE3aGQwYjY2OWYzYjY1NTk4ZDFFtAGrAV9aTjEzM18kTFQkJExUJHNlcmRlX2NvcmUuLmRlLi5XaXRoRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJC4uZm10Li5Mb29rRm9yRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2gzM2E2MTRiNDA0ZjUwMWIyRbUBqQFfWk4xMzNfJExUJCRMVCRzZXJkZV9jb3JlLi5kZS4uV2l0aERlY2ltYWxQb2ludCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQuLmZtdC4uTG9va0ZvckRlY2ltYWxQb2ludCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aGVlMDE2YzExYzNmOTgwNmFFtgHCAV9aTjE1OF8kTFQkc2VyZGVfY29yZS4uZGUuLmltcGxzLi4kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJHUxNiRHVCQuLmRlc2VyaWFsaXplLi5QcmltaXRpdmVWaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aGRmNGMyMzE5MTgwYTMzMGRFtwHCAV9aTjE1OF8kTFQkc2VyZGVfY29yZS4uZGUuLmltcGxzLi4kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJHU2NCRHVCQuLmRlc2VyaWFsaXplLi5QcmltaXRpdmVWaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aDZhNjM5MDI4ZTdkMGZiNGVFuAFHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoYmJjNWYyZDdmOGMzZjFiMUW5ATBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoNWZiZTc0OTMyNjAyZDliNEW6AVFfWk41Ml8kTFQkJFJGJHN0ciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5FeHBlY3RlZCRHVCQzZm10MTdoNjllYzMzMDM2Yjk2NDBhN0W7AV5fWk42NV8kTFQkc2VyZGVfY29yZS4uZGUuLlVuZXhwZWN0ZWQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGIxMTBiN2Y0MGUwMjJmNWJFvAFkX1pONzFfJExUJHNlcmRlX2NvcmUuLmRlLi5XaXRoRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g0ZTgzZjY3YzRlYzAyMTU3Rb0BZF9aTjcxXyRMVCRkeW4kdTIwJHNlcmRlX2NvcmUuLmRlLi5FeHBlY3RlZCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoY2JhNDhlYzk1M2IyNWUzZEW+AXFfWk43OF8kTFQkc2VyZGVfY29yZS4uZGUuLmltcGxzLi5Cb29sVmlzaXRvciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5WaXNpdG9yJEdUJDlleHBlY3RpbmcxN2hjYmFlYzAwM2ZjZWE0OTI4Rb8Bc19aTjgwXyRMVCRzZXJkZV9jb3JlLi5kZS4uaW1wbHMuLlN0cmluZ1Zpc2l0b3IkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uVmlzaXRvciRHVCQ5ZXhwZWN0aW5nMTdoZTYwNDFkNWFhNDIxODU0MkXAATBfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxOF9fX3J1c3Rfc3RhcnRfcGFuaWPBASdfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxMHJ1c3RfcGFuaWPCAS5fWk4zc3RkMmlvNVdyaXRlOXdyaXRlX2ZtdDE3aDBhODcyMGRhZjk1MmZkYzNFwwFzX1pONGNvcmUzcHRyODFkcm9wX2luX3BsYWNlJExUJGNvcmUuLnJlc3VsdC4uUmVzdWx0JExUJCRMUCQkUlAkJEMkc3RkLi5pby4uZXJyb3IuLkVycm9yJEdUJCRHVCQxN2g3ZmNkZGMxZTVlYTU1MmFkRcQBVl9aTjRjb3JlM3B0cjUyZHJvcF9pbl9wbGFjZSRMVCRzdGQuLnN5cy4uc3RkaW8uLndhc2lwMi4uU3RkZXJyJEdUJDE3aDEwMzEwNzVhYTNkOTEyNmVFxQEpX1pOM3N0ZDdwcm9jZXNzNWFib3J0MTdoOWQ0M2NkMjIwYjYwMDRhZEXGASlfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxMV9fX3JkbF9hbGxvY8cBKl9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzEyX19fcnVzdF9hYm9ydMgBK19STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzEzX19fcmRsX2RlYWxsb2PJAStfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxM19fX3JkbF9yZWFsbG9jygEuX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTdydXN0X2JlZ2luX3Vud2luZMsBRV9aTjNzdGQzc3lzOWJhY2t0cmFjZTI2X19ydXN0X2VuZF9zaG9ydF9iYWNrdHJhY2UxN2hlYmNlYTQ5MjkzNDlmNGNhRcwBOF9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzI2X19fcnVzdF9hbGxvY19lcnJvcl9oYW5kbGVyzQEqX1pOM3N0ZDVhbGxvYzhydXN0X29vbTE3aGU5OGE4ZjBmMWJjYjY1NDJFzgFFX1pOMzZfJExUJFQkdTIwJGFzJHUyMCRjb3JlLi5hbnkuLkFueSRHVCQ3dHlwZV9pZDE3aDlmMDY0M2VjYzBkZjllM2JFzwFFX1pOMzZfJExUJFQkdTIwJGFzJHUyMCRjb3JlLi5hbnkuLkFueSRHVCQ3dHlwZV9pZDE3aGEwM2RiODQ2NzhkNTZkMWRF0AFJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hhZDhjOWVlZTM2NzIyMTViRdEBWl9aTjVhbGxvYzdyYXdfdmVjMjBSYXdWZWNJbm5lciRMVCRBJEdUJDdyZXNlcnZlMjFkb19yZXNlcnZlX2FuZF9oYW5kbGUxN2gyNDdmYzAwOTA2ZGI4NzFjRdIBSF9aTjVhbGxvYzdyYXdfdmVjMjBSYXdWZWNJbm5lciRMVCRBJEdUJDExZmluaXNoX2dyb3cxN2g3M2U1MTI4NjA4NDIyNGJiRdMBLl9aTjNzdGQyaW81ZXJyb3I1RXJyb3IzbmV3MTdoZmE1ZTMyOTUzMThmYWQxNkXUATdfWk4zc3RkMmlvNVdyaXRlMTdpc193cml0ZV92ZWN0b3JlZDE3aGIwZmQxN2NkMzYwNjA1YmNF1QE4X1pOM3N0ZDJpbzVXcml0ZTE4d3JpdGVfYWxsX3ZlY3RvcmVkMTdoOTU3MDg0MDUyNTllNWZlY0XWAS5fWk4zc3RkMmlvNVdyaXRlOXdyaXRlX2FsbDE3aDk3ZTU4M2RhYzY3ZjJkZTVF1wEuX1pOM3N0ZDJpbzVXcml0ZTl3cml0ZV9mbXQxN2g1Y2U2ZmYyZGYyMjg3NmNlRdgBLl9aTjNzdGQyaW81V3JpdGU5d3JpdGVfZm10MTdoOGM0ZTM4NGQ3YzVlNGJkYUXZAYABX1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQxNHdyaXRlX3ZlY3RvcmVkMTdoOThiZDE1OWFmMTMyMzM0MUXaAYMBX1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQxN2lzX3dyaXRlX3ZlY3RvcmVkMTdoMzg0NWNlODEyZGZmM2FkYkXbAYQBX1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQxOHdyaXRlX2FsbF92ZWN0b3JlZDE3aDE2Njc1ZTE2YjNiNGI2MGJF3AF2X1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQ1Zmx1c2gxN2g0NTNkNDFiOGJhZGE1ZmY0Rd0Bdl9aTjNzdGQyaW81aW1wbHM3NF8kTFQkaW1wbCR1MjAkc3RkLi5pby4uV3JpdGUkdTIwJGZvciR1MjAkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEMkQSRHVCQkR1QkNXdyaXRlMTdoNjU5MGI3ZWE3YjYwNTM0ZEXeAXpfWk4zc3RkMmlvNWltcGxzNzRfJExUJGltcGwkdTIwJHN0ZC4uaW8uLldyaXRlJHUyMCRmb3IkdTIwJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRDJEEkR1QkJEdUJDl3cml0ZV9hbGwxN2hhNDI1YmY4MmRiYzc2MzQ5Rd8BPl9aTjVhbGxvYzRzeW5jMTZBcmMkTFQkVCRDJEEkR1QkOWRyb3Bfc2xvdzE3aDBmZTgxY2NkNzk4NGIzMDlF4AE1X1pONGNvcmU5cGFuaWNraW5nMTNhc3NlcnRfZmFpbGVkMTdoYjIwMmMzZDQyYmM4MWM5NkXhATxfWk4zc3RkNnRocmVhZDJpZDhUaHJlYWRJZDNuZXc5ZXhoYXVzdGVkMTdoMjExYjlmNzlmYjM5NzFlMUXiASxfWk4zc3RkM2VudjExY3VycmVudF9kaXIxN2g2YWIzMDk0OTM1YmIwYTk0ReMBJ19aTjNzdGQzZW52N192YXJfb3MxN2gwZmFhZjAyNDJjYTM0MGYyReQBVF9aTjNzdGQzc3lzM3BhbDZjb21tb24xNHNtYWxsX2Nfc3RyaW5nMjRydW5fd2l0aF9jc3RyX2FsbG9jYXRpbmcxN2gzNjZmMDQwMjU4ZDQ3MjdmReUBQl9aTjNzdGQzc3lzM3BhbDZ3YXNpcDI3aGVscGVyczE0YWJvcnRfaW50ZXJuYWwxN2gwZTJlNjdmMjQ3Mzg5MWNiReYBPl9aTjNzdGQzc3lzOWJhY2t0cmFjZTEzQmFja3RyYWNlTG9jazVwcmludDE3aDIwOGRmODI0YTUwN2Q5NmFF5wF/X1pOOThfJExUJHN0ZC4uc3lzLi5iYWNrdHJhY2UuLkJhY2t0cmFjZUxvY2suLnByaW50Li5EaXNwbGF5QmFja3RyYWNlJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hkYjg1YTRlZGZmYzAzNzlhRegBRV9aTjNzdGQzc3lzOWJhY2t0cmFjZTI2X19ydXN0X2VuZF9zaG9ydF9iYWNrdHJhY2UxN2g4ODAzNmU2NThjOTkxNDhjRekBSF9aTjNzdGQ1YWxsb2M4cnVzdF9vb20yOF8kdTdiJCR1N2IkY2xvc3VyZSR1N2QkJHU3ZCQxN2hhOGM0OTlhMTlmMWUxNWYwReoBUl9aTjNzdGQ5cGFuaWNraW5nMTNwYW5pY19oYW5kbGVyMjhfJHU3YiQkdTdiJGNsb3N1cmUkdTdkJCR1N2QkMTdoM2EzOWU3MGIzZGNiYTcyNUXrAS5fWk4zc3RkM3N5czliYWNrdHJhY2U0bG9jazE3aDNiNWQ2YzVkOGQyNzE5NjJF7AFCX1pOM3N0ZDRzeW5jNnBvaXNvbjVtdXRleDE0TXV0ZXgkTFQkVCRHVCQ0bG9jazE3aDMwY2Y0MDg0NGI1MjJmZjZF7QE7X1pOM3N0ZDVhbGxvYzI0ZGVmYXVsdF9hbGxvY19lcnJvcl9ob29rMTdoZWE1Y2RlMWQ0M2ZkMDQzMkXuATZfWk4zc3RkNXBhbmljMTlnZXRfYmFja3RyYWNlX3N0eWxlMTdoNmM4ZTg4MDlhNTQ0Y2Y1ZkXvAVtfWk4zc3RkNnRocmVhZDdjdXJyZW50MTd3aXRoX2N1cnJlbnRfbmFtZTI4XyR1N2IkJHU3YiRjbG9zdXJlJHU3ZCQkdTdkJDE3aDQ3M2UyMGVlZmYxYjExOWZF8AFJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hiMWYzNTU2Mjk2NzQ1OWJjRfEBNl9aTjNzdGQ5cGFuaWNraW5nMTVwYW5pY193aXRoX2hvb2sxN2hiNTNmYjg5Mjc1ZmZiNjVjRfIBO19aTjNzdGQ5cGFuaWNraW5nMTFwYW5pY19jb3VudDhpbmNyZWFzZTE3aGVmYTcwYTZlMGE2ZTBjMzZF8wEzX1pOM3N0ZDlwYW5pY2tpbmcxMmRlZmF1bHRfaG9vazE3aDlmYzQxNWU1NGQzYjBlN2ZF9AE1X1pOM3N0ZDlwYW5pY2tpbmcxNHBheWxvYWRfYXNfc3RyMTdoMTUzNmQwMzZkMzM4NWEzMEX1AVFfWk4zc3RkOXBhbmlja2luZzEyZGVmYXVsdF9ob29rMjhfJHU3YiQkdTdiJGNsb3N1cmUkdTdkJCR1N2QkMTdoMWY2ZWYzYjE4YzE2YzJkOEX2AVFfWk41Ml8kTFQkJFJGJG11dCR1MjAkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoMDVkN2M5MWYwYTUzM2NkM0X3AUdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hmZmQ1OWMwNTFiM2I1NzNkRfgBMl9aTjRjb3JlM2ZtdDVXcml0ZTEwd3JpdGVfY2hhcjE3aDNkZmQ1YzdkZjAwNTQxNzVF+QEyX1pONGNvcmUzZm10NVdyaXRlMTB3cml0ZV9jaGFyMTdoM2Y4NzUzYTNkOWJhZDM4ZUX6ATJfWk40Y29yZTNmbXQ1V3JpdGUxMHdyaXRlX2NoYXIxN2hiMGY5OWM4YzVjY2RhMTQ0RfsBMF9aTjRjb3JlM2ZtdDVXcml0ZTl3cml0ZV9mbXQxN2gzYWU5MjMyNDYzOTA3ZWZlRfwBMF9aTjRjb3JlM2ZtdDVXcml0ZTl3cml0ZV9mbXQxN2g2ZjBjOTQzNjdjM2ZmNDE2Rf0BMF9aTjRjb3JlM2ZtdDVXcml0ZTl3cml0ZV9mbXQxN2g4MmFjMjQ1NDVjODliMDJhRf4BMF9aTjRjb3JlM2ZtdDVXcml0ZTl3cml0ZV9mbXQxN2hiMzc4YTU5NWE3Nzc3NTBjRf8BmgFfWk40Y29yZTNwdHIxMTlkcm9wX2luX3BsYWNlJExUJHN0ZC4uaW8uLmRlZmF1bHRfd3JpdGVfZm10Li5BZGFwdGVyJExUJHN0ZC4uaW8uLmN1cnNvci4uQ3Vyc29yJExUJCRSRiRtdXQkdTIwJCR1NWIkdTgkdTVkJCRHVCQkR1QkJEdUJDE3aDkzMmZlMjFhMjhmYjk4OThFgAKRAl9aTjRjb3JlM3B0cjIzOGRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLmJveGVkLi5jb252ZXJ0Li4kTFQkaW1wbCR1MjAkY29yZS4uY29udmVydC4uRnJvbSRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckR1QkJHUyMCRmb3IkdTIwJGFsbG9jLi5ib3hlZC4uQm94JExUJGR5biR1MjAkY29yZS4uZXJyb3IuLkVycm9yJHUyYiRjb3JlLi5tYXJrZXIuLlNlbmQkdTJiJGNvcmUuLm1hcmtlci4uU3luYyRHVCQkR1QkLi5mcm9tLi5TdHJpbmdFcnJvciRHVCQxN2gwYmI0NDA2MzliYzc2NjkzRYECTF9aTjRjb3JlM3B0cjQyZHJvcF9pbl9wbGFjZSRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckR1QkMTdoOTc0ZGZiNTQyZTQ5NDA5ZkWCAlBfWk40Y29yZTNwdHI0NmRyb3BfaW5fcGxhY2UkTFQkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEdUJCRHVCQxN2hmNzViYTc2NDE3MTU0OTg3RYMCaV9aTjRjb3JlM3B0cjcxZHJvcF9pbl9wbGFjZSRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uRm9ybWF0U3RyaW5nUGF5bG9hZCRHVCQxN2gzNzdiZGJhMzdkYTNlNmI0RYQCNV9aTjRjb3JlNWVycm9yNUVycm9yMTFkZXNjcmlwdGlvbjE3aGY4MTliNWIzNGVmZjRkYjdFhQIuX1pONGNvcmU1ZXJyb3I1RXJyb3I1Y2F1c2UxN2hiMDhjYjM0OGM3MzExNjRkRYYCMF9aTjRjb3JlNWVycm9yNUVycm9yN3Byb3ZpZGUxN2hkNjBjMGRiYzQxYWJiYWEwRYcCMF9aTjRjb3JlNWVycm9yNUVycm9yN3R5cGVfaWQxN2g4ZDkzMzAyMWRiZWMzNjM5RYgCN19aTjRjb3JlNXBhbmljMTJQYW5pY1BheWxvYWQ2YXNfc3RyMTdoOTg4OTQxMmMyZTRlOGU2MEWJAl9fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2gwMDUxZTZhZjdhNzUxZWY4RYoCXV9aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2gwODhkMjk3MjQxOTlkYTNiRYsCZV9aTjYwXyRMVCRzdGQuLmlvLi5zdGRpby4uU3RkZXJyUmF3JHUyMCRhcyR1MjAkc3RkLi5pby4uV3JpdGUkR1QkMTR3cml0ZV92ZWN0b3JlZDE3aGZlYTgwNjU2OTU3MGRjYTJFjAJhX1pONjZfJExUJHN0ZC4uc3lzLi5zdGRpby4ud2FzaXAyLi5TdGRlcnIkdTIwJGFzJHUyMCRzdGQuLmlvLi5Xcml0ZSRHVCQ1d3JpdGUxN2g5YzFmMGM1YTkwNzA2MWFiRY0CYV9aTjY2XyRMVCRzdGQuLnN5cy4uc3RkaW8uLndhc2lwMi4uU3RkZXJyJHUyMCRhcyR1MjAkc3RkLi5pby4uV3JpdGUkR1QkNWZsdXNoMTdoNWM4NjQ0NzI3MTFjMjQ2N0WOAnRfWk44MV8kTFQkc3RkLi5pby4uZGVmYXVsdF93cml0ZV9mbXQuLkFkYXB0ZXIkTFQkVCRHVCQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2hhMTk4NWRmMWRhOGU2OWMyRY8CdF9aTjgxXyRMVCRzdGQuLmlvLi5kZWZhdWx0X3dyaXRlX2ZtdC4uQWRhcHRlciRMVCRUJEdUJCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aGJkYWQ4ZDRiNjkxNWFhNTJFkAJ0X1pOODFfJExUJHN0ZC4uaW8uLmRlZmF1bHRfd3JpdGVfZm10Li5BZGFwdGVyJExUJFQkR1QkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoY2RjYzE5ZDZkODA3MDU3ZEWRAnNfWk44Nl8kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLlN0YXRpY1N0clBheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGU4OGVlNjMzYmI3NzgzMzFFkgJ2X1pOODlfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5Gb3JtYXRTdHJpbmdQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hlY2M1ZTMzNWM0ZTY1ZDg5RZMCel9aTjkzXyRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uU3RhdGljU3RyUGF5bG9hZCR1MjAkYXMkdTIwJGNvcmUuLnBhbmljLi5QYW5pY1BheWxvYWQkR1QkM2dldDE3aDMxMmUyNTY4MWJkYTg2YmZFlAJ9X1pOOTNfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5TdGF0aWNTdHJQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4ucGFuaWMuLlBhbmljUGF5bG9hZCRHVCQ2YXNfc3RyMTdoNTM4N2YxMjIwMGI1ZjgzOEWVAn9fWk45M18kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLlN0YXRpY1N0clBheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5wYW5pYy4uUGFuaWNQYXlsb2FkJEdUJDh0YWtlX2JveDE3aGE1YjA2MmJiMzkxNWE5ZTFFlgJ9X1pOOTZfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5Gb3JtYXRTdHJpbmdQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4ucGFuaWMuLlBhbmljUGF5bG9hZCRHVCQzZ2V0MTdoOTM0NDU5YTk3MGJmNTgyM0WXAoIBX1pOOTZfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5Gb3JtYXRTdHJpbmdQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4ucGFuaWMuLlBhbmljUGF5bG9hZCRHVCQ4dGFrZV9ib3gxN2hiZmE1ODFmZDUzNjZhMjA4RZgCDGNhYmlfcmVhbGxvY5kCTF9aTjR3YXNpNXByb3h5NDBfX2xpbmtfY3VzdG9tX3NlY3Rpb25fZGVzY3JpYmluZ19pbXBvcnRzMTdoZDE3NWNhY2YzMjk5NmRkZEWaAklfWk40d2FzaTdpbXBvcnRzNHdhc2kyaW81ZXJyb3I1RXJyb3IxNXRvX2RlYnVnX3N0cmluZzE3aGJmOTkzMmViNjVmNDhiNmRFmwJcX1pONHdhc2k3aW1wb3J0czR3YXNpMmlvN3N0cmVhbXMxMk91dHB1dFN0cmVhbTI0YmxvY2tpbmdfd3JpdGVfYW5kX2ZsdXNoMTdoMDczZTY5NmQ1MzYyOGE3OEWcAkBfWk40d2FzaTdpbXBvcnRzNHdhc2kzY2xpNnN0ZGVycjEwZ2V0X3N0ZGVycjE3aDk2ZjZkNDY4M2ExNmMzMzNFnQIGbWFsbG9jngIIZGxtYWxsb2OfAg1wcmVwZW5kX2FsbG9joAIEZnJlZaECBmRsZnJlZaICBmNhbGxvY6MCB3JlYWxsb2OkAg1kaXNwb3NlX2NodW5rpQIOcG9zaXhfbWVtYWxpZ26mAhFpbnRlcm5hbF9tZW1hbGlnbqcCBV9FeGl0qAIZX193YXNpbGliY19lbnN1cmVfZW52aXJvbqkCHV9fd2FzaWxpYmNfaW5pdGlhbGl6ZV9lbnZpcm9uqgIFYWJvcnSrAgZnZXRjd2SsAgRzYnJrrQIld2FzaXAyX2xpc3RfdHVwbGUyX3N0cmluZ19zdHJpbmdfZnJlZa4CG2Vudmlyb25tZW50X2dldF9lbnZpcm9ubWVudK8CCWV4aXRfZXhpdLACBmdldGVudrECBm1lbWNtcLICC19fc3RyY2hybnVsswIIX19zdHBjcHm0AgZzdHJjcHm1AgZzdHJkdXC2AgZzdHJsZW63AgdzdHJuY21wuAI3X1pONWFsbG9jNWFsbG9jMThoYW5kbGVfYWxsb2NfZXJyb3IxN2hhZmZlYjIzNjJhYjQ3MDZhRbkCnAJfWk4yNTRfJExUJGFsbG9jLi5ib3hlZC4uY29udmVydC4uJExUJGltcGwkdTIwJGNvcmUuLmNvbnZlcnQuLkZyb20kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJCR1MjAkZm9yJHUyMCRhbGxvYy4uYm94ZWQuLkJveCRMVCRkeW4kdTIwJGNvcmUuLmVycm9yLi5FcnJvciR1MmIkY29yZS4ubWFya2VyLi5TZW5kJHUyYiRjb3JlLi5tYXJrZXIuLlN5bmMkR1QkJEdUJC4uZnJvbS4uU3RyaW5nRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hhMmM4ODIyYjA4MDRhNTBhRboCngJfWk4yNTZfJExUJGFsbG9jLi5ib3hlZC4uY29udmVydC4uJExUJGltcGwkdTIwJGNvcmUuLmNvbnZlcnQuLkZyb20kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJCR1MjAkZm9yJHUyMCRhbGxvYy4uYm94ZWQuLkJveCRMVCRkeW4kdTIwJGNvcmUuLmVycm9yLi5FcnJvciR1MmIkY29yZS4ubWFya2VyLi5TZW5kJHUyYiRjb3JlLi5tYXJrZXIuLlN5bmMkR1QkJEdUJC4uZnJvbS4uU3RyaW5nRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGVkNzAyYTgyNmVkNjYxOTRFuwIwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aGVjNDAxMjNlYTYwNTZlOTBFvAJMX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2gwNGI3NWRmOTljNjBmNWEzRb0CUl9aTjUzXyRMVCRjb3JlLi5mbXQuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMWI2NTUzNmNkMzNhMWUxY0W+Al9fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2gwMDUxZTZhZjdhNzUxZWY4Rb8CWl9aTjVhbGxvYzdyYXdfdmVjMjBSYXdWZWNJbm5lciRMVCRBJEdUJDdyZXNlcnZlMjFkb19yZXNlcnZlX2FuZF9oYW5kbGUxN2g2ZTdhZjE3NGJhZGE4ZWUzRcACXV9aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2gwODhkMjk3MjQxOTlkYTNiRcECM19aTjVhbGxvYzdyYXdfdmVjMTJoYW5kbGVfZXJyb3IxN2hjMzEwMzIwYWUwNTY4ZGIxRcICRF9aTjVhbGxvYzNmZmk1Y19zdHI3Q1N0cmluZzE5X2Zyb21fdmVjX3VuY2hlY2tlZDE3aDViOTkzYzJiMWM5OTAxMTlFwwJIX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkMTFmaW5pc2hfZ3JvdzE3aGU0OTJkZDcwM2ExNDVhNWZFxAI2X1pONWFsbG9jM2ZtdDZmb3JtYXQxMmZvcm1hdF9pbm5lcjE3aDQ3OWNmYjU2OTdmMWZjNzhFxQI4X1pONWFsbG9jN3Jhd192ZWMxN2NhcGFjaXR5X292ZXJmbG93MTdoNDY3OTllYWNmMTVjZmY4M0XGAkNfWk41YWxsb2M3cmF3X3ZlYzE5UmF3VmVjJExUJFQkQyRBJEdUJDhncm93X29uZTE3aGZkMTdmYmFlNWY1NDY4YmRFxwJbX1pONjBfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmNsb25lLi5DbG9uZSRHVCQ1Y2xvbmUxN2gxOWRmNmI4NGRjNGYzYTE0RcgCeV9aTjgxXyRMVCQkUkYkJHU1YiR1OCR1NWQkJHUyMCRhcyR1MjAkYWxsb2MuLmZmaS4uY19zdHIuLkNTdHJpbmcuLm5ldy4uU3BlY05ld0ltcGwkR1QkMTNzcGVjX25ld19pbXBsMTdoZDIwMjg1Y2EyY2FhYzhhM0XJAkZfWk40MV8kTFQkY2hhciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDBmODE1NGViMjRlMzhiNzRFygImX1pONGNvcmUzZm10NXdyaXRlMTdoZGZiMDFjYTIwYjNmMTRhMEXLAkVfWk40MF8kTFQkc3RyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoOTZmNmYyYjgxYWUzOTcwY0XMAlNfWk40Y29yZTRjaGFyN21ldGhvZHMyMl8kTFQkaW1wbCR1MjAkY2hhciRHVCQxNmVzY2FwZV9kZWJ1Z19leHQxN2g4ZmQxNGJjNDgzZDg2NmJkRc0CMl9aTjRjb3JlM3N0cjE2c2xpY2VfZXJyb3JfZmFpbDE3aDUzOGViY2E5ZDAyNDUyZTJFzgJcX1pONGNvcmUzZm10M251bTUwXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRlYnVnJHUyMCRmb3IkdTIwJHUzMiRHVCQzZm10MTdoM2Q1ZGQ2NjUxMjIwYzRjOEXPAkdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hhMzEwZTQ5YjE3ZjQyMDYzRdACXF9aTjRjb3JlM2ZtdDNudW01MF8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EZWJ1ZyR1MjAkZm9yJHUyMCR1NjQkR1QkM2ZtdDE3aDIxN2Y1YjdiMjRkMjBlMmVF0QJHX1pONDJfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoZTc2YmEzYThkMzdiZGQ3NEXSAkdfWk40Ml8kTFQkc3RyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2gxMzU3NzRiY2M2NzNmMDhjRdMCLl9aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIzcGFkMTdoMzY5YjAyYzE0NzlhYTY1ZEXUAkhfWk40M18kTFQkYm9vbCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoOThhY2VmZWJlYjA4MTViZEXVAkhfWk40M18kTFQkY2hhciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNWFkYjc5YmJlMjYxNzM4MUXWAklfWk40NF8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDBmNjI5YWQ2MTFiNzdkMDlF1wJLX1pONGNvcmUzZm10M251bTNpbXAyMV8kTFQkaW1wbCR1MjAkdTMyJEdUJDEwX2ZtdF9pbm5lcjE3aDc4ZWM2YzA1OTI0NWVjYzJF2AI4X1pONGNvcmUzZm10OUZvcm1hdHRlcjEycGFkX2ludGVncmFsMTdoYjczOWEyOTA2NmQxOTIxOEXZAjBfWk40Y29yZTlwYW5pY2tpbmc5cGFuaWNfZm10MTdoZmU4YmY3ZjkzZTkyNWYxYkXaAkxfWk40Y29yZTlwYW5pY2tpbmcxMXBhbmljX2NvbnN0MjNwYW5pY19jb25zdF9kaXZfYnlfemVybzE3aGE0OTRlYzRkN2Y5NDhhMjNF2wJAX1pONGNvcmUzZmZpNWNfc3RyNENTdHIxOWZyb21fYnl0ZXNfd2l0aF9udWwxN2g0ZjA0N2U2NmMzZDIyYWY2RdwCM19aTjRjb3JlM3N0cjhjb252ZXJ0czlmcm9tX3V0ZjgxN2hmZjQxMDQxMDBiMjcwOWM1Rd0COl9aTjRjb3JlOXBhbmlja2luZzE4cGFuaWNfYm91bmRzX2NoZWNrMTdoNjFlZDc1YmZkYjJiZjM5YkXeAktfWk40Y29yZTNmbXQzbnVtM2ltcDIxXyRMVCRpbXBsJHUyMCR1NjQkR1QkMTBfZm10X2lubmVyMTdoMDdhY2Q0MjY2NzJmMWQxZEXfAmJfWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkaTMyJEdUJDNmbXQxN2g4ZTZmNDFmOTI1ZDZmNTkyReACYl9aTjRjb3JlM2ZtdDNudW0zaW1wNTJfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCRpNjQkR1QkM2ZtdDE3aDYzOWI3ODFmNDNkYWJiYTZF4QJiX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHUzMiRHVCQzZm10MTdoMWM3Mjg0ZGYwYzAzM2U4Y0XiAmJfWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTY0JEdUJDNmbXQxN2hhOGZkODNjZDM1MDkxYTQ1ReMCP19aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIxOXBhZF9mb3JtYXR0ZWRfcGFydHMxN2g4YWNlNmI4ODZmOGQ4OWQyReQCOl9aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsMTdoNGMxOTI0MzIwNWRmOTM3OEXlAjBfWk40Y29yZTNmbXQ1V3JpdGU5d3JpdGVfZm10MTdoZGJhMTBmYzQyZmRiOWJhMEXmAixfWk40Y29yZTlwYW5pY2tpbmc1cGFuaWMxN2g2MDk3MTcxODQ1MzIxNTVhRecCSV9aTjRjb3JlM251bTdmbHQyZGVjOHN0cmF0ZWd5NWdyaXN1MTZmb3JtYXRfZXhhY3Rfb3B0MTdoZTdkZWEwNWY3MGQzZDk4M0XoAkZfWk40Y29yZTNudW03Zmx0MmRlYzhzdHJhdGVneTZkcmFnb24xMmZvcm1hdF9leGFjdDE3aGY0ZmExOTcyYmYzMjA4YWFF6QI7X1pONGNvcmUzbnVtN2ZsdDJkZWMxN2RpZ2l0c190b19kZWNfc3RyMTdoOGE3ZTFjZDcyNDc2MGU3Y0XqAkVfWk40Y29yZTNmbXQ1ZmxvYXQyOWZsb2F0X3RvX2RlY2ltYWxfY29tbW9uX2V4YWN0MTdoN2Y0NjI1NTYwYjhhZWM5NkXrAkxfWk40Y29yZTNudW03Zmx0MmRlYzhzdHJhdGVneTVncmlzdTE5Zm9ybWF0X3Nob3J0ZXN0X29wdDE3aDhiNGM0NTJmYmRhODIyODRF7AJJX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k2ZHJhZ29uMTVmb3JtYXRfc2hvcnRlc3QxN2g5ZmZkZDViMGQzNzEwNjM5Re0CSF9aTjRjb3JlM2ZtdDVmbG9hdDMyZmxvYXRfdG9fZGVjaW1hbF9jb21tb25fc2hvcnRlc3QxN2hlMWJhZTQ2Y2ZiOTM3MTQ5Re4CYF9aTjRjb3JlM2ZtdDVmbG9hdDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkZjY0JEdUJDNmbXQxN2hjOTdkMDdhMDhiMmFiZWE2Re8CZ19aTjY4XyRMVCRjb3JlLi5mbXQuLmJ1aWxkZXJzLi5QYWRBZGFwdGVyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoZWU0YTdhZWNkMGRiMDY5OUXwAjtfWk40Y29yZTNmbXQ4YnVpbGRlcnMxMERlYnVnVHVwbGU1ZmllbGQxN2g1ODBkYzQ4NjRkNzg5OTZhRfECPF9aTjRjb3JlM2ZtdDhidWlsZGVyczEwRGVidWdUdXBsZTZmaW5pc2gxN2gzODg3MTMyNzljZjhkMmE4RfICN19aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIxMWRlYnVnX3R1cGxlMTdoNDA1YzdjOTk4YTE5ODE4ZUXzAkZfWk40Y29yZTNmbXQ5Rm9ybWF0dGVyMTJwYWRfaW50ZWdyYWwxMndyaXRlX3ByZWZpeDE3aDMwMTRjMjIxZGIyYzY5YjlF9AI2X1pONGNvcmUzc3RyNWNvdW50MTRkb19jb3VudF9jaGFyczE3aDM5MWUxOWYyMmMwYTgzYzVF9QJBX1pONGNvcmUzZm10OUZvcm1hdHRlcjIxd3JpdGVfZm9ybWF0dGVkX3BhcnRzMTdoNjMyN2E1NzgwMmU0NGY4MEX2AjRfWk40Y29yZTNmbXQ5Rm9ybWF0dGVyOXdyaXRlX3N0cjE3aGE0MjMyYWFkZGI1NjE0MTNF9wI8X1pONGNvcmUzbnVtNmJpZ251bThCaWczMng0MDEwbXVsX2RpZ2l0czE3aDdhYTdlMTY1YTgwYWY5MWRF+AI5X1pONGNvcmUzbnVtNmJpZ251bThCaWczMng0MDhtdWxfcG93MjE3aDY1ZTY2OTljZWQzOGNjOGJF+QJZX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k1Z3Jpc3UxNmZvcm1hdF9leGFjdF9vcHQxNHBvc3NpYmx5X3JvdW5kMTdoOWQ5MWZhNjNlMzNlNDNmN0X6AjVfWk40Y29yZTlwYW5pY2tpbmcxM2Fzc2VydF9mYWlsZWQxN2hkN2E1N2M3NmQyNTNkNzljRfsCQl9aTjRjb3JlM251bTdmbHQyZGVjOHN0cmF0ZWd5NmRyYWdvbjltdWxfcG93MTAxN2hhNzZkZGE3NTEyM2Q3MTY3RfwCNV9aTjRjb3JlM3N0cjE5c2xpY2VfZXJyb3JfZmFpbF9ydDE3aDM0MGFmNTdjMmRiZDM5ZjNF/QIyX1pONGNvcmU2b3B0aW9uMTN1bndyYXBfZmFpbGVkMTdoNmZkYjI1M2NkMjllMDA4MEX+AmRfWk43MV8kTFQkY29yZS4ub3BzLi5yYW5nZS4uUmFuZ2UkTFQkSWR4JEdUJCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDg5ZGEwM2Q1ZTkwMWYxMTNF/wI5X1pONGNvcmUzc3RyN3BhdHRlcm4xMVN0clNlYXJjaGVyM25ldzE3aDk4ZWYyZGUzYjY3Zjg0MGJFgANQX1pONGNvcmU3dW5pY29kZTEydW5pY29kZV9kYXRhMTVncmFwaGVtZV9leHRlbmQxMWxvb2t1cF9zbG93MTdoZDdiMTc1M2U5OGNmZDNiZEWBAzxfWk40Y29yZTd1bmljb2RlOXByaW50YWJsZTEyaXNfcHJpbnRhYmxlMTdoMGJmNTFmZDZkY2UzZTYzMkWCA0tfWk40Y29yZTVzbGljZTVpbmRleDE2c2xpY2VfaW5kZXhfZmFpbDhkb19wYW5pYzdydW50aW1lMTdoMzExNzRjMjIxNGMwOGViOEWDA0tfWk40Y29yZTVzbGljZTVpbmRleDE2c2xpY2VfaW5kZXhfZmFpbDhkb19wYW5pYzdydW50aW1lMTdoMmFiNDBmZDMyMDhmOWY0ZUWEA0tfWk40Y29yZTVzbGljZTVpbmRleDE2c2xpY2VfaW5kZXhfZmFpbDhkb19wYW5pYzdydW50aW1lMTdoNDhlMGNmYTkxNzJhZWMyOUWFAzlfWk40Y29yZTVzbGljZTZtZW1jaHIxNG1lbWNocl9hbGlnbmVkMTdoMjZjYzBiNWEyNTA3OTUyMkWGAzJfWk40Y29yZTZvcHRpb24xM2V4cGVjdF9mYWlsZWQxN2g1MTczYjg2MWIzMjI3NDFhRYcDMl9aTjRjb3JlNnJlc3VsdDEzdW53cmFwX2ZhaWxlZDE3aGNjMjVjNDIwZDJiYzI4YTJFiAM7X1pONGNvcmU5cGFuaWNraW5nMTlhc3NlcnRfZmFpbGVkX2lubmVyMTdoYjFiN2MwZjliNzU2ODkxZkWJA1hfWk41OV8kTFQkY29yZS4uZm10Li5Bcmd1bWVudHMkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDZiYmNhMGJiNTU4NWE5YzZFigNeX1pONTdfJExUJGNvcmUuLmZtdC4uRm9ybWF0dGVyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2g0NjVkMzMyYTJhODAxZGJiRYsDaV9aTjY4XyRMVCRjb3JlLi5mbXQuLmJ1aWxkZXJzLi5QYWRBZGFwdGVyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2hiNzAxMmNjOWJjMDgxNTRiRYwDCF9fbXVsdGkzB+UXIwAPX19zdGFja19wb2ludGVyAR9HT1QuZGF0YS5pbnRlcm5hbC5fX21lbW9yeV9iYXNlAj5HT1QuZGF0YS5pbnRlcm5hbC5fWk4xMHNlcmRlX2pzb24yZGU1UE9XMTAxN2g1ZTQ5MGQxN2NhNzQzMzIwRQNuR09ULmZ1bmMuaW50ZXJuYWwuX1pONjNfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZTg2OTI0M2RkN2UzMTI5MUUEHkdPVC5kYXRhLmludGVybmFsLl9fdGFibGVfYmFzZQV0R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHU2NCRHVCQzZm10MTdoYThmZDgzY2QzNTA5MWE0NUUGdEdPVC5mdW5jLmludGVybmFsLl9aTjRjb3JlM2ZtdDNudW0zaW1wNTJfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCRpMzIkR1QkM2ZtdDE3aDhlNmY0MWY5MjVkNmY1OTJFB44BR09ULmZ1bmMuaW50ZXJuYWwuX1pOOTVfJExUJGNvb3JkaW5hdG9yLi5ob3N0Li5pbnRlcmZhY2VzLi5jb250cmFjdHNfY2FsbC4uSW52b2tlRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2g4MWM1YjYxNDg2NzE0MzQ1RQh2R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1NF8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHVzaXplJEdUJDNmbXQxN2hiNjVkNjljNTc0ZDc2NThlRQlAR09ULmRhdGEuaW50ZXJuYWwuX1pOMTBzZXJkZV9qc29uM3NlcjZFU0NBUEUxN2g3NzczYTFiMWRlOGZmMzdkRQpiR09ULmRhdGEuaW50ZXJuYWwuX1pOMTBzZXJkZV9qc29uM3NlcjlGb3JtYXR0ZXIxN3dyaXRlX2NoYXJfZXNjYXBlMTBIRVhfRElHSVRTMTdoZmQyMWM4MWI5NTAwNWRkN0ULXkdPVC5kYXRhLmludGVybmFsLl9aTjExY29vcmRpbmF0b3I3ZXhwb3J0czVzeW5vZDVhZ2VudDljb250cmFjdHM5X1JFVF9BUkVBMTdoMGJiZmE1MTJmZjM2NzQ1MkUMckdPVC5mdW5jLmludGVybmFsLl9aTjY3XyRMVCRzZXJkZV9qc29uLi5lcnJvci4uRXJyb3JDb2RlJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hlZmE5OWUzZTFmZTRhM2M0RQ13R09ULmZ1bmMuaW50ZXJuYWwuX1pONzJfJExUJHNlcmRlX2pzb24uLmVycm9yLi5Kc29uVW5leHBlY3RlZCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNDlhYjZkODQxOTc4MzVkMUUOWkdPVC5mdW5jLmludGVybmFsLl9aTjQzXyRMVCRib29sJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g5OGFjZWZlYmViMDgxNWJkRQ90R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJGk2NCRHVCQzZm10MTdoNjM5Yjc4MWY0M2RhYmJhNkUQdkdPVC5mdW5jLmludGVybmFsLl9aTjcxXyRMVCRzZXJkZV9jb3JlLi5kZS4uV2l0aERlY2ltYWxQb2ludCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNGU4M2Y2N2M0ZWMwMjE1N0URWkdPVC5mdW5jLmludGVybmFsLl9aTjQzXyRMVCRjaGFyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g1YWRiNzliYmUyNjE3MzgxRRJyR09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10NWZsb2F0NTJfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCRmNjQkR1QkM2ZtdDE3aGM5N2QwN2EwOGIyYWJlYTZFE3RHT1QuZnVuYy5pbnRlcm5hbC5fWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTMyJEdUJDNmbXQxN2gxYzcyODRkZjBjMDMzZThjRRQXR09ULmRhdGEuaW50ZXJuYWwuZXJybm8VkQFHT1QuZnVuYy5pbnRlcm5hbC5fWk45OF8kTFQkc3RkLi5zeXMuLmJhY2t0cmFjZS4uQmFja3RyYWNlTG9jay4ucHJpbnQuLkRpc3BsYXlCYWNrdHJhY2UkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGRiODVhNGVkZmZjMDM3OWFFFjhHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkNWFsbG9jNEhPT0sxN2hjNzNhMjA1M2U3MmIzYjE4RRdNR09ULmZ1bmMuaW50ZXJuYWwuX1pOM3N0ZDVhbGxvYzI0ZGVmYXVsdF9hbGxvY19lcnJvcl9ob29rMTdoZWE1Y2RlMWQ0M2ZkMDQzMkUYjQFHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkNHN5bmM0bXBtYzV3YWtlcjE3Y3VycmVudF90aHJlYWRfaWQ1RFVNTVkyOF8kdTdiJCR1N2IkY2xvc3VyZSR1N2QkJHU3ZCQyM19fUlVTVF9TVERfSU5URVJOQUxfVkFMMTdoNTUyYTRhOGY3MWUxOWJiMEUZQkdPVC5kYXRhLmludGVybmFsLl9aTjNzdGQ2dGhyZWFkN2N1cnJlbnQyaWQySUQxN2hhNzhhMmY4MmVlYjYxNDczRRo8R09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDlwYW5pY2tpbmc0SE9PSzE3aDc5NzhiZGExZmU2NGMzY2JFG1hHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkOXBhbmlja2luZzExcGFuaWNfY291bnQxOEdMT0JBTF9QQU5JQ19DT1VOVDE3aDNlMDVlYmU5ZDg1NzU3NTZFHERHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkNnRocmVhZDdjdXJyZW50N0NVUlJFTlQxN2g0OWNmMTRhODlkYjZiOTIyRR0dR09ULmRhdGEuaW50ZXJuYWwuX19oZWFwX2Jhc2UeHEdPVC5kYXRhLmludGVybmFsLl9faGVhcF9lbmQfJEdPVC5kYXRhLmludGVybmFsLl9fd2FzaWxpYmNfZW52aXJvbiBXR09ULmRhdGEuaW50ZXJuYWwuX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k1Z3Jpc3UxMkNBQ0hFRF9QT1cxMDE3aDgwMmQ3MzMxMDliNDc5ODZFIVhHT1QuZnVuYy5pbnRlcm5hbC5fWk40MV8kTFQkY2hhciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDBmODE1NGViMjRlMzhiNzRFImpHT1QuZnVuYy5pbnRlcm5hbC5fWk41OV8kTFQkY29yZS4uZm10Li5Bcmd1bWVudHMkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDZiYmNhMGJiNTU4NWE5YzZFCRECAAcucm9kYXRhAQUuZGF0YQD6AQlwcm9kdWNlcnMCCGxhbmd1YWdlAgRSdXN0AANDMTEADHByb2Nlc3NlZC1ieQUFcnVzdGMdMS45My4wICgyNTRiNTk2MDcgMjAyNi0wMS0xOSkFY2xhbmdfMjEuMS40LXdhc2ktc2RrIChodHRwczovL2dpdGh1Yi5jb20vbGx2bS9sbHZtLXByb2plY3QgMjIyZmMxMWYyYjhmMjVmNmEwZjQ5NzYyNzJlZjFiYjdiZjQ5NTIxZCkNd2l0LWNvbXBvbmVudAYwLjIwLjEQd2l0LWJpbmRnZW4tcnVzdAYwLjQ1LjANd2l0LWJpbmRnZW4tYwYwLjE3LjAApAEPdGFyZ2V0X2ZlYXR1cmVzCSsLYnVsay1tZW1vcnkrD2J1bGstbWVtb3J5LW9wdCsWY2FsbC1pbmRpcmVjdC1vdmVybG9uZysOZXh0ZW5kZWQtY29uc3QrCm11bHRpdmFsdWUrD211dGFibGUtZ2xvYmFscysTbm9udHJhcHBpbmctZnB0b2ludCsPcmVmZXJlbmNlLXR5cGVzKwhzaWduLWV4dA');
    const module1 = base64Compile('AGFzbQEAAAABKQZgA39/fwBgB39/f39/f38AYAV/f39/fwBgAn9/AGAEf39/fwBgAX8AAwgHAAECAQMEBQQFAXABBwcHKAgBMAAAATEAAQEyAAIBMwADATQABAE1AAUBNgAGCCRpbXBvcnRzAQAKcwcNACAAIAEgAkEAEQAACxUAIAAgASACIAMgBCAFIAZBAREBAAsRACAAIAEgAiADIARBAhECAAsVACAAIAEgAiADIAQgBSAGQQMRAQALCwAgACABQQQRAwALDwAgACABIAIgA0EFEQQACwkAIABBBhEFAAsALwlwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQENd2l0LWNvbXBvbmVudAcwLjI0MS4y');
    const module2 = base64Compile('AGFzbQEAAAABKQZgA39/fwBgB39/f39/f38AYAV/f39/fwBgAn9/AGAEf39/fwBgAX8AAjMIAAEwAAAAATEAAQABMgACAAEzAAEAATQAAwABNQAEAAE2AAUACCRpbXBvcnRzAXABBwcJDQEAQQALBwABAgMEBQYALwlwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQENd2l0LWNvbXBvbmVudAcwLjI0MS4y');
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'host:interfaces/contracts-call@2.1.0': {
        invoke: exports0['3'],
      },
      'host:interfaces/kv-store@2.1.0': {
        get: exports0['2'],
        put: exports0['1'],
      },
      'host:interfaces/logging@2.1.0': {
        info: exports0['0'],
      },
      'wasi:cli/environment@0.2.0': {
        'get-environment': exports0['6'],
      },
      'wasi:cli/exit@0.2.0': {
        exit: trampoline3,
      },
      'wasi:cli/stderr@0.2.4': {
        'get-stderr': trampoline2,
      },
      'wasi:io/error@0.2.4': {
        '[method]error.to-debug-string': exports0['4'],
        '[resource-drop]error': trampoline0,
      },
      'wasi:io/streams@0.2.4': {
        '[method]output-stream.blocking-write-and-flush': exports0['5'],
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