import { describe, expect, it } from 'vitest';
import { runOcrJob } from './runOcrJob';
import { createFakeOcrEngineWithPages } from './fakeOcrEngine';

describe('runOcrJob cancellation', () => {
  it('does not return partial results when cancelled', async () => {
    const controller = new AbortController();
    const engine = createFakeOcrEngineWithPages({
      1: 'Motor Power kW 61',
      2: 'Weight kg 14000',
    });

    controller.abort();

    await expect(
      runOcrJob({
        pageNumbers: [1, 2],
        language: 'eng',
        engine,
        signal: controller.signal,
        renderPage: async () => document.createElement('canvas'),
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
