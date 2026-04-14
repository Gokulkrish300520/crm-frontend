"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This is a redirect page that will send users to the first pipeline's RFQ section
export default function RFQRedirect() {
  const router = useRouter();

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
    
    // If we found a default pipeline, redirect to its RFQ section
    if (defaultPipeline) {
      router.replace(`/crm/pipelines/${defaultPipeline}/rfq`);
    } else {
      // If no pipeline exists, redirect to the main pipelines page
      // which will create a default pipeline
      router.replace('/crm/pipelines');
    }
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-xl text-gray-500">Redirecting to RFQ section...</p>
    </div>
  );
}