import { NextResponse } from 'next/server';
import { requireAuth, getServerSupabase } from '@/lib/api-auth';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const supabase = getServerSupabase(req);

  const { data: requests, error } = await supabase
    .from('recommendation_requests')
    .select(`
      id,
      problem_text,
      model_version,
      created_at,
      recommendation_candidates (
        treatment,
        rank,
        final_score,
        safety_status,
        review_required
      ),
      recommendation_providers (
        provider,
        status,
        latency_ms
      )
    `)
    .eq('patient_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: requests || [] });
}
