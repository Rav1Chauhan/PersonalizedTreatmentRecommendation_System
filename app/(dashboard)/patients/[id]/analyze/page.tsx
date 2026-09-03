'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Brain, Loader2, CheckCircle2, XCircle, Activity } from 'lucide-react';
import type { RecommendationResponse, ProviderName } from '@/types';

const PIPELINE_STEPS = [
  'Preparing patient context',
  'Gemini',
  'OpenAI',
  'Claude',
  'Evidence retrieval',
  'Safety analysis',
  'Recommendation ranking',
];

export default function AnalyzePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [problem, setProblem] = useState('');
  const [providers, setProviders] = useState<ProviderName[]>(['gemini', 'openai', 'claude']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleProvider = (p: ProviderName) => {
    setProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problem.trim().length < 10) {
      setError('Please describe the problem in at least 10 characters.');
      return;
    }
    if (providers.length === 0) {
      setError('Select at least one AI provider.');
      return;
    }

    setError(null);
    setSubmitting(true);
    setCompletedSteps([0]);

    // Simulate pipeline progress for UX
    const stepTimer = setInterval(() => {
      setCompletedSteps((prev) => {
        if (prev.length >= PIPELINE_STEPS.length) {
          clearInterval(stepTimer);
          return prev;
        }
        return [...prev, prev.length];
      });
    }, 600);

    try {
      const result = await apiFetch<RecommendationResponse>('/recommendations', {
        method: 'POST',
        body: { patientId: params.id, problem, providers, topK: 5 },
      });

      clearInterval(stepTimer);
      setCompletedSteps(Array.from({ length: PIPELINE_STEPS.length }, (_, i) => i));

      // Store result and navigate
      sessionStorage.setItem('recommendation_result', JSON.stringify(result));
      router.push(`/patients/${params.id}/results`);
    } catch (err) {
      clearInterval(stepTimer);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setSubmitting(false);
      setCompletedSteps([]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <Link
          href={`/patients/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to patient
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Describe the Problem</h1>
        <p className="text-muted-foreground mt-1">
          Describe the current health concern in natural language for AI analysis
        </p>
      </div>

      {!submitting ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What are you experiencing?</CardTitle>
              <CardDescription>
                Describe symptoms, concerns, or changes in condition in your own words
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="problem">Problem Description</Label>
                <Textarea
                  id="problem"
                  rows={8}
                  placeholder="e.g., I've been feeling anxious for the last two weeks, I haven't been sleeping well and I feel tired during the day."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {problem.length} / 5000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Providers</CardTitle>
              <CardDescription>
                Select which providers to query. All selected providers will be called in parallel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['gemini', 'openai', 'claude'] as const).map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={providers.includes(p)}
                      onCheckedChange={() => toggleProvider(p)}
                    />
                    <span className="font-medium text-sm capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" size="lg">
              <Brain className="w-4 h-4 mr-2" />
              Analyze
            </Button>
            <Link href={`/patients/${params.id}`}>
              <Button variant="outline" size="lg" type="button">Cancel</Button>
            </Link>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <strong>Educational use only.</strong> Results are candidate treatment options requiring review by a qualified healthcare professional. This does not diagnose or prescribe.
            </p>
          </div>
        </form>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary animate-pulse" />
              AI Analysis in Progress
            </CardTitle>
            <CardDescription>
              Querying {providers.length} provider{providers.length === 1 ? '' : 's'} in parallel and running the recommendation pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PIPELINE_STEPS.map((step, idx) => {
                const isComplete = completedSteps.includes(idx);
                const isCurrent = idx === completedSteps.length && !isComplete;
                const hasFailed = step !== 'Preparing patient context' && step !== 'Evidence retrieval' && step !== 'Safety analysis' && step !== 'Recommendation ranking' && isComplete && Math.random() > 0.9;

                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isComplete ? 'bg-secondary/30' : isCurrent ? 'bg-primary/5 border border-primary/20' : 'opacity-40'
                    }`}
                  >
                    {isComplete ? (
                      hasFailed ? (
                        <XCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      )
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={`text-sm ${isComplete || isCurrent ? 'font-medium' : ''}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              This may take up to 30 seconds depending on provider response times.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
