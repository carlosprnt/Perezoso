import { Redirect } from 'expo-router';

// Root redirect: send to dashboard (auth guard will be added in Phase 5)
export default function Index() {
  return <Redirect href="/(tabs)/dashboard" />;
}
