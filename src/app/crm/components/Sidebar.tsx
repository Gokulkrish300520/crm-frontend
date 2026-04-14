"use client";

import { STORAGE_KEYS } from "@/constants/storage";
import {
    HierarchicalPipeline,
    pipelineHelpers,
    type FlatPipeline
} from "@/types/pipeline";
import { readJson, writeJson } from "@/utils/storage";
import {
    BookOpen,
    Box,
    Calendar,
    CheckCircle,
    Flag,
    Layers,
    Plus,
    Settings,
    Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import PipelineTreeView from "./PipelineTreeView";

type NavItem = {
  id: string;
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number }>;
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

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/crm", Icon: Flag },
  { id: "contacts", label: "Contacts", href: "/crm/contacts", Icon: Users },
  { id: "companies", label: "Companies", href: "/crm/company", Icon: BookOpen },
  { id: "products", label: "Products", href: "", Icon: Box },
  { id: "activities", label: "Activities", href: "", Icon: Calendar },
  { id: "qc1", label: "QC1 Dashboard", href: "/crm/qc1", Icon: CheckCircle },
  { id: "reports", label: "Reports", href: "", Icon: Flag },
  { id: "admin", label: "Admin", href: "/crm/admin", Icon: Settings },
  { id: "settings", label: "Settings", href: "", Icon: Settings },
];

export default function Sidebar({
  isMobileOpen = false,
  onMobileClose,
}: {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hierarchicalPipelines, setHierarchicalPipelines] = useState<
    HierarchicalPipeline[]
  >([]);
  const [pipelinesExpanded, setPipelinesExpanded] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onMobileClose && onMobileClose();
    }
    if (isMobileOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobileOpen, onMobileClose]);

  useEffect(() => {
    try {
      const storedPipelines = readJson<FlatPipeline[]>(
        STORAGE_KEYS.HIERARCHICAL_PIPELINES,
        []
      );
      if (storedPipelines.length > 0) {
        setHierarchicalPipelines(pipelineHelpers.buildTree(storedPipelines));
      } else {
        setHierarchicalPipelines([]);
      }
    } catch {
      setHierarchicalPipelines([]);
    }
  }, []);

  const handleUpdatePipelines = (updated: HierarchicalPipeline[]) => {
    setHierarchicalPipelines(updated);
    const flatPipelines = pipelineHelpers.flattenTree(updated);
    writeJson(STORAGE_KEYS.HIERARCHICAL_PIPELINES, flatPipelines);
  };

  const handleAddPipeline = () => {
    const newPipeline: HierarchicalPipeline = {
      id: crypto.randomUUID(),
      name: `Pipeline ${hierarchicalPipelines.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId: null,
      userId: "current-user",
      userName: "Current User",
      status: "Pending",
      activityLogs: [
        {
          id: crypto.randomUUID(),
          action: "created",
          timestamp: new Date().toISOString(),
          userId: "current-user",
          userName: "Current User",
          details: "Pipeline created",
        },
      ],
      stages: pipelineHelpers.createStandardStages(),
      children: [],
    };

    const updated = [newPipeline, ...hierarchicalPipelines];
    handleUpdatePipelines(updated);
    router.push(`/crm/pipelines/${newPipeline.id}/rfq`);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col ${
          collapsed ? "w-14" : "w-52"
        } bg-[#0f2230] text-white transition-all duration-200 sticky top-0 z-40 h-screen`}
        aria-label="left sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-white/10">
          <div
            className={`flex items-center gap-2 ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            <div className="w-7 h-7 rounded-sm bg-emerald-400 flex items-center justify-center font-bold text-[#042018] text-xs">
              B
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium">Team Pipelines</span>
                <span className="text-[10px] text-white/60">Sales Pipeline</span>
              </div>
            )}
          </div>
          <button
            className="ml-1 p-1 rounded hover:bg-white/10"
            onClick={() => setCollapsed((s) => !s)}
          >
            <Plus
              size={12}
              className={`${collapsed ? "rotate-45" : "rotate-0"} transition`}
            />
          </button>
        </div>

        {/* Updated Nav */}
        <nav className="flex-1 overflow-auto px-1 py-2">
          <ul className="space-y-1">
            {/* Dashboard at top */}
            {NAV_ITEMS.filter((it) => it.id === "dashboard").map((it) => {
              const isActive = pathname?.startsWith(it.href);
              return (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-md mx-1 text-xs hover:bg-white/10 transition ${
                      isActive ? "bg-white/10 font-medium" : "text-white/80"
                    }`}
                  >
                    <span className="flex items-center justify-center w-6">
                      <it.Icon size={16} />
                    </span>
                    {!collapsed && <span>{it.label}</span>}
                  </Link>
                </li>
              );
            })}

            {/* Pipelines section (below Dashboard) */}
            {!collapsed && (
              <li>
                <button
                  onClick={() => setPipelinesExpanded(!pipelinesExpanded)}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded-md mx-1 text-xs hover:bg-white/10 transition w-full ${
                    pathname?.startsWith("/crm/pipelines")
                      ? "bg-white/10 font-medium"
                      : "text-white/80"
                  }`}
                >
                  <span className="flex items-center justify-center w-6">
                    <Layers size={16} />
                  </span>
                  <span className="flex-1 text-left">Pipelines</span>
                  <Plus
                    size={12}
                    className={`${pipelinesExpanded ? "rotate-45" : "rotate-0"} transition`}
                  />
                </button>

                {pipelinesExpanded && (
                  <div className="mt-1 ml-4 space-y-1">
                    <button
                      onClick={handleAddPipeline}
                      className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-xs bg-emerald-600 hover:bg-emerald-700 transition font-medium"
                    >
                      <Plus size={14} />
                      <span>Add Pipeline</span>
                    </button>

                    {hierarchicalPipelines.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1 px-2">
                          Custom Pipelines
                        </div>
                        <PipelineTreeView
                          pipelines={hierarchicalPipelines}
                          onUpdate={handleUpdatePipelines}
                        />
                      </div>
                    )}
                  </div>
                )}
              </li>
            )}

            {/* Other items */}
            {NAV_ITEMS.filter((it) => it.id !== "dashboard").map((it) => {
              const isActive = pathname?.startsWith(it.href);
              return (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-md mx-1 text-xs hover:bg-white/10 transition ${
                      isActive ? "bg-white/10 font-medium" : "text-white/80"
                    }`}
                  >
                    <span className="flex items-center justify-center w-6">
                      <it.Icon size={16} />
                    </span>
                    {!collapsed && <span>{it.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">
              G
            </div>
            {!collapsed && <div className="text-xs">Glonix</div>}
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          isMobileOpen
            ? "visible opacity-60 bg-black/60"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => onMobileClose && onMobileClose()}
      />

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-200 bg-[#0f2230] text-white w-64 flex flex-col ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-emerald-400 flex items-center justify-center font-bold text-[#042018] text-xs">
              B
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium">Team Pipelines</span>
              <span className="text-[10px] text-white/60">Sales Pipeline</span>
            </div>
          </div>
          <button
            className="p-2 rounded hover:bg-white/10"
            onClick={() => onMobileClose && onMobileClose()}
          >
            <Plus size={12} className="rotate-45" />
          </button>
        </div>

        {/* Updated mobile nav */}
        <nav className="flex-1 overflow-auto px-1 py-2">
          <ul className="space-y-1">
            {/* Dashboard first */}
            {NAV_ITEMS.filter((it) => it.id === "dashboard").map((it) => {
              const isActive = pathname?.startsWith(it.href);
              return (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    onClick={() => onMobileClose && onMobileClose()}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-md mx-1 text-xs hover:bg-white/10 transition ${
                      isActive ? "bg-white/10 font-medium" : "text-white/80"
                    }`}
                  >
                    <span className="flex items-center justify-center w-6">
                      <it.Icon size={16} />
                    </span>
                    <span>{it.label}</span>
                  </Link>
                </li>
              );
            })}

            {/* Pipelines section (below Dashboard) */}
            <li>
              <button
                onClick={() => setPipelinesExpanded(!pipelinesExpanded)}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-md mx-1 text-xs hover:bg-white/10 transition w-full ${
                  pathname?.startsWith("/crm/pipelines")
                    ? "bg-white/10 font-medium"
                    : "text-white/80"
                }`}
              >
                <span className="flex items-center justify-center w-6">
                  <Layers size={16} />
                </span>
                <span className="flex-1 text-left">Pipelines</span>
                <Plus
                  size={12}
                  className={`${pipelinesExpanded ? "rotate-45" : "rotate-0"} transition`}
                />
              </button>

              {pipelinesExpanded && (
                <div className="mt-1 ml-4 space-y-1">
                  <button
                    onClick={() => {
                      handleAddPipeline();
                      onMobileClose && onMobileClose();
                    }}
                    className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-xs bg-emerald-600 hover:bg-emerald-700 transition font-medium"
                  >
                    <Plus size={14} />
                    <span>Add Pipeline</span>
                  </button>

                  {hierarchicalPipelines.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1 px-2">
                        Custom Pipelines
                      </div>
                      <PipelineTreeView
                        pipelines={hierarchicalPipelines}
                        onUpdate={handleUpdatePipelines}
                      />
                    </div>
                  )}
                </div>
              )}
            </li>

            {/* Other nav items */}
            {NAV_ITEMS.filter((it) => it.id !== "dashboard").map((it) => {
              const isActive = pathname?.startsWith(it.href);
              return (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    onClick={() => onMobileClose && onMobileClose()}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-md mx-1 text-xs hover:bg-white/10 transition ${
                      isActive ? "bg-white/10 font-medium" : "text-white/80"
                    }`}
                  >
                    <span className="flex items-center justify-center w-6">
                      <it.Icon size={16} />
                    </span>
                    <span>{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-2 py-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">
              G
            </div>
            <div className="text-xs">Glonix</div>
          </div>
        </div>
      </aside>
    </>
  );
}
