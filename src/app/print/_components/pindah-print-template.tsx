'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, toProperCase } from './print-layout';

export function PindahPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission}>
      <p className="mt-8 text-justify leading-relaxed">
        Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan bahwa:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow label="Nama Lengkap" value={formData.name} />
          <DataRow label="NIK" value={formData.nik} />
          <DataRow label="Nomor KK" value={formData.kkNumber} />
          <DataRow label="Nama Kepala Keluarga" value={formData.kkHead} />
          <DataRow label="Alamat Asal" value={`Desa Rungkang, RT ${formData.currentAddressRt} / RW ${formData.currentAddressRw}, Kecamatan Gandrungmangu, Kabupaten Cilacap, Provinsi Jawa Tengah`} />
        </tbody>
      </table>

      <p className="mt-4 text-justify leading-relaxed">
        Bermaksud untuk pindah alamat ke:
      </p>

      <table className="mt-4 border-collapse w-full">
        <tbody>
          <DataRow
            label="Alamat Tujuan"
            value={`Desa ${formData.destinationAddress}, RT ${formData.destinationAddressRt} / RW ${formData.destinationAddressRw}, Kecamatan ${formData.destinationKecamatan}, Kabupaten ${formData.destinationKabupaten}, Provinsi ${formData.destinationProvinsi}`}
          />
          <DataRow label="Jumlah Keluarga" value={`${formData.familyCount} orang`} />
        </tbody>
      </table>

      {formData.familyMembers && formData.familyMembers.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 font-semibold">Adapun anggota keluarga yang ikut pindah adalah sebagai berikut:</p>
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-black px-2 py-1 text-center w-10">No</th>
                <th className="border border-black px-2 py-1 text-left">NIK</th>
                <th className="border border-black px-2 py-1 text-left">Nama Lengkap</th>
                <th className="border border-black px-2 py-1 text-left">SHDK</th>
              </tr>
            </thead>
            <tbody>
              {formData.familyMembers.map((member: any, index: number) => (
                <tr key={index}>
                  <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                  <td className="border border-black px-2 py-1">{member.nik}</td>
                  <td className="border border-black px-2 py-1">{toProperCase(member.name)}</td>
                  <td className="border border-black px-2 py-1">{member.relationship}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-justify leading-relaxed">
        Surat pengantar ini dibuat sebagai kelengkapan administrasi untuk proses pindah domisili yang bersangkutan.
      </p>
      <p className="mt-4 text-justify leading-relaxed">
        Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
