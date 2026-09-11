function requireEnv(name: string, minLength = 1): string {
  const value = process.env[name];
  if (!value || value.trim().length < minLength) {
    throw new Error(
      `Environment variable ${name} is required${minLength > 1 ? ` and must be at least ${minLength} characters` : ''}.`,
    );
  }
  return value;
}

export function validateEnvironment(): void {
  requireEnv('DATABASE_URL');
  requireEnv('JWT_SECRET', 32);
  requireEnv('DEVICE_TOKEN_SECRET', 32);

  const port = process.env.PORT;
  if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
    throw new Error('PORT must be a valid TCP port.');
  }
}
