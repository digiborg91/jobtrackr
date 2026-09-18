import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/api/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/types";

const STATUS_BAR_COLOR: Record<string, string> = {
  wishlist: "bg-status-wishlist",
  applied: "bg-status-applied",
  interviewing: "bg-status-interviewing",
  offer: "bg-status-offer",
  rejected: "bg-status-rejected",
};

export function StatsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: statsApi.summary,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading stats…</p>;
  if (isError || !data) return <p className="text-sm text-destructive">Couldn't load stats.</p>;

  const maxCount = Math.max(1, ...APPLICATION_STATUSES.map((s) => data.byStatus[s] ?? 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-testid="stats-cards">
        <Card>
          <CardHeader>
            <CardTitle>Total applications</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold" data-testid="stat-total">
            {data.total}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Added last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold" data-testid="stat-added-7d">
            {data.addedLast7Days}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Interview rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold" data-testid="stat-interview-rate">
            {Math.round(data.interviewRate * 100)}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Offer rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold" data-testid="stat-offer-rate">
            {Math.round(data.offerRate * 100)}%
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications by status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3" data-testid="status-funnel">
          {APPLICATION_STATUSES.map((status) => {
            const count = data.byStatus[status] ?? 0;
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-muted-foreground">{STATUS_LABELS[status]}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${STATUS_BAR_COLOR[status]}`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-sm font-medium" data-testid={`stat-count-${status}`}>
                  {count}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
