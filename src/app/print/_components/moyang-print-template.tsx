'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function MoyangPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;
  const { moyang, anak } = formData;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Nama Lengkap" value={moyang.name} />
          <DataRow label="NIK" value={moyang.nik} />
          <DataRow label="Jenis Kelamin" value={moyang.gender} />
          <DataRow label="Tempat/Tgl Lahir" value={formatTTL(moyang.birthPlace, moyang.birthDate, moyang.nik)} />
          <DataRow label="Kewarganegaraan" value={moyang.nationality} />
          <DataRow label="Agama" value={moyang.religion} />
          <DataRow label="Pekerjaan" value={moyang.job} />
          <DataRow label="Alamat Domisili" value={moyang.address} />
        </tbody>
      </table>

      <p className="mt-6 text-justify font-bold italic">
        Tersebut di atas adalah benar-benar Orang Tua Kandung dari:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Nama Lengkap" value={anak.name} />
          <DataRow label="NIK" value={anak.nik} />
          <DataRow label="Jenis Kelamin" value={anak.gender} />
          <DataRow label="Tempat/Tgl Lahir" value={formatTTL(anak.birthPlace, anak.birthDate, anak.nik)} />
          <DataRow label="Kewarganegaraan" value={anak.nationality} />
          <DataRow label="Agama" value={anak.religion} />
          <DataRow label="Pekerjaan" value={anak.job} />
          <DataRow label="Alamat Domisili" value={anak.address} />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
