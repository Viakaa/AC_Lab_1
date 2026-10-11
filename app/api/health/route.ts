import { HealthResponse } from '../../../src/health';

export async function GET(): Promise<Response> {
  const body = HealthResponse.parse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });

  return Response.json(body, { status: 200 });
}
