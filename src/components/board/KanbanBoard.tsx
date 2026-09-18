import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { ApplicationCard } from "@/components/board/ApplicationCard";
import { applicationsApi } from "@/api/applications";
import { useToast } from "@/hooks/use-toast";
import { APPLICATION_STATUSES } from "@/types";
import type { ApplicationStatus, JobApplication, Paginated } from "@/types";

interface KanbanBoardProps {
  applications: JobApplication[];
  queryKey: readonly unknown[];
  onOpen: (application: JobApplication) => void;
  onAdd: (status: ApplicationStatus) => void;
}

type ColumnState = Record<ApplicationStatus, string[]>;

function buildColumns(applications: JobApplication[]): ColumnState {
  const columns = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, [] as string[]])) as ColumnState;
  for (const app of applications) {
    columns[app.status].push(app.id);
  }
  return columns;
}

export function KanbanBoard({ applications, queryKey, onOpen, onAdd }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const applicationsById = React.useMemo(() => {
    const map = new Map<string, JobApplication>();
    for (const app of applications) map.set(app.id, app);
    return map;
  }, [applications]);

  const [columns, setColumns] = React.useState<ColumnState>(() => buildColumns(applications));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const dragStartStatus = React.useRef<ApplicationStatus | null>(null);
  const isDragging = activeId !== null;

  React.useEffect(() => {
    if (!isDragging) setColumns(buildColumns(applications));
  }, [applications, isDragging]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      applicationsApi.updateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<Paginated<JobApplication>>(queryKey, (old) =>
        old ? { ...old, items: old.items.map((a) => (a.id === updated.id ? updated : a)) } : old,
      );
    },
    onError: () => {
      setColumns(buildColumns(applications));
      toast({
        variant: "destructive",
        title: "Couldn't move application",
        description: "Please try again.",
      });
    },
  });

  function findContainer(id: string): ApplicationStatus | undefined {
    if (APPLICATION_STATUSES.includes(id as ApplicationStatus)) return id as ApplicationStatus;
    return APPLICATION_STATUSES.find((status) => columns[status].includes(id));
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    dragStartStatus.current = findContainer(id) ?? null;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeCardId = String(active.id);
    const overCardId = String(over.id);
    const activeContainer = findContainer(activeCardId);
    const overContainer = findContainer(overCardId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumns((prev) => {
      const activeItems = prev[activeContainer].filter((id) => id !== activeCardId);
      const overItems = [...prev[overContainer]];
      const overIndex = overItems.indexOf(overCardId);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertAt, 0, activeCardId);
      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    const id = String(active.id);
    const finalStatus = findContainer(id);
    const startStatus = dragStartStatus.current;

    setActiveId(null);
    dragStartStatus.current = null;

    if (finalStatus && startStatus && finalStatus !== startStatus) {
      updateStatusMutation.mutate({ id, status: finalStatus });
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    dragStartStatus.current = null;
    setColumns(buildColumns(applications));
  }

  const activeApplication = activeId ? applicationsById.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {APPLICATION_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            applications={columns[status]
              .map((id) => applicationsById.get(id))
              .filter((a): a is JobApplication => Boolean(a))}
            onOpen={onOpen}
            onAdd={onAdd}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApplication ? (
          <ApplicationCard application={activeApplication} onOpen={() => {}} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
