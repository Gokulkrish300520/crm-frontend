"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { 
  FileText, 
  CheckCircle, 
  FileEdit, 
  XCircle, 
  Settings, 
  Wrench, 
  DollarSign, 
  PackageCheck,
  MessageSquare,
  ChevronDown
} from "lucide-react";
import { STORAGE_KEYS } from "@/constants/storage";
import { readJson } from "@/utils/storage";
import { type FlatPipeline } from "@/types/pipeline";

interface PipelineStageNavProps {
  pipelineId: string;
}

const PipelineStageNav: React.FC<PipelineStageNavProps> = ({ pipelineId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [pipelineName, setPipelineName] = useState<string>("Pipeline");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Load pipeline name from localStorage
    try {
      const pipelines = readJson<FlatPipeline[]>(STORAGE_KEYS.HIERARCHICAL_PIPELINES, []);
      const pipeline = pipelines.find((entry) => entry.id === pipelineId);
      if (pipeline) {
        setPipelineName(pipeline.name);
      }
    } catch (error) {
      console.error("Error loading pipeline name:", error);
    }
  }, [pipelineId]);

  const stages = [
    { 
      id: "rfq", 
      label: "RFQ", 
      path: `/crm/pipelines/${pipelineId}/rfq`,
      icon: FileText,
      color: "green"
    },
    { 
      id: "feasibility", 
      label: "Feasibility", 
      path: `/crm/pipelines/${pipelineId}/feasibility`,
      icon: CheckCircle,
      color: "purple"
    },
    { 
      id: "quotation", 
      label: "Quotation", 
      path: `/crm/pipelines/${pipelineId}/quotation`,
      icon: FileEdit,
      color: "orange"
    },
    { 
      id: "negotiation", 
      label: "Negotiation", 
      path: `/crm/pipelines/${pipelineId}/negotiation`,
      icon: MessageSquare,
      color: "yellow"
    },
    { 
      id: "preprocess", 
      label: "Pre-Process", 
      path: `/crm/pipelines/${pipelineId}/preprocess`,
      icon: Settings,
      color: "indigo"
    },
    { 
      id: "postprocess", 
      label: "Post-Process", 
      path: `/crm/pipelines/${pipelineId}/postprocess`,
      icon: Wrench,
      color: "pink"
    },
    { 
      id: "payment-pending", 
      label: "Payment Pending", 
      path: `/crm/pipelines/${pipelineId}/payment-pending`,
      icon: DollarSign,
      color: "red"
    },
    { 
      id: "completed-projects", 
      label: "Completed", 
      path: `/crm/pipelines/${pipelineId}/completed-projects`,
      icon: PackageCheck,
      color: "teal"
    },
    { 
      id: "closed-deals", 
      label: "Closed Deals", 
      path: `/crm/pipelines/${pipelineId}/closed-deals`,
      icon: XCircle,
      color: "gray"
    },
  ];

  const isActiveStage = (stagePath: string) => {
    return pathname?.startsWith(stagePath);
  };

  const activeStage = stages.find(s => isActiveStage(s.path)) || stages[0];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colorMap: Record<string, { active: string; inactive: string; hover: string; border: string }> = {
      blue: {
        active: "bg-blue-100 text-blue-700 border-blue-500",
        inactive: "text-gray-600 hover:text-blue-700 hover:bg-blue-50",
        hover: "hover:bg-blue-50",
        border: "border-blue-500"
      },
      green: {
        active: "bg-green-100 text-green-700 border-green-500",
        inactive: "text-gray-600 hover:text-green-700 hover:bg-green-50",
        hover: "hover:bg-green-50",
        border: "border-green-500"
      },
      purple: {
        active: "bg-purple-100 text-purple-700 border-purple-500",
        inactive: "text-gray-600 hover:text-purple-700 hover:bg-purple-50",
        hover: "hover:bg-purple-50",
        border: "border-purple-500"
      },
      orange: {
        active: "bg-orange-100 text-orange-700 border-orange-500",
        inactive: "text-gray-600 hover:text-orange-700 hover:bg-orange-50",
        hover: "hover:bg-orange-50",
        border: "border-orange-500"
      },
      yellow: {
        active: "bg-yellow-100 text-yellow-700 border-yellow-500",
        inactive: "text-gray-600 hover:text-yellow-700 hover:bg-yellow-50",
        hover: "hover:bg-yellow-50",
        border: "border-yellow-500"
      },
      indigo: {
        active: "bg-indigo-100 text-indigo-700 border-indigo-500",
        inactive: "text-gray-600 hover:text-indigo-700 hover:bg-indigo-50",
        hover: "hover:bg-indigo-50",
        border: "border-indigo-500"
      },
      pink: {
        active: "bg-pink-100 text-pink-700 border-pink-500",
        inactive: "text-gray-600 hover:text-pink-700 hover:bg-pink-50",
        hover: "hover:bg-pink-50",
        border: "border-pink-500"
      },
      red: {
        active: "bg-red-100 text-red-700 border-red-500",
        inactive: "text-gray-600 hover:text-red-700 hover:bg-red-50",
        hover: "hover:bg-red-50",
        border: "border-red-500"
      },
      teal: {
        active: "bg-teal-100 text-teal-700 border-teal-500",
        inactive: "text-gray-600 hover:text-teal-700 hover:bg-teal-50",
        hover: "hover:bg-teal-50",
        border: "border-teal-500"
      },
      gray: {
        active: "bg-gray-100 text-gray-700 border-gray-500",
        inactive: "text-gray-600 hover:text-gray-700 hover:bg-gray-50",
        hover: "hover:bg-gray-50",
        border: "border-gray-500"
      },
    };

    return isActive ? colorMap[color].active : colorMap[color].inactive;
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      {/* Pipeline Name Header */}
      <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <span>{pipelineName}</span>
        </h2>
      </div>

      {/* Desktop Stage Navigation */}
      <div className="hidden lg:block overflow-x-auto">
        <nav className="flex min-w-max px-4 py-2" aria-label="Pipeline Stages">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isActive = isActiveStage(stage.path);
            
            return (
              <button
                key={stage.id}
                onClick={() => router.push(stage.path)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 mx-1 rounded-lg text-sm font-medium
                  transition-all duration-200 border-b-2
                  ${isActive ? "border-b-2 shadow-sm" : "border-transparent"}
                  ${getColorClasses(stage.color, isActive)}
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{stage.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile/Tablet Dropdown Navigation */}
      <div className="lg:hidden px-4 py-2">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`
              w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg text-sm font-medium
              border-2 transition-all duration-200
              ${getColorClasses(activeStage.color, true)}
            `}
          >
            <div className="flex items-center gap-2">
              {React.createElement(activeStage.icon, { className: "w-5 h-5" })}
              <span>{activeStage.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
              {stages.map((stage) => {
                const Icon = stage.icon;
                const isActive = isActiveStage(stage.path);
                
                return (
                  <button
                    key={stage.id}
                    onClick={() => {
                      router.push(stage.path);
                      setIsDropdownOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                      transition-all duration-200 border-l-4
                      ${isActive ? `border-l-4 ${getColorClasses(stage.color, true)}` : `border-transparent ${getColorClasses(stage.color, false)}`}
                      hover:bg-gray-50
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{stage.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="h-1 bg-gray-100">
        <div 
          className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 transition-all duration-300"
          style={{ 
            width: `${((stages.findIndex(s => isActiveStage(s.path)) + 1) / stages.length) * 100}%` 
          }}
        />
      </div>
    </div>
  );
};

export default PipelineStageNav;
