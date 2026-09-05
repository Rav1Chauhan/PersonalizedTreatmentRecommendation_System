'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, AlertTriangle, Shield, Brain, FileText, CheckCircle2, XCircle,
  Activity, BookOpen, ChevronDown, ChevronUp, Info, Ban
} from 'lucide-react';
import type { RecommendationResponse, RecommendationCandidate, ProviderName } from '@/types';

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [result, setResult] = useState<RecommendationResponse | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('recommendation_result');
    if (stored) {
      setResult(JSON.parse(stored));
    }
  }, []);

  if (!result) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No recommendation results found.</p>
          <Link href={`/patients/${params.id}/analyze`}>
            <Button>Run a new analysis</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href={`/patients/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to patient
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Recommendation Results</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Problem: <span className="text-foreground italic">&ldquo;{result.problem}&rdquo;</span>
        </p>
      </div>

      {/* Provider status summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Provider Status</CardTitle>
          <CardDescription>Results from each AI provider queried in parallel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['gemini', 'openai', 'claude'] as const).map((p) => {
              const status = result.providerStatus[p];
              const isActive = status !== undefined;
              if (!isActive) return null;
              return (
                <div
                  key={p}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/20"
                >
                  <span className="font-medium capitalize">{p}</span>
                  <Badge
                    variant={status === 'success' ? 'default' : 'destructive'}
                    className="gap-1"
                  >
                    {status === 'success' ? (
                      <><CheckCircle2 className="w-3 h-3" /> Success</>
                    ) : (
                      <><XCircle className="w-3 h-3" /> {status === 'timeout' ? 'Timeout' : 'Error'}</>
                    )}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="recommendations">
        <TabsList>
          <TabsTrigger value="recommendations">
            Recommendations ({result.recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="providers">
            Provider Comparison
          </TabsTrigger>
          {result.excludedCandidates.length > 0 && (
            <TabsTrigger value="excluded">
              Excluded ({result.excludedCandidates.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Recommendations tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {result.recommendations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No safe recommendations could be generated. All candidates were excluded by the safety engine.
              </CardContent>
            </Card>
          ) : (
            result.recommendations.map((rec) => (
              <CandidateCard key={rec.rank} candidate={rec} />
            ))
          )}
        </TabsContent>

        {/* Provider comparison tab */}
        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Provider Comparison</CardTitle>
              <CardDescription>
                What each AI provider suggested, and how candidates were aggregated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {result.providerBreakdown.map((pb) => (
                  <div key={pb.provider} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold capitalize">{pb.provider}</span>
                      <Badge variant={pb.status === 'success' ? 'default' : 'destructive'}>
                        {pb.status}
                      </Badge>
                    </div>
                    {pb.candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No candidates returned</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {pb.candidates.map((c, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Aggregated Ranking
                </h4>
                <div className="space-y-2">
                  {result.recommendations.map((rec) => (
                    <div
                      key={rec.rank}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-8">#{rec.rank}</span>
                      <span className="font-medium flex-1">{rec.treatment}</span>
                      <div className="flex gap-1">
                        {rec.providers.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {rec.scores.final.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Excluded tab */}
        {result.excludedCandidates.length > 0 && (
          <TabsContent value="excluded">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ban className="w-5 h-5 text-destructive" />
                  Excluded Candidates
                </CardTitle>
                <CardDescription>
                  These candidates were excluded by the safety engine. Safety overrides ranking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.excludedCandidates.map((exc, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{exc.treatment}</p>
                        <p className="text-sm text-destructive mt-1">{exc.reason}</p>
                      </div>
                      <div className="flex gap-1">
                        {exc.providers.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-sm text-muted-foreground mt-4">
                  These candidates were excluded despite AI provider support. Safety always overrides ranking — neither LLM consensus, ML probability, nor retrieval similarity can override an allergy exclusion.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>{result.disclaimer}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: RecommendationCandidate }) {
  const [expanded, setExpanded] = useState(false);
  const safetyColor =
    candidate.safety.status === 'known' ? 'success' :
    candidate.safety.status === 'excluded' ? 'destructive' :
    candidate.safety.status === 'review_required' ? 'warning' : 'secondary';

  return (
    <Card className="animate-slide-up">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
              #{candidate.rank}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{candidate.treatment}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-primary">
                  {candidate.scores.final.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">final score</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1">
              {candidate.providers.map((p) => (
                <Badge key={p} variant="secondary" className="text-xs capitalize">
                  {p}
                </Badge>
              ))}
            </div>
            <Badge variant={safetyColor === 'success' ? 'default' : safetyColor === 'destructive' ? 'destructive' : 'secondary'}>
              <Shield className="w-3 h-3 mr-1" />
              {candidate.safety.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <ScoreBar label="LLM Support" value={candidate.scores.llmSupport} />
          <ScoreBar label="Retrieval" value={candidate.scores.retrieval} />
          <ScoreBar label="Diagnosis Relevance" value={candidate.scores.diagnosisRelevance} />
          <ScoreBar label="Patient Context" value={candidate.scores.patientContext} />
          <ScoreBar label="Evidence Quality" value={candidate.scores.evidenceQuality} />
          <ScoreBar
            label="ML Probability"
            value={candidate.scores.mlProbability}
            nullable
          />
        </div>

        {/* Reason */}
        <div className="p-3 rounded-lg bg-secondary/30 mb-4">
          <p className="text-sm">
            <Info className="w-4 h-4 inline mr-1 text-muted-foreground" />
            {candidate.reason}
          </p>
        </div>

        {/* Safety warnings */}
        {candidate.safety.warnings.length > 0 && (
          <div className="mb-4 space-y-1">
            {candidate.safety.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-warning">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Considerations */}
        {candidate.considerations.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Important Considerations</p>
            <ul className="space-y-1">
              {candidate.considerations.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expandable evidence */}
        {candidate.evidence.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <BookOpen className="w-4 h-4" />
              Evidence ({candidate.evidence.length})
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <div className="mt-3 space-y-2">
                {candidate.evidence.map((ev, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-secondary/20">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium">{ev.title}</p>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {ev.evidenceQuality}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Source: {ev.source}</span>
                      <span>Condition: {ev.condition}</span>
                      <span>Similarity: {(ev.similarity * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Review required banner */}
        {candidate.reviewRequired && (
          <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              REQUIRES CLINICIAN REVIEW
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBar({
  label,
  value,
  nullable,
}: {
  label: string;
  value: number | null;
  nullable?: boolean;
}) {
  const displayValue = value === null ? 'N/A' : value.toFixed(2);
  const percent = value === null ? 0 : Math.round(value * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-medium ${value === null ? 'text-muted-foreground' : ''}`}>
          {displayValue}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${nullable && value === null ? 0 : percent}%` }}
        />
      </div>
    </div>
  );
}
