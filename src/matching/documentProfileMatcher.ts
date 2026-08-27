import type { ExtractedCharacteristic } from '../extraction/types';
import type { ProfileProperty } from '../profile/profileTypes';

export type DocumentMatchLevel = 'high' | 'review' | 'reject';

export interface DocumentPropertyMatch {
  characteristicId: string;
  propertyId?: string;
  confidence: number;
  level: DocumentMatchLevel;
  reasons: string[];
  requiresReview: boolean;
}

export function matchDocumentToProfile(
  characteristics: ExtractedCharacteristic[],
  properties: ProfileProperty[],
): DocumentPropertyMatch[] {
  void characteristics;
  void properties;
  return [];
}
