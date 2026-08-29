/**
 * formatLastSeen(lastSeen)
 *
 * Returns a human-readable relative string for when a user was last online.
 * Used wherever we would otherwise show the raw word "Offline".
 *
 * Examples:
 *   null / undefined  -> "Offline"
 *   < 60 seconds ago  -> "last seen just now"
 *   < 60 minutes ago  -> "last seen 5 minutes ago"
 *   < 24 hours ago    -> "last seen 3 hours ago"
 *   < 7 days ago      -> "last seen 2 days ago"
 *   otherwise         -> "last seen on 12 Aug"
 */
export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Offline';

  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)  return 'last seen just now';
  if (diffMin < 60)  return `last seen ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr  < 24)  return `last seen ${diffHr} hour${diffHr  === 1 ? '' : 's'} ago`;
  if (diffDay <  7)  return `last seen ${diffDay} day${diffDay  === 1 ? '' : 's'} ago`;

  return `last seen on ${new Date(lastSeen).toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
};
