'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Store, User, UploadCloud, FileCheck, Paperclip } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmissionSuccess } from '../submission-success';
import { addSubmission } from '@/lib/submissions';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getResidentByNik } from '@/lib/residents';
import { cn, formatDbDateToForm } from '@/lib/utils';

// --- Reusable File Uploader Component ---
interface GoogleFileUploaderProps {
  label: string;
  onFileSelect: (file: File, fieldName: string) => void;
  fieldName: string;
  isRequired?: boolean;
  disabled?: boolean;
}

function GoogleFileUploader({ label, onFileSelect, fieldName, isRequired, disabled }: GoogleFileUploaderProps) {
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file, fieldName);
    }
  };

  return (
    <FormItem>
      <FormLabel className={cn(isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
        {label}
      </FormLabel>
      <FormControl>
        <div className="relative">
          <Input type="file" onChange={handleFileChange} disabled={disabled || !!fileName} className="pr-10" accept="image/jpeg,image/png,application/pdf" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
            {fileName ? <FileCheck className="text-green-600" /> : <Paperclip className="text-muted-foreground" />}
          </div>
        </div>
      </FormControl>
      {fileName && <p className="text-xs text-muted-foreground mt-1">File: {fileName}</p>}
      <FormMessage />
    </FormItem>
  );
}

// --- End of File Uploader ---

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="space-y-6 rounded-md border p-4 md:p-6 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b pb-2">
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </div>
);

const formSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit.'),
  purpose: z.string().min(1, 'Keperluan wajib diisi.'),
  name: z.string().min(1, 'Nama wajib diisi.'),
  birthPlace: z.string().min(1, 'Tempat lahir wajib diisi.'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi.'),
  gender: z.string().min(1, 'Jenis kelamin wajib diisi.'),
  address: z.string().min(1, 'Alamat wajib diisi.'),
  job: z.string().min(1, 'Pekerjaan wajib diisi.'),
  businessName: z.string().min(1, 'Nama usaha wajib diisi.'),
  businessType: z.string().min(1, 'Jenis usaha wajib diisi.'),
  businessAddress: z.string().min(1, 'Alamat usaha wajib diisi.'),
  businessSince: z.string().min(1, 'Tahun berdiri wajib diisi.'),
});

const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

export function SkuForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<Array<{ fieldName: string; file: File }>>([]);

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nik: '',
      purpose: '',
      name: '',
      birthPlace: '',
      birthDate: '',
      gender: '',
      address: '',
      job: '',
      businessName: '',
      businessType: '',
      businessAddress: '',
      businessSince: '',
    },
  });

  const nikValue = form.watch('nik');

  useEffect(() => {
    const fetchResident = async () => {
      if (nikValue?.length === 16 && firestore) {
        setIsSearching(true);
        try {
          const res = await getResidentByNik(firestore, nikValue);
          if (res) {
            form.setValue('name', res.fullName.toUpperCase());
            form.setValue('gender', res.gender);
            form.setValue('birthPlace', res.placeOfBirth);
            form.setValue('birthDate', formatDbDateToForm(res.dateOfBirth));
            form.setValue('job', res.occupation);
            const fullAddress = `${res.address}, RT ${res.rt} RW ${res.rw}, ${res.kelurahan}Kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
            form.setValue('address', fullAddress);
            toast({ title: "Data Pemohon Ditemukan" });
          }
        } finally { setIsSearching(false); }
      }
    };
    fetchResident();
  }, [nikValue, firestore, form, toast]);

  const handleFileSelect = (file: File, fieldName: string) => {
    setFilesToUpload(prev => [...prev, { file, fieldName }]);
  };

  const generateTicketNumber = () => {
    return Math.random().toString().substring(2, 8);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    if (!isAdmin) {
      if (!filesToUpload.some(f => f.fieldName === 'ktp')) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah foto KTP Anda.", variant: "destructive" });
        return;
      }
      if (!filesToUpload.some(f => f.fieldName === 'kk')) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah foto KK Anda.", variant: "destructive" });
        return;
      }
      if (!filesToUpload.some(f => f.fieldName === 'businessPhoto')) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah foto tempat usaha.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newTicketNumber = generateTicketNumber();

      const filesPayload = await Promise.all(
        filesToUpload.map(async (fileData) => {
          const base64Data = await convertFileToBase64(fileData.file);
          return {
            base64Data,
            mimeType: fileData.file.type,
            targetFileName: `${fileData.fieldName}_${values.nik}`,
            fieldName: fileData.fieldName,
          };
        })
      );

      await addSubmission(firestore, {
        ticketNumber: newTicketNumber,
        requesterName: values.name,
        nik: values.nik,
        letterType: 'Surat Keterangan Usaha',
        formData: values,
        filesToUpload: filesPayload,
      });

      setTicketNumber(newTicketNumber);
      setIsSubmitted(true);
      toast({ title: "Pengajuan Berhasil", description: `Nomor tiket Anda: ${newTicketNumber}` });
    } catch (error: any) {
      console.error("Submission Error:", error);
      toast({ title: "Gagal Mengajukan", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) return <SubmissionSuccess ticketNumber={ticketNumber} onReset={() => { form.reset(); setFilesToUpload([]); }} />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormSection title="Data Pemohon" icon={User}>
          <FormField control={form.control} name="nik" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel className="font-bold text-primary">NIK Pemohon</FormLabel><FormControl><div className="relative"><Input placeholder="3301xxxxxxxxxxxx" {...field} maxLength={16} disabled={isSubmitting} />{isSearching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}</div></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="purpose" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Keperluan Pengajuan</FormLabel><FormControl><Input placeholder="Contoh: Pengajuan KUR" {...field} disabled={isSubmitting} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input className="uppercase" {...field} disabled={isSubmitting} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Jenis Kelamin" {...field} disabled={isSubmitting} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="job" render={({ field }) => (<FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Alamat Lengkap</FormLabel><FormControl><Textarea {...field} disabled={isSubmitting} className="uppercase" /></FormControl></FormItem>)} />
        </FormSection>

        <FormSection title="Data Usaha" icon={Store}>
          <FormField control={form.control} name="businessName" render={({ field }) => (<FormItem><FormLabel>Nama Usaha</FormLabel><FormControl><Input className="uppercase" {...field} disabled={isSubmitting} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="businessType" render={({ field }) => (<FormItem><FormLabel>Jenis Usaha</FormLabel><FormControl><Input placeholder="Contoh: Perdagangan" {...field} disabled={isSubmitting} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="businessAddress" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Alamat Usaha</FormLabel><FormControl><Textarea {...field} disabled={isSubmitting} className="uppercase" /></FormControl></FormItem>)} />
          <FormField control={form.control} name="businessSince" render={({ field }) => (<FormItem><FormLabel>Berdiri Sejak Tahun</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl></FormItem>)} />
        </FormSection>

        <FormSection title="Unggah Berkas" icon={UploadCloud}>
          <div className="col-span-1 md:col-span-2">
            <FormDescription>Unggah file dalam format gambar (JPG, PNG) atau PDF, maks 2MB. Berkas dengan tanda * wajib diisi.</FormDescription>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <GoogleFileUploader label="Foto KTP" fieldName="ktp" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
            <GoogleFileUploader label="Foto KK" fieldName="kk" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
            <GoogleFileUploader label="Foto Tempat Usaha" fieldName="businessPhoto" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
          </div>
        </FormSection>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ajukan Surat Keterangan Usaha'}
        </Button>
      </form>
    </Form>
  );
}
