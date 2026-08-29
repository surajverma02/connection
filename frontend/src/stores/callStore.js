import { create } from 'zustand';

const useCallStore = create((set) => ({
  incomingCall: null,
  activeCall: null,
  pendingIceCandidates: [],

  // Tracks the live connection quality of an active call.
  // 'idle'         – no call in progress
  // 'connecting'   – initial WebRTC handshake underway
  // 'connected'    – media flowing normally
  // 'reconnecting' – ICE path dropped; attempting automatic recovery
  // 'disconnected' – recovery exhausted; user must end the call
  callStatus: 'idle',

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  setCallStatus: (callStatus) => set({ callStatus }),
  addIceCandidate: (candidate) => set((state) => ({ pendingIceCandidates: [...state.pendingIceCandidates, candidate] })),
  clearIceCandidates: () => set({ pendingIceCandidates: [] }),
  clearCalls: () => set({ incomingCall: null, activeCall: null, pendingIceCandidates: [], callStatus: 'idle' }),
}));

export default useCallStore;

