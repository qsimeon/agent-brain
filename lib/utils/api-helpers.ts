import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: string, hint?: string, status = 400) {
  return NextResponse.json({ success: false, error, hint }, { status });
}

export function generateApiKey(): string {
  return `agentbrain_${nanoid(32)}`;
}

export function generateClaimToken(): string {
  return `agentbrain_claim_${nanoid(24)}`;
}

export function extractApiKey(header: string | null): string | null {
  if (!header) return null;
  return header.replace('Bearer ', '').trim() || null;
}

export function checkAdminKey(req: Request): boolean {
  const key = req.headers.get('x-admin-key');
  return key === process.env.ADMIN_KEY;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/\0/g, '');
}
