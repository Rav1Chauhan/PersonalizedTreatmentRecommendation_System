import { NextResponse } from 'next/server';
import { requireAuth, getServerSupabase } from '@/lib/api-auth';
import { buildPatientContext } from '@/services/context-builder';
import { checkSafety } from '@/services/safety-engine';

export async function POST(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { patientId, treatmentName } = body;

    if (!patientId || !treatmentName) {
      return NextResponse.json({ error: 'Patient ID and treatment name are required' }, { status: 400 });
    }

    const supabase = getServerSupabase(req);
    const { data: patientData, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    if (error || !patientData) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const { data: historyData } = await supabase
      .from('patient_treatment_history')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    const context = buildPatientContext(
      'safety check',
      {
        age: patientData.age,
        gender: patientData.gender,
        weightKg: patientData.weight_kg !== null ? Number(patientData.weight_kg) : null,
        heightCm: patientData.height_cm !== null ? Number(patientData.height_cm) : null,
        bmi: patientData.bmi !== null ? Number(patientData.bmi) : null,
        diagnosis: patientData.diagnosis,
        symptoms: patientData.symptoms || [],
        allergies: patientData.allergies || [],
        chronicConditions: patientData.chronic_conditions || [],
        geneticDisorders: patientData.genetic_disorders || [],
      },
      (historyData || []).map((h: Record<string, unknown>) => ({
        treatmentName: h.treatment_name as string,
        outcome: (h.outcome as string) || null,
        adverseReaction: (h.adverse_reaction as string) || null,
        startedAt: (h.started_at as string) || null,
        endedAt: (h.ended_at as string) || null,
        notes: (h.notes as string) || null,
      }))
    );

    const safetyResult = checkSafety(treatmentName, context);

    return NextResponse.json({ safety: safetyResult, treatment: treatmentName });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
