/**
 * Purpose: Characterize the CLI's configuration and HTTP safety boundary.
 * Input/Output: Environment variables and mocked HTTP responses in; typed CLI results out.
 * Invariants: No real network, credentials, home directory, or persistent files are used.
 * Debugging: Run `npm test -- --runInBand tests/config-http.test.ts` in tools/ruview-cli.
 */

import { loadConfig } from '../src/config.js';
import { err, ok, sensingGet } from '../src/http.js';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

describe('loadConfig', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it('uses explicit environment values without exposing the token', () => {
    process.env['RUVIEW_SENSING_SERVER_URL'] = 'https://sensor.example.test';
    process.env['RUVIEW_API_TOKEN'] = 'test-only-token';
    process.env['RUVIEW_JOBS_DIR'] = '/tmp/ruview-cli-tests';

    const config = loadConfig();

    expect(config.sensingServerUrl).toBe('https://sensor.example.test');
    expect(config.apiToken).toBe('test-only-token');
    expect(config.jobsDir).toBe('/tmp/ruview-cli-tests');
  });
});

describe('HTTP result helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves typed success and error payloads', () => {
    expect(ok({ count: 2 })).toEqual({ ok: true, data: { count: 2 } });
    expect(err('offline')).toEqual({ ok: false, error: 'offline' });
  });

  it('normalizes the base URL and sends bearer authentication', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ presence: true }),
    } as unknown as Response);

    await expect(
      sensingGet<{ presence: boolean }>(
        'https://sensor.example.test/',
        '/api/v1/sensing/latest',
        'test-only-token',
      ),
    ).resolves.toEqual({ ok: true, data: { presence: true } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sensor.example.test/api/v1/sensing/latest',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-only-token' }),
      }),
    );
  });

  it('returns an actionable error for a non-JSON response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('invalid JSON');
      },
    } as unknown as Response);

    await expect(sensingGet('https://sensor.example.test', '/health', undefined))
      .resolves.toEqual({
        ok: false,
        error: 'Non-JSON response from https://sensor.example.test/health',
      });
  });
});
