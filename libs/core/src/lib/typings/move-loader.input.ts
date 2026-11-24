export interface MoveLoaderInput {
  /** The loader to move, with everything on it. */
  loaderId: string;
  /** Where it ends up. Must not be locked by a running inventory count. */
  targetLocationId: string;
  description?: string | null;
  createdBy?: string | null;
}
