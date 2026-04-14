"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pipelineHelpers, type HierarchicalPipeline, type FlatPipeline } from '@/types/pipeline';
import { STORAGE_KEYS } from '@/constants/storage';
import { readJson, writeJson } from '@/utils/storage';

const createDefaultPipeline = (): HierarchicalPipeline => {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Default Pipeline',
    createdAt: timestamp,
    updatedAt: timestamp,
    parentId: null,
    userId: 'system',
    userName: 'System Generated',
    status: 'Pending',
    activityLogs: [
      {
        id: crypto.randomUUID(),
        action: 'created',
        timestamp,
        userId: 'system',
        userName: 'System',
        details: 'Default pipeline created automatically'
      }
    ],
    stages: pipelineHelpers.createStandardStages(),
    children: []
  };
};

export default function PipelinesPage() {
  const router = useRouter();

  useEffect(() => {
    let targetPipelineId: string | null = null;

    try {
      const storedPipelines = readJson<FlatPipeline[]>(STORAGE_KEYS.HIERARCHICAL_PIPELINES, []);
      if (storedPipelines.length > 0) {
        const topLevel = storedPipelines.find((pipeline) => pipeline.parentId === null);
        targetPipelineId = (topLevel ?? storedPipelines[0]).id;
      } else {
        const defaultPipeline = createDefaultPipeline();
        const flattened = pipelineHelpers.flattenTree([defaultPipeline]);
        writeJson(STORAGE_KEYS.HIERARCHICAL_PIPELINES, flattened);
        targetPipelineId = defaultPipeline.id;
      }
    } catch (error) {
      console.error('Failed to initialise pipelines:', error);
      const defaultPipeline = createDefaultPipeline();
      const flattened = pipelineHelpers.flattenTree([defaultPipeline]);
      writeJson(STORAGE_KEYS.HIERARCHICAL_PIPELINES, flattened);
      targetPipelineId = defaultPipeline.id;
    }

    if (targetPipelineId) {
      router.push(`/crm/pipelines/${targetPipelineId}/rfq`);
    }
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-xl text-gray-500">Loading pipeline...</p>
    </div>
  );
}