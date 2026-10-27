import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Typography, TextField } from '@mui/material';

type LoginResponse = { accessToken: string; user: { name: string; email: string; role: string } };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3004/api/v1'}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message ?? 'Falha ao entrar.');
      const session = body as LoginResponse;
      sessionStorage.setItem('automind.accessToken', session.accessToken);
      sessionStorage.setItem('automind.user', JSON.stringify(session.user));
      navigate('/requests');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível conectar à API.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-layout">
    <section className="brand-panel">
      <div className="brand-mark">A<span>.</span></div>
      <div className="brand-copy">
        <Typography variant="overline" className="eyebrow">OPERAÇÕES MAIS INTELIGENTES</Typography>
        <Typography variant="h2">Trabalho interno,<br />sem atrito.</Typography>
        <Typography className="brand-description">Um espaço claro para acompanhar solicitações e decisões da sua equipe.</Typography>
      </div>
      <Typography className="brand-footnote">AUTOMIND · SOLICITAÇÕES EMPRESARIAIS</Typography>
    </section>
    <section className="form-panel">
      <Card className="login-card" elevation={0}>
        <CardContent>
          <Chip label="PORTAL DA EQUIPE" size="small" className="welcome-chip" />
          <Typography variant="h4" className="login-title">Bem-vindo de volta</Typography>
          <Typography color="text.secondary" className="login-subtitle">Entre com suas credenciais para continuar.</Typography>
          <Box component="form" onSubmit={submit} className="login-form">
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="E-mail corporativo" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth />
            <TextField label="Senha" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required fullWidth />
            <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>{loading ? 'Entrando…' : 'Entrar na plataforma'}</Button>
          </Box>
          <Typography variant="caption" color="text.secondary" className="security-note">Acesso seguro · Autenticação protegida</Typography>
        </CardContent>
      </Card>
    </section>
  </main>;
}
