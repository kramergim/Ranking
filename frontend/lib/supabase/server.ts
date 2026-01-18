import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createClient = () => createServerComponentClient({ cookies });

export const createRouteHandler = () => createRouteHandlerClient({ cookies });
