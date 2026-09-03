import { requireAuth, getServerSupabase } from '@/lib/api-auth';
import type { TreatmentHistoryEntry } from '@/types';

function mapHistory(row: Record<string, unknown>): TreatmentHistoryEntry {
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    treatmentName: row.treatment_name as string,
    outcome: (row.outcome as string) || null,
    adverseReaction: (row.adverse_reaction as string) || null,
    startedAt: (row.started_at as string) || null,
    endedAt: (row.ended_at as string) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
  };
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

  const supabase = getServerSupabase(req);
  const { data, error } = await supabase
    .from('patient_treatment_history')
    .select('*')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const history = (data || []).map(mapHistory);
  return Response.json({ history });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { treatmentName, outcome, adverseReaction, startedAt, endedAt, notes } = body;

    if (!treatmentName) {
      return Response.json({ error: 'Treatment name is required' }, { status: 400 });
    }

    const supabase = getServerSupabase(req);
    const { data, error } = await supabase
      .from('patient_treatment_history')
      .insert({
        patient_id: params.id,
        treatment_name: treatmentName,
        outcome: outcome || null,
        adverse_reaction: adverseReaction || null,
        started_at: startedAt || null,
        ended_at: endedAt || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ history: mapHistory(data) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
