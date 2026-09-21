import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotesThread } from "@/components/board/NotesThread";
import { applicationsApi, type ApplicationInput } from "@/api/applications";
import { useToast } from "@/hooks/use-toast";
import { APPLICATION_SOURCES, APPLICATION_STATUSES, SOURCE_LABELS, STATUS_LABELS } from "@/types";
import type { ApplicationSource, ApplicationStatus, JobApplication, Paginated } from "@/types";

const schema = z
  .object({
    company: z.string().min(1, "Company is required"),
    role: z.string().min(1, "Role is required"),
    status: z.enum(APPLICATION_STATUSES as [ApplicationStatus, ...ApplicationStatus[]]),
    source: z.enum(APPLICATION_SOURCES as [ApplicationSource, ...ApplicationSource[]], {
      errorMap: () => ({ message: "Source is required" }),
    }),
    jobUrl: z.union([z.literal(""), z.string().url("Enter a valid URL")]),
    location: z.string(),
    salaryMin: z.union([z.literal(""), z.coerce.number().nonnegative()]),
    salaryMax: z.union([z.literal(""), z.coerce.number().nonnegative()]),
    tags: z.string(),
    nextFollowUp: z.string(),
  })
  .refine(
    (data) => data.salaryMin === "" || data.salaryMax === "" || Number(data.salaryMin) <= Number(data.salaryMax),
    { message: "Minimum salary must be less than or equal to maximum", path: ["salaryMax"] },
  );

type FormValues = z.infer<typeof schema>;

interface ApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: JobApplication | null;
  defaultStatus: ApplicationStatus;
  queryKey: readonly unknown[];
}

function toFormValues(application: JobApplication | null, defaultStatus: ApplicationStatus): FormValues {
  if (!application) {
    return {
      company: "",
      role: "",
      status: defaultStatus,
      // No sensible default — the field is mandatory, so the select starts
      // empty and the user has to actively choose one.
      source: "" as FormValues["source"],
      jobUrl: "",
      location: "",
      salaryMin: "",
      salaryMax: "",
      tags: "",
      nextFollowUp: "",
    };
  }
  return {
    company: application.company,
    role: application.role,
    status: application.status,
    source: application.source,
    jobUrl: application.jobUrl ?? "",
    location: application.location ?? "",
    salaryMin: application.salaryMin ?? "",
    salaryMax: application.salaryMax ?? "",
    tags: application.tags.join(", "),
    nextFollowUp: application.nextFollowUp ?? "",
  };
}

export function ApplicationDialog({
  open,
  onOpenChange,
  application,
  defaultStatus,
  queryKey,
}: ApplicationDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditing = Boolean(application);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toFormValues(application, defaultStatus),
  });

  const saveMutation = useMutation({
    mutationFn: (input: ApplicationInput) =>
      application ? applicationsApi.update(application.id, input) : applicationsApi.create(input),
    onSuccess: (saved) => {
      queryClient.setQueryData<Paginated<JobApplication>>(queryKey, (old) => {
        if (!old) return old;
        const exists = old.items.some((a) => a.id === saved.id);
        return {
          ...old,
          items: exists
            ? old.items.map((a) => (a.id === saved.id ? saved : a))
            : [saved, ...old.items],
          total: exists ? old.total : old.total + 1,
        };
      });
      toast({ title: isEditing ? "Application updated" : "Application added" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Couldn't save application", description: "Please check the form and try again." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => applicationsApi.remove(application!.id),
    onSuccess: () => {
      queryClient.setQueryData<Paginated<JobApplication>>(queryKey, (old) =>
        old ? { ...old, items: old.items.filter((a) => a.id !== application!.id), total: old.total - 1 } : old,
      );
      toast({ title: "Application deleted" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Couldn't delete application" });
    },
  });

  function onSubmit(values: FormValues) {
    const tags = Array.from(
      new Set(
        values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );

    saveMutation.mutate({
      company: values.company,
      role: values.role,
      status: values.status,
      source: values.source,
      jobUrl: values.jobUrl || null,
      location: values.location || null,
      salaryMin: values.salaryMin === "" ? null : Number(values.salaryMin),
      salaryMax: values.salaryMax === "" ? null : Number(values.salaryMax),
      tags,
      nextFollowUp: values.nextFollowUp || null,
    });
  }

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit application" : "New application"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register("company")} />
              {errors.company && <p role="alert" className="text-xs text-destructive">{errors.company.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Input id="role" {...register("role")} />
              {errors.role && <p role="alert" className="text-xs text-destructive">{errors.role.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Remote" {...register("location")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source">Source</Label>
            <Controller
              name="source"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select a source…" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {SOURCE_LABELS[source]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.source && <p role="alert" className="text-xs text-destructive">{errors.source.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jobUrl">Job listing URL</Label>
            <Input id="jobUrl" placeholder="https://…" {...register("jobUrl")} />
            {errors.jobUrl && <p role="alert" className="text-xs text-destructive">{errors.jobUrl.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="salaryMin">Salary min</Label>
              <Input id="salaryMin" type="number" inputMode="numeric" {...register("salaryMin")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salaryMax">Salary max</Label>
              <Input id="salaryMax" type="number" inputMode="numeric" {...register("salaryMax")} />
              {errors.salaryMax && <p role="alert" className="text-xs text-destructive">{errors.salaryMax.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextFollowUp">Follow up</Label>
              <Input id="nextFollowUp" type="date" {...register("nextFollowUp")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" placeholder="remote, dream-job" {...register("tags")} />
          </div>

          <DialogFooter className="items-center sm:justify-between">
            {isEditing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
              {isEditing ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </form>

        {application && <NotesThread applicationId={application.id} />}
      </DialogContent>
    </Dialog>
  );
}
