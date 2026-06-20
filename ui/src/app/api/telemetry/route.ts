import { NextResponse } from 'next/server';
import { getTelemetryLogs, clearTelemetry } from '@/lib/db';

export async function GET() {
  const logs = getTelemetryLogs();
  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (body.action === 'clear') {
    clearTelemetry();
    return NextResponse.json({ status: 'cleared' });
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
