export const homePathForRole = (role) => {
  if (role === 'CAFE_STAFF') return '/cafe-scanner';
  if (role === 'FINANCE') return '/reports';
  if (role === 'HR') return '/employees';
  return '/dashboard';
};
