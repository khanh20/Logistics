import { normalizeError } from "~/lib/utils/errors";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { adminWalletApi } from "../../api/adminWallet";

export const fetchFrozenWallets = createAsyncThunk(
  "adminWallet/fetchFrozenWallets",
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminWalletApi.getFrozenWallets();
      if (!response.data) throw new Error(response.message || "Failed to fetch frozen wallets");
      return response.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Something went wrong");
    }
  }
);

export const unlockWallet = createAsyncThunk(
  "adminWallet/unlockWallet",
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await adminWalletApi.unlockWallet(id, reason);
      return id; // Trả về id để slice có thể remove khỏi list nếu cần
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Something went wrong");
    }
  }
);

export const toggleTrustWallet = createAsyncThunk(
  "adminWallet/toggleTrustWallet",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminWalletApi.toggleTrustWallet(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Something went wrong");
    }
  }
);
