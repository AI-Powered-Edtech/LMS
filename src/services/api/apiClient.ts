import {
  getActiveApiBackend,
  getActiveApiClient,
  setActiveApiBackend,
  setActiveApiClient,
} from "./runtime";
import type { ApiClient } from "./types";
import { createVilApiClient } from "./vilApiClient";

export function initApiClient(): ApiClient {
  setActiveApiBackend("vil");
  const client = createVilApiClient();
  setActiveApiClient(client);
  return client;
}

export function getApiClient(): ApiClient {
  const client = getActiveApiClient();
  if (!client) {
    return initApiClient();
  }

  return client;
}

export function getApiBackend(): string {
  return getActiveApiBackend();
}
