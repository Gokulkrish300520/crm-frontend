"use client";

import { usePathname, useParams } from "next/navigation";
import PipelineNavbar from "../../components/PipelineNavbar";
import PipelineStageNav from "../../components/PipelineStageNav";

export default function PipelinesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const pipelineId = params?.pipelineId as string;
  
  // Check if we're on a dynamic pipeline route (has a UUID-like pattern)
  // Dynamic pipeline routes look like: /crm/pipelines/{uuid}/{stage}
  const isDynamicPipeline = pathname && /\/crm\/pipelines\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Pipeline Navbar - only show on standard pipeline pages (not dynamic pipelines) */}
      {!isDynamicPipeline && <PipelineNavbar />}
      
      {/* Pipeline Stage Navigation - show when we have a valid pipelineId */}
      {isDynamicPipeline && pipelineId && <PipelineStageNav pipelineId={pipelineId} />}
      
      {/* Main Content */}
      <main className="flex-1 px-6 py-8 bg-gray-50">{children}</main>
    </div>
  );
}