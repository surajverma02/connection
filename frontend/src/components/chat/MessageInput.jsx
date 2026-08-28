import { useState, useRef, useCallback } from 'react';
import api from '../../api/axios';
import useChatStore from '../../stores/chatStore';
import { getSocketInstance } from '../../hooks/useSocket';
import useAuthStore from '../../stores/authStore';

const MessageInput = ({ conversationId }) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { addMessage, updateLastMessage } = useChatStore();
  const { user } = useAuthStore();
  const typingTimeoutRef = useRef(null);
  const socket = getSocketInstance();

  // ─── Typing emission (debounced 300ms) ───────────────────────────
  const emitTyping = useCallback(() => {
    socket?.emit('typing', { conversationId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('stopTyping', { conversationId });
    }, 1500);
  }, [conversationId, socket]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    emitTyping();
  };

  // ─── Send text message ────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    socket?.emit('stopTyping', { conversationId });
    try {
      const res = await api.post(`/messages/${conversationId}`, { text: trimmed });
      addMessage(conversationId, res.data.message);
      updateLastMessage(conversationId, res.data.message);
      setText('');
    } catch (err) {
      console.error('Send failed', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Image upload ─────────────────────────────────────────────────
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side compress (basic — limit to 800px via canvas if needed)
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const uploadRes = await api.post('/upload?folder=mern-chat/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const res = await api.post(`/messages/${conversationId}`, {
        imageUrl: uploadRes.data.url,
      });
      addMessage(conversationId, res.data.message);
      updateLastMessage(conversationId, res.data.message);
    } catch (err) {
      console.error('Image upload failed', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="sticky bottom-0 z-10 p-4">
      <div className="flex items-end gap-2 rounded-3xl border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {/* Image attach */}
        <label
          htmlFor="image-attach"
          className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          title="Attach image"
        >
          {isUploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-accent" />
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          )}
          <input
            id="image-attach"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </label>

        {/* Text input */}
        <textarea
          id="message-input"
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          className="min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-neutral-900 placeholder-neutral-400 focus:outline-none dark:text-white dark:placeholder-neutral-500"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />

        {/* Send button */}
        <button
          id="send-btn"
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-all hover:bg-accent-hover active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
