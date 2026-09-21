export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

export type ApplicationSource =
  | "linkedin"
  | "referral"
  | "company_website"
  | "job_board"
  | "recruiter"
  | "other";

export const APPLICATION_SOURCES: ApplicationSource[] = [
  "linkedin",
  "referral",
  "company_website",
  "job_board",
  "recruiter",
  "other",
];

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  linkedin: "LinkedIn",
  referral: "Referral",
  company_website: "Company website",
  job_board: "Job board",
  recruiter: "Recruiter",
  other: "Other",
};

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  jobUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  status: ApplicationStatus;
  source: ApplicationSource;
  tags: string[];
  nextFollowUp: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationNote {
  id: string;
  applicationId: string;
  body: string;
  createdAt: string;
}

export interface StatsSummary {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  addedLast7Days: number;
  interviewRate: number;
  offerRate: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}
