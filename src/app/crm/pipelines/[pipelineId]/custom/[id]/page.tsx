"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Plus, Edit2, Trash2, Settings } from "lucide-react";
import { format } from "date-fns";

// Item type for stage data
type StageItem = {
  id: string;
  date: string;
  department: string;
  company_name: string;
  contact: string;
  state: string;
  deadline: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  [key: string]: unknown; // Allow additional fields
};

type Stage = {
  id: string;
  name: string;
  items: StageItem[];
};

type Pipeline = {
  id: string;
  name: string;
  createdAt: string;
  stages: Stage[];
};

export default function CustomPipelinePage() {
  const router = useRouter();
  const pathname = usePathname();
  const parts = pathname?.split("/") || [];
  const pipelineId = parts[parts.length - 1];

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [activeStageId, setActiveStageId] = useState<string>("");
  const [newStageName, setNewStageName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<StageItem>>({
    company_name: "",
    contact: "",
    department: "",
    description: "",
    priority: "Medium",
    state: "Active",
  });

  useEffect(() => {
    const stored = localStorage.getItem("userPipelines");
    if (stored) {
      try {
        const parsed: Pipeline[] = JSON.parse(stored);
        setPipelines(parsed);
        const found = parsed.find((p) => p.id === pipelineId) || null;
        setPipeline(found);
        setEditedName(found?.name || "");
        // Set first stage as active by default
        if (found && found.stages.length > 0) {
          setActiveStageId(found.stages[0].id);
        }
      } catch {
        setPipelines([]);
      }
    }
  }, [pipelineId]);

  const persist = (nextPipelines: Pipeline[]) => {
    setPipelines(nextPipelines);
    localStorage.setItem("userPipelines", JSON.stringify(nextPipelines));
  };

  const handleRename = () => {
    if (!pipeline || !editedName.trim()) return;
    const updated = pipelines.map((p) => (p.id === pipeline.id ? { ...p, name: editedName.trim() } : p));
    persist(updated);
    setPipeline({ ...pipeline, name: editedName.trim() });
    setIsEditingName(false);
  };

  const handleAddStage = () => {
    if (!pipeline) return;
    const stageName = newStageName.trim() || `Stage ${pipeline.stages.length + 1}`;
    const stage: Stage = { id: uuidv4(), name: stageName, items: [] };
    const updatedPipelines = pipelines.map((p) => (p.id === pipeline.id ? { ...p, stages: [...p.stages, stage] } : p));
    persist(updatedPipelines);
    setPipeline((prev) => prev ? { ...prev, stages: [...prev.stages, stage] } : prev);
    setNewStageName("");
    setActiveStageId(stage.id); // Auto-switch to new stage
  };

  const handleDeleteStage = (stageId: string) => {
    if (!pipeline) return;
    if (pipeline.stages.length === 1) {
      alert("Cannot delete the last stage. Pipeline must have at least one stage.");
      return;
    }
    if (confirm("Are you sure you want to delete this stage and all its items?")) {
      const updatedStages = pipeline.stages.filter((s) => s.id !== stageId);
      const updatedPipelines = pipelines.map((p) => (p.id === pipeline.id ? { ...p, stages: updatedStages } : p));
      persist(updatedPipelines);
      setPipeline((prev) => prev ? { ...prev, stages: updatedStages } : prev);
      // Switch to first stage if deleted stage was active
      if (activeStageId === stageId && updatedStages.length > 0) {
        setActiveStageId(updatedStages[0].id);
      }
    }
  };

  const handleDeletePipeline = () => {
    if (!pipeline) return;
    if (confirm(`Are you sure you want to delete "${pipeline.name}"? This action cannot be undone.`)) {
      const updated = pipelines.filter((p) => p.id !== pipeline.id);
      persist(updated);
      router.push('/crm/pipelines/rfq');
    }
  };

  const handleAddItem = () => {
    if (!pipeline || !activeStageId) return;
    
    const item: StageItem = {
      id: uuidv4(),
      date: new Date().toISOString(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      company_name: newItem.company_name || "New Company",
      contact: newItem.contact || "",
      department: newItem.department || "",
      description: newItem.description || "",
      priority: newItem.priority || "Medium",
      state: newItem.state || "Active",
    };

    const updatedStages = pipeline.stages.map((stage) =>
      stage.id === activeStageId
        ? { ...stage, items: [...stage.items, item] }
        : stage
    );

    const updatedPipelines = pipelines.map((p) =>
      p.id === pipeline.id ? { ...p, stages: updatedStages } : p
    );

    persist(updatedPipelines);
    setPipeline((prev) => prev ? { ...prev, stages: updatedStages } : prev);
    setIsAddingItem(false);
    setNewItem({
      company_name: "",
      contact: "",
      department: "",
      description: "",
      priority: "Medium",
      state: "Active",
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!pipeline || !activeStageId) return;
    if (confirm("Are you sure you want to delete this item?")) {
      const updatedStages = pipeline.stages.map((stage) =>
        stage.id === activeStageId
          ? { ...stage, items: stage.items.filter((item) => item.id !== itemId) }
          : stage
      );

      const updatedPipelines = pipelines.map((p) =>
        p.id === pipeline.id ? { ...p, stages: updatedStages } : p
      );

      persist(updatedPipelines);
      setPipeline((prev) => prev ? { ...prev, stages: updatedStages } : prev);
    }
  };

  const activeStage = pipeline?.stages.find((s) => s.id === activeStageId);

  if (!pipeline) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Pipeline not found.</p>
          <button 
            onClick={() => router.push('/crm/pipelines/rfq')} 
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Back to Pipelines
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Pipeline Tabs (similar to RFQ/Feasibility tabs) */}
      <nav className="mx-auto bg-white px-6 shadow-sm border-b sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 overflow-x-auto flex-1">
            {pipeline.stages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => setActiveStageId(stage.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-300 ${
                  activeStageId === stage.id
                    ? "text-white border-green-500 bg-blue-900"
                    : "text-gray-600 border-transparent hover:text-gray-900 hover:border-blue-500"
                }`}
              >
                {stage.name}
              </button>
            ))}
          </div>
          
          {/* Pipeline Settings Button */}
          <button
            onClick={() => setIsEditingName(!isEditingName)}
            className="ml-4 p-2 text-gray-600 hover:text-blue-900 transition"
            title="Pipeline Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="mx-auto px-6 py-8">
        {/* Pipeline Settings Section (collapsible) */}
        {isEditingName && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-blue-900">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings size={20} />
              Pipeline Settings
            </h3>
            
            {/* Pipeline Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pipeline Name</label>
              <div className="flex gap-2">
                <input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter pipeline name"
                />
                <button
                  onClick={handleRename}
                  className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Add New Stage */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add New Stage</label>
              <div className="flex gap-2">
                <input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter stage name"
                />
                <button
                  onClick={handleAddStage}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Stage
                </button>
              </div>
            </div>

            {/* Manage Stages */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Manage Stages</label>
              <div className="space-y-2">
                {pipeline.stages.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">{stage.name} ({stage.items.length} items)</span>
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      className="text-red-600 hover:text-red-800"
                      disabled={pipeline.stages.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={handleDeletePipeline}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Pipeline
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}

        {/* Active Stage Content (RFQ-like structure) */}
        {activeStage && (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{activeStage.name}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeStage.items.length} item{activeStage.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setIsAddingItem(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Item
              </button>
            </div>

            {/* Add Item Form */}
            {isAddingItem && (
              <div className="p-6 bg-blue-50 border-b">
                <h3 className="font-semibold mb-4">Add New Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Company Name *</label>
                    <input
                      value={newItem.company_name || ""}
                      onChange={(e) => setNewItem({ ...newItem, company_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact</label>
                    <input
                      value={newItem.contact || ""}
                      onChange={(e) => setNewItem({ ...newItem, contact: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Contact person"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Department</label>
                    <input
                      value={newItem.department || ""}
                      onChange={(e) => setNewItem({ ...newItem, department: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Department"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={newItem.priority || "Medium"}
                      onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as "High" | "Medium" | "Low" })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={newItem.description || ""}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    Save Item
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingItem(false);
                      setNewItem({
                        company_name: "",
                        contact: "",
                        department: "",
                        description: "",
                        priority: "Medium",
                        state: "Active",
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-100 text-green-800">
                  <tr>
                    <th className="p-3 text-left border">Date</th>
                    <th className="p-3 text-left border">Company Name</th>
                    <th className="p-3 text-left border">Department</th>
                    <th className="p-3 text-left border">Deadline</th>
                    <th className="p-3 text-left border">Priority</th>
                    <th className="p-3 text-left border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStage.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No items in this stage. Click &quot;Add Item&quot; to get started.
                      </td>
                    </tr>
                  ) : (
                    activeStage.items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-green-50">
                        <td className="p-3 border">
                          {item.date ? format(new Date(item.date), "dd/MM/yyyy") : "-"}
                        </td>
                        <td className="p-3 border font-medium">{item.company_name}</td>
                        <td className="p-3 border">{item.department || "-"}</td>
                        <td className="p-3 border">
                          {item.deadline ? format(new Date(item.deadline), "dd/MM/yyyy") : "-"}
                        </td>
                        <td className="p-3 border">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              item.priority === "High"
                                ? "bg-red-100 text-red-800"
                                : item.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.priority}
                          </span>
                        </td>
                        <td className="p-3 border">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="px-3 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> This pipeline works just like RFQ, Feasibility, and other standard pipelines. 
            Use the tabs above to switch between stages, and manage your workflow efficiently.
          </p>
        </div>
      </main>
    </div>
  );
}
