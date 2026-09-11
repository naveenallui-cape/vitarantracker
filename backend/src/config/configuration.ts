export type AppConfig = {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  deviceTokenSecret: string;
  corsOrigin: string[];
  idleThresholdMinutes: number;
  heartbeatIntervalSeconds: number;
  offlineGraceSeconds: number;
  jwtExpiresIn: string;
};

function parseOrigins(value: string | undefined): string[] {
  if (!value || value.trim() === '' || value.trim() === '*') {
    return [];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default function configuration(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseUrl: required('DATABASE_URL'),
    jwtSecret: required('JWT_SECRET'),
    deviceTokenSecret: required('DEVICE_TOKEN_SECRET'),
    corsOrigin: parseOrigins(process.env.CORS_ORIGIN),
    idleThresholdMinutes: parseInt(
      process.env.IDLE_THRESHOLD_MINUTES ?? '5',
      10,
    ),
    heartbeatIntervalSeconds: parseInt(
      process.env.HEARTBEAT_INTERVAL_SECONDS ?? '60',
      10,
    ),
    offlineGraceSeconds: parseInt(
      process.env.OFFLINE_GRACE_SECONDS ?? '180',
      10,
    ),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  };
}
