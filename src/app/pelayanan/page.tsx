'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { PelayananDoc, DriveSettingsInfo, LetterSubmission } from '@/lib/types';
import { PELAYANAN_CATEGORIES, getCategoryLabel } from '@/lib/pelayanan-categories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Save,
  Trash2,
  Edit,
  FileUp,
  FileText,
  ExternalLink,
  Globe,
  Cloud,
  Link2,
  FilePlus,
  Printer,
  FileCheck,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  Eye,
  Download,
  UserCheck,
  RefreshCw
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn, formatDateToDDMMYYYY } from '@/lib/utils';
import { updateSubmissionStatus, deleteSubmission, getNextDocumentNumber } from '@/lib/submissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

/** Extracts a Google Drive folder ID from a full URL or returns the raw ID. */
function extractFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  const id = match ? match[1] : trimmed;
  return id.split('?')[0].split('#')[0];
}

export default function AdminPelayananPage() {
  const [activeTab, setActiveTab] = useState<'surat' | 'dokumen'>('surat');

  // Pelayanan Docs Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<PelayananDoc | null>(null);
  const [fileToUpload, setSelectedFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Submissions search & modal states
  const [searchSubmission, setSearchSubmission] = useState('');
  const [editingSubmission, setEditingSubmission] = useState<LetterSubmission | null>(null);
  const [editDocNum, setEditDocNum] = useState('');
  const [editStatus, setEditStatus] = useState('APPROVED');
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  // Dialog state for Print & Detail (Matching Image 1 & 2)
  const [selectedSubForPrint, setSelectedSubForPrint] = useState<LetterSubmission | null>(null);
  const [selectedSigner, setSelectedSigner] = useState<'kades' | 'sekdes'>('kades');
  const [selectedSubForDetail, setSelectedSubForDetail] = useState<LetterSubmission | null>(null);

  // Dedicated state for Editing Nomor Surat
  const [subForEditDocNum, setSubForEditDocNum] = useState<LetterSubmission | null>(null);
  const [manualDocNumInput, setManualDocNumInput] = useState('');
  const [isSavingDocNum, setIsSavingDocNum] = useState(false);

  const handleOpenEditDocNum = (sub: LetterSubmission) => {
    setSubForEditDocNum(sub);
    setManualDocNumInput(sub.documentNumber && sub.documentNumber !== 'Belum Ada' ? sub.documentNumber : '');
  };

  const handleSaveManualDocNum = async () => {
    if (!firestore || !subForEditDocNum) return;
    if (!manualDocNumInput.trim()) {
      toast({
        title: "Nomor Surat Kosong",
        description: "Silakan masukkan format nomor surat yang valid.",
        variant: "destructive",
      });
      return;
    }
    setIsSavingDocNum(true);
    try {
      const trimmedNum = manualDocNumInput.trim();
      await updateSubmissionStatus(firestore, subForEditDocNum.id, subForEditDocNum.status || 'APPROVED', trimmedNum);
      toast({
        title: "Nomor Surat Diperbarui",
        description: `Nomor surat berhasil disimpan: ${trimmedNum}`,
      });
      setSubForEditDocNum(null);
    } catch (error: any) {
      toast({
        title: "Gagal Menyimpan",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingDocNum(false);
    }
  };

  const isImageCategory = category === 'visi-misi' || category === 'maklumat' || category === 'pojok-baca';

  useEffect(() => {
    if (!editingDoc) {
      setSelectedFile(null);
      setImagePreview('');
      setLink('');
    }
  }, [category, editingDoc]);

  const firestore = useFirestore();
  const { toast } = useToast();

  // Queries
  const docsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'pelayananDocs'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'submissions'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: documents, isLoading: isLoadingDocs } = useCollection<PelayananDoc>(docsQuery);
  const { data: submissions, isLoading: isLoadingSubs } = useCollection<LetterSubmission>(submissionsQuery);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (file: File, docTitle: string) => {
    if (!firestore) return null;
    setIsUploading(true);
    try {
      const driveRef = doc(firestore, 'driveSettings', 'default');
      const driveSnap = await getDoc(driveRef);
      if (!driveSnap.exists()) throw new Error("Konfigurasi Google Drive belum diatur di menu Pengaturan.");

      const driveData = driveSnap.data() as DriveSettingsInfo;
      const appsScriptUrl = (driveData.appsScriptUrl || '').trim();
      const rootFolderId = extractFolderId(driveData.rootFolderId || '');

      if (!appsScriptUrl || !rootFolderId) throw new Error("URL Apps Script atau ID Folder Utama belum lengkap.");

      const base64Data = await convertFileToBase64(file);
      const payload = {
        rootFolderId,
        folderName: "PELAYANAN DESA",
        letterType: "Informasi Publik",
        requesterName: "ADMIN",
        files: [{
          base64Data,
          mimeType: file.type,
          targetFileName: docTitle.toUpperCase().replace(/\s+/g, '_'),
        }]
      };

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
      });

      const resultText = await response.text();
      let result;
      try {
        result = JSON.parse(resultText);
      } catch {
        throw new Error("Respons Apps Script bukan JSON valid: " + resultText.substring(0, 200));
      }

      if (result.status !== 'success') throw new Error(result.message || "Gagal unggah ke Drive.");
      return result.files[0].fileId;
    } catch (err: any) {
      console.error('[Drive Upload] Error:', err);
      toast({ title: "Gagal Unggah Berkas", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengunggah berkas.');
      }
      const data = await res.json();
      return data.url;
    } catch (err: any) {
      toast({ title: "Gagal Mengunggah Gambar", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && isImageCategory) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview('');
    }
  };

  const handleSubmitDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || isSubmitting) return;

    if (!category || !title.trim()) {
      toast({ title: "Data Belum Lengkap", variant: "destructive" });
      return;
    }

    if (!editingDoc && !fileToUpload) {
      toast({
        title: "Pilih Berkas",
        description: isImageCategory ? "Mohon pilih berkas gambar yang akan diunggah." : "Mohon pilih file PDF yang akan diunggah.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDoc) {
        const updateData: any = {
          title: title.toUpperCase(),
          category,
        };
        if (category === 'pojok-baca') {
          updateData.link = link;
        } else {
          updateData.link = null;
        }
        await updateDoc(doc(firestore, 'pelayananDocs', editingDoc.id), updateData);
        toast({ title: "Data Diperbarui" });
      } else {
        let fileId = '';
        let fileName = fileToUpload!.name;

        if (isImageCategory) {
          const uploadedUrl = await handleImageUpload(fileToUpload!);
          if (!uploadedUrl) {
            setIsSubmitting(false);
            return;
          }
          fileId = uploadedUrl;
        } else {
          const driveFileId = await handleFileUpload(fileToUpload!, title);
          if (!driveFileId) {
            setIsSubmitting(false);
            return;
          }
          fileId = driveFileId;
        }

        const docData: any = {
          title: title.toUpperCase(),
          category,
          fileId,
          fileName,
          createdAt: serverTimestamp(),
        };

        if (category === 'pojok-baca') {
          docData.link = link;
        }

        await addDoc(collection(firestore, 'pelayananDocs'), docData);
        toast({ title: "Dokumen Berhasil Disimpan" });
      }

      setTitle('');
      setCategory('');
      setSelectedFile(null);
      setEditingDoc(null);
      setLink('');
      setImagePreview('');
    } catch (error: any) {
      toast({ title: "Terjadi Kesalahan", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleEditDoc = (item: PelayananDoc) => {
    setEditingDoc(item);
    setTitle(item.title);
    setCategory(item.category);
    setLink(item.link || '');
  };

  const handleDeleteDoc = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'pelayananDocs', id));
      toast({ title: "Dokumen Dihapus" });
    } catch (error: any) {
      toast({ title: "Gagal Menghapus", variant: "destructive" });
    }
  };

  // Submissions actions
  const handleQuickUpdateStatus = async (sub: LetterSubmission, newStatus: string) => {
    if (!firestore) return;
    try {
      let docNum = sub.documentNumber;
      if (newStatus === 'APPROVED' && (!docNum || docNum === 'Belum Ada')) {
        docNum = await getNextDocumentNumber(firestore);
      }
      await updateSubmissionStatus(firestore, sub.id, newStatus, docNum);
      toast({
        title: newStatus === 'APPROVED' ? 'Pengajuan Disetujui' : 'Pengajuan Ditolak',
        description: `Status pengajuan diperbarui. Nomor Surat: ${docNum || '-'}`
      });
    } catch (error: any) {
      toast({ title: "Gagal Memperbarui Status", description: error.message, variant: "destructive" });
    }
  };

  const handleGenerateDocNumForSub = async (sub: LetterSubmission) => {
    if (!firestore) return;
    try {
      const nextNum = await getNextDocumentNumber(firestore);
      await updateSubmissionStatus(firestore, sub.id, sub.status || 'APPROVED', nextNum);
      toast({
        title: "Nomor Surat Ditarik",
        description: `Nomor Surat berhasil ditarik: ${nextNum}`
      });
    } catch (error: any) {
      toast({ title: "Gagal Menarik Nomor Surat", description: error.message, variant: "destructive" });
    }
  };


  const handleSaveEditSub = async () => {
    if (!firestore || !editingSubmission) return;
    setIsUpdatingSub(true);
    try {
      await updateSubmissionStatus(firestore, editingSubmission.id, editStatus, editDocNum);
      toast({ title: "Pengajuan Disimpan", description: "Status dan Nomor Surat berhasil diperbarui." });
      setEditingSubmission(null);
    } catch (error: any) {
      toast({ title: "Gagal Mengubah Pengajuan", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingSub(false);
    }
  };

  const handleDeleteSub = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteSubmission(firestore, id);
      toast({ title: "Pengajuan Dihapus" });
    } catch (error: any) {
      toast({ title: "Gagal Menghapus", variant: "destructive" });
    }
  };

  // Guard cetak: Wajib persetujuan admin terlebih dahulu
  const handlePrintSub = (sub: LetterSubmission) => {
    const isApproved = sub.status === 'APPROVED' || sub.status === 'COMPLETED' || sub.status === 'disetujui';
    if (!isApproved) {
      toast({
        title: "Wajib Disetujui Dahulu",
        description: `Pengajuan ini masih berstatus "${sub.status || 'MENUNGGU'}". Anda wajib menyetujui pengajuan surat terlebih dahulu sebelum mencetak dokumen.`,
        variant: "destructive"
      });
      return;
    }
    setSelectedSubForPrint(sub);
  };

  // Filter submissions by search query
  const filteredSubmissions = submissions?.filter((s) => {
    if (!searchSubmission.trim()) return true;
    const term = searchSubmission.toLowerCase();
    return (
      (s.letterType || '').toLowerCase().includes(term) ||
      (s.formData?.name || s.requesterName || '').toLowerCase().includes(term) ||
      (s.formData?.nik || '').toLowerCase().includes(term) ||
      (s.documentNumber || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 pb-16 max-w-7xl mx-auto animate-fade-in-up">

      <PageHeader
        title="Manajemen Surat & Pelayanan Desa"
        description="Kelola pengajuan surat warga otomatis, persetujuan penandatangan, dan cetak naskah dinas resmi desa."
      >
        <Button asChild size="default" className="rounded-xl font-bold uppercase tracking-wide bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/20 text-white border-none text-xs hover:scale-[1.02] transition-all">
          <Link href="/pelayanan/pengajuan">
            <FilePlus className="mr-1.5 h-4 w-4" /> Pengajuan Surat Baru
          </Link>
        </Button>
      </PageHeader>

      {/* KELOLA SURAT WARGA */}
      <Card className="rounded-2xl md:rounded-3xl border border-border/70 shadow-md shadow-blue-950/5 overflow-hidden bg-card/85 backdrop-blur-md">
        <CardHeader className="p-5 md:p-6 border-b border-border/70 bg-gradient-to-r from-blue-500/10 via-primary/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <CardTitle className="text-base md:text-lg font-black uppercase tracking-tight text-foreground">Daftar Pengajuan Surat Warga</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              Daftar seluruh surat yang diajukan oleh/untuk warga via sistem.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Input
              placeholder="Cari Pemohon, NIK, Jenis Surat..."
              value={searchSubmission}
              onChange={(e) => setSearchSubmission(e.target.value)}
              className="h-10 rounded-xl pl-9 text-xs font-semibold bg-background/80 backdrop-blur-sm border-border/80 shadow-xs focus:ring-2 focus:ring-primary/30"
            />
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </CardHeader>



        <CardContent className="p-0">
          {/* MOBILE VIEW: RINGKAS PER KARTU (TIDAK PERLU MEGGESER TABLE) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {isLoadingSubs ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-lg" />
                </div>
              ))
            ) : filteredSubmissions?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Belum ada pengajuan surat warga.
              </div>
            ) : (
              filteredSubmissions?.map((sub) => (
                <div key={sub.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-sm uppercase text-slate-900 leading-tight">
                        {sub.formData?.name || sub.requesterName || 'Pemohon'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">NIK: {sub.formData?.nik || '-'}</p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 shrink-0">
                          <MoreHorizontal className="h-4 w-4 text-slate-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 shadow-2xl border-slate-100 bg-white">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
                          OPSI PENGELOLAAN
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => setSelectedSubForDetail(sub)} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 hover:bg-slate-50">
                          <Eye className="h-4 w-4 text-slate-600" />
                          <span>Lihat Detail</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleQuickUpdateStatus(sub, 'APPROVED')} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-emerald-600 hover:bg-emerald-50">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Setujui</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleQuickUpdateStatus(sub, 'REJECTED')} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-red-500 hover:bg-red-50">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span>Tolak</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handlePrintSub(sub)} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 hover:bg-slate-50 text-slate-700">
                          <Printer className="h-4 w-4 text-slate-700" />
                          <span>Cetak Dokumen</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handlePrintSub(sub)} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 hover:bg-slate-50 text-slate-700">
                          <Download className="h-4 w-4 text-slate-700" />
                          <span>Unduh PDF</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleDeleteSub(sub.id)} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span>Hapus Permanen</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="space-y-0.5">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/10 text-amber-700 border border-amber-500/20">
                        {sub.letterType}
                      </Badge>
                      {sub.formData?.purpose && (
                        <p className="text-[10px] font-medium text-slate-500 line-clamp-1 max-w-[220px]">
                          {sub.formData.purpose}
                        </p>
                      )}
                    </div>

                    <div>
                      {sub.status === 'APPROVED' || sub.status === 'COMPLETED' || sub.status === 'disetujui' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-800 text-white tracking-wider">
                          DISETUJUI
                        </span>
                      ) : sub.status === 'REJECTED' || sub.status === 'ditolak' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-600 text-white tracking-wider">
                          DITOLAK
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white tracking-wider">
                          MENUNGGU
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">NOMOR SURAT</span>
                    {sub.documentNumber && sub.documentNumber !== 'Belum Ada' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditDocNum(sub)}
                          className="text-xs font-mono font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 px-2 py-0.5 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 group/btn"
                          title="Klik untuk mengedit nomor surat"
                        >
                          <span>{sub.documentNumber}</span>
                          <Edit className="h-2.5 w-2.5 text-slate-400 group-hover/btn:text-blue-600 transition-colors" />
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg shrink-0"
                          title="Edit Nomor Surat"
                          onClick={() => handleOpenEditDocNum(sub)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg shrink-0"
                          title="Tarik / Perbarui Nomor Surat Otomatis"
                          onClick={() => handleGenerateDocNumForSub(sub)}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateDocNumForSub(sub)}
                          className="h-7 px-2.5 rounded-xl font-bold text-[10px] uppercase text-primary border-primary/30 bg-primary/5 hover:bg-primary hover:text-white transition-all shadow-xs"
                          title="Tarik Nomor Otomatis"
                        >
                          <RefreshCw className="mr-1 h-3 w-3" /> Tarik Surat
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditDocNum(sub)}
                          className="h-7 px-2 rounded-xl font-bold text-[10px] uppercase text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Ketik Nomor Manual"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP VIEW: STANDARD TABLE */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="pl-8 font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Pemohon & NIK</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Jenis Surat & Keperluan</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Nomor Surat</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right pr-8 font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSubs ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5} className="p-8"><Skeleton className="h-10 w-full rounded-xl" /></TableCell></TableRow>
                  ))
                ) : filteredSubmissions?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium italic">Belum ada pengajuan surat warga.</TableCell></TableRow>
                ) : (
                  filteredSubmissions?.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-primary/5 group transition-all border-border/40">
                      <TableCell className="pl-8 py-4">
                        <div className="space-y-0.5">
                          <p className="font-black text-sm uppercase text-foreground leading-tight">
                            {sub.formData?.name || sub.requesterName || 'Pemohon'}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground">NIK: {sub.formData?.nik || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/10 text-amber-700 border border-amber-500/20">
                            {sub.letterType}
                          </Badge>
                          {sub.formData?.purpose && (
                            <p className="text-[10px] font-medium text-slate-500 truncate max-w-[200px]">
                              {sub.formData.purpose}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.documentNumber && sub.documentNumber !== 'Belum Ada' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDocNum(sub)}
                              className="text-xs font-mono font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 px-2 py-0.5 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 group/btn"
                              title="Klik untuk mengedit nomor surat"
                            >
                              <span>{sub.documentNumber}</span>
                              <Edit className="h-2.5 w-2.5 text-slate-400 group-hover/btn:text-blue-600 transition-colors" />
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg shrink-0"
                              title="Edit Nomor Surat Secara Manual"
                              onClick={() => handleOpenEditDocNum(sub)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg shrink-0"
                              title="Tarik / Perbarui Nomor Surat Otomatis"
                              onClick={() => handleGenerateDocNumForSub(sub)}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateDocNumForSub(sub)}
                              className="h-7 px-2.5 rounded-xl font-bold text-[10px] uppercase text-primary border-primary/30 bg-primary/5 hover:bg-primary hover:text-white transition-all shadow-xs"
                              title="Tarik Nomor Otomatis"
                            >
                              <RefreshCw className="mr-1 h-3 w-3" /> Tarik Surat
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditDocNum(sub)}
                              className="h-7 px-2 rounded-xl font-bold text-[10px] uppercase text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                              title="Ketik Nomor Manual"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {sub.status === 'APPROVED' || sub.status === 'COMPLETED' || sub.status === 'disetujui' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-800 text-white tracking-wider">
                            DISETUJUI
                          </span>
                        ) : sub.status === 'REJECTED' || sub.status === 'ditolak' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-600 text-white tracking-wider">
                            DITOLAK
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white tracking-wider">
                            MENUNGGU
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        {/* Dropdown Menu Matching Image 1 */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100">
                              <MoreHorizontal className="h-4 w-4 text-slate-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 shadow-2xl border-slate-100 bg-white">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
                              OPSI PENGELOLAAN
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => setSelectedSubForDetail(sub)}
                              className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4 text-slate-600" />
                              <span>Lihat Detail</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenEditDocNum(sub)}
                              className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                              <span>Ubah Nomor Surat</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleQuickUpdateStatus(sub, 'APPROVED')}
                              className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-emerald-600 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Setujui</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleQuickUpdateStatus(sub, 'REJECTED')}
                              className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-red-500 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span>Tolak</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handlePrintSub(sub)}
                              className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
                            >
                              <Printer className="h-4 w-4 text-slate-700" />
                              <span>Cetak Dokumen</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handlePrintSub(sub)}
                              className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
                            >
                              <Download className="h-4 w-4 text-slate-700" />
                              <span>Unduh PDF</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDeleteSub(sub.id)}
                              className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span>Hapus Permanen</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

      </Card>



      {/* DIALOG 1: PILIH PENANDATANGAN (MATCHING IMAGE 2) */}
      <Dialog open={!!selectedSubForPrint} onOpenChange={() => setSelectedSubForPrint(null)}>
        <DialogContent className="rounded-[2rem] max-w-md p-8 border-none shadow-2xl bg-white">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight italic font-serif text-slate-900">
                PILIH PENANDATANGAN
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 text-xs font-medium pt-1">
              Tentukan siapa yang akan menandatangani dokumen ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Option 1: KEPALA DESA */}
            <div
              onClick={() => setSelectedSigner('kades')}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4",
                selectedSigner === 'kades'
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                selectedSigner === 'kades' ? "border-primary bg-primary text-white" : "border-slate-300"
              )}>
                {selectedSigner === 'kades' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
              </div>
              <div>
                <h4 className="font-black text-sm uppercase text-slate-900 leading-tight">KEPALA DESA</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RISKIANASARI, SE.</p>
              </div>
            </div>

            {/* Option 2: SEKRETARIS DESA */}
            <div
              onClick={() => setSelectedSigner('sekdes')}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4",
                selectedSigner === 'sekdes'
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                selectedSigner === 'sekdes' ? "border-primary bg-primary text-white" : "border-slate-300"
              )}>
                {selectedSigner === 'sekdes' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
              </div>
              <div>
                <h4 className="font-black text-sm uppercase text-slate-900 leading-tight">SEKRETARIS DESA</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PRIYO SUMARNO,S.PD.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-2 flex flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedSubForPrint(null)}
              className="flex-1 h-12 rounded-2xl font-black uppercase text-xs tracking-wider border-slate-200"
            >
              BATAL
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selectedSubForPrint) {
                  window.open(`/print/${selectedSubForPrint.id}?signer=${selectedSigner}`, '_blank');
                  setSelectedSubForPrint(null);
                }
              }}
              className="flex-1 h-12 rounded-2xl font-black uppercase text-xs tracking-wider bg-blue-800 hover:bg-blue-900 text-white shadow-lg shadow-blue-950/20"
            >
              LANJUTKAN CETAK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: LIHAT DETAIL PENGAJUAN SURAT */}
      <Dialog open={!!selectedSubForDetail} onOpenChange={() => setSelectedSubForDetail(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-xl p-8 max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader className="space-y-2 text-left border-b pb-4">
            <Badge variant="secondary" className="w-fit text-[9px] font-black uppercase px-2.5 py-0.5 bg-amber-500/10 text-amber-700 border border-amber-500/20">
              {selectedSubForDetail?.letterType}
            </Badge>
            <DialogTitle className="text-xl font-black uppercase text-slate-900">
              Detail Pengajuan Surat Warga
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nomor Surat: <span className="font-mono font-bold text-slate-800">{selectedSubForDetail?.documentNumber || 'Belum diatur'}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedSubForDetail && (
            <div className="space-y-6 py-4 text-xs">
              {/* Data Pemohon */}
              <div className="p-5 rounded-2xl bg-slate-50 border space-y-3">
                <h4 className="font-black uppercase text-[10px] tracking-wider text-slate-400 border-b pb-1">DATA PEMOHON</h4>
                <div className="grid grid-cols-2 gap-3 font-medium">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Nama Lengkap</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedSubForDetail.formData?.name || selectedSubForDetail.requesterName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">NIK</span>
                    <span className="font-mono font-bold text-slate-800">{selectedSubForDetail.formData?.nik || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Tempat/Tgl Lahir</span>
                    <span>{selectedSubForDetail.formData?.birthPlace || '-'}{selectedSubForDetail.formData?.birthDate ? `, ${formatDateToDDMMYYYY(selectedSubForDetail.formData?.birthDate, selectedSubForDetail.formData?.nik)}` : ''}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Pekerjaan</span>
                    <span>{selectedSubForDetail.formData?.job || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Alamat Domisili</span>
                    <span>{selectedSubForDetail.formData?.address || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Keperluan / Informasi Tambahan */}
              {selectedSubForDetail.formData?.purpose && (
                <div className="space-y-1">
                  <span className="font-black text-[10px] uppercase text-slate-400">Keperluan Surat</span>
                  <p className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 font-bold">
                    {selectedSubForDetail.formData.purpose}
                  </p>
                </div>
              )}

              {/* Berkas Lampiran Google Drive */}
              {selectedSubForDetail.driveFiles && selectedSubForDetail.driveFiles.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <h4 className="font-black uppercase text-[10px] tracking-wider text-blue-700 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> BERKAS LAMPIRAN GOOGLE DRIVE
                  </h4>
                  <div className="space-y-1.5 pt-1">
                    {selectedSubForDetail.driveFiles.map((file: any, idx: number) => (
                      <a
                        key={idx}
                        href={file.fileUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-blue-100 hover:border-blue-300 transition-all group"
                      >
                        <span className="font-bold text-xs text-slate-800 uppercase line-clamp-1">
                          📄 {file.fileName || file.fieldName || `Lampiran ${idx + 1}`}
                        </span>
                        <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 group-hover:underline shrink-0">
                          Buka Drive <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}


              {/* Edit Nomor Surat Input inside Detail */}
              <div className="p-4 rounded-2xl bg-slate-100/70 border space-y-3">
                <h4 className="font-black uppercase text-[10px] tracking-wider text-slate-500">UBAH NOMOR SURAT & STATUS</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Nomor Surat</Label>
                    <Input
                      defaultValue={selectedSubForDetail.documentNumber || ''}
                      onChange={(e) => setEditDocNum(e.target.value)}
                      placeholder="470 / XXX / 04 / 2026"
                      className="h-10 font-mono font-bold text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Status</Label>
                    <Select defaultValue={selectedSubForDetail.status || 'APPROVED'} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-10 font-bold text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED">Disetujui</SelectItem>
                        <SelectItem value="REJECTED">Ditolak</SelectItem>
                        <SelectItem value="PENDING">Menunggu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (firestore && selectedSubForDetail) {
                      await updateSubmissionStatus(firestore, selectedSubForDetail.id, editStatus, editDocNum);
                      toast({ title: "Perubahan Disimpan" });
                      setSelectedSubForDetail(null);
                    }
                  }}
                  className="w-full h-9 rounded-xl font-black uppercase text-[10px] bg-slate-900"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Simpan Nomor & Status
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setSelectedSubForDetail(null)}>
              Tutup
            </Button>

            {selectedSubForDetail && (
              selectedSubForDetail.status === 'APPROVED' || 
              selectedSubForDetail.status === 'COMPLETED' || 
              selectedSubForDetail.status === 'disetujui'
            ) ? (
              <Button
                className="rounded-xl font-black uppercase bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                onClick={() => {
                  const target = selectedSubForDetail;
                  setSelectedSubForDetail(null);
                  setSelectedSubForPrint(target);
                }}
              >
                <Printer className="mr-2 h-4 w-4" /> Cetak Dokumen Ini
              </Button>
            ) : (
              <Button
                className="rounded-xl font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                onClick={async () => {
                  if (selectedSubForDetail && firestore) {
                    await handleQuickUpdateStatus(selectedSubForDetail, 'APPROVED');
                    let docNum = selectedSubForDetail.documentNumber;
                    if (!docNum || docNum === 'Belum Ada') {
                      docNum = await getNextDocumentNumber(firestore);
                    }
                    const updatedSub = { ...selectedSubForDetail, status: 'APPROVED', documentNumber: docNum };
                    setSelectedSubForDetail(null);
                    setSelectedSubForPrint(updatedSub);
                  }
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Setujui & Lanjut Cetak
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: EDIT NOMOR SURAT RESMI */}
      <Dialog open={!!subForEditDocNum} onOpenChange={(open) => !open && setSubForEditDocNum(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-md p-6 bg-white shadow-2xl">
          <DialogHeader className="space-y-1.5 text-left border-b pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Edit className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase text-slate-900 tracking-tight leading-none">
                  Edit Nomor Surat Resmi
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Ubah nomor surat resmi permohonan warga ini secara manual.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {subForEditDocNum && (
            <div className="space-y-4 py-2 text-xs">
              {/* Info Singkat Permohonan */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pemohon:</span>
                  <span className="font-black text-slate-800 uppercase">
                    {subForEditDocNum.formData?.name || subForEditDocNum.requesterName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Jenis Surat:</span>
                  <Badge variant="secondary" className="text-[9px] font-bold bg-amber-500/10 text-amber-800">
                    {subForEditDocNum.letterType}
                  </Badge>
                </div>
                {subForEditDocNum.formData?.nik && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">NIK:</span>
                    <span className="font-mono font-bold text-slate-700">{subForEditDocNum.formData.nik}</span>
                  </div>
                )}
              </div>

              {/* Form Input Nomor Surat */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Nomor Surat Resmi
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-lg"
                    onClick={async () => {
                      if (!firestore) return;
                      try {
                        const nextNum = await getNextDocumentNumber(firestore);
                        setManualDocNumInput(nextNum);
                        toast({ title: "Nomor Otomatis Terambil", description: nextNum });
                      } catch (e: any) {
                        toast({ title: "Gagal mengambil nomor otomatis", description: e.message, variant: "destructive" });
                      }
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Tarik Nomor Otomatis
                  </Button>
                </div>
                <Input
                  value={manualDocNumInput}
                  onChange={(e) => setManualDocNumInput(e.target.value)}
                  placeholder="Contoh: 400 / 004 / 04 / 2026"
                  className="h-12 font-mono font-black text-sm bg-slate-50 border-slate-200 focus:bg-white text-slate-900 rounded-xl px-3.5 tracking-wide"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveManualDocNum();
                    }
                  }}
                />
                <p className="text-[10px] text-slate-400">
                  Format baku: [Kode Klasifikasi] / [Nomor Urut] / [Bulan Romawi/Angka] / [Tahun]
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-bold text-xs"
              onClick={() => setSubForEditDocNum(null)}
              disabled={isSavingDocNum}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="rounded-xl font-black uppercase text-xs bg-blue-800 hover:bg-blue-900 text-white shadow-md shadow-blue-950/20"
              onClick={handleSaveManualDocNum}
              disabled={isSavingDocNum}
            >
              {isSavingDocNum ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Simpan Nomor Surat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
