import type { ExtractedCharacteristic } from '../extraction/types';
import type { ProfileProperty } from '../profile/profileTypes';

export type MatchLevel = 'high' | 'review' | 'reject' | 'ignored';

export type MatchReasonCode =
  | 'exact-name'
  | 'exact-alias'
  | 'exact-name-ambiguous'
  | 'concept-overlap'
  | 'unknown-token-overlap'
  | 'unit-match'
  | 'unit-mismatch'
  | 'unit-missing'
  | 'concept-conflict'
  | 'power-subtype-ambiguous'
  | 'candidate-margin-low'
  | 'duplicate-target'
  | 'manual-override'
  | 'confirmed-by-user'
  | 'ignored-by-user'
  | 'user-learned'
  | 'learned-unit-conflict'
  | 'no-candidate';

export interface MatchReason {
  code: MatchReasonCode;
  message: string;
}

export interface PropertyMatchCandidate {
  propertyId: string;
  score: number;
  reasons: MatchReason[];
}

export interface MatchConflict {
  type: 'target-collision' | 'concept-conflict' | 'ambiguous-property';
  message: string;
  relatedCharacteristicIds?: string[];
}

export interface DocumentPropertyMatch {
  characteristicId: string;
  propertyId?: string;
  suggestedPropertyId?: string;
  confidence: number;
  level: MatchLevel;
  requiresReview: boolean;
  ambiguous: boolean;
  reasons: MatchReason[];
  alternatives: PropertyMatchCandidate[];
  conflict?: MatchConflict;
  automaticPropertyId?: string;
  automaticLevel?: MatchLevel;
  automaticConfidence?: number;
  learnedMatch?: boolean;
}

export interface DocumentProfileMatchingResult {
  matches: DocumentPropertyMatch[];
  stats: {
    total: number;
    high: number;
    review: number;
    reject: number;
    ignored: number;
    conflicts: number;
  };
}

export type MatchReviewDecision =
  | { type: 'confirmed'; propertyId: string }
  | { type: 'manual'; propertyId: string }
  | { type: 'ignored' };

export interface DocumentMatchReviewState {
  profileId: string;
  decisions: Record<string, MatchReviewDecision>;
}

export interface EffectiveDocumentMatch extends DocumentPropertyMatch {
  effectivePropertyId?: string;
  effectiveLevel: MatchLevel;
  fillReady: boolean;
}

export interface CanonicalLabel {
  concepts: Set<string>;
  unknownTokens: Set<string>;
}

export interface IndexedCharacteristic {
  characteristic: ExtractedCharacteristic;
  normalizedLabel: string;
  canonical: CanonicalLabel;
  unit?: string;
}

export interface IndexedProperty {
  property: ProfileProperty;
  normalizedName: string;
  normalizedAliases: string[];
  canonical: CanonicalLabel;
  unit?: string;
}
