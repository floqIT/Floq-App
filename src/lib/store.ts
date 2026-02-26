import { create } from 'zustand'

export type Stage = 'IDEATE' | 'IDENTIFY' | 'SHAPE' | 'BUILD' | 'QA' | 'SHIP' | 'MEASURE' | 'DELIVER' | 'PIVOT'
export type SignalStatus = 'NORMAL' | 'AT_RISK' | 'EMERGENCY' | 'DELIVERED'

export interface Outcome {
  id: string
  title: string
  targetMetric?: string
  impactScore: number
  stage: Stage
  signalStatus: SignalStatus
  isAiPair: boolean
  currentId?: string
  assigneeId?: string
  createdAt: string
  stageChangedAt: string
}

export interface Current {
  id: string
  name: string
  color: string
}

interface BoardStore {
  outcomes: Outcome[]
  currents: Current[]
  selectedOutcomeId: string | null
  filterStage: Stage | 'ALL'
  filterCurrentId: string | null

  setOutcomes: (outcomes: Outcome[]) => void
  setCurrents: (currents: Current[]) => void
  selectOutcome: (id: string | null) => void
  moveOutcome: (id: string, stage: Stage) => void
  markEmergency: (id: string) => void
  clearEmergency: (id: string) => void
  setFilterStage: (stage: Stage | 'ALL') => void
  setFilterCurrent: (id: string | null) => void
}

export const useBoardStore = create<BoardStore>((set) => ({
  outcomes: [],
  currents: [],
  selectedOutcomeId: null,
  filterStage: 'ALL',
  filterCurrentId: null,

  setOutcomes: (outcomes) => set({ outcomes }),
  setCurrents: (currents) => set({ currents }),
  selectOutcome: (id) => set({ selectedOutcomeId: id }),

  moveOutcome: (id, stage) =>
    set((state) => ({
      outcomes: state.outcomes.map((o) =>
        o.id === id ? { ...o, stage, stageChangedAt: new Date().toISOString() } : o
      ),
    })),

  markEmergency: (id) =>
    set((state) => ({
      outcomes: state.outcomes.map((o) =>
        o.id === id ? { ...o, signalStatus: 'EMERGENCY' } : o
      ),
    })),

  clearEmergency: (id) =>
    set((state) => ({
      outcomes: state.outcomes.map((o) =>
        o.id === id ? { ...o, signalStatus: 'NORMAL' } : o
      ),
    })),

  setFilterStage: (filterStage) => set({ filterStage }),
  setFilterCurrent: (filterCurrentId) => set({ filterCurrentId }),
}))
