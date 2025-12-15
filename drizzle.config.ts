import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/drizzle-schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./results/eval.db',
  },
} satisfies Config
