'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Activity, AlertTriangle, Plus, Brain, Shield, Database } from 'lucide-react';
import type { Patient, HealthStatus } from '@/types';

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [patientsRes, healthRes] = await Promise.all([
          apiFetch<{ patients: Patient[] }>('/patients'),
          apiFetch<HealthStatus>('/health').catch(() => null),
        ]);
        setPatients(patientsRes.patients || []);
        if (healthRes) setHealth(healthRes);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const recentPatients = patients.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of patients, system status, and recent activity
          </p>
        </div>
        <Link href="/patients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={loading ? null : patients.length}
          icon={Users}
          color="primary"
        />
        <StatCard
          label="System Status"
          value={loading || !health ? null : health.application}
          icon={Activity}
          color={health?.application === 'healthy' ? 'success' : 'warning'}
        />
        <StatCard
          label="AI Providers"
          value={loading || !health ? null : Object.values(health.providers).filter(Boolean).length + ' / 3'}
          icon={Brain}
          color="primary"
        />
        <StatCard
          label="ML Models"
          value={loading || !health ? null : health.mlModels}
          icon={Database}
          color={health?.mlModels === 'loaded' ? 'success' : 'warning'}
        />
      </div>

      {/* Provider status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Provider Configuration</CardTitle>
            <CardDescription>Status of configured LLM providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['gemini', 'openai', 'claude'] as const).map((provider) => {
                const configured = health.providers[provider];
                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${configured ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <span className="font-medium capitalize">{provider}</span>
                    </div>
                    <Badge variant={configured ? 'default' : 'secondary'}>
                      {configured ? 'Ready' : 'Not configured'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent patients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Patients</CardTitle>
              <CardDescription>Most recently added patients</CardDescription>
            </div>
            <Link href="/patients">
              <Button variant="outline" size="sm">View all</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentPatients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No patients yet. Create your first patient to get started.</p>
              <Link href="/patients/new">
                <Button className="mt-4" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Patient
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPatients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.age} years · {patient.gender}
                        {patient.diagnosis ? ` · ${patient.diagnosis}` : ''}
                      </p>
                    </div>
                  </div>
                  {patient.allergies.length > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {patient.allergies.length} allerg{patient.allergies.length === 1 ? 'y' : 'ies'}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>Educational use only.</strong> This system provides clinical decision-support output. It does not diagnose conditions or prescribe treatment. Candidate treatment options require review by a qualified healthcare professional.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number | null;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const colorClasses: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            {value === null ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-2xl font-bold capitalize">{value}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
