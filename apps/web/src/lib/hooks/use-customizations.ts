"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchCustomizations,
  type CustomizationMap,
} from "@/lib/api/customizations";

/**
 * Customisation changes when a member runs `/customize`, not on the war poll, so
 * it refreshes on its own slower cadence than the roster.
 */
const CUSTOMIZATION_REFETCH_MS = 600_000;

export function useCustomizations() {
  return useQuery<CustomizationMap>({
    queryKey: ["customizations"],
    queryFn: fetchCustomizations,
    refetchInterval: CUSTOMIZATION_REFETCH_MS,
    staleTime: CUSTOMIZATION_REFETCH_MS,
    // The roster is the point of the page; decoration arriving late is fine.
    placeholderData: {},
  });
}
