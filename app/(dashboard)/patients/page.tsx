'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, AlertTriangle, Users } from 'lucide-react';
import type { Patient } from '@/types';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<{ patients: Patient[] }>('/patients');
        setPatients(res.patients || []);
      } catch (err) {
        console.error('Failed to load patients:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.diagnosis?.toLowerCase().includes(q) ?? false) ||
      p.symptoms.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground mt-1">
            Manage patient profiles and medical history
          </p>
        </div>
        <Link href="/patients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, diagnosis, or symptom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-destructive/60" />
            <p className="text-muted-foreground mb-2">{error}</p>
            <p className="text-xs text-muted-foreground">Make sure you are signed in and the database is reachable.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">
              {search ? 'No patients match your search.' : 'No patients yet.'}
            </p>
            <Link href="/patients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Patient
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((patient) => (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="block animate-slide-up"
            >
              <Card className="hover:border-primary/30 hover:shadow-sm transition-all">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.age} years · {patient.gender}
                          {patient.bmi ? ` · BMI ${patient.bmi}` : ''}
                        </p>
                        {patient.diagnosis && (
                          <Badge variant="secondary" className="mt-1">
                            {patient.diagnosis}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.length > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {patient.allergies.join(', ')}
                        </Badge>
                      )}
                      {patient.chronicConditions.length > 0 && (
                        <Badge variant="secondary">
                          {patient.chronicConditions.length} chronic condition{patient.chronicConditions.length === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
