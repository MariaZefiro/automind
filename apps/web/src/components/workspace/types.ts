export type Role = 'USER' | 'REVIEWER' | 'ADMIN';
export type Status = 'PENDING' | 'IN_REVIEW' | 'AWAITING_REVIEW' | 'APPROVED' | 'FORWARDED' | 'RESOLVED' | 'CANCELLED';
export type Department = { id: string; name: string };
export type User = { id: string; name: string; email: string; role: Role; departmentId: string | null; createdAt: string };
export type Classification = {
  id: string;
  category: string;
  priority: string;
  summary: string;
  suggestedAction: string;
  reviewedAt: string | null;
  reviewedBy?: { id?: string; name: string } | null;
  suggestedDepartment?: Department | null;
  source?: 'MANUAL' | 'AI';
  confidence?: number | null;
};
export type RequestItem = {
  id: string;
  title: string;
  description: string;
  status: Status;
  authorId: string;
  author: { id: string; name: string; email: string };
  department: Department | null;
  departmentId: string | null;
  classifications: Classification[];
  createdAt: string;
  updatedAt: string;
};

export const STATUS_LABELS: Record<Status, string> = {
  PENDING: 'Pendente',
  IN_REVIEW: 'Em análise',
  AWAITING_REVIEW: 'Aguardando revisão',
  APPROVED: 'Aprovada',
  FORWARDED: 'Encaminhada',
  RESOLVED: 'Resolvida',
  CANCELLED: 'Cancelada',
};

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Solicitante',
  REVIEWER: 'Revisor',
  ADMIN: 'Administrador',
};
