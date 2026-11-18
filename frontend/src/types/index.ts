// TypeScript interfaces for the Medical IoMT Cybersecurity Dashboard

export interface Device {
  id: number;
  device_id: string;
  name: string;
  device_type: string;
  department: string;
  criticality: string;
  ip_address: string | null;
  mac_address: string | null;
  protocol: string | null;
  status: string;
  latest_risk_score: number;
  latest_threat: string;
  last_seen: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  alert_id: string;
  device_id: string;
  device_name: string | null;
  attack_type: string;
  severity: string;
  risk_score: number;
  likelihood: number;
  impact: number;
  confidence: number;
  summary: string;
  technical_details: Record<string, any> | null;
  suggested_response: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MetricDistribution {
  name: string;
  value: number;
  color?: string;
}

export interface ModelStatus {
  status: string;
  model_name: string;
  message: string;
  accuracy: number | null;
  f1_macro: number | null;
  classes?: string[];
  feature_count?: number;
}

export interface DashboardSummary {
  total_devices: number;
  devices_requiring_investigation: number;
  suspicious_events: number;
  high_critical_events: number;
  threat_distribution: MetricDistribution[];
  risk_distribution: MetricDistribution[];
  criticality_distribution: MetricDistribution[];
  recent_alerts: Alert[];
  model_status: ModelStatus;
  demo_mode: boolean;
}

export interface FeatureContribution {
  feature: string;
  value: number;
  importance: number;
  effect: string;
}

export interface PredictionResponse {
  predicted_label: string;
  predicted_attack_type: string;
  confidence: number;
  risk_score: number;
  risk_category: string;
  likelihood: number;
  impact: number;
  contributing_factors: FeatureContribution[];
  recommended_action: string;
  device_id: string | null;
  device_name: string | null;
  is_synthetic: boolean;
}

export interface BatchPredictionItem {
  row_index: number;
  device_id: string | null;
  predicted_label: string;
  predicted_attack_type: string;
  confidence: number;
  risk_score: number;
  risk_category: string;
  key_features: Record<string, number>;
}

export interface BatchPredictionResponse {
  total_records: number;
  attack_count: number;
  benign_count: number;
  high_critical_count: number;
  results: BatchPredictionItem[];
  distribution: Record<string, number>;
}

export interface WhatIfRequest {
  device_id?: string;
  device_criticality: string;
  threat_category: string;
  likelihood_override?: number;
  impact_override?: number;
}

export interface WhatIfResponse {
  device_id: string | null;
  device_criticality: string;
  threat_category: string;
  calculated_likelihood: number;
  calculated_impact: number;
  risk_score: number;
  risk_category: string;
  formula_breakdown: string;
  clinical_implication: string;
  recommended_mitigation: string;
  is_simulation: boolean;
}

export interface ModelMetrics {
  status: string;
  is_placeholder: boolean;
  model_name?: string;
  version?: string;
  accuracy?: number;
  precision_macro?: number;
  recall_macro?: number;
  f1_macro?: number;
  fpr?: number;
  fnr?: number;
  confusion_matrix?: number[][];
  classes?: string[];
  per_class_metrics?: Record<string, {precision: number; recall: number; f1_score: number; support: number}>;
  feature_importances?: {feature: string; importance: number}[];
  training_duration_seconds?: number;
  dataset_samples?: number;
  message?: string;
}

export interface SimulationStatus {
  is_running: boolean;
  events_generated: number;
  alerts_triggered: number;
  active_devices: number;
  interval_seconds: number;
  last_event_time: string | null;
}

export type PageName = 'dashboard' | 'devices' | 'threats' | 'alerts' | 'notifications' | 'risk-analysis' | 'model' | 'reports' | 'settings';
