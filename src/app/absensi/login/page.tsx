"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, Loader2, KeyRound, User, ArrowLeft, UserCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signInWithEmailAndPassword } from "firebase/auth"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import Link from "next/link"

const loginSchema = z.object({
  username: z.string().min(1, "Username harus diisi."),
  password: z.string().min(1, "Password harus diisi."),
})

export default function AbsensiLoginPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user && !isUserLoading) {
      router.replace("/absensi/dashboard/")
    }
  }, [user, isUserLoading, router, mounted])

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (!db) return
    setIsProcessing(true)
    try {
      const cleanUsername = values.username.trim().toLowerCase()
      
      // 1. DYNAMIC LOOKUP: Cari email di Firestore berdasarkan username
      const personelRef = collection(db, "personel")
      const q = query(personelRef, where("username", "==", cleanUsername), limit(1))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error(`Username '${cleanUsername}' tidak ditemukan. Pastikan Admin sudah mengaktifkan akun Anda.`)
      }

      const userData = querySnapshot.docs[0].data()
      const targetEmail = userData.email

      if (!userData.aktif) {
        throw new Error("Akun Anda dinonaktifkan. Hubungi Admin.")
      }

      // 2. Sign in via Firebase Auth using the retrieved email
      await signInWithEmailAndPassword(auth, targetEmail, values.password)

      toast({ title: "Berhasil Masuk", description: "Selamat bekerja, " + (userData.nama || cleanUsername) })
      router.push("/absensi/dashboard/")
    } catch (error: any) {
      console.error("Login Error:", error);
      let msg = "Terjadi kesalahan sistem."
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        msg = "Username atau kata sandi salah."
      } else {
        msg = error.message || msg
      }
      
      toast({ variant: "destructive", title: "Gagal Masuk", description: msg })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!mounted) return null;

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-card">
        <CardHeader className="text-center space-y-4 pb-4 pt-12 relative">
          <Button variant="ghost" size="icon" asChild className="absolute left-6 top-6 rounded-full">
            <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="mx-auto h-20 w-20 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
            <UserCheck className="text-primary-foreground h-10 w-10" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tighter uppercase text-primary">ABSENSI PERANGKAT</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest opacity-60">Sistem Kehadiran Digital</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8 sm:p-10 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Contoh: riskianasari" 
                        {...field} 
                        className="h-12 rounded-xl pl-10 text-sm border-primary/10 bg-muted/30" 
                        autoComplete="off"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Kata Sandi</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="password" 
                        placeholder="******" 
                        {...field} 
                        className="h-12 rounded-xl pl-10 text-sm border-primary/10 bg-muted/30" 
                        autoComplete="new-password"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-14 text-base font-black uppercase gap-4 shadow-lg rounded-2xl bg-primary hover:bg-primary/90 mt-4" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <><LogIn className="h-5 w-5" /> Masuk Absensi</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
