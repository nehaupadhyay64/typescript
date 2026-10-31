import 'dotenv/config';
export const config = {
  port: Number(process.env.PORT || 4000), databaseUrl: process.env.DATABASE_URL!, redisUrl: process.env.REDIS_URL || 'redis://localhost:6379', jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  localDemoEnabled: process.env.NODE_ENV !== 'production' && process.env.ENABLE_LOCAL_DEMO !== 'false',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '', googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '', googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '', frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  slackClientId: process.env.SLACK_CLIENT_ID || '', slackClientSecret: process.env.SLACK_CLIENT_SECRET || '', slackRedirectUri: process.env.SLACK_REDIRECT_URI || '',
  etherealUser: process.env.ETHEREAL_USER || '', etherealPass: process.env.ETHEREAL_PASS || '', etherealHost: process.env.ETHEREAL_HOST || 'smtp.ethereal.email', etherealPort: Number(process.env.ETHEREAL_PORT || 587),
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200', concurrency: Number(process.env.WORKER_CONCURRENCY || 5), delayMs: Number(process.env.MIN_SEND_DELAY_MS || 2000), hourlyLimit: Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || 200)
};