import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { Check, CheckCheck } from "lucide-react";

// Helper to check if a string contains only emojis and spaces
const isEmojiOnly = (str) => {
  if (!str) return false;
  const cleanStr = str.replace(/\s/g, "");
  if (!cleanStr) return false;
  try {
    const emojiRegex = /^[\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\u200d\ufe0f]+$/u;
    return emojiRegex.test(cleanStr);
  } catch (e) {
    return false;
  }
};

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
    reactToMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    // Mark messages as read when tab gains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        useChatStore.getState().markMessagesAsRead(selectedUser._id);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribeFromMessages();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const emojiOnly = msg.text && isEmojiOnly(msg.text);

              return (
                <div
                  key={msg._id}
                  className={`chat ${msg.senderId === authUser._id ? "chat-end" : "chat-start"} group relative message-wrapper`}
                >
                  {/* Reaction Hover Palette */}
                  <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${
                    msg.senderId === authUser._id ? "right-[82%]" : "left-[82%]"
                  }`}>
                    <div className="flex bg-slate-800 border border-slate-700/50 rounded-full p-1 shadow-lg gap-1 scale-90 md:scale-100">
                      {["❤️", "👍", "😂", "😮", "🔥"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => reactToMessage(msg._id, emoji)}
                          className="hover:scale-125 transition-transform px-1 py-0.5 active:scale-95 text-sm"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`chat-bubble relative flex flex-col max-w-[80%] break-words ${
                      emojiOnly
                        ? "bg-transparent shadow-none p-0 text-5xl"
                        : msg.senderId === authUser._id
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {msg.image && (
                      <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
                    )}
                    {msg.text && <p className={emojiOnly ? "leading-tight" : "mt-2"}>{msg.text}</p>}
                    
                    {/* Timestamp & Read Receipt */}
                    <p className={`text-[10px] mt-1 opacity-70 flex items-center gap-1 justify-end ${
                      emojiOnly ? "text-slate-400 font-semibold" : ""
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {msg.senderId === authUser._id && (
                        <span className="ml-0.5">
                          {msg.status === "read" && (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                          )}
                          {msg.status === "delivered" && (
                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {msg.status === "sent" && (
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Reaction Badges */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1.5 ${
                      msg.senderId === authUser._id ? "justify-end" : "justify-start"
                    }`}>
                      {Object.entries(
                        msg.reactions.reduce((acc, curr) => {
                          acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => {
                        const hasReacted = msg.reactions.some(
                          (r) => (r.userId._id || r.userId).toString() === authUser._id.toString() && r.emoji === emoji
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={() => reactToMessage(msg._id, emoji)}
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${
                              hasReacted
                                ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 font-semibold"
                                : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {typingUsers[selectedUser._id] && (
              <div className="chat chat-start animate-fade-in">
                <div className="chat-bubble bg-slate-800 text-slate-400 flex items-center space-x-2 py-2.5 px-4 rounded-2xl shadow-md border border-slate-700/50">
                  <span className="text-xs font-medium">{selectedUser.fullName} is typing</span>
                  <span className="flex space-x-1 items-center pt-0.5">
                    <span className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </div>
              </div>
            )}

            {/* 👇 scroll target */}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput />
    </>
  );
}

export default ChatContainer;
