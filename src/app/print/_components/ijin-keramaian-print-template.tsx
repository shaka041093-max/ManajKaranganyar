'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL, formatFullDate } from './print-layout';

export function IjinKeramaianPrintTemplate({ submission }: { submission: LetterSubmission }) {
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
          <p>__________________________</p>
        </div>
        <div className="w-1/3">
          <p className="font-bold">DAN RAMIL</p>
          <p>Gandrungmangu</p>
          <div className="h-20"></div>
          <p>__________________________</p>
        </div>
        <div className="w-1/3">
          <p className="font-bold">KAPOLSEK</p>
          <p>Gandrungmangu</p>
          <div className="h-20"></div>
          <p>__________________________</p>
        </div>
      </div>
    </div>
  );

  return (
    <PrintLayout
      submission={submission}
      additionalFooter={additionalFooter}
    >
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan dibawah ini kepala Desa Rungkang, Kecamatan Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
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

      <p className="mt-4 text-justify leading-relaxed">
        Orang tersebut di atas adalah benar-benar penduduk Desa Rungkang, Kecamatan Gandrungmangu, Kabupaten Cilacap.
      </p>

      <p className="mt-4 text-justify leading-relaxed">
        Adapun Surat keterangan ini untuk dipergunakan sebagai persyaratan ijin keramaian pada:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Tanggal Acara" value={formatFullDate(formData.eventDate)} />
          <DataRow label="Sampai dengan Tanggal" value={formatFullDate(formData.eventEndDate)} />
          <DataRow label="Jumlah Undangan" value={formData.guestCount} />
          <DataRow label="Acara" value={formData.eventName} />
          <DataRow label="Hiburan" value={formData.eventEntertainment} />
          <DataRow label="Tempat" value={formData.eventLocation} />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
