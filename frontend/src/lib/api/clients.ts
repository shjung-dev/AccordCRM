import type { ClientCreateRequest, ClientUpdateRequest, PagedResponse, ApiClient as ApiClientType } from "@/types";
import { ApiClient } from "./client";

export const clientsApi = {
  // Fetches all clients (admin-only)
  async getAllForAdmin(page: number = 0, size: number = 10) {
    return ApiClient.get<PagedResponse<ApiClientType>>(
      "client",
      `/api/clients?page=${page}&size=${size}`
    );
  },

  // Retrieves the total number of clients
  async getCount() {
    const response = await ApiClient.get<{ count: number }>("client", "/api/clients/count");
    return response.count;
  },

  // Fetches a specific client (and their details) by their client ID
  async getById(id: string) {
    return ApiClient.get("client", `/api/clients/${id}`);
  },

  // Retrieves all clients assigned to a specific agent, paginated
  async getByAgentId(agentId: string, page: number = 0, size: number = 10) {
    return ApiClient.get<PagedResponse<ApiClientType>>(
      "client",
      `/api/clients/agent/${agentId}?page=${page}&size=${size}`
    );
  },

  // Creates a new client with the provided data
  async create(data: ClientCreateRequest) {
    return ApiClient.post("client", "/api/clients", data);
  },

  // Updates an existing client's information by their client ID
  async update(id: string, data: ClientUpdateRequest) {
    return ApiClient.put("client", `/api/clients/${id}`, data);
  },

  // Deletes a client by their client ID with an optional deletion reason
  async delete(id: string, deletionReason?: string) {
    return ApiClient.delete("client", `/api/clients/${id}`, deletionReason ? { deletionReason } : undefined);
  },

  // Verifies a client by their client ID with selected verification methods
  async verify(id: string, verificationMethod: string) {
    return ApiClient.put("client", `/api/clients/${id}/verify`, { verificationMethod });
  },
};