import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useBackupStore = create((set) => ({
  isBackingUp: false,
  isRestoring: false,

  backupMessages: async () => {
    set({ isBackingUp: true });
    try {
      const res = await axiosInstance.post("/backup/messages");
      toast.success("Backup successful! CID: " + res.data.cid);
      console.log("Backup successful! CID:", res);
    } catch (error) {
      toast.error("Backup failed: " + error.response.data.message);
    } finally {
      set({ isBackingUp: false });
    }
  },

  restoreMessages: async () => {
    set({ isRestoring: true });
    try {
      await axiosInstance.post("/restore/messages");
      setTimeout(() => {
        toast.success("Messages restored successfully from BlockChain!");
      },3000); // 3-second delay
    } catch (error) {
      setTimeout(() => {
        toast.error("Restore failed: " + error.response.data.message);
      }, 3000); // 3-second delay
    } finally {
      set({ isRestoring: false });
    }
  },
  

  restoreUsers: async (email, newPassword) => {
    set({ isRestoring: true });
    try {
      await axiosInstance.post("/restore/users", { email, newPassword });
      toast.success("User restored! Password updated.");
    } catch (error) {
      toast.error("User restore failed: " + error.response.data.message);
    } finally {
      set({ isRestoring: false });
    }
  },
}));

