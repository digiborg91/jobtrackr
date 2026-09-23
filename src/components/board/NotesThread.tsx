import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { notesApi } from "@/api/notes";
import { useToast } from "@/hooks/use-toast";

interface NotesThreadProps {
  applicationId: string;
}

export function NotesThread({ applicationId }: NotesThreadProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingBody, setEditingBody] = React.useState("");
  const queryKey = ["notes", applicationId] as const;

  const { data: notes, isLoading } = useQuery({
    queryKey,
    queryFn: () => notesApi.list(applicationId),
  });

  const addNote = useMutation({
    mutationFn: (noteBody: string) => notesApi.create(applicationId, noteBody),
    onSuccess: (note) => {
      queryClient.setQueryData(queryKey, (old: typeof notes) => (old ? [note, ...old] : [note]));
      setBody("");
    },
    onError: () => {
      toast({ variant: "destructive", title: "Couldn't add note" });
    },
  });

  const editNote = useMutation({
    mutationFn: ({ noteId, noteBody }: { noteId: string; noteBody: string }) =>
      notesApi.update(noteId, noteBody),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, (old: typeof notes) =>
        old?.map((n) => (n.id === updated.id ? updated : n)),
      );
      setEditingId(null);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Couldn't update note" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => notesApi.remove(noteId),
    onSuccess: (_data, noteId) => {
      queryClient.setQueryData(queryKey, (old: typeof notes) => old?.filter((n) => n.id !== noteId));
    },
    onError: () => {
      toast({ variant: "destructive", title: "Couldn't delete note" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    addNote.mutate(trimmed);
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <Label>Notes</Label>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Textarea
          placeholder="Add a note (interview prep, recruiter contact, follow-up plan…)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
        />
        <Button type="submit" size="sm" className="self-end" disabled={addNote.isPending || !body.trim()}>
          Add note
        </Button>
      </form>

      <div className="max-h-48 space-y-2 overflow-y-auto" data-testid="notes-list">
        {isLoading && <p className="text-xs text-muted-foreground">Loading notes…</p>}
        {notes?.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
        {notes?.map((note) =>
          editingId === note.id ? (
            <div key={note.id} className="flex flex-col gap-2 rounded-md bg-muted/50 p-2 text-sm">
              <Textarea
                value={editingBody}
                onChange={(e) => setEditingBody(e.target.value)}
                rows={2}
                aria-label="Edit note"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={editNote.isPending || !editingBody.trim()}
                  onClick={() => editNote.mutate({ noteId: note.id, noteBody: editingBody.trim() })}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div key={note.id} className="flex items-start justify-between gap-2 rounded-md bg-muted/50 p-2 text-sm">
              <div>
                <p>{note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label="Edit note"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => {
                    setEditingId(note.id);
                    setEditingBody(note.body);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete note"
                  className="text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={() => deleteNote.mutate(note.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
