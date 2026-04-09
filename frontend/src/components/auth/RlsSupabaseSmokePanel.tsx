import { useState } from 'react';
import { POC_SEED_RULESET_ID, supabase, supabaseTables } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type StepStatus = 'idle' | 'running' | 'ok' | 'error';

/**
 * Task 4.4: after sign-in, inserts a `characters` row (RLS: own `user_id` only), reads it back, then deletes it.
 * Requires local DB seed (`POC_SEED_RULESET_ID`) and a `public.users` row (auth trigger).
 */
export function RlsSupabaseSmokePanel() {
  const [status, setStatus] = useState<StepStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function runCheck() {
    setStatus('running');
    setMessage(null);
    try {
      const { data: appUser, error: userErr } = await supabase
        .from(supabaseTables.users)
        .select('id')
        .maybeSingle();

      if (userErr) {
        throw userErr;
      }
      if (!appUser?.id) {
        throw new Error(
          'No app user row found. After sign-up, `public.users` should sync via trigger — try again in a moment.'
        );
      }

      const testName = `RLS smoke ${new Date().toISOString().slice(11, 19)}`;

      const { data: inserted, error: insertErr } = await supabase
        .from(supabaseTables.characters)
        .insert({
          user_id: appUser.id,
          ruleset_id: POC_SEED_RULESET_ID,
          name: testName,
          character_data: { source: 'rls_smoke_panel' },
        })
        .select('id, name')
        .single();

      if (insertErr) {
        throw insertErr;
      }

      const { data: roundTrip, error: selectErr } = await supabase
        .from(supabaseTables.characters)
        .select('id, name')
        .eq('id', inserted.id)
        .single();

      if (selectErr) {
        throw selectErr;
      }

      const { error: deleteErr } = await supabase
        .from(supabaseTables.characters)
        .delete()
        .eq('id', inserted.id);

      if (deleteErr) {
        throw deleteErr;
      }

      setMessage(
        `Insert + select + delete succeeded (name: "${roundTrip.name}"). RLS allowed only your row.`
      );
      setStatus('ok');
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : String(e);
      setMessage(text);
      setStatus('error');
    }
  }

  return (
    <section
      className="rounded-lg border border-border bg-card/40 p-4 ring-1 ring-border/50"
      aria-labelledby="rls-smoke-heading"
    >
      <h2
        id="rls-smoke-heading"
        className="text-sm font-semibold text-foreground"
      >
        Supabase RLS check
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Inserts a temporary character tied to your user, reads it, then removes
        it. Uses the seeded POC ruleset ID (local `supabase db reset` + seed).
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={status === 'running'}
          onClick={() => void runCheck()}
        >
          {status === 'running' ? 'Running…' : 'Run read / write test'}
        </Button>
        {status === 'ok' ? (
          <span className="text-xs text-chart-3">Success</span>
        ) : null}
        {status === 'error' ? (
          <span className="text-xs text-destructive">Failed</span>
        ) : null}
      </div>
      {message ? (
        <p
          className={`mt-3 text-sm ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
