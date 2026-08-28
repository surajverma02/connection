import { useEffect } from 'react';
import IncomingCallModal from './IncomingCallModal';
import CallWindow from './CallWindow';
import { getSocketInstance } from '../../hooks/useSocket';
import useCallStore from '../../stores/callStore';

const CallManager = () => {
  const {
    incomingCall, setIncomingCall,
    activeCall, setActiveCall,
    pendingIceCandidates, addIceCandidate, clearIceCandidates, clearCalls
  } = useCallStore();

  useEffect(() => {
    const socket = getSocketInstance();
    if (!socket) return;

    const handleIncomingCall = ({ callerId, callerName, offer, type }) => {
      setIncomingCall({ callerId, callerName: callerName || 'Someone', offer, type });
      clearIceCandidates();
    };

    const handleIceCandidate = ({ candidate }) => addIceCandidate(candidate);

    const handleCallRejected = () => {
      alert('Call was declined.');
      clearCalls();
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
      clearIceCandidates();
    };

    socket.on('incomingCall', handleIncomingCall);
    socket.on('iceCandidate', handleIceCandidate);
    socket.on('callRejected', handleCallRejected);
    socket.on('callEnded', handleCallEnded);

    return () => {
      socket.off('incomingCall', handleIncomingCall);
      socket.off('iceCandidate', handleIceCandidate);
      socket.off('callRejected', handleCallRejected);
      socket.off('callEnded', handleCallEnded);
    };
  }, [setIncomingCall, addIceCandidate, clearIceCandidates, clearCalls]);

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    setActiveCall({
      peerId: incomingCall.callerId,
      peerName: incomingCall.callerName,
      callType: incomingCall.type,
      isIncoming: true,
      remoteOffer: incomingCall.offer,
    });
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    const socket = getSocketInstance();
    socket?.emit('rejectCall', { callerId: incomingCall.callerId });
    setIncomingCall(null);
    clearIceCandidates();
  };

  return (
    <>
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callType={incomingCall.type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      {activeCall && (
        <CallWindow
          peerId={activeCall.peerId}
          peerName={activeCall.peerName}
          callType={activeCall.callType}
          isIncoming={activeCall.isIncoming}
          remoteOffer={activeCall.remoteOffer}
          initialIceCandidates={pendingIceCandidates}
          onEnd={() => {
            setActiveCall(null);
            clearIceCandidates();
          }}
        />
      )}
    </>
  );
};

export default CallManager;
