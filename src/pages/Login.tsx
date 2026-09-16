import { useState } from 'react';
import { useAuth } from '../state/auth';
import { Button, Card, Field, Input } from '../components/ui';

export function Login() {
  const { signIn, mode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-steel-100 px-4 py-12">
      <Card className="w-full max-w-sm">
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-steel-900 text-base font-bold text-hivis-400">
              SS
            </div>
            <div>
              <h1 className="text-lg font-semibold text-steel-900">Silver S Construction</h1>
              <p className="text-xs text-steel-500">Owner sign-in</p>
            </div>
          </div>

          <Field label="Email">
            <Input
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@silversconstruction.com"
            />
          </Field>

          <Field label={mode === 'local' ? 'Passcode' : 'Password'} error={error ?? undefined}>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          {mode === 'local' ? (
            <p className="text-center text-xs text-steel-500">
              Demo mode — passcode <code className="rounded bg-steel-100 px-1">silver</code>. Set
              Supabase keys in <code className="rounded bg-steel-100 px-1">.env</code> for real
              accounts.
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
