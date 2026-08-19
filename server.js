const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();

const PORT = 3000;

const SECRET_KEY = "minha_chave_secreta";

/* ======================================================
   CONFIGURAÇÃO
====================================================== */

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "www")));

/* ======================================================
   BANCO
====================================================== */

const db = new sqlite3.Database(path.join(__dirname, "database.db"), (err) => {
  if (err) {
    console.error("Erro ao abrir banco:", err.message);

    process.exit(1);
  }

  console.log("Conectado ao banco database.db");
});

/* ======================================================
   PROMISES SQLITE
====================================================== */

function executar(sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parametros, function (err) {
      if (err) {
        reject(err);

        return;
      }

      resolve(this);
    });
  });
}

function buscar(sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, parametros, (err, row) => {
      if (err) {
        reject(err);

        return;
      }

      resolve(row);
    });
  });
}

function buscarTodos(sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, parametros, (err, rows) => {
      if (err) {
        reject(err);

        return;
      }

      resolve(rows);
    });
  });
}

/* ======================================================
   TABELAS
====================================================== */

db.serialize(() => {
  db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        nome TEXT,

        email TEXT UNIQUE NOT NULL,

        senha TEXT NOT NULL

      )
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS grupos (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        nome TEXT NOT NULL,

        criador_id INTEGER NOT NULL

      )
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS grupo_membros (

        grupo_id INTEGER NOT NULL,

        usuario_id INTEGER NOT NULL,

        PRIMARY KEY (
          grupo_id,
          usuario_id
        )

      )
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS tarefas (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        usuario_id INTEGER NOT NULL,

        texto TEXT NOT NULL,

        data TEXT,

        concluida INTEGER DEFAULT 0,

        grupo_id INTEGER

      )
    `);
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

app.post("/api/cadastrar", async (req, res) => {
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
    if (String(err.message).includes("UNIQUE")) {
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

app.post("/api/login", async (req, res) => {
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

    if (!usuario) {
      return res.status(400).json({
        erro: "Usuário não encontrado.",
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(400).json({
        erro: "Senha incorreta.",
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
          `,
      [nome, req.usuario.id],
    );

    await executar(
      `
        INSERT OR IGNORE INTO
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
        `,
      [resultado.lastID, req.usuario.id],
    );

    res.status(201).json({
      id: resultado.lastID,

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

    await executar(
      `
        INSERT OR IGNORE INTO
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
        `,
      [grupoId, usuario.id],
    );

    res.json({
      mensagem: "Membro adicionado com sucesso.",

      usuario,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: "Erro ao adicionar membro.",
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

            CASE

              WHEN
                t.data IS NULL
                OR
                t.data = ""

              THEN 1

              ELSE 0

            END ASC,

            t.data ASC,

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
      id: resultado.lastID,

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