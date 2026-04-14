"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

// This is a redirect page that will send users to the specific RFQ under the first pipeline
export default function RFQItemRedirect() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params?.id as string;

  useEffect(() => {
    // Try to load from localStorage
    const storedPipelines = localStorage.getItem('hierarchicalPipelines');
    let defaultPipeline = null;
    
    if (storedPipelines) {
      try {
        const pipelines = JSON.parse(storedPipelines);
        // Use the first pipeline as default, if any exist
        if (pipelines && pipelines.length > 0) {
          defaultPipeline = pipelines[0].id;
        }
      } catch (e) {
        console.error('Error parsing stored pipelines:', e);
      }
    }
    
    // If we found a default pipeline, redirect to the specific RFQ under that pipeline
    if (defaultPipeline && rfqId) {
      router.replace(`/crm/pipelines/${defaultPipeline}/rfq/${rfqId}`);
    } else {
      // If no pipeline exists or no RFQ ID, redirect to the main pipelines page
      router.replace('/crm/pipelines');
    }
  }, [router, rfqId]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-xl text-gray-500">Redirecting to RFQ details...</p>
    </div>
  );
}