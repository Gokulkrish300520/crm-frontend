"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

type Pipeline = {
  id: string;
  name: string;
  createdAt: string;
  stages: Array<{
    id: string;
    name: string;
    items: unknown[];
  }>;
};

function getStorageKeyForTab(tab: string) {
  const map: Record<string, string> = {
    rfq: "rfqData",
    feasibility: "feasibilityData",
    quotation: "quotationData",
    negotiation: "negotiationData",
    "closed-deals": "closedDealsData",
    preprocess: "preprocessData",
    postprocess: "postprocessData",
    "payment-pending": "paymentPendingData",
    "completed-projects": "completedProjectsData",
  };
  return map[tab] || "";
}

export default function SecondarySidebar() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("userPipelines");
    if (stored) {
      try {
        setPipelines(JSON.parse(stored));
      } catch (e) {
        setPipelines([]);
      }
    }
  }, []);

  const persist = (next: Pipeline[]) => {
    setPipelines(next);
    localStorage.setItem("userPipelines", JSON.stringify(next));
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ");

  const handleAddPipeline = () => {
    // Save current displayed pipeline into pipelines and then create a new empty pipeline and navigate to it.
    const parts = pathname?.split("/") || [];
    const currentTab = parts[parts.length - 1] || "rfq";
    const sourceKey = getStorageKeyForTab(currentTab);
  let snapshot: unknown[] = [];
    try {
      snapshot = sourceKey ? JSON.parse(localStorage.getItem(sourceKey) || "[]") : [];
    } catch (e) {
      snapshot = [];
    }

    const existing = pipelines.slice();
    const nextIndex = existing.length + 1;

    const savedPipeline: Pipeline = {
      id: uuidv4(),
      name: `Pipeline ${nextIndex}`,
      createdAt: new Date().toISOString(),
      stages: [
        {
          id: uuidv4(),
          name: capitalize(currentTab),
          items: snapshot,
        },
      ],
    };

    // New empty pipeline that will be shown
    const newPipeline: Pipeline = {
      id: uuidv4(),
      name: `Pipeline ${nextIndex + 1}`,
      createdAt: new Date().toISOString(),
      stages: [],
    };

    const updated = [...existing, savedPipeline, newPipeline];
    persist(updated);

    // Navigate to new pipeline view
    router.push(`/crm/pipelines/custom/${newPipeline.id}`);
  };

  return (
    <aside className="h-full flex flex-col bg-[#124265] text-white border-r border-white/10 w-48">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <h2 className="text-xs font-medium tracking-wide">Team Pipelines</h2>
        <button onClick={handleAddPipeline} className="p-1 hover:bg-white/10 rounded flex items-center gap-2">
          <Plus size={14} />
          <span className="text-[11px]">Add Pipeline</span>
        </button>
      </div>

      {/* Items */}
      <nav className="flex-1 overflow-auto px-2 py-2 text-xs">
        <ul className="space-y-1">
          {pipelines.length === 0 ? (
            <>
              <li>
                <button className="w-full flex items-center px-2 py-1.5 rounded hover:bg-white/10 transition">
                  Clone from a Template
                </button>
              </li>
              <li>
                <button className="w-full flex items-center px-2 py-1.5 rounded hover:bg-white/10 transition">
                  For Teams
                </button>
              </li>
              <li>
                <button className="w-full flex items-center px-2 py-1.5 rounded hover:bg-white/10 transition">
                  For Industries
                </button>
              </li>
            </>
          ) : (
            pipelines.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => router.push(`/crm/pipelines/custom/${p.id}`)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition"
                >
                  {p.name}
                </button>
              </li>
            ))
          )}
        </ul>
      </nav>
    </aside>
  );
}
