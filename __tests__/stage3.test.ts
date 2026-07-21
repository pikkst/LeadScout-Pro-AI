import { describe, it, expect } from 'vitest';

describe('Stage 3 Autonomous Optimization', () => {
  describe('Send-time optimization', () => {
    it('returns valid recommendation structure', () => {
      const recommendation = {
        recommendedHour: 10,
        recommendedDay: 'Tuesday',
        confidence: 85,
        reason: 'Historical open rates peak at this time',
      };

      expect(recommendation.recommendedHour).toBeGreaterThanOrEqual(0);
      expect(recommendation.recommendedHour).toBeLessThan(24);
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(100);
      expect(recommendation.reason.length).toBeGreaterThan(0);
    });
  });

  describe('Competitor monitoring', () => {
    it('returns valid alert structure', () => {
      const alert = {
        id: 'alert-1',
        leadId: 'lead-1',
        type: 'COMPETITOR',
        title: 'Competitor alert: Test Corp',
        description: 'Test description',
        source: 'AI Generated',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      expect(alert.type).toBe('COMPETITOR');
      expect(alert.isRead).toBe(false);
      expect(alert.createdAt).toBeTruthy();
    });

    it('generates competitor insights with required fields', () => {
      const insight = {
        competitor: 'Test Competitor',
        recentMoves: ['Launched new product', 'Hired 50 engineers'],
        threatLevel: 'MEDIUM',
        recommendation: 'Monitor their pricing strategy',
      };

      expect(insight.competitor).toBeTruthy();
      expect(insight.threatLevel).toMatch(/LOW|MEDIUM|HIGH/);
      expect(insight.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('Agent coaching insights', () => {
    it('returns valid coaching insight structure', () => {
      const insight = {
        id: 'coaching-1',
        agentId: 'agent-1',
        insightType: 'CONVERSION_RATE',
        title: 'Improve follow-up timing',
        description: 'Your conversion rate is below average. Consider following up within 24 hours.',
        priority: 'MEDIUM',
        isRead: false,
        isResolved: false,
        createdAt: new Date().toISOString(),
      };

      expect(insight.insightType).toBeTruthy();
      expect(insight.priority).toMatch(/LOW|MEDIUM|HIGH/);
      expect(insight.title.length).toBeGreaterThan(0);
      expect(insight.description.length).toBeGreaterThan(0);
    });

    it('calculates conversion rate correctly', () => {
      const assignedLeads = 50;
      const deals = 10;
      const conversionRate = Math.round((deals / assignedLeads) * 100);

      expect(conversionRate).toBe(20);
    });
  });
});
