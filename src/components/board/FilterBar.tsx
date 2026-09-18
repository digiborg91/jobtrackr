import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApplicationFilters } from "@/api/applications";

interface FilterBarProps {
  filters: ApplicationFilters;
  onChange: (filters: ApplicationFilters) => void;
  onNewApplication: () => void;
}

export function FilterBar({ filters, onChange, onNewApplication }: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative w-64">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search applications"
          placeholder="Search company or role…"
          className="pl-8"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        />
      </div>
      <Input
        aria-label="Filter by tag"
        placeholder="Filter by tag…"
        className="w-40"
        value={filters.tag ?? ""}
        onChange={(e) => onChange({ ...filters, tag: e.target.value || undefined })}
      />
      <Select
        value={filters.sort ?? "newest"}
        onValueChange={(value) => onChange({ ...filters, sort: value as ApplicationFilters["sort"] })}
      >
        <SelectTrigger aria-label="Sort applications" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="company">Company A–Z</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex-1" />
      <Button onClick={onNewApplication}>New application</Button>
    </div>
  );
}
