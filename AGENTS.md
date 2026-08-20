# FocusList Server

## Visão geral

API Express 5 + Postgres para o FocusList (tarefas pessoais e em grupo).
Frontend vanilla em `www/`, servido estaticamente pelo Express. App Android via Capacitor.
Todo o backend vive em `server.js` (arquivo único, organizado em seções comentadas em pt-BR).

## Comandos

- Rodar: `npm start` (exige `DATABASE_URL` e `JWT_SECRET`; `PORT` opcional, padrão 3000)
- Instalar deps: `npm install`
- Não há suíte de testes configurada.

## Convenções do projeto

- Código e comentários em português (pt-BR).
- SQL usa placeholders `?`, convertidos para `$1, $2...` pelo helper
  `converterPlaceholders` (herança da migração SQLite → Postgres). Não use `?`
  dentro de strings literais nas queries.
- Acesso ao banco sempre via helpers `executar`/`buscar`/`buscarTodos` — nunca
  concatenar valores em SQL.
- Auth: JWT (8h) via middleware `autenticar`; rotas de login/cadastro têm rate
  limit (`limiteAuth`, 20 req / 15 min por IP).
- Segredos sempre em variáveis de ambiente (ver README.md).

## Teste local

Suba um Postgres local, crie o banco e rode com as env vars. Verificação
ponta a ponta já feita: cadastro, login, tarefas, grupos, convites, rate limit
(429) e recusa de boot sem `JWT_SECRET`.
