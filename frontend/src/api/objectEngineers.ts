import api from "./axios";
import type { ObjectEngineerRow } from "../types/engineer";

export async function getObjectEngineers(
  objectId: string,
): Promise<ObjectEngineerRow[]> {
  const response = await api.get(`/objects/${objectId}/engineers`);
  return response.data.data as ObjectEngineerRow[];
}

export async function assignEngineerToObject(
  objectId: string,
  engineerId: string,
): Promise<void> {
  await api.post(`/objects/${objectId}/engineers`, { engineerId });
}

export async function removeEngineerFromObject(
  objectId: string,
  engineerId: string,
): Promise<void> {
  await api.delete(`/objects/${objectId}/engineers/${engineerId}`);
}
