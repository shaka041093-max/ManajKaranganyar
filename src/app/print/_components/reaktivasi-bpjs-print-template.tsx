'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function ReaktivasiBpjsPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;
  
  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
            <DataRow label="Rekam Medis" value={formData.rekamMedis} />
            <DataRow label="Jenis Penyakit" value={formData.jenisPenyakit} />
            <DataRow label="No. BPJS" value={formData.noBpjs} />
        </tbody>
      </table>

      <p className="mt-6 font-semibold">Menerangkan bahwa:</p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
            <DataRow label="Nama" value={formData.name} />
            <DataRow label="NIK" value={formData.nik} />
            <DataRow label="Tempat/Tanggal Lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
            <DataRow label="Pekerjaan" value={formData.job} />
            <DataRow label="Alamat" value={formData.address} />
        </tbody>
      </table>
      
      <p className="mt-8 text-justify leading-relaxed">
        Adalah benar bahwa yang bersangkutan saat ini sedang sakit <strong>{formData.jenisPenyakit}</strong> dan membutuhkan pelayanan serta keberlanjutan pengobatan secara medis.
      </p>

      <p className="mt-4 text-justify leading-relaxed">
        Surat ini dipergunakan untuk keperluan <strong>Reaktivasi BPJS Kesehatan</strong> dengan Nomor: <strong>{formData.noBpjs}</strong>, bahwa yang bersangkutan benar memerlukan jaminan pelayanan kesehatan sesuai dengan ketentuan yang berlaku.
      </p>
      
      <p className="mt-6 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
