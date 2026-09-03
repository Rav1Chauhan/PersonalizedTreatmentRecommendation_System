'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewPatientPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    weightKg: '',
    heightCm: '',
    diagnosis: '',
    symptoms: '',
    allergies: '',
    chronicConditions: '',
    geneticDisorders: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch<{ patient: { id: string } }>('/patients', {
        method: 'POST',
        body: form,
      });
      router.push(`/patients/${res.patient.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <Link href="/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to patients
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Patient</h1>
        <p className="text-muted-foreground mt-1">
          Create a patient profile with demographic and medical information
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Demographic and physical attributes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  required
                  min="0"
                  max="150"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div></div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
            <CardDescription>
              Diagnoses, symptoms, and conditions. Separate multiple values with commas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Known Diagnosis</Label>
              <Input
                id="diagnosis"
                placeholder="e.g., Major depressive disorder"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms (comma-separated)</Label>
              <Textarea
                id="symptoms"
                placeholder="e.g., fatigue, low mood, insomnia"
                value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies (comma-separated)</Label>
              <Input
                id="allergies"
                placeholder="e.g., penicillin, sulfa, aspirin"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chronic">Chronic Conditions (comma-separated)</Label>
              <Textarea
                id="chronic"
                placeholder="e.g., hypertension, type 2 diabetes"
                value={form.chronicConditions}
                onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genetic">Genetic Disorders (comma-separated)</Label>
              <Input
                id="genetic"
                placeholder="e.g., MTHFR mutation"
                value={form.geneticDisorders}
                onChange={(e) => setForm({ ...form, geneticDisorders: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={submitting}>
            <Save className="w-4 h-4 mr-2" />
            {submitting ? 'Saving...' : 'Create Patient'}
          </Button>
          <Link href="/patients">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
