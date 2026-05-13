export const prerender = false;

import { auth } from '../../../lib/auth';
import type { APIRoute } from 'astro';

export const ALL: APIRoute = ({ request }) => auth.handler(request);
