import { create } from 'zustand'

export const useStore = create((set) => ({
  // State
  isOpen: false, // 专门用来控制门的状态
  score: 0,

  // Actions
  toggleDoor: () => set((state) => ({ 
    isOpen: !state.isOpen,
    score: !state.isOpen ? state.score + 10 : state.score // 只有打开时加分
  })),
}))