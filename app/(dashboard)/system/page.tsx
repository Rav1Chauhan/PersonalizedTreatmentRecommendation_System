'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Brain, Database, Shield, Server, Cpu, BookOpen } from 'lucide-react';
import type { HealthStatus } from '@/types';

interface ModelInfo {
  embeddingModel: string;
  embeddingDimension: number;
  retrievalModel: string;
  patientMlModel: string;
  modelVersion: string;
  enabledProviders: string[];
  ml: {
    featureCount: number;
    trainingSamples: number;
    vocabularySize: number;
    vocabulary: string[];
    limitations: string;
  };
  evidenceDataset: {
    name: string;
    license: string;
    source: string;
    recordCount: number;
    limitations: string;
  };
}

export default function SystemInfoPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [h, m] = await Promise.all([
          apiFetch<HealthStatus>('/health').catch(() => null),
          apiFetch<ModelInfo>('/model/info').catch(() => null),
        ]);
        if (h) setHealth(h);
        if (m) setModelInfo(m);
      } catch (err) {
        console.error('Failed to load system info:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Information</h1>
        <p className="text-muted-foreground mt-1">
          Health status, model details, and dataset information
        </p>
      </div>

      {/* Health status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5" />
              Health Status
            </CardTitle>
            <CardDescription>Current system and dependency status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatusItem label="Application" value={health.application} icon={Activity} />
              <StatusItem label="Database" value={health.database} icon={Database} />
              <StatusItem label="ML Models" value={health.mlModels} icon={Cpu} />
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">AI Providers</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(health.providers).map(([name, configured]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{name}</span>
                      <div className={`w-2 h-2 rounded-full ${configured ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Last checked: {new Date(health.timestamp).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Model info */}
      {modelInfo && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                ML Model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Model Type" value={modelInfo.patientMlModel} />
              <InfoRow label="Model Version" value={modelInfo.modelVersion} />
              <InfoRow label="Features" value={`${modelInfo.ml.featureCount} features`} />
              <InfoRow label="Training Samples" value={`${modelInfo.ml.trainingSamples} samples`} />
              <InfoRow label="Vocabulary Size" value={`${modelInfo.ml.vocabularySize} treatments`} />
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Treatment Vocabulary</p>
                <div className="flex flex-wrap gap-1.5">
                  {modelInfo.ml.vocabulary.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                {modelInfo.ml.limitations}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Evidence Dataset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Name" value={modelInfo.evidenceDataset.name} />
              <InfoRow label="License" value={modelInfo.evidenceDataset.license} />
              <InfoRow label="Records" value={`${modelInfo.evidenceDataset.recordCount} records`} />
              <InfoRow label="Source" value={modelInfo.evidenceDataset.source} />
              <InfoRow label="Retrieval" value={modelInfo.retrievalModel} />
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                {modelInfo.evidenceDataset.limitations}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200 space-y-1">
            <p><strong>Educational use only.</strong> This system does not diagnose or prescribe. All outputs require clinician review.</p>
            <p>ML model performance does not establish clinical validity. Evidence coverage is limited to the loaded dataset.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  const isGood = value === 'healthy' || value === 'connected' || value === 'loaded';
  return (
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isGood ? 'bg-success' : 'bg-warning'}`} />
        <span className="text-sm font-medium capitalize">{value}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
