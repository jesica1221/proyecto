const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/eficient-parking-lot';

export const Config = {
  API_BASE_URL: apiBaseUrl,
  DASHBOARD_URL: apiBaseUrl.replace(/\/eficient-parking-lot\/?$/, '/api/dashboard/overview'),
};

export default Config;
