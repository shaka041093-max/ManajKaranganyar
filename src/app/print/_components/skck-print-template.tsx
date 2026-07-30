'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function SkckPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  // Templat Tanda Tangan Mengetahui (Camat, Danramil, Kapolsek)
  const additionalFooter = (
    <div className="space-y-6">
      <div className="text-center">
        <p className="font-bold underline uppercase">Mengetahui :</p>
      </div>
      <div className="flex justify-between text-center items-start text-sm">
        <div className="w-1/3">
          <p className="font-bold">CAMAT</p>
          <p>Gandrungmangu</p>
          <div className="h-20"></div>
          <div className="border-b-2 border-black w-[80%] mx-auto"></div>
        </div>
        <div className="w-1/3">
          <p className="font-bold">DAN RAMIL</p>
          <p>Gandrungmangu</p>
          <div className="h-20"></div>
          <div className="border-b-2 border-black w-[80%] mx-auto"></div>
        </div>
        <div className="w-1/3">
          <p className="font-bold">KAPOLSEK</p>
          <p>Gandrungmangu</p>
          <div className="h-20"></div>
          <div className="border-b-2 border-black w-[80%] mx-auto"></div>
        </div>
      </div>
    </div>
  );

  return (
    <PrintLayout
      submission={submission}
      requesterLabel="Tanda Tangan Pemegang"
      additionalFooter={additionalFooter}
    >
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenar-benarnya bahwa:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Nama Lengkap" value={formData.name} />
          <DataRow label="NIK" value={formData.nik} />
          <DataRow label="Jenis Kelamin" value={formData.gender} />
          <DataRow label="Tempat/Tgl Lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
          <DataRow label="Kewarganegaraan" value={formData.nationality} />
          <DataRow label="Agama" value={formData.religion} />
          <DataRow label="Pekerjaan" value={formData.job} />
          <DataRow label="Alamat" value={formData.address} />
        </tbody>
      </table>

      <p className="mt-4 text-justify leading-relaxed">
        Berdasarkan data kependudukan dan catatan yang ada di kantor kami, nama tersebut di atas adalah benar-benar warga kami yang berdomisili di alamat tersebut. Sepanjang pengetahuan kami, yang bersangkutan berkelakuan baik, tidak pernah tersangkut perkara pidana maupun perdata, dan tidak sedang dalam pengawasan pihak berwajib.
      </p>
      <p className="mt-4 text-justify leading-relaxed">
        Surat keterangan ini dibuat sebagai pengantar untuk keperluan: <strong>{formData.purpose}</strong>.
      </p>
      <p className="mt-4 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
