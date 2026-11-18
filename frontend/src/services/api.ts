// Centralized API service for the Medical IoMT Cybersecurity Dashboard
const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
}

// Dashboard
export const fetchDashboard = () => request<any>('/dashboard/summary');

// Devices
export const fetchDevices = (activeOnly = true) => request<any[]>(`/devices?active_only=${activeOnly}`);
export const createDevice = (data: any) => request<any>('/devices', { method: 'POST', body: JSON.stringify(data) });
export const updateDevice = (deviceId: string, data: any) =>
  request<any>(`/devices/${deviceId}`, { method: 'PATCH', body: JSON.stringify(data) });

// Alerts
export const fetchAlerts = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<any>(`/alerts${qs}`);
};
export const updateAlertStatus = (alertId: string, status: string) =>
  request<any>(`/alerts/${alertId}`, { method: 'PATCH', body: JSON.stringify({ status }) });

// Predictions
export const predictSingle = (features: Record<string, number>, deviceId?: string) =>
  request<any>('/predict', { method: 'POST', body: JSON.stringify({ features, device_id: deviceId }) });

export const predictBatch = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/predict/batch`, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
};

// Model
export const fetchModelMetrics = () => request<any>('/model/metrics');
export const trainModel = (modelType = 'random_forest') =>
  request<any>(`/model/train?model_type=${modelType}`, { method: 'POST' });

// Risk Analysis
export const whatIfAnalysis = (data: any) =>
  request<any>('/risk/what-if', { method: 'POST', body: JSON.stringify(data) });

// Simulation
export const startSimulation = (interval = 3) =>
  request<any>(`/simulation/start?interval=${interval}`, { method: 'POST' });
export const stopSimulation = () => request<any>('/simulation/stop', { method: 'POST' });
export const getSimulationStatus = () => request<any>('/simulation/status');

// Reports
export const fetchReportSummary = () => request<any>('/reports/summary');
export const exportReportCsv = async () => {
  const res = await fetch(`${API_BASE}/reports/export`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `security_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Health
export const healthCheck = () => request<any>('/health');
