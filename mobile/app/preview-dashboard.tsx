// Isolated dashboard preview — stable mock data, no auth or navigation dependencies.
// Access via: expo-router deep link to /preview-dashboard
// Purpose: review the dashboard screen in isolation during development.

import { DashboardScreen } from '../src/features/dashboard/DashboardScreen';

export default function PreviewDashboard() {
  return <DashboardScreen />;
}
