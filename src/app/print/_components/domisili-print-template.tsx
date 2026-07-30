'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function DomisiliPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan dibawah ini, Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa :
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Nama" value={formData.name} />
          <DataRow label="NIK" value={formData.nik} />
          <DataRow label="Jenis Kelamin" value={formData.gender} />
          <DataRow label="Tempat/ Tanggal lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
          <DataRow label="Warganegara" value={formData.nationality} />
          <DataRow label="Agama" value={formData.religion} />
          <DataRow label="Alamat Asal (KTP)" value={formData.originAddress} />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed">
        Adalah benar penduduk Desa Rungkang, Kecamatan Gandrungmangu, Kabupaten Cilacap dan saat ini berdomisili di :
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow label="Alamat Domisili" value={formData.domicileAddress} />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed">
        Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan seperlunya.
      </p>
    </PrintLayout>
  );
}
