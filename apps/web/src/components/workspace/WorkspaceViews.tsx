import { useState } from 'react';
import {
  Avatar, Box, Button, Card, CardContent, Chip, Divider, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { ROLE_LABELS, STATUS_LABELS, type Department, type RequestItem, type Role, type User } from './types';

export function RequestsView({ rows, role, loading, onCreate, onOpen }: {
  rows: RequestItem[]; role: Role; loading: boolean; onCreate: () => void; onOpen: (request: RequestItem) => void;
}) {
  const [query, setQuery] = useState('');
  const visible = rows.filter((row) => `${row.title} ${row.description} ${row.author.name} ${row.department?.name ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  return <Stack spacing={2}>
    <Stack className="stats-row" direction="row" spacing={2}>
      <Card className="stat-card"><CardContent><Typography color="text.secondary">Total</Typography><Typography variant="h4" fontWeight={750}>{rows.length}</Typography></CardContent></Card>
      <Card className="stat-card"><CardContent><Typography color="text.secondary">Pendentes</Typography><Typography variant="h4" fontWeight={750}>{rows.filter((row) => row.status === 'PENDING' || row.status === 'AWAITING_REVIEW').length}</Typography></CardContent></Card>
      <Card className="stat-card"><CardContent><Typography color="text.secondary">Concluídas</Typography><Typography variant="h4" fontWeight={750}>{rows.filter((row) => row.status === 'RESOLVED').length}</Typography></CardContent></Card>
    </Stack>
    <Card className="surface-card"><CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
        <Box><Typography variant="h6" fontWeight={700}>Todas as solicitações</Typography><Typography variant="body2" color="text.secondary">{role === 'USER' ? 'Acompanhe e atualize suas solicitações pendentes.' : 'Acompanhe, classifique e atualize as solicitações da equipe.'}</Typography></Box>
        <TextField size="small" placeholder="Buscar solicitações…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </Stack>
      {loading && !rows.length ? <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Carregando…</Typography> : !visible.length ? <Box className="empty-state"><AssignmentRoundedIcon /><Typography variant="h6">Nenhuma solicitação encontrada</Typography><Typography color="text.secondary">Crie a primeira solicitação para começar.</Typography><Button sx={{ mt: 2 }} variant="contained" onClick={onCreate}>Criar solicitação</Button></Box> : <Stack spacing={1.2}>
        {visible.map((row) => <button key={row.id} className="request-row" onClick={() => onOpen(row)}>
          <span className="request-icon"><AssignmentRoundedIcon /></span><span className="request-copy"><strong>{row.title}</strong><small>{row.author.name}{row.department ? ` · ${row.department.name}` : ''} · {new Date(row.createdAt).toLocaleDateString('pt-BR')}</small></span>
          <Chip className={`status-chip status-${row.status.toLowerCase()}`} size="small" label={STATUS_LABELS[row.status]} /><span className="row-arrow">›</span>
        </button>)}
      </Stack>}
    </CardContent></Card>
  </Stack>;
}

export function DepartmentsView({ rows, editable, onEdit }: { rows: Department[]; editable: boolean; onEdit: (department: Department) => void }) {
  return <Card className="surface-card"><CardContent>
    <Typography variant="h6" fontWeight={700}>Estrutura da organização</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Departamentos disponíveis para solicitações e equipes.</Typography>
    {!rows.length ? <Typography color="text.secondary">Nenhum departamento cadastrado.</Typography> : <Stack divider={<Divider flexItem />}>
      {rows.map((department) => <Stack key={department.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}><Stack direction="row" alignItems="center" spacing={1.5}><Avatar className="department-avatar"><BusinessRoundedIcon /></Avatar><Typography fontWeight={650}>{department.name}</Typography></Stack>{editable && <Button startIcon={<EditRoundedIcon />} onClick={() => onEdit(department)}>Editar</Button>}</Stack>)}
    </Stack>}
  </CardContent></Card>;
}

export function UsersView({ rows, departments, onEdit }: { rows: User[]; departments: Department[]; onEdit: (user: User) => void }) {
  const departmentName = (id: string | null) => departments.find((department) => department.id === id)?.name ?? '—';
  return <Card className="surface-card"><CardContent>
    <Typography variant="h6" fontWeight={700}>Contas e permissões</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Crie contas, altere papéis e redefina senhas. Senhas nunca são exibidas.</Typography>
    <Box sx={{ overflowX: 'auto' }}><Table size="small"><TableHead><TableRow><TableCell>Usuário</TableCell><TableCell>Departamento</TableCell><TableCell>Permissão</TableCell><TableCell align="right">Ação</TableCell></TableRow></TableHead><TableBody>
      {rows.map((row) => <TableRow key={row.id} hover><TableCell><Stack><Typography fontWeight={650}>{row.name}</Typography><Typography variant="caption" color="text.secondary">{row.email}</Typography></Stack></TableCell><TableCell>{departmentName(row.departmentId)}</TableCell><TableCell><Chip size="small" label={ROLE_LABELS[row.role]} /></TableCell><TableCell align="right"><Button startIcon={<EditRoundedIcon />} onClick={() => onEdit(row)}>Editar</Button></TableCell></TableRow>)}
      {!rows.length && <TableRow><TableCell colSpan={4} align="center">Nenhum usuário cadastrado.</TableCell></TableRow>}
    </TableBody></Table></Box>
  </CardContent></Card>;
}
