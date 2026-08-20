# FocusList

Gerenciador de tarefas pessoais e em grupo, com autenticação, convites e app Android via Capacitor.

## Stack

- **Backend:** Node.js + Express 5
- **Banco:** PostgreSQL (pg)
- **Auth:** JWT + bcrypt, com rate limiting nas rotas de login/cadastro
- **Frontend:** HTML/CSS/JS puro em `www/`, servido pelo próprio Express

## Variáveis de ambiente

| Variável       | Obrigatória | Descrição                                        |
| -------------- | ----------- | ------------------------------------------------ |
| `DATABASE_URL` | sim         | Connection string do Postgres                    |
| `JWT_SECRET`   | sim         | Chave secreta para assinar os tokens JWT         |
| `PORT`         | não         | Porta do servidor (padrão: 3000)                 |
| `NODE_ENV`     | não         | Em `production`, ativa SSL na conexão do banco   |

## Rodando localmente

```bash
npm install
export DATABASE_URL="postgres://usuario:senha@localhost:5432/focuslist"
export JWT_SECRET="uma_chave_longa_e_aleatoria"
npm start
```

O servidor sobe em `http://localhost:3000` e cria as tabelas automaticamente na primeira execução.

## Deploy (Render)

1. Crie um banco Postgres no Render e copie a `DATABASE_URL`.
2. No serviço web, configure as variáveis `DATABASE_URL` e `JWT_SECRET`.
3. Build command: `npm install` — Start command: `npm start`.

> **Importante:** gere uma `JWT_SECRET` nova e aleatória para produção
> (ex.: `openssl rand -hex 32`). Nunca commite a chave no repositório.

## Rotas da API

| Método | Rota                              | Descrição                          |
| ------ | --------------------------------- | ---------------------------------- |
| POST   | `/api/cadastrar`                  | Cria conta                         |
| POST   | `/api/login`                      | Login, retorna token JWT           |
| GET    | `/api/tarefas`                    | Lista tarefas (pessoais e grupais) |
| POST   | `/api/tarefas`                    | Cria tarefa                        |
| PUT    | `/api/tarefas/:id`                | Marca tarefa como concluída        |
| DELETE | `/api/tarefas/:id`                | Exclui tarefa                      |
| GET    | `/api/grupos`                     | Lista grupos do usuário            |
| POST   | `/api/grupos`                     | Cria grupo                         |
| GET    | `/api/grupos/:grupoId/membros`    | Lista membros                      |
| POST   | `/api/grupos/:grupoId/membros`    | Convida usuário por e-mail         |
| POST   | `/api/grupos/:grupoId/sair`       | Sai do grupo                       |
| GET    | `/api/convites`                   | Lista convites pendentes           |
| POST   | `/api/convites/:id/responder`     | Aceita (`{aceitar:true}`) ou recusa |
