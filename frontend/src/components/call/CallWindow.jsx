import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocketInstance } from '../../hooks/useSocket';
import useAuthStore from '../../stores/authStore';
import api from '../../api/axios';

const CallWindow = ({ peerId, peerName, callType, onEnd, remoteOffer, isIncoming, initialIceCandidates = [] }) => {
  const { user } = useAuthStore();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const timerRef = useRef(null);
  const socket = getSocketInstance();
  const startTimeRef = useRef(null);
  
  const isMounted = useRef(true);
  const isRemoteDescriptionSet = useRef(false);
  const pendingIceCandidatesRef = useRef([...initialIceCandidates]);

  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

  useEffect(() => {
    isMounted.current = true;
    startCall();
    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, []);

  const applyIceCandidates = async () => {
    if (!pcRef.current || !isRemoteDescriptionSet.current) return;
    const candidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];
    for (const c of candidates) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } 
      catch (err) { console.error('Error adding ICE candidate:', err); }
    }
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });

      if (!isMounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit('iceCandidate', { peerId, candidate: event.candidate });
        }
      };

      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (isMounted.current) {
          setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);

      if (isIncoming) {
        // Answer the call
        await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
        isRemoteDescriptionSet.current = true;
        await applyIceCandidates();
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit('acceptCall', { callerId: peerId, answer });
      } else {
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('callUser', { calleeId: peerId, offer, type: callType, callerName: user?.name });
      }
    } catch (err) {
      console.error('Call setup failed:', err);
      if (err.name === 'NotAllowedError') {
        alert('Camera or microphone access was denied. Please allow permissions in your browser.');
      } else if (err.name === 'NotFoundError') {
        alert('No camera or microphone found on this device.');
      } else if (err.name === 'NotReadableError') {
        alert('Your camera/microphone is currently in use by another application or tab.');
      } else {
        alert('Failed to connect to media devices: ' + err.message);
      }
      if (isMounted.current) handleEnd(false);
    }
  };

  // Dedicated useEffect for socket listeners to prevent ghost listeners
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = async ({ answer }) => {
      try {
        if (pcRef.current) {
          if (pcRef.current.signalingState === 'stable') {
            console.log('Ignoring duplicate answer, connection already stable.');
            return;
          }
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          isRemoteDescriptionSet.current = true;
          await applyIceCandidates();
        }
      } catch (err) {
        console.error('Failed to set remote description from answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (isRemoteDescriptionSet.current && pcRef.current) {
        try { 
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); 
        } catch (err) { 
          console.error('Live ICE candidate error:', err); 
        }
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
    };

    const handleCallEnded = () => {
      saveCallRecord('completed');
      handleEnd(false);
    };

    socket.on('callAccepted', handleCallAccepted);
    socket.on('iceCandidate', handleIceCandidate);
    socket.on('callEnded', handleCallEnded);

    return () => {
      socket.off('callAccepted', handleCallAccepted);
      socket.off('iceCandidate', handleIceCandidate);
      socket.off('callEnded', handleCallEnded);
    };
  }, [socket]);

  const saveCallRecord = async (status) => {
    try {
      const duration = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;
      await api.post('/calls', {
        calleeId: isIncoming ? user._id : peerId,
        callerId: isIncoming ? peerId : user._id,
        type: callType,
        status,
        duration,
      });
    } catch {}
  };

  const handleEnd = useCallback((saveRecord = true) => {
    if (saveRecord) {
      socket?.emit('endCall', { peerId });
      saveCallRecord('completed');
    }
    cleanup();
    onEnd?.();
  }, [socket, peerId, onEnd]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { 
      track.enabled = !track.enabled; 
      setIsMuted(!track.enabled); 
    }
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { 
      track.enabled = !track.enabled; 
      setIsCameraOff(!track.enabled); 
    }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white">
      {/* Remote video / audio placeholder */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        
        {/* We must ALWAYS render a media element so we can attach remote audio tracks! */}
        {callType === 'video' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <audio ref={remoteVideoRef} autoPlay playsInline className="hidden" />
        )}

        {/* UI overlay for audio calls */}
        {callType !== 'video' && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-accent text-5xl font-bold shadow-2xl">
              {peerName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-medium">{peerName}</h2>
              <p className="mt-2 text-neutral-400">{fmt(callDuration)}</p>
            </div>
          </div>
        )}

        {/* Local video (pip) */}
        {callType === 'video' && (
          <div className="absolute right-6 top-6 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-40 w-28 object-cover"
            />
          </div>
        )}
      </div>

      {/* Floating Pill Controls */}
      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-neutral-900/80 px-6 py-4 shadow-2xl backdrop-blur-md">
        <button
          id="mute-btn"
          onClick={toggleMute}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          )}
        </button>

        {callType === 'video' && (
          <button
            id="camera-btn"
            onClick={toggleCamera}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${isCameraOff ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={isCameraOff ? 'Enable camera' : 'Disable camera'}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </button>
        )}

        <div className="mx-2 h-8 w-px bg-white/10" />

        <button
          id="end-call-btn"
          onClick={() => handleEnd(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition hover:scale-105 hover:bg-red-600"
          title="End call"
        >
          <svg className="h-6 w-6 rotate-135" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CallWindow;
