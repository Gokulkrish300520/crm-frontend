'use client';

import Card from '@/components/Card';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {

  return (
    <div className="min-h-screen px-6 py-12 bg-gradient-to-br from-[#e6f4f1] to-[#d0ebe3] font-poppins">
      
      {/* Add margin-top to move the cards down */}
      <div className="grid max-w-6xl grid-cols-1 gap-10 mx-auto sm:grid-cols-2 mt-[10vh]">

        <Card
          title="CRM"
          subtitle="Workflow Management"
          route="/crm/pipelines/dashboard"
          icon={<LayoutDashboard className="w-12 h-12" />}
        />
      </div>
    </div>
  );
}