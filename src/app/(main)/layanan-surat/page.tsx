'use client';

import { LetterService } from './_components/letter-service';
import { TrackTicket } from './_components/track-ticket';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LayananSuratPublicPage() {
  const [activeTab, setActiveTab] = useState<'buat' | 'lacak'>('buat');

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl space-y-8">
      {/* Header Tab Switcher */}
      <div className="flex justify-center gap-3">
        <Button
          onClick={() => setActiveTab('buat')}
          variant={activeTab === 'buat' ? 'default' : 'outline'}
          className={cn(
            "rounded-2xl h-12 px-6 font-black uppercase text-xs tracking-widest transition-all",
            activeTab === 'buat' ? "bg-primary shadow-lg shadow-primary/20" : "bg-white"
          )}
        >
          <FileText className="mr-2 h-4 w-4" /> Pengajuan Surat Mandiri
        </Button>
        <Button
          onClick={() => setActiveTab('lacak')}
          variant={activeTab === 'lacak' ? 'default' : 'outline'}
          className={cn(
            "rounded-2xl h-12 px-6 font-black uppercase text-xs tracking-widest transition-all",
            activeTab === 'lacak' ? "bg-slate-900 shadow-lg" : "bg-white"
          )}
        >
          <Search className="mr-2 h-4 w-4" /> Lacak Status Tiket Surat
        </Button>
      </div>

      {activeTab === 'buat' ? (
        <LetterService isAdmin={false} />
      ) : (
        <TrackTicket />
      )}
    </div>
  );
}
