export const dynamic = 'force-dynamic';
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

export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const supabase = getServerSupabase(req);
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const patients = (data || []).map(mapPatient);
  return NextResponse.json({ patients });
}

export async function POST(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, age, gender, weightKg, heightCm, diagnosis, symptoms, allergies, chronicConditions, geneticDisorders } = body;

    if (!name || age === undefined || !gender) {
      return NextResponse.json({ error: 'Name, age, and gender are required' }, { status: 400 });
    }

    const numericAge = Number(age);
    if (isNaN(numericAge) || numericAge < 0 || numericAge > 150) {
      return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
    }

    if (!['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }

    const wKg = weightKg ? Number(weightKg) : null;
    const hCm = heightCm ? Number(heightCm) : null;
    const bmi = computeBmi(wKg, hCm);

    const supabase = getServerSupabase(req);
    const { data, error } = await supabase
      .from('patients')
      .insert({
        name,
        age: numericAge,
        gender,
        weight_kg: wKg,
        height_cm: hCm,
        bmi,
        diagnosis: diagnosis || null,
        symptoms: parseArray(symptoms),
        allergies: parseArray(allergies),
        chronic_conditions: parseArray(chronicConditions),
        genetic_disorders: parseArray(geneticDisorders),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ patient: mapPatient(data) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
