import type { FormField } from '../shared/types/form';
import { buildFieldSignature, resolveFieldFromSignature } from './fieldSignature';
import { normalizePropertyLabel } from './normalizePropertyLabel';
import type {
  FieldProfile,
  ProfileMatchSummary,
  ProfileProperty,
  PropertyMappingRow,
  PropertyMatchSource,
} from './profileTypes';

interface FieldIndexes {
  byNormalizedLabel: Map<string, FormField[]>;
  byName: Map<string, FormField[]>;
}

export function matchProfileToFields(profile: FieldProfile, fields: FormField[]): ProfileMatchSummary {
  const indexes = buildFieldIndexes(fields);
  const rows: PropertyMappingRow[] = profile.properties.map((property) =>
    matchSingleProperty(profile, property, fields, indexes),
  );

  const linkedRows = rows.filter((row) => row.fieldRuntimeId !== null);
  const savedRows = linkedRows.filter((row) => row.matchSource === 'saved');
  const manualCount = savedRows.filter((row) => row.savedMappingExists).length;

  return {
    pageFieldCount: fields.length,
    profilePropertyCount: profile.properties.length,
    linkedCount: linkedRows.length,
    exactLabelCount: rows.filter((row) => row.matchSource === 'exact-label').length,
    exactAliasCount: rows.filter((row) => row.matchSource === 'exact-alias').length,
    manualCount,
    ambiguousCount: rows.filter((row) => row.isAmbiguous).length,
    notOnPageCount: rows.filter((row) => row.fieldRuntimeId === null && !row.isAmbiguous).length,
    rows,
  };
}

function matchSingleProperty(
  profile: FieldProfile,
  property: ProfileProperty,
  fields: FormField[],
  indexes: FieldIndexes,
): PropertyMappingRow {
  const savedMapping = profile.mappings.find((mapping) => mapping.propertyId === property.id);

  if (savedMapping) {
    const resolved = resolveFieldFromSignature(fields, savedMapping.fieldSignature);
    if (resolved.status === 'resolved' && resolved.field) {
      return buildRow(property, 'saved', resolved.field, savedMapping.fieldSignature, true, false);
    }

    if (resolved.status === 'ambiguous') {
      return buildRow(property, 'saved', null, savedMapping.fieldSignature, true, true);
    }
  }

  const exactLabelMatches = indexes.byNormalizedLabel.get(normalizePropertyLabel(property.name)) ?? [];
  if (exactLabelMatches.length > 1) {
    return buildRow(property, 'exact-label', null, null, false, true);
  }

  const exactLabelField = findUniqueExactLabelMatch(property.name, indexes.byNormalizedLabel);
  if (exactLabelField) {
    return buildRow(property, 'exact-label', exactLabelField, buildFieldSignature(exactLabelField), false, false);
  }

  for (const alias of property.aliases) {
    const aliasMatches = indexes.byNormalizedLabel.get(normalizePropertyLabel(alias)) ?? [];
    if (aliasMatches.length > 1) {
      return buildRow(property, 'exact-alias', null, null, false, true);
    }

    const aliasField = findUniqueExactLabelMatch(alias, indexes.byNormalizedLabel);
    if (aliasField) {
      return buildRow(property, 'exact-alias', aliasField, buildFieldSignature(aliasField), false, false);
    }
  }

  return buildRow(property, 'none', null, null, Boolean(savedMapping), false);
}

function buildRow(
  property: ProfileProperty,
  matchSource: PropertyMatchSource,
  field: FormField | null,
  fieldSignature: ReturnType<typeof buildFieldSignature> | null,
  savedMappingExists: boolean,
  isAmbiguous: boolean,
): PropertyMappingRow {
  return {
    property,
    matchSource,
    fieldLabel: field?.label ?? null,
    fieldRuntimeId: field?.id ?? null,
    fieldSignature,
    isAmbiguous,
    savedMappingExists,
  };
}

function findUniqueExactLabelMatch(label: string, index: Map<string, FormField[]>): FormField | null {
  const matches = index.get(normalizePropertyLabel(label)) ?? [];
  if (matches.length === 1) {
    return matches[0] ?? null;
  }
  return null;
}

function buildFieldIndexes(fields: FormField[]): FieldIndexes {
  const byNormalizedLabel = new Map<string, FormField[]>();
  const byName = new Map<string, FormField[]>();

  for (const field of fields) {
    const labelKey = normalizePropertyLabel(field.label);
    appendIndex(byNormalizedLabel, labelKey, field);

    if (field.name) {
      appendIndex(byName, field.name, field);
    }
  }

  return { byNormalizedLabel, byName };
}

function appendIndex(map: Map<string, FormField[]>, key: string, field: FormField): void {
  const bucket = map.get(key) ?? [];
  bucket.push(field);
  map.set(key, bucket);
}

export function findExactLabelField(fields: FormField[], label: string): FormField | null {
  const indexes = buildFieldIndexes(fields);
  return findUniqueExactLabelMatch(label, indexes.byNormalizedLabel);
}

export function resolvePropertyPageField(
  profile: FieldProfile,
  property: ProfileProperty,
  fields: FormField[],
): PropertyMappingRow {
  const indexes = buildFieldIndexes(fields);
  return matchSingleProperty(profile, property, fields, indexes);
}
