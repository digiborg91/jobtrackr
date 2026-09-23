import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApplicationCard } from "@/components/board/ApplicationCard";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus, JobApplication } from "@/types";
import { STATUS_LABELS } from "@/types";

const STATUS_DOT: Record<ApplicationStatus, string> = {
  wishlist: "bg-status-wishlist",
  applied: "bg-status-applied",
  interviewing: "bg-status-interviewing",
  offer: "bg-status-offer",
  rejected: "bg-status-rejected",
};

interface KanbanColumnProps {
  status: ApplicationStatus;
  applications: JobApplication[];
  onOpen: (application: JobApplication) => void;
  onAdd: (status: ApplicationStatus) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

export function KanbanColumn({ status, applications, onOpen, onAdd, onToggleFavorite }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
          <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
          <span className="text-xs text-muted-foreground" data-testid={`column-count-${status}`}>
            {applications.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label={`Add application to ${STATUS_LABELS[status]}`}
          onClick={() => onAdd(status)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        data-testid={`column-${status}`}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-b-lg p-2 transition-colors",
          isOver && "bg-accent",
        )}
      >
        <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onOpen={onOpen}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </SortableContext>
        {applications.length === 0 && (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">No applications</p>
        )}
      </div>
    </div>
  );
}
