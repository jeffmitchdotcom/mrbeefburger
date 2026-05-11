import { pgTable, serial, text, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';

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
