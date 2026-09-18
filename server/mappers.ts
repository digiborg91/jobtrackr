interface UserRow {
  id: string;
  email: string;
  name: string;
}

interface ApplicationRow {
  id: string;
  company: string;
  role: string;
  job_url: string | null;
  salary_min: number | null;
  salary_max: number | null;
  location: string | null;
  status: string;
  tags: string[];
  next_follow_up: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface NoteRow {
  id: string;
  application_id: string;
  body: string;
  created_at: Date | string;
}

export function mapUser(row: UserRow) {
  return { id: row.id, email: row.email, name: row.name };
}

export function mapApplication(row: ApplicationRow) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    location: row.location,
    status: row.status,
    tags: row.tags,
    nextFollowUp: row.next_follow_up,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export function mapNote(row: NoteRow) {
  return {
    id: row.id,
    applicationId: row.application_id,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
