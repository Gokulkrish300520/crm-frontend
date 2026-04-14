/**
 * Hierarchical Pipeline System Types
 * 
 * This file defines the data structure for a folder-like pipeline hierarchy
 * similar to file explorer navigation.
 * 
 * Structure:
 * Main Pipeline
 * ├── Sub-Pipeline 1
 * │   ├── Sub-Pipeline 1.1
 * │   └── Sub-Pipeline 1.2
 * └── Sub-Pipeline 2
 */

// Base item that appears in pipeline stages
export type PipelineItem = {
  id: string;
  date: string;
  department: string;
  company_name: string;
  contact: string;
  state: string;
  deadline: string;
  description: string;
  fileName?: string;
  source: string;
  priority: "High" | "Medium" | "Low";
  [key: string]: unknown; // Allow additional fields
};

// A stage within a pipeline (like RFQ, Feasibility, etc.)
export type PipelineStage = {
  id: string;
  name: string;
  items: PipelineItem[];
};

// Pipeline status types
export type PipelineStatus = "Active" | "Pending" | "Rejected" | "Completed";

// Rejection information
export type RejectionInfo = {
  reason: string;
  rejectedAt: string;
  rejectedBy: string; // Admin ID or name
};

// Activity log entry
export type ActivityLog = {
  id: string;
  action: string; // "created" | "updated" | "completed" | "approved" | "rejected"
  timestamp: string;
  userId?: string;
  userName?: string;
  details?: string;
};

// Standard pipeline stages that all pipelines should have
// Order: RFQ → Feasibility → Quotation → Negotiation → Closed Deals → Pre-Process → Post-Process → Payment Pending → Completed Projects
export const STANDARD_PIPELINE_STAGES = [
  "RFQ",
  "Feasibility",
  "Quotation",
  "Negotiation",
  "Closed Deals",
  "Pre-Process",
  "Post-Process",
  "Payment Pending",
  "Completed Projects"
] as const;

// Hierarchical pipeline node
export type HierarchicalPipeline = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string; // Last modification timestamp
  completedAt?: string; // When pipeline reached "Completed" status
  parentId: string | null; // null for top-level pipelines
  userId: string; // Owner of the pipeline (REQUIRED for admin view)
  userName: string; // Owner's display name
  status: PipelineStatus; // Pipeline status
  rejectionInfo?: RejectionInfo; // Only present if status is "Rejected"
  activityLogs: ActivityLog[]; // Complete activity history
  isExpanded?: boolean; // UI state for expand/collapse
  stages: PipelineStage[]; // Each pipeline has its own stages (must include all 8 standard stages)
  children: HierarchicalPipeline[]; // Nested sub-pipelines
};

// Flattened version for easier storage and updates
export type FlatPipeline = Omit<HierarchicalPipeline, 'children'> & {
  childIds: string[]; // Array of child pipeline IDs
};

// UI state for sidebar
export type PipelineSidebarState = {
  expandedIds: Set<string>; // Which pipelines are expanded
  editingId: string | null; // Which pipeline name is being edited
  activeId: string | null; // Which pipeline is currently selected
};

// Helper type for localStorage
export type PipelinesStorage = {
  pipelines: FlatPipeline[];
  lastUpdated: string;
};

// Helper functions for tree operations
export const pipelineHelpers = {
  /**
   * Create standard pipeline stages (RFQ, Feasibility, etc.)
   */
  createStandardStages(): PipelineStage[] {
    return STANDARD_PIPELINE_STAGES.map(name => ({
      id: crypto.randomUUID(),
      name,
      items: []
    }));
  },

  /**
   * Convert flat array to hierarchical tree
   */
  buildTree(flatPipelines: FlatPipeline[]): HierarchicalPipeline[] {
    const map = new Map<string, HierarchicalPipeline>();
    const roots: HierarchicalPipeline[] = [];

    // Create all nodes
    flatPipelines.forEach(flat => {
      map.set(flat.id, {
        ...flat,
        children: []
      });
    });

    // Build tree structure
    flatPipelines.forEach(flat => {
      const node = map.get(flat.id)!;
      if (flat.parentId === null) {
        roots.push(node);
      } else {
        const parent = map.get(flat.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return roots;
  },

  /**
   * Convert hierarchical tree to flat array
   */
  flattenTree(trees: HierarchicalPipeline[]): FlatPipeline[] {
    const result: FlatPipeline[] = [];

    const traverse = (node: HierarchicalPipeline) => {
      const { children, ...rest } = node;
      result.push({
        ...rest,
        childIds: children.map(c => c.id)
      });
      children.forEach(traverse);
    };

    trees.forEach(traverse);
    return result;
  },

  /**
   * Find a pipeline by ID in tree
   */
  findById(trees: HierarchicalPipeline[], id: string): HierarchicalPipeline | null {
    for (const tree of trees) {
      if (tree.id === id) return tree;
      const found = this.findById(tree.children, id);
      if (found) return found;
    }
    return null;
  },

  /**
   * Get depth/level of a pipeline
   */
  getDepth(pipelines: FlatPipeline[], id: string): number {
    const pipeline = pipelines.find(p => p.id === id);
    if (!pipeline || pipeline.parentId === null) return 0;
    return 1 + this.getDepth(pipelines, pipeline.parentId);
  },

  /**
   * Check if pipeline has content (any items in any stage)
   * Only pipelines with content should be saved
   */
  hasContent(pipeline: HierarchicalPipeline | FlatPipeline): boolean {
    return pipeline.stages.some(stage => 
      Array.isArray(stage.items) && stage.items.length > 0
    );
  },

  /**
   * Check if pipeline should be saved
   * Returns true only if pipeline has at least one item in any stage
   */
  shouldSave(pipeline: HierarchicalPipeline): boolean {
    return this.hasContent(pipeline);
  },

  /**
   * Add activity log entry to pipeline
   */
  addActivityLog(
    pipeline: HierarchicalPipeline, 
    action: string, 
    userId?: string, 
    userName?: string, 
    details?: string
  ): HierarchicalPipeline {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      action,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      details
    };

    return {
      ...pipeline,
      activityLogs: [...pipeline.activityLogs, log],
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Get all descendant IDs
   */
  getDescendantIds(tree: HierarchicalPipeline): string[] {
    const ids: string[] = [];
    const traverse = (node: HierarchicalPipeline) => {
      node.children.forEach(child => {
        ids.push(child.id);
        traverse(child);
      });
    };
    traverse(tree);
    return ids;
  }
};
