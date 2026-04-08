import type { AccountCreateRequest } from "@/types";
import { ApiClient } from "./client";

export const accountsApi = {
  async getAll() {
    console.log("[accountsApi] getAll called");
    const result = await ApiClient.get("account", "/api/accounts");
    console.log("[accountsApi] getAll result:", result);
    return result;
  },

  async getById(id: string) {
    console.log("[accountsApi] getById called:", id);
    const result = await ApiClient.get("account", `/api/accounts/${id}`);
    console.log("[accountsApi] getById result:", result);
    return result;
  },

  async getByClientId(clientId: string) {
    console.log("[accountsApi] getByClientId called:", clientId);
    const result = await ApiClient.get("account", `/api/accounts/client/${clientId}`);
    console.log("[accountsApi] getByClientId result:", result);
    return result;
  },

  async create(data: AccountCreateRequest) {
    console.log("[accountsApi] create called:", data);
    const result = await ApiClient.post("account", "/api/accounts", data);
    console.log("[accountsApi] create result:", result);
    return result;
  },

  async delete(id: string) {
    console.log("[accountsApi] delete called:", id);
    const result = await ApiClient.delete("account", `/api/accounts/DeleteByAccountId/${id}`);
    console.log("[accountsApi] delete result:", result);
    return result;
  },
};
