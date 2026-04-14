"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, Layers, MoreVertical } from "lucide-react";
import { HierarchicalPipeline, pipelineHelpers } from "@/types/pipeline";

type PipelineTreeNodeProps = {
  pipeline: HierarchicalPipeline;
  depth: number;
  isActive: boolean;
  expandedIds: Set<string>;
  editingId: string | null;
  editingName: string;
  contextMenuId: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onStartEdit: (id: string, currentName: string) => void;
  onSaveEdit: (id: string, newName: string) => void;
  onCancelEdit: () => void;
  onAddSubPipeline: (parentId: string) => void;
  onDelete: (id: string) => void;
  setEditingName: (name: string) => void;
  onToggleContextMenu: (id: string | null) => void;
};

function PipelineTreeNode({
  pipeline,
  depth,
  isActive,
  expandedIds,
  editingId,
  editingName,
  contextMenuId,
  onToggleExpand,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onAddSubPipeline,
  onDelete,
  setEditingName,
  onToggleContextMenu,
}: PipelineTreeNodeProps) {
  const hasChildren = pipeline.children.length > 0;
  const isExpanded = expandedIds.has(pipeline.id);
  const isEditing = editingId === pipeline.id;
  const showContextMenu = contextMenuId === pipeline.id;
  const indentStyle = { paddingLeft: `${depth * 16 + 8}px` };
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        onToggleContextMenu(null);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContextMenu, onToggleContextMenu]);

  return (
    <div className="select-none relative">
      {/* Pipeline Item */}
      <div
        style={indentStyle}
        className={`flex items-center gap-1 py-1.5 px-2 rounded-md mx-1 text-xs transition group hover:bg-white/10 ${
          isActive ? "bg-white/10 font-medium" : "text-white/80"
        }`}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(pipeline.id);
            }}
            className="flex-shrink-0 p-0.5 hover:bg-white/20 rounded"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="flex-shrink-0 w-5" /> // Spacer for alignment
        )}

        {/* Pipeline Icon */}
        <Layers size={14} className="flex-shrink-0" />

        {/* Pipeline Name (editable or clickable) */}
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveEdit(pipeline.id, editingName);
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            onBlur={() => onSaveEdit(pipeline.id, editingName)}
            autoFocus
            className="flex-1 px-2 py-0.5 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onSelect(pipeline.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartEdit(pipeline.id, pipeline.name);
              }}
              className="text-left truncate block w-full"
              title={`Double-click to rename\nUUID: ${pipeline.id}`}
            >
              <div className="font-medium">{pipeline.name}</div>
              <div className="text-[10px] text-white/50 truncate font-mono">
                {pipeline.id}
              </div>
            </button>
          </div>
        )}

        {/* Context Menu Button (visible on hover) */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleContextMenu(showContextMenu ? null : pipeline.id);
            }}
            className="p-0.5 hover:bg-white/20 rounded"
            title="More options"
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Dropdown Context Menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute left-0 mt-1 ml-2 bg-white rounded-md shadow-lg z-50 py-1 min-w-[160px]"
          style={{ marginLeft: `${depth * 16 + 8}px` }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSubPipeline(pipeline.id);
              onToggleContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Plus size={14} />
            Add Sub-Pipeline
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit(pipeline.id, pipeline.name);
              onToggleContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Edit2 size={14} />
            Rename
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pipeline.id);
              onToggleContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {/* Children (recursive) */}
      {hasChildren && isExpanded && (
        <div>
          {pipeline.children.map((child) => (
            <PipelineTreeNodeWrapper
              key={child.id}
              pipeline={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              editingId={editingId}
              editingName={editingName}
              contextMenuId={contextMenuId}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onAddSubPipeline={onAddSubPipeline}
              onDelete={onDelete}
              setEditingName={setEditingName}
              onToggleContextMenu={onToggleContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper to pass active state
function PipelineTreeNodeWrapper(props: Omit<PipelineTreeNodeProps, "isActive">) {
  const pathname = usePathname();
  const isActive = pathname?.includes(`/pipelines/${props.pipeline.id}`);
  return <PipelineTreeNode {...props} isActive={isActive} />;
}

type PipelineTreeViewProps = {
  pipelines: HierarchicalPipeline[];
  onUpdate: (pipelines: HierarchicalPipeline[]) => void;
};

export default function PipelineTreeView({ pipelines, onUpdate }: PipelineTreeViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleContextMenu = (id: string | null) => {
    setContextMenuId(id);
  };

  const handleSelect = (id: string) => {
    // Navigate to pipeline's RFQ stage
    router.push(`/crm/pipelines/${id}/rfq`);
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingId(null);
      return;
    }

    const updateName = (nodes: HierarchicalPipeline[]): HierarchicalPipeline[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { 
            ...node, 
            name: newName.trim(),
            updatedAt: new Date().toISOString() // Update timestamp on rename
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateName(node.children) };
        }
        return node;
      });
    };

    onUpdate(updateName(pipelines));
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleAddSubPipeline = (parentId: string) => {
    const findAndAdd = (nodes: HierarchicalPipeline[]): HierarchicalPipeline[] => {
      return nodes.map((node) => {
        if (node.id === parentId) {
          const newPipeline: HierarchicalPipeline = {
            id: crypto.randomUUID(),
            name: `Sub-Pipeline ${node.children.length + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            parentId: parentId,
            userId: node.userId, // Inherit from parent
            userName: node.userName, // Inherit from parent
            status: "Pending",
            activityLogs: [
              {
                id: crypto.randomUUID(),
                action: "created",
                timestamp: new Date().toISOString(),
                userId: node.userId,
                userName: node.userName,
                details: `Sub-pipeline created under ${node.name}`
              }
            ],
            stages: pipelineHelpers.createStandardStages(), // All 8 standard stages
            children: [],
          };
          // Add sub-pipeline at TOP of children array
          return {
            ...node,
            updatedAt: new Date().toISOString(), // Update parent timestamp
            activityLogs: [
              ...node.activityLogs,
              {
                id: crypto.randomUUID(),
                action: "updated",
                timestamp: new Date().toISOString(),
                userId: node.userId,
                userName: node.userName,
                details: `Added sub-pipeline: ${newPipeline.name}`
              }
            ],
            children: [newPipeline, ...node.children],
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: findAndAdd(node.children) };
        }
        return node;
      });
    };

    const updated = findAndAdd(pipelines);
    onUpdate(updated);
    setExpandedIds((prev) => new Set(prev).add(parentId)); // Auto-expand parent
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this pipeline and all its sub-pipelines?")) {
      const removeNode = (nodes: HierarchicalPipeline[]): HierarchicalPipeline[] => {
        return nodes
          .filter((node) => node.id !== id)
          .map((node) => ({
            ...node,
            children: removeNode(node.children),
          }));
      };

      onUpdate(removeNode(pipelines));
      
      // Navigate away if deleted pipeline was active
      if (pathname?.includes(`/pipelines/${id}`)) {
        router.push('/crm/pipelines/rfq');
      }
    }
  };

  return (
    <div className="space-y-0.5">
      {pipelines.length === 0 ? (
        <div className="px-4 py-3 text-xs text-white/50 text-center italic">
          No custom pipelines yet
        </div>
      ) : (
        pipelines.map((pipeline) => (
          <PipelineTreeNodeWrapper
            key={pipeline.id}
            pipeline={pipeline}
            depth={0}
            expandedIds={expandedIds}
            editingId={editingId}
            editingName={editingName}
            contextMenuId={contextMenuId}
            onToggleExpand={handleToggleExpand}
            onSelect={handleSelect}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onAddSubPipeline={handleAddSubPipeline}
            onDelete={handleDelete}
            setEditingName={setEditingName}
            onToggleContextMenu={handleToggleContextMenu}
          />
        ))
      )}
    </div>
  );
}
