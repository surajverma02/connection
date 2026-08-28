const IncomingCallModal = ({ callerName, callType, onAccept, onReject }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="w-80 rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-neutral-900">
      {/* Avatar */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white ring-4 ring-accent/30">
        {callerName?.[0]?.toUpperCase() || '?'}
      </div>

      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{callerName}</h3>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Incoming {callType} call…
      </p>

      {/* Animated pulse ring */}
      <div className="relative mx-auto my-6 flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-30" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
          {callType === 'video' ? (
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          id="reject-call-btn"
          onClick={onReject}
          className="flex-1 rounded-xl bg-red-100 py-2.5 text-sm font-medium text-red-600 hover:bg-red-200 dark:bg-red-950 dark:text-red-400"
        >
          Decline
        </button>
        <button
          id="accept-call-btn"
          onClick={onAccept}
          className="flex-1 rounded-xl bg-green-500 py-2.5 text-sm font-medium text-white hover:bg-green-600"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
);

export default IncomingCallModal;
