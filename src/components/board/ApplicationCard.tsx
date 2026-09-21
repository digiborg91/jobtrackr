import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, ExternalLink, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SOURCE_LABELS } from "@/types";
import type { JobApplication } from "@/types";

function formatSalary(app: JobApplication) {
  if (!app.salaryMin && !app.salaryMax) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (app.salaryMin && app.salaryMax) return `${fmt(app.salaryMin)}–${fmt(app.salaryMax)}`;
  return fmt((app.salaryMin ?? app.salaryMax)!);
}

interface ApplicationCardProps {
  application: JobApplication;
  onOpen: (application: JobApplication) => void;
  dragging?: boolean;
}

export function ApplicationCard({ application, onOpen, dragging }: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
    data: { status: application.status },
  });

  const salary = formatSalary(application);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="application-card"
      data-application-id={application.id}
      className={cn(
        "group rounded-md border border-border bg-card p-3 shadow-sm",
        (isDragging || dragging) && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(application)}
          className="flex-1 text-left text-sm font-semibold leading-snug hover:underline cursor-pointer"
        >
          {application.role}
        </button>
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground opacity-0 outline-none focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
          aria-label={`Move ${application.role} at ${application.company}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground">{application.company}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge data-testid="application-source" variant="outline" className="font-normal">
          {SOURCE_LABELS[application.source]}
        </Badge>
        {salary && (
          <Badge variant="secondary" className="font-normal">
            {salary}
          </Badge>
        )}
        {application.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="font-normal">
            {tag}
          </Badge>
        ))}
      </div>
      {application.nextFollowUp && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Follow up {new Date(application.nextFollowUp).toLocaleDateString()}
        </div>
      )}
      {application.jobUrl && (
        <a
          href={application.jobUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          Listing
        </a>
      )}
    </div>
  );
}
