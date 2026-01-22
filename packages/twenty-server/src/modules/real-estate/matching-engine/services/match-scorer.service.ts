// packages/twenty-server/src/modules/real-estate/matching-engine/services/match-scorer.service.ts

import { Injectable } from '@nestjs/common';
import { PropertyEntity } from '../../property/entities/property.entity';
import { BriefEntity } from '../../brief/entities/brief.entity';
import { ScoreBreakdown } from '../../property-match/entities/property-match.entity';

// Scoring weights
const WEIGHTS = {
  PRICE: 0.30,      // 30%
  LOCATION: 0.35,   // 35%
  ATTRIBUTES: 0.20, // 20%
  FEATURES: 0.15,   // 15%
};

@Injectable()
export class MatchScorerService {
  /**
   * Calculate the match score between a property and a brief
   * @param property The property to score
   * @param brief The brief containing buyer requirements
   * @returns An object containing the total score (0-100) and detailed breakdown
   */
  calculateScore(
    property: PropertyEntity,
    brief: BriefEntity,
  ): { score: number; breakdown: ScoreBreakdown } {
    const details: string[] = [];

    // Price Score (0-100)
    const priceScore = this.calculatePriceScore(property, brief, details);

    // Location Score (0-100)
    const locationScore = this.calculateLocationScore(property, brief, details);

    // Attribute Score (0-100)
    const attributeScore = this.calculateAttributeScore(property, brief, details);

    // Feature Score (0-100)
    const featureScore = this.calculateFeatureScore(property, brief, details);

    // Weighted total
    const totalScore = Math.round(
      priceScore * WEIGHTS.PRICE +
      locationScore * WEIGHTS.LOCATION +
      attributeScore * WEIGHTS.ATTRIBUTES +
      featureScore * WEIGHTS.FEATURES
    );

    return {
      score: totalScore,
      breakdown: {
        priceScore,
        locationScore,
        attributeScore,
        featureScore,
        details,
      },
    };
  }

  /**
   * Calculate price match score (0-100)
   * - 0 if over budget
   * - Penalized if under minimum budget
   * - Higher score for properties in middle of budget range
   */
  private calculatePriceScore(
    property: PropertyEntity,
    brief: BriefEntity,
    details: string[],
  ): number {
    const propertyPrice = property.askingPrice ?? property.estimatedValue ?? 0;

    if (propertyPrice === 0) {
      details.push('Price: Unknown property price (50/100)');
      return 50;
    }

    if (propertyPrice > brief.maxBudget) {
      details.push(`Price: Over budget by $${(propertyPrice - brief.maxBudget).toLocaleString()} (0/100)`);
      return 0;
    }

    if (brief.minBudget && propertyPrice < brief.minBudget) {
      // Under budget is okay but might indicate lower quality
      const underPercent = ((brief.minBudget - propertyPrice) / brief.minBudget) * 100;
      const score = Math.max(50, 100 - underPercent);
      details.push(`Price: Under min budget by ${underPercent.toFixed(0)}% (${score}/100)`);
      return score;
    }

    // Within budget range
    const budgetRange = brief.maxBudget - (brief.minBudget ?? 0);
    const positionInRange = budgetRange > 0
      ? (propertyPrice - (brief.minBudget ?? 0)) / budgetRange
      : 0.5;

    // Higher score for properties in the middle of budget range
    const score = Math.round(100 - Math.abs(positionInRange - 0.5) * 40);
    details.push(`Price: $${propertyPrice.toLocaleString()} within budget (${score}/100)`);
    return score;
  }

  /**
   * Calculate location match score (0-100)
   * - 100 if in preferred suburb
   * - 80 if within search radius
   * - 100 if no location preferences specified
   * - 30 if not in preferred areas
   */
  private calculateLocationScore(
    property: PropertyEntity,
    brief: BriefEntity,
    details: string[],
  ): number {
    // Check suburb match
    if (brief.preferredSuburbs.length > 0) {
      const suburbMatch = brief.preferredSuburbs.some(
        (s) => s.toLowerCase() === property.addressSuburb?.toLowerCase()
      );
      if (suburbMatch) {
        details.push(`Location: ${property.addressSuburb} is a preferred suburb (100/100)`);
        return 100;
      }
    }

    // Check radius match
    if (brief.searchCenterPoint && brief.searchRadiusKm && property.location) {
      // Distance calculation would be done in the initial query
      // For scoring, if we're here the property is within radius
      details.push(`Location: Within ${brief.searchRadiusKm}km search radius (80/100)`);
      return 80;
    }

    // No location criteria specified
    if (brief.preferredSuburbs.length === 0 && !brief.searchCenterPoint) {
      details.push('Location: No location preference specified (100/100)');
      return 100;
    }

    details.push(`Location: ${property.addressSuburb} not in preferred areas (30/100)`);
    return 30;
  }

  /**
   * Calculate attribute match score (0-100)
   * Penalizes mismatches on:
   * - Bedrooms (-30)
   * - Bathrooms (-20)
   * - Car spaces (-15)
   * - Land size (-20)
   * - Property type (-25)
   */
  private calculateAttributeScore(
    property: PropertyEntity,
    brief: BriefEntity,
    details: string[],
  ): number {
    let score = 100;
    const attrs = property.attributes;

    // Bedrooms
    if (brief.minBedrooms && attrs.bedrooms) {
      if (attrs.bedrooms < brief.minBedrooms) {
        score -= 30;
        details.push(`Bedrooms: ${attrs.bedrooms} < required ${brief.minBedrooms} (-30)`);
      } else if (attrs.bedrooms >= brief.minBedrooms) {
        details.push(`Bedrooms: ${attrs.bedrooms} meets requirement`);
      }
    }

    // Bathrooms
    if (brief.minBathrooms && attrs.bathrooms) {
      if (attrs.bathrooms < brief.minBathrooms) {
        score -= 20;
        details.push(`Bathrooms: ${attrs.bathrooms} < required ${brief.minBathrooms} (-20)`);
      }
    }

    // Car spaces
    if (brief.minCarSpaces && attrs.carSpaces) {
      if (attrs.carSpaces < brief.minCarSpaces) {
        score -= 15;
        details.push(`Car spaces: ${attrs.carSpaces} < required ${brief.minCarSpaces} (-15)`);
      }
    }

    // Land size
    if (brief.minLandSize && property.landSize) {
      if (property.landSize < brief.minLandSize) {
        score -= 20;
        details.push(`Land size: ${property.landSize}m² < required ${brief.minLandSize}m² (-20)`);
      }
    }

    // Property type
    if (brief.propertyTypes.length > 0 && attrs.propertyType) {
      if (!brief.propertyTypes.includes(attrs.propertyType)) {
        score -= 25;
        details.push(`Property type: ${attrs.propertyType} not in preferred types (-25)`);
      }
    }

    details.push(`Attributes: Final score ${Math.max(0, score)}/100`);
    return Math.max(0, score);
  }

  /**
   * Calculate feature match score (0-100)
   * - Returns 0 if any deal breaker is present
   * - Base score of 70
   * - +30 points based on must-have features matched
   * - +10 points maximum for nice-to-have features (2 points each)
   */
  private calculateFeatureScore(
    property: PropertyEntity,
    brief: BriefEntity,
    details: string[],
  ): number {
    const propertyFeatures = property.attributes.features ?? [];

    // Check deal breakers first
    for (const dealBreaker of brief.dealBreakers) {
      if (propertyFeatures.includes(dealBreaker)) {
        details.push(`Feature: Deal breaker "${dealBreaker}" present (0/100)`);
        return 0;
      }
    }

    let score = 70; // Base score

    // Must-have features
    const mustHaveCount = brief.mustHaveFeatures.length;
    if (mustHaveCount > 0) {
      const matchedMustHaves = brief.mustHaveFeatures.filter((f) =>
        propertyFeatures.includes(f)
      ).length;
      const mustHaveScore = (matchedMustHaves / mustHaveCount) * 30;
      score = 70 + mustHaveScore;
      details.push(`Must-haves: ${matchedMustHaves}/${mustHaveCount} present (+${mustHaveScore.toFixed(0)})`);
    }

    // Nice-to-have features (bonus)
    const niceToHaveMatched = brief.niceToHaveFeatures.filter((f) =>
      propertyFeatures.includes(f)
    ).length;
    if (niceToHaveMatched > 0) {
      const bonus = Math.min(10, niceToHaveMatched * 2);
      score = Math.min(100, score + bonus);
      details.push(`Nice-to-haves: ${niceToHaveMatched} present (+${bonus})`);
    }

    details.push(`Features: Final score ${Math.round(score)}/100`);
    return Math.round(score);
  }
}
