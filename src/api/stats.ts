import { api } from "@/api/client";
import type { StatsSummary } from "@/types";

export const statsApi = {
  summary: () => api.get<StatsSummary>("/stats/summary"),
};
