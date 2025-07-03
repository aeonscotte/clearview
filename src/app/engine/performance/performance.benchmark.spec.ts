import { TimeService } from '../physics/time.service';

describe('Performance Benchmarks', () => {
  it('TimeService.update should be performant', () => {
    const service = new TimeService();
    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      service.update(16);
    }
    const duration = performance.now() - start;
    // Expect average below 0.1ms
    expect(duration).toBeLessThan(100);
  });
});
