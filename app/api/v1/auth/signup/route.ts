import { getServerSupabase } from '@/lib/api-auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = getServerSupabase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
