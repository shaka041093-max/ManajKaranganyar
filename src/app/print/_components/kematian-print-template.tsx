'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, formatTTL, toProperCase } from './print-layout';

/**
 * Custom data row for the Death Certificate template.
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

export function KematianPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission} requesterLabel="Pelapor" reverseSignatures={true}>
      <p className="mt-6 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sesungguhnya bahwa :
      </p>

      <table className="mt-4 border-collapse w-full text-sm">
        <tbody>
          <CustomDataRow label="Nama Kepala Keluarga" value={formData.kkHead} />
          <CustomDataRow label="Nomor KK" value={formData.kkNumber} />

          <tr><td colSpan={3} className="pt-4 font-bold border-b">DATA JENAZAH</td></tr>
          <CustomDataRow label="Nama Jenazah" value={formData.name} />
          <CustomDataRow label="NIK Jenazah" value={formData.nik} />
          <CustomDataRow label="Jenis Kelamin" value={formData.gender} />
          <CustomDataRow label="Tempat / Tgl Lahir" value={formatTTL(formData.placeOfBirth, formData.birthDate)} />
          <CustomDataRow label="Umur" value={`${formData.age} Tahun`} />
          <CustomDataRow label="Agama" value={formData.religion} />
          <CustomDataRow label="Pekerjaan" value={formData.occupation} />
          <CustomDataRow label="Alamat" value={formData.address} />
          <CustomDataRow label="Anak Ke" value={formData.anakKe} />

          <tr><td colSpan={3} className="pt-4 font-bold border-b">KEJADIAN KEMATIAN</td></tr>
          <CustomDataRow label="Hari / Tanggal" value={new Date(formData.deathDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          <CustomDataRow label="Pukul" value={formData.deathTime} />
          <CustomDataRow label="Sebab Kematian" value={formData.deathCause} />
          <CustomDataRow label="Tempat Kematian" value={formData.deathLocation} />
          <CustomDataRow label="Yang Menerangkan" value={formData.whoExplains} />

          <tr><td colSpan={3} className="pt-4 font-bold border-b">DATA ORANG TUA JENAZAH</td></tr>
          <CustomDataRow label="AYAH" value={null} />
          <CustomDataRow label="Nama Ayah" value={formData.fatherName} indent />
          <CustomDataRow label="NIK Ayah" value={formData.fatherNik || '-'} indent />
          <CustomDataRow label="TTL Ayah" value={formatTTL(formData.fatherPlaceOfBirth || '', formData.fatherBirthDate || '')} indent />
          <CustomDataRow label="Pekerjaan Ayah" value={formData.fatherJob || '-'} indent />
          <CustomDataRow label="Alamat Ayah" value={formData.fatherAddress || '-'} indent />

          <CustomDataRow label="IBU" value={null} />
          <CustomDataRow label="Nama Ibu" value={formData.motherName} indent />
          <CustomDataRow label="NIK Ibu" value={formData.motherNik || '-'} indent />
          <CustomDataRow label="TTL Ibu" value={formatTTL(formData.motherPlaceOfBirth || '', formData.motherBirthDate || '')} indent />
          <CustomDataRow label="Pekerjaan Ibu" value={formData.motherJob || '-'} indent />
          <CustomDataRow label="Alamat Ibu" value={formData.motherAddress || '-'} indent />
        </tbody>
      </table>

      {/* Force page break for Reporter and Witnesses section */}
      <div style={{ breakBefore: 'page' }} className="print:pt-8"></div>

      <table className="mt-4 border-collapse w-full text-sm">
        <tbody>
          <tr><td colSpan={3} className="pt-4 font-bold border-b">PELAPOR & SAKSI</td></tr>
          <CustomDataRow label="PELAPOR" value={formData.reporterName} />
          <CustomDataRow label="NIK Pelapor" value={formData.reporterNik} indent />
          <CustomDataRow label="TTL Pelapor" value={formatTTL(formData.reporterPlaceOfBirth, formData.reporterBirthDate)} indent />
          <CustomDataRow label="Pekerjaan Pelapor" value={formData.reporterJob} indent />
          <CustomDataRow label="Alamat Pelapor" value={formData.reporterAddress} indent />

          <CustomDataRow label="SAKSI I" value={formData.witness1Name} />
          <CustomDataRow label="NIK Saksi I" value={formData.witness1Nik} indent />
          <CustomDataRow label="TTL Saksi I" value={formatTTL(formData.witness1PlaceOfBirth, formData.witness1BirthDate)} indent />
          <CustomDataRow label="Pekerjaan Saksi I" value={formData.witness1Job} indent />
          <CustomDataRow label="Alamat Saksi I" value={formData.witness1Address} indent />

          <CustomDataRow label="SAKSI II" value={formData.witness2Name} />
          <CustomDataRow label="NIK Saksi II" value={formData.witness2Nik} indent />
          <CustomDataRow label="TTL Saksi II" value={formatTTL(formData.witness2PlaceOfBirth, formData.witness2BirthDate)} indent />
          <CustomDataRow label="Pekerjaan Saksi II" value={formData.witness2Job} indent />
          <CustomDataRow label="Alamat Saksi II" value={formData.witness2Address} indent />
        </tbody>
      </table>

      <p className="mt-6 text-justify leading-relaxed">
        Demikian Surat Keterangan Kematian ini dibuat dengan sebenarnya untuk dapat digunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
