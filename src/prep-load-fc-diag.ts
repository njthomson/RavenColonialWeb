import type { Cargo } from './types';

const LS_KEY = 'loadFcLastDiag';

export type LoadFcDiagV1 = {
  v: 1;
  at: number;
  buildId: string;
  marketId: string;
  commander?: string;
  /** Positive lines only — used for partial-apply checks vs `appliedDelta`. */
  loadedItems: Cargo;
  /** Exact JSON body sent on `PATCH …/cargo` (legacy shape: full draft, may include zeros). Omitted in older saved diags. */
  submittedToApi?: Cargo;
  patchResult: Cargo;
  prevFcCargo: Cargo;
  afterFcCargo: Cargo;
  appliedDelta: Cargo;
  partialLines: string[];
  refreshedFromServer: boolean;
};

export function writeLoadFcDiag(entry: Omit<LoadFcDiagV1, 'v'>): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ v: 1, ...entry } satisfies LoadFcDiagV1));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readLoadFcDiag(): LoadFcDiagV1 | undefined {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) { return undefined; }
    const j = JSON.parse(raw) as LoadFcDiagV1;
    if (j?.v !== 1) { return undefined; }
    return j;
  } catch {
    return undefined;
  }
}
