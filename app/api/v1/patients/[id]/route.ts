import { NextResponse } from 'next/server';
import { requireAuth, getServerSupabase } from '@/lib/api-auth';
import { computeBmi } from '@/services/context-builder';
import type { Patient } from '@/types';

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function mapPatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    age: row.age as number,
    gender: row.gender as 'male' | 'female' | 'other',
    weightKg: row.weight_kg !== null ? Number(row.weight_kg) : null,
    heightCm: row.height_cm !== null ? Number(row.height_cm) : null,
    bmi: row.bmi !== null ? Number(row.bmi) : null,
    diagnosis: (row.diagnosis as string) || null,
    symptoms: (row.symptoms as string[]) || [],
    allergies: (row.allergies as string[]) || [],
    chronicConditions: (row.chronic_conditions as string[]) || [],
    geneticDisorders: (row.genetic_disorders as string[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const supabase = getServerSupabase(req);
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  return NextResponse.json({ patient: mapPatient(data) });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, age, gender, weightKg, heightCm, diagnosis, symptoms, allergies, chronicConditions, geneticDisorders } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (name !== undefined) updateData.name = name;
    if (age !== undefined) {
      const numericAge = Number(age);
      if (isNaN(numericAge) || numericAge < 0 || numericAge > 150) {
        return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
      }
      updateData.age = numericAge;
    }
    if (gender !== undefined) {
      if (!['male', 'female', 'other'].includes(gender)) {
        return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
      }
      updateData.gender = gender;
    }
    if (weightKg !== undefined || heightCm !== undefined) {
      const wKg = weightKg !== undefined ? (weightKg ? Number(weightKg) : null) : undefined;
      const hCm = heightCm !== undefined ? (heightCm ? Number(heightCm) : null) : undefined;

      if (wKg !== undefined) updateData.weight_kg = wKg;
      if (hCm !== undefined) updateData.height_cm = hCm;

      const currentWeight = wKg !== undefined ? wKg : null;
      const currentHeight = hCm !== undefined ? hCm : null;
      updateData.bmi = computeBmi(currentWeight, currentHeight);
    }
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis || null;
    if (symptoms !== undefined) updateData.symptoms = parseArray(symptoms);
    if (allergies !== undefined) updateData.allergies = parseArray(allergies);
    if (chronicConditions !== undefined) updateData.chronic_conditions = parseArray(chronicConditions);
    if (geneticDisorders !== undefined) updateData.genetic_disorders = parseArray(geneticDisorders);

    const supabase = getServerSupabase(req);
    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ patient: mapPatient(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const supabase = getServerSupabase(req);
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
