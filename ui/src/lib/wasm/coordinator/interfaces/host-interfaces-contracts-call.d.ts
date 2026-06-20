/** @module Interface host:interfaces/contracts-call@2.1.0 **/
export function invoke(req: InvokeRequest): Uint8Array;
export interface InvokeRequest {
  targetContract: string,
  functionName: string,
  input: Uint8Array,
}
export type InvokeError = InvokeErrorNotAllowlisted | InvokeErrorNoExecutionContext | InvokeErrorTargetUnknown | InvokeErrorDepthExceeded | InvokeErrorReentrant | InvokeErrorInnerFailed | InvokeErrorInnerTrapped | InvokeErrorEncodingFailed;
export interface InvokeErrorNotAllowlisted {
  tag: 'not-allowlisted',
  val: string,
}
export interface InvokeErrorNoExecutionContext {
  tag: 'no-execution-context',
}
export interface InvokeErrorTargetUnknown {
  tag: 'target-unknown',
  val: string,
}
export interface InvokeErrorDepthExceeded {
  tag: 'depth-exceeded',
}
export interface InvokeErrorReentrant {
  tag: 'reentrant',
  val: string,
}
export interface InvokeErrorInnerFailed {
  tag: 'inner-failed',
  val: string,
}
export interface InvokeErrorInnerTrapped {
  tag: 'inner-trapped',
  val: string,
}
export interface InvokeErrorEncodingFailed {
  tag: 'encoding-failed',
  val: string,
}
