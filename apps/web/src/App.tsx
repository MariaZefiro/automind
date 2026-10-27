import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, InputLabel, MenuItem, Select, Snackbar,
  Stack, TextField, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import LoginPage from './components/auth/LoginPage';
import { DepartmentsView, RequestsView, UsersView } from './components/workspace/WorkspaceViews';
import { ROLE_LABELS, STATUS_LABELS, type Classification, type Department, type RequestItem, type Role, type Status, type User } from './components/workspace/types';
import { api } from './lib/api';

function storedUser() {
  try { return JSON.parse(sessionStorage.getItem('automind.user') ?? '{}') as { id?: string; name?: string; email?: string; role?: Role }; }
  catch { return {}; }
}

function Workspace() {
  const token = sessionStorage.getItem('automind.accessToken');
  const accessToken = token ?? '';
  const user = storedUser();
  const role = user.role ?? 'USER';
  const [tab, setTab] = useState<'requests' | 'departments' | 'users'>('requests');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestDialog, setRequestDialog] = useState<RequestItem | 'new' | null>(null);
  const [departmentDialog, setDepartmentDialog] = useState<Department | 'new' | null>(null);
  const [userDialog, setUserDialog] = useState<User | 'new' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const isAdmin = role === 'ADMIN';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [requestRows, departmentRows] = await Promise.all([
        api<RequestItem[]>(accessToken, '/requests'), api<Department[]>(accessToken, '/departments'),
      ]);
      setRequests(requestRows);
      setDepartments(departmentRows);
      if (isAdmin) setUsers(await api<User[]>(accessToken, '/users'));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os dados.');
    } finally { setLoading(false); }
  }, [accessToken, isAdmin]);

  useEffect(() => { if (token) void refresh(); }, [refresh, token]);

  async function saveRequest(values: Record<string, unknown>) {
    const target = requestDialog && requestDialog !== 'new' ? requestDialog : null;
    const editing = target !== null;
    await api(accessToken, editing ? `/requests/${target.id}` : '/requests', {
      method: editing ? 'PATCH' : 'POST', body: JSON.stringify(values),
    });
    setRequestDialog(null); setNotice(editing ? 'Solicitação atualizada.' : 'Solicitação criada.'); await refresh();
  }

  async function saveDepartment(values: Record<string, unknown>) {
    const target = departmentDialog && departmentDialog !== 'new' ? departmentDialog : null;
    const editing = target !== null;
    await api(accessToken, editing ? `/departments/${target.id}` : '/departments', {
      method: editing ? 'PATCH' : 'POST', body: JSON.stringify(values),
    });
    setDepartmentDialog(null); setNotice(editing ? 'Departamento atualizado.' : 'Departamento criado.'); await refresh();
  }

  async function saveUser(values: Record<string, unknown>) {
    const target = userDialog && userDialog !== 'new' ? userDialog : null;
    const editing = target !== null;
    await api(accessToken, editing ? `/users/${target.id}` : '/users', {
      method: editing ? 'PATCH' : 'POST', body: JSON.stringify(values),
    });
    const changedOwnRole = editing && target.id === user.id && values.role !== user.role;
    setUserDialog(null); setNotice(editing ? 'Usuário atualizado.' : 'Usuário criado.'); await refresh();
    if (changedOwnRole) { sessionStorage.clear(); window.location.assign('/login'); }
  }

  const contentTitle = tab === 'requests' ? 'Solicitações' : tab === 'departments' ? 'Departamentos' : 'Usuários e permissões';
  if (!token) return <Navigate to="/login" replace />;
  return <Box className="workspace-shell">
    <aside className="workspace-sidebar">
      <div className="sidebar-brand"><span className="brand-mark">A<span>.</span></span><Typography variant="caption">AUTOMIND</Typography></div>
      <Typography className="sidebar-section" variant="overline">ÁREA DE TRABALHO</Typography>
      <Button className={tab === 'requests' ? 'nav-item active' : 'nav-item'} startIcon={<AssignmentRoundedIcon />} onClick={() => setTab('requests')}>Solicitações</Button>
      <Button className={tab === 'departments' ? 'nav-item active' : 'nav-item'} startIcon={<BusinessRoundedIcon />} onClick={() => setTab('departments')}>Departamentos</Button>
      {isAdmin && <Button className={tab === 'users' ? 'nav-item active' : 'nav-item'} startIcon={<GroupRoundedIcon />} onClick={() => setTab('users')}>Usuários e permissões</Button>}
      <Box className="sidebar-account"><Avatar>{(user.name ?? 'U').charAt(0).toUpperCase()}</Avatar><Box sx={{ minWidth: 0 }}><Typography noWrap fontWeight={700}>{user.name ?? 'Usuário'}</Typography><Typography variant="caption" color="text.secondary">{ROLE_LABELS[role]}</Typography></Box></Box>
    </aside>
    <Box component="main" className="workspace-main">
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack className="page-heading" direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box><Typography variant="overline" color="primary" fontWeight={700}>PAINEL DE OPERAÇÕES</Typography><Typography variant="h4" fontWeight={750}>{contentTitle}</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>Olá, {user.name ?? 'equipe'}. Gerencie o trabalho da sua organização.</Typography></Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void refresh()} disabled={loading}>Atualizar</Button>
            {(tab === 'requests' || isAdmin) && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => tab === 'requests' ? setRequestDialog('new') : tab === 'users' ? setUserDialog('new') : setDepartmentDialog('new')}>{tab === 'requests' ? 'Nova solicitação' : tab === 'users' ? 'Novo usuário' : 'Novo departamento'}</Button>}
            <Button onClick={() => { sessionStorage.clear(); window.location.assign('/login'); }}>Sair</Button>
          </Stack>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError('')}>{error}</Alert>}
        <Box className="workspace-content">
          {tab === 'requests' && <RequestsView rows={requests} role={role} loading={loading} onCreate={() => setRequestDialog('new')} onOpen={setSelectedRequest} />}
          {tab === 'departments' && <DepartmentsView rows={departments} editable={isAdmin} onEdit={setDepartmentDialog} />}
          {tab === 'users' && isAdmin && <UsersView rows={users} departments={departments} onEdit={setUserDialog} />}
        </Box>
      </Container>
    </Box>
    <RequestDialog open={requestDialog !== null} request={requestDialog !== 'new' ? requestDialog : null} departments={departments} role={role} onClose={() => setRequestDialog(null)} onSave={saveRequest} />
    <DepartmentDialog open={departmentDialog !== null} department={departmentDialog !== 'new' ? departmentDialog : null} onClose={() => setDepartmentDialog(null)} onSave={saveDepartment} />
    <UserDialog open={userDialog !== null} user={userDialog !== 'new' ? userDialog : null} departments={departments} onClose={() => setUserDialog(null)} onSave={saveUser} />
    <RequestDetailDialog request={selectedRequest} token={accessToken} role={role} departments={departments} onClose={() => setSelectedRequest(null)} onEdit={(item) => { setSelectedRequest(null); setRequestDialog(item); }} onChanged={async () => {
      await refresh();
      if (selectedRequest) setSelectedRequest(await api<RequestItem>(accessToken, `/requests/${selectedRequest.id}`));
    }} />
    <Snackbar open={Boolean(notice)} autoHideDuration={3500} onClose={() => setNotice('')} message={notice} />
  </Box>;
}

function RequestDialog({ open, request, departments, role, onClose, onSave }: {
  open: boolean; request: RequestItem | null; departments: Department[]; role: Role; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(''); const [status, setStatus] = useState<Status>('PENDING');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { setTitle(request?.title ?? ''); setDescription(request?.description ?? ''); setDepartmentId(request?.departmentId ?? ''); setStatus(request?.status ?? 'PENDING'); setError(''); }, [request, open]);
  const canChangeStatus = role === 'ADMIN' || role === 'REVIEWER';
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const values: Record<string, unknown> = { title, description, departmentId: departmentId || null };
      if (request && canChangeStatus && status !== request.status) values.status = status;
      await onSave(values);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><Box component="form" onSubmit={submit}><DialogTitle>{request ? 'Editar solicitação' : 'Nova solicitação'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
    {error && <Alert severity="error">{error}</Alert>}
    <TextField label="Título" value={title} onChange={(event) => setTitle(event.target.value)} required inputProps={{ minLength: 4, maxLength: 160 }} />
    <TextField label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} required multiline minRows={4} inputProps={{ minLength: 10, maxLength: 10000 }} />
    <FormControl><InputLabel>Departamento</InputLabel><Select label="Departamento" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><MenuItem value="">Sem departamento</MenuItem>{departments.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</Select></FormControl>
    {request && canChangeStatus && <FormControl><InputLabel>Status</InputLabel><Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as Status)}>{Object.entries(STATUS_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl>}
  </Stack></DialogContent><DialogActions><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button></DialogActions></Box></Dialog>;
}

function DepartmentDialog({ open, department, onClose, onSave }: {
  open: boolean; department: Department | null; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { setName(department?.name ?? ''); setError(''); }, [department, open]);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(''); try { await onSave({ name }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar.'); } finally { setSaving(false); } }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><Box component="form" onSubmit={submit}><DialogTitle>{department ? 'Editar departamento' : 'Novo departamento'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{error && <Alert severity="error">{error}</Alert>}<TextField label="Nome do departamento" value={name} onChange={(event) => setName(event.target.value)} required inputProps={{ minLength: 2, maxLength: 100 }} /></Stack></DialogContent><DialogActions><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>Salvar</Button></DialogActions></Box></Dialog>;
}

function UserDialog({ open, user, departments, onClose, onSave }: {
  open: boolean; user: User | null; departments: Department[]; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('USER'); const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { setName(user?.name ?? ''); setEmail(user?.email ?? ''); setPassword(''); setRole(user?.role ?? 'USER'); setDepartmentId(user?.departmentId ?? ''); setError(''); }, [user, open]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    const values: Record<string, unknown> = { name, email, role, departmentId: departmentId || null };
    if (password) values.password = password;
    try { await onSave(values); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><Box component="form" onSubmit={submit}><DialogTitle>{user ? 'Editar usuário e permissões' : 'Criar usuário'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
    {error && <Alert severity="error">{error}</Alert>}<TextField label="Nome" value={name} onChange={(event) => setName(event.target.value)} required inputProps={{ minLength: 2, maxLength: 100 }} />
    <TextField label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
    <TextField label={user ? 'Nova senha (opcional)' : 'Senha inicial'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required={!user} helperText="Use pelo menos 12 caracteres. A senha não é exibida depois de salva." inputProps={{ minLength: 12, maxLength: 128 }} />
    <FormControl><InputLabel>Permissão</InputLabel><Select label="Permissão" value={role} onChange={(event) => setRole(event.target.value as Role)}>{Object.entries(ROLE_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl>
    <FormControl><InputLabel>Departamento</InputLabel><Select label="Departamento" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><MenuItem value="">Sem departamento</MenuItem>{departments.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</Select></FormControl>
  </Stack></DialogContent><DialogActions><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Salvando…' : 'Salvar usuário'}</Button></DialogActions></Box></Dialog>;
}

function RequestDetailDialog({ request, token, role, departments, onClose, onEdit, onChanged }: {
  request: RequestItem | null; token: string; role: Role; departments: Department[]; onClose: () => void;
  onEdit: (request: RequestItem) => void; onChanged: () => Promise<void>;
}) {
  const user = storedUser();
  const [history, setHistory] = useState<Array<{ action: string; description: string; createdAt: string; metadata?: { classificationId?: string; corrected?: boolean } | null }>>([]);
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Classification | null>(null);
  const [error, setError] = useState('');
  const [classifying, setClassifying] = useState(false);
  const canReview = role === 'ADMIN' || role === 'REVIEWER';
  const canEdit = Boolean(request && (canReview || (request.authorId === user.id && request.status === 'PENDING')));
  useEffect(() => {
    if (!request) return;
    setError('');
    void api<typeof history>(token, `/requests/${request.id}/history`).then(setHistory).catch((cause) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar o histórico.'));
  }, [request, token]);
  async function classify() {
    if (!request) return;
    setClassifying(true);
    setError('');
    try {
      await api<Classification>(token, `/requests/${request.id}/classify`, { method: 'POST' });
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível classificar com IA. Tente novamente.');
    } finally {
      setClassifying(false);
    }
  }
  async function cancel() {
    if (!request) return;
    try { await api(token, `/requests/${request.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) }); await onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível cancelar.'); }
  }
  return <>
    <Dialog open={Boolean(request)} onClose={onClose} fullWidth maxWidth="md"><DialogTitle>{request?.title}</DialogTitle><DialogContent>
      {request && <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" flexWrap="wrap" gap={1}><Chip label={STATUS_LABELS[request.status]} /><Chip variant="outlined" label={request.department?.name ?? 'Sem departamento'} /><Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>Criada por {request.author.name} · {new Date(request.createdAt).toLocaleString('pt-BR')}</Typography></Stack>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{request.description}</Typography>
        <Divider />
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h6">Classificações e revisões</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => void classify()} disabled={classifying}>
              {classifying ? 'Classificando…' : 'Classificar com IA'}
            </Button>
            {canReview && <Button startIcon={<AddRoundedIcon />} variant="outlined" onClick={() => setClassificationOpen(true)}>Classificar manualmente</Button>}
          </Stack>
        </Stack>
        {!request.classifications.length && <Typography color="text.secondary">Ainda não há classificações.</Typography>}
        {request.classifications.map((classification) => <Card key={classification.id} variant="outlined"><CardContent><Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
            <Typography fontWeight={700}>{classification.category} · {classification.priority}</Typography>
            <Stack direction="row" spacing={1}>
              <Chip size="small" color={classification.source === 'AI' ? 'info' : 'default'} label={classification.source === 'AI' ? 'Gerada por IA' : 'Manual'} />
              {classification.reviewedAt && <Chip size="small" color="success" label={`Revisada por ${classification.reviewedBy?.name ?? 'equipe'}`} />}
              {classification.reviewedAt && history.some((entry) => entry.action === 'CLASSIFICATION_REVIEWED' && entry.metadata?.classificationId === classification.id && entry.metadata.corrected) && <Chip size="small" color="warning" label="Corrigida por humano" />}
            </Stack>
          </Stack>
          <Typography><strong>Resumo:</strong> {classification.summary}</Typography>
          <Typography variant="body2" color="text.secondary"><strong>Ação sugerida:</strong> {classification.suggestedAction}</Typography>
          <Typography variant="body2" color="text.secondary"><strong>Departamento sugerido:</strong> {classification.suggestedDepartment?.name ?? 'Nenhum'}</Typography>
          {classification.confidence !== null && classification.confidence !== undefined && <Typography variant="caption" color="text.secondary">Confiança: {(classification.confidence * 100).toFixed(0)}%</Typography>}
          {!classification.reviewedAt && canReview && <Box><Button size="small" variant="contained" onClick={() => setReviewTarget(classification)}>Revisar / corrigir</Button></Box>}
        </Stack></CardContent></Card>)}
        <Divider /><Typography variant="h6">Histórico</Typography>
        {history.length ? history.map((entry, index) => <Stack key={`${entry.createdAt}-${index}`} direction="row" justifyContent="space-between" gap={2}><Typography variant="body2">{entry.description}</Typography><Typography variant="caption" color="text.secondary" whiteSpace="nowrap">{new Date(entry.createdAt).toLocaleString('pt-BR')}</Typography></Stack>) : <Typography variant="body2" color="text.secondary">Nenhuma alteração registrada.</Typography>}
      </Stack>}
    </DialogContent><DialogActions>
      {request && request.status === 'PENDING' && role === 'USER' && request.authorId === user.id && <Button color="error" onClick={() => void cancel()}>Cancelar solicitação</Button>}
      {request && canEdit && <Button startIcon={<EditRoundedIcon />} onClick={() => onEdit(request)}>Editar</Button>}
      <Button onClick={onClose}>Fechar</Button>
    </DialogActions></Dialog>
    <ClassificationDialog open={classificationOpen} request={request} token={token} departments={departments} onClose={() => setClassificationOpen(false)} onSaved={onChanged} />
    <ReviewClassificationDialog open={Boolean(reviewTarget)} request={request} classification={reviewTarget} token={token} departments={departments} onClose={() => setReviewTarget(null)} onSaved={onChanged} />
  </>;
}

function ReviewClassificationDialog({ open, request, classification, token, departments, onClose, onSaved }: {
  open: boolean; request: RequestItem | null; classification: Classification | null; token: string;
  departments: Department[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState('MEDIUM');
  const [summary, setSummary] = useState('');
  const [suggestedAction, setSuggestedAction] = useState('');
  const [suggestedDepartmentId, setSuggestedDepartmentId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setCategory(classification?.category ?? 'OTHER');
    setPriority(classification?.priority ?? 'MEDIUM');
    setSummary(classification?.summary ?? '');
    setSuggestedAction(classification?.suggestedAction ?? '');
    setSuggestedDepartmentId(classification?.suggestedDepartment?.id ?? '');
    setError('');
  }, [classification, open]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!request || !classification) return;
    setSaving(true);
    setError('');
    try {
      await api(token, `/requests/${request.id}/classifications/${classification.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ category, priority, summary, suggestedAction, suggestedDepartmentId: suggestedDepartmentId || null }),
      });
      onClose();
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a revisão.');
    } finally {
      setSaving(false);
    }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <Box component="form" onSubmit={submit}>
      <DialogTitle>Revisar classificação</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Typography variant="body2" color="text.secondary">Aprovar sem alterações ou corrigir os campos. A revisão será registrada no histórico.</Typography>
        <FormControl><InputLabel>Categoria</InputLabel><Select label="Categoria" value={category} onChange={(event) => setCategory(event.target.value)}>{['ACCESS', 'HARDWARE', 'SOFTWARE', 'INFRASTRUCTURE', 'FINANCE', 'HUMAN_RESOURCES', 'OTHER'].map((value) => <MenuItem key={value} value={value}>{value.replaceAll('_', ' ')}</MenuItem>)}</Select></FormControl>
        <FormControl><InputLabel>Prioridade</InputLabel><Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value)}>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
        <TextField label="Resumo" value={summary} onChange={(event) => setSummary(event.target.value)} required multiline minRows={2} inputProps={{ minLength: 3, maxLength: 1000 }} />
        <TextField label="Ação sugerida" value={suggestedAction} onChange={(event) => setSuggestedAction(event.target.value)} required multiline minRows={2} inputProps={{ minLength: 3, maxLength: 2000 }} />
        <FormControl><InputLabel>Departamento sugerido</InputLabel><Select label="Departamento sugerido" value={suggestedDepartmentId} onChange={(event) => setSuggestedDepartmentId(event.target.value)}><MenuItem value="">Nenhum</MenuItem>{departments.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</Select></FormControl>
      </Stack></DialogContent>
      <DialogActions><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Salvando…' : 'Aprovar revisão'}</Button></DialogActions>
    </Box>
  </Dialog>;
}

function ClassificationDialog({ open, request, token, departments, onClose, onSaved }: {
  open: boolean; request: RequestItem | null; token: string; departments: Department[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [category, setCategory] = useState('OTHER'); const [priority, setPriority] = useState('MEDIUM');
  const [summary, setSummary] = useState(''); const [suggestedAction, setSuggestedAction] = useState('');
  const [suggestedDepartmentId, setSuggestedDepartmentId] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { setCategory('OTHER'); setPriority('MEDIUM'); setSummary(''); setSuggestedAction(''); setSuggestedDepartmentId(''); setError(''); }, [open, request]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!request) return; setSaving(true); setError('');
    try {
      await api(token, `/requests/${request.id}/classifications`, { method: 'POST', body: JSON.stringify({ category, priority, summary, suggestedAction, suggestedDepartmentId: suggestedDepartmentId || undefined }) });
      onClose(); await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar classificação.'); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><Box component="form" onSubmit={submit}><DialogTitle>Classificação manual</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
    {error && <Alert severity="error">{error}</Alert>}
    <FormControl><InputLabel>Categoria</InputLabel><Select label="Categoria" value={category} onChange={(event) => setCategory(event.target.value)}>{['ACCESS', 'HARDWARE', 'SOFTWARE', 'INFRASTRUCTURE', 'FINANCE', 'HUMAN_RESOURCES', 'OTHER'].map((value) => <MenuItem key={value} value={value}>{value.replaceAll('_', ' ')}</MenuItem>)}</Select></FormControl>
    <FormControl><InputLabel>Prioridade</InputLabel><Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value)}>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
    <TextField label="Resumo" value={summary} onChange={(event) => setSummary(event.target.value)} required multiline minRows={2} inputProps={{ minLength: 3, maxLength: 1000 }} />
    <TextField label="Ação sugerida" value={suggestedAction} onChange={(event) => setSuggestedAction(event.target.value)} required multiline minRows={2} inputProps={{ minLength: 3, maxLength: 2000 }} />
    <FormControl><InputLabel>Departamento sugerido</InputLabel><Select label="Departamento sugerido" value={suggestedDepartmentId} onChange={(event) => setSuggestedDepartmentId(event.target.value)}><MenuItem value="">Nenhum</MenuItem>{departments.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</Select></FormControl>
    <Typography variant="caption" color="text.secondary">A classificação é manual e só pode aprovar/encaminhar após revisão humana.</Typography>
  </Stack></DialogContent><DialogActions><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>Registrar classificação</Button></DialogActions></Box></Dialog>;
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/requests" element={<Workspace />} />
    <Route path="*" element={<Navigate to={sessionStorage.getItem('automind.accessToken') ? '/requests' : '/login'} replace />} />
  </Routes>;
}
