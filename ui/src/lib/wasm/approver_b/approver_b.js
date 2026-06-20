"use components";
import { error, info } from '../../wasm-env.js';
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

const handleTable0 = [T_FLAG, 0];
handleTable0._createdReps = new Set();


const captureTable0= new Map();
let captureCnt0= 0;

HANDLE_TABLES[0] = handleTable0;

const _trampoline6 = function(arg0, arg1) {
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
_trampoline6.fnName = 'wasi:io/error@0.2.6#toDebugString';

const _trampoline7 = function(arg0, arg1, arg2, arg3) {
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
_trampoline7.fnName = 'wasi:io/streams@0.2.6#blockingWriteAndFlush';

const _trampoline8 = function(arg0) {
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
_trampoline8.fnName = 'wasi:cli/environment@0.2.6#getEnvironment';
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
  importFn: _trampoline6,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 6,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline6.manuallyAsync,
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
  importFn: _trampoline7,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 7,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline7.manuallyAsync,
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
  importFn: _trampoline8,
},
)) : _lowerImportBackwardsCompat.bind(
null,
{
  trampolineIdx: 8,
  componentIdx: 0,
  isAsync: false,
  isManualAsync: _trampoline8.manuallyAsync,
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
  importFn: _trampoline8,
},
);

const $init = (() => {
  let gen = (function* _initGenerator () {
    const module0 = base64Compile('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IBghDQtBgICAgHghDiANIAEQwoCAgAAhDQsgACAONgIAIAAgDTYCBCAGQdAAaiSAgICAAAumHQUKfwF+BH8Bfgd/I4CAgIAAQaABayIGJICAgIAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAEoAgAiBy8BkgMiCEELSQ0AQQUhCUEEIQogASgCCCILQQVJDQFBACEMIAshCiALQXtqDgIBAwILIAdBjAJqIgkgASgCCCILQQxsaiENAkACQCALQQFqIgogCE0NACANIAIpAgA3AgAgDUEIaiACQQhqKAIANgIADAELAkAgCCALayIOQQxsIgxFDQAgCSAKQQxsaiANIAz8CgAACyANQQhqIAJBCGooAgA2AgAgDSACKQIANwIAIA5BGGwiDUUNACAHIApBGGxqIAcgC0EYbGogDfwKAAALIAcgC0EYbGoiDUEQaiADQRBqKQMANwMAIA0gAykDADcDACANQQhqIANBCGopAwA3AwAgByAIQQFqOwGSAyABKAIEIQ8MDwsgASgCBCEIEOmAgIAAQZgDQQgQ5YCAgAAiDUUNAyANQQA2AogCIA0gBy8BkgMgCkF/c2oiCTsBkgMgCUEMTw0EIAcgCkEMbGoiAUGMAmooAgAhDiABQZACaikCACEQAkAgCUEMbCIMRQ0AIA1BjAJqIAFBmAJqIAz8CgAACyAHIApBGGxqIQECQCAJQRhsIglFDQAgDSABQRhqIAn8CgAACyAHIAo7AZIDIAZB7ABqQQxqIAFBCGopAgA3AgAgBkGAAWogAUEQaikCADcCACAGIAEpAgA3AnAgByERIAghDwwCCyALQXlqIQxBBiEJCyABKAIEIQgQ6YCAgABBmANBCBDlgICAACINRQ0DIA1BADYCiAIgDSAHLwGSAyAJQX9zaiIKOwGSAyAKQQxPDQQgByAJQQxsaiIBQYwCaigCACEOIAFBkAJqKQIAIRACQCAKQQxsIgtFDQAgDUGMAmogAUGYAmogC/wKAAALIAcgCUEYbGohAQJAIApBGGwiCkUNACANIAFBGGogCvwKAAALIAcgCTsBkgMgBkHsAGpBDGogAUEIaikCADcCACAGQYABaiABQRBqKQIANwIAIAYgASkCADcCcCANLwGSAyEKQQAhDyANIREgDCELCyARQYwCaiALQQxsaiEBAkAC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GGogAkGAAmpBGGopAwA3AwAgAkEIakEgaiACQYACakEgaikDADcDACACQQhqQShqIAJBgAJqQShqKQMANwMAIAJBCGpBMGogAkGAAmpBMGopAwA3AwAgAkEIakE4aiACQYACakE4aikDADcDACACQQhqQcAAaiACQYACakHAAGopAwA3AwAgAkEIakHIAGogAkGAAmpByABqKQMANwMAIAIgAikDkAI3AxggAiAIKQIANwOAAyACQRRqIAQoAgA2AgAgAiADNgIIIAIgAikDgAM3AgwgAi0AVA0EIAIoAhBFDQQCQCACKAIMIgNBCGooAgBBBEcNACADQQRqKAIAKAAAQebCpeMGRg0FCwJAIAIoAjRBAUsNACAAQQRqI4GAgIAAQYCdwIAAakHMABC2gICAACAAQQE2AgAMBgsgAkGAAmogAigCMCIDKAIQIAMoAhQQq4CAgAACQCACLQCAAkEBRw0AIABBBGojgYCAgABBiZrAgABqQSwQtoCAgAAgAEEBNgIADAYLIAIgAikDiAIiBjcDWCACQYgBaiEIAkBBwQBFDQAgCEEAQcEA/AsACyACQeAAakEYaiOBgICAACIJQbiawIAAaiIEQRhqKQMANwMAIAJB4ABqQRBqIARBEGopAwA3AwAgAkHgAGpBCGogBEEIaikDADcDACACQgA3A4ABIAIgBCkDADcDYCACI4SAgIAAQYiAgIAAaq1CIIYgAkHIAGqthDcDiAIgAiOFgICAAK1CIIYiCiACQThqrYQiCzcDgAIgAkGAA2ogCUGogMCAAGogAkGAAmoQtICAgAAgCCACKAKEAyIEIAIoAogDIAJB4ABqEKeAgIAAAkAgAigCgAMiCEUNACAEIAhBARDmgICAAAsCQEHwAEUNACACQYACaiACQeAAakHwAPwKAAALIAJBgAJqIAJBqAJqIAJBgANqEKaAgIAAIAJB4AFqQRhqIAJBgANqQRhqKQAANwMAIAJB4AFqQRBqIAJBgANqQRBqKQAANwMAIAJB4AFqQQhqIAJBgANqQQhqKQAANwMAIAIgAikAgAM3A+ABIAIjgYCAgABByJ7AgABqNgKMAiACIAJBgAJqNgKIAiACQYCAxAA2AoACIAIgAkHgAWo2AoQCIAJB1AFqIAJBgAJqENWAgIAAAkACQAJAAkACQCACKALcASIEIANBCGooAgBH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ATYCCCADIAA2AgQgAyOGgICAAK1CIIYgA0EEaq2ENwMQIAMjhICAgABBk4CAgABqrUIghiADQQhqrYQ3AxgjgYCAgABB+YPAgABqIANBEGoQv4CAgAAhAiADQSBqJICAgIAAIAILZAEBfyOAgICAAEEQayICJICAgIAAIAIgATYCBCACIAA2AgAgAiOEgICAAEGRgICAAGqtQiCGIAKthDcDCCOBgICAAEH4ksCAAGogAkEIahC/gICAACEBIAJBEGokgICAgAAgAQtmAQF/I4CAgIAAQRBrIgIkgICAgAACQAJAIAAoAgxFDQAgACEBDAELIAJBCGogAUEMahD3gICAACAAIAIoAgggAigCDBD8gICAACEBIABBFEEEEOaAgIAACyACQRBqJICAgIAAIAEL3wMBBX8jgICAgABBIGsiAySAgICAACADIAI6AAQgAyABNgIAIANBADYCECADQoCAgIDAADcCCCADQRRqIAMQm4CAgAACQAJAIAMtABQNAAJAA0AgAy0AFUEBRw0BIANBFGogAygCABCcgICAACADKAIUIgRBgICAgHhGDQIgAygCHCEFIAMoAhghBgJAIAMoAhAiAiADKAIIRw0AIANBCGoQ34CAgAALIAMoAgwgAkEMbGoiASAFNgIIIAEgBjYCBCABIAQ2AgAgAyACQQFqNgIQIANBFGogAxCbgICAACADLQAURQ0ADAILCyAAIAMpAgg3AgAgAEEIaiADQQhqQQhqKAIANgIADAELIAMoAhghAiAAQYCAgIB4NgIAIAAgAjYCBAJAIAMoAhAiAEUNACADKAIMIQdBACEGA0ACQCAHIAZBDGxqIgUoAggiAUUNACAFKAIEIQIDQAJAIAIoAgAiBEUNACACQQRqKAIAIARBARDmgICAAAsgAkEMaiECIAFBf2oiAQ0ACwsCQCAFKAIAIgJFDQAgBSgCBCACQQxsQQQQ5oCAgAALIAZBAWoiBiAARw0ACwsgAygCCCICRQ0AIAMoAgwgAkEMbEEEEOaAgIAACyADQSBqJICAgIAAC5EDAQR/I4CAgIAAQSBrIgMkgICAgAAgAyACOgAEIAMgATYCACADQQA2AhAgA0KAgICAwAA3AgggA0EUaiADEJuAgIAAAkACQCADLQAUDQACQANAIAMtABVBAUcNASADQRRqIAMoAgAQnYCAgAAgAygC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gAALFAAgACgCACAAKAIEIAEQtoKAgAALzwIBBH8jgICAgABBMGsiAiSAgICAAAJAAkACQCAAKAIQRQ0AIAJBEGpBCGogAEEQaiIDQQhqKAIANgIAIAIgAykCADcDECACQSBqQQhqIABBCGooAgA2AgAgAiAAKQIANwMgIAJBBGogAkEQaiACQSBqIAEgAEEMaiAAQRxqEKKAgIAAIAAoAgwhBCACKAIMIQUgAigCBCEDDAELIAAoAgwhBBDpgICAAEGYA0EIEOWAgIAAIgNFDQFBACEFIANBADYCiAIgBEEANgIEIAQgAzYCACADQQE7AZIDIAMgASkDADcDACADQQhqIAFBCGopAwA3AwAgA0EQaiABQRBqKQMANwMAIAMgACkCADcCjAIgA0GUAmogAEEIaigCADYCAAsgBCAEKAIIQQFqNgIIIAJBMGokgICAgAAgAyAFQRhsag8LQQhBmAMQnYKAgAAAC7oEAwN/An4BfCOAgICAAEEwayICJICAgIAAIAEoAgAhAQJAAkACQAJAAkAgACgCAA4DAAECAAsCQEEUIAApAwggAkEIahCTgYCAACIDayIAIAEoAgAgASgCCCIEa00NACABIAQgAEEBQQEQ4ICAgAAgASgCCCEECwJAIABFDQAgASgCBCAEaiACQQhqIANqIAD8CgAACyABIAQgAGo2AggMAgsgACkDCCIFIAVCP4ciBoUgBn0gAkEIahCTgYCAACEAAkAgBUJ/VQ0AIABBf2oiAEETSw0DIAJBCGogAGpBLToAAAsCQEEUIABrIgQgASgCACABKAIIIgNrTQ0AIAEgAyAEQQFBARDggICAACABKAIIIQMLAkAgBEUNACABKAIEIANqIAJBCGogAGogBPwKAAALIAEgAyAEajYCCAwBCwJAIAArAwgiB71C////////////AINCgICAgICAgPj/AFMNAAJAIAEoAgAgASgCCCIAa0EDSw0AIAEgAEEEQQFBARDggICAACABKAIIIQALIAEgAEEEajYCCCABKAIEIABqQe7qseMGNgAADAELAkAgByACQQhqEJSBgIAAIAJBCGprIgAgASgCACABKAIIIgRrTQ0AIAEgBCAAQQFBARDggICAACABKAIIIQQLAkAgAEUNACABKAIEIARqIAJBCGogAPwKAAALIAEgBCAAajYCCAsgAkEwaiSAgICAAEEADwsgAEEUI4GAgIAAQYzWwYAAahDBgoCAAAALwgECAn8BfkEBIQZBBCEHAkACQCAEIAVqQX9qQQAgBGtxrSADrX4iCEIgiKdFDQBBACEDDAELAkAgCKciA0GAgICAeCAEa00NAEEAIQMMAQsCQAJAAkACQCABRQ0AIAIgBSABbCAEIAMQ54CAgAAhBwwBCwJAIAMNACAEIQcMAgsQ6YCAgAAgAyAEEOWAgIAAIQcLIAcNACAAIAQ2AgQMAQsgACAHNgIEQQAhBgtBCCEHCyAAIAdqIAM2AgAgACAGNgIAC38BA38jgICAgABBEGsiASSAgICAACABQQRqIAAoAgAiAiAAKAIEIAJBAXQiAkEEIAJBBEsbIgJBBEEMEN6AgIAAAkAgASgCBEEBRw0AIAEoAgggASgCDBCmgoCAAAALIAEoAgghAyAAIAI2AgAgACADNgIEIAFBEGokgICAgAALyAEBAX8jgICAgABBEGsiBSSAgICAAAJAIAQNAEEAQQAQpoKAgAAACwJAIAIgAWoiASACTw0AQQBBABCmgoCAAAALIAVBBGogACgCACICIAAoAgQgASACQQF0IgIgASACSxsiAkEIQQRBASAEQYEISRsgBEEBRhsiASACIAFLGyICIAMgBBDegICAAAJAIAUoAgRBAUcNACAFKAIIIAUoAgwQpoKAgAAACyAFKAIIIQQgACACNgIAIAAgBDYCBCAFQRBqJICAgIAAC7kCAQV/IAEoAgghAiABKAIEIQMCQCAAKAIAIgEoAgAgASgCCCIERw0AIAEgBEEBQQFBARDggICAACABKAIIIQQLIAEgBEEBaiIFNgIIIAEoAgQgBGpB2wA6AAACQAJAIAJFDQAgAyAAEOKAgIAAIgYNASACQRhsQWhqIQQgA0EYaiEFAkADQCAERQ0BAkAgASgCACABKAIIIgZHDQAgASAGQQFBAUEBEOCAgIAAIAEoAgghBgsgASAGQQFqNgIIIAEoAgQgBmpBLDoAACAEQWhqIQQgBSAAEOKAgIAAIQYgBUEYaiEFIAZFDQAMAwsLIAEoAgghBQsCQCABKAIAIAVHDQAgASAFQQFBAUEBEOCAgIAAIAEoAgghBQsgASAFQQFqNgIIIAEoAgQgBWpB3QA6AABBACEGCyAGC+QMAQl/AkACQAJAAkACQAJAAkACQCAALQAADgYAAQIDBAUACwJAIAEoAgAiACgCACAAKAIIIgJrQQNLDQAgACACQQRBAUEBEOCAgIAAIAAoAgghAgsgACACQQRqNgIIIAAoAgQgAmpB7uqx4wY2AAAMBQsgASgCACECAkAgAC0AAQ0AAkAgAigCACACKAIIIgBrQQRLDQAgAiAAQQVBAUEBEOCAgIAAIAIoAgghAAsgAiAAQQVqNgIIIAIoAgQgAGoiACOBgICAAEHYnsCAAGoiAigAADYAACAAQQRqIAJBBGotAAA6AAAMBQsCQCACKAIAIAIoAggiAGtBA0sNACACIABBBEEBQQEQ4ICAgAAgAigCCCEACyACIABBBGo2AgggAigCBCAAakH05NWrBjYAAAwECyAAQQhqIAEQ3YCAgAAPCyABIAAgACgCCCAAKAIMEOSAgIAAGgwCCyABIABBBGoQ4YCAgAAPCyAAKAIMIQMCQCABKAIAIgQoAgAgBCgCCCICRw0AIAQgAkEBQQFBARDggICAACAEKAIIIQILIAQgAkEBaiIFNgIIIAQoAgQgAmpB+wA6AAACQCADDQACQCAEKAIAIAVHDQAgBCAFQQFBAUEBEOCAgIAAIAQoAgghBQsgBCAFQQFqNgIIIAQoAgQgBWpB/QA6AAAMAQsCQAJAIAAoAgQiAkUNAAJAIAAoAggiBkUNAAJAAkAgBkEHcSIFDQAgBiEADAELIAYhAANAIABBf2ohACACKAKYAyECIAVBf2oiBQ0ACwsgBkEISQ0AA0AgAigCmAMoApgDKAKYAygCmAMoApgDKAKYAygCmAMoApgDIQIgAEF4aiIADQALCwJAAkAgAi8BkgNFDQBBASEHQQAhBiACIQAMAQtBACEFQQEhCANAIAghCSACKAKIAiIARQ0DIAlBAWohCCAFQQFqIQUgAi8BkAMhBiAAIQIgBiAALwGSA08NAAsgBkEBaiEHAkAgBQ0AIAAhAgwBCyAFQX9qIQogACAHQQJ0akGYA2ohAgJAAkAgBUEHcQ0ADAELIAlBB3EhB0EAIQgDQCACKAIAIglBmANqIQIgByAIQQFqIghHDQALIAUgCGshBQtBACEHAkAgCkEHTw0AIAAhAiAJIQAMAQsDQCACKAIAKAKYAygCmAMoApgDKAKYAygCmAMoApgDKAKYAyIIQZgDaiECIAVBeGoiBQ0ACyAAIQIgCCEACyABIAAgAiAGQQxsaiIFQZACaigCACAFQZQCaigCABDkgICAABogAiAGQRhsaiEFAkAgBCgCACAEKAIIIgJHDQAgBCACQQFBAUEBEOCAgIAAIAQoAgghAgsgBCACQQFqNgIIIAQoAgQgAmpBOjoAACAFIAEQ4oCAgAAiAg0DAkAgA0F/aiIDRQ0AA0ACQAJAIAcgAC8BkgNJDQBBACEGQQEhCANAIAghCSAAKAKIAiICRQ0GIAlBAWohCCAGQQFqIQYgAC8BkAMhBSACIQAgBSACLwGSA08NAAsgBUEBaiEHAkAgBg0AIAIhAAwCCyACIAdBAnRqQZgDaiEIAkACQCAGQQdxDQAgBiEJDAELIAlBB3EhB0EAIQkDQCAIKAIAIgBBmANqIQggByAJQQFqIglHDQALIAYgCWshCQtBACEHIAZBf2pBB0kNAQNAIAgoAgAoApgDKAKYAygCmAMoApgDKAKYAygCmAMoApgDIgBBmANqIQggCUF4aiIJDQAMAgsLIAAhAiAHIQUgB0EBaiEHCyAFQRhsIQYgAiAFQQxsaiIFQZQCaigCACEIIAVBkAJqKAIAIQkCQCAEKAIAIAQoAggiBUcNACAEIAVBAUEBQQEQ4ICAgAAgBCgCCCEFCyACIAZqIQYgBCAFQQFqNgIIIAQoAgQgBWpBLDoAACABIAAgCSAIEOSAgIAAGgJAIAQoAgAgBCgCCCICRw0AIAQgAkEBQQFBARDggICAACAEKAIIIQILIAQgAkEBajYCCCAEKAIEIAJqQTo6AAAgBiABEOKAgIAAIgINBSADQX9qIgMNAAsLIAQoAgghBQsCQCAEKAIAIAVHDQAgBCAFQQFBAUEBEOCAgIAAIAQoAgghBQsgBCAFQQFqNgIIIAQoAgQgBWpB/QA6AAAMAQsjgYCAgABBuNbBgABqENuCgIAAAAtBACECCyACC9ABAQR/IAAoAgAhAyABKAIIIQQgASgCBCEFAkAgAC0ABEEBRg0AAkAgAygCACIBKAIAIAEoAggiBkcNACABIAZBAUEBQQEQ4ICAgAAgASgCCCEGCyABIAZBAWo2AgggASgCBCAGakEsOgAACyAAQQI6AAQgAyADIAUgBBDkgICAABoCQCADKAIAIgAoAgAgACgCCCIBRw0AIAAgAUEBQQFBARDggICAACAAKAIIIQELIAAgAUEBajYCCCAAKAIEIAFqQTo6AAAgAiADEOKAgIAAC9IEAQV/AkAgACgCACIEKAIAIAQoAggiAEcNACAEIABBAUEBQQEQ4ICAgAAgBCgCCCEACyAEIABBAWoiBTYCCCAEKAIEIABqQSI6AAADf0EAIQADQAJAIAMgAEcNAAJAIANFDQACQCADIAQoAgAgBWtNDQAgBCAFIANBAUEBEOCAgIAAIAQoAgghBQsCQCADRQ0AIAQoAgQgBWogAiAD/AoAAAsgBCAFIANqIgU2AggLAkAgBCgCACAFRw0AIAQgBUEBQQFBARDggICAACAEKAIIIQULIAQgBUEBajYCCCAEKAIEIAVqQSI6AABBAA8LIAIgAGohBiAAQQFqIgchACAGLQAAIggjiICAgABqLQAAIgZFDQALAkAgB0EBRg0AAkAgB0F/aiIAIAQoAgAgBWtNDQAgBCAFIABBAUEBEOCAgIAAIAQoAgghBQsCQCAARQ0AIAQoAgQgBWogAiAA/AoAAAsgBCAFIAdqQX9qIgU2AggLIAMgB2shAyACIAdqIQICQCAGQfUARw0AIAQoAgAhACOJgICAACIGIAhBD3FqLQAAIQcgBiAIQQR2ai0AACEGAkAgACAFa0EFSw0AIAQgBUEGQQFBARDggICAACAEKAIIIQULIAQoAgQgBWoiACAHOgAFIAAgBjoABCAAQdzqwYEDNgAAIAQgBUEGaiIFNgIIDAELAkAgBCgCACAFa0EBSw0AIAQgBUECQQFBARDggICAACAEKAIIIQULIAQoAgQgBWoiACAGOgABIABB3AA6AAAgBCAFQQJqIgU2AggMAAsLDQAgACABEKiBgIAADwsPACAAIAEgAhCqgYCAAA8LEQAgACABIAIgAxCrgYCAAA8LBQBBAA8LAwAPC2sBAn8gACgCACEBIABBgIDEADYCAAJAIAFBgIDEAEcNAEGAgMQAIQEgACgCBCICIAAoAghGDQAgACACQQFqNgIEIAAgACgCDCIBIAItAAAiAkEPcWotAAA2AgAgASACQQR2ai0AACEBCyABC8oFAQJ/I4CAgIAAQSBrIgMkgICAgAACQAJAAkACQCAAKAIIIgQgACgCBE8NACAAIARBAWo2AgggACgCACAEai0AACEEDAELIANBBDYCFCADQQxqIAAgA0EUahDsgICAACADLQAMDQEgAy0ADSEECwJAAkACQAJAAkACQAJAAkACQAJAAkAgBEH/AXFBXmoOVAIAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAFAAAABgAAAAAAAAAHAAAACAAJAQALIANBDDYCFCAAIANBFGoQ7YCAgAAhAgwLCyAAIAEgAhDugICAACECDAoLAkAgAigCCCIAIAIoAgBHDQAgAhCrgoCAAAsgAigCBCAAakEiOgAAIAIgAEEBajYCCAwHCwJAIAIoAggiACACKAIARw0AIAIQq4KAgAALIAIoAgQgAGpB3AA6AAAgAiAAQQFqNgIIDAYLAkAgAigCCCIAIAIoAgBHDQAgAhCrgoCAAAsgAigCBCAAakEvOgAAIAIgAEEBajYCCAwFCwJAIAIoAggiACACKAIARw0AIAIQq4KAgAALIAIoAgQgAGpBCDoAACACIABBAWo2AggMBAsCQCACKAIIIgAgAigCAEcNACACEKuCgIAACyACKAIEIABqQQw6AAAgAiAAQQFqNgIIDAMLAkAgAigCCCIAIAIoAgBHDQAgAhCrgoCAAAsgAigCBCAAakEKOgAAIAIgAEEBajYCCAwCCwJAIAIoAggiACACKAIARw0AIAIQq4KAgAALIAIoAgQgAGpBDToAACACIABBAWo2AggMAQsCQCACKAIIIgAgAigCAEcNACACEKuCgIAACyACKAIEIABqQQk6AAAgAiAAQQFqNgIIC0EAIQIMAQsgAygCECECCyADQSBqJICAgIAAIAILXAEBfyOAgICAAEEQayIDJICAgIAAIANBCGogASgCACABKAIEIAEoAggQ8YCAgAAgAiADKAIIIAMoAgwQ/ICAgAAhASAAQQE6AAAgACABNgIEIANBEGokgICAgAALUAEBfyOAgICAAEEQayICJICAgIAAIAJBCGogACgCACAAKAIEIAAoAggQ8YCAgAAgASACKAIIIAIoAgwQ/ICAgAAhACACQRBqJICAgIAAIAALkw4BCH8jgICAgABBIGsiAySAgICAAAJAAkACQAJAAkAgACgCBCIEIAAoAggiBUkNAAJAAkAgBCAFa0EDSw0AIAAgBDYCCCADQQQ2AhQgA0EMaiAAIANBFGoQ74CAgAAgBCEGDAELIAAgBUEEaiIGNgIIAkAjgYCAgAAiB0HensCAAGoiCCAAKAIAIAVqIgUtAAFBAXRqLwEAIAdB3qLAgABqIgcgBS0AAEEBdGovAQBywUEIdCAHIAUtAAJBAXRqLgEAciAIIAUtAANBAXRqLgEAciIFQQBIDQAgA0EAOwEMIAMgBTsBDgwBCyADQQw2AhQgA0EMaiAAIANBFGoQ74CAgAALAkAgAy8BDEEBRw0AIAMoAhAhAAwFCyADLwEOIQUCQAJAAkACQAJAAkACQAJAAkAgAUUNACAFQYB4cUH//wNxQYC4A0YNAQsgBUGAyABqQf//A3FBgPgDTw0BIAUhBwwCCyADQRQ2AhQgACADQRRqEO2AgIAAIQAMCwsgACgCACEIA0ACQAJAIAYgBE8NACAIIAZqLQAAIQcMAQsgA0EENgIUIANBDGogACADQRRqEOyAgIAAAkAgAy0ADEEBRw0AIAMoAhAhAAwNCyADLQANIQcLAkACQAJAAkAgB0H/AXFB3ABGDQAgAQ0BAkAgAigCACACKAIIIgBrQQNLDQAgAiAAQQRBAUEBEIuBgIAAIAIoAgghAAsgAigCBCAAaiIAQe0BOgAAIABBAmogBUE/cUGAAXI6AAAgACAFQQZ2QS9xQYABcjoAASACIAIoAghBA2o2AghBACEADA8LIAAgBkEBaiIHNgIIIAcgBE8NASAIIAdqLQAAIQcMAgsgACAGQQFqNgIIIANBFzYCFCAAIANBFGoQ7YCAgAAhAAwNCyADQQQ2AhQgA0EMaiAAIANBFGoQ7ICAgAAgAy0ADA0LIAMtAA0hBwsCQCAHQf8BcUH1AEYNACABDQoCQCACKAIAIAIoAggiBmtBA0sNACACIAZBBEEBQQEQi4GAgAAgAigCCCEGCyACKAIEIAZqIgZB7QE6AAAgBkECaiAFQT9xQYABcjoAACAGIAVBBnZBL3FBgAFyOgABIAIgAigCCEEDajYCCCAAQQAgAhDrgICAACEADAwLIAAgBkECaiIHNgIIIAQgB0kNCAJAAkAgBCAHa0EDSw0AIAAgBDYCCCADQQQ2AhQgA0EMaiAAIANBFGoQ74CAgAAgBCEGDAELIAAgBkEGaiIGNgIIAkAjgYCAgAAiCUHensCAAGoiCiAIIAdqIgctAAFBAXRqLwEAIAlB3qLAgABqIgkgBy0AAEEBdGovAQBywUEIdCAJIActAAJBAXRqLgEAciAKIActAANBAXRqLgEAciIHQQBIDQAgA0EAOwEMIAMgBzsBDgwBCyADQQw2AhQgA0EMaiAAIANBFGoQ74CAgAALAkAgAy8BDEUNACADKAIQIQAMDAsgAy8BDiIHQYDAAGpB//8DcUH/9wNLDQIgAQ0DAkAgAigCACACKAIIIglrQQNLDQAgAiAJQQRBAUEBEIuBgIAAIAIoAgghCQsgAigCBCAJaiIJQe0BOgAAIAlBAmogBUE/cUGAAXI6AAAgCSAFQQZ2QS9xQYABcjoAASACIAIoAghBA2o2AgggByEFIAdBgMgAakH//wNxQYD4A08NAAsLIAdB//8DcUGAAUkNBAJAIAIoAgAgAigCCCIAa0EDSw0AIAIgAEEEQQFBARCLgYCAACACKAIIIQALIAIoAgQgAGohACAHQf//A3FBgBBPDQIgB0EGdkFAciEEQQIhBgwDCyAFQYDQAGpB//8DcUEKdCAHQYDIAGpB//8DcXIiBEGAgARqIQYCQCACKAIAIAIoAggiAGtBA0sNACACIABBBEEBQQEQi4GAgAAgAigCCCEACyACKAIEIABqIgAgBkESdkHwAXI6AAAgAEEDaiAHQT9xQYABcjoAACAAIARBBnZBP3FBgAFyOgACIAAgBkEMdkE/cUGAAXI6AAEgAiACKAIIQQRqNgIIQQAhAAwICyADQRQ2AhQgACADQRRqEO2AgIAAIQAMBwsgACAHQQZ2QT9xQYABcjoAASAHQYDgA3FBDHZBYHIhBEEDIQYLIAAgBDoAACAAIAZqQX9qIAdBP3FBgAFyOgAAIAIgAigCCCAGajYCCEEAIQAMBQsCQCACKAIIIgAgAigCAEcNACACEKuCgIAACyACKAIEIABqIAc6AAAgAiAAQQFqNgIIQQAhAAwECyAFIAQgBCOBgICAAEHI18GAAGoQx4KAgAAACyAHIAQgBCOBgICAAEHI18GAAGoQx4KAgAAACyAAIAZBAmo2AgggA0EXNgIUIAAgA0EUahDtgICAACEADAELIAMoAhAhAAsgA0EgaiSAgICAACAAC1wBAX8jgICAgABBEGsiAySAgICAACADQQhqIAEoAgAgASgCBCABKAIIEPGAgIAAIAIgAygCCCADKAIMEPyAgIAAIQEgAEEBOwEAIAAgATYCBCADQRBqJICAgIAAC1wBAX8jgICAgABBEGsiAySAgICAACADQQhqIAEoAgAgASgCBCABKAIIEPGAgIAAIAIgAygCCCADKAIMEPyAgIAAIQEgAEECNgIAIAAgATYCBCADQRBqJICAgIAAC94EAQR/AkAgAyACSw0AQQAhBAJAAkACQAJAAkAgA0UNACABIANqIQUCQAJAIANBA0sNAANAIAUgAU0NAyAFQX9qIgUtAABBCkcNAAwCCwsCQEGAgoQIIAVBfGooAAAiBkGKlKjQAHNrIAZyQYCBgoR4cUGAgYKEeEYNAANAIAUgAU0NAyAFQX9qIgUtAABBCkcNAAwCCwsgAyAFQQNxayEGAkAgA0EJSQ0AAkADQCAGIgVBCEgNAUGAgoQIIAEgBWoiB0F4aigCACIGQYqUqNAAc2sgBnJBgIGChHhxQYCBgoR4Rw0BIAVBeGohBkGAgoQIIAdBfGooAgAiB0GKlKjQAHNrIAdyQYCBgoR4cUGAgYKEeEYNAAsLIAEgBWohBQNAIAUgAU0NAyAFQX9qIgUtAABBCkcNAAwCCwsgASAGaiEFA0AgBSABTQ0CIAVBf2oiBS0AAEEKRw0ACwsgBSABayIFQQFqIQQgBSACTw0BC0EBIQUgASABIARqTw0DIARBA3EhAiAEQX9qQQNPDQFBACEFDAILQQAgBCACI4GAgIAAQZjXwYAAahDHgoCAAAALIARBfHEhBkEAIQUDQCAFIAEtAABBCkZqIAFBAWotAABBCkZqIAFBAmotAABBCkZqIAFBA2otAABBCkZqIQUgAUEEaiEBIAZBfGoiBg0ACwsCQCACRQ0AA0AgBSABLQAAQQpGaiEFIAFBAWohASACQX9qIgINAAsLIAVBAWohBQsgACAFNgIAIAAgAyAEazYCBA8LQQAgAyACI4GAgIAAQajXwYAAahDHgoCAAAALXAEBfyOAgICAAEEQayIDJICAgIAAIANBCGogASgCACABKAIEIAEoAggQ8YCAgAAgAiADKAIIIAMoAgwQ/ICAgAAhASAAQQA2AgAgACABNgIEIANBEGokgICAgAALwwUCB38BfgJAIAAoAggiAiAAKAIEIgNGDQACQAJAAkACQCACIANPDQAgACgCACIEIAJqLQAAIgVBIkYNBCAFQdwARg0EAkAgAQ0AIAAgAkEBaiIFNgIIIAMgBWshBiADIAVNDQQgBCAFaiEHAkAgBkEDSw0AIAYhASAHIQIDQCACLQAAIgNBIkYNBSADQdwARg0FIAJBAWohAiABQX9qIgENAAwGCwsgBiEBIAchAgJAQYCChAggBygAACIIQaLEiJECc2sgCHJBgIGChHhxQYCBgoR4Rw0AIAYhASAHIQJBgIKECCAIQdy48eIFc2sgCHJBgIGChHhxQYCBgoR4Rw0AIAdBfHFBBGoiAiAEIANqIgFBfGoiBEsNAwNAQYCChAggAigCACIDQaLEiJECc2sgA3JBgIGChHhxQYCBgoR4Rw0EQYCChAggA0HcuPHiBXNrIANyQYCBgoR4cUGAgYKEeEcNBCACQQRqIgIgBE0NAAwECwsDQCACLQAAIgNBIkYNBCADQdwARg0EIAJBAWohAiABQX9qIgENAAwFCwsgBUEgSQ0EIARBAWohBUEAIAMgAkEBaiIEayIGQfj///8HcWshAwNAAkAgAw0AIAAgBkF4cSAEajYCCCAAEPSAgIAADwsgBSACaiEBIAJBCGohAiADQQhqIQMgASkAACIJQn+FIAlCosSIkaLEiJEihUL//fv379+//358IAlC4L///v379+9ffIQgCULcuPHixYuXrtwAhUL//fv379+//358hINCgIGChIiQoMCAf4MiCVANAAsgACAJeqdBA3YgAmpBeWo2AggPCyACIAMjgYCAgABByNbBgABqEMGCgIAAAAsgAiABTw0BA0AgAi0AACIDQSJGDQEgA0HcAEYNASACQQFqIgIgAUcNAAwCCwsgAiAHayEGCyAAIAYgBWo2AggLC1MBBH8CQCAAKAIIIgEgACgCBCICTw0AIAAoAgAhAwNAIAMgAWotAAAiBEEiRg0BIARB3ABGDQEgBEEgSQ0BIAAgAUEBaiIBNgIIIAIgAUcNAAsLC8QFAQZ/I4CAgIAAQSBrIgEkgICAgAAgAEEBEPOAgIAAAkACQAJAAkACQCAAKAIIIgIgACgCBCIDRg0AA0AgAiADTw0CAkAgACgCACIEIAJqLQAAIgVB3ABGDQACQCAFQSJGDQAgAUEQNgIUIAAgAUEUahDtgICAACEADAcLIAAgAkEBajYCCEEAIQAMBgsgACACQQFqIgU2AggCQAJAIAUgA08NACAAIAJBAmoiBjYCCCAEIAVqLQAAIQIMAQsgAUEENgIUIAFBDGogACABQRRqEOyAgIAAIAEtAAwNBCABLQANIQIgBSEGCwJAAkACQCACQf8BcUFeag5UAgAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAIAAAACAAAAAAAAAAIAAAACAAIBAAsgAUEMNgIUIAAgAUEUahDtgICAACEADAcLIAMgBkkNBQJAAkAgAyAGa0EDSw0AIAAgAzYCCCABQQQ2AhQgAUEMaiAAIAFBFGoQ74CAgAAMAQsgACAGQQRqNgIIAkAjgYCAgAAiA0HensCAAGoiBSAEIAZqIgItAAFBAXRqLwEAIANB3qLAgABqIgMgAi0AAEEBdGovAQByIAMgAi0AAkEBdGovAQByIAUgAi0AA0EBdGovAQBywUEASA0AIAFBADsBDAwBCyABQQw2AhQgAUEMaiAAIAFBFGoQ74CAgAALIAEvAQxBAUcNACABKAIQIQAMBgsgAEEBEPOAgIAAIAAoAggiAiAAKAIEIgNHDQALCyABQQQ2AhQgACABQRRqEO2AgIAAIQAMAwsgAiADI4GAgIAAQbjXwYAAahDBgoCAAAALIAEoAhAhAAwBCyAGIAMgAyOBgICAAEHI18GAAGoQx4KAgAAACyABQSBqJICAgIAAIAALYQECfyOAgICAAEEQayICJICAgIAAIAJBCGogASgCACABKAIEIgMgASgCCEEBaiIBIAMgASADSRsQ8YCAgAAgAigCDCEBIAAgAigCCDYCACAAIAE2AgQgAkEQaiSAgICAAAtSAQF/I4CAgIAAQRBrIgIkgICAgAAgAkEIaiABKAIAIAEoAgQgASgCCBDxgICAACACKAIMIQEgACACKAIINgIAIAAgATYCBCACQRBqJICAgIAAC7UGAQZ/I4CAgIAAQSBrIgMkgICAgAACQAJAAkACQAJAAkADQCABKAIIIQQgAUEBEPOAgIAAIAEoAggiBSABKAIEIgZGDQEgBSAGTw0CAkAgASgCACIHIAVqLQAAIghB3ABGDQACQCAIQSJGDQAgASAFQQFqNgIIIANBEDYCFCAAIAEgA0EUahDwgICAAAwICwJAIAIoAggiCEUNAAJAAkAgBSAESQ0AAkAgBSAEayIGIAIoAgAgCGtNDQAgAiAIIAZBAUEBEIuBgIAAIAIoAgghCAsCQCAGRQ0AIAIoAgQgCGogByAEaiAG/AoAAAsgASAFQQFqNgIIIAIgCCAGaiIFNgIIIANBCGogAigCBCAFEMCCgIAAAkAgAygCCA0AIAMoAhAhBSADKAIMIQEMCgsgA0EPNgIUIAMgASADQRRqEPKAgIAAIAMoAgAiAUUNASADKAIEIQUMCQsgBCAFIAYjgYCAgABB6NbBgABqEMeCgIAAAAsgACADKAIENgIEIABBAjYCAAwICwJAAkAgBSAESQ0AIAEgBUEBajYCCCADQQhqIAcgBGogBSAEaxDAgoCAAAJAIAMoAggNACADKAIQIQUgAygCDCEBDAgLIANBDzYCFCADIAEgA0EUahDygICAACADKAIAIgFFDQEgAygCBCEFDAcLIAQgBSAGI4GAgIAAQfjWwYAAahDHgoCAAAALIAAgAygCBDYCBCAAQQI2AgAMBwsgBSAESQ0DAkAgBSAEayIGIAIoAgAgAigCCCIIa00NACACIAggBkEBQQEQi4GAgAAgAigCCCEICwJAIAZFDQAgAigCBCAIaiAHIARqIAb8CgAACyABIAVBAWo2AgggAiAIIAZqNgIIIAFBASACEOuAgIAAIgVFDQALIABBAjYCACAAIAU2AgQMBQsgA0EENgIUIAAgASADQRRqEPCAgIAADAQLIAUgBiOBgICAAEHY1sGAAGoQwYKAgAAACyAEIAUgBiOBgICAAEGI18GAAGoQx4KAgAAACyAAIAU2AgggACABNgIEIABBADYCAAwBCyAAIAU2AgggACABNgIEIABBATYCAAsgA0EgaiSAgICAAAv/DgINfwF+I4CAgIAAQdAAayIBJICAgIAAI4GAgIAAIQIgAUEQaiAAKAIEIgMgACgCCCIEIAJB3qbAgABqQQkQ3YKAgAACQAJAAkACQCABKAIQQQFHDQAgAUEYaiECIAEoAkwhBSABKAJIIQYgASgCRCEHIAEoAkAhCCABKAI0QX9GDQEgAUEEaiACIAggByAGIAVBABD6gICAAAwCC0EAIQICQCABLQAeDQAgAS0AHSEFAkACQCABKAIYIgJFDQAgASgCQCEGAkACQCACIAEoAkQiCEkNACACIAhGDQEMBwsgBiACaiwAAEFASA0GCwJAIAYgAmoiCUF/aiwAACIHQX9KDQACQAJAIAlBfmotAAAiCsAiC0G/f0wNACAKQR9xIQkMAQsCQAJAIAlBfWotAAAiCsAiDEG/f0wNACAKQQ9xIQkMAQsgCUF8ai0AAEEHcUEGdCAMQT9xciEJCyAJQQZ0IAtBP3FyIQkLIAlBBnQgB0E/cXIhBwsgBUEBcQ0BAkACQCAHQYABTw0AQX8hBQwBCwJAIAdBgBBPDQBBfiEFDAELQX1BfCAHQYCABEkbIQULAkAgBSACaiICDQBBACECDAILAkACQCACIAhJDQAgAiAIRw0HDAELIAYgAmosAABBQEgNBgsgBiACaiIFQX9qLAAAQX9KDQEgBUF+aiwAAEG/f0oaDAELQQAhAiAFQQFxRQ0BCyABIAI2AghBASECCyABIAI2AgQMAQsgAUEEaiACIAggByAGIAVBARD6gICAAAsCQAJAAkACQAJAAkAgASgCBEEBRw0AIAEoAggiCUEJaiIIIQIDQAJAIAJFDQACQCACIARJDQAgBCACRg0BDAgLIAMgAmosAABBQEgNBwsCQAJAAkAgBCACRw0AIAQhBwwBCyADIAJqLQAAQVBqQf8BcUEKSQ0BIAIhBwsgAkUNAwJAAkAgBCAHSw0AIAQgB0cNAQwFCyADIAdqLAAAQb9/Sg0ECyADIAQgByAEI4GAgIAAQejXwYAAahCxgoCAAAALIAJBAWohAgwACwtBACEGDAELQQAhBiAEIAdrQQhJDQAgAyAHaiIKKQAAQqDGvePWrpu3IFINACAHQQhqIgshBQJAAkACQANAAkAgBUUNAAJAIAUgBEkNACAEIAVGDQEMCAsgAyAFaiwAAEFASA0HCwJAAkACQAJAIAQgBUcNACAEIQwMAQsgAyAFai0AAEFQakH/AXFBCkkNASAFIQwgBSAESQ0HCyAHIAhJDQECQCAIRQ0AIAMgCGosAABBQEgNAgsCQCACRQ0AIAosAABBQEgNAgsgAyAIaiECAkACQAJAIAcgCGsiCg4CCQABCyACLQAAIg1BVWoOAwkBCQELIAItAAAhDQsgAiANQf8BcUErRiIHaiECIAogB2siCEEJSQ0DQQAhBwNAIAhFDQUgAi0AAEFQaiIKQQlLDQYgB61CCn4iDkIgiKcNBiACQQFqIQIgCEF/aiEIIAogDqdqIgcgCk8NAAwGCwsgBUEBaiEFDAELCyADIAQgCCAHI4GAgIAAQYjYwYAAahCxgoCAAAALAkAgCA0AQQAhBwwBC0EAIQcDQCACLQAAQVBqIgpBCUsNAiACQQFqIQIgCiAHQQpsaiEHIAhBf2oiCA0ACwsCQCAMIAtJDQACQCALRQ0AAkAgCyAESQ0AIAsgBEYNAQwCCyADIAtqLAAAQUBIDQELAkAgBUUNACAMIARHDQELIAMgC2ohAgJAAkACQCAMIAtrIgUOAgUAAQsgAi0AACIKQVVqDgMFAQUBCyACLQAAIQoLIAIgCkH/AXFBK0YiBmohAgJAAkAgBSAGayIFQQlJDQBBACEIA0AgBUUNAkEAIQYgAi0AAEFQaiIKQQlLDQUgCK1CCn4iDkIgiKcNBSACQQFqIQIgBUF/aiEFIAogDqdqIgggCkkNBQwACwsCQCAFDQBBACEIDAELQQAhBkEAIQgDQCACLQAAQVBqIgpBCUsNBCACQQFqIQIgCiAIQQpsaiEIIAVBf2oiBQ0ACwtBASEGIAkgBEsNAwJAIAkNACAJIQQMBAsCQCAJIARJDQAgCSEEDAQLIAkhBCADIAlqLAAAQb9/Sg0DI4GAgIAAIgJBo6fAgABqQTAgAkGo2MGAAGoQyIKAgAAACyADIAQgCyAMI4GAgIAAQZjYwYAAahCxgoCAAAALQQAhBgwBCwsCQAJAAkACQCAAKAIAIgIgBEsNACADIQUMAQsCQCAEDQBBASEFIAMgAkEBEOaAgIAADAELIAMgAkEBIAQQ54CAgAAiBUUNAQsQ6YCAgABBFEEEEOWAgIAAIgJFDQEgAiAENgIIIAIgBTYCBCACQQA2AgAgAiAIQQAgBhs2AhAgAiAHQQAgBhs2AgwgAUHQAGokgICAgAAgAg8LQQEgBBCmgoCAAAALQQRBFBCdgoCAAAALIAMgBCAFIAQjgYCAgABB+NfBgABqELGCgIAAAAsgAyAEIAIgBCOBgICAAEHY18GAAGoQsYKAgAAACyAGIAhBACACI4GAgIAAQbDZwYAAahCxgoCAAAALwQQDB38BfgZ/AkAgASgCGCIHIAVrIgggA08NACABKAIMIgkgBSAJIAVLGyEKIARBf2ohCyABKAIgIQwgASgCECENIAEpAwAhDgNAAkACQAJAIA4gAiAIaiIPMQAAiEIBg1BFDQAgASAINgIYIAUhECAIIQcgBkUNAQwCCwJAAkACQAJAIAkgDCAJIAwgCUkbIAZBAXEbIhBBf2oiESAFTw0AIAsgEGohEkEAIBBrIREgECAIakF/aiEQA0AgEUUNAiAQIANPDQMgEUEBaiERIAIgEGohEyASLQAAIRQgEEF/aiEQIBJBf2ohEiAUIBMtAABGDQALIAcgCWsgEWshByAFIRAgBg0FDAQLIBANAgsgBSAMIAYbIhAgCSAQIAlLGyETIAkhEAJAAkACQANAIBMgEEYNASAKIBBGDQIgCCAQaiADTw0DIA8gEGohESAEIBBqIRIgEEEBaiEQIBItAAAgES0AAEYNAAsgByANayEHIA0hECAGRQ0FDAYLIAEgCDYCGAJAIAYNACABIAU2AiALIAAgBzYCCCAAIAg2AgQgAEEBNgIADwsgCiAFI4GAgIAAQfDYwYAAahDBgoCAAAALIAMgCCAJaiIQIAMgEEsbIAMjgYCAgABBgNnBgABqEMGCgIAAAAsgECADI4GAgIAAQaDZwYAAahDBgoCAAAALIBEgBSOBgICAAEGQ2cGAAGoQwYKAgAAACyABIBA2AiAgECEMCyAHIAVrIgggA0kNAAsLIAFBADYCGCAAQQA2AgALNgEBfxDpgICAAAJAQRRBBBDlgICAACIADQBBBEEUEJ2CgIAAAAsgAEIANwIMIABBATYCACAAC1ABAX8Q6YCAgAACQEEUQQQQ5YCAgAAiAw0AQQRBFBCdgoCAAAALIAMgAjYCECADIAE2AgwgAyAAKQIANwIAIANBCGogAEEIaigCADYCACADCyABAX8CQCAAKAIAIgFFDQAgACgCBCABQQEQ5oCAgAALCxkAIAEjgYCAgABBnqfAgABqQQUQ1IKAgAALFAAgACgCBCAAKAIIIAEQr4KAgAALqQIBBn8gACgCCCECAkACQCABQYABTw0AQQEhAwwBCwJAIAFBgBBPDQBBAiEDDAELQQNBBCABQYCABEkbIQMLIAIhBAJAIAMgACgCACACa00NACAAIAIgA0EBQQEQi4GAgAAgACgCCCEECyAAKAIEIARqIQQCQAJAAkAgAUGAAUkNACABQT9xQYB/ciEFIAFBBnYhBiABQYAQSQ0BIAFBDHYhByAGQT9xQYB/ciEGAkAgAUGAgARJDQAgBCAFOgADIAQgBjoAAiAEIAdBP3FBgH9yOgABIAQgAUESdkFwcjoAAAwDCyAEIAU6AAIgBCAGOgABIAQgB0HgAXI6AAAMAgsgBCABOgAADAELIAQgBToAASAEIAZBwAFyOgAACyAAIAMgAmo2AghBAAtUAQF/AkAgAiAAKAIAIAAoAggiA2tNDQAgACADIAJBAUEBEIuBgIAAIAAoAgghAwsCQCACRQ0AIAAoAgQgA2ogASAC/AoAAAsgACADIAJqNgIIQQALzwICAX8BfiOAgICAAEHAAGsiAiSAgICAACAAKAIAIQAgAkEANgI8IAJCgICAgBA3AjQgAiOBgICAAEG42MGAAGo2AhwgAkKggICABjcCICACIAJBNGo2AhgCQCAAIAJBGGoQg4GAgAANACACQQhqQQhqIAJBNGpBCGooAgA2AgAgAiACKQI0NwMIIAIjhoCAgACtQiCGIgMgAEEQaq2ENwMoIAIgAyAAQQxqrYQ3AyAgAiOEgICAAEGYgICAAGqtQiCGIAJBCGqthDcDGCOBgICAACEAIAEoAgAgASgCBCAAQZCTwIAAaiACQRhqEK6CgIAAIQACQCACKAIIIgFFDQAgAigCDCABQQEQ5oCAgAALIAJBwABqJICAgIAAIAAPCyOBgICAACIAQeemwIAAakE3IAJBCGogAEHQ2MGAAGogAEHg2MGAAGoQ5IKAgAAAC7cFAAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAAoAgAOGQABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgACyABIAAoAgQgACgCCBDUgoCAAA8LIABBBGogARCSgYCAABoACyABI4GAgIAAQdOnwIAAakEYENSCgIAADwsgASOBgICAAEHrp8CAAGpBGxDUgoCAAA8LIAEjgYCAgABBhqjAgABqQRoQ1IKAgAAPCyABI4GAgIAAQaCowIAAakEZENSCgIAADwsgASOBgICAAEG5qMCAAGpBDBDUgoCAAA8LIAEjgYCAgABBxajAgABqQRMQ1IKAgAAPCyABI4GAgIAAQdiowIAAakETENSCgIAADwsgASOBgICAAEHrqMCAAGpBDhDUgoCAAA8LIAEjgYCAgABB+ajAgABqQQ4Q1IKAgAAPCyABI4GAgIAAQYepwIAAakEMENSCgIAADwsgASOBgICAAEGTqcCAAGpBDhDUgoCAAA8LIAEjgYCAgABBoanAgABqQQ4Q1IKAgAAPCyABI4GAgIAAQa+pwIAAakETENSCgIAADwsgASOBgICAAEHCqcCAAGpBGhDUgoCAAA8LIAEjgYCAgABB3KnAgABqQT4Q1IKAgAAPCyABI4GAgIAAQZqqwIAAakEUENSCgIAADwsgASOBgICAAEGuqsCAAGpBNBDUgoCAAA8LIAEjgYCAgABB4qrAgABqQSwQ1IKAgAAPCyABI4GAgIAAQY6rwIAAakEkENSCgIAADwsgASOBgICAAEGyq8CAAGpBDhDUgoCAAA8LIAEjgYCAgABBwKvAgABqQRMQ1IKAgAAPCyABI4GAgIAAQdOrwIAAakEcENSCgIAADwsgASOBgICAAEHvq8CAAGpBGBDUgoCAAAumAQIBfwF+I4CAgIAAQSBrIgIkgICAgAACQAJAIAAoAgAiACgCDEUNACACI4aAgIAArUIghiIDIABBEGqthDcDGCACIAMgAEEMaq2ENwMQIAIjioCAgACtQiCGIACthDcDCCOBgICAACEAIAEoAgAgASgCBCAAQbKCwIAAaiACQQhqEK6CgIAAIQAMAQsgACABEIOBgIAAIQALIAJBIGokgICAgAAgAAuaAQEBfyOAgICAAEEwayIDJICAgIAAIAMgAjYCDCADIAE2AgggA0EQakEIaiAAQQhqKQMANwMAIAMgACkDADcDECADI4SAgIAAQZqAgIAAaq1CIIYgA0EIaq2ENwMoIAMji4CAgACtQiCGIANBEGqthDcDICOBgICAAEG3hMCAAGogA0EgahCHgYCAACEAIANBMGokgICAgAAgAAvxAgQBfwF8AX4CfyOAgICAAEEwayICJICAgIAAAkACQAJAAkAgAC0AAEF9ag4FAQAAAAIACyACQRBqQQhqIABBCGopAwA3AwAgAiAAKQMANwMQIAJBEGogARCdgYCAACEADAILAkACQCAAKwMIIgO9IgRC////////////AINC//////////f/AFUNACADIAJBEGoQlIGAgAAgAkEQamshACACQRBqIQUMAQsjgYCAgAAiAEG4v8CAAGogAEG7v8CAAGogBEJ/VSIGGyAAQb+/wIAAaiAEQv////////8Hg1AiABshBUEDQQQgBhtBAyAAGyEACyACIAA2AgwgAiAFNgIIIAIjhICAgABBnICAgABqrUIghiACQQhqrYQ3AygjgYCAgAAhACABKAIAIAEoAgQgAEGjksCAAGogAkEoahCugoCAACEADAELIAEjgYCAgABBh6zAgABqQQQQ1IKAgAAhAAsgAkEw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IAEtAANBLkYiBA0AIAJBBEYNACABLQAEQS5GIgQNACACQQVGDQAgAS0ABUEuRiIEDQAgAkEGRg0AIAEtAAZBLkYhBAsgACAEIAAtAARyOgAEIAAoAgAgASACENSCgIAAIQIgA0EQaiSAgICAACACCxkAIAEjgYCAgABBiKPBgABqQQMQ1IKAgAALFAAgACgCACAAKAIEIAEQr4KAgAALGwAgACOBgICAAEH42cGAAGogASACEK6CgIAACxQAIAEgACgCACAAKAIEENSCgIAAC+MGAQF/I4CAgIAAQRBrIgIkgICAgAACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAALQAADhIAAQIDBAUGBwgJCgsMDQ4PEBEACyACIAAtAAE6AAAgAiOMgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABB1pLAgABqIAJBCGoQroKAgAAhAAwRCyACIAApAwg3AwAgAiOFgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABByJLAgABqIAJBCGoQroKAgAAhAAwQCyACIAApAwg3AwAgAiONgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABByJLAgABqIAJBCGoQroKAgAAhAAwPCyACIAArAwg5AwAgAiOOgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABBo5LAgABqIAJBCGoQroKAgAAhAAwOCyACIAAoAgQ2AgAgAiOPgICAAK1CIIYgAq2ENwMII4GAgIAAIQAgASgCACABKAIEIABBuJLAgABqIAJBCGoQroKAgAAhAAwNCyACIAApAgQ3AgAgAiOEgICAAEGpgICAAGqtQiCGIAKthDcDCCOBgICAACEAIAEoAgAgASgCBCAAQbmDwIAAaiACQQhqEK6CgIAAIQAMDAsgASOBgICAAEGLo8GAAGpBChDUgoCAACEADAsLIAEjgYCAgABBlaPBgABqQQoQ1IKAgAAhAAwKCyABI4GAgIAAQZ+jwYAAakEMENSCgIAAIQAMCQsgASOBgICAAEGro8GAAGpBDhDUgoCAACEADAgLIAEjgYCAgABBuaPBgABqQQgQ1IKAgAAhAAwHCyABI4GAgIAAQcGjwYAAakEDENSCgIAAIQAMBgsgASOBgICAAEHEo8GAAGpBBBDUgoCAACEADAULIAEjgYCAgABByKPBgABqQQwQ1IKAgAAhAAwECyABI4GAgIAAQdSjwYAAakEPENSCgIAAIQAMAwsgASOBgICAAEHjo8GAAGpBDRDUgoCAACEADAILIAEjgYCAgABB8KPBgABqQQ4Q1IKAgAAhAAwBCyABIAAoAgQgACgCCBDUgoCAACEACyACQRBqJICAgIAAIAAL/AEBAX8jgICAgABBEGsiAiSAgICAAAJAAkAgACkDAEL///////////8Ag0KAgICAgICA+P8AUw0AIAIjkICAgACtQiCGIACthDcDCCOBgICAACEAIAEoAgAgASgCBCAAQa+GwIAAaiACQQhqEK6CgIAAIQAMAQsgAkEAOgAEIAIgATYCACACI5CAgIAArUIghiAArYQ3AwgCQCACI4GAgIAAIgBB+NnBgABqIABBr4bAgABqIAJBCGoQroKAgAANAAJAIAItAAQNACABI4GAgIAAQf6jwYAAakECENSCgIAADQELQQAhAAwBC0EBIQALIAJBEGokgICAgAAgAAsWACAAIAIgASgCDBGAgICAAICAgIAACxkAIAEjgYCAgABBgKTBgABqQQkQ1IKAgAALGQAgASOBgICAAEGJpMGAAGpBCBDUgoCAAAsJABCpgYCAAAALhQEBAX8jgICAgABBIGsiAiSAgICAACACIAAgARCigYCAADYCBCACQgA3AwggAiORgICAAK1CIIYgAkEEaq2ENwMYIAJBEGogAkEIaiOBgICAAEGRlMCAAGogAkEYahCkgYCAACACLQAQIAIoAhQQpYGAgAAgAkEIahCmgYCAABCngYCAAAALiAIBAX8jgICAgABBEGsiBCSAgICAACAAQQQ6AAAgBCABNgIIIAQgACkCADcDACAEI4GAgIAAQdTawYAAaiACIAMQroKAgAAhAyAELQAAIQECQAJAAkAgA0UNACABQQRHDQEjgYCAgAAiBEG0pMGAAGpBrQEgBEGs2sGAAGoQvYKAgAAACyAEKAIEIQACQCABQQRLDQAgAUEDRw0CCyAAKAIAIQMCQCAAQQRqKAIAIgEoAgAiAkUNACADIAIRgYCAgACAgICAAAsCQCABKAIEIgJFDQAgAyACIAEoAggQ5oCAgAALIABBDEEEEOaAgIAADAELIAAgBCkD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QCAFIAUpAwg3AjgjmICAgAAiAigCBCAFQThqIAIoAggoAhQRhICAgACAgICAAAwBCyAFIAAgASgCFBGEgICAAICAgIAAIAUgBDoARSAFIAM6AEQgBSACNgJAIAUgBSkDADcCOCAFQThqENWBgIAACyOBgICAAEHQ58GAAGpBADoAACOYgICAACICIAIoAgBBf2o2AgACQCADDQAgBUIANwNIIAVBOGogBUHIAGojgYCAgABBianBgABqQdsAEKSBgIAAIAUtADggBSgCPBClgYCAACAFQcgAahCmgYCAAAwBCyAAIAEQo4GAgAAACxCngYCAAAALbQECfyOZgICAACIBIAEoAgAiAkEBajYCAEEAIQECQCACQQBIDQBBASEBI4GAgIAAQdDnwYAAai0AAA0AI4GAgIAAIgFB0OfBgABqIAA6AAAgAUHM58GAAGoiASABKAIAQQFqNgIAQQIhAQsgAQutAwEDfyOAgICAAEEwayIBJICAgIAAQQMhAgJAIAAtAA0NAEEBIQIjgYCAgABBzOfBgABqKAIAQQFLDQAQ0IGAgABB/wFxIQILIAEgAjoADyABIAAoAgg2AhAgASAAKAIAIAAoAgQQ1oGAgAAgASABKQMANwIUI4GAgIAAQaTnwYAAai0AACEAIAEgAUEPajYCJCABIAFBFGo2AiAgASABQRBqNgIcAkACQAJAIABFDQAjgYCAgAAiAEGk58GAAGpBAToAACAAQaDnwYAAaiICKAIAIQAgAkEANgIAIAANAQsgAUIANwMoIAFBHGogAUEoaiOBgICAAEHo28GAAGoQ14GAgAAgAUEoahCmgYCAAAwBCyOBgICAACECIAFBHGogAEEIahDOgYCAACIDQQRqIAJBsNzBgABqENeBgIAAIANBADoAACACQaTnwYAAakEBOgAAIAJBoOfBgABqIgMoAgAhAiADIAA2AgAgASACNgIsIAFBATYCKCACRQ0AIAIgAigCACIAQX9qNgIAIABBAUcNACABQShqQQRqEMGBgIAACyABQTBqJICAgIAAC/EBAgN/An4jgICAgABBEGsiAySAgICAACADIAEgAigCDCIEEYSAgIAAgICAgABBBCECIAEhBQJAAkAgAykDAELtuq22zYXU9eMAhSADKQMIQviCmb2V7sbFuX+FhFANACADIAEgBBGEgICAAICAgIAAIAMpAwghBiADKQMAIQcjgYCAgAAhAgJAIAdCp9inm8aCuao4hSAGQqCV0ou2oPv3FYWEQgBRDQAgAkH9qMGAAGohAUEMIQIMAgsgAUEEaiEFQQghAgsgASACaigCACECIAUoAgAhAQsgACACNgIEIAAgATYCACADQRBqJICAgIAAC8wCAwJ/AX4BfyOAgICAAEEgayIDJICAgIAAEM2BgIAAIQQgACkCACEFIAMgAjYCGCADIAE2AhQgAyAFNwIMAkACQCOagICAACgCACIGQQJLDQAgA0EMakEAENGBgIAADAELIAMgBkF4ajYCHCADQQxqIANBHGoQ0YGAgAALAkACQAJAAkAgACgCCC0AAA4EAAECAwALIANBDGogASACKAIkQQAQyIGAgAAgAy0ADCADKAIQEKWBgIAADAILIANBDGogASACKAIkQQEQyIGAgAAgAy0ADCADKAIQEKWBgIAADAELI4GAgIAAQdjcwYAAaiIALQAAIQYgAEEAOgAAIAZFDQAgA0EMaiABI4GAgIAAQd2nwYAAakGdASACKAIkEYKAgIAAgICAgAAgAy0ADCADKAIQEKWBgIAACyAEQQA6AAAgA0EgaiSAgICAAAscACAAKAIAIAEgACgCBCgCDBGAgICAAICAgIAACw8AIAAoAgAgARC4goCAAAuJAwEFfyOAgICAAEEQayICJICAgIAAIAJBADYCBAJAAkACQCABQYABSQ0AIAFBP3FBgH9yIQMgAUEGdiEEIAFBgBBJDQEgAUEMdiEFIARBP3FBgH9yIQQCQCABQYCABEkNACACIAM6AAcgAiAEOgAGIAIgBUE/cUGAf3I6AAUgAiABQRJ2QXByOgAEQQQhAQwDCyACIAM6AAYgAiAEOgAFIAIgBUHgAXI6AARBAyEBDAILIAIgAToABEEBIQEMAQsgAiADOgAFIAIgBEHAAXI6AARBAiEBCyACQQhqIAAoAgggAkEEaiABELiBgIAAAkAgAi0ACCIBQQRGDQAgACgCBCEEAkACQCAALQAAIgNBBEsNACADQQNHDQELIAQoAgAhBQJAIARBBGooAgAiAygCACIGRQ0AIAUgBhGBgICAAICAgIAACwJAIAMoAgQiBkUNACAFIAYgAygCCBDmgICAAAsgBEEMQQQQ5oCAgAALIAAgAikDCDcCAAsgAkEQaiSAgICAACAB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AAsbACAAI4GAgIAAQYjewYAAajYCBCAAIAE2AgALDAAgACABKQIANwMAC1sBAn8gASgCBCECIAEoAgAhAxDpgICAAAJAQQhBBBDlgICAACIBDQBBBEEIEJ2CgIAAAAsgASACNgIEIAEgAzYCACAAI4GAgIAAQYjewYAAajYCBCAAIAE2AgALxAECA38BfiOAgICAAEEgayICJICAgIAAAkAgASgCAEGAgICAeEcNACABKAIMIQMgAkEUakEIaiIEQQA2AgAgAkKAgICAEDcCFCACQRRqI4GAgIAAQezcwYAAaiADKAIAIgMoAgAgAygCBBCugoCAABogAkEIakEIaiAEKAIAIgM2AgAgAiACKQIUIgU3AwggAUEIaiADNgIAIAEgBTcCAAsgACABNgIAIAAjgYCAgABBmN7BgABqNgIEIAJBIGokgICAgAALtAICA38BfiOAgICAAEEwayICJICAgIAAAkAgASgCAEGAgICAeEcNACABKAIMIQMgAkEkakEIaiIEQQA2AgAgAkKAgICAEDcCJCACQSRqI4GAgIAAQezcwYAAaiADKAIAIgMoAgAgAygCBBCugoCAABogAkEYakEIaiAEKAIAIgM2AgAgAiACKQIkIgU3AxggAUEIaiADNgIAIAEgBTcCAAsgASkCACEFIAFCgICAgBA3AgAgAkEIakEIaiIDIAFBCGoiASgCADYCACABQQA2AgAgAiAFNwMIEOmAgIAAAkBBDEEEEOWAgIAAIgENAEEEQQwQnYKAgAAACyABIAIpAwg3AgAgAUEIaiADKAIANgIAIAAjgYCAgABBmN7BgABqNgIEIAAgATYCACACQTBqJICAgIAAC0cAAkACQAJAIAENACADRQ0BEOmAgIAAIAMgAhDlgICAACICDQEMAgsgACABIAIgAxDngICAACICRQ0BCyACDwsQx4GAgAAACwIAC1UBAX8jgICAgABBEGsiASSAgICAACABQQhqIAAgACgCAEEMEICCgIAAAkAgASgCCCIAQYGAgIB4Rg0AIAAgASgCDBCmgoCAAAALIAFBEGokgICAgAALTQEBfyOAgICAAEEQayICJICAgIAAIAEoAgAgAkEIahCEgICAACAAIAIoAgwiATYCCCAAIAIoAgg2AgQgACABNgIAIAJBEGokgICAgAALYQEBfyOAgICAAEEQayIEJICAgIAAIAEoAgAgAiADIARBBGoQhYCAgABBAiEBAkAgBC0ABEEBcUUNACAAIAQoAgw2AgQgBC0ACEEARyEBCyAAIAE2AgAgBEEQaiSAgICAAAsIABCGgICAAAukAQECfyOAgICAAEEQayIEJICAgIAAIARBBGogASgCACIFIAEoAgQgAkEBaiICIAVBAXQiBSACIAVLGyICQQQgAkEESxsiAiADEIGCgIAAAkACQCAEKAIEQQFHDQAgBCgCDCEBIAQoAgghAgwBCyAEKAIIIQMgASACNgIAIAEgAzYCBEGBgICAeCECCyAAIAE2AgQgACACNgIAIARBEGokgICAgAALugECAn8BfkEBIQVBBCEGAkACQCAEQQNqQfwAca0gA61+IgdCIIinRQ0AQQAhAwwBCwJAIAenIgNB/P///wdNDQBBACEDDAELAkACQAJAAkAgAUUNACACIAQgAWxBBCADEOeAgIAAIQYMAQsCQCADDQBBBCEGDAILEOmAgIAAIANBBBDlgICAACEGCyAGDQAgAEEENgIEDAELIAAgBjYCBEEAIQULQQghBgsgACAGaiADNgIAIAAgBTYCAAsKACAAEIOCgIAAC6MtAQt/I4CAgIAAQRBrIgEkgICAgAACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCOBgICAAEHk58GAAGooAhgiAg0AAkAjgYCAgABBvOvBgABqKAIAIgMNACOBgICAACIEQbzrwYAAaiIFQQA2AhQgBUJ/NwIMIAVCgICEgICAwAA3AgQgBEHk58GAAGpBADYCvAMgBSABQQhqQXBxQdiq1aoFcyIDNgIACyObgICAACEFI5yAgIAAIAVJDQEjm4CAgAAhBUEAIQIjnICAgAAgBWtB2QBJDQAjm4CAgAAhBCOcgICAACEGI4GAgIAAQeTnwYAAaiIFIAYgBGsiBjYCxAMgBSAENgLAAyAFIAQ2AhAgBSAGNgK0AyAFIAY2ArADIAUgAzYCJCAFQX82AiBBACEEA0AjgYCAgABB5OfBgABqIARqIgVBPGogBUEwaiIDNgIAIAMgBUEoaiIGNgIAIAVBNGogBjYCACAFQcQAaiAFQThqIgY2AgAgBiADNgIAIAVBzABqIAVBwABqIgM2AgAgAyAGNgIAIAVByABqIAM2AgAgBEEgaiIEQYACRw0ACyOcgICAACIDQUxqQTg2AgAjgYCAgAAiBEHk58GAAGoiBSAEQbzrwYAAaigCEDYCHCAFI5uAgIAAIgRBeCAEa0EPcSIGaiICNgIYIAUgAyAEayAGa0FIaiIENgIMIAIgBEEBcjYCBAsCQAJAIABB7AFLDQACQCOBgICAAEHk58GAAGooAgAiB0EQIABBE2pB8ANxIABBC0kbIgNBA3YiBHYiBUEDcUUNAAJAAkAjgYCAgABB5OfBgABqIAVBAXEgBHJBAXMiA0EDdGoiBEEoaiIFIAQoAjAiBCgCCCIGRw0AI4GAgIAAQeTnwYAAaiAHQX4gA3dxNgIADAELIAUgBjYCCCAGIAU2AgwLIARBCGohBSAEIANBA3QiA0EDcjYCBCAEIANqIgQgBCgCBEEBcjYCBAwOCyADI4GAgIAAQeTnwYAAaigCCCIITQ0BAkAgBUUNAAJAAkAjgYCAgABB5OfBgABqIAUgBHRBAiAEdCIFQQAgBWtycWgiBEEDdGoiBUEoaiIGIAUoAjAiBSgCCCIARw0AI4GAgIAAQeTnwYAAaiAHQX4gBHdxIgc2AgAMAQsgBiAANgIIIAAgBjYCDAsgBSADQQNyNgIEIAUgBEEDdCIEaiAEIANrIgY2AgAgBSADaiIAIAZBAXI2AgQCQCAIRQ0AI4GAgIAAQeTnwYAAaiIEIAhBeHFqQShqIQMgBCgCFCEEAkACQCAHQQEgCEEDdnQiCXENACOBgICAAEHk58GAAGogByAJcjYCACADIQkMAQsgAygCCCEJCyAJIAQ2AgwgAyAENgIIIAQgAzYCDCAEIAk2AggLIAVBCGohBSOBgICAAEHk58GAAGoiBCAANgIUIAQgBjYCCAwOCyOBgICAAEHk58GAAGooAgQiCkUNASOBgICAAEHk58GAAGogCmhBAnRqKAKwAiIAKAIEQXhxIANrIQQgACEGAkADQAJAIAYoAhAiBQ0AIAYoAhQiBUUNAgsgBSgCBEF4cSADayIGIAQgBiAESSIGGyEEIAUgACAGGyEAIAUhBgwACwsgACgCGCECAkAgACgCDCIFIABGDQAgACgCCCIGIAU2AgwgBSAGNgIIDA0LAkACQCAAKAIUIgZFDQAgAEEUaiEJDAELIAAoAhAiBkUNBCAAQRBqIQkLA0AgCSELIAYiBUEUaiEJIAUoAhQiBg0AIAVBEGohCSAFKAIQIgYNAAsgC0EANgIADAwLQX8hAyAAQb9/Sw0AIABBE2oiBEFwcSEDI4GAgIAAQeTnwYAAaigCBCIKRQ0AQQAhBUEfIQgCQCAAQez//wdLDQAgA0EmIARBCHZnIgRrdkEBcSAEQQF0a0E+aiEIC0EAIANrIQQCQAJAAkACQCOBgICAAEHk58GAAGogCEECdGooArACIgYNAEEAIQkMAQtBACEFIANBAEEZIAhBAXZrIAhBH0YbdCEAQQAhCQNAAkAgBigCBEF4cSADayIHIARPDQAgByEEIAYhCSAHDQBBACEEIAYhCSAGIQUMAwsgBSAGKAIUIgcgByAGIABBHXZBBHFqKAIQIgtGGyAFIAcbIQUgAEEBdCEAIAshBiALDQALCwJAIAUgCXINAEEAIQlBAiAIdCIFQQAgBWtyIApxIgVFDQMjgYCAgABB5OfBgABqIAVoQQJ0aigCsAIhBQsgBUUNAQsDQCAFKAIEQXhxIANrIgcgBEkhAAJAIAUoAhAiBg0AIAUoAhQhBgsgByAEIAAbIQQgBSAJIAAbIQkgBiEFIAYNAAsLIAlFDQAgBCOBgICAAEHk58GAAGooAgggA2tPDQAgCSgCGCELAkAgCSgCDCIFIAlGDQAgCSgCCCIGIAU2AgwgBSAGNgIIDAsLAkACQCAJKAIUIgZFDQAgCUEUaiEADAELIAkoAhAiBkUNBCAJQRBqIQALA0AgACEHIAYiBUEUaiEAIAUoAhQiBg0AIAVBEGohACAFKAIQIgYNAAsgB0EANgIADAoLAkAjgYCAgABB5OfBgABqKAIIIgUgA0kNACOBgICAAEHk58GAAGooAhQhBAJAAkAgBSADayIGQRBJDQAgBCADaiIAIAZBAXI2AgQgBCAFaiAGNgIAIAQgA0EDcjYCBAwBCyAEIAVBA3I2AgQgBCAFaiIFIAUoAgRBAXI2AgRBACEAQQAhBgsjgYCAgABB5OfBgABqIgUgBjYCCCAFIAA2AhQgBEEIaiEFDAwLAkAjgYCAgABB5OfBgABqKAIMIgAgA00NACACIANqIgUgACADayIEQQFyNgIEI4GAgIAAQeTnwYAAaiIGIAU2AhggBiAENgIMIAIgA0EDcjYCBCACQQhqIQUMDAsCQAJAI4GAgIAAQbzrwYAAaigCAEUNACOBgICAAEG868GAAGooAgghBAwBCyOBgICAACIEQbzrwYAAaiIFQQA2AhQgBUJ/NwIMIAVCgICEgICAwAA3AgQgBEHk58GAAGpBADYCvAMgBSABQQxqQXBxQdiq1aoFczYCAEGAgAQhBAtBACEFAkAgBCADQccAaiIIaiIHQQAgBGsiC3EiCSADSw0AI5KAgIAAQTA2AgAMDAsCQCOBgICAAEHk58GAAGooArgDIgRFDQACQCOBgICAAEHk58GAAGooArADIgYgCWoiCiAGTQ0AIAogBE0NAQsjkoCAgABBMDYCAAwMCyOBgICAAEHk58GAAGotALwDQQRxDQUCQAJAAkAgAkUNACOBgICAAEHk58GAAGpBwANqIQQDQAJAIAIgBCgCACIGSQ0AIAIgBiAEKAIEakkNAwsgBCgCCCIEDQALC0EAEJGCgIAAIgdBf0YNBiAJIQsCQCOBgICAAEG868GAAGooAgQiBEF/aiIGIAdxRQ0AIAkgB2sgBiAHakEAIARrcWohCwsjgYCAgAAhBCALIANNDQYgC0H+////B0sNBiAEQeTnwYAAaigCsAMhBAJAI4GAgIAAQeTnwYAAaigCuAMiBkUNACAEIAtqIgAgBE0NByAAIAZLDQcLIAsQkYKAgAAiBCAHRw0BDAgLIAcgAGsgC3EiC0H+////B0sNBSALEJGCgIAAIgcgBCgCACAEKAIEakYNBCAHIQQLAkAgCyADQcgAak8NACAEQX9GDQACQCAIIAtrI4GAgIAAQbzrwYAAaigCCCIGakEAIAZrcSIGQf7///8HTQ0AIAQhBwwICwJAIAYQkYKAgABBf0YNACAGIAtqIQsgBCEHDAgLQQAgC2sQkYKAgAAaDAULIAQhByAEQX9HDQYMBAsAC0EAIQUMCAtBACEFDAYLIAdBf0cNAgsjgYCAgABB5OfBgABqIgQgBCgCvANBBHI2ArwDCyAJQf7///8HSw0BIAkQkYKAgAAhB0EAEJGCgIAAIQQgB0F/Rg0BIARBf0YNASAHIARPDQEgBCAHayILIANBOGpNDQELI4GAgIAAQeTnwYAAaiIEIAQoArADIAtqIgY2ArADAkAgBiAEKAK0A00NACOBgICAAEHk58GAAGogBjYCtAMLAkACQAJAAkAjgYCAgABB5OfBgABqKAIYIgZFDQAjgYCAgABB5OfBgABqQcADaiEEA0AgByAEKAIAIgAgBCgCBCIJakYNAiAEKAIIIgQNAAwDCwsCQAJAI4GAgIAAQeTnwYAAaigCECIERQ0AIAcgBE8NAQsjgYCAgABB5OfBgABqIAc2AhALQQAhBiOBgICAACIAQeTnwYAAaiIEQQA2AswDIAQgCzYCxAMgBCAHNgLAAyAEQX82AiAgBCAAQbzrwYAAaigCADYCJANAI4GAgIAAQeTnwYAAaiAGaiIEQTxqIARBMGoiADYCACAAIARBKGoiCTYCACAEQTRqIAk2AgAgBEHEAGogBEE4aiIJNgIAIAkgADYCACAEQcwAaiAEQcAAaiIANgIAIAAgCTYCACAEQcgAaiAANgIAIAZBIGoiBkGAAkcNAAsgB0F4IAdrQQ9xIgRqIgYgC0FIaiIAIARrIglBAXI2AgQjgYCAgAAiC0Hk58GAAGoiBCALQbzrwYAAaigCEDYCHCAEIAk2AgwgBCAGNgIYIAcgAGpBODYCBAwCCyAGIAdPDQAgBiAASQ0AIAQoAgxBCHENACAGQXggBmtBD3EiB2oiAiOBgICAACIIQeTnwYAAaiIAKAIMIAtqIgogB2siB0EBcjYCBCAEIAkgC2o2AgQgACAIQbzrwYAAaigCEDYCHCAAIAI2AhggACAHNgIMIAYgCmpBODYCBAwBCwJAIAcjgYCAgABB5OfBgABqKAIQTw0AI4GAgIAAQeTnwYAAaiAHNgIQCyAHIAtqIQAjgYCAgABB5OfBgABqQcADaiEEAkACQANAIAQoAgAiCSAARg0BIAQoAggiBA0ADAILCyAELQAMQQhxRQ0DCyOBgICAAEHk58GAAGpBwANqIQQCQANAAkAgBiAEKAIAIgBJDQAgBiAAIAQoAgRqIgBJDQILIAQoAgghBAwACwsgB0F4IAdrQQ9xIgRqIgIgC0FIaiIJIARrIghBAXI2AgQgByAJakE4NgIEIAYgAEE3IABrQQ9xakFBaiIEIAQgBkEQakkbIglBIzYCBCOBgICAACIKQeTnwYAAaiIEIApBvOvBgABqKAIQNgIcIAQgCDYCDCAEIAI2AhggCUEQaiAEQcgDaiICKQIANwIAIAkgBCkCwAM3AgggBCAHNgLAAyAEQQA2AswDIAIgCUEIajYCACAEIAs2AsQDIAlBJGohBANAIARBBzYCACAEQQRqIgQgAEkNAAsgCSAGRg0AIAkgCSgCBEF+cTYCBCAJIAkgBmsiBzYCACAGIAdBAXI2AgQCQAJAIAdB/wFLDQAjgYCAgABB5OfBgABqIgAgB0F4cWpBKGohBAJAAkAgACgCACIAQQEgB0EDdnQiCXENACOBgICAAEHk58GAAGogACAJcjYCACAEIQAMAQsgBCgCCCEACyAAIAY2AgwgBCAGNgIIQQwhCUEIIQcMAQtBHyEEAkAgB0H///8HSw0AIAdBJiAHQQh2ZyIEa3ZBAXEgBEEBdGtBPmohBAsgBiAENgIcIAZCADcCECOBgICAAEHk58GAAGoiCSAEQQJ0akGwAmohAAJAAkACQCAJKAIEIglBASAEdCILcQ0AIAAgBjYCACOBgICAAEHk58GAAGogCSALcjYCBCAGIAA2AhgMAQsgB0EAQRkgBEEBdmsgBEEfRht0IQQgACgCACEJA0AgCSIAKAIEQXhxIAdGDQIgBEEddiEJIARBAXQhBCAAIAlBBHFqIgsoAhAiCQ0ACyALQRBqIAY2AgAgBiAANgIYC0EIIQlBDCEHIAYhACAGIQQMAQsgACgCCCEEIAAgBjYCCCAEIAY2AgwgBiAENgIIQQAhBEEYIQlBDCEHCyAGIAdqIAA2AgAgBiAJaiAENgIACyOBgICAAEHk58GAAGooAgwiBCADTQ0AI4GAgIAAQeTnwYAAaiIFKAIYIgYgA2oiACAEIANrIgRBAXI2AgQgBSAENgIMIAUgADYCGCAGIANBA3I2AgQgBkEIaiEFDAQLI5KAgIAAQTA2AgAMAwsgBCAHNgIAIAQgBCgCBCALajYCBCAHIAkgAxCEgoCAACEFDAILAkAgC0UNAAJAAkAgCSOBgICAAEHk58GAAGogCSgCHCIAQQJ0aiIGKAKwAkcNACAGQbACaiAFNgIAIAUNASOBgICAAEHk58GAAGogCkF+IAB3cSIKNgIEDAILAkACQCALKAIQIAlHDQAgCyAFNgIQDAELIAsgBTYCFAsgBUUNAQsgBSALNgIYAkAgCSgCECIGRQ0AIAUgBjYCECAGIAU2AhgLIAkoAhQiBkUNACAFIAY2AhQgBiAFNgIYCwJAAkAgBEEPSw0AIAkgBCADciIFQQNyNgIEIAkgBWoiBSAFKAIEQQFyNgIEDAELIAkgA2oiACAEQQFyNgIEIAkgA0EDcjYCBCAAIARqIAQ2AgACQCAEQf8BSw0AI4GAgIAAQeTnwYAAaiIDIARBeHFqQShqIQUCQAJAIAMoAgAiA0EBIARBA3Z0IgRxDQAjgYCAgABB5OfBgABqIAMgBHI2AgAgBSEEDAELIAUoAgghBAsgBCAANgIMIAUgADYCCCAAIAU2AgwgACAENgIIDAELQR8hBQJAIARB////B0sNACAEQSYgBEEIdmciBWt2QQFxIAVBAXRrQT5qIQULIAAgBTYCHCAAQgA3AhAjgYCAgABB5OfBgABqIAVBAnRqQbACaiEDAkAgCkEBIAV0IgZxDQAgAyAANgIAI4GAgIAAQeTnwYAAaiAKIAZyNgIEIAAgAzYCGCAAIAA2AgggACAANgIMDAELIARBAEEZIAVBAXZrIAVBH0YbdCEFIAMoAgAhBgJAA0AgBiIDKAIEQXhxIARGDQEgBUEddiEGIAVBAXQhBSADIAZBBHFqIgcoAhAiBg0ACyAHQRBqIAA2AgAgACADNgIYIAAgADYCDCAAIAA2AggMAQsgAygCCCIFIAA2AgwgAyAANgIIIABBADYCGCAAIAM2AgwgACAFNgIICyAJQQhqIQUMAQsCQCACRQ0AAkACQCAAI4GAgIAAQeTnwYAAaiAAKAIcIglBAnRqIgYoArACRw0AIAZBsAJqIAU2AgAgBQ0BI4GAgIAAQeTnwYAAaiAKQX4gCXdxNgIEDAILAkACQCACKAIQIABHDQAgAiAFNgIQDAELIAIgBTYCFAsgBUUNAQsgBSACNgIYAkAgACgCECIGRQ0AIAUgBjYCECAGIAU2AhgLIAAoAhQiBkUNACAFIAY2AhQgBiAFNgIYCwJAAkAgBEEPSw0AIAAgBCADciIFQQNyNgIEIAAgBWoiBSAFKAIEQQFyNgIEDAELIAAgA2oiBiAEQQFyNgIEIAAgA0EDcjYCBCAGIARqIAQ2AgACQCAIRQ0AI4GAgIAAQeTnwYAAaiIFIAhBeHFqQShqIQMgBSgCFCEFAkACQEEBIAhBA3Z0IgkgB3ENACOBgICAAEHk58GAAGogCSAHcjYCACADIQkMAQsgAygCCCEJCyAJIAU2AgwgAyAFNgIIIAUgAzYCDCAFIAk2AggLI4GAgIAAQeTnwYAAaiIFIAY2AhQgBSAENgIICyAAQQhqIQULIAFBEGokgICAgAAgBQvsCAEHfyAAQXggAGtBD3FqIgMgAkEDcjYCBCABQXggAWtBD3FqIgQgAyACaiIFayEAAkACQCAEI4GAgIAAQeTnwYAAaigCGEcNACOBgICAAEHk58GAAGoiAiAFNgIYIAIgAigCDCAAaiIANgIMIAUgAEEBcjYCBAwBCwJAIAQjgYCAgABB5OfBgABqKAIURw0AI4GAgIAAQeTnwYAAaiIBIAU2AhQgASABKAIIIABqIgI2AgggBSACQQFyNgIEIAUgAmogAjYCAAwBCwJAIAQoAgQiAUEDcUEBRw0AIAFBeHEhBiAEKAIMIQICQAJAIAFB/wFLDQACQCACIAQoAggiB0cNACOBgICAAEHk58GAAGoiAiACKAIAQX4gAUEDdndxNgIADAILIAIgBzYCCCAHIAI2AgwMAQsgBCgCGCEIAkACQCACIARGDQAgBCgCCCIBIAI2AgwgAiABNgIIDAELAkACQAJAIAQoAhQiAUUNACAEQRRqIQcMAQsgBCgCECIBRQ0BIARBEGohBwsDQCAHIQkgASICQRRqIQcgAigCFCIBDQAgAkEQaiEHIAIoAhAiAQ0ACyAJQQA2AgAMAQtBACECCyAIRQ0AAkACQCAEI4GAgIAAQeTnwYAAaiAEKAIcIgdBAnRqIgEoArACRw0AIAFBsAJqIAI2AgAgAg0BI4GAgIAAQeTnwYAAaiICIAIoAgRBfiAHd3E2AgQMAgsCQAJAIAgoAhAgBEcNACAIIAI2AhAMAQsgCCACNgIUCyACRQ0BCyACIAg2AhgCQCAEKAIQIgFFDQAgAiABNgIQIAEgAjYCGAsgBCgCFCIBRQ0AIAIgATYCFCABIAI2AhgLIAYgAGohACAEIAZqIgQoAgQhAQsgBCABQX5xNgIEIAUgAGogADYCACAFIABBAXI2AgQCQCAAQf8BSw0AI4GAgIAAQeTnwYAAaiIBIABBeHFqQShqIQICQAJAIAEoAgAiAUEBIABBA3Z0IgBxDQAjgYCAgABB5OfBgABqIAEgAHI2AgAgAiEADAELIAIoAgghAAsgACAFNgIMIAIgBTYCCCAFIAI2AgwgBSAANgIIDAELQR8hAgJAIABB////B0sNACAAQSYgAEEIdmciAmt2QQFxIAJBAXRrQT5qIQILIAUgAjYCHCAFQgA3AhAjgYCAgABB5OfBgABqIgcgAkECdGpBsAJqIQECQCAHKAIEIgdBASACdCIEcQ0AIAEgBTYCACOBgICAAEHk58GAAGogByAEcjYCBCAFIAE2AhggBSAFNgIIIAUgBTYCDAwBCyAAQQBBGSACQQF2ayACQR9GG3QhAiABKAIAIQcCQANAIAciASgCBEF4cSAARg0BIAJBHXYhByACQQF0IQIgASAHQQRxaiIEKAIQIgcNAAsgBEEQaiAFNgIAIAUgATYCGCAFIAU2AgwgBSAFNgIIDAELIAEoAggiAiAFNgIMIAEgBTYCCCAFQQA2AhggBSABNgIMIAUgAjYCCAsgA0EIagsKACAAEIaCgIAAC4IOAQh/AkAgAEUNACAAQXhqIgEgAEF8aigCACICQXhxIgBqIQMjgYCAgAAhBAJAIAJBAXENACACQQJxRQ0BIAEgASgCACIFayIBIARB5OfBgABqKAIQSQ0BIAUgAGohAAJAAkACQAJAIAEjgYCAgABB5OfBgABqKAIURg0AIAEoAgwhAgJAIAVB/wFLDQAgAiABKAIIIgRHDQIjgYCAgABB5OfBgABqIgIgAigCAEF+IAVBA3Z3cTYCAAwFCyABKAIYIQYCQCACIAFGDQAgASgCCCIEIAI2AgwgAiAENgIIDAQLAkACQCABKAIUIgRFDQAgAUEUaiEFDAELIAEoAhAiBEUNAyABQRBqIQULA0AgBSEHIAQiAkEUaiEFIAIoAhQiBA0AIAJBEGohBSACKAIQIgQNAAsgB0EANgIADAMLIAMoAgQiAkEDcUEDRw0DIAMgAkF+cTYCBCADIAA2AgAjgYCAgABB5OfBgABqIAA2AgggASAAQQFyNgIEDwsgAiAENgIIIAQgAjYCDAwCC0EAIQILIAZFDQACQAJAIAEjgYCAgABB5OfBgABqIAEoAhwiBUECdGoiBCgCsAJHDQAgBEGwAmogAjYCACACDQEjgYCAgABB5OfBgABqIgIgAigCBEF+IAV3cTYCBAwCCwJAAkAgBigCECABRw0AIAYgAjYCEAwBCyAGIAI2AhQLIAJFDQELIAIgBjYCGAJAIAEoAhAiBEUNACACIAQ2AhAgBCACNgIYCyABKAIUIgRFDQAgAiAENgIUIAQgAjYCGAsgASADTw0AIAMoAgQiBEEBcUUNAAJAAkACQAJAAkAgBEECcQ0AAkAgAyOBgICAAEHk58GAAGooAhhHDQAjgYCAgABB5OfBgABqIgIgATYCGCACIAIoAgwgAGoiADYCDCABIABBAXI2AgQgASACKAIURw0GI4GAgIAAQeTnwYAAaiIBQQA2AgggAUEANgIUDwsCQCADI4GAgIAAQeTnwYAAaigCFCIGRw0AI4GAgIAAQeTnwYAAaiICIAE2AhQgAiACKAIIIABqIgA2AgggASAAQQFyNgIEIAEgAGogADYCAA8LIARBeHEgAGohACADKAIMIQICQCAEQf8BSw0AAkAgAiADKAIIIgVHDQAjgYCAgABB5OfBgABqIgIgAigCAEF+IARBA3Z3cTYCAAwFCyACIAU2AgggBSACNgIMDAQLIAMoAhghCAJAIAIgA0YNACADKAIIIgQgAjYCDCACIAQ2AggMAwsCQAJAIAMoAhQiBEUNACADQRRqIQUMAQsgAygCECIERQ0CIANBEGohBQsDQCAFIQcgBCICQRRqIQUgAigCFCIEDQAgAkEQaiEFIAIoAhAiBA0ACyAHQQA2AgAMAgsgAyAEQX5xNgIEIAEgAGogADYCACABIABBAXI2AgQMAwtBACECCyAIRQ0AAkACQCADI4GAgIAAQeTnwYAAaiADKAIcIgVBAnRqIgQoArACRw0AIARBsAJqIAI2AgAgAg0BI4GAgIAAQeTnwYAAaiICIAIoAgRBfiAFd3E2AgQMAgsCQAJAIAgoAhAgA0cNACAIIAI2AhAMAQsgCCACNgIUCyACRQ0BCyACIAg2AhgCQCADKAIQIgRFDQAgAiAENgIQIAQgAjYCGAsgAygCFCIERQ0AIAIgBDYCFCAEIAI2AhgLIAEgAGogADYCACABIABBAXI2AgQgASAGRw0AI4GAgIAAQeTnwYAAaiAANgIIDwsCQCAAQf8BSw0AI4GAgIAAQeTnwYAAaiIEIABBeHFqQShqIQICQAJAIAQoAgAiBEEBIABBA3Z0IgBxDQAjgYCAgABB5OfBgABqIAQgAHI2AgAgAiEADAELIAIoAgghAAsgACABNgIMIAIgATYCCCABIAI2AgwgASAANgIIDwtBHyECAkAgAEH///8HSw0AIABBJiAAQQh2ZyICa3ZBAXEgAkEBdGtBPmohAgsgASACNgIcIAFCADcCECOBgICAAEHk58GAAGoiBCACQQJ0akGwAmohBQJAAkACQAJAIAQoAgQiBEEBIAJ0IgNxDQAgBSABNgIAI4GAgIAAQeTnwYAAaiAEIANyNgIEQQghAEEYIQIMAQsgAEEAQRkgAkEBdmsgAkEfRht0IQIgBSgCACEFA0AgBSIEKAIEQXhxIABGDQIgAkEddiEFIAJBAXQhAiAEIAVBBHFqIgMoAhAiBQ0ACyADQRBqIAE2AgBBCCEAQRghAiAEIQULIAEhBCABIQMMAQsgBCgCCCIFIAE2AgwgBCABNgIIQQAhA0EYIQBBCCECCyABIAJqIAU2AgAgASAENgIMIAEgAGogAzYCACOBgICAAEHk58GAAGoiASABKAIgQX9qIgFBfyABGzYCIAsLbAIBfwF+AkACQCAADQBBACECDAELIACtIAGtfiIDpyECIAEgAHJBgIAESQ0AQX8gAiADQiCIp0EARxshAgsCQCACEIOCgIAAIgBFDQAgAEF8ai0AAEEDcUUNACACRQ0AIABBACAC/AsACyAAC58JAQt/AkAgAA0AIAEQg4KAgAAPCwJAIAFBQEkNACOSgICAAEEwNgIAQQAPC0EQIAFBE2pBcHEgAUELSRshAiAAQXxqIgMoAgAiBEF4cSEFAkACQAJAIARBA3ENACACQYACSQ0BIAUgAk0NASAFIAJrI4GAgIAAQbzrwYAAaigCCEEBdE0NAgwBCyAAQXhqIgYgBWohBwJAIAUgAkkNACAFIAJrIgFBEEkNAiADIAIgBEEBcXJBAnI2AgAgBiACaiICIAFBA3I2AgQgByAHKAIEQQFyNgIEIAIgARCJgoCAACAADwsgBygCBCEIAkAgByOBgICAAEHk58GAAGooAhhHDQAjgYCAgABB5OfBgABqKAIMIAVqIgUgAk0NASADIAIgBEEBcXJBAnI2AgAjgYCAgABB5OfBgABqIgEgBiACaiIENgIYIAEgBSACayICNgIMIAQgAkEBcjYCBCAADwsCQCAHI4GAgIAAQeTnwYAAaigCFEcNACOBgICAAEHk58GAAGooAgggBWoiBSACSQ0BAkACQCAFIAJrIgFBEEkNACADIAIgBEEBcXJBAnI2AgAgBiACaiICIAFBAXI2AgQgBiAFaiIFIAE2AgAgBSAFKAIEQX5xNgIEDAELIAMgBEEBcSAFckECcjYCACAGIAVqIgEgASgCBEEBcjYCBEEAIQFBACECCyOBgICAAEHk58GAAGoiBSACNgIUIAUgATYCCCAADwsgCEECcQ0AIAhBeHEgBWoiCSACSQ0AIAkgAmshCiAHKAIMIQECQAJAIAhB/wFLDQACQCABIAcoAggiBUcNACOBgICAAEHk58GAAGoiASABKAIAQX4gCEEDdndxNgIADAILIAEgBTYCCCAFIAE2AgwMAQsgBygCGCELAkACQCABIAdGDQAgBygCCCIFIAE2AgwgASAFNgIIDAELAkACQAJAIAcoAhQiBUUNACAHQRRqIQgMAQsgBygCECIFRQ0BIAdBEGohCAsDQCAIIQwgBSIBQRRqIQggASgCFCIFDQAgAUEQaiEIIAEoAhAiBQ0ACyAMQQA2AgAMAQtBACEBCyALRQ0AAkACQCAHI4GAgIAAQeTnwYAAaiAHKAIcIghBAnRqIgUoArACRw0AIAVBsAJqIAE2AgAgAQ0BI4GAgIAAQeTnwYAAaiIBIAEoAgRBfiAId3E2AgQMAgsCQAJAIAsoAhAgB0cNACALIAE2AhAMAQsgCyABNgIUCyABRQ0BCyABIAs2AhgCQCAHKAIQIgVFDQAgASAFNgIQIAUgATYCGAsgBygCFCIFRQ0AIAEgBTYCFCAFIAE2AhgLAkAgCkEPSw0AIAMgBEEBcSAJckECcjYCACAGIAlqIgEgASgCBEEBcjYCBCAADwsgAyACIARBAXFyQQJyNgIAIAYgAmoiASAKQQNyNgIEIAYgCWoiAiACKAIEQQFyNgIEIAEgChCJgoCAACAADwsCQCABEIOCgIAAIgINAEEADwsCQEF8QXggAygCACIFQQNxGyAFQXhxaiIFIAEgBSABSRsiAUUNACACIAAgAfwKAAALIAAQhoKAgAAgAiEACyAAC5sNAQd/IAAgAWohAgJAAkAgACgCBCIDQQFxDQAgA0ECcUUNASAAKAIAIgQgAWohAQJAAkACQAJAIAAgBGsiACOBgICAAEHk58GAAGooAhRGDQAgACgCDCEDAkAgBEH/AUsNACADIAAoAggiBUcNAiOBgICAAEHk58GAAGoiAyADKAIAQX4gBEEDdndxNgIADAULIAAoAhghBgJAIAMgAEYNACAAKAIIIgQgAzYCDCADIAQ2AggMBAsCQAJAIAAoAhQiBEUNACAAQRRqIQUMAQsgACgCECIERQ0DIABBEGohBQsDQCAFIQcgBCIDQRRqIQUgAygCFCIEDQAgA0EQaiEFIAMoAhAiBA0ACyAHQQA2AgAMAwsgAigCBCIDQQNxQQNHDQMgAiADQX5xNgIEIAIgATYCACOBgICAAEHk58GAAGogATYCCCAAIAFBAXI2AgQPCyADIAU2AgggBSADNgIMDAILQQAhAwsgBkUNAAJAAkAgACOBgICAAEHk58GAAGogACgCHCIFQQJ0aiIEKAKwAkcNACAEQbACaiADNgIAIAMNASOBgICAAEHk58GAAGoiAyADKAIEQX4gBXdxNgIEDAILAkACQCAGKAIQIABHDQAgBiADNgIQDAELIAYgAzYCFAsgA0UNAQsgAyAGNgIYAkAgACgCECIERQ0AIAMgBDYCECAEIAM2AhgLIAAoAhQiBEUNACADIAQ2AhQgBCADNgIYCwJAAkACQAJAAkAgAigCBCIEQQJxDQACQCACI4GAgIAAQeTnwYAAaigCGEcNACOBgICAAEHk58GAAGoiAyAANgIYIAMgAygCDCABaiIBNgIMIAAgAUEBcjYCBCAAIAMoAhRHDQYjgYCAgABB5OfBgABqIgBBADYCCCAAQQA2AhQPCwJAIAIjgYCAgABB5OfBgABqKAIUIgZHDQAjgYCAgABB5OfBgABqIgMgADYCFCADIAMoAgggAWoiATYCCCAAIAFBAXI2AgQgACABaiABNgIADwsgBEF4cSABaiEBIAIoAgwhAwJAIARB/wFLDQACQCADIAIoAggiBUcNACOBgICAAEHk58GAAGoiAyADKAIAQX4gBEEDdndxNgIADAULIAMgBTYCCCAFIAM2AgwMBAsgAigCGCEIAkAgAyACRg0AIAIoAggiBCADNgIMIAMgBDYCCAwDCwJAAkAgAigCFCIERQ0AIAJBFGohBQwBCyACKAIQIgRFDQIgAkEQaiEFCwNAIAUhByAEIgNBFGohBSADKAIUIgQNACADQRBqIQUgAygCECIEDQALIAdBADYCAAwCCyACIARBfnE2AgQgACABaiABNgIAIAAgAUEBcjYCBAwDC0EAIQMLIAhFDQACQAJAIAIjgYCAgABB5OfBgABqIAIoAhwiBUECdGoiBCgCsAJHDQAgBEGwAmogAzYCACADDQEjgYCAgABB5OfBgABqIgMgAygCBEF+IAV3cTYCBAwCCwJAAkAgCCgCECACRw0AIAggAzYCEAwBCyAIIAM2AhQLIANFDQELIAMgCDYCGAJAIAIoAhAiBEUNACADIAQ2AhAgBCADNgIYCyACKAIUIgRFDQAgAyAENgIUIAQgAzYCGAsgACABaiABNgIAIAAgAUEBcjYCBCAAIAZHDQAjgYCAgABB5OfBgABqIAE2AggPCwJAIAFB/wFLDQAjgYCAgABB5OfBgABqIgQgAUF4cWpBKGohAwJAAkAgBCgCACIEQQEgAUEDdnQiAXENACOBgICAAEHk58GAAGogBCABcjYCACADIQEMAQsgAygCCCEBCyABIAA2AgwgAyAANgIIIAAgAzYCDCAAIAE2AggPC0EfIQMCQCABQf///wdLDQAgAUEmIAFBCHZnIgNrdkEBcSADQQF0a0E+aiEDCyAAIAM2AhwgAEIANwIQI4GAgIAAQeTnwYAAaiIFIANBAnRqQbACaiEEAkAgBSgCBCIFQQEgA3QiAnENACAEIAA2AgAjgYCAgABB5OfBgABqIAUgAnI2AgQgACAENgIYIAAgADYCCCAAIAA2AgwPCyABQQBBGSADQQF2ayADQR9GG3QhAyAEKAIAIQUCQANAIAUiBCgCBEF4cSABRg0BIANBHXYhBSADQQF0IQMgBCAFQQRxaiICKAIQIgUNAAsgAkEQaiAANgIAIAAgBDYCGCAAIAA2AgwgACAANgIIDwsgBCgCCCIBIAA2AgwgBCAANgIIIABBADYCGCAAIAQ2AgwgACABNgIICwt8AQJ/AkACQAJAIAFBEEcNACACEIOCgIAAIQEMAQtBHCEDIAFBBEkNASABQQNxDQEgAUECdiIEIARBf2pxDQECQCACQUAgAWtNDQBBMA8LIAFBECABQRBLGyACEIuCgIAAIQELAkAgAQ0AQTAPCyAAIAE2AgBBACEDCyADC60DAQV/AkACQCAAQRAgAEEQSxsiAiACQX9qcQ0AIAIhAAwBC0EgIQMDQCADIgBBAXQhAyAAIAJJDQALCwJAIAFBQCAAa0kNACOSgICAAEEwNgIAQQAPCwJAIABBECABQRNqQXBxIAFBC0kbIgFqQQxqEIOCgIAAIgMNAEEADwsgA0F4aiECAkACQCAAQX9qIANxDQAgAiEADAELIANBfGoiBCgCACIFQXhxIAMgAGpBf2pBACAAa3FBeGoiA0EAIAAgAyACa0EPSxtqIgAgAmsiA2shBgJAIAVBA3ENACAAIAY2AgQgACACKAIAIANqNgIADAELIAAgBiAAKAIEQQFxckECcjYCBCAAIAZqIgYgBigCBEEBcjYCBCAEIAMgBCgCAEEBcXJBAnI2AgAgAiADaiIGIAYoAgRBAXI2AgQgAiADEImCgIAACwJAIAAoAgQiA0EDcUUNACADQXhxIgIgAUEQak0NACAAIAEgA0EBcXJBAnI2AgQgACABaiIDIAIgAWsiAUEDcjYCBCAAIAJqIgIgAigCBEEBcjYCBCADIAEQiYKAgAALIABBCGoLKwEBfyOAgICAAEEQayIBJICAgIAAIAEgAEEARzoADyABQQ9qEJSCgIAAAAsgAAJAI4GAgIAAQaTfwYAAaigCAEF/Rw0AEI6CgIAACwv6AgEMfyOAgICAAEEQayIAJICAgIAAI4GAgIAAIQEgAEEIahCTgoCAAAJAAkACQCAAKAIMIgINACABQdjrwYAAaiEDDAELIAJBAWoiAUUNASABQQQQh4KAgAAhAyAAKAIIIQEgAyEEQQAhBQNAIAFBCGooAgAhBiABKAIAIQcgBCABQQxqKAIAIgggAUEEaigCACIJaiIKQQJqEIKCgIAAIgs2AgACQCALDQACQCAFRQ0AIAMhAQNAIAEoAgAQhYKAgAAgAUEEaiEBIAVBf2oiBQ0ACwsgAxCFgoCAAAwDCwJAIAlFDQAgCyAHIAn8CgAACyALIAlqIglBPToAAAJAIAhFDQAgCUEBaiAGIAj8CgAACyALIApqQQFqQQA6AAAgAUEQaiEBIARBBGohBCACIAVBAWoiBUcNAAsgAEEIahCSgoCAAAsjgYCAgABBpN/BgABqIAM2AgAgAEEQaiSAgICAAA8LIABBCGoQkoKAgABBxgAQjIKAgAAACwMAAAtqAQF/I4GAgIAAQajfwYAAaigCACECAkACQCAADQAgAhCagoCAACIADQEjkoCAgABBMDYCAEEADwsCQCABIAIQm4KAgABBAWpPDQAjkoCAgABBxAA2AgBBAA8LIAAgAhCZgoCAACEACyAAC04AAkAgAA0APwBBEHQPCwJAIABB//8DcQ0AIABBf0wNAAJAIABBEHZAACIAQX9HDQAjkoCAgABBMDYCAEF/DwsgAEEQdA8LEI+CgIAAAAulAQEFfwJAIAAoAgRFDQBBDCEBQQAhAgNAIAAoAgAgAWoiA0F0aiEEAkAgA0F4aiIFKAIARQ0AIAQoAgAQhYKAgAALIAVBADYCACAEQQA2AgAgA0F8aiEEAkAgAygCAEUNACAEKAIAEIWCgIAACyADQQA2AgAgBEEANgIAIAFBEGohASACQQFqIgIgACgCBCIDSQ0ACyADRQ0AIAAoAgAQhYKAgAALCzUBAX8jgICAgABBEGsiASSAgICAACABQQhqEIeAgIAAIAAgASkCCDcCACABQRBqJICAgIAACw4AIAAtAAAQiICAgAAAC5sBAQR/EI2CgIAAQQAhAQJAIABBPRCXgoCAACICIABGDQAgACACIABrIgNqLQAAIQIjnYCAgAAhBCACDQAgBCgCACIERQ0AIAQoAgAiAkUNACAEQQRqIQQCQANAAkAgACACIAMQnIKAgAANACACIANqIgItAABBPUYNAgsgBCgCACECIARBBGohBCACDQAMAgsLIAJBAWohAQsgAQtJAQN/QQAhAwJAIAJFDQACQANAIAAtAAAiBCABLQAAIgVHDQEgAUEBaiEBIABBAWohACACQX9qIgINAAwCCwsgBCAFayEDCyADC+wCAQN/AkACQAJAAkAgAUH/AXEiAkUNACAAQQNxRQ0CAkAgAC0AACIDDQAgAA8LIAMgAUH/AXFHDQEgAA8LIAAgABCbgoCAAGoPCwJAIABBAWoiA0EDcQ0AIAMhAAwBCyADLQAAIgRFDQEgBCABQf8BcUYNAQJAIABBAmoiA0EDcQ0AIAMhAAwBCyADLQAAIgRFDQEgBCABQf8BcUYNAQJAIABBA2oiA0EDcQ0AIAMhAAwBCyADLQAAIgRFDQEgBCABQf8BcUYNASAAQQRqIQALAkBBgIKECCAAKAIAIgNrIANyQYCBgoR4cUGAgYKEeEcNACACQYGChAhsIQIDQEGAgoQIIAMgAnMiA2sgA3JBgIGChHhxQYCBgoR4Rw0BQYCChAggAEEEaiIAKAIAIgNrIANyQYCBgoR4cUGAgYKEeEYNAAsLIABBf2ohAwNAIANBAWoiAy0AACIARQ0BIAAgAUH/AXFHDQALCyADC/oCAQJ/AkACQAJAIAEgAHNBA3FFDQAgAS0AACECDAELAkAgAUEDcUUNACAAIAEtAAAiAjoAAAJAIAINACAADwsgAEEBaiEDAkAgAUEBaiICQQNxDQAgAyEAIAIhAQwBCyADIAItAAAiAjoAACACRQ0CIABBAmohAwJAIAFBAmoiAkEDcQ0AIAMhACACIQEMAQsgAyACLQAAIgI6AAAgAkUNAiAAQQNqIQMCQCABQQNqIgJBA3ENACADIQAgAiEBDAELIAMgAi0AACICOgAAIAJFDQIgAEEEaiEAIAFBBGohAQtBgIKECCABKAIAIgJrIAJyQYCBgoR4cUGAgYKEeEcNAANAIAAgAjYCACAAQQRqIQBBgIKECCABQQRqIgEoAgAiAmsgAnJBgIGChHhxQYCBgoR4Rg0ACwsgACACOgAAAkAgAkH/AXENACAADwsgAUEBaiECIAAhAwNAIANBAWoiAyACLQAAIgA6AAAgAkEBaiECIAANAAsLIAMLDwAgACABEJiCgIAAGiAACzABAn8CQCAAEJuCgIAAQQFqIgEQgoKAgAAiAkUNACABRQ0AIAIgACAB/AoAAAsgAgvPAQEDfyAAIQECQAJAIABBA3FFDQACQCAALQAADQAgACAAaw8LIABBAWoiAUEDcUUNACABLQAARQ0BIABBAmoiAUEDcUUNACABLQAARQ0BIABBA2oiAUEDcUUNACABLQAARQ0BIABBBGoiAUEDcQ0BCyABQXxqIQIgAUF7aiEBA0AgAUEEaiEBQYCChAggAkEEaiICKAIAIgNrIANyQYCBgoR4cUGAgYKEeEYNAAsDQCABQQFqIQEgAi0AACEDIAJBAWohAiADDQALCyABIABrC4cBAQJ/AkAgAg0AQQAPCwJAAkAgAC0AACIDDQBBACEDDAELIABBAWohACACQX9qIQICQANAIANB/wFxIAEtAAAiBEcNASAERQ0BIAJBAEYNASACQX9qIQIgAUEBaiEBIAAtAAAhAyAAQQFqIQAgAw0AC0EAIQMLIANB/wFxIQMLIAMgAS0AAGsLDQAgASAAEK6BgIAAAAsUACAAKAIEIAAoAgggARCvgoCAAAsUACAAKAIEIAAoAgggARC2goCAAAsbACAAI4GAgIAAQazfwYAAaiABIAIQroKAgAALIAEBfwJAIAAoAgAiAUUNACAAKAIEIAFBARDmgICAAAsLGQAgASOBgICAAEHwqcGAAGpBBRDUgoCAAAulAgEGfyAAKAIIIQICQAJAIAFBgAFPDQBBASEDDAELAkAgAUGAEE8NAEECIQMMAQtBA0EEIAFBgIAESRshAwsgAiEEAkAgAyAAKAIAIAJrTQ0AIAAgAiADEKSCgIAAIAAoAgghBAsgACgCBCAEaiEEAkACQAJAIAFBgAFJDQAgAUE/cUGAf3IhBSABQQZ2IQYgAUGAEEkNASABQQx2IQcgBkE/cUGAf3IhBgJAIAFBgIAESQ0AIAQgBToAAyAEIAY6AAIgBCAHQT9xQYB/cjoAASAEIAFBEnZBcHI6AAAMAwsgBCAFOgACIAQgBjoAASAEIAdB4AFyOgAADAILIAQgAToAAAwBCyAEIAU6AAEgBCAGQcABcjoAAAsgACADIAJqNgIIQQALnwEBAX8jgICAgABBEGsiAySAgICAAAJAIAIgAWoiASACTw0AQQBBABCmgoCAAAALIANBBGogACgCACICIAAoAgQgASACQQF0IgIgASACSxsiAkEIIAJBCEsbIgIQqIKAgAACQCADKAIEQQFHDQAgAygCCCADKAIMEKaCgIAAAAsgAygCCCEBIAAgAjYCACAAIAE2AgQgA0EQaiSAgICAAAtQAQF/AkAgAiAAKAIAIAAoAggiA2tNDQAgACADIAIQpIKAgAAgACgCCCEDCwJAIAJFDQAgACgCBCADaiABIAL8CgAACyAAIAMgAmo2AghBAAscAAJAIABFDQAgACABEJ2CgIAAAAsQqoKAgAAAC+UBAQR/I4CAgIAAQRBrIgIkgICAgAACQAJAAkAgASgCACIDIAEoAggiBEcNACACQQRqIAQgASgCBCAEQQFqIgMQqIKAgAAgAigCBEEBRg0BIAEgAigCCDYCBAsgASgCBCIFIARqQQA6AAACQAJAIAMgBEEBaiIBSw0AIAUhBAwBCwJAIAENAEEBIQQgBSADQQEQ5oCAgAAMAQsgBSADQQEgARDngICAACIERQ0CCyAAIAE2AgQgACAENgIAIAJBEGokgICAgAAPCyACKAIIIAIoAgwQpoKAgAAAC0EBIAEQpoKAgAAAC5ABAAJAAkAgA0EATg0AQQEhAUEEIQJBACEDDAELAkACQAJAAkAgAUUNACACIAFBASADEOeAgIAAIQEMAQsCQCADDQBBASEBDAILEOmAgIAAIANBARDlgICAACEBCyABDQBBASEBIABBATYCBAwBCyAAIAE2AgRBACEBC0EIIQILIAAgAmogAzYCACAAIAE2AgAL0QMBBn8jgICAgABBEGsiAySAgICAAAJAAkACQAJAAkACQCACQQFxDQAgAS0AACIERQ0CQQAhBSABIQZBACEHA0AgBkEBaiEGAkACQCAEwEF/Sg0AAkAgBEH/AXFBgAFGDQAgBiAEQQNxQRh3IghBBXRBgICAgARxIAhBgICACHFBB3QgCEGAgICAAnFyckEddmogBEEBdkECcWogBEECdkECcWohBiAHRSAFciEFDAILIAcgBi8AACIEaiEHIAYgBGpBAmohBgwBCyAGIARB/wFxIgRqIQYgByAEaiEHCyAGLQAAIgQNAAtBACEEIAUgB0EQSXENAUEAIQggB0EBdCIEQQBODQEMBQsgAkEBdiEECyAEDQELQQEhBkEAIQQMAQsQ6YCAgABBASEIIARBARDlgICAACIGRQ0BCyADQQA2AgggAyAGNgIEIAMgBDYCAAJAIAMjgYCAgABBrN/BgABqIAEgAhCugoCAAEUNACOBgICAACIEQfWpwYAAakHWACADQQ9qIARBxN/BgABqIARB1N/BgABqEOSCgIAAAAsgACADKQIANwIAIABBCGogA0EIaigCADYCACADQRBqJICAgIAADwsgCCAEEKaCgIAAAAslAQF/I4GAgIAAIgBBy6rBgABqQSMgAEHk38GAAGoQvYKAgAAAC3sBA38jgICAgABBEGsiASSAgICAACABQQRqIAAoAgAiAiAAKAIEIAJBAXQiAkEIIAJBCEsbIgIQqIKAgAACQCABKAIEQQFHDQAgASgCCCABKAIMEKaCgIAAAAsgASgCCCEDIAAgAjYCACAAIAM2AgQgAUEQaiSAgICAAAu1AwEFfyOAgICAAEEgayIDJICAgIAAQQAhBAJAAkACQCACQQFqIgVBAEgNABDpgICAAEEBIQQgBUEBEOWAgIAAIgZFDQACQCACRQ0AIAYgASAC/AoAAAsCQCACQQdLDQACQCACDQBBACEHQQAhBAwECwJAIAEtAAANAEEBIQRBACEHDAQLQQEhBCACQQFGDQICQCABLQABDQBBASEHDAQLQQIhByACQQJGDQIgAS0AAkUNA0EDIQcgAkEDRg0CIAEtAANFDQNBBCEHIAJBBEYNAiABLQAERQ0DQQUhByACQQVGDQIgAS0ABUUNAyACIQdBACEEIAJBBkYNAyACQQYgAS0ABiIEGyEHIARFIQQMAwsgA0EIakEAIAEgAhDjgoCAACADKAIMIQcgAygCCCEEDAILIAQgBRCmgoCAAAALIAIhB0EAIQQLAkACQCAEQQFxRQ0AIAAgAjYCCCAAIAY2AgQgACAFNgIAIAAgBzYCDAwBCyADIAI2Ahwg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OgANIAAgAjoADCADQSBqJICAgIAACxMAIAAgASACIAMgBBDagoCAAAAL4wIBA38jgICAgABBEGsiAiSAgICAAAJAAkACQCABKAIIIgNBgICAEHENACADQYCAgCBxDQEgAUEBQQFBACACQQZqIAAoAgAgAkEGakEKELuCgIAAIgBqQQogAGsQvIKAgAAhAAwCCyAAKAIAIQBBACEDA0AgAkEGaiADakEHaiOBgICAAEGwssGAAGogAEEPcWotAAA6AAAgA0F/aiEDIABBD0shBCAAQQR2IQAgBA0ACyABQQEjgYCAgABBwLLBgABqQQIgAkEGaiADakEIakEAIANrELyCgIAAIQAMAQsgACgCACEAQQAhAwNAIAJBBmogA2pBB2ojgYCAgABBwrLBgABqIABBD3FqLQAAOgAAIANBf2ohAyAAQQ9LIQQgAEEEdiEAIAQNAAsgAUEBI4GAgIAAQcCywYAAakECIAJBBmogA2pBCGpBACADaxC8goCAACEACyACQRBqJICAgIAAIAALEgAgACgCACkDACABELSCgIAAC9QCAQN/I4CAgIAAQSBrIgIkgICAgAACQAJAAkAgASgCCCIDQYCAgBBxDQAgA0GAgIAgcQ0BIAFBAUEBQQAgAkEMaiAAIAJBDGpBFBDCgoCAACIDakEUIANrELyCgIAAIQMMAgtBACEDA0AgAkEMaiADakEPaiOBgICAAEGwssGAAGogAKdBD3FqLQAAOgAAIANBf2ohAyAAQg9WIQQgAEIEiCEAIAQNAAsgAUEBI4GAgIAAQcCywYAAakECIAJBDGogA2pBEGpBACADaxC8goCAACEDDAELQQAhAwNAIAJBDGogA2pBD2ojgYCAgABBwrLBgABqIACnQQ9xai0AADoAACADQX9qIQMgAEIPViEEIABCBIghACAEDQALIAFBASOBgICAAEHAssGAAGpBAiACQQxqIANqQRBqQQAgA2sQvIKAgAAhAwsgAkEgaiSAgICAACADCxwAIAAoAgAgASAAKAIEKAIMEYCAgIAAgICAgAALDgAgAiAAIAEQt4KAgAALswUBB38CQAJAIAAoAggiA0GAgIDAAXFFDQACQAJAIANBgICAgAFxDQACQCACQRBJDQAgASACENKCgIAAIQQMAgsCQCACDQBBACEEQQAhAgwCCyACQQNxIQUCQAJAIAJB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IMAAGENvbXBsaWFuY2UgVmV0bzogQW1vdW50IMAZIGV4Y2VlZHMgbGltaXQgdGhyZXNob2xkIMAAD2ludmFsaWQgbGVuZ3RoIMALLCBleHBlY3RlZCDAAA9pbnZhbGlkIHZhbHVlOiDACywgZXhwZWN0ZWQgwAAOaW52YWxpZCB0eXBlOiDACywgZXhwZWN0ZWQgwAAiRmFpbGVkIHRvIHBhcnNlIGV2YWx1YXRlIHJlcXVlc3Q6IMAAMUFwcHJvdmVyIEIgKENvbXBsaWFuY2UpOiBMaW1pdCBleGNlZWRlZCEgQW1vdW50OiDACSwgTGltaXQ6IMAAEGFzc2VydGlvbiBgbGVmdCDAFyByaWdodGAgZmFpbGVkCiAgbGVmdDogwAkKIHJpZ2h0OiDAABBhc3NlcnRpb24gYGxlZnQgwBAgcmlnaHRgIGZhaWxlZDogwAkKICBsZWZ0OiDACQogcmlnaHQ6IMAAwAI6IMAAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9hbGxvYy9zcmMvY29sbGVjdGlvbnMvYnRyZWUvbWFwL2VudHJ5LnJzAGxpYnJhcnkvY29yZS9zcmMvbnVtL2ZsdDJkZWMvc3RyYXRlZ3kvZ3Jpc3UucnMAbGlicmFyeS9hbGxvYy9zcmMvZm10LnJzAGxpYnJhcnkvY29yZS9zcmMvbnVtL2RpeV9mbG9hdC5ycwBsaWJyYXJ5L3N0ZC9zcmMvc3lzL3N5bmMvbXV0ZXgvbm9fdGhyZWFkcy5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9zZXJkZV9qc29uLTEuMC4xNTAvc3JjL2Vycm9yLnJzAC9ydXN0Yy8yNTRiNTk2MDdkNDQxN2U5ZGZmYmMzMDcxMzhhZTVjODYyODBmZTRjL2xpYnJhcnkvY29yZS9zcmMvc3RyL3BhdHRlcm4ucnMAbGlicmFyeS9jb3JlL3NyYy9udW0vZmx0MmRlYy9zdHJhdGVneS9kcmFnb24ucnMAbGlicmFyeS9jb3JlL3NyYy9udW0vYmlnbnVtLnJzAGxpYnJhcnkvY29yZS9zcmMvZm10L251bS5ycwBsaWJyYXJ5L3N0ZC9zcmMvc3lzL2lvL2lvX3NsaWNlL3dhc2kucnMAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9hbGxvYy9zcmMvc3RyaW5nLnJzAGxpYnJhcnkvc3RkL3NyYy9wYW5pY2tpbmcucnMAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9hbGxvYy9zcmMvY29sbGVjdGlvbnMvYnRyZWUvbmF2aWdhdGUucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvc2VyZGVfanNvbi0xLjAuMTUwL3NyYy9pby9jb3JlLnJzAGxpYnJhcnkvY29yZS9zcmMvdW5pY29kZS9wcmludGFibGUucnMAL3J1c3RjLzI1NGI1OTYwN2Q0NDE3ZTlkZmZiYzMwNzEzOGFlNWM4NjI4MGZlNGMvbGlicmFyeS9hbGxvYy9zcmMvY29sbGVjdGlvbnMvYnRyZWUvbm9kZS5ycwAvVXNlcnMvZWR5Y3UvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9zZXJkZV9qc29uLTEuMC4xNTAvc3JjL2RlLnJzAGxpYnJhcnkvY29yZS9zcmMvZm10L21vZC5ycwBsaWJyYXJ5L3N0ZC9zcmMvaW8vbW9kLnJzAGxpYnJhcnkvYWxsb2Mvc3JjL3Jhd192ZWMvbW9kLnJzAGxpYnJhcnkvY29yZS9zcmMvbnVtL2ZsdDJkZWMvbW9kLnJzAGxpYnJhcnkvc3RkL3NyYy90aHJlYWQvaWQucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvc2VyZGVfanNvbi0xLjAuMTUwL3NyYy9yZWFkLnJzAGxpYnJhcnkvc3RkL3NyYy9hbGxvYy5ycwBhcHByb3Zlci1iL3NyYy9saWIucnMAL1VzZXJzL2VkeWN1Ly5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvaXRvYS0xLjAuMTgvc3JjL2xpYi5ycwAVbWVtb3J5IGFsbG9jYXRpb24gb2YgwA0gYnl0ZXMgZmFpbGVkABBmbG9hdGluZyBwb2ludCBgwAFgAAtjaGFyYWN0ZXIgYMABYAAJaW50ZWdlciBgwAFgAAlib29sZWFuIGDAAWAAD21pc3NpbmcgZmllbGQgYMABYAARZHVwbGljYXRlIGZpZWxkIGDAAWAALwAGRXJyb3IowAgsIGxpbmU6IMAKLCBjb2x1bW46IMABKQAVbWVtb3J5IGFsbG9jYXRpb24gb2YgwEcgYnl0ZXMgZmFpbGVkCnNraXBwaW5nIGJhY2t0cmFjZSBwcmludGluZyB0byBhdm9pZCBwb3RlbnRpYWwgcmVjdXJzaW9uCgA1ZmF0YWwgcnVudGltZSBlcnJvcjogZmFpbGVkIHRvIGluaXRpYXRlIHBhbmljLCBlcnJvciDACywgYWJvcnRpbmcKABVtZW1vcnkgYWxsb2NhdGlvbiBvZiDADiBieXRlcyBmYWlsZWQKAAxwYW5pY2tlZCBhdCDAAjoKwDMKdGhyZWFkIHBhbmlja2VkIHdoaWxlIHByb2Nlc3NpbmcgcGFuaWMuIGFib3J0aW5nLgoACQp0aHJlYWQgJ8ADJyAowA4pIHBhbmlja2VkIGF0IMACOgrAAQoAGWFib3J0aW5nIGR1ZSB0byBwYW5pYyBhdCDAAjoKwAEKAHBpX2FwaV9icGlfY3B1YmxpY19pbnB1dHNzdHJ1Y3QgWmtQcm9vZkRhdGEgd2l0aCA0IGVsZW1lbnRzYW1vdW50c2FsdGxpbWl0cHJvb2Zmb3JjZV9wYWlyaW5nX2ZhaWxzdHJ1Y3QgRXZhbHVhdGVSZXF1ZXN0IHdpdGggNSBlbGVtZW50c2Fzc2VydGlvbiBmYWlsZWQ6IGVkZ2UuaGVpZ2h0ID09IHNlbGYuaGVpZ2h0IC0gMWFzc2VydGlvbiBmYWlsZWQ6IHNyYy5sZW4oKSA9PSBkc3QubGVuKClhc3NlcnRpb24gZmFpbGVkOiBlZGdlLmhlaWdodCA9PSBzZWxmLm5vZGUuaGVpZ2h0IC0gMWZhbHNlc3RydWN0IFprUHJvb2ZEYXRhc3RydWN0IEV2YWx1YXRlUmVxdWVzdGEgRGlzcGxheSBpbXBsZW1lbnRhdGlvbiByZXR1cm5lZCBhbiBlcnJvciB1bmV4cGVjdGVkbHlFcnJvck5vdCBpbXBsZW1lbnRlZCBpbiBhcHByb3Zlci1iQXBwcm92ZXIgQiAoQ29tcGxpYW5jZSk6IFJ1bm5pbmcgR3JvdGgxNiBaSy1TTkFSSyB2ZXJpZmllciBjaGVja3MuLi5ldmFsdWF0ZTogbWlzc2luZyBpbnB1dCBwYXlsb2FkRmFpbGVkIHRvIHBhcnNlIGxpbWl0X3RocmVzaG9sZCBwdWJsaWMgaW5wdXQAAABn5glqha5nu3Lzbjw69U+lf1IOUYxoBZur2YMfGc3gW0FwcHJvdmVyIEIgKENvbXBsaWFuY2UpOiBaSyBQcm9vZiB2ZXJpZmllZC4gTGltaXQgY2hlY2tzIHBhc3NlZC5zdGF0dXNhcHByb3ZlZHJlYXNvbkdyb3RoMTYgWkstU05BUksgdmVyaWZpY2F0aW9uIHN1Y2Nlc3NmdWxjYWxsZWQgYFJlc3VsdDo6dW53cmFwKClgIG9uIGFuIGBFcnJgIHZhbHVlQXBwcm92ZXIgQiAoQ29tcGxpYW5jZSk6IENvbXB1dGVkIGhhc2ggZG9lcyBub3QgbWF0Y2ggcHVibGljIGlucHV0cyFDb21wbGlhbmNlIEFib3J0OiBHcm90aDE2IFBhaXJpbmcgY2hlY2sgZmFpbHMgLSBoYXNoIG1pc21hdGNoQ29tcGxpYW5jZSBBYm9ydDogUHVibGljIGlucHV0cyBtdXN0IGNvbnRhaW4gYW1vdW50X2hhc2ggYW5kIGxpbWl0X3RocmVzaG9sZEFwcHJvdmVyIEIgKENvbXBsaWFuY2UpOiBHcm90aDE2IFBhaXJpbmcgY2hlY2sgZmFpbHMhQ29tcGxpYW5jZSBBYm9ydDogR3JvdGgxNiBQYWlyaW5nIGNoZWNrIGZhaWxzIC0gSW52YWxpZCBQcm9vZmEgc2VxdWVuY2UwMTIzNDU2Nzg5YWJjZGVmZmFsc2UA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAABAAIAAwAEAAUABgAHAAgACQD//////////////////woACwAMAA0ADgAPAP////////////////////////////////////////////////////////////////////8KAAsADAANAA4ADwD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AABAAIAAwAEAAUABgAHAAgACQAP//////////////////oACwAMAA0ADgAPAA/////////////////////////////////////////////////////////////////////6AAsADAANAA4ADwAP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////yBhdCBsaW5lIGEgRGlzcGxheSBpbXBsZW1lbnRhdGlvbiByZXR1cm5lZCBhbiBlcnJvciB1bmV4cGVjdGVkbHlFcnJvcmFzc2VydGlvbiBmYWlsZWQ6IHNlbGYuaXNfY2hhcl9ib3VuZGFyeShuZXdfbGVuKUVPRiB3aGlsZSBwYXJzaW5nIGEgbGlzdEVPRiB3aGlsZSBwYXJzaW5nIGFuIG9iamVjdEVPRiB3aGlsZSBwYXJzaW5nIGEgc3RyaW5nRU9GIHdoaWxlIHBhcnNpbmcgYSB2YWx1ZWV4cGVjdGVkIGA6YGV4cGVjdGVkIGAsYCBvciBgXWBleHBlY3RlZCBgLGAgb3IgYH1gZXhwZWN0ZWQgaWRlbnRleHBlY3RlZCB2YWx1ZWV4cGVjdGVkIGAiYGludmFsaWQgZXNjYXBlaW52YWxpZCBudW1iZXJudW1iZXIgb3V0IG9mIHJhbmdlaW52YWxpZCB1bmljb2RlIGNvZGUgcG9pbnRjb250cm9sIGNoYXJhY3RlciAoXHUwMDAwLVx1MDAxRikgZm91bmQgd2hpbGUgcGFyc2luZyBhIHN0cmluZ2tleSBtdXN0IGJlIGEgc3RyaW5naW52YWxpZCB2YWx1ZTogZXhwZWN0ZWQga2V5IHRvIGJlIGEgbnVtYmVyIGluIHF1b3Rlc2Zsb2F0IGtleSBtdXN0IGJlIGZpbml0ZSAoZ290IE5hTiBvciArLy1pbmYpbG9uZSBsZWFkaW5nIHN1cnJvZ2F0ZSBpbiBoZXggZXNjYXBldHJhaWxpbmcgY29tbWF0cmFpbGluZyBjaGFyYWN0ZXJzdW5leHBlY3RlZCBlbmQgb2YgaGV4IGVzY2FwZXJlY3Vyc2lvbiBsaW1pdCBleGNlZWRlZG51bGwAAAAAAAAAAAAAAPA/AAAAAAAAJEAAAAAAAABZQAAAAAAAQI9AAAAAAACIw0AAAAAAAGr4QAAAAACAhC5BAAAAANASY0EAAAAAhNeXQQAAAABlzc1BAAAAIF+gAkIAAADodkg3QgAAAKKUGm1CAABA5ZwwokIAAJAexLzWQgAANCb1awxDAIDgN3nDQUMAoNiFVzR2QwDITmdtwatDAD2RYORY4UNAjLV4Ha8VRFDv4tbkGktEktVNBs/wgET2SuHHAi21RLSd2XlDeOpE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NTM1NDU1NTY1NzU4NTk2MDYxNjI2MzY0NjU2NjY3Njg2OTcwNzE3MjczNzQ3NTc2Nzc3ODc5ODA4MTgyODM4NDg1ODY4Nzg4ODk5MDkxOTI5Mzk0OTU5Njk3OTg5OQMDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMBAgMEAQIDAQIDAQIDBAECAwECAwECAwQBAgMBAgMBAgMEAQIDAQIDAQID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b2xlIGJ1ZmZlcmFkdmFuY2luZyBJb1NsaWNlIGJleW9uZCBpdHMgbGVuZ3RoYWR2YW5jaW5nIGlvIHNsaWNlcyBiZXlvbmQgdGhlaXIgbGVuZ3RoZmlsZSBuYW1lIGNvbnRhaW5lZCBhbiB1bmV4cGVjdGVkIE5VTCBieXRlZmF0YWwgcnVudGltZSBlcnJvcjogcndsb2NrIGxvY2tlZCBmb3Igd3JpdGluZywgYWJvcnRpbmcKc3RhY2sgYmFja3RyYWNlOgpub3RlOiBTb21lIGRldGFpbHMgYXJlIG9taXR0ZWQsIHJ1biB3aXRoIGBSVVNUX0JBQ0tUUkFDRT1mdWxsYCBmb3IgYSB2ZXJib3NlIGJhY2t0cmFjZS4KY2Fubm90IHJlY3Vyc2l2ZWx5IGFjcXVpcmUgbXV0ZXgAbm90ZTogcnVuIHdpdGggYFJVU1RfQkFDS1RSQUNFPTFgIGVudmlyb25tZW50IHZhcmlhYmxlIHRvIGRpc3BsYXkgYSBiYWNrdHJhY2UKUlVTVF9CQUNLVFJBQ0VmYWlsZWQgdG8gZ2VuZXJhdGUgdW5pcXVlIHRocmVhZCBJRDogYml0c3BhY2UgZXhoYXVzdGVkbWFpbjx1bm5hbWVkPkJveDxkeW4gQW55PnRocmVhZCBjYXVzZWQgbm9uLXVud2luZGluZyBwYW5pYy4gYWJvcnRpbmcuCmRlc2NyaXB0aW9uKCkgaXMgZGVwcmVjYXRlZDsgdXNlIERpc3BsYXkAAM+/4iyjW9q7AXp3pB7CsSdFcnJvcmEgZm9ybWF0dGluZyB0cmFpdCBpbXBsZW1lbnRhdGlvbiByZXR1cm5lZCBhbiBlcnJvciB3aGVuIHRoZSB1bmRlcmx5aW5nIHN0cmVhbSBkaWQgbm90Y2FwYWNpdHkgb3ZlcmZsb3cAcAAHAC0BAQECAQIBAUgLMBUQAWUHAgYCAgEEIwEeG1sLOgkJARgEAQkBAwEFKwM7CSoYASA3AQEBBAgEAQMHCgIdAToBAQECBAgBCQEKAhoBAgI5AQQCBAICAwMBHgIDAQsCOQEEBQECBAEUAhYGAQE6AQECAQQIAQcDCgIeATsBAQEMAQkBKAEDATcBAQMFAwEEBwILAh0BOgECAgEBAwMBBAcCCwIcAjkCAQECBAgBCQEKAh0BSAEEAQIDAQEIAVEB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AHcBAAAvAAAA2wQQAC8AAABmAQAADQAAANsEEAAvAAAATAEAACIAAADbBBAALwAAAHYAAAAFAAAA2wQQAC8AAAB3AAAABQAAANsEEAAvAAAAeAAAAAUAAADbBBAALwAAAHkAAAAFAAAA2wQQAC8AAAB6AAAABQAAANsEEAAvAAAAewAAAAUAAADbBBAALwAAAMIAAAAJAAAA2wQQAC8AAAD7AAAADQAAANsEEAAvAAAAAgEAABIAAADaAxAAIQAAAC4AAAAJAAAAuwQQAB8AAABmBgAAFQAAALsEEAAfAAAAlAYAABUAAAC7BBAAHwAAAJUGAAAVAAAAuwQQAB8AAABzBQAAKAAAALsEEAAfAAAAcwUAABIAAACbBhAAJQAAABoAAAA2AAAAmwYQACUAAAAKAAAAKwAAAAAAAAAEAAAABAAAAHEAAAAJaRAAC2kQAA1pEAAAmvoBBG5hbWUAEA9hcHByb3Zlcl9iLndhc20BjOQB6QIATl9aTjEwYXBwcm92ZXJfYjRob3N0MTBpbnRlcmZhY2VzN2xvZ2dpbmc0aW5mbzExd2l0X2ltcG9ydDIxN2g3MmE5YmY0OTZiZWFmNGQ4RQFPX1pOMTBhcHByb3Zlcl9iNGhvc3QxMGludGVyZmFjZXM3bG9nZ2luZzVlcnJvcjExd2l0X2ltcG9ydDIxN2g5ZDBiYTFiZjlkNDk0MmZiRQJ9X1pOOTBfJExUJHdhc2kuLmltcG9ydHMuLndhc2kuLmlvLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCR3YXNpLi5pbXBvcnRzLi5fcnQuLldhc21SZXNvdXJjZSRHVCQ0ZHJvcDRkcm9wMTdoZmZjNTk5NjhmMWU3NTQ5ZEUDhgFfWk45OV8kTFQkd2FzaS4uaW1wb3J0cy4ud2FzaS4uaW8uLnN0cmVhbXMuLk91dHB1dFN0cmVhbSR1MjAkYXMkdTIwJHdhc2kuLmltcG9ydHMuLl9ydC4uV2FzbVJlc291cmNlJEdUJDRkcm9wNGRyb3AxN2gwMDBiNDEzNjFmMmM4ZmIyRQRWX1pONHdhc2k3aW1wb3J0czR3YXNpMmlvNWVycm9yNUVycm9yMTV0b19kZWJ1Z19zdHJpbmcxMXdpdF9pbXBvcnQxMTdoZjVjYzBkOGVlZDgzMWI4YkUFaV9aTjR3YXNpN2ltcG9ydHM0d2FzaTJpbzdzdHJlYW1zMTJPdXRwdXRTdHJlYW0yNGJsb2NraW5nX3dyaXRlX2FuZF9mbHVzaDExd2l0X2ltcG9ydDIxN2g1OTkxOWIzZGFjNTViNjJjRQZNX1pONHdhc2k3aW1wb3J0czR3YXNpM2NsaTZzdGRlcnIxMGdldF9zdGRlcnIxMXdpdF9pbXBvcnQwMTdoZmE4M2E2NWQ0MDUzZmE1YUUHKV9fd2FzbV9pbXBvcnRfZW52aXJvbm1lbnRfZ2V0X2Vudmlyb25tZW50CBdfX3dhc21faW1wb3J0X2V4aXRfZXhpdAkRX193YXNtX2NhbGxfY3RvcnMKPF9aTjEwc2VyZGVfY29yZTJkZTlNYXBBY2Nlc3MxMG5leHRfdmFsdWUxN2hkMjA3YzQ3OTgzMDM4ZDdjRQtRX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxOHBhcnNlX29iamVjdF9jb2xvbjE3aDhjNDE3MDUwNjFmNjE2N2VFDE1fWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDE0aWdub3JlX2ludGVnZXIxN2g1ZmEzZGMzYmM3M2EyZDc2RQ0yX1pOMTBzZXJkZV9qc29uMmRlMTBmcm9tX3RyYWl0MTdoYzQ4OGJiYmQ0MGVjNDg3Y0UOjwFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMThkZXNlcmlhbGl6ZV9zdHJ1Y3QxN2hlMDdjMjNjZDIxYTBmNzk5RQ9MX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxM3BhcnNlX2RlY2ltYWwxN2gyZDFlNmM1YTdmYmYyYTU2RRBNX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQxNGY2NF9mcm9tX3BhcnRzMTdoOTAxMWFjOTJhZTI2MmExZUURTV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTRwYXJzZV9leHBvbmVudDE3aGVmNDA0NTcxN2UzMGI4MTdFElVfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDIycGFyc2VfZGVjaW1hbF9vdmVyZmxvdzE3aDIwMDU1NWRjZTU5MWI0OTFFE0xfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDEzcGFyc2VfaW50ZWdlcjE3aDk5NjE2MzNkZTcxYzdhY2NFFFFfWk4xMHNlcmRlX2pzb24yZGUyMURlc2VyaWFsaXplciRMVCRSJEdUJDE4cGFyc2VfbG9uZ19pbnRlZ2VyMTdoMzk4ZmIwZDA4ODI5Y2I1ZkUVTl9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTVpZ25vcmVfZXhwb25lbnQxN2g4MzVlMTZlNzZmNWYzODk1RRZWX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQyM3BhcnNlX2V4cG9uZW50X292ZXJmbG93MTdoMjlhNzlmNGMwYThhZjQ5N0UXal9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkMTdwZWVrX2ludmFsaWRfdHlwZTE3aDEwMjI2OTVmM2FiYWI5YzFFLmxsdm0uMTQzMDU5NjkwNTAyMjQ3Nzk3MDgYRV9aTjEwc2VyZGVfanNvbjJkZTIxRGVzZXJpYWxpemVyJExUJFIkR1QkN2VuZF9tYXAxN2hkYTIzMTg0ZWNiNTQ5ZjJlRRlFX1pOMTBzZXJkZV9qc29uMmRlMjFEZXNlcmlhbGl6ZXIkTFQkUiRHVCQ3ZW5kX3NlcTE3aDkzNGIwNTdmNDRkYjI0YjJFGoYBX1pOODBfJExUJHNlcmRlX2pzb24uLmRlLi5NYXBBY2Nlc3MkTFQkUiRHVCQkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uTWFwQWNjZXNzJEdUJDEzbmV4dF9rZXlfc2VlZDEyaGFzX25leHRfa2V5MTdoOWEwYmI0YjNlZGIxMTA5Y0UbqAFfWk44MF8kTFQkc2VyZGVfanNvbi4uZGUuLlNlcUFjY2VzcyRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5TZXFBY2Nlc3MkR1QkMTduZXh0X2VsZW1lbnRfc2VlZDE2aGFzX25leHRfZWxlbWVudDE3aGVhYjY4ZTJjMDI4YjcyM2NFLmxsdm0uMTQzMDU5NjkwNTAyMjQ3Nzk3MDgcjAFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMTVkZXNlcmlhbGl6ZV9zZXExN2g1ZTE4NTRmNDg4NjZmZWJhRR2PAV9aTjk4XyRMVCQkUkYkbXV0JHUyMCRzZXJkZV9qc29uLi5kZS4uRGVzZXJpYWxpemVyJExUJFIkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplciRHVCQxOGRlc2VyaWFsaXplX3N0cmluZzE3aDA3ZGYwZTdlMDFjYjAzNTFFHnxfWk44Nl8kTFQkY29yZS4ubWFya2VyLi5QaGFudG9tRGF0YSRMVCRUJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZVNlZWQkR1QkMTFkZXNlcmlhbGl6ZTE3aGRkMzkyYTE1ODEwZTUzNzlFH4wBX1pOOThfJExUJCRSRiRtdXQkdTIwJHNlcmRlX2pzb24uLmRlLi5EZXNlcmlhbGl6ZXIkTFQkUiRHVCQkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uRGVzZXJpYWxpemVyJEdUJDE1ZGVzZXJpYWxpemVfc2VxMTdoYTg2YTliNDg5ZmQ5Yjc5NUUgjQFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMTZkZXNlcmlhbGl6ZV9ib29sMTdoZTIzMjMyNjA0MTBkMzgzNUUhjwFfWk45OF8kTFQkJFJGJG11dCR1MjAkc2VyZGVfanNvbi4uZGUuLkRlc2VyaWFsaXplciRMVCRSJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZXIkR1QkMThkZXNlcmlhbGl6ZV9zdHJ1Y3QxN2gzNzUyNDcyNTQ0MGJhM2QyRSKcAl9aTjVhbGxvYzExY29sbGVjdGlvbnM1YnRyZWU0bm9kZTIxMEhhbmRsZSRMVCRhbGxvYy4uY29sbGVjdGlvbnMuLmJ0cmVlLi5ub2RlLi5Ob2RlUmVmJExUJGFsbG9jLi5jb2xsZWN0aW9ucy4uYnRyZWUuLm5vZGUuLm1hcmtlci4uTXV0JEMkSyRDJFYkQyRhbGxvYy4uY29sbGVjdGlvbnMuLmJ0cmVlLi5ub2RlLi5tYXJrZXIuLkxlYWYkR1QkJEMkYWxsb2MuLmNvbGxlY3Rpb25zLi5idHJlZS4ubm9kZS4ubWFya2VyLi5FZGdlJEdUJDE2aW5zZXJ0X3JlY3Vyc2luZzE3aDBkNWNhY2I3ZDU4MmM1NDZFI01fWk4xMGFwcHJvdmVyX2I0MF9fbGlua19jdXN0b21fc2VjdGlvbl9kZXNjcmliaW5nX2ltcG9ydHMxN2g3NTI2YjlmMDBjYWVjZDc4RSR3X1pOMTBzZXJkZV9jb3JlM3NlcjVpbXBsczYyXyRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZSR1MjAkZm9yJHUyMCQkUkYkVCRHVCQ5c2VyaWFsaXplMTdoOWY0NzQ2NmMyY2M0ZTI4MkUlLl9aTjEwc2VyZGVfanNvbjNzZXI2dG9fdmVjMTdoZWM4YzA3M2U4YWU1YmIxNUUmsAFfWk4xMjlfJExUJGRpZ2VzdC4uY29yZV9hcGkuLmN0X3ZhcmlhYmxlLi5DdFZhcmlhYmxlQ29yZVdyYXBwZXIkTFQkVCRDJE91dFNpemUkQyRPJEdUJCR1MjAkYXMkdTIwJGRpZ2VzdC4uY29yZV9hcGkuLkZpeGVkT3V0cHV0Q29yZSRHVCQxOWZpbmFsaXplX2ZpeGVkX2NvcmUxN2hlNzM3YjEyM2UwZWQ5MzYzRSdZX1pOMTJibG9ja19idWZmZXIzNUJsb2NrQnVmZmVyJExUJEJsb2NrU2l6ZSRDJEtpbmQkR1QkMTNkaWdlc3RfYmxvY2tzMTdoM2E2MmIzZDYzY2MxNTBkNUUoxwFfWk4xNjNfJExUJGFwcHJvdmVyX2IuLl8uLiRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5kZS4uRGVzZXJpYWxpemUkdTIwJGZvciR1MjAkYXBwcm92ZXJfYi4uWmtQcm9vZkRhdGEkR1QkLi5kZXNlcmlhbGl6ZS4uX19WaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aDcxY2ExODZhZjQ5Y2NlMDZFKcsBX1pOMTY3XyRMVCRhcHByb3Zlcl9iLi5fLi4kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJGFwcHJvdmVyX2IuLkV2YWx1YXRlUmVxdWVzdCRHVCQuLmRlc2VyaWFsaXplLi5fX1Zpc2l0b3IkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uVmlzaXRvciRHVCQ5ZXhwZWN0aW5nMTdoMDA5N2NhMDA4YzJhYzhlOUUqWl9aTjQ5XyRMVCRUJHUyMCRhcyR1MjAkYWxsb2MuLnN0cmluZy4uU3BlY1RvU3RyaW5nJEdUJDE0c3BlY190b19zdHJpbmcxN2gwODRmNzI1MDJlMTAyMTc1RStJX1pONGNvcmUzbnVtMjFfJExUJGltcGwkdTIwJHU2NCRHVCQxNmZyb21fYXNjaWlfcmFkaXgxN2hmYzdkYmUzNWJjOTZkZWZjRSxMX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2hiODg1ZDI4ZDgzM2IxZjJhRS1PX1pONGNvcmUzcHRyNDVkcm9wX2luX3BsYWNlJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciRHVCQxN2g3YWQ5NTM3MGRkMGI4MDAyRS5PX1pONGNvcmUzcHRyNDVkcm9wX2luX3BsYWNlJExUJHNlcmRlX2pzb24uLnZhbHVlLi5WYWx1ZSRHVCQxN2g4NjA3NTNiYmY3NjlkNWViRS9SX1pONGNvcmUzcHRyNDhkcm9wX2luX3BsYWNlJExUJGFwcHJvdmVyX2IuLkV2YWx1YXRlUmVxdWVzdCRHVCQxN2g3MDQ5MDBhZWE2MjllMTdkRTBrX1pONGNvcmUzcHRyNzNkcm9wX2luX3BsYWNlJExUJGNvcmUuLm9wdGlvbi4uT3B0aW9uJExUJHNlcmRlX2pzb24uLnZhbHVlLi5WYWx1ZSRHVCQkR1QkMTdoNzU2ZWExNzg1ZjU5NmYyN0UxUl9aTjUzXyRMVCRjb3JlLi5mbXQuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMWI2NTUzNmNkMzNhMWUxY0UyX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhFM11fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoMDg4ZDI5NzI0MTk5ZGEzYkU0KF9aTjVhbGxvYzNmbXQ2Zm9ybWF0MTdoM2RhNGE0YzM4ZDdhMGQ4MEU1WV9aTjYwXyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDllOGQwZjJhNDdlM2U4NzJFNndfWk44N18kTFQkVCR1MjAkYXMkdTIwJGFsbG9jLi5zbGljZS4uJExUJGltcGwkdTIwJCR1NWIkVCR1NWQkJEdUJC4udG9fdmVjX2luLi5Db252ZXJ0VmVjJEdUJDZ0b192ZWMxN2gyZmFkMTEwN2FmY2I4ODBhRTeGAV9aTjkzXyRMVCRhcHByb3Zlcl9iLi5Db21wb25lbnQkdTIwJGFzJHUyMCRhcHByb3Zlcl9iLi5leHBvcnRzLi5zeW5vZC4uYWdlbnQuLmNvbnRyYWN0cy4uR3Vlc3QkR1QkMTRjb21wb3NlX2FjdGlvbjE3aDVmZDEzMmU3MDYwNjM3MmVFOH9fWk45M18kTFQkYXBwcm92ZXJfYi4uQ29tcG9uZW50JHUyMCRhcyR1MjAkYXBwcm92ZXJfYi4uZXhwb3J0cy4uc3lub2QuLmFnZW50Li5jb250cmFjdHMuLkd1ZXN0JEdUJDhldmFsdWF0ZTE3aGUwNThkNjEyOWNkYjVkZWRFOTRjYWJpX3Bvc3Rfc3lub2Q6YWdlbnQvY29udHJhY3RzQDEuMC4wI2NvbXBvc2UtYWN0aW9uOipzeW5vZDphZ2VudC9jb250cmFjdHNAMS4wLjAjY29tcG9zZS1hY3Rpb247JHN5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNldmFsdWF0ZTwjc3lub2Q6YWdlbnQvY29udHJhY3RzQDEuMC4wI2V4ZWN1dGU9JXN5bm9kOmFnZW50L2NvbnRyYWN0c0AxLjAuMCNnZXQtdHJhY2U+O19aTjEwc2VyZGVfY29yZTJkZTVFcnJvcjEzbWlzc2luZ19maWVsZDE3aGYzMTM2MGZhM2ZjNjQ0OGNFP3xfWk42Nl8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkVycm9yJEdUJDZjdXN0b20xN2hmNmZkYTQyNWE1ZmFlZTg1RS5sbHZtLjEzMTI0Mzg0MTI2MjgxNzQxNzM4QDxfWk4xMHNlcmRlX2NvcmUyZGU1RXJyb3IxNGludmFsaWRfbGVuZ3RoMTdoYmY1NWNkOWQwOWYxYWVlYkVBPV9aTjEwc2VyZGVfY29yZTJkZTVFcnJvcjE1ZHVwbGljYXRlX2ZpZWxkMTdoOTQzZmFmOWU1ODM2YTBhOEVCPV9aTjEwc2VyZGVfanNvbjVlcnJvcjVFcnJvcjEyZml4X3Bvc2l0aW9uMTdoZWZkZTgwNzQyZGEzYzU3MEVD2gFfWk4xODJfJExUJHNlcmRlX2NvcmUuLmRlLi5pbXBscy4uJExUJGltcGwkdTIwJHNlcmRlX2NvcmUuLmRlLi5EZXNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkVCRHVCQkR1QkLi5kZXNlcmlhbGl6ZS4uVmVjVmlzaXRvciRMVCRUJEdUJCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5WaXNpdG9yJEdUJDl2aXNpdF9zZXExN2g2YjU5YTIzN2MzYzJjMWQ1RUTaAV9aTjE4Ml8kTFQkc2VyZGVfY29yZS4uZGUuLmltcGxzLi4kTFQkaW1wbCR1MjAkc2VyZGVfY29yZS4uZGUuLkRlc2VyaWFsaXplJHUyMCRmb3IkdTIwJGFsbG9jLi52ZWMuLlZlYyRMVCRUJEdUJCRHVCQuLmRlc2VyaWFsaXplLi5WZWNWaXNpdG9yJExUJFQkR1QkJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOXZpc2l0X3NlcTE3aDk4ZjQ1YTkxYTIxYjViMDNFRUtfWk40Nl8kTFQkVCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5FeHBlY3RlZCRHVCQzZm10MTdoOGEwYjEyZWM4ZjNlZDUyY0VGS19aTjQ2XyRMVCRUJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkV4cGVjdGVkJEdUJDNmbXQxN2hhYzIxYTE1MzU5NzM1ZDgyRUdLX1pONDZfJExUJFQkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uRXhwZWN0ZWQkR1QkM2ZtdDE3aGIxOGE1OWQ4ZjAyOTRjMzlFSEtfWk40Nl8kTFQkVCR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5FeHBlY3RlZCRHVCQzZm10MTdoYmIzYzYxMmM1OWI0ZWM4OUVJMF9aTjRjb3JlM2ZtdDVXcml0ZTl3cml0ZV9mbXQxN2g0OTQ4ZDk3OWFmOTQ3YTJjRUqyAV9aTjRjb3JlM3B0cjExN2Ryb3BfaW5fcGxhY2UkTFQkYWxsb2MuLmNvbGxlY3Rpb25zLi5idHJlZS4ubWFwLi5CVHJlZU1hcCRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckQyRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkJEdUJDE3aGJiMDE4MDBlNTViZDI0ODVFLmxsdm0uMTMxMjQzODQxMjYyODE3NDE3MzhLZF9aTjcwXyRMVCRhbGxvYy4udmVjLi5WZWMkTFQkVCRDJEEkR1QkJHUyMCRhcyR1MjAkY29yZS4ub3BzLi5kcm9wLi5Ecm9wJEdUJDRkcm9wMTdoYTVkM2ZiMmVhNTczNTkxZUVMaV9aTjRjb3JlM3B0cjQ1ZHJvcF9pbl9wbGFjZSRMVCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkMTdoODYwNzUzYmJmNzY5ZDVlYkUubGx2bS4xMzEyNDM4NDEyNjI4MTc0MTczOE1MX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2hiODg1ZDI4ZDgzM2IxZjJhRU6bAV9aTjk5XyRMVCRhbGxvYy4uY29sbGVjdGlvbnMuLmJ0cmVlLi5tYXAuLkludG9JdGVyJExUJEskQyRWJEMkQSRHVCQkdTIwJGFzJHUyMCRjb3JlLi5vcHMuLmRyb3AuLkRyb3AkR1QkNGRyb3AxN2gyNDM4MThhMTJlMjdjMjc0RS5sbHZtLjEzMTI0Mzg0MTI2MjgxNzQxNzM4T4ABX1pONGNvcmUzcHRyNjhkcm9wX2luX3BsYWNlJExUJGFsbG9jLi52ZWMuLlZlYyRMVCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkJEdUJDE3aDY5MjllN2Q1NWFkYTg3OTZFLmxsdm0uMTMxMjQzODQxMjYyODE3NDE3MzhQX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhFUV1fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoMDg4ZDI5NzI0MTk5ZGEzYkVSVl9aTjVhbGxvYzExY29sbGVjdGlvbnM1YnRyZWUzbWFwMjVCVHJlZU1hcCRMVCRLJEMkViRDJEEkR1QkNmluc2VydDE3aGEwMGMwZDVkYWZmZjhkZWJFU2RfWk43MF8kTFQkYWxsb2MuLnZlYy4uVmVjJExUJFQkQyRBJEdUJCR1MjAkYXMkdTIwJGNvcmUuLm9wcy4uZHJvcC4uRHJvcCRHVCQ0ZHJvcDE3aDgxMGEzNTQzMjQ1YThhNzNFVGRfWk43MF8kTFQkYWxsb2MuLnZlYy4uVmVjJExUJFQkQyRBJEdUJCR1MjAkYXMkdTIwJGNvcmUuLm9wcy4uZHJvcC4uRHJvcCRHVCQ0ZHJvcDE3aGEwY2YzNTBiM2IzODlkODNFVYIBX1pOOTVfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLml0ZXIuLnRyYWl0cy4uY29sbGVjdC4uRnJvbUl0ZXJhdG9yJExUJGNoYXIkR1QkJEdUJDlmcm9tX2l0ZXIxN2hiODQ2NWFjMTI5M2VhZmIzRVZXX1pOMTBhcHByb3Zlcl9iN2V4cG9ydHM1c3lub2Q1YWdlbnQ5Y29udHJhY3RzMjBfZXhwb3J0X2V4ZWN1dGVfY2FiaTE3aDczNzEzY2EzMDUwZDU4ZTFFV1hfWk4xMGFwcHJvdmVyX2I3ZXhwb3J0czVzeW5vZDVhZ2VudDljb250cmFjdHMyMV9leHBvcnRfZXZhbHVhdGVfY2FiaTE3aGY5MjMzOWJiYWQ2MGU0OGVFWFlfWk4xMGFwcHJvdmVyX2I3ZXhwb3J0czVzeW5vZDVhZ2VudDljb250cmFjdHMyMl9leHBvcnRfZ2V0X3RyYWNlX2NhYmkxN2g5NDQ0NmM1YmFmOWFjMmUzRVleX1pOMTBhcHByb3Zlcl9iN2V4cG9ydHM1c3lub2Q1YWdlbnQ5Y29udHJhY3RzMjdfZXhwb3J0X2NvbXBvc2VfYWN0aW9uX2NhYmkxN2hlZGYxNDNlNjdjMGNmZmI4RVpJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hhZjA4NGEwMDFiYzI4ZjYwRVtJX1pONDRfJExUJCRSRiRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hkMzA1MjA1N2RiNjQ1NTlkRVxfX1pONWFsbG9jMTFjb2xsZWN0aW9uczVidHJlZTNtYXA1ZW50cnkyOFZhY2FudEVudHJ5JExUJEskQyRWJEMkQSRHVCQ2aW5zZXJ0MTdoMzgwMTE1Y2VjZDQxMmU3M0VdbF9aTjczXyRMVCRzZXJkZV9qc29uLi5udW1iZXIuLk51bWJlciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLnNlci4uU2VyaWFsaXplJEdUJDlzZXJpYWxpemUxN2g0OWVkY2YxZWUxNWJkNGU5RV5hX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkMTFmaW5pc2hfZ3JvdzE3aDAzY2Q1Y2QyMGNkZWZlYjFFLmxsdm0uNTE1Mzk2NDMyNDA2NTI1NTIyMV9DX1pONWFsbG9jN3Jhd192ZWMxOVJhd1ZlYyRMVCRUJEMkQSRHVCQ4Z3Jvd19vbmUxN2g1Y2YyOWU2NTZjZWFmZDM1RWBaX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkN3Jlc2VydmUyMWRvX3Jlc2VydmVfYW5kX2hhbmRsZTE3aDM4YzYzN2IzNjNkNTlmYzhFYUBfWk4xMHNlcmRlX2NvcmUzc2VyMTBTZXJpYWxpemVyMTFjb2xsZWN0X3NlcTE3aDI3OThkMzM5ZWEwZDFmYzhFYqMBX1pOMTBzZXJkZV9qc29uNXZhbHVlM3NlcjgxXyRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5zZXIuLlNlcmlhbGl6ZSR1MjAkZm9yJHUyMCRzZXJkZV9qc29uLi52YWx1ZS4uVmFsdWUkR1QkOXNlcmlhbGl6ZTE3aGRmYjEyNjc5ZGYwZWMxOGRFLmxsdm0uODgyMTA4Njk5NDU3OTk3NTg1MmNGX1pOMTBzZXJkZV9jb3JlM3NlcjEyU2VyaWFsaXplTWFwMTVzZXJpYWxpemVfZW50cnkxN2g3YzFlZTUyNTE3NzA1MDk2RWQ7X1pOMTBzZXJkZV9qc29uM3NlcjE4Zm9ybWF0X2VzY2FwZWRfc3RyMTdoZTlhYmY3ZTNjNjIyODlkY0VlKl9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzEyX19fcnVzdF9hbGxvY2YsX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTRfX19ydXN0X2RlYWxsb2NnLF9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzE0X19fcnVzdF9yZWFsbG9jaEhfUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGM0Ml9fX3J1c3RfYWxsb2NfZXJyb3JfaGFuZGxlcl9zaG91bGRfcGFuaWNfdjJpQV9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzM1X19fcnVzdF9ub19hbGxvY19zaGltX2lzX3Vuc3RhYmxlX3Yyam1fWk43OV8kTFQkaGV4Li5CeXRlc1RvSGV4Q2hhcnMkdTIwJGFzJHUyMCRjb3JlLi5pdGVyLi50cmFpdHMuLml0ZXJhdG9yLi5JdGVyYXRvciRHVCQ0bmV4dDE3aDU3OTY2NzFmY2I0ZmIyNTFFa09fWk4xMHNlcmRlX2pzb240cmVhZDEycGFyc2VfZXNjYXBlMTdoZGQ1Njk1MWM5OGU2N2Q0M0UubGx2bS4zMTAyOTkzMzgzMDUwNjQwNDk2bC5fWk4xMHNlcmRlX2pzb240cmVhZDVlcnJvcjE3aGI2Mjk3YzY4MjVmN2I4ZjhFbS5fWk4xMHNlcmRlX2pzb240cmVhZDVlcnJvcjE3aGRhNzJjOTUxNzU5OWViYTNFbj5fWk4xMHNlcmRlX2pzb240cmVhZDIwcGFyc2VfdW5pY29kZV9lc2NhcGUxN2hlODM1Mzg0NjA4MmIzNmE2RW8uX1pOMTBzZXJkZV9qc29uNHJlYWQ1ZXJyb3IxN2g5YjQwMDE2OGZhOWI0NDlhRXBHX1pOMTBzZXJkZV9qc29uNHJlYWQ1ZXJyb3IxN2gwZGZiYWZkMzY0ZDM0ODBjRS5sbHZtLjMxMDI5OTMzODMwNTA2NDA0OTZxXl9aTjEwc2VyZGVfanNvbjRyZWFkOVNsaWNlUmVhZDE3cG9zaXRpb25fb2ZfaW5kZXgxN2hmMGE5MTEyYzVkMTYxNmYwRS5sbHZtLjMxMDI5OTMzODMwNTA2NDA0OTZyLl9aTjEwc2VyZGVfanNvbjRyZWFkNWVycm9yMTdoZWZiY2IxMTFhYWY5MzQwOEVzW19aTjEwc2VyZGVfanNvbjRyZWFkOVNsaWNlUmVhZDE0c2tpcF90b19lc2NhcGUxN2hlYWZmMDNjMWZmZGFhNWYxRS5sbHZtLjMxMDI5OTMzODMwNTA2NDA0OTZ0R19aTjEwc2VyZGVfanNvbjRyZWFkOVNsaWNlUmVhZDE5c2tpcF90b19lc2NhcGVfc2xvdzE3aGMwNzY2Y2ZjMTQ0ODQ5NmFFdWtfWk43MF8kTFQkc2VyZGVfanNvbi4ucmVhZC4uU2xpY2VSZWFkJHUyMCRhcyR1MjAkc2VyZGVfanNvbi4ucmVhZC4uUmVhZCRHVCQxMGlnbm9yZV9zdHIxN2gxOWZhNTQwMDE3NmY0Y2VhRXZuX1pONzBfJExUJHNlcmRlX2pzb24uLnJlYWQuLlNsaWNlUmVhZCR1MjAkYXMkdTIwJHNlcmRlX2pzb24uLnJlYWQuLlJlYWQkR1QkMTNwZWVrX3Bvc2l0aW9uMTdoN2QyMGMxMmE1Njc4Y2IyYkV3aF9aTjcwXyRMVCRzZXJkZV9qc29uLi5yZWFkLi5TbGljZVJlYWQkdTIwJGFzJHUyMCRzZXJkZV9qc29uLi5yZWFkLi5SZWFkJEdUJDhwb3NpdGlvbjE3aDhiMGRlMzZjNTY4NDJhMDJFeGlfWk43MF8kTFQkc2VyZGVfanNvbi4ucmVhZC4uU2xpY2VSZWFkJHUyMCRhcyR1MjAkc2VyZGVfanNvbi4ucmVhZC4uUmVhZCRHVCQ5cGFyc2Vfc3RyMTdoYWQzNGU4NTEwMmE2MmU3OUV5NV9aTjEwc2VyZGVfanNvbjVlcnJvcjEwbWFrZV9lcnJvcjE3aDNmNjc5ZjU0NzFkMGUxYmVFekJfWk40Y29yZTNzdHI3cGF0dGVybjE0VHdvV2F5U2VhcmNoZXI5bmV4dF9iYWNrMTdoYzNmNWI5YWRhNjBiZmEzYkV7Ml9aTjEwc2VyZGVfanNvbjVlcnJvcjVFcnJvcjJpbzE3aDI2OWU0MGQ5ZTI1ZTFmZGNFfDZfWk4xMHNlcmRlX2pzb241ZXJyb3I1RXJyb3I2c3ludGF4MTdoYTEwNzY1NDY4ODg3ZDE0NEV9TF9aTjRjb3JlM3B0cjQyZHJvcF9pbl9wbGFjZSRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckR1QkMTdoNGZhNTZkYTY3MmY5ZDgxM0V+Ul9aTjUzXyRMVCRjb3JlLi5mbXQuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMWI2NTUzNmNkMzNhMWUxY0V/V19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hiMWEzZmI5NzUzM2ZkZDg1RYABX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhFgQFdX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aDA4OGQyOTcyNDE5OWRhM2JFggFaX1pONjFfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDBhZTI3NzIyZDIwNGQzMzdFgwFgX1pONjdfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvckNvZGUkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGVmYTk5ZTNlMWZlNGEzYzRFhAFcX1pONjNfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZTg2OTI0M2RkN2UzMTI5MUWFAWlfWk42Nl8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkVycm9yJEdUJDEyaW52YWxpZF90eXBlMTdoN2I1ZDViZWRmNWRhZjYzZkWGAWVfWk43Ml8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkpzb25VbmV4cGVjdGVkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g0OWFiNmQ4NDE5NzgzNWQxRYcBfF9aTjY2XyRMVCRzZXJkZV9qc29uLi5lcnJvci4uRXJyb3IkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uRXJyb3IkR1QkNmN1c3RvbTE3aDk4YmZhMjM0NDU0NTE4YjRFLmxsdm0uMTY0MTQ3Nzk3MjI3NDQ2Nzc5MzeIAWpfWk42Nl8kTFQkc2VyZGVfanNvbi4uZXJyb3IuLkVycm9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkVycm9yJEdUJDEzaW52YWxpZF92YWx1ZTE3aGVlOTNjNzQxMjk4ZTZiMmRFiQFCX1pOMTBzZXJkZV9qc29uMmRlMTJQYXJzZXJOdW1iZXIxMmludmFsaWRfdHlwZTE3aDQ1NmZhMjJlZDNiMzdmNjhFigFhX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkMTFmaW5pc2hfZ3JvdzE3aDkxNDFhOTc4MGNkYzJkZmZFLmxsdm0uMzcxNTI2NDcwMDM4ODYwMDA1NIsBWl9aTjVhbGxvYzdyYXdfdmVjMjBSYXdWZWNJbm5lciRMVCRBJEdUJDdyZXNlcnZlMjFkb19yZXNlcnZlX2FuZF9oYW5kbGUxN2hhODQ0NzVhYmQ5ZWJkNDQ3RYwBSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNzg5NDI4ODI5NGJiYTI4NkWNAUlfWk40NF8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGNkODJhY2Y3MjczYzFjMjFFjgEwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aDRhODE0MTAxMWE5NGM0ZDlFjwFMX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2g0ZmE1NmRhNjcyZjlkODEzRZABX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhFkQFdX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aDA4OGQyOTcyNDE5OWRhM2JFkgFeX1pONjVfJExUJHNlcmRlX2pzb24uLmlvLi5pbXAuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g2MThkNTY4YTBiNTEyYTEwRZMBQ19aTjM4XyRMVCR1NjQkdTIwJGFzJHUyMCRpdG9hLi5VbnNpZ25lZCRHVCQzZm10MTdoNDE5Yjg4OWE3MWIwYzAyY0WUAVxfWk40NV8kTFQkZjY0JHUyMCRhcyR1MjAkem1pai4ucHJpdmF0ZS4uU2VhbGVkJEdUJDIwd3JpdGVfdG9fem1pal9idWZmZXIxN2hiNGQzNWFhNTlkM2M2YWI0RZUBN19aTjExd2l0X2JpbmRnZW4ycnQxNHJ1bl9jdG9yc19vbmNlMTdoZDBiNjY5ZjNiNjU1OThkMUWWATBfWk40c2hhMjZzaGEyNTYxMWNvbXByZXNzMjU2MTdoNjRiOWFjZDJhZWI1NDVhY0WXAasBX1pOMTMzXyRMVCQkTFQkc2VyZGVfY29yZS4uZGUuLldpdGhEZWNpbWFsUG9pbnQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkLi5mbXQuLkxvb2tGb3JEZWNpbWFsUG9pbnQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDMzYTYxNGI0MDRmNTAxYjJFmAGpAV9aTjEzM18kTFQkJExUJHNlcmRlX2NvcmUuLmRlLi5XaXRoRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJC4uZm10Li5Mb29rRm9yRGVjaW1hbFBvaW50JHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoZWUwMTZjMTFjM2Y5ODA2YUWZAcIBX1pOMTU4XyRMVCRzZXJkZV9jb3JlLi5kZS4uaW1wbHMuLiRMVCRpbXBsJHUyMCRzZXJkZV9jb3JlLi5kZS4uRGVzZXJpYWxpemUkdTIwJGZvciR1MjAkdTY0JEdUJC4uZGVzZXJpYWxpemUuLlByaW1pdGl2ZVZpc2l0b3IkdTIwJGFzJHUyMCRzZXJkZV9jb3JlLi5kZS4uVmlzaXRvciRHVCQ5ZXhwZWN0aW5nMTdoNmE2MzkwMjhlN2QwZmI0ZUWaAUdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hiYmM1ZjJkN2Y4YzNmMWIxRZsBMF9aTjRjb3JlM2ZtdDVXcml0ZTl3cml0ZV9mbXQxN2g1ZmJlNzQ5MzI2MDJkOWI0RZwBUV9aTjUyXyRMVCQkUkYkc3RyJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLkV4cGVjdGVkJEdUJDNmbXQxN2g2OWVjMzMwMzZiOTY0MGE3RZ0BXl9aTjY1XyRMVCRzZXJkZV9jb3JlLi5kZS4uVW5leHBlY3RlZCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoYjExMGI3ZjQwZTAyMmY1YkWeAWRfWk43MV8kTFQkc2VyZGVfY29yZS4uZGUuLldpdGhEZWNpbWFsUG9pbnQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDRlODNmNjdjNGVjMDIxNTdFnwFkX1pONzFfJExUJGR5biR1MjAkc2VyZGVfY29yZS4uZGUuLkV4cGVjdGVkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hjYmE0OGVjOTUzYjI1ZTNkRaABcV9aTjc4XyRMVCRzZXJkZV9jb3JlLi5kZS4uaW1wbHMuLkJvb2xWaXNpdG9yJHUyMCRhcyR1MjAkc2VyZGVfY29yZS4uZGUuLlZpc2l0b3IkR1QkOWV4cGVjdGluZzE3aGNiYWVjMDAzZmNlYTQ5MjhFoQFzX1pOODBfJExUJHNlcmRlX2NvcmUuLmRlLi5pbXBscy4uU3RyaW5nVmlzaXRvciR1MjAkYXMkdTIwJHNlcmRlX2NvcmUuLmRlLi5WaXNpdG9yJEdUJDlleHBlY3RpbmcxN2hlNjA0MWQ1YWE0MjE4NTQyRaIBMF9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzE4X19fcnVzdF9zdGFydF9wYW5pY6MBJ19STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzEwcnVzdF9wYW5pY6QBLl9aTjNzdGQyaW81V3JpdGU5d3JpdGVfZm10MTdoMGE4NzIwZGFmOTUyZmRjM0WlAXNfWk40Y29yZTNwdHI4MWRyb3BfaW5fcGxhY2UkTFQkY29yZS4ucmVzdWx0Li5SZXN1bHQkTFQkJExQJCRSUCQkQyRzdGQuLmlvLi5lcnJvci4uRXJyb3IkR1QkJEdUJDE3aDdmY2RkYzFlNWVhNTUyYWRFpgFWX1pONGNvcmUzcHRyNTJkcm9wX2luX3BsYWNlJExUJHN0ZC4uc3lzLi5zdGRpby4ud2FzaXAyLi5TdGRlcnIkR1QkMTdoMTAzMTA3NWFhM2Q5MTI2ZUWnASlfWk4zc3RkN3Byb2Nlc3M1YWJvcnQxN2g5ZDQzY2QyMjBiNjAwNGFkRagBKV9STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzExX19fcmRsX2FsbG9jqQEqX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTJfX19ydXN0X2Fib3J0qgErX1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMTNfX19yZGxfZGVhbGxvY6sBK19STnZDc2hYd0ZsbFg1NnBUXzdfX19ydXN0YzEzX19fcmRsX3JlYWxsb2OsAS5fUk52Q3NoWHdGbGxYNTZwVF83X19fcnVzdGMxN3J1c3RfYmVnaW5fdW53aW5krQFFX1pOM3N0ZDNzeXM5YmFja3RyYWNlMjZfX3J1c3RfZW5kX3Nob3J0X2JhY2t0cmFjZTE3aGViY2VhNDkyOTM0OWY0Y2FFrgE4X1JOdkNzaFh3RmxsWDU2cFRfN19fX3J1c3RjMjZfX19ydXN0X2FsbG9jX2Vycm9yX2hhbmRsZXKvASpfWk4zc3RkNWFsbG9jOHJ1c3Rfb29tMTdoZTk4YThmMGYxYmNiNjU0MkWwAUVfWk4zNl8kTFQkVCR1MjAkYXMkdTIwJGNvcmUuLmFueS4uQW55JEdUJDd0eXBlX2lkMTdoOWYwNjQzZWNjMGRmOWUzYkWxAUVfWk4zNl8kTFQkVCR1MjAkYXMkdTIwJGNvcmUuLmFueS4uQW55JEdUJDd0eXBlX2lkMTdoYTAzZGI4NDY3OGQ1NmQxZEWyAUlfWk40NF8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGFkOGM5ZWVlMzY3MjIxNWJFswFaX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkN3Jlc2VydmUyMWRvX3Jlc2VydmVfYW5kX2hhbmRsZTE3aDI0N2ZjMDA5MDZkYjg3MWNFtAFIX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkMTFmaW5pc2hfZ3JvdzE3aDczZTUxMjg2MDg0MjI0YmJFtQEuX1pOM3N0ZDJpbzVlcnJvcjVFcnJvcjNuZXcxN2hmYTVlMzI5NTMxOGZhZDE2RbYBN19aTjNzdGQyaW81V3JpdGUxN2lzX3dyaXRlX3ZlY3RvcmVkMTdoYjBmZDE3Y2QzNjA2MDViY0W3AThfWk4zc3RkMmlvNVdyaXRlMTh3cml0ZV9hbGxfdmVjdG9yZWQxN2g5NTcwODQwNTI1OWU1ZmVjRbgBLl9aTjNzdGQyaW81V3JpdGU5d3JpdGVfYWxsMTdoOTdlNTgzZGFjNjdmMmRlNUW5AS5fWk4zc3RkMmlvNVdyaXRlOXdyaXRlX2ZtdDE3aDVjZTZmZjJkZjIyODc2Y2VFugEuX1pOM3N0ZDJpbzVXcml0ZTl3cml0ZV9mbXQxN2g4YzRlMzg0ZDdjNWU0YmRhRbsBgAFfWk4zc3RkMmlvNWltcGxzNzRfJExUJGltcGwkdTIwJHN0ZC4uaW8uLldyaXRlJHUyMCRmb3IkdTIwJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRDJEEkR1QkJEdUJDE0d3JpdGVfdmVjdG9yZWQxN2g5OGJkMTU5YWYxMzIzMzQxRbwBgwFfWk4zc3RkMmlvNWltcGxzNzRfJExUJGltcGwkdTIwJHN0ZC4uaW8uLldyaXRlJHUyMCRmb3IkdTIwJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRDJEEkR1QkJEdUJDE3aXNfd3JpdGVfdmVjdG9yZWQxN2gzODQ1Y2U4MTJkZmYzYWRiRb0BhAFfWk4zc3RkMmlvNWltcGxzNzRfJExUJGltcGwkdTIwJHN0ZC4uaW8uLldyaXRlJHUyMCRmb3IkdTIwJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRDJEEkR1QkJEdUJDE4d3JpdGVfYWxsX3ZlY3RvcmVkMTdoMTY2NzVlMTZiM2I0YjYwYkW+AXZfWk4zc3RkMmlvNWltcGxzNzRfJExUJGltcGwkdTIwJHN0ZC4uaW8uLldyaXRlJHUyMCRmb3IkdTIwJGFsbG9jLi52ZWMuLlZlYyRMVCR1OCRDJEEkR1QkJEdUJDVmbHVzaDE3aDQ1M2Q0MWI4YmFkYTVmZjRFvwF2X1pOM3N0ZDJpbzVpbXBsczc0XyRMVCRpbXBsJHUyMCRzdGQuLmlvLi5Xcml0ZSR1MjAkZm9yJHUyMCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkQyRBJEdUJCRHVCQ1d3JpdGUxN2g2NTkwYjdlYTdiNjA1MzRkRcABel9aTjNzdGQyaW81aW1wbHM3NF8kTFQkaW1wbCR1MjAkc3RkLi5pby4uV3JpdGUkdTIwJGZvciR1MjAkYWxsb2MuLnZlYy4uVmVjJExUJHU4JEMkQSRHVCQkR1QkOXdyaXRlX2FsbDE3aGE0MjViZjgyZGJjNzYzNDlFwQE+X1pONWFsbG9jNHN5bmMxNkFyYyRMVCRUJEMkQSRHVCQ5ZHJvcF9zbG93MTdoMGZlODFjY2Q3OTg0YjMwOUXCATVfWk40Y29yZTlwYW5pY2tpbmcxM2Fzc2VydF9mYWlsZWQxN2hiMjAyYzNkNDJiYzgxYzk2RcMBPF9aTjNzdGQ2dGhyZWFkMmlkOFRocmVhZElkM25ldzlleGhhdXN0ZWQxN2gyMTFiOWY3OWZiMzk3MWUxRcQBLF9aTjNzdGQzZW52MTFjdXJyZW50X2RpcjE3aDZhYjMwOTQ5MzViYjBhOTRFxQEnX1pOM3N0ZDNlbnY3X3Zhcl9vczE3aDBmYWFmMDI0MmNhMzQwZjJFxgFUX1pOM3N0ZDNzeXMzcGFsNmNvbW1vbjE0c21hbGxfY19zdHJpbmcyNHJ1bl93aXRoX2NzdHJfYWxsb2NhdGluZzE3aDM2NmYwNDAyNThkNDcyN2ZFxwFCX1pOM3N0ZDNzeXMzcGFsNndhc2lwMjdoZWxwZXJzMTRhYm9ydF9pbnRlcm5hbDE3aDBlMmU2N2YyNDczODkxY2JFyAE+X1pOM3N0ZDNzeXM5YmFja3RyYWNlMTNCYWNrdHJhY2VMb2NrNXByaW50MTdoMjA4ZGY4MjRhNTA3ZDk2YUXJAX9fWk45OF8kTFQkc3RkLi5zeXMuLmJhY2t0cmFjZS4uQmFja3RyYWNlTG9jay4ucHJpbnQuLkRpc3BsYXlCYWNrdHJhY2UkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGRiODVhNGVkZmZjMDM3OWFFygFFX1pOM3N0ZDNzeXM5YmFja3RyYWNlMjZfX3J1c3RfZW5kX3Nob3J0X2JhY2t0cmFjZTE3aDg4MDM2ZTY1OGM5OTE0OGNFywFIX1pOM3N0ZDVhbGxvYzhydXN0X29vbTI4XyR1N2IkJHU3YiRjbG9zdXJlJHU3ZCQkdTdkJDE3aGE4YzQ5OWExOWYxZTE1ZjBFzAFSX1pOM3N0ZDlwYW5pY2tpbmcxM3BhbmljX2hhbmRsZXIyOF8kdTdiJCR1N2IkY2xvc3VyZSR1N2QkJHU3ZCQxN2gzYTM5ZTcwYjNkY2JhNzI1Rc0BLl9aTjNzdGQzc3lzOWJhY2t0cmFjZTRsb2NrMTdoM2I1ZDZjNWQ4ZDI3MTk2MkXOAUJfWk4zc3RkNHN5bmM2cG9pc29uNW11dGV4MTRNdXRleCRMVCRUJEdUJDRsb2NrMTdoMzBjZjQwODQ0YjUyMmZmNkXPATtfWk4zc3RkNWFsbG9jMjRkZWZhdWx0X2FsbG9jX2Vycm9yX2hvb2sxN2hlYTVjZGUxZDQzZmQwNDMyRdABNl9aTjNzdGQ1cGFuaWMxOWdldF9iYWNrdHJhY2Vfc3R5bGUxN2g2YzhlODgwOWE1NDRjZjVmRdEBW19aTjNzdGQ2dGhyZWFkN2N1cnJlbnQxN3dpdGhfY3VycmVudF9uYW1lMjhfJHU3YiQkdTdiJGNsb3N1cmUkdTdkJCR1N2QkMTdoNDczZTIwZWVmZjFiMTE5ZkXSAUlfWk40NF8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGIxZjM1NTYyOTY3NDU5YmNF0wE2X1pOM3N0ZDlwYW5pY2tpbmcxNXBhbmljX3dpdGhfaG9vazE3aGI1M2ZiODkyNzVmZmI2NWNF1AE7X1pOM3N0ZDlwYW5pY2tpbmcxMXBhbmljX2NvdW50OGluY3JlYXNlMTdoZWZhNzBhNmUwYTZlMGMzNkXVATNfWk4zc3RkOXBhbmlja2luZzEyZGVmYXVsdF9ob29rMTdoOWZjNDE1ZTU0ZDNiMGU3ZkXWATVfWk4zc3RkOXBhbmlja2luZzE0cGF5bG9hZF9hc19zdHIxN2gxNTM2ZDAzNmQzMzg1YTMwRdcBUV9aTjNzdGQ5cGFuaWNraW5nMTJkZWZhdWx0X2hvb2syOF8kdTdiJCR1N2IkY2xvc3VyZSR1N2QkJHU3ZCQxN2gxZjZlZjNiMThjMTZjMmQ4RdgBUV9aTjUyXyRMVCQkUkYkbXV0JHUyMCRUJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2gwNWQ3YzkxZjBhNTMzY2QzRdkBR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aGZmZDU5YzA1MWIzYjU3M2RF2gEyX1pONGNvcmUzZm10NVdyaXRlMTB3cml0ZV9jaGFyMTdoM2RmZDVjN2RmMDA1NDE3NUXbATJfWk40Y29yZTNmbXQ1V3JpdGUxMHdyaXRlX2NoYXIxN2gzZjg3NTNhM2Q5YmFkMzhlRdwBMl9aTjRjb3JlM2ZtdDVXcml0ZTEwd3JpdGVfY2hhcjE3aGIwZjk5YzhjNWNjZGExNDRF3QEwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aDNhZTkyMzI0NjM5MDdlZmVF3gEwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aDZmMGM5NDM2N2MzZmY0MTZF3wEwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aDgyYWMyNDU0NWM4OWIwMmFF4AEwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aGIzNzhhNTk1YTc3Nzc1MGNF4QGaAV9aTjRjb3JlM3B0cjExOWRyb3BfaW5fcGxhY2UkTFQkc3RkLi5pby4uZGVmYXVsdF93cml0ZV9mbXQuLkFkYXB0ZXIkTFQkc3RkLi5pby4uY3Vyc29yLi5DdXJzb3IkTFQkJFJGJG11dCR1MjAkJHU1YiR1OCR1NWQkJEdUJCRHVCQkR1QkMTdoOTMyZmUyMWEyOGZiOTg5OEXiAZECX1pONGNvcmUzcHRyMjM4ZHJvcF9pbl9wbGFjZSRMVCRhbGxvYy4uYm94ZWQuLmNvbnZlcnQuLiRMVCRpbXBsJHUyMCRjb3JlLi5jb252ZXJ0Li5Gcm9tJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQkdTIwJGZvciR1MjAkYWxsb2MuLmJveGVkLi5Cb3gkTFQkZHluJHUyMCRjb3JlLi5lcnJvci4uRXJyb3IkdTJiJGNvcmUuLm1hcmtlci4uU2VuZCR1MmIkY29yZS4ubWFya2VyLi5TeW5jJEdUJCRHVCQuLmZyb20uLlN0cmluZ0Vycm9yJEdUJDE3aDBiYjQ0MDYzOWJjNzY2OTNF4wFMX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2g5NzRkZmI1NDJlNDk0MDlmReQBUF9aTjRjb3JlM3B0cjQ2ZHJvcF9pbl9wbGFjZSRMVCRhbGxvYy4udmVjLi5WZWMkTFQkdTgkR1QkJEdUJDE3aGY3NWJhNzY0MTcxNTQ5ODdF5QFpX1pONGNvcmUzcHRyNzFkcm9wX2luX3BsYWNlJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5Gb3JtYXRTdHJpbmdQYXlsb2FkJEdUJDE3aDM3N2JkYmEzN2RhM2U2YjRF5gE1X1pONGNvcmU1ZXJyb3I1RXJyb3IxMWRlc2NyaXB0aW9uMTdoZjgxOWI1YjM0ZWZmNGRiN0XnAS5fWk40Y29yZTVlcnJvcjVFcnJvcjVjYXVzZTE3aGIwOGNiMzQ4YzczMTE2NGRF6AEwX1pONGNvcmU1ZXJyb3I1RXJyb3I3cHJvdmlkZTE3aGQ2MGMwZGJjNDFhYmJhYTBF6QEwX1pONGNvcmU1ZXJyb3I1RXJyb3I3dHlwZV9pZDE3aDhkOTMzMDIxZGJlYzM2MzlF6gE3X1pONGNvcmU1cGFuaWMxMlBhbmljUGF5bG9hZDZhc19zdHIxN2g5ODg5NDEyYzJlNGU4ZTYwResBX19aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDEwd3JpdGVfY2hhcjE3aDAwNTFlNmFmN2E3NTFlZjhF7AFdX1pONThfJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aDA4OGQyOTcyNDE5OWRhM2JF7QFlX1pONjBfJExUJHN0ZC4uaW8uLnN0ZGlvLi5TdGRlcnJSYXckdTIwJGFzJHUyMCRzdGQuLmlvLi5Xcml0ZSRHVCQxNHdyaXRlX3ZlY3RvcmVkMTdoZmVhODA2NTY5NTcwZGNhMkXuAWFfWk42Nl8kTFQkc3RkLi5zeXMuLnN0ZGlvLi53YXNpcDIuLlN0ZGVyciR1MjAkYXMkdTIwJHN0ZC4uaW8uLldyaXRlJEdUJDV3cml0ZTE3aDljMWYwYzVhOTA3MDYxYWJF7wFhX1pONjZfJExUJHN0ZC4uc3lzLi5zdGRpby4ud2FzaXAyLi5TdGRlcnIkdTIwJGFzJHUyMCRzdGQuLmlvLi5Xcml0ZSRHVCQ1Zmx1c2gxN2g1Yzg2NDQ3MjcxMWMyNDY3RfABdF9aTjgxXyRMVCRzdGQuLmlvLi5kZWZhdWx0X3dyaXRlX2ZtdC4uQWRhcHRlciRMVCRUJEdUJCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uV3JpdGUkR1QkOXdyaXRlX3N0cjE3aGExOTg1ZGYxZGE4ZTY5YzJF8QF0X1pOODFfJExUJHN0ZC4uaW8uLmRlZmF1bHRfd3JpdGVfZm10Li5BZGFwdGVyJExUJFQkR1QkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQ5d3JpdGVfc3RyMTdoYmRhZDhkNGI2OTE1YWE1MkXyAXRfWk44MV8kTFQkc3RkLi5pby4uZGVmYXVsdF93cml0ZV9mbXQuLkFkYXB0ZXIkTFQkVCRHVCQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2hjZGNjMTlkNmQ4MDcwNTdkRfMBc19aTjg2XyRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uU3RhdGljU3RyUGF5bG9hZCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZTg4ZWU2MzNiYjc3ODMzMUX0AXZfWk44OV8kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLkZvcm1hdFN0cmluZ1BheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGVjYzVlMzM1YzRlNjVkODlF9QF6X1pOOTNfJExUJHN0ZC4ucGFuaWNraW5nLi5wYW5pY19oYW5kbGVyLi5TdGF0aWNTdHJQYXlsb2FkJHUyMCRhcyR1MjAkY29yZS4ucGFuaWMuLlBhbmljUGF5bG9hZCRHVCQzZ2V0MTdoMzEyZTI1NjgxYmRhODZiZkX2AX1fWk45M18kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLlN0YXRpY1N0clBheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5wYW5pYy4uUGFuaWNQYXlsb2FkJEdUJDZhc19zdHIxN2g1Mzg3ZjEyMjAwYjVmODM4RfcBf19aTjkzXyRMVCRzdGQuLnBhbmlja2luZy4ucGFuaWNfaGFuZGxlci4uU3RhdGljU3RyUGF5bG9hZCR1MjAkYXMkdTIwJGNvcmUuLnBhbmljLi5QYW5pY1BheWxvYWQkR1QkOHRha2VfYm94MTdoYTViMDYyYmIzOTE1YTllMUX4AX1fWk45Nl8kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLkZvcm1hdFN0cmluZ1BheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5wYW5pYy4uUGFuaWNQYXlsb2FkJEdUJDNnZXQxN2g5MzQ0NTlhOTcwYmY1ODIzRfkBggFfWk45Nl8kTFQkc3RkLi5wYW5pY2tpbmcuLnBhbmljX2hhbmRsZXIuLkZvcm1hdFN0cmluZ1BheWxvYWQkdTIwJGFzJHUyMCRjb3JlLi5wYW5pYy4uUGFuaWNQYXlsb2FkJEdUJDh0YWtlX2JveDE3aGJmYTU4MWZkNTM2NmEyMDhF+gEMY2FiaV9yZWFsbG9j+wFMX1pONHdhc2k1cHJveHk0MF9fbGlua19jdXN0b21fc2VjdGlvbl9kZXNjcmliaW5nX2ltcG9ydHMxN2hkMTc1Y2FjZjMyOTk2ZGRkRfwBQ19aTjVhbGxvYzdyYXdfdmVjMTlSYXdWZWMkTFQkVCRDJEEkR1QkOGdyb3dfb25lMTdoMjJmZTM4NjgwMjI2MzA1OUX9AUlfWk40d2FzaTdpbXBvcnRzNHdhc2kyaW81ZXJyb3I1RXJyb3IxNXRvX2RlYnVnX3N0cmluZzE3aGJmOTkzMmViNjVmNDhiNmRF/gFcX1pONHdhc2k3aW1wb3J0czR3YXNpMmlvN3N0cmVhbXMxMk91dHB1dFN0cmVhbTI0YmxvY2tpbmdfd3JpdGVfYW5kX2ZsdXNoMTdoMDczZTY5NmQ1MzYyOGE3OEX/AUBfWk40d2FzaTdpbXBvcnRzNHdhc2kzY2xpNnN0ZGVycjEwZ2V0X3N0ZGVycjE3aDk2ZjZkNDY4M2ExNmMzMzNFgAJLX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkMTRncm93X2Ftb3J0aXplZDE3aDAyYTA5NTg1OTFhZTZkYTZFgQJIX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkMTFmaW5pc2hfZ3JvdzE3aGU4ZTQ4NTJhZTM5NmRmMDZFggIGbWFsbG9jgwIIZGxtYWxsb2OEAg1wcmVwZW5kX2FsbG9jhQIEZnJlZYYCBmRsZnJlZYcCBmNhbGxvY4gCB3JlYWxsb2OJAg1kaXNwb3NlX2NodW5rigIOcG9zaXhfbWVtYWxpZ26LAhFpbnRlcm5hbF9tZW1hbGlnbowCBV9FeGl0jQIZX193YXNpbGliY19lbnN1cmVfZW52aXJvbo4CHV9fd2FzaWxpYmNfaW5pdGlhbGl6ZV9lbnZpcm9ujwIFYWJvcnSQAgZnZXRjd2SRAgRzYnJrkgIld2FzaXAyX2xpc3RfdHVwbGUyX3N0cmluZ19zdHJpbmdfZnJlZZMCG2Vudmlyb25tZW50X2dldF9lbnZpcm9ubWVudJQCCWV4aXRfZXhpdJUCBmdldGVudpYCBm1lbWNtcJcCC19fc3RyY2hybnVsmAIIX19zdHBjcHmZAgZzdHJjcHmaAgZzdHJkdXCbAgZzdHJsZW6cAgdzdHJuY21wnQI3X1pONWFsbG9jNWFsbG9jMThoYW5kbGVfYWxsb2NfZXJyb3IxN2hhZmZlYjIzNjJhYjQ3MDZhRZ4CnAJfWk4yNTRfJExUJGFsbG9jLi5ib3hlZC4uY29udmVydC4uJExUJGltcGwkdTIwJGNvcmUuLmNvbnZlcnQuLkZyb20kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJCR1MjAkZm9yJHUyMCRhbGxvYy4uYm94ZWQuLkJveCRMVCRkeW4kdTIwJGNvcmUuLmVycm9yLi5FcnJvciR1MmIkY29yZS4ubWFya2VyLi5TZW5kJHUyYiRjb3JlLi5tYXJrZXIuLlN5bmMkR1QkJEdUJC4uZnJvbS4uU3RyaW5nRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hhMmM4ODIyYjA4MDRhNTBhRZ8CngJfWk4yNTZfJExUJGFsbG9jLi5ib3hlZC4uY29udmVydC4uJExUJGltcGwkdTIwJGNvcmUuLmNvbnZlcnQuLkZyb20kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJEdUJCR1MjAkZm9yJHUyMCRhbGxvYy4uYm94ZWQuLkJveCRMVCRkeW4kdTIwJGNvcmUuLmVycm9yLi5FcnJvciR1MmIkY29yZS4ubWFya2VyLi5TZW5kJHUyYiRjb3JlLi5tYXJrZXIuLlN5bmMkR1QkJEdUJC4uZnJvbS4uU3RyaW5nRXJyb3IkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGVkNzAyYTgyNmVkNjYxOTRFoAIwX1pONGNvcmUzZm10NVdyaXRlOXdyaXRlX2ZtdDE3aGVjNDAxMjNlYTYwNTZlOTBFoQJMX1pONGNvcmUzcHRyNDJkcm9wX2luX3BsYWNlJExUJGFsbG9jLi5zdHJpbmcuLlN0cmluZyRHVCQxN2gwNGI3NWRmOTljNjBmNWEzRaICUl9aTjUzXyRMVCRjb3JlLi5mbXQuLkVycm9yJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMWI2NTUzNmNkMzNhMWUxY0WjAl9fWk41OF8kTFQkYWxsb2MuLnN0cmluZy4uU3RyaW5nJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2gwMDUxZTZhZjdhNzUxZWY4RaQCWl9aTjVhbGxvYzdyYXdfdmVjMjBSYXdWZWNJbm5lciRMVCRBJEdUJDdyZXNlcnZlMjFkb19yZXNlcnZlX2FuZF9oYW5kbGUxN2g2ZTdhZjE3NGJhZGE4ZWUzRaUCXV9aTjU4XyRMVCRhbGxvYy4uc3RyaW5nLi5TdHJpbmckdTIwJGFzJHUyMCRjb3JlLi5mbXQuLldyaXRlJEdUJDl3cml0ZV9zdHIxN2gwODhkMjk3MjQxOTlkYTNiRaYCM19aTjVhbGxvYzdyYXdfdmVjMTJoYW5kbGVfZXJyb3IxN2hjMzEwMzIwYWUwNTY4ZGIxRacCRF9aTjVhbGxvYzNmZmk1Y19zdHI3Q1N0cmluZzE5X2Zyb21fdmVjX3VuY2hlY2tlZDE3aDViOTkzYzJiMWM5OTAxMTlFqAJIX1pONWFsbG9jN3Jhd192ZWMyMFJhd1ZlY0lubmVyJExUJEEkR1QkMTFmaW5pc2hfZ3JvdzE3aGU0OTJkZDcwM2ExNDVhNWZFqQI2X1pONWFsbG9jM2ZtdDZmb3JtYXQxMmZvcm1hdF9pbm5lcjE3aDQ3OWNmYjU2OTdmMWZjNzhFqgI4X1pONWFsbG9jN3Jhd192ZWMxN2NhcGFjaXR5X292ZXJmbG93MTdoNDY3OTllYWNmMTVjZmY4M0WrAkNfWk41YWxsb2M3cmF3X3ZlYzE5UmF3VmVjJExUJFQkQyRBJEdUJDhncm93X29uZTE3aGZkMTdmYmFlNWY1NDY4YmRFrAJ5X1pOODFfJExUJCRSRiQkdTViJHU4JHU1ZCQkdTIwJGFzJHUyMCRhbGxvYy4uZmZpLi5jX3N0ci4uQ1N0cmluZy4ubmV3Li5TcGVjTmV3SW1wbCRHVCQxM3NwZWNfbmV3X2ltcGwxN2hkMjAyODVjYTJjYWFjOGEzRa0CRl9aTjQxXyRMVCRjaGFyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoMGY4MTU0ZWIyNGUzOGI3NEWuAiZfWk40Y29yZTNmbXQ1d3JpdGUxN2hkZmIwMWNhMjBiM2YxNGEwRa8CRV9aTjQwXyRMVCRzdHIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2g5NmY2ZjJiODFhZTM5NzBjRbACU19aTjRjb3JlNGNoYXI3bWV0aG9kczIyXyRMVCRpbXBsJHUyMCRjaGFyJEdUJDE2ZXNjYXBlX2RlYnVnX2V4dDE3aDhmZDE0YmM0ODNkODY2YmRFsQIyX1pONGNvcmUzc3RyMTZzbGljZV9lcnJvcl9mYWlsMTdoNTM4ZWJjYTlkMDI0NTJlMkWyAlxfWk40Y29yZTNmbXQzbnVtNTBfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGVidWckdTIwJGZvciR1MjAkdTMyJEdUJDNmbXQxN2gzZDVkZDY2NTEyMjBjNGM4RbMCR19aTjQyXyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aGEzMTBlNDliMTdmNDIwNjNFtAJcX1pONGNvcmUzZm10M251bTUwXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRlYnVnJHUyMCRmb3IkdTIwJHU2NCRHVCQzZm10MTdoMjE3ZjViN2IyNGQyMGUyZUW1AkdfWk40Ml8kTFQkJFJGJFQkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRlYnVnJEdUJDNmbXQxN2hlNzZiYTNhOGQzN2JkZDc0RbYCR19aTjQyXyRMVCRzdHIkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDEzNTc3NGJjYzY3M2YwOGNFtwIuX1pONGNvcmUzZm10OUZvcm1hdHRlcjNwYWQxN2gzNjliMDJjMTQ3OWFhNjVkRbgCSF9aTjQzXyRMVCRib29sJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g5OGFjZWZlYmViMDgxNWJkRbkCSF9aTjQzXyRMVCRjaGFyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g1YWRiNzliYmUyNjE3MzgxRboCSV9aTjQ0XyRMVCQkUkYkVCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoMGY2MjlhZDYxMWI3N2QwOUW7AktfWk40Y29yZTNmbXQzbnVtM2ltcDIxXyRMVCRpbXBsJHUyMCR1MzIkR1QkMTBfZm10X2lubmVyMTdoNzhlYzZjMDU5MjQ1ZWNjMkW8AjhfWk40Y29yZTNmbXQ5Rm9ybWF0dGVyMTJwYWRfaW50ZWdyYWwxN2hiNzM5YTI5MDY2ZDE5MjE4Rb0CMF9aTjRjb3JlOXBhbmlja2luZzlwYW5pY19mbXQxN2hmZThiZjdmOTNlOTI1ZjFiRb4CTF9aTjRjb3JlOXBhbmlja2luZzExcGFuaWNfY29uc3QyM3BhbmljX2NvbnN0X2Rpdl9ieV96ZXJvMTdoYTQ5NGVjNGQ3Zjk0OGEyM0W/AkBfWk40Y29yZTNmZmk1Y19zdHI0Q1N0cjE5ZnJvbV9ieXRlc193aXRoX251bDE3aDRmMDQ3ZTY2YzNkMjJhZjZFwAIzX1pONGNvcmUzc3RyOGNvbnZlcnRzOWZyb21fdXRmODE3aGZmNDEwNDEwMGIyNzA5YzVFwQI6X1pONGNvcmU5cGFuaWNraW5nMThwYW5pY19ib3VuZHNfY2hlY2sxN2g2MWVkNzViZmRiMmJmMzliRcICS19aTjRjb3JlM2ZtdDNudW0zaW1wMjFfJExUJGltcGwkdTIwJHU2NCRHVCQxMF9mbXRfaW5uZXIxN2gwN2FjZDQyNjY3MmYxZDFkRcMCYl9aTjRjb3JlM2ZtdDNudW0zaW1wNTJfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCRpNjQkR1QkM2ZtdDE3aDYzOWI3ODFmNDNkYWJiYTZFxAJiX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHUzMiRHVCQzZm10MTdoMWM3Mjg0ZGYwYzAzM2U4Y0XFAmJfWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTY0JEdUJDNmbXQxN2hhOGZkODNjZDM1MDkxYTQ1RcYCP19aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIxOXBhZF9mb3JtYXR0ZWRfcGFydHMxN2g4YWNlNmI4ODZmOGQ4OWQyRccCOl9aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsMTdoNGMxOTI0MzIwNWRmOTM3OEXIAixfWk40Y29yZTlwYW5pY2tpbmc1cGFuaWMxN2g2MDk3MTcxODQ1MzIxNTVhRckCSV9aTjRjb3JlM251bTdmbHQyZGVjOHN0cmF0ZWd5NWdyaXN1MTZmb3JtYXRfZXhhY3Rfb3B0MTdoZTdkZWEwNWY3MGQzZDk4M0XKAkZfWk40Y29yZTNudW03Zmx0MmRlYzhzdHJhdGVneTZkcmFnb24xMmZvcm1hdF9leGFjdDE3aGY0ZmExOTcyYmYzMjA4YWFFywI7X1pONGNvcmUzbnVtN2ZsdDJkZWMxN2RpZ2l0c190b19kZWNfc3RyMTdoOGE3ZTFjZDcyNDc2MGU3Y0XMAkVfWk40Y29yZTNmbXQ1ZmxvYXQyOWZsb2F0X3RvX2RlY2ltYWxfY29tbW9uX2V4YWN0MTdoN2Y0NjI1NTYwYjhhZWM5NkXNAkxfWk40Y29yZTNudW03Zmx0MmRlYzhzdHJhdGVneTVncmlzdTE5Zm9ybWF0X3Nob3J0ZXN0X29wdDE3aDhiNGM0NTJmYmRhODIyODRFzgJJX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k2ZHJhZ29uMTVmb3JtYXRfc2hvcnRlc3QxN2g5ZmZkZDViMGQzNzEwNjM5Rc8CSF9aTjRjb3JlM2ZtdDVmbG9hdDMyZmxvYXRfdG9fZGVjaW1hbF9jb21tb25fc2hvcnRlc3QxN2hlMWJhZTQ2Y2ZiOTM3MTQ5RdACYF9aTjRjb3JlM2ZtdDVmbG9hdDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkZjY0JEdUJDNmbXQxN2hjOTdkMDdhMDhiMmFiZWE2RdECRl9aTjRjb3JlM2ZtdDlGb3JtYXR0ZXIxMnBhZF9pbnRlZ3JhbDEyd3JpdGVfcHJlZml4MTdoMzAxNGMyMjFkYjJjNjliOUXSAjZfWk40Y29yZTNzdHI1Y291bnQxNGRvX2NvdW50X2NoYXJzMTdoMzkxZTE5ZjIyYzBhODNjNUXTAkFfWk40Y29yZTNmbXQ5Rm9ybWF0dGVyMjF3cml0ZV9mb3JtYXR0ZWRfcGFydHMxN2g2MzI3YTU3ODAyZTQ0ZjgwRdQCNF9aTjRjb3JlM2ZtdDlGb3JtYXR0ZXI5d3JpdGVfc3RyMTdoYTQyMzJhYWRkYjU2MTQxM0XVAjxfWk40Y29yZTNudW02YmlnbnVtOEJpZzMyeDQwMTBtdWxfZGlnaXRzMTdoN2FhN2UxNjVhODBhZjkxZEXWAjlfWk40Y29yZTNudW02YmlnbnVtOEJpZzMyeDQwOG11bF9wb3cyMTdoNjVlNjY5OWNlZDM4Y2M4YkXXAllfWk40Y29yZTNudW03Zmx0MmRlYzhzdHJhdGVneTVncmlzdTE2Zm9ybWF0X2V4YWN0X29wdDE0cG9zc2libHlfcm91bmQxN2g5ZDkxZmE2M2UzM2U0M2Y3RdgCNV9aTjRjb3JlOXBhbmlja2luZzEzYXNzZXJ0X2ZhaWxlZDE3aGQ3YTU3Yzc2ZDI1M2Q3OWNF2QJCX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k2ZHJhZ29uOW11bF9wb3cxMDE3aGE3NmRkYTc1MTIzZDcxNjdF2gI1X1pONGNvcmUzc3RyMTlzbGljZV9lcnJvcl9mYWlsX3J0MTdoMzQwYWY1N2MyZGJkMzlmM0XbAjJfWk40Y29yZTZvcHRpb24xM3Vud3JhcF9mYWlsZWQxN2g2ZmRiMjUzY2QyOWUwMDgwRdwCZF9aTjcxXyRMVCRjb3JlLi5vcHMuLnJhbmdlLi5SYW5nZSRMVCRJZHgkR1QkJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EZWJ1ZyRHVCQzZm10MTdoODlkYTAzZDVlOTAxZjExM0XdAjlfWk40Y29yZTNzdHI3cGF0dGVybjExU3RyU2VhcmNoZXIzbmV3MTdoOThlZjJkZTNiNjdmODQwYkXeAlBfWk40Y29yZTd1bmljb2RlMTJ1bmljb2RlX2RhdGExNWdyYXBoZW1lX2V4dGVuZDExbG9va3VwX3Nsb3cxN2hkN2IxNzUzZTk4Y2ZkM2JkRd8CPF9aTjRjb3JlN3VuaWNvZGU5cHJpbnRhYmxlMTJpc19wcmludGFibGUxN2gwYmY1MWZkNmRjZTNlNjMyReACS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2gzMTE3NGMyMjE0YzA4ZWI4ReECS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2gyYWI0MGZkMzIwOGY5ZjRlReICS19aTjRjb3JlNXNsaWNlNWluZGV4MTZzbGljZV9pbmRleF9mYWlsOGRvX3BhbmljN3J1bnRpbWUxN2g0OGUwY2ZhOTE3MmFlYzI5ReMCOV9aTjRjb3JlNXNsaWNlNm1lbWNocjE0bWVtY2hyX2FsaWduZWQxN2gyNmNjMGI1YTI1MDc5NTIyReQCMl9aTjRjb3JlNnJlc3VsdDEzdW53cmFwX2ZhaWxlZDE3aGNjMjVjNDIwZDJiYzI4YTJF5QI7X1pONGNvcmU5cGFuaWNraW5nMTlhc3NlcnRfZmFpbGVkX2lubmVyMTdoYjFiN2MwZjliNzU2ODkxZkXmAlhfWk41OV8kTFQkY29yZS4uZm10Li5Bcmd1bWVudHMkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDZiYmNhMGJiNTU4NWE5YzZF5wJeX1pONTdfJExUJGNvcmUuLmZtdC4uRm9ybWF0dGVyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5Xcml0ZSRHVCQxMHdyaXRlX2NoYXIxN2g0NjVkMzMyYTJhODAxZGJiRegCCF9fbXVsdGkzB90VIQAPX19zdGFja19wb2ludGVyAR9HT1QuZGF0YS5pbnRlcm5hbC5fX21lbW9yeV9iYXNlAj5HT1QuZGF0YS5pbnRlcm5hbC5fWk4xMHNlcmRlX2pzb24yZGU1UE9XMTAxN2g1ZTQ5MGQxN2NhNzQzMzIwRQNuR09ULmZ1bmMuaW50ZXJuYWwuX1pONjNfJExUJHNlcmRlX2pzb24uLmVycm9yLi5FcnJvciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoZTg2OTI0M2RkN2UzMTI5MUUEHkdPVC5kYXRhLmludGVybmFsLl9fdGFibGVfYmFzZQV0R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJHU2NCRHVCQzZm10MTdoYThmZDgzY2QzNTA5MWE0NUUGdkdPVC5mdW5jLmludGVybmFsLl9aTjRjb3JlM2ZtdDNudW0zaW1wNTRfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCR1c2l6ZSRHVCQzZm10MTdoYjY1ZDY5YzU3NGQ3NjU4ZUUHXUdPVC5kYXRhLmludGVybmFsLl9aTjEwYXBwcm92ZXJfYjdleHBvcnRzNXN5bm9kNWFnZW50OWNvbnRyYWN0czlfUkVUX0FSRUExN2gyYThjZGRmYjdiNTliYWMwRQhAR09ULmRhdGEuaW50ZXJuYWwuX1pOMTBzZXJkZV9qc29uM3NlcjZFU0NBUEUxN2g3NzczYTFiMWRlOGZmMzdkRQliR09ULmRhdGEuaW50ZXJuYWwuX1pOMTBzZXJkZV9qc29uM3NlcjlGb3JtYXR0ZXIxN3dyaXRlX2NoYXJfZXNjYXBlMTBIRVhfRElHSVRTMTdoZmQyMWM4MWI5NTAwNWRkN0UKckdPVC5mdW5jLmludGVybmFsLl9aTjY3XyRMVCRzZXJkZV9qc29uLi5lcnJvci4uRXJyb3JDb2RlJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2hlZmE5OWUzZTFmZTRhM2M0RQt3R09ULmZ1bmMuaW50ZXJuYWwuX1pONzJfJExUJHNlcmRlX2pzb24uLmVycm9yLi5Kc29uVW5leHBlY3RlZCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNDlhYjZkODQxOTc4MzVkMUUMWkdPVC5mdW5jLmludGVybmFsLl9aTjQzXyRMVCRib29sJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g5OGFjZWZlYmViMDgxNWJkRQ10R09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10M251bTNpbXA1Ml8kTFQkaW1wbCR1MjAkY29yZS4uZm10Li5EaXNwbGF5JHUyMCRmb3IkdTIwJGk2NCRHVCQzZm10MTdoNjM5Yjc4MWY0M2RhYmJhNkUOdkdPVC5mdW5jLmludGVybmFsLl9aTjcxXyRMVCRzZXJkZV9jb3JlLi5kZS4uV2l0aERlY2ltYWxQb2ludCR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSRHVCQzZm10MTdoNGU4M2Y2N2M0ZWMwMjE1N0UPWkdPVC5mdW5jLmludGVybmFsLl9aTjQzXyRMVCRjaGFyJHUyMCRhcyR1MjAkY29yZS4uZm10Li5EaXNwbGF5JEdUJDNmbXQxN2g1YWRiNzliYmUyNjE3MzgxRRByR09ULmZ1bmMuaW50ZXJuYWwuX1pONGNvcmUzZm10NWZsb2F0NTJfJExUJGltcGwkdTIwJGNvcmUuLmZtdC4uRGlzcGxheSR1MjAkZm9yJHUyMCRmNjQkR1QkM2ZtdDE3aGM5N2QwN2EwOGIyYWJlYTZFEXRHT1QuZnVuYy5pbnRlcm5hbC5fWk40Y29yZTNmbXQzbnVtM2ltcDUyXyRMVCRpbXBsJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkdTIwJGZvciR1MjAkdTMyJEdUJDNmbXQxN2gxYzcyODRkZjBjMDMzZThjRRIXR09ULmRhdGEuaW50ZXJuYWwuZXJybm8TkQFHT1QuZnVuYy5pbnRlcm5hbC5fWk45OF8kTFQkc3RkLi5zeXMuLmJhY2t0cmFjZS4uQmFja3RyYWNlTG9jay4ucHJpbnQuLkRpc3BsYXlCYWNrdHJhY2UkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aGRiODVhNGVkZmZjMDM3OWFFFDhHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkNWFsbG9jNEhPT0sxN2hjNzNhMjA1M2U3MmIzYjE4RRVNR09ULmZ1bmMuaW50ZXJuYWwuX1pOM3N0ZDVhbGxvYzI0ZGVmYXVsdF9hbGxvY19lcnJvcl9ob29rMTdoZWE1Y2RlMWQ0M2ZkMDQzMkUWjQFHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkNHN5bmM0bXBtYzV3YWtlcjE3Y3VycmVudF90aHJlYWRfaWQ1RFVNTVkyOF8kdTdiJCR1N2IkY2xvc3VyZSR1N2QkJHU3ZCQyM19fUlVTVF9TVERfSU5URVJOQUxfVkFMMTdoNTUyYTRhOGY3MWUxOWJiMEUXQkdPVC5kYXRhLmludGVybmFsLl9aTjNzdGQ2dGhyZWFkN2N1cnJlbnQyaWQySUQxN2hhNzhhMmY4MmVlYjYxNDczRRg8R09ULmRhdGEuaW50ZXJuYWwuX1pOM3N0ZDlwYW5pY2tpbmc0SE9PSzE3aDc5NzhiZGExZmU2NGMzY2JFGVhHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkOXBhbmlja2luZzExcGFuaWNfY291bnQxOEdMT0JBTF9QQU5JQ19DT1VOVDE3aDNlMDVlYmU5ZDg1NzU3NTZFGkRHT1QuZGF0YS5pbnRlcm5hbC5fWk4zc3RkNnRocmVhZDdjdXJyZW50N0NVUlJFTlQxN2g0OWNmMTRhODlkYjZiOTIyRRsdR09ULmRhdGEuaW50ZXJuYWwuX19oZWFwX2Jhc2UcHEdPVC5kYXRhLmludGVybmFsLl9faGVhcF9lbmQdJEdPVC5kYXRhLmludGVybmFsLl9fd2FzaWxpYmNfZW52aXJvbh5XR09ULmRhdGEuaW50ZXJuYWwuX1pONGNvcmUzbnVtN2ZsdDJkZWM4c3RyYXRlZ3k1Z3Jpc3UxMkNBQ0hFRF9QT1cxMDE3aDgwMmQ3MzMxMDliNDc5ODZFH1hHT1QuZnVuYy5pbnRlcm5hbC5fWk40MV8kTFQkY2hhciR1MjAkYXMkdTIwJGNvcmUuLmZtdC4uRGVidWckR1QkM2ZtdDE3aDBmODE1NGViMjRlMzhiNzRFIGpHT1QuZnVuYy5pbnRlcm5hbC5fWk41OV8kTFQkY29yZS4uZm10Li5Bcmd1bWVudHMkdTIwJGFzJHUyMCRjb3JlLi5mbXQuLkRpc3BsYXkkR1QkM2ZtdDE3aDZiYmNhMGJiNTU4NWE5YzZFCRECAAcucm9kYXRhAQUuZGF0YQD6AQlwcm9kdWNlcnMCCGxhbmd1YWdlAgRSdXN0AANDMTEADHByb2Nlc3NlZC1ieQUFcnVzdGMdMS45My4wICgyNTRiNTk2MDcgMjAyNi0wMS0xOSkFY2xhbmdfMjEuMS40LXdhc2ktc2RrIChodHRwczovL2dpdGh1Yi5jb20vbGx2bS9sbHZtLXByb2plY3QgMjIyZmMxMWYyYjhmMjVmNmEwZjQ5NzYyNzJlZjFiYjdiZjQ5NTIxZCkNd2l0LWNvbXBvbmVudAYwLjIwLjEQd2l0LWJpbmRnZW4tcnVzdAYwLjQ1LjANd2l0LWJpbmRnZW4tYwYwLjE3LjAApAEPdGFyZ2V0X2ZlYXR1cmVzCSsLYnVsay1tZW1vcnkrD2J1bGstbWVtb3J5LW9wdCsWY2FsbC1pbmRpcmVjdC1vdmVybG9uZysOZXh0ZW5kZWQtY29uc3QrCm11bHRpdmFsdWUrD211dGFibGUtZ2xvYmFscysTbm9udHJhcHBpbmctZnB0b2ludCsPcmVmZXJlbmNlLXR5cGVzKwhzaWduLWV4dA');
    const module1 = base64Compile('AGFzbQEAAAABFwRgA39/fwBgAn9/AGAEf39/fwBgAX8AAwYFAAABAgMEBQFwAQUFByAGATAAAAExAAEBMgACATMAAwE0AAQIJGltcG9ydHMBAApDBQ0AIAAgASACQQARAAALDQAgACABIAJBAREAAAsLACAAIAFBAhEBAAsPACAAIAEgAiADQQMRAgALCQAgAEEEEQMACwAvCXByb2R1Y2VycwEMcHJvY2Vzc2VkLWJ5AQ13aXQtY29tcG9uZW50BzAuMjQxLjI');
    const module2 = base64Compile('AGFzbQEAAAABFwRgA39/fwBgAn9/AGAEf39/fwBgAX8AAikGAAEwAAAAATEAAAABMgABAAEzAAIAATQAAwAIJGltcG9ydHMBcAEFBQkLAQBBAAsFAAECAwQALwlwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQENd2l0LWNvbXBvbmVudAcwLjI0MS4y');
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'host:interfaces/logging@2.1.0': {
        error: exports0['1'],
        info: exports0['0'],
      },
      'wasi:cli/environment@0.2.0': {
        'get-environment': exports0['4'],
      },
      'wasi:cli/exit@0.2.0': {
        exit: trampoline3,
      },
      'wasi:cli/stderr@0.2.4': {
        'get-stderr': trampoline2,
      },
      'wasi:io/error@0.2.4': {
        '[method]error.to-debug-string': exports0['2'],
        '[resource-drop]error': trampoline0,
      },
      'wasi:io/streams@0.2.4': {
        '[method]output-stream.blocking-write-and-flush': exports0['3'],
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