/**
 * Measurement grouping utilities for organizing measurements by group and type.
 */

import { Measurement, Group, MeasurementType } from '@/types';

export interface GroupedMeasurements {
  length: Measurement[];
  area: Measurement[];
  count: Record<string, Measurement[]>; // keyed by label (category or base name)
}

export interface GroupedData {
  groupId: string | null;
  groupName: string;
  measurements: GroupedMeasurements;
  totals: {
    length: number;
    area: number;
    count: number;
  };
}

/**
 * Extract base name from measurement name (e.g., "Door 1" -> "Door").
 */
function extractBaseName(name: string): string {
  return name.replace(/\s+\d+$/, '') || 'Count';
}

/**
 * Sort count measurements by numeric suffix in their names.
 */
function sortCountMeasurements(measurements: Measurement[]): Measurement[] {
  return measurements.sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+$/)?.[0] || '0');
    const numB = parseInt(b.name.match(/\d+$/)?.[0] || '0');
    return numA - numB;
  });
}

/**
 * Group measurements by type within a group.
 */
function groupMeasurementsByType(groupMeasurements: Measurement[]): GroupedMeasurements {
  const length: Measurement[] = [];
  const area: Measurement[] = [];
  const countByLabel = new Map<string, Measurement[]>();

  groupMeasurements.forEach(m => {
    if (m.type === 'length') {
      length.push(m);
    } else if (m.type === 'area') {
      area.push(m);
    } else if (m.type === 'count') {
      // Use category as label, or extract base name
      const label = m.category || extractBaseName(m.name);
      if (!countByLabel.has(label)) {
        countByLabel.set(label, []);
      }
      countByLabel.get(label)!.push(m);
    }
  });

  // Convert count map to object and sort measurements within each label
  const countObj: Record<string, Measurement[]> = {};
  countByLabel.forEach((ms, label) => {
    countObj[label] = sortCountMeasurements(ms);
  });

  return { length, area, count: countObj };
}

/**
 * Calculate totals for a group of measurements.
 */
function calculateTotals(groupMeasurements: Measurement[]): {
  length: number;
  area: number;
  count: number;
} {
  const length = groupMeasurements
    .filter(m => m.type === 'length')
    .reduce((sum, m) => sum + m.value, 0);
  
  const area = groupMeasurements
    .filter(m => m.type === 'area')
    .reduce((sum, m) => sum + m.value, 0);
  
  const count = groupMeasurements
    .filter(m => m.type === 'count')
    .reduce((sum, m) => sum + m.value, 0);

  return { length, area, count };
}

/**
 * Get group name, handling null/undefined groupId.
 */
function getGroupName(
  groupId: string | null,
  groupMap: Map<string, Group>
): string {
  if (groupId === null) {
    return 'Ungrouped';
  }
  return groupMap.get(groupId)?.name || 'Unknown';
}

/**
 * Group measurements by groupId and organize by type.
 */
export function groupMeasurements(
  measurements: Measurement[],
  groups: Group[]
): GroupedData[] {
  // Create a map of groupId -> Group
  const groupMap = new Map<string, Group>();
  groups.forEach(g => groupMap.set(g.id, g));

  // Group measurements by groupId (treat undefined as null for ungrouped)
  const byGroup = new Map<string | null, Measurement[]>();
  measurements.forEach(m => {
    const gid = m.groupId ?? null; // undefined or null both mean ungrouped
    if (!byGroup.has(gid)) {
      byGroup.set(gid, []);
    }
    byGroup.get(gid)!.push(m);
  });

  const result: GroupedData[] = [];

  // Process each group
  for (const [groupId, groupMeasurements] of byGroup.entries()) {
    const groupName = getGroupName(groupId, groupMap);
    const measurementsByType = groupMeasurementsByType(groupMeasurements);
    const totals = calculateTotals(groupMeasurements);

    result.push({
      groupId,
      groupName,
      measurements: measurementsByType,
      totals,
    });
  }

  // Sort groups alphabetically, but keep "Ungrouped" last
  result.sort((a, b) => {
    if (a.groupId === null) return 1;
    if (b.groupId === null) return -1;
    return a.groupName.localeCompare(b.groupName);
  });

  return result;
}
