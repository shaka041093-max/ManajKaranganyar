/**
 * @fileOverview Daftar kredensial internal untuk Portal Absensi.
 * Hanya menyertakan admin sistem utama. Personel lain dikelola via Firestore.
 */

const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@karanganyar.id").trim().toLowerCase();
const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "karanganyar123";

export const INTERNAL_USERS = [
  {
    username: "adminkaranganyar",
    email: adminEmail,
    password: adminPassword,
    role: "admin_absensi",
    nama: "ADMINISTRATOR ABSENSI"
  }
];
