'use client';

import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function SkuPrintTemplate({ submission }: { submission: LetterSubmission }) {
    const { formData } = submission;

    return (
        <PrintLayout submission={submission} hideRequesterSignature={true}>
            <p className="mt-8 text-justify leading-relaxed">
                Yang bertanda tangan di bawah ini Kepala Desa Rungkang, Kecamatan
                Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenar-benarnya bahwa :
            </p>

            <table className="mt-4 border-collapse w-full">
                <tbody>
                    <DataRow label="Nama" value={formData.name} />
                    <DataRow label="NIK" value={formData.nik} />
                    <DataRow label="Tempat/Tgl Lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
                    <DataRow label="Jenis Kelamin" value={formData.gender} />
                    <DataRow label="Alamat" value={formData.address} />
                    <DataRow label="Pekerjaan" value={formData.job} />
                </tbody>
            </table>

            <p className="mt-4 text-justify leading-relaxed">
                Adalah benar yang bersangkutan memiliki usaha dengan keterangan sebagai berikut:
            </p>
            <table className="mt-4 border-collapse w-full">
                <tbody>
                    <DataRow label="Nama Usaha" value={formData.businessName} />
                    <DataRow label="Jenis Usaha" value={formData.businessType} />
                    <DataRow label="Alamat Usaha" value={formData.businessAddress} />
                    <DataRow label="Berdiri Sejak" value={formData.businessSince} />
                </tbody>
            </table>

            <p className="mt-4 text-justify leading-relaxed">
                Surat keterangan ini dibuat untuk keperluan : {formData.purpose}
            </p>
            <p className="mt-4 text-justify leading-relaxed">
                Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
            </p>
        </PrintLayout>
    );
}
