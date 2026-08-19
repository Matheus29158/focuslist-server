const API_URL = "https://focuslist-server-us0y.onrender.com/api";

/* ======================================================
   LOGIN / CADASTRO
====================================================== */

const telaAuth = document.getElementById("tela-auth");
const appPrincipal = document.getElementById("app-principal");

const formAuth = document.getElementById("form-auth");

const authNome = document.getElementById("auth-nome");
const authEmail = document.getElementById("auth-email");
const authSenha = document.getElementById("auth-senha");

const btnToggleSenha = document.getElementById("btn-toggle-senha");

const btnAuthSubmit = document.getElementById("btn-auth-submit");

const subtituloAuth = document.getElementById("subtitulo-auth");

const textoAlternar = document.getElementById("texto-alternar");

const linkAlternar = document.getElementById("link-alternar");

const btnLogout = document.getElementById("btn-logout");

/* ======================================================
   TAREFAS
====================================================== */

const campoTarefa = document.getElementById("campo-tarefa");

const campoData = document.getElementById("campo-data");

const selectTipoTarefa = document.getElementById("select-tipo-tarefa");

const btnAdicionar = document.getElementById("btn-adicionar");

const listaTarefas = document.getElementById("lista-tarefas");

/* ======================================================
   ABAS
====================================================== */

const abas = document.querySelectorAll(".aba-item:not(.btn-sair)");

const tituloAba = document.getElementById("titulo-aba");

const eyebrowAba = document.getElementById("eyebrow-aba");

const textoAbaUsuario = document.getElementById("texto-aba-usuario");

const topoNomeUsuario = document.getElementById("topo-nome-usuario");

const saudacaoUsuario = document.getElementById("saudacao-usuario");

/* ======================================================
   CALENDÁRIO
====================================================== */

const containerFormulario = document.getElementById("container-formulario");

const containerCalendario = document.getElementById("container-calendario");

const gridDias = document.getElementById("grid-dias-calendario");

const tituloMesAno = document.getElementById("titulo-mes-ano");

const btnMesAnterior = document.getElementById("btn-mes-anterior");

const btnProximoMes = document.getElementById("btn-proximo-mes");

/* ======================================================
   GRUPOS
====================================================== */

const containerGerenciarGrupos = document.getElementById(
  "container-gerenciar-grupos",
);

const campoNomeGrupo = document.getElementById("campo-nome-grupo");

const btnCriarGrupo = document.getElementById("btn-criar-grupo");

const selectGrupoConvite = document.getElementById("select-grupo-convite");

const campoEmailMembro = document.getElementById("campo-email-membro");

const btnAddMembro = document.getElementById("btn-add-membro");

const campoTarefaGrupo = document.getElementById("campo-tarefa-grupo");

const campoDataGrupo = document.getElementById("campo-data-grupo");

const btnAdicionarTarefaGrupo = document.getElementById(
  "btn-adicionar-tarefa-grupo",
);

const tituloNovaTarefaGrupo = document.getElementById(
  "titulo-nova-tarefa-grupo",
);

const listaGrupos = document.getElementById("lista-grupos");

const grupoSelecionadoBadge = document.getElementById(
  "grupo-selecionado-badge",
);

const contadorGrupos = document.getElementById("contador-grupos");

const contadorTarefasGrupos = document.getElementById(
  "contador-tarefas-grupos",
);

const tituloGrupoSelecionado = document.getElementById(
  "titulo-grupo-selecionado",
);

const resumoGrupoSelecionado = document.getElementById(
  "resumo-grupo-selecionado",
);

const membrosGrupo = document.getElementById("membros-grupo");

const contadorMembrosGrupo = document.getElementById("contador-membros-grupo");

const listaMembrosGrupo = document.getElementById("lista-membros-grupo");

const listaTarefasGrupo = document.getElementById("lista-tarefas-grupo");

const filtroTarefasGrupo = document.getElementById("filtro-tarefas-grupo");

const caixaConvites = document.getElementById("caixa-convites");

const listaConvites = document.getElementById("lista-convites");

const contadorConvites = document.getElementById("contador-convites");

const btnSairGrupo = document.getElementById("btn-sair-grupo");

/* ======================================================
   ESTADO
====================================================== */

let tarefas = [];
let grupos = [];
let convites = [];

let filtroAtual = "todas";
let modoCadastro = false;

let grupoSelecionadoId = null;
let grupoMembros = [];

let dataNavegacaoCalendario = new Date();

/* ======================================================
   FLATPICKR
====================================================== */

const picker = flatpickr(campoData, {
  dateFormat: "Y-m-d",
  altInput: true,
  altFormat: "d/m/Y",
  minDate: "today",
  disableMobile: true,
});
const pickerGrupo = flatpickr(campoDataGrupo, {
  dateFormat: "Y-m-d",
  altInput: true,
  altFormat: "d/m/Y",
  minDate: "today",
  disableMobile: true,
});

/* ======================================================
   TÍTULOS
====================================================== */

const titulos = {
  todas: "📋 Todas as Tarefas",

  sozinho: "👤 Minhas Tarefas",

  grupos_aba: "👥 Tarefas em Grupo",

  hoje: "⭐ Tarefas de Hoje",

  semana: "🗓️ Tarefas desta Semana",

  calendario: "📅 Visão do Calendário",
};

/* ======================================================
   FUNÇÕES BÁSICAS
====================================================== */

function obterToken() {
  return localStorage.getItem("token_focuslist");
}

function obterNomeUsuario() {
  return localStorage.getItem("nome_usuario") || "Minha Conta";
}

function obterUsuarioId() {
  const token = obterToken();

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    return payload.id;
  } catch {
    return null;
  }
}

function obterHeaderAuth() {
  const token = obterToken();

  return {
    "Content-Type": "application/json",

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function lerJSON(res) {
  const texto = await res.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch {
    return {
      erro: texto,
    };
  }
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");
}

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();

  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

/* ======================================================
   USUÁRIO
====================================================== */

function atualizarNomeUsuario() {
  const nome = obterNomeUsuario();

  if (textoAbaUsuario) {
    textoAbaUsuario.textContent = nome;
  }

  if (topoNomeUsuario) {
    topoNomeUsuario.textContent = nome;
  }

  if (saudacaoUsuario) {
    saudacaoUsuario.textContent = `Olá, ${nome}!`;
  }

  if (selectTipoTarefa && selectTipoTarefa.options.length) {
    selectTipoTarefa.options[0].textContent = `👤 ${nome}`;
  }
}

/* ======================================================
   SENHA
====================================================== */

btnToggleSenha.addEventListener("click", () => {
  const novoTipo = authSenha.type === "password" ? "text" : "password";

  authSenha.type = novoTipo;

  btnToggleSenha.textContent = novoTipo === "text" ? "🙈" : "👁️";
});

/* ======================================================
   LOGIN / CADASTRO
====================================================== */

linkAlternar.addEventListener("click", (e) => {
  e.preventDefault();

  modoCadastro = !modoCadastro;

  if (modoCadastro) {
    authNome.classList.remove("escondido");

    authNome.required = true;

    subtituloAuth.textContent = "Crie sua conta no FocusList";

    btnAuthSubmit.textContent = "Cadastrar";

    textoAlternar.textContent = "Já tem uma conta?";

    linkAlternar.textContent = "Entrar";

    authNome.focus();
  } else {
    authNome.classList.add("escondido");

    authNome.required = false;

    authNome.value = "";

    subtituloAuth.textContent = "Faça login para acessar suas tarefas";

    btnAuthSubmit.textContent = "Entrar";

    textoAlternar.textContent = "Não tem uma conta?";

    linkAlternar.textContent = "Cadastre-se";
  }
});

formAuth.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = authNome.value.trim();

  const email = authEmail.value.trim().toLowerCase();

  const senha = authSenha.value;

  if (modoCadastro && !nome) {
    alert("Digite seu nome de usuário.");

    authNome.focus();

    return;
  }

  if (!email) {
    alert("Digite seu e-mail.");

    authEmail.focus();

    return;
  }

  if (!senha) {
    alert("Digite sua senha.");

    authSenha.focus();

    return;
  }

  btnAuthSubmit.disabled = true;

  try {
    const endpoint = modoCadastro ? "/cadastrar" : "/login";

    const dados = modoCadastro
      ? {
          nome,
          email,
          senha,
        }
      : {
          email,
          senha,
        };

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(dados),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro na requisição.");
    }

    if (modoCadastro) {
      alert("Cadastro realizado com sucesso! Faça login.");

      modoCadastro = false;

      authNome.classList.add("escondido");

      authNome.required = false;

      authNome.value = "";

      authSenha.value = "";

      subtituloAuth.textContent = "Faça login para acessar suas tarefas";

      btnAuthSubmit.textContent = "Entrar";

      textoAlternar.textContent = "Não tem uma conta?";

      linkAlternar.textContent = "Cadastre-se";

      authEmail.focus();

      return;
    }

    localStorage.setItem("token_focuslist", data.token);

    localStorage.setItem("nome_usuario", data.nome || email);

    atualizarNomeUsuario();

    await iniciarApp();
  } catch (err) {
    console.error("Erro:", err);

    alert(err.message || "Erro ao conectar ao servidor.");
  } finally {
    btnAuthSubmit.disabled = false;
  }
});

/* ======================================================
   LOGOUT
====================================================== */

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token_focuslist");

  localStorage.removeItem("nome_usuario");

  tarefas = [];

  grupos = [];

  convites = [];

  caixaConvites.classList.add("escondido");

  grupoSelecionadoId = null;

  grupoMembros = [];

  appPrincipal.classList.add("escondido");

  telaAuth.classList.remove("escondido");

  authNome.value = "";

  authEmail.value = "";

  authSenha.value = "";

  modoCadastro = false;

  authNome.classList.add("escondido");

  authNome.required = false;

  subtituloAuth.textContent = "Faça login para acessar suas tarefas";

  btnAuthSubmit.textContent = "Entrar";

  textoAlternar.textContent = "Não tem uma conta?";

  linkAlternar.textContent = "Cadastre-se";

  resetarAreaGrupos();

  authEmail.focus();
});

/* ======================================================
   GRUPOS
====================================================== */

async function carregarGrupos() {
  try {
    const res = await fetch(`${API_URL}/grupos`, {
      headers: obterHeaderAuth(),
    });

    if (res.status === 401 || res.status === 403) {
      btnLogout.click();

      return;
    }

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao carregar grupos.");
    }

    grupos = Array.isArray(data) ? data : [];

    contadorGrupos.textContent = grupos.length;

    preencherSelectGrupo();

    renderizarListaGrupos();

    if (
      grupoSelecionadoId &&
      grupos.some((grupo) => Number(grupo.id) === Number(grupoSelecionadoId))
    ) {
      await selecionarGrupo(grupoSelecionadoId, false);
    } else if (grupos.length > 0) {
      await selecionarGrupo(grupos[0].id, false);
    } else {
      grupoSelecionadoId = null;

      grupoMembros = [];

      resetarAreaGrupos();
    }

    atualizarNomeUsuario();
  } catch (err) {
    console.error("Erro ao carregar grupos:", err);
  }
}

/* ======================================================
   CONVITES
====================================================== */

async function carregarConvites() {
  try {
    const res = await fetch(`${API_URL}/convites`, {
      headers: obterHeaderAuth(),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao carregar convites.");
    }

    convites = Array.isArray(data) ? data : [];

    renderizarConvites();
  } catch (err) {
    console.error("Erro ao carregar convites:", err);
  }
}

function renderizarConvites() {
  if (convites.length === 0) {
    caixaConvites.classList.add("escondido");

    listaConvites.innerHTML = "";

    return;
  }

  caixaConvites.classList.remove("escondido");

  contadorConvites.textContent = convites.length;

  listaConvites.innerHTML = convites
    .map(
      (convite) => `
        <div class="convite-item">
          <div class="convite-info">
            <strong>👥 ${escaparHTML(convite.grupo_nome)}</strong>
            <span>Convite de ${escaparHTML(convite.convidado_por_nome)}</span>
          </div>

          <div class="convite-acoes">
            <button
              type="button"
              class="btn-primario btn-pequeno"
              data-aceitar="${convite.id}"
            >
              Aceitar
            </button>

            <button
              type="button"
              class="btn-secundario btn-pequeno"
              data-recusar="${convite.id}"
            >
              Recusar
            </button>
          </div>
        </div>
        `,
    )
    .join("");

  listaConvites.querySelectorAll("[data-aceitar]").forEach((botao) => {
    botao.addEventListener("click", () => {
      responderConvite(Number(botao.dataset.aceitar), true);
    });
  });

  listaConvites.querySelectorAll("[data-recusar]").forEach((botao) => {
    botao.addEventListener("click", () => {
      responderConvite(Number(botao.dataset.recusar), false);
    });
  });
}

async function responderConvite(id, aceitar) {
  try {
    const res = await fetch(`${API_URL}/convites/${id}/responder`, {
      method: "POST",

      headers: obterHeaderAuth(),

      body: JSON.stringify({
        aceitar,
      }),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao responder convite.");
    }

    await carregarConvites();

    if (aceitar) {
      await carregarGrupos();
    }

    alert(aceitar ? "Você entrou no grupo!" : "Convite recusado.");
  } catch (err) {
    alert(err.message);
  }
}

function preencherSelectGrupo() {
  selectGrupoConvite.innerHTML = "";

  if (grupos.length === 0) {
    selectGrupoConvite.innerHTML = `
      <option value="">
        Crie um grupo primeiro
      </option>
      `;

    selectGrupoConvite.disabled = true;

    return;
  }

  selectGrupoConvite.disabled = false;

  selectGrupoConvite.innerHTML = `
    <option value="">
      Selecione um grupo
    </option>
    `;

  grupos.forEach((grupo) => {
    selectGrupoConvite.innerHTML += `
        <option
          value="${grupo.id}"
        >
          ${escaparHTML(grupo.nome)}
        </option>
        `;
  });

  if (grupoSelecionadoId) {
    selectGrupoConvite.value = String(grupoSelecionadoId);
  }
}

function renderizarListaGrupos() {
  if (grupos.length === 0) {
    listaGrupos.innerHTML = `
      <div class="estado-vazio-grupo">

        <div class="estado-icone">
          👥
        </div>

        <strong>
          Nenhum grupo ainda
        </strong>

        <span>
          Crie seu primeiro grupo ao lado.
        </span>

      </div>
      `;

    return;
  }

  listaGrupos.innerHTML = grupos
    .map((grupo) => {
      const totalTarefas = tarefas.filter(
        (tarefa) => Number(tarefa.grupo_id) === Number(grupo.id),
      ).length;

      const ativo =
        Number(grupoSelecionadoId) === Number(grupo.id) ? "ativo" : "";

      const membros = Number(grupo.total_membros || 0);

      return `
          <button
            type="button"
            class="grupo-item ${ativo}"
            data-grupo-id="${grupo.id}"
          >

            <div
              class="grupo-item-topo"
            >

              <span
                class="grupo-item-nome"
              >
                👥
                ${escaparHTML(grupo.nome)}
              </span>

              <span
                class="grupo-item-contador"
              >
                ${totalTarefas}
                tarefa${totalTarefas === 1 ? "" : "s"}
              </span>

            </div>

            <div
              class="grupo-item-meta"
            >
              ${membros}
              membro${membros === 1 ? "" : "s"}
            </div>

          </button>
          `;
    })
    .join("");

  listaGrupos.querySelectorAll(".grupo-item").forEach((botao) => {
    botao.addEventListener("click", async () => {
      const id = Number(botao.dataset.grupoId);

      await selecionarGrupo(id);
    });
  });
}

async function selecionarGrupo(id, sincronizarSelect = true) {
  const grupo = grupos.find((item) => Number(item.id) === Number(id));

  if (!grupo) {
    return;
  }

  grupoSelecionadoId = Number(grupo.id);

  if (sincronizarSelect) {
    selectGrupoConvite.value = String(grupo.id);
  }

  grupoSelecionadoBadge.textContent = grupo.nome;

  tituloGrupoSelecionado.textContent = `👥 ${grupo.nome}`;

  renderizarListaGrupos();

  await carregarMembrosGrupo(grupo.id);

  renderizarDetalhesGrupo(grupo);

  renderizarTarefasGrupo();
  tituloNovaTarefaGrupo.textContent = `Tarefa — ${grupo.nome}`;

  const usuarioId = obterUsuarioId();

  if (usuarioId && Number(grupo.criador_id) !== Number(usuarioId)) {
    btnSairGrupo.classList.remove("escondido");
  } else {
    btnSairGrupo.classList.add("escondido");
  }
}

async function sairDoGrupo() {
  if (!grupoSelecionadoId) {
    return;
  }

  const confirmar = confirm("Tem certeza que deseja sair deste grupo?");

  if (!confirmar) {
    return;
  }

  btnSairGrupo.disabled = true;

  try {
    const res = await fetch(`${API_URL}/grupos/${grupoSelecionadoId}/sair`, {
      method: "POST",

      headers: obterHeaderAuth(),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao sair do grupo.");
    }

    grupoSelecionadoId = null;

    await carregarGrupos();

    alert("Você saiu do grupo.");
  } catch (err) {
    alert(err.message);
  } finally {
    btnSairGrupo.disabled = false;
  }
}

btnSairGrupo.addEventListener("click", sairDoGrupo);

async function carregarMembrosGrupo(grupoId) {
  try {
    const res = await fetch(`${API_URL}/grupos/${grupoId}/membros`, {
      headers: obterHeaderAuth(),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao carregar membros.");
    }

    grupoMembros = Array.isArray(data) ? data : [];

    renderizarMembrosGrupo();
  } catch (err) {
    console.error("Erro ao carregar membros:", err);

    grupoMembros = [];

    renderizarMembrosGrupo();
  }
}

function renderizarDetalhesGrupo(grupo) {
  if (!grupo) {
    return;
  }

  const tarefasDoGrupo = tarefas.filter(
    (tarefa) => Number(tarefa.grupo_id) === Number(grupo.id),
  );

  const concluidas = tarefasDoGrupo.filter((tarefa) =>
    Boolean(tarefa.concluida),
  ).length;

  const pendentes = tarefasDoGrupo.length - concluidas;

  resumoGrupoSelecionado.innerHTML = `
    <div
      class="resumo-detalhes-grid"
    >

      <div
        class="detalhe-stat"
      >
        <strong>
          ${grupoMembros.length || grupo.total_membros || 0}
        </strong>

        <span>
          membros
        </span>
      </div>

      <div
        class="detalhe-stat"
      >
        <strong>
          ${tarefasDoGrupo.length}
        </strong>

        <span>
          tarefas
        </span>
      </div>

      <div
        class="detalhe-stat"
      >
        <strong>
          ${pendentes}
        </strong>

        <span>
          pendentes
        </span>
      </div>

    </div>
    `;

  membrosGrupo.classList.remove("escondido");
}

function renderizarMembrosGrupo() {
  contadorMembrosGrupo.textContent = grupoMembros.length;

  if (grupoMembros.length === 0) {
    listaMembrosGrupo.innerHTML = `
      <span class="membro-chip">

        <span class="membro-avatar">
          ?
        </span>

        Nenhum membro

      </span>
      `;

    return;
  }

  listaMembrosGrupo.innerHTML = grupoMembros
    .map((membro) => {
      const nome = membro.nome || membro.email || "Usuário";

      const inicial = nome.trim().charAt(0).toUpperCase();

      return `
          <span
            class="membro-chip"
          >

            <span
              class="membro-avatar"
            >
              ${escaparHTML(inicial)}
            </span>

            ${escaparHTML(nome)}

          </span>
          `;
    })
    .join("");
}

function renderizarTarefasGrupo() {
  const filtro = filtroTarefasGrupo.value;

  if (!grupoSelecionadoId) {
    listaTarefasGrupo.innerHTML = `
      <div
        class="estado-vazio-grupo"
      >

        <div class="estado-icone">
          📋
        </div>

        <strong>
          Selecione um grupo
        </strong>

        <span>
          As tarefas do grupo
          serão exibidas aqui.
        </span>

      </div>
      `;

    return;
  }

  let tarefasDoGrupo = tarefas.filter(
    (tarefa) => Number(tarefa.grupo_id) === Number(grupoSelecionadoId),
  );

  if (filtro === "pendentes") {
    tarefasDoGrupo = tarefasDoGrupo.filter((tarefa) => !tarefa.concluida);
  }

  if (filtro === "concluidas") {
    tarefasDoGrupo = tarefasDoGrupo.filter((tarefa) =>
      Boolean(tarefa.concluida),
    );
  }

  if (tarefasDoGrupo.length === 0) {
    listaTarefasGrupo.innerHTML = `
      <div
        class="estado-vazio-grupo pequeno"
      >

        <div class="estado-icone">
          ✅
        </div>

        <strong>
          Nenhuma tarefa encontrada
        </strong>

        <span>
          Não há tarefas neste filtro.
        </span>

      </div>
      `;

    return;
  }

  listaTarefasGrupo.innerHTML = tarefasDoGrupo
    .map((tarefa) => {
      const data = tarefa.data
        ? tarefa.data.split("-").reverse().join("/")
        : "Sem data";

      const nomeCriador = tarefa.usuario_nome || "Membro";

      return `
          <div
            class="tarefa-grupo-item"
          >

            <div
              class="tarefa-grupo-esquerda"
            >

              <input
                type="checkbox"
                class="check-box"
                data-tarefa-id="${tarefa.id}"
                ${tarefa.concluida ? "checked" : ""}
              >

              <span
                class="
                  tarefa-grupo-texto
                  ${tarefa.concluida ? "concluida" : ""}
                "
              >
                ${escaparHTML(tarefa.texto)}
              </span>

            </div>

            <div
              class="tarefa-grupo-meta"
            >

              <span>
                📅
                ${escaparHTML(data)}
              </span>

              <span>
                👤
                ${escaparHTML(nomeCriador)}
              </span>

              <button
                type="button"
                class="
                  btn-deletar
                  tarefa-grupo-deletar
                "
                data-tarefa-id="${tarefa.id}"
                title="Excluir tarefa"
              >
                🗑️
              </button>

            </div>

          </div>
          `;
    })
    .join("");

  listaTarefasGrupo
    .querySelectorAll(".check-box[data-tarefa-id]")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        await alterarConclusaoTarefa(
          Number(checkbox.dataset.tarefaId),
          checkbox.checked,
        );
      });
    });

  listaTarefasGrupo
    .querySelectorAll(".tarefa-grupo-deletar")
    .forEach((botao) => {
      botao.addEventListener("click", async () => {
        await excluirTarefa(Number(botao.dataset.tarefaId), true);
      });
    });
}

function atualizarContadoresGrupos() {
  contadorGrupos.textContent = grupos.length;

  contadorTarefasGrupos.textContent = tarefas.filter((tarefa) =>
    Boolean(tarefa.grupo_id),
  ).length;
}

/* ======================================================
   CRIAR GRUPO
====================================================== */

btnCriarGrupo.addEventListener("click", async () => {
  const nome = campoNomeGrupo.value.trim();

  if (!nome) {
    alert("Digite o nome do grupo.");

    campoNomeGrupo.focus();

    return;
  }

  btnCriarGrupo.disabled = true;

  try {
    const res = await fetch(`${API_URL}/grupos`, {
      method: "POST",

      headers: obterHeaderAuth(),

      body: JSON.stringify({
        nome,
      }),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao criar grupo.");
    }

    campoNomeGrupo.value = "";

    await carregarGrupos();

    if (data.id) {
      await selecionarGrupo(data.id);
    }

    alert("Grupo criado com sucesso!");
  } catch (err) {
    alert(err.message);
  } finally {
    btnCriarGrupo.disabled = false;
  }
});

campoNomeGrupo.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    btnCriarGrupo.click();
  }
});

/* ======================================================
   ADICIONAR MEMBRO
====================================================== */

btnAddMembro.addEventListener("click", async () => {
  const grupoId =
    Number(selectGrupoConvite.value) || Number(grupoSelecionadoId);

  const email = campoEmailMembro.value.trim().toLowerCase();

  if (!grupoId) {
    alert("Selecione um grupo.");

    selectGrupoConvite.focus();

    return;
  }

  if (!email) {
    alert("Digite o e-mail do membro.");

    campoEmailMembro.focus();

    return;
  }

  btnAddMembro.disabled = true;

  try {
    const res = await fetch(`${API_URL}/grupos/${grupoId}/membros`, {
      method: "POST",

      headers: obterHeaderAuth(),

      body: JSON.stringify({
        email,
      }),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao adicionar membro.");
    }

    campoEmailMembro.value = "";

    alert(data.mensagem || "Convite enviado com sucesso!");
  } catch (err) {
    alert(err.message);
  } finally {
    btnAddMembro.disabled = false;
  }
});

selectGrupoConvite.addEventListener("change", async () => {
  const id = Number(selectGrupoConvite.value);

  if (id) {
    await selecionarGrupo(id);
  }
});

filtroTarefasGrupo.addEventListener("change", () => {
  renderizarTarefasGrupo();
});

/* ======================================================
   TAREFAS
====================================================== */

async function carregarTarefas() {
  try {
    const res = await fetch(`${API_URL}/tarefas`, {
      headers: obterHeaderAuth(),
    });

    if (res.status === 401 || res.status === 403) {
      btnLogout.click();

      return;
    }

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao carregar tarefas.");
    }

    tarefas = Array.isArray(data) ? data : [];

    atualizarContadoresGrupos();

    renderizar();

    renderizarTarefasGrupo();
  } catch (err) {
    console.error("Erro ao carregar tarefas:", err);
  }
}

function filtrarTarefasNormais() {
  const hojeStr = dataLocalISO();

  const hoje = new Date();

  if (filtroAtual === "sozinho") {
    return tarefas.filter((tarefa) => !tarefa.grupo_id);
  }

  if (filtroAtual === "grupos_aba") {
    return tarefas.filter((tarefa) => Boolean(tarefa.grupo_id));
  }

  if (filtroAtual === "hoje") {
    return tarefas.filter((tarefa) => tarefa.data === hojeStr);
  }

  if (filtroAtual === "semana") {
    const inicio = new Date(hoje);

    const dia = inicio.getDay();

    const diferenca = dia === 0 ? -6 : 1 - dia;

    inicio.setDate(inicio.getDate() + diferenca);

    inicio.setHours(0, 0, 0, 0);

    const fim = new Date(inicio);

    fim.setDate(fim.getDate() + 6);

    fim.setHours(23, 59, 59, 999);

    return tarefas.filter((tarefa) => {
      if (!tarefa.data) {
        return false;
      }

      const [ano, mes, diaTarefa] = tarefa.data.split("-").map(Number);

      const dataTarefa = new Date(ano, mes - 1, diaTarefa);

      return dataTarefa >= inicio && dataTarefa <= fim;
    });
  }

  return tarefas;
}

function renderizar() {
  /* ====================================================
     CALENDÁRIO
  ==================================================== */

  if (filtroAtual === "calendario") {
    // Esconde formulário normal
    containerFormulario.classList.add("escondido");

    // Esconde lista normal
    listaTarefas.classList.add("escondido");

    // Esconde grupos
    containerGerenciarGrupos.classList.add("escondido");

    // Mostra calendário
    containerCalendario.classList.remove("escondido");

    // Desenha o calendário
    renderizarCalendario();

    return;
  }

  /* ====================================================
     TAREFAS EM GRUPO
  ==================================================== */

  if (filtroAtual === "grupos_aba") {
    // Mostra área de grupos
    containerGerenciarGrupos.classList.remove("escondido");

    // Esconde formulário normal
    containerFormulario.classList.add("escondido");

    // Esconde calendário
    containerCalendario.classList.add("escondido");

    // Mostra lista normal das tarefas de grupo
    listaTarefas.classList.remove("escondido");

    // Renderiza grupos
    renderizarListaGrupos();

    // Renderiza tarefas do grupo
    renderizarTarefasGrupo();

    return;
  }

  /* ====================================================
     TODAS AS OUTRAS ABAS
  ==================================================== */

  // Mostra formulário normal
  containerFormulario.classList.remove("escondido");

  // Mostra lista de tarefas
  listaTarefas.classList.remove("escondido");

  // Esconde calendário
  containerCalendario.classList.add("escondido");

  // Esconde área de grupos
  containerGerenciarGrupos.classList.add("escondido");

  /* ====================================================
     FILTRAR TAREFAS
  ==================================================== */

  listaTarefas.innerHTML = "";

  const tarefasFiltradas = filtrarTarefasNormais();

  /* ====================================================
     NENHUMA TAREFA
  ==================================================== */

  if (tarefasFiltradas.length === 0) {
    listaTarefas.innerHTML = `
      <p
        style="
          color:#64748b;
          padding:20px 0;
        "
      >
        Nenhuma tarefa encontrada.
      </p>
    `;

    return;
  }

  /* ====================================================
     DESENHAR TAREFAS
  ==================================================== */

  tarefasFiltradas.forEach((tarefa) => {
    const li = document.createElement("li");

    const grupo = grupos.find((g) => Number(g.id) === Number(tarefa.grupo_id));

    const tagGrupo = grupo
      ? `
            <span
              class="tag-grupo"
            >
              👥
              ${escaparHTML(grupo.nome)}
            </span>
          `
      : `
            <span
              class="tag-sozinho"
            >
              👤 Pessoal
            </span>
          `;

    const dataFormatada = tarefa.data
      ? `
            <span
              class="tag-data"
            >
              📅
              ${tarefa.data.split("-").reverse().join("/")}
            </span>
          `
      : "";

    li.innerHTML = `
        <div
          class="item-esquerda"
        >

          <input
            type="checkbox"
            class="check-box"
            ${Number(tarefa.concluida) === 1 ? "checked" : ""}
          >

          <span
            class="
              texto-tarefa
              ${Number(tarefa.concluida) === 1 ? "concluida" : ""}
            "
          >
            ${escaparHTML(tarefa.texto)}
          </span>

        </div>


        <div
          class="item-direita"
        >

          ${tagGrupo}

          ${dataFormatada}

          <button
            class="btn-deletar"
            type="button"
            title="Excluir tarefa"
          >
            🗑️
          </button>

        </div>
      `;

    /* ==================================================
         CONCLUIR TAREFA
      ================================================== */

    li.querySelector(".check-box").addEventListener("change", async (e) => {
      await alterarConclusaoTarefa(tarefa.id, e.target.checked);
    });

    /* ==================================================
         EXCLUIR TAREFA
      ================================================== */

    li.querySelector(".btn-deletar").addEventListener("click", async () => {
      await excluirTarefa(tarefa.id, false);
    });

    listaTarefas.appendChild(li);
  });
}

/* ======================================================
   ADICIONAR TAREFA
====================================================== */

btnAdicionar.addEventListener("click", async () => {
  const texto = campoTarefa.value.trim();

  if (!texto) {
    alert("Digite uma tarefa.");

    campoTarefa.focus();

    return;
  }

  const grupo_id = selectTipoTarefa.value || null;

  btnAdicionar.disabled = true;

  try {
    const res = await fetch(`${API_URL}/tarefas`, {
      method: "POST",

      headers: obterHeaderAuth(),

      body: JSON.stringify({
        texto,

        data: campoData.value || null,

        grupo_id,
      }),
    });

    const novaTarefa = await lerJSON(res);

    if (!res.ok) {
      throw new Error(novaTarefa.erro || "Erro ao criar tarefa.");
    }

    tarefas.push(novaTarefa);

    atualizarContadoresGrupos();

    renderizar();

    renderizarListaGrupos();

    if (
      grupoSelecionadoId &&
      grupo_id &&
      Number(grupo_id) === Number(grupoSelecionadoId)
    ) {
      const grupo = grupos.find(
        (item) => Number(item.id) === Number(grupoSelecionadoId),
      );

      if (grupo) {
        renderizarDetalhesGrupo(grupo);
      }

      renderizarTarefasGrupo();
    }

    campoTarefa.value = "";

    picker.clear();

    campoTarefa.focus();
  } catch (err) {
    alert(err.message);
  } finally {
    btnAdicionar.disabled = false;
  }
});

campoTarefa.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    btnAdicionar.click();
  }
});

/* ======================================================
   ALTERAR / EXCLUIR
====================================================== */

async function alterarConclusaoTarefa(id, concluida) {
  try {
    const res = await fetch(`${API_URL}/tarefas/${id}`, {
      method: "PUT",

      headers: obterHeaderAuth(),

      body: JSON.stringify({
        concluida,
      }),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao atualizar tarefa.");
    }

    const tarefa = tarefas.find((item) => Number(item.id) === Number(id));

    if (tarefa) {
      tarefa.concluida = concluida ? 1 : 0;
    }

    atualizarContadoresGrupos();

    renderizar();

    renderizarTarefasGrupo();

    if (grupoSelecionadoId) {
      const grupo = grupos.find(
        (item) => Number(item.id) === Number(grupoSelecionadoId),
      );

      if (grupo) {
        renderizarDetalhesGrupo(grupo);
      }
    }
  } catch (err) {
    alert(err.message);

    renderizar();

    renderizarTarefasGrupo();
  }
}

async function excluirTarefa(id, ehTarefaGrupo) {
  const confirmar = confirm("Deseja realmente excluir esta tarefa?");

  if (!confirmar) {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/tarefas/${id}`, {
      method: "DELETE",

      headers: obterHeaderAuth(),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao excluir tarefa.");
    }

    tarefas = tarefas.filter((tarefa) => Number(tarefa.id) !== Number(id));

    atualizarContadoresGrupos();

    renderizar();

    renderizarListaGrupos();

    if (ehTarefaGrupo) {
      renderizarTarefasGrupo();
    }
  } catch (err) {
    alert(err.message);
  }
}

/* ======================================================
   ABAS
====================================================== */

abas.forEach((aba) => {
  aba.addEventListener("click", () => {
    abas.forEach((item) => item.classList.remove("ativa"));

    aba.classList.add("ativa");

    filtroAtual = aba.dataset.filtro;

    tituloAba.textContent = titulos[filtroAtual];

    eyebrowAba.textContent =
      filtroAtual === "grupos_aba" ? "COLABORAÇÃO" : "FOCUSLIST";

    renderizar();

    renderizarTarefasGrupo();
  });
});

/* ======================================================
   CALENDÁRIO
====================================================== */
/* ======================================================
   CALENDÁRIO
====================================================== */

function renderizarCalendario() {
  gridDias.innerHTML = "";

  const ano = dataNavegacaoCalendario.getFullYear();
  const mes = dataNavegacaoCalendario.getMonth();

  const nomeMes = dataNavegacaoCalendario.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  tituloMesAno.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();

  const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

  /*
    Espaços antes do primeiro dia
    do mês.
  */
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const vazio = document.createElement("div");

    vazio.className = "dia-card vazio";

    gridDias.appendChild(vazio);
  }

  /*
    Cria cada dia
    do calendário.
  */
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const card = document.createElement("div");

    card.className = "dia-card";

    const mesFormatado = String(mes + 1).padStart(2, "0");

    const diaFormatado = String(dia).padStart(2, "0");

    const dataIso = `${ano}-${mesFormatado}-${diaFormatado}`;

    /*
      Busca todas as tarefas
      daquele dia.
    */
    const tarefasDoDia = tarefas.filter(
      (tarefa) => String(tarefa.data || "") === dataIso,
    );

    /*
      Conta concluídas.
    */
    const concluidas = tarefasDoDia.filter(
      (tarefa) => Number(tarefa.concluida) === 1 || tarefa.concluida === true,
    ).length;

    /*
      Conta pendentes.
    */
    const pendentes = tarefasDoDia.length - concluidas;

    /*
      Destaca o dia atual.
    */
    if (dataIso === dataLocalISO()) {
      card.classList.add("dia-hoje");
    }

    /*
      Se existem tarefas:

      tudo concluído = verde

      pelo menos uma pendente = vermelho
    */
    if (tarefasDoDia.length > 0) {
      card.classList.add(
        pendentes === 0 ? "status-tudo-ok" : "status-pendente",
      );
    }

    /*
      Monta a lista que aparecerá
      ao passar o mouse.
    */
    const listaHtml = tarefasDoDia
      .map((tarefa) => {
        const concluida =
          Number(tarefa.concluida) === 1 || tarefa.concluida === true;

        const grupo = grupos.find(
          (g) => Number(g.id) === Number(tarefa.grupo_id),
        );

        return `
              <div
                class="
                  cal-tooltip-tarefa
                  ${concluida ? "concluida" : "pendente"}
                "
              >

                <span
                  class="cal-tooltip-icone"
                >
                  ${concluida ? "✓" : "✕"}
                </span>

                <div
                  class="cal-tooltip-conteudo"
                >

                  <div
                    class="cal-tooltip-texto"
                  >
                    ${escaparHTML(tarefa.texto)}
                  </div>

                  ${
                    grupo
                      ? `
                        <div
                          class="
                            cal-tooltip-grupo
                          "
                        >
                          👥
                          ${escaparHTML(grupo.nome)}
                        </div>
                      `
                      : ""
                  }

                </div>

              </div>
            `;
      })
      .join("");

    /*
      Conteúdo do dia.
    */
    card.innerHTML = `
      <span
        class="dia-numero"
      >
        ${dia}
      </span>

      ${
        tarefasDoDia.length
          ? `
            <div
              class="cal-dia-resumo"
            >

              <span>
                ${tarefasDoDia.length}
                tarefa${tarefasDoDia.length === 1 ? "" : "s"}
              </span>

              <span
                class="cal-dia-contadores"
              >

                <b
                  class="cal-verde"
                >
                  ✓ ${concluidas}
                </b>

                <b
                  class="cal-vermelho"
                >
                  ✕ ${pendentes}
                </b>

              </span>

            </div>

            <div
              class="cal-tooltip"
            >

              <div
                class="cal-tooltip-titulo"
              >
                ${diaFormatado}/${mesFormatado}/${ano}
              </div>

              <div
                class="cal-tooltip-lista"
              >
                ${listaHtml}
              </div>

            </div>

          `
          : `
            <div
              class="cal-sem-tarefas"
            >
              Sem tarefas
            </div>
          `
      }
    `;

    gridDias.appendChild(card);
  }
}

/*
  Mês anterior.
*/
btnMesAnterior.addEventListener("click", () => {
  dataNavegacaoCalendario.setMonth(dataNavegacaoCalendario.getMonth() - 1);

  renderizarCalendario();
});

/*
  Próximo mês.
*/
btnProximoMes.addEventListener("click", () => {
  dataNavegacaoCalendario.setMonth(dataNavegacaoCalendario.getMonth() + 1);

  renderizarCalendario();
});
/* ======================================================
   RESET GRUPOS
====================================================== */

function resetarAreaGrupos() {
  grupoSelecionadoBadge.textContent = "Nenhum selecionado";

  tituloGrupoSelecionado.textContent = "Nenhum grupo selecionado";

  resumoGrupoSelecionado.innerHTML = `
    <div
      class="estado-vazio-grupo pequeno"
    >

      <div
        class="estado-icone"
      >
        👆
      </div>

      <strong>
        Selecione um grupo
      </strong>

      <span>
        As informações aparecerão aqui.
      </span>

    </div>
    `;

  membrosGrupo.classList.add("escondido");

  btnSairGrupo.classList.add("escondido");

  listaMembrosGrupo.innerHTML = "";

  contadorMembrosGrupo.textContent = "0";

  listaTarefasGrupo.innerHTML = `
    <div
      class="estado-vazio-grupo"
    >

      <div
        class="estado-icone"
      >
        📋
      </div>

      <strong>
        Selecione um grupo
      </strong>

      <span>
        As tarefas do grupo aparecerão aqui.
      </span>

    </div>
    `;

  atualizarContadoresGrupos();

  renderizarListaGrupos();

  preencherSelectGrupo();
}

/* ======================================================
   INICIAR APP
====================================================== */

async function iniciarApp() {
  telaAuth.classList.add("escondido");

  appPrincipal.classList.remove("escondido");

  atualizarNomeUsuario();

  await carregarTarefas();

  await carregarGrupos();

  await carregarConvites();
}

/* ======================================================
   INÍCIO
====================================================== */

window.addEventListener("DOMContentLoaded", () => {
  atualizarNomeUsuario();

  if (obterToken()) {
    iniciarApp();
  } else {
    telaAuth.classList.remove("escondido");

    appPrincipal.classList.add("escondido");
  }
});
async function adicionarTarefaGrupo() {
  if (!grupoSelecionadoId) {
    alert("Selecione um grupo primeiro.");
    return;
  }

  const texto = campoTarefaGrupo.value.trim();

  if (!texto) {
    alert("Digite a tarefa.");
    campoTarefaGrupo.focus();
    return;
  }

  btnAdicionarTarefaGrupo.disabled = true;

  try {
    const res = await fetch(`${API_URL}/tarefas`, {
      method: "POST",

      headers: obterHeaderAuth(),

      body: JSON.stringify({
        texto: texto,

        data: campoDataGrupo.value || null,

        grupo_id: grupoSelecionadoId,
      }),
    });

    const data = await lerJSON(res);

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao criar tarefa.");
    }

    tarefas.push(data);

    campoTarefaGrupo.value = "";

    pickerGrupo.clear();

    atualizarContadoresGrupos();

    renderizarListaGrupos();

    const grupo = grupos.find(
      (g) => Number(g.id) === Number(grupoSelecionadoId),
    );

    if (grupo) {
      renderizarDetalhesGrupo(grupo);
    }

    renderizarTarefasGrupo();

    alert("Tarefa adicionada ao grupo!");
  } catch (err) {
    alert(err.message);
  } finally {
    btnAdicionarTarefaGrupo.disabled = false;
  }
}
btnAdicionarTarefaGrupo.addEventListener("click", adicionarTarefaGrupo);
