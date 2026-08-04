'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function PemakamanPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="NIK" value={formData.nik} />
          <DataRow label="Nama Lengkap" value={formData.name} />
          <DataRow label="Tempat / Tgl lahir" value={formatTTL(formData.birthPlace, formData.birthDate, formData.nik || submission.nik)} />
          <DataRow label="Agama" value={formData.religion} />
          <DataRow label="Jenis Kelamin" value={formData.gender} />
          <DataRow label="Status Perkawinan" value={formData.maritalStatus} />
          <DataRow label="Pekerjaan" value={formData.job} />
          <DataRow label="Kewarganegaraan" value={formData.nationality} />
          <DataRow label="Alamat" value={formData.address} />
        </tbody>
      </table>

      <p className="mt-6 text-justify font-bold">
        Tersebut di atas benar-benar telah meninggal dunia pada:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Hari / Tanggal" value={new Date(formData.deathDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          <DataRow label="Jam" value={formData.deathTime} />
          <DataRow label="Tempat Kematian" value={formData.deathLocation} />
          <DataRow label="Sebab Kematian" value={formData.deathCause} />
          <DataRow label="Dimakamkan di" value={formData.burialLocation} />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat digunakan seperlunya.
      </p>
    </PrintLayout>
  );
}
