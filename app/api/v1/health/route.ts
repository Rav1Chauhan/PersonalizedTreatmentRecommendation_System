export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isProviderEnabled } from '@/lib/config';
import { getMLModel } from '@/services/patient-ml';

export async function GET() {
  const providers = {
    gemini: isProviderEnabled('gemini') && !!process.env.GEMINI_API_KEY,
    openai: isProviderEnabled('openai') && !!process.env.OPENAI_API_KEY,
    claude: isProviderEnabled('claude') && !!process.env.ANTHROPIC_API_KEY,
  };

  let database: 'connected' | 'disconnected' = 'disconnected';
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('patients').select('id').limit(1);
    database = error ? 'disconnected' : 'connected';
  } catch {
    database = 'disconnected';
  }

  let mlModels: 'loaded' | 'not_loaded' = 'not_loaded';
  try {
    getMLModel();
    mlModels = 'loaded';
  } catch {
    mlModels = 'not_loaded';
  }

  const allProvidersConfigured = Object.values(providers).every(Boolean);
  const application = database === 'connected' && mlModels === 'loaded'
    ? allProvidersConfigured
      ? 'healthy'
      : 'degraded'
    : 'unhealthy';

  return NextResponse.json({
    application,
    database,
    mlModels,
    providers,
    timestamp: new Date().toISOString(),
  });
}
