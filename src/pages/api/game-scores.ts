export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { gameScores } from '../../lib/schema';
import { desc } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  try {
    const scores = await db
      .select()
      .from(gameScores)
      .orderBy(desc(gameScores.score))
      .limit(10);

    return new Response(JSON.stringify(scores), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to fetch scores' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { playerName, score, durationSeconds } = body;

    if (typeof score !== 'number' || typeof durationSeconds !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid score data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [inserted] = await db
      .insert(gameScores)
      .values({
        playerName: playerName?.trim().slice(0, 20) || 'Anonymous',
        score: Math.round(score),
        durationSeconds: Math.round(durationSeconds),
      })
      .returning();

    return new Response(JSON.stringify({ id: inserted.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to save score' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
