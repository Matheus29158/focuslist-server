const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const { rateLimit } = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 3000;

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  console.error(
    "Defina a variável de ambiente JWT_SECRET antes de iniciar o servidor.",
  );

  process.exit(1);
}

/* ======================================================
   CONFIGURAÇÃO
====================================================== */

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "www")));

// Protege as rotas de autenticação contra força bruta.
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 20,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    erro: "Muitas tentativas. Tente novamente em alguns minutos.",
  },
});

/* ======================================================
   BANCO
====================================================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // O Postgres do Render exige SSL em conexões externas.
  // Em conexões internas (mesmo ambiente Render) também funciona com isso ativado.
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do Postgres:", err.message);
});

pool
  .query("SELECT 1")
  .then(() => console.log("Conectado ao banco Postgres"))
  .catch((err) => {
    console.error("Erro ao conectar no banco:", err.message);

    process.exit(1);
  });

/* ======================================================
   PROMISES POSTGRES
   (mantém a mesma assinatura usada no resto do arquivo,
   convertendo os placeholders "?" do SQLite para "$1, $2..."
   usados pelo pg)
====================================================== */

function converterPlaceholders(sql) {
  let indice = 0;

  return sql.replace(/\?/g, () => `$${++indice}`);
}

async function executar(sql, parametros = []) {
  const resultado = await pool.query(converterPlaceholders(sql), parametros);

  return resultado;
}

async function buscar(sql, parametros = []) {
  const resultado = await pool.query(converterPlaceholders(sql), parametros);

  return resultado.rows[0] || null;
}

async function buscarTodos(sql, parametros = []) {
  const resultado = await pool.query(converterPlaceholders(sql), parametros);

  return resultado.rows;
}

/* ======================================================
   TABELAS
====================================================== */

async function criarTabelas() {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (

        id SERIAL PRIMARY KEY,

        nome TEXT,

        email TEXT UNIQUE NOT NULL,

        senha TEXT NOT NULL

      )
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS grupos (

        id SERIAL PRIMARY KEY,

        nome TEXT NOT NULL,

        criador_id INTEGER NOT NULL

      )
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS grupo_membros (

        grupo_id INTEGER NOT NULL,

        usuario_id INTEGER NOT NULL,

        PRIMARY KEY (
          grupo_id,
          usuario_id
        )

      )
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS tarefas (

        id SERIAL PRIMARY KEY,

        usuario_id INTEGER NOT NULL,

        texto TEXT NOT NULL,

        data TEXT,

        concluida INTEGER DEFAULT 0,

        grupo_id INTEGER

      )
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS convites (

        id SERIAL PRIMARY KEY,

        grupo_id INTEGER NOT NULL,

        usuario_id INTEGER NOT NULL,

        convidado_por INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'pendente'

      )
    `);

  console.log("Tabelas verificadas/criadas com sucesso.");
}

criarTabelas().catch((err) => {
  console.error("Erro ao criar tabelas:", err.message);

  process.exit(1);
});

/* ======================================================
   AUTENTICAÇÃO
====================================================== */

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || "";

  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      erro: "Não autenticado.",
    });
  }

  try {
    req.usuario = jwt.verify(token, SECRET_KEY);

    next();
  } catch {
    return res.status(401).json({
      erro: "Token inválido ou expirado.",
    });
  }
}

/* ======================================================
   CADASTRO
====================================================== */

app.post("/api/cadastrar", limiteAuth, async (req, res) => {
  const nome = String(req.body.nome || "").trim();

  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();

  const senha = String(req.body.senha || "");

  if (!nome || !email || !senha) {
    return res.status(400).json({
      erro: "Preencha nome, e-mail e senha.",
    });
  }

  try {
    const hash = await bcrypt.hash(senha, 10);

    await executar(
      `
        INSERT INTO usuarios
          (
            nome,
            email,
            senha
          )

        VALUES
          (?, ?, ?)
        `,
      [nome, email, hash],
    );

    res.status(201).json({
      mensagem: "Cadastro realizado com sucesso.",
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({
        erro: "E-mail já cadastrado.",
      });
    }

    console.error(err);

    res.status(500).json({
      erro: "Erro interno no servidor.",
    });
  }
});

/* ======================================================
   LOGIN
====================================================== */

app.post("/api/login", limiteAuth, async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();

  const senha = String(req.body.senha || "");

  if (!email || !senha) {
    return res.status(400).json({
      erro: "Informe e-mail e senha.",
    });
  }

  try {
    const usuario = await buscar(
      `
          SELECT *

          FROM usuarios

          WHERE email = ?

          LIMIT 1
          `,
      [email],
    );

    // Mensagem única para não revelar se o e-mail existe ou não.
    if (!usuario) {
      return res.status(400).json({
        erro: "E-mail ou senha incorretos.",
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(400).json({
        erro: "E-mail ou senha incorretos.",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,

        email: usuario.email,
      },

      SECRET_KEY,

      {
        expiresIn: "8h",
      },
    );

    res.json({
      token,

      nome: usuario.nome || usuario.email,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro interno no servidor.",
    });
  }
});

/* ======================================================
   GRUPOS
====================================================== */

app.get("/api/grupos", autenticar, async (req, res) => {
  try {
    const grupos = await buscarTodos(
      `
          SELECT

            g.id,

            g.nome,

            g.criador_id,

            (

              SELECT COUNT(*)

              FROM grupo_membros gm2

              WHERE
                gm2.grupo_id =
                g.id

            ) AS total_membros

          FROM grupos g

          LEFT JOIN grupo_membros gm

            ON gm.grupo_id =
               g.id

          WHERE

            g.criador_id = ?

            OR

            gm.usuario_id = ?

          GROUP BY

            g.id

          ORDER BY

            g.nome ASC
          `,
      [req.usuario.id, req.usuario.id],
    );

    res.json(grupos);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao carregar grupos.",
    });
  }
});

/* ======================================================
   CRIAR GRUPO
====================================================== */

app.post("/api/grupos", autenticar, async (req, res) => {
  const nome = String(req.body.nome || "").trim();

  if (!nome) {
    return res.status(400).json({
      erro: "Digite o nome do grupo.",
    });
  }

  try {
    const resultado = await executar(
      `
          INSERT INTO grupos

            (
              nome,
              criador_id
            )

          VALUES

            (
              ?,
              ?
            )

          RETURNING id
          `,
      [nome, req.usuario.id],
    );

    const grupoId = resultado.rows[0].id;

    await executar(
      `
        INSERT INTO
          grupo_membros

          (
            grupo_id,
            usuario_id
          )

        VALUES

          (
            ?,
            ?
          )

        ON CONFLICT (grupo_id, usuario_id) DO NOTHING
        `,
      [grupoId, req.usuario.id],
    );

    res.status(201).json({
      id: grupoId,

      nome,

      criador_id: req.usuario.id,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao criar grupo.",
    });
  }
});

/* ======================================================
   LISTAR MEMBROS
====================================================== */

app.get("/api/grupos/:grupoId/membros", autenticar, async (req, res) => {
  const grupoId = Number(req.params.grupoId);

  try {
    const autorizado = await buscar(
      `
          SELECT
            g.id

          FROM grupos g

          LEFT JOIN grupo_membros gm

            ON gm.grupo_id =
               g.id

          WHERE

            g.id = ?

            AND

            (
              g.criador_id = ?

              OR

              gm.usuario_id = ?
            )

          LIMIT 1
          `,
      [grupoId, req.usuario.id, req.usuario.id],
    );

    if (!autorizado) {
      return res.status(403).json({
        erro: "Você não pertence a este grupo.",
      });
    }

    const membros = await buscarTodos(
      `
          SELECT

            u.id,

            u.nome,

            u.email

          FROM grupo_membros gm

          INNER JOIN usuarios u

            ON u.id =
               gm.usuario_id

          WHERE

            gm.grupo_id = ?

          ORDER BY

            u.nome ASC
          `,
      [grupoId],
    );

    res.json(membros);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao carregar membros.",
    });
  }
});

/* ======================================================
   ADICIONAR MEMBRO
====================================================== */

app.post("/api/grupos/:grupoId/membros", autenticar, async (req, res) => {
  const grupoId = Number(req.params.grupoId);

  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();

  if (!grupoId || !email) {
    return res.status(400).json({
      erro: "Grupo e e-mail são obrigatórios.",
    });
  }

  try {
    const grupo = await buscar(
      `
          SELECT *

          FROM grupos

          WHERE id = ?

          LIMIT 1
          `,
      [grupoId],
    );

    if (!grupo) {
      return res.status(404).json({
        erro: "Grupo não encontrado.",
      });
    }

    if (Number(grupo.criador_id) !== Number(req.usuario.id)) {
      return res.status(403).json({
        erro: "Somente o criador do grupo pode adicionar membros.",
      });
    }

    const usuario = await buscar(
      `
          SELECT

            id,

            nome,

            email

          FROM usuarios

          WHERE email = ?

          LIMIT 1
          `,
      [email],
    );

    if (!usuario) {
      return res.status(404).json({
        erro: "Não existe um usuário cadastrado com esse e-mail.",
      });
    }

    if (Number(usuario.id) === Number(req.usuario.id)) {
      return res.status(400).json({
        erro: "Você já faz parte deste grupo.",
      });
    }

    const jaMembro = await buscar(
      `
          SELECT 1

          FROM grupo_membros

          WHERE grupo_id = ? AND usuario_id = ?

          LIMIT 1
          `,
      [grupoId, usuario.id],
    );

    if (jaMembro) {
      return res.status(400).json({
        erro: "Essa pessoa já é membro do grupo.",
      });
    }

    const convitePendente = await buscar(
      `
          SELECT 1

          FROM convites

          WHERE grupo_id = ? AND usuario_id = ? AND status = 'pendente'

          LIMIT 1
          `,
      [grupoId, usuario.id],
    );

    if (convitePendente) {
      return res.status(400).json({
        erro: "Já existe um convite pendente para essa pessoa.",
      });
    }

    await executar(
      `
        INSERT INTO convites

          (
            grupo_id,
            usuario_id,
            convidado_por,
            status
          )

        VALUES

          (
            ?,
            ?,
            ?,
            'pendente'
          )
        `,
      [grupoId, usuario.id, req.usuario.id],
    );

    res.json({
      mensagem: "Convite enviado com sucesso.",

      usuario,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao enviar convite.",
    });
  }
});

/* ======================================================
   LISTAR CONVITES PENDENTES
====================================================== */

app.get("/api/convites", autenticar, async (req, res) => {
  try {
    const convites = await buscarTodos(
      `
          SELECT

            c.id,

            c.grupo_id,

            g.nome AS grupo_nome,

            u.nome AS convidado_por_nome

          FROM convites c

          INNER JOIN grupos g

            ON g.id = c.grupo_id

          INNER JOIN usuarios u

            ON u.id = c.convidado_por

          WHERE

            c.usuario_id = ?

            AND c.status = 'pendente'

          ORDER BY c.id DESC
          `,
      [req.usuario.id],
    );

    res.json(convites);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao carregar convites.",
    });
  }
});

/* ======================================================
   ACEITAR / RECUSAR CONVITE
====================================================== */

app.post("/api/convites/:id/responder", autenticar, async (req, res) => {
  const id = Number(req.params.id);

  const aceitar = Boolean(req.body.aceitar);

  try {
    const convite = await buscar(
      `
          SELECT *

          FROM convites

          WHERE id = ? AND usuario_id = ? AND status = 'pendente'

          LIMIT 1
          `,
      [id, req.usuario.id],
    );

    if (!convite) {
      return res.status(404).json({
        erro: "Convite não encontrado.",
      });
    }

    if (aceitar) {
      await executar(
        `
          INSERT INTO
            grupo_membros

            (
              grupo_id,
              usuario_id
            )

          VALUES

            (
              ?,
              ?
            )

          ON CONFLICT (grupo_id, usuario_id) DO NOTHING
          `,
        [convite.grupo_id, req.usuario.id],
      );

      await executar(
        `
          UPDATE convites

          SET status = 'aceito'

          WHERE id = ?
          `,
        [id],
      );

      return res.json({
        mensagem: "Convite aceito. Você entrou no grupo.",
      });
    }

    await executar(
      `
        UPDATE convites

        SET status = 'recusado'

        WHERE id = ?
        `,
      [id],
    );

    res.json({
      mensagem: "Convite recusado.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao responder convite.",
    });
  }
});

/* ======================================================
   SAIR DO GRUPO
====================================================== */

app.post("/api/grupos/:grupoId/sair", autenticar, async (req, res) => {
  const grupoId = Number(req.params.grupoId);

  try {
    const grupo = await buscar(
      `
          SELECT *

          FROM grupos

          WHERE id = ?

          LIMIT 1
          `,
      [grupoId],
    );

    if (!grupo) {
      return res.status(404).json({
        erro: "Grupo não encontrado.",
      });
    }

    if (Number(grupo.criador_id) === Number(req.usuario.id)) {
      return res.status(400).json({
        erro: "Você é o criador do grupo e não pode sair dele.",
      });
    }

    await executar(
      `
        DELETE FROM grupo_membros

        WHERE grupo_id = ? AND usuario_id = ?
        `,
      [grupoId, req.usuario.id],
    );

    res.json({
      mensagem: "Você saiu do grupo.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao sair do grupo.",
    });
  }
});

/* ======================================================
   TAREFAS
====================================================== */

app.get("/api/tarefas", autenticar, async (req, res) => {
  try {
    const tarefas = await buscarTodos(
      `
          SELECT DISTINCT

            t.id,

            t.usuario_id,

            t.texto,

            t.data,

            t.concluida,

            t.grupo_id,

            u.nome AS usuario_nome

          FROM tarefas t

          INNER JOIN usuarios u

            ON u.id =
               t.usuario_id

          LEFT JOIN grupo_membros gm

            ON gm.grupo_id =
               t.grupo_id

          LEFT JOIN grupos g

            ON g.id =
               t.grupo_id

          WHERE

            t.usuario_id = ?

            OR

            gm.usuario_id = ?

            OR

            g.criador_id = ?

          ORDER BY

            t.concluida ASC,

            t.data ASC NULLS LAST,

            t.id DESC
          `,
      [req.usuario.id, req.usuario.id, req.usuario.id],
    );

    res.json(tarefas);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao carregar tarefas.",
    });
  }
});

/* ======================================================
   CRIAR TAREFA
====================================================== */

app.post("/api/tarefas", autenticar, async (req, res) => {
  const texto = String(req.body.texto || "").trim();

  const data = req.body.data ? String(req.body.data) : null;

  const grupoId = req.body.grupo_id ? Number(req.body.grupo_id) : null;

  if (!texto) {
    return res.status(400).json({
      erro: "Digite uma tarefa.",
    });
  }

  try {
    if (grupoId) {
      const pertence = await buscar(
        `
            SELECT
              g.id

            FROM grupos g

            LEFT JOIN grupo_membros gm

              ON gm.grupo_id =
                 g.id

            WHERE

              g.id = ?

              AND

              (
                g.criador_id = ?

                OR

                gm.usuario_id = ?
              )

            LIMIT 1
            `,
        [grupoId, req.usuario.id, req.usuario.id],
      );

      if (!pertence) {
        return res.status(403).json({
          erro: "Você não pertence a este grupo.",
        });
      }
    }

    const resultado = await executar(
      `
          INSERT INTO tarefas

            (
              usuario_id,
              texto,
              data,
              concluida,
              grupo_id
            )

          VALUES

            (
              ?,
              ?,
              ?,
              0,
              ?
            )

          RETURNING id
          `,
      [req.usuario.id, texto, data, grupoId],
    );

    const usuario = await buscar(
      `
          SELECT
            nome

          FROM usuarios

          WHERE id = ?

          LIMIT 1
          `,
      [req.usuario.id],
    );

    res.status(201).json({
      id: resultado.rows[0].id,

      usuario_id: req.usuario.id,

      usuario_nome: usuario?.nome || "Usuário",

      texto,

      data,

      concluida: 0,

      grupo_id: grupoId,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao criar tarefa.",
    });
  }
});

/* ======================================================
   PERMISSÃO DE TAREFA
====================================================== */

async function podeAlterarTarefa(tarefaId, usuarioId) {
  return await buscar(
    `
    SELECT

      t.id

    FROM tarefas t

    LEFT JOIN grupos g

      ON g.id =
         t.grupo_id

    LEFT JOIN grupo_membros gm

      ON gm.grupo_id =
         t.grupo_id

    WHERE

      t.id = ?

      AND

      (
        t.usuario_id = ?

        OR

        g.criador_id = ?

        OR

        gm.usuario_id = ?
      )

    LIMIT 1
    `,
    [tarefaId, usuarioId, usuarioId, usuarioId],
  );
}

/* ======================================================
   CONCLUIR TAREFA
====================================================== */

app.put("/api/tarefas/:id", autenticar, async (req, res) => {
  const id = Number(req.params.id);

  const concluida = req.body.concluida ? 1 : 0;

  try {
    const permitido = await podeAlterarTarefa(id, req.usuario.id);

    if (!permitido) {
      return res.status(404).json({
        erro: "Tarefa não encontrada ou você não tem permissão.",
      });
    }

    await executar(
      `
        UPDATE tarefas

        SET
          concluida = ?

        WHERE
          id = ?
        `,
      [concluida, id],
    );

    res.json({
      mensagem: "Tarefa atualizada.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao atualizar tarefa.",
    });
  }
});

/* ======================================================
   EXCLUIR TAREFA
====================================================== */

app.delete("/api/tarefas/:id", autenticar, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const permitido = await podeAlterarTarefa(id, req.usuario.id);

    if (!permitido) {
      return res.status(404).json({
        erro: "Tarefa não encontrada ou você não tem permissão.",
      });
    }

    await executar(
      `
        DELETE FROM tarefas

        WHERE id = ?
        `,
      [id],
    );

    res.json({
      mensagem: "Tarefa excluída.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao excluir tarefa.",
    });
  }
});

/* ======================================================
   TESTE DA API
====================================================== */

app.get("/api", (req, res) => {
  res.json({
    mensagem: "API do FocusList funcionando.",
  });
});

/* ======================================================
   SERVIDOR
====================================================== */

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
