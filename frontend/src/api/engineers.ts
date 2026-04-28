import api from "./axios";
import type {
  Engineer,
  EngineerSummary,
  EngineerShare,
  EngineerCreateRequest,
  EngineerUpdateRequest,
} from "../types/engineer";

interface EngineerFilters {
  status?: string;
  homeDivisionId?: string;
}

export async function getEngineers(
  filters?: EngineerFilters,
): Promise<Engineer[]> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.homeDivisionId) params.homeDivisionId = filters.homeDivisionId;
  const response = await api.get("/engineers", { params });
  return response.data.data as Engineer[];
}

export async function getEngineer(id: string): Promise<Engineer> {
  const response = await api.get(`/engineers/${id}`);
  return response.data.data as Engineer;
}

export async function createEngineer(
  data: EngineerCreateRequest,
): Promise<Engineer> {
  const response = await api.post("/engineers", data);
  return response.data.data as Engineer;
}

export async function updateEngineer(
  id: string,
  data: EngineerUpdateRequest,
): Promise<Engineer> {
  const response = await api.put(`/engineers/${id}`, data);
  return response.data.data as Engineer;
}

export async function deactivateEngineer(id: string): Promise<void> {
  await api.delete(`/engineers/${id}`);
}

export async function getEngineerSummary(id: string): Promise<EngineerSummary> {
  const response = await api.get(`/engineers/${id}/summary`);
  return response.data.data as EngineerSummary;
}

export async function getEngineerObjects(id: string): Promise<EngineerShare[]> {
  const response = await api.get(`/engineers/${id}/objects`);
  return response.data.data as EngineerShare[];
}

export async function assignObjectToEngineer(
  engineerId: string,
  objectId: string,
): Promise<void> {
  await api.post(`/engineers/${engineerId}/objects`, { objectId });
}

export async function removeObjectFromEngineer(
  engineerId: string,
  objectId: string,
): Promise<void> {
  await api.delete(`/engineers/${engineerId}/objects/${objectId}`);
}
