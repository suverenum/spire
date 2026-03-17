"use client";

import { get, set, del } from "idb-keyval";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

export function createIDBPersister(key: string): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(key, client);
    },
    restoreClient: async () => {
      return (await get<PersistedClient>(key)) ?? undefined;
    },
    removeClient: async () => {
      await del(key);
    },
  };
}
