'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function BelumMenikahPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
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
        Berdasarkan data kependudukan dan catatan yang ada di kantor kami, serta sepengetahuan kami, nama tersebut di atas adalah benar-benar warga kami yang hingga saat surat keterangan ini dibuat berstatus <strong>BELUM PERNAH MENIKAH / LAJANG</strong>.
      </p>
      <p className="mt-4 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
