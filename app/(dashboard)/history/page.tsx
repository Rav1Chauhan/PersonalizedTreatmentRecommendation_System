'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { History as HistoryIcon, Users, ChevronRight } from 'lucide-react';
import type { Patient } from '@/types';

interface HistoryEntry {
  id: string;
  problem_text: string;
  model_version: string;
  created_at: string;
  recommendation_candidates: Array<{
    treatment: string;
    rank: number;
    final_score: number;
    safety_status: string;
    review_required: boolean;
  }>;
  recommendation_providers: Array<{
    provider: string;
    status: string;
    latency_ms: number | null;
  }>;
}

export default function HistoryPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await apiFetch<{ patients: Patient[] }>('/patients');
        setPatients(res.patients || []);
        if (res.patients?.length > 0) {
          setSelectedPatient(res.patients[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatient) return;
    setLoadingHistory(true);
    async function loadHistory() {
      try {
        const res = await apiFetch<{ history: HistoryEntry[] }>(`/history/patient/${selectedPatient}`);
        setHistory(res.history || []);
      } catch (err) {
        console.error('Failed to load history:', err);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [selectedPatient]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recommendation History</h1>
        <p className="text-muted-foreground mt-1">
          View past recommendation requests and their results
        </p>
      </div>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Create a patient first to generate recommendations.</p>
            <Link href="/patients/new"><Button className="mt-4">New Patient</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.age} years
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {loadingHistory ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <HistoryIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No recommendation history for this patient yet.</p>
                {selectedPatient && (
                  <Link href={`/patients/${selectedPatient}/analyze`}>
                    <Button className="mt-4">Run Analysis</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <Card key={entry.id} className="animate-slide-up">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                        <p className="font-medium italic">&ldquo;{entry.problem_text}&rdquo;</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary">Model v{entry.model_version}</Badge>
                        <div className="flex gap-1">
                          {entry.recommendation_providers.map((p) => (
                            <Badge
                              key={p.provider}
                              variant={p.status === 'success' ? 'default' : 'destructive'}
                              className="text-xs capitalize"
                            >
                              {p.provider}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {entry.recommendation_candidates.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Top Candidates</p>
                        {entry.recommendation_candidates.slice(0, 5).map((cand) => (
                          <div
                            key={cand.rank}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-secondary/20"
                          >
                            <span className="text-sm font-bold text-muted-foreground w-6">#{cand.rank}</span>
                            <span className="text-sm font-medium flex-1">{cand.treatment}</span>
                            <span className="text-sm text-primary font-medium">
                              {Number(cand.final_score).toFixed(2)}
                            </span>
                            <Badge
                              variant={
                                cand.safety_status === 'known' ? 'default' :
                                cand.safety_status === 'excluded' ? 'destructive' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {cand.safety_status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/patients/${selectedPatient}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                    >
                      View patient <ChevronRight className="w-3 h-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
