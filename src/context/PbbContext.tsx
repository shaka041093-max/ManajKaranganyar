"use client"

import { createContext, useContext, useState, useMemo, ReactNode } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { DhkpRecord, Kolektor, Wilayah, TransaksiPbb } from "@/types/pbb"

interface PbbContextType {
  selectedYear: string
  setSelectedYear: (year: string) => void
  dhkpList: DhkpRecord[]
  kolektorList: Kolektor[]
  wilayahList: Wilayah[]
  transaksiList: TransaksiPbb[]
  loadingDhkp: boolean
  loadingKolektor: boolean
  loadingWilayah: boolean
  loadingTx: boolean
}

const PbbContext = createContext<PbbContextType | undefined>(undefined)

export function PbbProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const db = useFirestore()

  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  )

  // 1. Quota-Optimized Firestore Query: Only query active tax year!
  const dhkpQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "pbb_dhkp"), where("tahun", "==", selectedYear))
  }, [db, user, selectedYear])

  const kolektorQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "pbb_kolektor")
  }, [db, user])

  const wilayahQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "pbb_wilayah")
  }, [db, user])

  const transaksiQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "pbb_transaksi"), where("tahun", "==", selectedYear))
  }, [db, user, selectedYear])

  // Single shared real-time listeners at layout level
  const { data: dhkpData, isLoading: loadingDhkp } = useCollection<DhkpRecord>(dhkpQuery)
  const { data: kolektorData, isLoading: loadingKolektor } = useCollection<Kolektor>(kolektorQuery)
  const { data: wilayahData, isLoading: loadingWilayah } = useCollection<Wilayah>(wilayahQuery)
  const { data: txData, isLoading: loadingTx } = useCollection<TransaksiPbb>(transaksiQuery)

  const dhkpList = useMemo(() => dhkpData || [], [dhkpData])
  const kolektorList = useMemo(() => kolektorData || [], [kolektorData])
  const wilayahList = useMemo(() => wilayahData || [], [wilayahData])
  const transaksiList = useMemo(() => txData || [], [txData])

  return (
    <PbbContext.Provider
      value={{
        selectedYear,
        setSelectedYear,
        dhkpList,
        kolektorList,
        wilayahList,
        transaksiList,
        loadingDhkp,
        loadingKolektor,
        loadingWilayah,
        loadingTx,
      }}
    >
      {children}
    </PbbContext.Provider>
  )
}

export function usePbbContext() {
  const context = useContext(PbbContext)
  if (!context) {
    throw new Error("usePbbContext must be used within a PbbProvider")
  }
  return context
}
