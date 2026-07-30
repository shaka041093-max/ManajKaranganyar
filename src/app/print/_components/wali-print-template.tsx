'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function WaliPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;
  const { wali, anak, purpose } = formData;

  return (
    <PrintLayout submission={submission}>
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="NIK" value={wali.nik} />
          <DataRow label="Nama" value={wali.name} />
          <DataRow label="Tempat / Tgl Lahir" value={formatTTL(wali.birthPlace, wali.birthDate)} />
          <DataRow label="Pekerjaan" value={wali.job} />
          <DataRow label="Alamat" value={wali.address} />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed font-bold">
        Tersebut di atas adalah benar-benar Wali / Nenek dari :
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="NIK" value={anak.nik} />
          <DataRow label="Nama" value={anak.name} />
          <DataRow label="Tempat / Tgl Lahir" value={formatTTL(anak.birthPlace, anak.birthDate)} />
          <DataRow label="Alamat" value={anak.address} />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed">
        Surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagai persyaratan : <strong>{purpose}</strong>.
      </p>

      <p className="mt-6 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
