const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const getEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const parseRate = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be a number between 0 and 1`);
  }

  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: requireEnv('DB_USER'),
    password: getEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
  },
  auth: {
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
    otpSecret: process.env.OTP_SECRET ?? requireEnv('JWT_SECRET'),
  },
  smtp: {
    user: process.env.SMTP_USER ?? '',
    appPassword: process.env.SMTP_APP_PASSWORD ?? '',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? '',
  },
  billing: {
    commissionRate: parseRate('COMMISSION_RATE', 0.05),
  },
};
