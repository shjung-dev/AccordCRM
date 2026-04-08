import { ApiClient } from "./client";
import type { PagedResponse, ApiTransaction } from "@/types";

export const transactionsApi = {
  async getAll(page: number = 0, size: number = 10) {
    return ApiClient.get<PagedResponse<ApiTransaction>>(
      "account",
      `/api/transactions?page=${page}&size=${size}`
    );
  },

  async getById(id: string) {
    return ApiClient.get("account", `/api/transactions/${id}`);
  },

  async getByClientId(clientId: string) {
    return ApiClient.get("account", `/api/transactions/client/${clientId}`);
  },

  async getByAccountId(accountId: string) {
    return ApiClient.get("account", `/api/transactions/account/${accountId}`);
  },
};
