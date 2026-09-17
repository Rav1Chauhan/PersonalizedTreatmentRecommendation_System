import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function getServerSupabase(req?: Request) {
  const token = req ? extractToken(req) : null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

export async function requireAuth(req: Request): Promise<{ userId: string; error?: null } | { userId: null; error: string }> {
  const token = extractToken(req);
  if (!token) {
    return { userId: null, error: 'Authentication required' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: data.user.id, error: null };
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
