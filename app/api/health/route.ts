import { NextResponse } from 'next/server';

export async function GET() {
  const healthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(healthResponse, { status: 200 });
}