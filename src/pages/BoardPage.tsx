import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar } from "@/components/board/FilterBar";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { ApplicationDialog } from "@/components/board/ApplicationDialog";
import { applicationsApi, type ApplicationFilters } from "@/api/applications";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ApplicationStatus, JobApplication } from "@/types";

const BOARD_PAGE_SIZE = 100;

export function BoardPage() {
  const [filters, setFilters] = React.useState<ApplicationFilters>({ sort: "newest" });
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const debouncedTag = useDebouncedValue(filters.tag, 300);

  const queryKey = [
    "applications",
    "board",
    { search: debouncedSearch, tag: debouncedTag, sort: filters.sort },
  ] as const;

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () =>
      applicationsApi.list({
        search: debouncedSearch,
        tag: debouncedTag,
        sort: filters.sort,
        pageSize: BOARD_PAGE_SIZE,
      }),
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingApplication, setEditingApplication] = React.useState<JobApplication | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<ApplicationStatus>("wishlist");

  function handleOpen(application: JobApplication) {
    setEditingApplication(application);
    setDialogOpen(true);
  }

  function handleAdd(status: ApplicationStatus) {
    setEditingApplication(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  }

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} onNewApplication={() => handleAdd("wishlist")} />

      {isLoading && <p className="text-sm text-muted-foreground">Loading board…</p>}
      {isError && <p className="text-sm text-destructive">Couldn't load your applications. Try refreshing.</p>}

      {data && (
        <KanbanBoard
          applications={data.items}
          queryKey={queryKey}
          onOpen={handleOpen}
          onAdd={handleAdd}
        />
      )}

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editingApplication}
        defaultStatus={defaultStatus}
        queryKey={queryKey}
      />
    </div>
  );
}
