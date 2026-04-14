// src/app/crm/admin/data.ts
import { HierarchicalPipeline } from "@/types/pipeline";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// Mock user data - in production, this would come from your auth system
export const MOCK_USERS: User[] = [
  { id: "user1", name: "John Doe", email: "john@example.com", role: "Sales" },
  { id: "user2", name: "Jane Smith", email: "jane@example.com", role: "Marketing" },
  { id: "user3", name: "Bob Johnson", email: "bob@example.com", role: "Operations" },
];

export type RejectionModalInfo = {
  pipelineId: string;
  pipelineName: string;
};

export type PipelineStatistics = {
  total: number;
  pending: number;
  active: number;
  rejected: number;
  completed: number;
};
