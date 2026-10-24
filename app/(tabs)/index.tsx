import useAuthStore from '@/store/useAuthStore';
import { Redirect } from 'expo-router';

export default function ReservarTab() {
  const { user } = useAuthStore();
  const role = user?.rol;
  if (role === 'admin') return <Redirect href="/admin" />;
  if (role === 'security') return <Redirect href="/security" />;
  return <Redirect href="/student" />;
}
