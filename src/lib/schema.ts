import { pgTable, serial, text, jsonb, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').unique().notNull(),
  customerName: text('customer_name').notNull(),
  orderType: text('order_type').notNull(),
  locationSlug: text('location_slug').notNull(),
  locationName: text('location_name').notNull(),
  locationAddress: text('location_address').notNull(),
  pickupTime: text('pickup_time').notNull(),
  specialRequests: text('special_requests'),
  items: jsonb('items').notNull(),
  waitPhrase: text('wait_phrase').notNull(),
  customerEmail: text('customer_email'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export const gameScores = pgTable('game_scores', {
  id: serial('id').primaryKey(),
  playerName: text('player_name'),
  score: integer('score').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type GameScore = typeof gameScores.$inferSelect;
export type NewGameScore = typeof gameScores.$inferInsert;

export const loyaltyMembers = pgTable('loyalty_members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  city: text('city').notNull(),
  preferredBurger: text('preferred_burger').notNull(),
  beefRelationship: text('beef_relationship').notNull(),
  wellDone: text('well_done').notNull(),
  tier: text('tier').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').notNull(),
  action: text('action').notNull(),
  description: text('description').notNull(),
  sauceUnits: integer('sauce_units').notNull(),
  referenceId: text('reference_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type LoyaltyMember = typeof loyaltyMembers.$inferSelect;
export type NewLoyaltyMember = typeof loyaltyMembers.$inferInsert;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type NewLoyaltyTransaction = typeof loyaltyTransactions.$inferInsert;

// Better Auth tables
export const authUser = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const authSession = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => authUser.id),
});

export const authAccount = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => authUser.id),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const authVerification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
});
