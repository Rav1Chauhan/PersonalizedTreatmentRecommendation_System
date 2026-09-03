'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Shield, Brain, Database } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fn = mode === 'login' ? signIn : signUp;
    const result = await fn(email, password);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 30% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px, 60px 60px',
        }} />
        <div className="relative z-10 flex items-center gap-3 text-white">
          <Activity className="w-8 h-8" />
          <span className="text-xl font-semibold">TreatmentRS</span>
        </div>
        <div className="relative z-10 text-white space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Personalized Treatment<br />Recommendation System
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Multi-LLM clinical decision-support combining patient history with AI analysis from Gemini, OpenAI, and Claude.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md pt-4">
            <div className="flex items-center gap-3 text-white/90">
              <Brain className="w-5 h-5" />
              <span className="text-sm">Multi-LLM Analysis</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Database className="w-5 h-5" />
              <span className="text-sm">Evidence Retrieval</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Safety Engine</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Activity className="w-5 h-5" />
              <span className="text-sm">Hybrid Ranking</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-white/60 text-xs max-w-md">
          Educational clinical decision-support output. Does not diagnose conditions or prescribe treatment. Candidate treatment options require review by a qualified healthcare professional.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 mb-8 text-primary">
            <Activity className="w-7 h-7" />
            <span className="text-lg font-semibold">TreatmentRS</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </CardTitle>
              <CardDescription>
                {mode === 'login'
                  ? 'Sign in to access the recommendation system'
                  : 'Create an account to get started'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => { setMode('signup'); setError(null); }}
                      className="text-primary font-medium hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => { setMode('login'); setError(null); }}
                      className="text-primary font-medium hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
