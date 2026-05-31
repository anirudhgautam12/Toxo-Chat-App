import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,
  typingUsers: {},

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

 getAllContacts: async () => {
  set({ isUsersLoading: true });

  try {
    const res = await axiosInstance.get("/messages/contacts");

    set({
      allContacts: Array.isArray(res.data) ? res.data : [],
    });

  } catch (error) {
    toast.error(
      error.response?.data?.message || "Failed to load contacts"
    );

    set({ allContacts: [] });

  } finally {
    set({ isUsersLoading: false });
  }
},

  getMyChatPartners: async () => {
  set({ isUsersLoading: true });

  try {
    const res = await axiosInstance.get("/messages/chats");

    // ✅ Ensure array
    set({
      chats: Array.isArray(res.data) ? res.data : [],
    });

  } catch (error) {
    console.error("getMyChatPartners error:", error);

    toast.error(
      error.response?.data?.message || "Failed to load chats"
    );

    // ✅ Reset to empty on error
    set({ chats: [] });

  } finally {
    set({ isUsersLoading: false });
  }
},


  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      get().markMessagesAsRead(userId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true, // flag to identify optimistic messages (optional)
    };
    // immidetaly update the ui by adding the message
    set({ messages: [...messages, optimisticMessage] });

    try {
  const res = await axiosInstance.post(
    `/messages/send/${selectedUser._id}`,
    messageData
  );

  set((state) => ({
    messages: state.messages
      .filter((msg) => !msg.isOptimistic) // remove temp
      .concat(res.data),
  }));

} catch (error) {
      // remove optimistic message on failure
      set({ messages: messages });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/react/${messageId}`, { emoji });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: res.data.reactions } : msg
        ),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add reaction");
    }
  },

  markMessagesAsRead: async (senderId) => {
    try {
      await axiosInstance.put(`/messages/read/${senderId}`);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.senderId === senderId && msg.status !== "read" ? { ...msg, status: "read" } : msg
        ),
      }));
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, text: res.data.text, isEdited: true } : msg
        ),
      }));
      toast.success("Message edited");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, text: "This message was deleted", image: undefined }
            : msg
        ),
      }));
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      const currentMessages = get().messages;
      set({ messages: [...currentMessages, newMessage] });

      get().markMessagesAsRead(selectedUser._id);

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    socket.on("userTyping", ({ senderId }) => {
      if (senderId !== selectedUser._id) return;
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: true },
      }));
    });

    socket.on("userStopTyping", ({ senderId }) => {
      if (senderId !== selectedUser._id) return;
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: false },
      }));
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ),
      }));
    });

    socket.on("messagesDelivered", ({ receiverId }) => {
      if (receiverId !== selectedUser._id) return;
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.receiverId === receiverId && msg.status === "sent"
            ? { ...msg, status: "delivered" }
            : msg
        ),
      }));
    });

    socket.on("messagesRead", ({ senderId }) => {
      if (senderId !== selectedUser._id) return;
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.receiverId === senderId && msg.status !== "read"
            ? { ...msg, status: "read" }
            : msg
        ),
      }));
    });

    socket.on("messageEdited", ({ messageId, text, isEdited }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, text, isEdited } : msg
        ),
      }));
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, text: "This message was deleted", image: undefined }
            : msg
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("userTyping");
    socket.off("userStopTyping");
    socket.off("messageReaction");
    socket.off("messagesDelivered");
    socket.off("messagesRead");
    socket.off("messageEdited");
    socket.off("messageDeleted");
  },
}));
