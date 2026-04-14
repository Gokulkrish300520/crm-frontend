"use client";

import { useRouter, usePathname, useParams } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { STANDARD_PIPELINE_STAGES, HierarchicalPipeline, pipelineHelpers, type FlatPipeline } from "@/types/pipeline";
import { STORAGE_KEYS } from "@/constants/storage";
import { readJson } from "@/utils/storage";

// Convert stage names to URL-friendly slugs that match the folder structure
const stageToSlug = (stage: string): string => {
  const slugMap: Record<string, string> = {
    "RFQ": "rfq",
    "Feasibility": "feasibility",
    "Quotation": "quotation",
    "Negotiation": "negotiation",
    "Closed Deals": "closed-deals",
    "Pre-Process": "preprocess",
    "Post-Process": "postprocess",
    "Payment Pending": "payment-pending",
    "Completed Projects": "completed-projects"
  };
  return slugMap[stage] || stage.toLowerCase().replace(/\s+/g, '-');
};

export default function PipelineNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [allPipelines, setAllPipelines] = useState<HierarchicalPipeline[]>([]);
  const [currentPipeline, setCurrentPipeline] = useState<HierarchicalPipeline | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Generate standard pipelines from STANDARD_PIPELINE_STAGES
  const standardPipelines = STANDARD_PIPELINE_STAGES.map(stage => ({
    id: stageToSlug(stage),
    name: stage,
    path: `/crm/pipelines/${stageToSlug(stage)}`
  }));

  useEffect(() => {
    // Load custom pipelines from localStorage
    try {
      const storedPipelines = readJson<FlatPipeline[]>(STORAGE_KEYS.HIERARCHICAL_PIPELINES, []);
      if (storedPipelines.length > 0) {
        const tree = pipelineHelpers.buildTree(storedPipelines);
        setAllPipelines(tree);

        const pipelineId = params?.pipelineId as string;
        if (pipelineId) {
          const found = pipelineHelpers.findById(tree, pipelineId);
          setCurrentPipeline(found);
        } else {
          setCurrentPipeline(null);
        }
      } else {
        setAllPipelines([]);
        setCurrentPipeline(null);
      }
    } catch {
      setAllPipelines([]);
      setCurrentPipeline(null);
    }
  }, [pathname, params]); // Reload when route changes

  const isActive = (path: string) => pathname?.startsWith(path);
  
  const getCurrentPipelineName = () => {
    // If we're on a custom pipeline, show its name
    if (currentPipeline) {
      return currentPipeline.name;
    }
    
    // Otherwise, check standard pipelines
    const current = standardPipelines.find(p => pathname?.startsWith(p.path));
    if (current) return current.name;
    
    return "Pipelines";
  };

  // Get all pipelines (including nested ones and empty pipelines)
  const getAllPipelines = (pipelines: HierarchicalPipeline[]): HierarchicalPipeline[] => {
    const result: HierarchicalPipeline[] = [];
    
    const traverse = (pipeline: HierarchicalPipeline) => {
      // Include all pipelines, even without content
      result.push(pipeline);
      pipeline.children.forEach(traverse);
    };
    
    pipelines.forEach(traverse);
    return result;
  };

  const pipelinesWithContent = getAllPipelines(allPipelines);

  return (
    <div className="bg-white border-b shadow-sm sticky top-12 z-40">
      <div className="flex items-center justify-between px-6">
        {/* Horizontal Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          {/* Standard Pipelines */}
          {standardPipelines.map((pipeline) => (
            <button
              key={pipeline.id}
              onClick={() => router.push(pipeline.path)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-300 ${
                isActive(pipeline.path)
                  ? "text-white border-green-500 bg-blue-900"
                  : "text-gray-600 border-transparent hover:text-gray-900 hover:border-blue-500"
              }`}
            >
              {pipeline.name}
            </button>
          ))}

          {/* Custom Pipelines with Content */}
          {pipelinesWithContent.map((pipeline) => (
            <button
              key={pipeline.id}
              onClick={() => router.push(`/crm/pipelines/${pipeline.id}/rfq`)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-300 ${
                pathname?.includes(pipeline.id)
                  ? "text-white border-green-500 bg-blue-900"
                  : "text-gray-600 border-transparent hover:text-gray-900 hover:border-blue-500"
              }`}
            >
              {pipeline.name}
            </button>
          ))}
        </div>

        {/* Right Side Actions - Dropdown Menu Only */}
        <div className="flex items-center gap-3 ml-4">
          {/* Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-gray-50"
            >
              <span>{getCurrentPipelineName()}</span>
              <ChevronDown size={16} />
            </button>

            {isDropdownOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
                  {/* Standard Pipelines Section */}
                  <div className="p-2 border-b">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Standard Pipelines</p>
                    {standardPipelines.map((pipeline) => (
                      <button
                        key={pipeline.id}
                        onClick={() => {
                          router.push(pipeline.path);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                      >
                        {pipeline.name}
                      </button>
                    ))}
                  </div>

                  {/* Custom Pipelines Section */}
                  {pipelinesWithContent.length > 0 && (
                    <div className="p-2">
                      <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Custom Pipelines</p>
                      {pipelinesWithContent.map((pipeline) => (
                        <button
                          key={pipeline.id}
                          onClick={() => {
                            router.push(`/crm/pipelines/${pipeline.id}/rfq`);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                        >
                          {pipeline.name}
                          {pipeline.parentId && (
                            <span className="ml-2 text-xs text-gray-500">(Sub-Pipeline)</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
