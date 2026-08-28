import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import Navbar from '../components/Navbar';
import SlimSidebar from '../components/SlimSidebar';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import useChatStore from '../stores/chatStore';
import useCallStore from '../stores/callStore';

const Home = () => {
  const { activeConversation, setActiveConversation } = useChatStore();
  const [showMobileChat, setShowMobileChat] = useState(false);

  const { setActiveCall } = useCallStore();

  const startCall = (type) => {
    if (!activeConversation) return;
    const other = activeConversation.participants?.find(
      (p) => p._id !== activeConversation._localUserId
    );
    if (!other) return;
    setActiveCall({
      peerId: other._id,
      peerName: other.name,
      callType: type,
      isIncoming: false,
      remoteOffer: null,
    });
  };

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setShowMobileChat(true);
  };

  return (
    <div className="flex h-[100dvh] bg-white dark:bg-neutral-950">
      <SlimSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — conversation list */}
          <aside
            className={`w-full flex-shrink-0 sm:w-72 md:w-80 ${
              showMobileChat ? 'hidden sm:flex sm:flex-col' : 'flex flex-col'
            }`}
          >
          <ConversationList onSelect={handleSelectConversation} />
        </aside>

        {/* Main chat area */}
        <main
          className={`flex flex-1 flex-col overflow-hidden ${
            !showMobileChat ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              <ChatWindow 
                conversation={activeConversation} 
                onBack={() => { setShowMobileChat(false); setActiveConversation(null); }}
                onStartCall={startCall}
              />
            </>
          ) : (
            <EmptyState
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              }
              title="Select a conversation"
              description="Or start a new one from the sidebar."
            />
          )}
        </main>
      </div>

      </div>
    </div>
  );
};

export default Home;
