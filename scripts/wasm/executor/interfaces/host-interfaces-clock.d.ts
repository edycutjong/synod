/** @module Interface host:interfaces/clock@2.1.0 **/
export function nowMs(): bigint;
export type ClockError = ClockErrorNoTxContext;
export interface ClockErrorNoTxContext {
  tag: 'no-tx-context',
}
