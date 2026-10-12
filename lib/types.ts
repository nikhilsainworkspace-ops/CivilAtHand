// Shared record shapes. Server code reads MongoDB documents (dates are Date objects);
// browser code receives the same records as JSON (dates are ISO strings).

export type ContactDoc = {
  category: string;
  name: string;
  phone: string;
  email: string;
  organization: string;
  city: string;
  state: string;
  status: string;
  source: string;
  linkId: string;
  tags: string[];
  notes: string;
  followUpAt: Date | null;
  details: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
};

export type ShareLinkDoc = {
  token: string;
  title: string;
  category: string;
  active: boolean;
  expiresAt: Date | null;
  submissions: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDoc = {
  title: string;
  clientName: string;
  clientContactId: string;
  linkedContactIds: string[];
  city: string;
  state: string;
  projectType: string;
  status: string;
  estimatedValue: number | null;
  startDate: Date | null;
  endDate: Date | null;
  followUpAt: Date | null;
  source: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LoginAttemptDoc = {
  key: string;
  count: number;
  windowStart: Date;
  blockedUntil: Date | null;
};

/** What the browser receives for one contact (JSON). */
export type ContactRecord = {
  _id: string; category: string; name: string; phone: string; email: string; organization: string; city: string; state: string;
  status: string; source: string; linkId?: string; tags: string[]; notes: string; followUpAt?: string | null;
  details: Record<string, string>; createdAt: string; updatedAt: string;
};

export type ShareLinkRecord = {
  _id: string; token: string; title: string; category: string; active: boolean; expiresAt?: string | null;
  submissions: number; shareUrl: string; createdAt: string;
};

export type ProjectRecord = {
  _id: string; title: string; clientName: string; clientContactId: string; linkedContactIds: string[];
  city: string; state: string; projectType: string; status: string; estimatedValue: number | null;
  startDate?: string | null; endDate?: string | null; followUpAt?: string | null; source: string; notes: string;
  createdAt: string; updatedAt: string;
};
