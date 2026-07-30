'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, formatTTL, toProperCase } from './print-layout';

/**
 * Custom data row for the Birth Certificate template.
 * Uses 3 columns to ensure multiline alignment (e.g. for address).
 */
const CustomDataRow = ({ label, value, indent = false }: { label: string; value?: any; indent?: boolean }) => {
  const colon = value !== undefined && value !== null ? ':' : '';
  let displayValue = value !== undefined && value !== null ? value : '';

  if (typeof displayValue === 'string') {
    const lowerLabel = label.toLowerCase();
    if (
      lowerLabel.includes('nama') ||
      lowerLabel.includes('alamat') ||
      lowerLabel.includes('tempat') ||
      lowerLabel.includes('tgl lahir') ||
      lowerLabel.includes('tanggal lahir') ||
      lowerLabel.includes('pekerjaan')
    ) {
      displayValue = toProperCase(displayValue);
    }
  }

  return (
    <tr>
      <td className={`py-0.5 align-top ${indent ? 'pl-8 w-[35%]' : 'w-[30%]'}`}>{label}</td>
      <td className="w-[2%] py-0.5 align-top text-center">{colon}</td>
      <td className="w-[68%] py-0.5 align-top pl-1">{displayValue}</td>
    </tr>
  );
};

export function KelahiranPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout
      submission={submission}
      requesterLabel="Pelapor"
      requesterNameOverride={formData.reporterName}
    >
      <p className="mt-6 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini, Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, dengan ini menerangkan kepada :
      </p>

      <table className="mt-4 border-collapse w-full text-sm">
        <tbody>
          <CustomDataRow label="Nama Anak" value={formData.childName} />
          <CustomDataRow label="Jenis Kelamin" value={formData.childGender} />
          <CustomDataRow label="NIK Anak" value={formData.childNik || '-'} />
          <CustomDataRow label="Tempat / Tgl Lahir" value={formatTTL(formData.childBirthPlace, formData.childBirthDate)} />
          <CustomDataRow label="Waktu Lahir" value={formData.childBirthTime} />
          <CustomDataRow label="Tempat Dilahirkan" value={formData.childBirthLocation} />
          <CustomDataRow label="Anak Ke" value={formData.childOrder} />
          <CustomDataRow label="Berat Bayi" value={formData.birthWeight} />
          <CustomDataRow label="Panjang Bayi" value={formData.birthLength} />
          <CustomDataRow label="Penolong Kelahiran" value={formData.birthAssistant} />
          <CustomDataRow label="Alamat" value={formData.childAddress} />

          <tr><td colSpan={3} className="pt-4 font-bold border-b">ORANG TUA</td></tr>

          <CustomDataRow label="IBU" value={null} />
          <CustomDataRow label="Nama" value={formData.motherName} indent />
          <CustomDataRow label="Tempat/Tgl Lahir" value={formatTTL(formData.motherBirthPlace, formData.motherBirthDate)} indent />
          <CustomDataRow label="Pekerjaan" value={formData.motherJob} indent />
          <CustomDataRow label="Alamat" value={formData.motherAddress} indent />

          <CustomDataRow label="AYAH" value={null} />
          <CustomDataRow label="Nama" value={formData.fatherName} indent />
          <CustomDataRow label="NIK Ayah" value={formData.fatherNik} indent />
          <CustomDataRow label="Tempat/Tgl Lahir" value={formatTTL(formData.fatherBirthPlace, formData.fatherBirthDate)} indent />
          <CustomDataRow label="Pekerjaan" value={formData.fatherJob} indent />
          <CustomDataRow label="Alamat" value={formData.fatherAddress} indent />

          <tr><td colSpan={3} className="pt-4 font-bold border-b">PELAPOR & SAKSI</td></tr>

          <CustomDataRow label="PELAPOR" value={formData.reporterName} />
          <CustomDataRow label="NIK Pelapor" value={formData.reporterNik} indent />
          <CustomDataRow label="Umur" value={`${formData.reporterAge} Tahun`} indent />
          <CustomDataRow label="Pekerjaan" value={formData.reporterJob} indent />
          <CustomDataRow label="Alamat" value={formData.reporterAddress} indent />

          <CustomDataRow label="SAKSI I" value={formData.witness1Name} />
          <CustomDataRow label="NIK Saksi I" value={formData.witness1Nik} indent />
          <CustomDataRow label="Umur" value={`${formData.witness1Age} Tahun`} indent />
          <CustomDataRow label="Pekerjaan" value={formData.witness1Job} indent />
          <CustomDataRow label="Alamat" value={formData.witness1Address} indent />

          <CustomDataRow label="SAKSI II" value={formData.witness2Name} />
          <CustomDataRow label="NIK Saksi II" value={formData.witness2Nik} indent />
          <CustomDataRow label="Umur" value={`${formData.witness2Age} Tahun`} indent />
          <CustomDataRow label="Pekerjaan" value={formData.witness2Job} indent />
          <CustomDataRow label="Alamat" value={formData.witness2Address} indent />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed">
        Demikian Surat Keterangan Lahir ini dibuat dengan sebenarnya untuk dapat digunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
