import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 mb-6">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 italic font-serif">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-500 font-medium max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  );
}

