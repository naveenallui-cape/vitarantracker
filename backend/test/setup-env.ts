process.env.DATABASE_URL ??=
  'postgresql://vitarantracker:vitarantracker@localhost:5432/vitarantracker';
process.env.JWT_SECRET ??= 'test-jwt-secret-please-change-32chars';
process.env.DEVICE_TOKEN_SECRET ??= 'test-device-secret-please-change-32';
process.env.PORT ??= '4000';
process.env.IDLE_THRESHOLD_MINUTES ??= '5';
process.env.HEARTBEAT_INTERVAL_SECONDS ??= '60';
process.env.OFFLINE_GRACE_SECONDS ??= '180';
process.env.ADMIN_NAME ??= 'Vitaran Admin';
process.env.ADMIN_EMAIL ??= 'admin@vitaran.com';
process.env.ADMIN_PASSWORD ??= 'change-this-admin-password';
