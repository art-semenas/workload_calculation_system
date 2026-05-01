import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  svodPrecision: 2 | 6
  setSvodPrecision: (precision: 2 | 6) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      svodPrecision: 2,
      setSvodPrecision: (precision) => set({ svodPrecision: precision }),
    }),
    { name: 'workload-ui' }
  )
)
