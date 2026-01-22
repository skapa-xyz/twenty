// packages/twenty-server/src/modules/real-estate/matching-engine/services/__tests__/match-scorer.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { MatchScorerService } from '../match-scorer.service';
import { PropertyEntity, ListingStatus } from '../../../property/entities/property.entity';
import { BriefEntity, BriefPriority } from '../../../brief/entities/brief.entity';

describe('MatchScorerService', () => {
  let service: MatchScorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchScorerService],
    }).compile();

    service = module.get<MatchScorerService>(MatchScorerService);
  });

  describe('calculateScore', () => {
    const createProperty = (overrides: Partial<PropertyEntity> = {}): PropertyEntity => ({
      id: 'property-1',
      workspaceId: 'workspace-1',
      addressDisplay: '123 Test St, Sydney NSW 2000',
      addressSuburb: 'Sydney',
      askingPrice: 800000,
      attributes: { bedrooms: 4, bathrooms: 2, carSpaces: 2 },
      listingStatus: ListingStatus.ON_MARKET,
      location: { type: 'Point', coordinates: [151.2093, -33.8688] },
      photos: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as PropertyEntity);

    const createBrief = (overrides: Partial<BriefEntity> = {}): BriefEntity => ({
      id: 'brief-1',
      workspaceId: 'workspace-1',
      buyerId: 'buyer-1',
      name: 'Test Brief',
      maxBudget: 900000,
      minBedrooms: 3,
      minBathrooms: 2,
      preferredSuburbs: ['Sydney'],
      propertyTypes: [],
      mustHaveFeatures: [],
      niceToHaveFeatures: [],
      dealBreakers: [],
      isActive: true,
      priority: BriefPriority.MEDIUM,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as BriefEntity);

    it('should return high score for perfect match', () => {
      const property = createProperty();
      const brief = createBrief();

      const { score, breakdown } = service.calculateScore(property, brief);

      expect(score).toBeGreaterThanOrEqual(85);
      expect(breakdown.locationScore).toBe(100); // Suburb matches
    });

    it('should return 0 for over-budget property', () => {
      const property = createProperty({ askingPrice: 1500000 });
      const brief = createBrief({ maxBudget: 800000 });

      const { score, breakdown } = service.calculateScore(property, brief);

      expect(breakdown.priceScore).toBe(0);
    });

    it('should penalize missing bedrooms', () => {
      const property = createProperty({
        attributes: { bedrooms: 2, bathrooms: 1 },
      });
      const brief = createBrief({ minBedrooms: 4 });

      const { breakdown } = service.calculateScore(property, brief);

      expect(breakdown.attributeScore).toBeLessThan(100);
    });

    it('should return 0 feature score when deal breaker present', () => {
      const property = createProperty({
        attributes: { bedrooms: 4, bathrooms: 2, features: ['busy_road'] },
      });
      const brief = createBrief({ dealBreakers: ['busy_road'] });

      const { breakdown } = service.calculateScore(property, brief);

      expect(breakdown.featureScore).toBe(0);
    });

    it('should handle unknown property price', () => {
      const property = createProperty({ askingPrice: null, estimatedValue: null });
      const brief = createBrief();

      const { breakdown } = service.calculateScore(property, brief);

      expect(breakdown.priceScore).toBe(50);
    });

    it('should score properties in middle of budget range higher', () => {
      const midBudgetProperty = createProperty({ askingPrice: 750000 });
      const lowBudgetProperty = createProperty({ askingPrice: 500000 });
      const brief = createBrief({ minBudget: 500000, maxBudget: 1000000 });

      const midResult = service.calculateScore(midBudgetProperty, brief);
      const lowResult = service.calculateScore(lowBudgetProperty, brief);

      expect(midResult.breakdown.priceScore).toBeGreaterThan(lowResult.breakdown.priceScore);
    });

    it('should penalize properties under minimum budget', () => {
      const property = createProperty({ askingPrice: 400000 });
      const brief = createBrief({ minBudget: 600000, maxBudget: 900000 });

      const { breakdown } = service.calculateScore(property, brief);

      expect(breakdown.priceScore).toBeLessThan(100);
      expect(breakdown.priceScore).toBeGreaterThanOrEqual(50);
    });

    it('should score preferred suburb higher than radius match', () => {
      const suburbProperty = createProperty({ addressSuburb: 'Sydney' });
      const radiusProperty = createProperty({ addressSuburb: 'Bondi' });
      const brief = createBrief({
        preferredSuburbs: ['Sydney'],
        searchCenterPoint: { type: 'Point', coordinates: [151.2093, -33.8688] },
        searchRadiusKm: 10,
      });

      const suburbResult = service.calculateScore(suburbProperty, brief);
      const radiusResult = service.calculateScore(radiusProperty, brief);

      expect(suburbResult.breakdown.locationScore).toBe(100);
      expect(radiusResult.breakdown.locationScore).toBe(80);
    });

    it('should return 100 for location when no preferences specified', () => {
      const property = createProperty();
      const brief = createBrief({ preferredSuburbs: [], searchCenterPoint: null });

      const { breakdown } = service.calculateScore(property, brief);

      expect(breakdown.locationScore).toBe(100);
    });

    it('should penalize for low location score when not in preferred area', () => {
      const property = createProperty({ addressSuburb: 'Melbourne' });
      const brief = createBrief({
        preferredSuburbs: ['Sydney', 'Bondi'],
        searchCenterPoint: null,
      });

      const { breakdown } = service.calculateScore(property, brief);

      expect(breakdown.locationScore).toBe(30);
    });

    it('should apply all attribute penalties correctly', () => {
      const property = createProperty({
        attributes: {
          bedrooms: 2,
          bathrooms: 1,
          carSpaces: 1, // Must be truthy (non-zero) to trigger penalty check
          propertyType: 'apartment',
        },
        landSize: 200,
      });
      const brief = createBrief({
        minBedrooms: 4,
        minBathrooms: 2,
        minCarSpaces: 2,
        minLandSize: 500,
        propertyTypes: ['house'],
      });

      const { breakdown } = service.calculateScore(property, brief);

      // Should have penalties for bedrooms (-30), bathrooms (-20), car spaces (-15), land size (-20), property type (-25)
      // Total penalties = 110, but score is capped at 0
      expect(breakdown.attributeScore).toBe(0);
    });

    it('should calculate must-have features score correctly', () => {
      const property = createProperty({
        attributes: {
          bedrooms: 4,
          bathrooms: 2,
          features: ['pool', 'garage'],
        },
      });
      const brief = createBrief({
        mustHaveFeatures: ['pool', 'garage', 'garden'],
      });

      const { breakdown } = service.calculateScore(property, brief);

      // 2 out of 3 must-haves = (2/3) * 30 = 20 points added to base 70 = 90
      expect(breakdown.featureScore).toBe(90);
    });

    it('should add bonus for nice-to-have features', () => {
      const property = createProperty({
        attributes: {
          bedrooms: 4,
          bathrooms: 2,
          features: ['aircon', 'heating', 'dishwasher'],
        },
      });
      const brief = createBrief({
        mustHaveFeatures: [],
        niceToHaveFeatures: ['aircon', 'heating', 'dishwasher'],
      });

      const { breakdown } = service.calculateScore(property, brief);

      // 3 nice-to-haves = 3 * 2 = 6 points added to base 70 = 76
      expect(breakdown.featureScore).toBe(76);
    });

    it('should cap nice-to-have bonus at 10 points', () => {
      const property = createProperty({
        attributes: {
          bedrooms: 4,
          bathrooms: 2,
          features: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'],
        },
      });
      const brief = createBrief({
        mustHaveFeatures: [],
        niceToHaveFeatures: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'],
      });

      const { breakdown } = service.calculateScore(property, brief);

      // 8 nice-to-haves would be 16 points, but capped at 10 = 70 + 10 = 80
      expect(breakdown.featureScore).toBe(80);
    });

    it('should cap feature score at 100', () => {
      const property = createProperty({
        attributes: {
          bedrooms: 4,
          bathrooms: 2,
          features: ['pool', 'garage', 'f1', 'f2', 'f3', 'f4', 'f5'],
        },
      });
      const brief = createBrief({
        mustHaveFeatures: ['pool', 'garage'],
        niceToHaveFeatures: ['f1', 'f2', 'f3', 'f4', 'f5'],
      });

      const { breakdown } = service.calculateScore(property, brief);

      // All must-haves = 30 + base 70 = 100, nice-to-haves would add more but capped
      expect(breakdown.featureScore).toBe(100);
    });

    it('should include details in breakdown', () => {
      const property = createProperty();
      const brief = createBrief();

      const { breakdown } = service.calculateScore(property, brief);

      expect(breakdown.details).toBeDefined();
      expect(Array.isArray(breakdown.details)).toBe(true);
      expect(breakdown.details.length).toBeGreaterThan(0);
    });

    it('should apply correct weights to final score', () => {
      const property = createProperty({
        askingPrice: 850000, // Mid-range price, should score ~80-90
        addressSuburb: 'Sydney', // Preferred suburb = 100
        attributes: { bedrooms: 4, bathrooms: 2, carSpaces: 2 }, // All match = 100
      });
      const brief = createBrief({
        maxBudget: 900000,
        minBudget: 800000,
        preferredSuburbs: ['Sydney'],
        minBedrooms: 3,
        minBathrooms: 2,
        mustHaveFeatures: [],
        dealBreakers: [],
      });

      const { score, breakdown } = service.calculateScore(property, brief);

      // Verify weights are applied (30% price, 35% location, 20% attributes, 15% features)
      const expectedScore = Math.round(
        breakdown.priceScore * 0.30 +
        breakdown.locationScore * 0.35 +
        breakdown.attributeScore * 0.20 +
        breakdown.featureScore * 0.15
      );

      expect(score).toBe(expectedScore);
    });

    it('should handle property with no features', () => {
      const property = createProperty({
        attributes: { bedrooms: 4, bathrooms: 2 },
      });
      const brief = createBrief({
        mustHaveFeatures: ['pool'],
        dealBreakers: ['busy_road'],
      });

      const { breakdown } = service.calculateScore(property, brief);

      // No features means no deal breakers, but 0 must-haves matched = base score 70
      expect(breakdown.featureScore).toBe(70);
    });

    it('should use estimatedValue when askingPrice is not available', () => {
      const property = createProperty({
        askingPrice: null,
        estimatedValue: 850000,
      });
      const brief = createBrief({ maxBudget: 900000 });

      const { breakdown } = service.calculateScore(property, brief);

      expect(breakdown.priceScore).toBeGreaterThan(0);
      // Price is formatted with toLocaleString(), so check for formatted value
      expect(breakdown.details[0]).toContain('850,000');
    });
  });
});
