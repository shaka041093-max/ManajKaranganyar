'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function PengantarUmumPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission}>
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Nama" value={formData.name} />
          <DataRow label="NIK" value={formData.nik} />
          <DataRow label="Tempat / Tgl Lahir" value={formatTTL(formData.birthPlace, formData.birthDate, formData.nik || submission.nik)} />
          <DataRow label="Pekerjaan" value={formData.job} />
          <DataRow label="Alamat" value={formData.address} />
        </tbody>
      </table>

      <p className="mt-8 text-justify leading-relaxed">
        Surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya sesuai dengan keperluan yang dibutuhkan yaitu : <strong>{formData.purpose}</strong>.
      </p>

      <p className="mt-6 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
