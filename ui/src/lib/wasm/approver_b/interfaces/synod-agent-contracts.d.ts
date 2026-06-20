/** @module Interface synod:agent/contracts@1.0.0 **/
export function composeAction(req: GenericInput): Uint8Array;
export function getTrace(req: GenericInput): Uint8Array;
export function evaluate(req: GenericInput): Uint8Array;
export function execute(req: GenericInput): Uint8Array;
export interface GenericInput {
  input?: Uint8Array,
  userProfile?: Uint8Array,
  context?: Uint8Array,
}
