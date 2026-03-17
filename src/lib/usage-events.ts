export const USAGE_UPDATED_EVENT = "hookvox:usage-updated";

export type UsageUpdatedDetail = {
  plan?: string;
  usage?: {
    analyze?: { used?: number; limit?: number; remaining?: number; cycleEnd?: string | null };
    generate?: { used?: number; limit?: number; remaining?: number; cycleEnd?: string | null };
    week?: { analyze?: number; generate?: number };
  };
};

export function emitUsageUpdated(detail: UsageUpdatedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USAGE_UPDATED_EVENT, { detail }));
}

