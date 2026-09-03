'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, AlertTriangle, Activity, Plus, Trash2, History as HistoryIcon,
  Brain, FileText, User
} from 'lucide-react';
import type { Patient, TreatmentHistoryEntry } from '@/types';

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<TreatmentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    treatmentName: '',
    outcome: '',
    adverseReaction: '',
    startedAt: '',
    endedAt: '',
    notes: '',
  });
  const [addingHistory, setAddingHistory] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [patientRes, historyRes] = await Promise.all([
          apiFetch<{ patient: Patient }>(`/patients/${params.id}`),
          apiFetch<{ history: TreatmentHistoryEntry[] }>(`/patients/${params.id}/history`),
        ]);
        setPatient(patientRes.patient);
        setHistory(historyRes.history || []);
      } catch (err) {
        console.error('Failed to load patient:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingHistory(true);
    try {
      const res = await apiFetch<{ history: TreatmentHistoryEntry }>(
        `/patients/${params.id}/history`,
        { method: 'POST', body: historyForm }
      );
      setHistory([res.history, ...history]);
      setHistoryForm({ treatmentName: '', outcome: '', adverseReaction: '', startedAt: '', endedAt: '', notes: '' });
      setShowAddHistory(false);
    } catch (err) {
      console.error('Failed to add history:', err);
    } finally {
      setAddingHistory(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this patient? This will also delete all their history and recommendations.')) return;
    try {
      await apiFetch(`/patients/${params.id}`, { method: 'DELETE' });
      router.push('/patients');
    } catch (err) {
      console.error('Failed to delete patient:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Patient not found.</p>
        <Link href="/patients"><Button variant="outline" className="mt-4">Back to patients</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link href="/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to patients
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xl">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
              <p className="text-muted-foreground">
                {patient.age} years · {patient.gender}
                {patient.bmi ? ` · BMI ${patient.bmi}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/patients/${patient.id}/analyze`}>
              <Button>
                <Brain className="w-4 h-4 mr-2" />
                Analyze Problem
              </Button>
            </Link>
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Medical info */}
      <div className="grid gap-4 md:grid-cols-2">
        {patient.diagnosis && (
          <InfoCard label="Diagnosis" value={patient.diagnosis} icon={FileText} />
        )}
        {patient.symptoms.length > 0 && (
          <InfoCard label="Symptoms" values={patient.symptoms} icon={Activity} />
        )}
        {patient.allergies.length > 0 && (
          <InfoCard label="Allergies" values={patient.allergies} icon={AlertTriangle} variant="destructive" />
        )}
        {patient.chronicConditions.length > 0 && (
          <InfoCard label="Chronic Conditions" values={patient.chronicConditions} icon={Activity} />
        )}
        {patient.geneticDisorders.length > 0 && (
          <InfoCard label="Genetic Disorders" values={patient.geneticDisorders} icon={User} />
        )}
        {patient.weightKg && patient.heightCm && (
          <InfoCard label="Physical" value={`${patient.weightKg} kg / ${patient.heightCm} cm`} icon={User} />
        )}
      </div>

      {/* Treatment history */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <HistoryIcon className="w-5 h-5" />
                Treatment History
              </CardTitle>
              <CardDescription>Previous treatments, outcomes, and adverse reactions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddHistory(!showAddHistory)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddHistory && (
            <form onSubmit={handleAddHistory} className="mb-6 p-4 rounded-lg border border-border bg-secondary/20 space-y-4 animate-slide-up">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="histTreatment">Treatment Name *</Label>
                  <Input
                    id="histTreatment"
                    required
                    value={historyForm.treatmentName}
                    onChange={(e) => setHistoryForm({ ...historyForm, treatmentName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="histOutcome">Outcome</Label>
                  <Input
                    id="histOutcome"
                    placeholder="e.g., successful, failed, partial"
                    value={historyForm.outcome}
                    onChange={(e) => setHistoryForm({ ...historyForm, outcome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="histAdverse">Adverse Reaction</Label>
                  <Input
                    id="histAdverse"
                    placeholder="e.g., nausea, none"
                    value={historyForm.adverseReaction}
                    onChange={(e) => setHistoryForm({ ...historyForm, adverseReaction: e.target.value })}
                  />
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label htmlFor="histStart">Started</Label>
                  <Input
                    id="histStart"
                    type="date"
                    value={historyForm.startedAt}
                    onChange={(e) => setHistoryForm({ ...historyForm, startedAt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="histEnd">Ended</Label>
                  <Input
                    id="histEnd"
                    type="date"
                    value={historyForm.endedAt}
                    onChange={(e) => setHistoryForm({ ...historyForm, endedAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="histNotes">Notes</Label>
                <Textarea
                  id="histNotes"
                  value={historyForm.notes}
                  onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addingHistory}>
                  {addingHistory ? 'Saving...' : 'Save Entry'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddHistory(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No treatment history recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg border border-border bg-secondary/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{entry.treatmentName}</p>
                        {entry.outcome && (
                          <Badge
                            variant={
                              entry.outcome.toLowerCase().includes('success') ? 'default' :
                              entry.outcome.toLowerCase().includes('fail') ? 'destructive' : 'secondary'
                            }
                          >
                            {entry.outcome}
                          </Badge>
                        )}
                      </div>
                      {entry.adverseReaction && entry.adverseReaction.toLowerCase() !== 'none' && (
                        <div className="flex items-center gap-1.5 text-sm text-destructive mb-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Adverse reaction: {entry.adverseReaction}
                        </div>
                      )}
                      {entry.notes && <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>}
                      {(entry.startedAt || entry.endedAt) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.startedAt ? `Started: ${entry.startedAt}` : ''}
                          {entry.startedAt && entry.endedAt ? ' — ' : ''}
                          {entry.endedAt ? `Ended: ${entry.endedAt}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  label,
  value,
  values,
  icon: Icon,
  variant = 'default',
}: {
  label: string;
  value?: string;
  values?: string[];
  icon: React.ElementType;
  variant?: 'default' | 'destructive';
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        {value && <p className="text-sm font-medium">{value}</p>}
        {values && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {values.map((v, i) => (
              <Badge key={i} variant={variant === 'destructive' ? 'destructive' : 'secondary'}>
                {v}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
