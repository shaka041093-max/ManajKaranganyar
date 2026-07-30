'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function SktmPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;
  const isForChild = formData.submissionType === 'child';

  return (
    <PrintLayout submission={submission}>
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenar-benarnya bahwa:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Nama" value={formData.applicantName} />
          <DataRow label="NIK" value={formData.applicantNik} />
          <DataRow label="Tempat/Tgl Lahir" value={formatTTL(formData.applicantBirthPlace, formData.applicantBirthDate)} />
          <DataRow label="Jenis Kelamin" value={formData.applicantGender} />
          <DataRow label="Agama" value={formData.applicantReligion} />
          <DataRow label="Pekerjaan" value={formData.applicantJob} />
          <DataRow label="Alamat" value={formData.applicantAddress} />
        </tbody>
      </table>

      {isForChild ? (
        <>
          <p className="mt-4 text-justify leading-relaxed">
            Adalah benar orang tua / wali dari:
          </p>

          <table className="mt-4 border-collapse w-full">
            <tbody>
              <DataRow label="Nama" value={formData.childName} />
              <DataRow label="NIK" value={formData.childNik} />
              <DataRow label="Tempat/Tgl Lahir" value={formatTTL(formData.childBirthPlace || '', formData.childBirthDate || '')} />
              <DataRow label="Jenis Kelamin" value={formData.childGender} />
              <DataRow label="Pekerjaan" value={formData.childJob} />
              <DataRow label="Alamat" value={formData.childAddress} />
            </tbody>
          </table>

          <p className="mt-4 text-justify leading-relaxed">
            Nama tersebut di atas adalah benar-benar warga kami dan tergolong keluarga yang tidak mampu / keluarga berpenghasilan rendah. Surat keterangan ini dibuat untuk keperluan : <strong>{formData.purpose}</strong>.
          </p>
        </>
      ) : (
        <p className="mt-6 text-justify leading-relaxed">
          Nama tersebut di atas adalah benar-benar warga kami dan tergolong keluarga yang tidak mampu / keluarga berpenghasilan rendah. Surat keterangan ini dibuat untuk keperluan : <strong>{formData.purpose}</strong>.
        </p>
      )}

      <p className="mt-4 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
