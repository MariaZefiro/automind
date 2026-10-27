# AutoMind

Plataforma para organizar solicitações internas, acompanhar seu andamento e registrar decisões de forma auditável. O projeto reúne uma API REST em NestJS e uma interface web em React. A classificação por IA é assistiva: sugere uma categoria e um encaminhamento, mas a decisão continua com a equipe.

## Funcionalidades

- Criação, consulta, atualização e cancelamento de solicitações, de acordo com o papel e o estado de cada solicitação.
- Cadastro e manutenção de departamentos.
- Gestão de usuários e permissões por administradores.
- Histórico de alterações associado às solicitações e auditoria de operações administrativas.
- Sugestão de classificação por IA com confiança e departamento sugerido.
- Revisão humana de classificações por REVIEWER ou ADMIN, com registro de aprovação ou correção.

## Tecnologias

- **Web:** React, TypeScript, Vite e Material UI.
- **API:** NestJS, TypeScript e validação com `class-validator`.
- **Persistência:** PostgreSQL e Prisma.
- **Autenticação:** JWT e senhas protegidas com Argon2id.
- **Classificação:** API da OpenAI, isolada atrás de uma abstração de provider no backend.

## Requisitos

- Node.js 20 ou superior.
- npm 10 ou superior.
- Docker Engine e Docker Compose.
- Chave de API OpenAI para usar a classificação por IA. A aplicação pode iniciar sem ela, mas a classificação retornará erro até que a chave seja configurada.

## Executar localmente

### 1. Configurar o ambiente

Copie o arquivo de exemplo e preencha as variáveis locais:

```bash
cp .env.example .env
```

Defina pelo menos `POSTGRES_PASSWORD` e `JWT_SECRET`. Para usar classificação por IA, configure também `OPENAI_API_KEY`. A chave é lida pela API e não deve ser compartilhada, versionada ou configurada com prefixo `VITE_`.

As variáveis do PostgreSQL em `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` devem corresponder às credenciais da `DATABASE_URL`. O Compose publica o banco na porta `5433` do host.

### 2. Instalar dependências e preparar o banco

```bash
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
```

Os comandos Prisma carregam `DATABASE_URL` do `.env` na raiz do monorepo. O Compose inicia apenas o PostgreSQL; API e web são executadas localmente.

### 3. Criar o primeiro administrador

Adicione temporariamente ao `.env`:

```dotenv
ADMIN_NAME=Nome do administrador
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=uma-senha-local-forte
```

Use uma senha com pelo menos 12 caracteres e execute:

```bash
npm run admin:create
```

O script não altera usuários existentes. Remova as três variáveis `ADMIN_*` do `.env` após a criação.

### 4. Iniciar API e interface

Em terminais separados, execute:

```bash
npm run dev:api
npm run dev:web
```

- Interface: <http://localhost:5173>
- API: <http://localhost:3004/api/v1>
- Verificação da API: <http://localhost:3004/api/v1/health>

Se a porta da API já estiver ocupada, ajuste `API_PORT` e `WEB_ORIGIN` no `.env`. Para iniciar o Vite em outra porta, passe a opção `--port` ao comando de desenvolvimento e atualize `WEB_ORIGIN` e `VITE_API_URL` para refletir as novas origens.

## Configuração

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | URL de conexão PostgreSQL usada pelo Prisma. |
| `POSTGRES_USER` | No Compose | Usuário inicial do container PostgreSQL; padrão `automind`. |
| `POSTGRES_PASSWORD` | Sim | Senha inicial do container PostgreSQL. |
| `POSTGRES_DB` | No Compose | Banco inicial do container PostgreSQL; padrão `automind`. |
| `JWT_SECRET` | Sim | Segredo usado para assinar tokens JWT. Use um valor forte e exclusivo. |
| `JWT_EXPIRES_IN` | Não | Validade do token; padrão `15m`. |
| `API_PORT` | Não | Porta da API; o código usa `3000` como fallback, enquanto o `.env.example` define `3004`. |
| `WEB_ORIGIN` | Não | Origem CORS autorizada; padrão `http://localhost:5173`. |
| `VITE_API_URL` | Não | URL base da API usada pelo frontend; padrão `http://localhost:3004/api/v1`. |
| `OPENAI_API_KEY` | Para IA | Chave privada usada exclusivamente no backend. |
| `OPENAI_MODEL` | Não | Modelo OpenAI; padrão `gpt-4o-mini`. |
| `AI_REQUEST_TIMEOUT_MS` | Não | Limite de espera pela resposta do provider; padrão `20000` ms. |

## Classificação assistiva

Na tela de detalhes de uma solicitação, use **Classificar com IA**. A API envia título, descrição e contexto de departamentos disponíveis ao provider. A resposta é validada antes de ser gravada como uma classificação com origem `AI`.

O resultado inclui categoria, prioridade, departamento sugerido, resumo, ação sugerida e confiança. O departamento só é associado se corresponder a um departamento cadastrado. A classificação fica aguardando revisão; a IA não aprova, encaminha nem executa ações externas.

Um REVIEWER ou ADMIN pode revisar sem alterar os valores ou corrigir os campos pela interface. A revisão registra o usuário e o horário, e a alteração é associada ao histórico da solicitação. A API key nunca é enviada ao navegador.

O provider atual usa a API de Chat Completions da OpenAI por `fetch` nativo. A aplicação não inclui retry automático, filas, processamento assíncrono ou integração com n8n. Se a chave estiver ausente, o provider falhar ou a resposta for inválida, a API retorna erro e não grava a classificação.

## Papéis e acesso

| Papel | Permissões principais |
| --- | --- |
| `USER` | Criar solicitações e consultar/alterar as próprias enquanto estiverem pendentes. |
| `REVIEWER` | Consultar solicitações, classificá-las manualmente ou com IA e revisar classificações. |
| `ADMIN` | Acesso de revisão, além de gerenciar usuários e departamentos. |

Não há cadastro público. Alterações de papel passam a valer imediatamente, pois a API verifica o papel atual do usuário. A última conta ADMIN não pode ser rebaixada.

## Endpoints principais

Todos os endpoints abaixo, exceto login e health check, exigem `Authorization: Bearer <token>`.

| Método | Endpoint | Acesso/descrição |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Health check. |
| `POST` | `/api/v1/auth/login` | Autenticação e emissão de JWT. |
| `GET` | `/api/v1/auth/me` | Identidade do usuário autenticado. |
| `GET` | `/api/v1/requests` | Lista as solicitações permitidas para o usuário. |
| `POST` | `/api/v1/requests` | Cria uma solicitação para o usuário autenticado. |
| `GET` | `/api/v1/requests/:id` | Consulta uma solicitação autorizada. |
| `PATCH` | `/api/v1/requests/:id` | Atualiza uma solicitação conforme papel e estado. |
| `POST` | `/api/v1/requests/:id/classify` | Solicita classificação assistiva por IA; corpo vazio. |
| `POST` | `/api/v1/requests/:id/classifications` | Cria classificação manual; REVIEWER/ADMIN. |
| `POST` | `/api/v1/requests/:id/classifications/:classificationId/review` | Aprova ou corrige uma classificação; REVIEWER/ADMIN. |
| `GET` | `/api/v1/requests/:id/history` | Consulta o histórico autorizado. |
| `GET` | `/api/v1/departments` | Lista departamentos. |
| `POST` | `/api/v1/departments` | Cria departamento; ADMIN. |
| `PATCH` | `/api/v1/departments/:id` | Renomeia departamento; ADMIN. |
| `GET`, `POST` | `/api/v1/users` | Lista ou cria usuários; ADMIN. |
| `PATCH` | `/api/v1/users/:id` | Atualiza usuário; ADMIN. |

Exemplo de chamada para classificar uma solicitação existente:

```http
POST /api/v1/requests/00000000-0000-4000-8000-000000000001/classify
Authorization: Bearer <token>
```

A resposta contém a classificação persistida, incluindo `source: "AI"`, `confidence` e o departamento associado, quando resolvido. Erros seguem o envelope padrão da API com `statusCode`, `message`, `error` e `timestamp`.

## Comandos úteis

| Comando | Descrição |
| --- | --- |
| `npm run dev:api` | Inicia a API em modo de desenvolvimento. |
| `npm run dev:web` | Inicia a interface Vite. |
| `npm run build` | Compila API e frontend. |
| `npm test` | Executa os testes unitários da API. |
| `npm run test:e2e -w @automind/api` | Executa os testes HTTP e2e existentes. |
| `npm run db:generate` | Gera o cliente Prisma. |
| `npm run db:migrate` | Aplica migrations locais. |
| `docker compose ps` | Verifica o estado do PostgreSQL. |

Os testes unitários de classificação usam mocks e não chamam a OpenAI. Os testes e2e atuais cobrem health check e validação de login; ainda não cobrem o fluxo completo de classificação com banco de dados.

## Estrutura do repositório

```text
apps/
	api/
		prisma/       schema e migrations
		src/
			ai/         abstração e provider de classificação
			auth/       login, JWT e autorização por papel
			requests/   solicitações, classificação e histórico
			users/      usuários e permissões
			departments/ departamentos
	web/
		src/
			components/ telas e componentes React
			lib/        cliente HTTP
			styles/     estilos da interface
docker-compose.yml
```

## Próximas melhorias

1. Adicionar testes e2e do ciclo completo, com PostgreSQL de teste e provider substituído por mock.
2. Preservar snapshots imutáveis da sugestão original e das correções humanas, com trilha de auditoria completa.
3. Melhorar o tratamento de concorrência na revisão para impedir revisões duplicadas simultâneas.
4. Definir políticas de retenção e privacidade para conteúdo enviado ao provider externo.
5. Avaliar rate limit e proteção contra uso excessivo do endpoint de classificação.
6. Adicionar logs e métricas de latência, falhas, volume e correções, sem registrar segredos ou conteúdo sensível.
7. Considerar processamento em fila e retries controlados se o volume justificar.
8. Avaliar integração com n8n somente quando houver necessidade, com autenticação máquina-a-máquina e permissões restritas.

## Segurança

Não versione `.env`, credenciais, tokens ou chaves de API. Em ambientes publicados, use HTTPS, segredos gerenciados e uma política apropriada de armazenamento de tokens no cliente. O resultado da IA é uma sugestão e deve ser revisado por uma pessoa autorizada antes de qualquer decisão operacional.