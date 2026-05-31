import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore";

const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : (import.meta.env.VITE_API_URL || "/");

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],

  requestNotificationPermission: () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
      get().requestNotificationPermission();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });

      toast.success("Account created successfully!");
      get().connectSocket();
      get().requestNotificationPermission();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });

      toast.success("Logged in successfully");

      get().connectSocket();
      get().requestNotificationPermission();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response.data.message);
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      withCredentials: true, // this ensures cookies are sent with the connection
    });

    socket.connect();

    set({ socket });

    // listen for online users event
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("newMessage", (newMessage) => {
      const selectedUser = useChatStore.getState().selectedUser;
      const isWindowHidden = document.visibilityState === "hidden";
      const isDifferentChat = !selectedUser || selectedUser._id !== newMessage.senderId;
      const isMyMessage = newMessage.senderId === authUser._id;

      if (!isMyMessage && (isWindowHidden || isDifferentChat) && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const sender = useChatStore.getState().allContacts.find((u) => u._id === newMessage.senderId) || 
                       useChatStore.getState().chats.find((u) => u._id === newMessage.senderId);
        
        const title = sender ? sender.fullName : "New Message";
        const body = newMessage.text || "Sent an image";
        const icon = sender?.profilePic || "/avatar.png";

        const notification = new Notification(title, {
          body,
          icon,
          tag: "new-message-" + newMessage.senderId,
          renotify: true,
        });

        notification.onclick = () => {
          window.focus();
          if (sender) {
            useChatStore.getState().setSelectedUser(sender);
          }
        };
      }
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connection error:", err);
      // Optional: toast.error("Socket connection failed");
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
