
'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Ticket, FilePlus2, Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

interface SubmissionSuccessProps {
  ticketNumber: string;
  onReset: () => void;
}

export function SubmissionSuccess({ ticketNumber, onReset }: SubmissionSuccessProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadImage = async () => {
    if (cardRef.current === null) return;

    setIsDownloading(true);
    try {
      // Tunggu sebentar agar render UI stabil
      await new Promise(resolve => setTimeout(resolve, 300));

      const options = {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2, // Kualitas lebih tajam
        style: {
          margin: '0',
          padding: '20px',
        }
      };

      let dataUrl;
      try {
        // Percobaan pertama: Normal
        dataUrl = await toPng(cardRef.current, options);
      } catch (innerError) {
        // Percobaan kedua: Tanpa font embedding jika terjadi SecurityError
        console.warn("Mencoba mengunduh tanpa font embedding karena pembatasan keamanan CSS.");
        dataUrl = await toPng(cardRef.current, { ...options, fontEmbedCSS: '' });
      }

      const link = document.createElement('a');
      link.download = `tiket-desa-${ticketNumber}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Berhasil",
        description: "Tiket telah disimpan ke perangkat Anda.",
      });
    } catch (err) {
      console.error('Gagal mengunduh gambar:', err);
      toast({
        title: "Gagal Mengunduh",
        description: "Maaf, terjadi kesalahan saat memproses gambar. Silakan screenshot layar Anda sebagai alternatif.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-8 space-y-6">
      <div ref={cardRef} className="w-full max-w-lg bg-white rounded-xl">
        <Card className="w-full shadow-none border-0 sm:border">
          <CardHeader className="items-center text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <CardTitle className="text-2xl text-green-800">Selamat! Pengajuan Berhasil</CardTitle>
            <CardDescription>Simpan tiket ini untuk mengecek progres surat Anda.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
              <p className="text-sm text-green-700 font-medium mb-2 uppercase tracking-wide">KODE TIKET ANDA</p>
              <div className="flex items-center justify-center gap-3">
                <Ticket className="w-6 h-6 text-green-600" />
                <p className="text-3xl font-bold tracking-widest text-green-900">{ticketNumber}</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground text-left p-4 border rounded-lg bg-gray-50/50">
              <p className="font-semibold text-foreground mb-2">Informasi Pengambilan Surat:</p>
              <p className="mb-2">
                Ketika status <strong>"Disetujui"</strong>, surat dapat diambil di <strong>Balai Desa Rungkang</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Senin - Jumat:</strong> 07:00 - 16:00 WIB.</li>
                <li><strong>Sabtu & Minggu:</strong> Libur.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg px-4">
        <Button
          onClick={handleDownloadImage}
          variant="outline"
          className="flex-1 h-12 border-green-600 text-green-700 hover:bg-green-50"
          disabled={isDownloading}
        >
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Simpan Tiket (Gambar)
        </Button>
        <Button
          onClick={onReset}
          className="flex-1 h-12 bg-green-700 hover:bg-green-800"
        >
          <FilePlus2 className="mr-2 h-4 w-4" />
          Buat Pengajuan Baru
        </Button>
      </div>
    </div>
  );
}
