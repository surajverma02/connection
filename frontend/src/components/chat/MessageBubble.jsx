const MessageBubble = ({ message, isOwn, showAvatar, onImageClick }) => {
  const fmt = (date) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const StatusIcon = () => {
    if (!isOwn) return null;
    const { status } = message;
    if (status === 'seen') {
      return <span className="text-[11px] text-neutral-400 dark:text-neutral-500" title="Seen">✓✓</span>;
    }
    if (status === 'delivered') {
      return <span className="text-[11px] text-neutral-400/70 dark:text-neutral-500/70" title="Delivered">✓✓</span>;
    }
    return <span className="text-[11px] text-neutral-400/70 dark:text-neutral-500/70" title="Sent">✓</span>;
  };

  return (
    <div className={`mb-3 flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar placeholder for spacing */}
      {!isOwn && (
        <div className={`mr-2 flex-shrink-0 ${showAvatar ? 'visible' : 'invisible'}`}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            {message.sender?.name?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Image */}
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="attachment"
            onClick={() => onImageClick?.(message.imageUrl)}
            className="mb-1 max-w-[240px] cursor-pointer rounded-lg object-cover transition-transform hover:opacity-90"
          />
        )}

        {/* Text bubble */}
        {message.text && (
          <div
            className={`rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
              isOwn
                ? 'rounded-br-sm bg-accent text-white shadow-sm'
                : 'rounded-bl-sm bg-neutral-100 text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Time + status */}
        <div className={`mt-0.5 flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[11px] text-neutral-400">
            {fmt(message.createdAt)}
          </span>
          <StatusIcon />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
