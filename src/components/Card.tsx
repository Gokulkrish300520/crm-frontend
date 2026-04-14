'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface CardProps {
  title: string;
  subtitle: string;
  route: string;
  icon: ReactNode;
}

export default function Card({ title, subtitle, route, icon }: CardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(route)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(route)}
      className="flex flex-col items-center p-6 text-center transition-transform transform bg-white border border-gray-200 shadow-md cursor-pointer rounded-2xl hover:shadow-lg hover:scale-105"
    >
      <div className="mb-4 text-4xl text-emerald-700">{icon}</div>
      <h2 className="mb-1 text-xl font-semibold text-gray-800">{title}</h2>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
