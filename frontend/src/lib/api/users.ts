import type { UserCreateRequest, UserUpdateRequest } from "@/types";
import { ApiClient } from "./client";

export const usersApi = {
  async getAll() {
    return ApiClient.get("user", "/api/users");
  },

  async getLogs() {
    return ApiClient.get("user", "/api/users/logs");
  },

  async getById(id: string) {
    return ApiClient.get("user", `/api/users/${id}`);
  },

  async getByEmail(email: string) {
    return ApiClient.get("user", `/api/users/email/${encodeURIComponent(email)}`);
  },

  async create(data: UserCreateRequest) {
    return ApiClient.post("user", "/api/users", data);
  },

  async update(id: string, data: UserUpdateRequest) {
    return ApiClient.put("user", `/api/users/${id}`, data);
  },

  async delete(id: string) {
    return ApiClient.delete("user", `/api/users/${id}`);
  },
};
