import { create } from 'zustand';

const useCallStore = create((set) => ({
  incomingCall: null,
  activeCall: null,
  pendingIceCandidates: [],
  
  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  addIceCandidate: (candidate) => set((state) => ({ pendingIceCandidates: [...state.pendingIceCandidates, candidate] })),
  clearIceCandidates: () => set({ pendingIceCandidates: [] }),
  clearCalls: () => set({ incomingCall: null, activeCall: null, pendingIceCandidates: [] }),
}));

export default useCallStore;
