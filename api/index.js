```js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

// ======================================================
// CONFIGURAÇÕES
// ======================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// FRONTEND
// ======================================================

const FRONTEND_DIR = path.join(__dirname, "../frontend");

app.use(express.static(FRONTEND_DIR));

// ======================================================
// BANCO DE DADOS
// ======================================================

const DB_FILE = path.join(__dirname, "../backend/db.json");

function criarDBInicial() {
  return {
    usuarios: [],
    pacientes: [],
    triagens: [],
    consultas: [],
    tv_chamada: null,
    tv_historico: []
  };
}

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return criarDBInicial();
    }

    const conteudo = fs.readFileSync(DB_FILE, "utf8").trim();

    if (!conteudo) {
      return criarDBInicial();
    }

    const db = JSON.parse(conteudo);

    if (!Array.isArray(db.usuarios)) {
      db.usuarios = [];
    }

    if (!Array.isArray(db.pacientes)) {
      db.pacientes = [];
    }

    if (!Array.isArray(db.triagens)) {
      db.triagens = [];
    }

    if (!Array.isArray(db.consultas)) {
      db.consultas = [];
    }

    if (!("tv_chamada" in db)) {
      db.tv_chamada = null;
    }

    if (!Array.isArray(db.tv_historico)) {
      db.tv_historico = [];
    }

    return db;
  } catch (erro) {
    console.error("Erro ao ler banco de dados:", erro);
    return criarDBInicial();
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (erro) {
    console.error("Erro ao salvar banco de dados:", erro);
    throw erro;
  }
}

// ======================================================
// STATUS DA API
// ======================================================

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API do Projeto Sentinela funcionando"
  });
});

// Mantém a rota antiga funcionando
app.get("/", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API do Projeto Sentinela funcionando"
  });
});

// ======================================================
// LOGIN
// ======================================================

app.post("/login", (req, res) => {
  try {
    const db = readDB();

    const usuario = String(req.body.usuario || "").trim();
    const senha = String(req.body.senha || "").trim();

    const user = db.usuarios.find(
      (u) =>
        u.usuario === usuario &&
        u.senha === senha
    );

    if (!user) {
      return res.status(401).json({
        erro: "Login inválido"
      });
    }

    res.json(user);
  } catch (erro) {
    console.error("Erro no login:", erro);

    res.status(500).json({
      erro: "Erro interno no servidor"
    });
  }
});

// ======================================================
// ATENDIMENTO
// ======================================================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),
      nome: req.body.nome,
      cpf: req.body.cpf,
      tipo: req.body.tipo,
      status: "triagem",
      createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);

    writeDB(db);

    res.json(paciente);
  } catch (erro) {
    console.error("Erro no atendimento:", erro);

    res.status(500).json({
      erro: "Erro ao cadastrar paciente"
    });
  }
});

// ======================================================
// LISTAR PACIENTES
// ======================================================

app.get("/pacientes", (req, res) => {
  try {
    const db = readDB();

    res.json(db.pacientes);
  } catch (erro) {
    console.error("Erro ao listar pacientes:", erro);

    res.status(500).json({
      erro: "Erro ao listar pacientes"
    });
  }
});

// ======================================================
// TRIAGEM
// ======================================================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    let risco = req.body.risco;

    const temperatura = Number(req.body.temperatura);

    if (temperatura >= 39) {
      risco = "vermelho";
    } else if (temperatura >= 38) {
      risco = "amarelo";
    } else if (!risco) {
      risco = "verde";
    }

    const triagem = {
      id: Date.now(),
      nome: req.body.nome,
      sintoma: req.body.sintoma,
      temperatura,
      alergia: req.body.alergia,
      observacao: req.body.observacao,
      risco,
      status: "aguardando_medico",
      createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);

    writeDB(db);

    res.json(triagem);
  } catch (erro) {
    console.error("Erro na triagem:", erro);

    res.status(500).json({
      erro: "Erro ao realizar triagem"
    });
  }
});

// ======================================================
// LISTAR TRIAGENS
// ======================================================

app.get("/triagens", (req, res) => {
  try {
    const db = readDB();

    res.json(db.triagens);
  } catch (erro) {
    console.error("Erro ao listar triagens:", erro);

    res.status(500).json({
      erro: "Erro ao listar triagens"
    });
  }
});

// ======================================================
// TV - CHAMAR PACIENTE
// ======================================================

app.post("/tv/chamar", (req, res) => {
  try {
    const db = readDB();

    const chamada = {
      id: Date.now().toString(),
      localTipo: req.body.localTipo,
      localNumero: req.body.localNumero,
      paciente: req.body.paciente,
      hora: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    db.tv_chamada = chamada;

    db.tv_historico.unshift(chamada);

    if (db.tv_historico.length > 5) {
      db.tv_historico = db.tv_historico.slice(0, 5);
    }

    writeDB(db);

    res.json(chamada);
  } catch (erro) {
    console.error("Erro ao chamar paciente:", erro);

    res.status(500).json({
      erro: "Erro ao realizar chamada"
    });
  }
});

// ======================================================
// TV - CONSULTAR CHAMADA
// ======================================================

app.get("/tv/chamada", (req, res) => {
  try {
    const db = readDB();

    res.json({
      chamada: db.tv_chamada,
      historico: db.tv_historico
    });
  } catch (erro) {
    console.error("Erro ao consultar TV:", erro);

    res.status(500).json({
      erro: "Erro ao consultar chamada"
    });
  }
});

// ======================================================
// LISTA DE MEDICAÇÕES
// ======================================================

app.get("/lista-medicacoes", (req, res) => {
  res.json([
    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"
  ]);
});

// ======================================================
// CONSULTA
// ======================================================

app.post("/consulta", (req, res) => {
  try {
    const db = readDB();

    const consulta = {
      id: Date.now(),
      paciente: req.body.paciente,
      diagnostico: req.body.diagnostico,
      medicacao: req.body.medicacao,
      obs: req.body.obs,
      createdAt: new Date().toISOString()
    };

    db.consultas.push(consulta);

    writeDB(db);

    res.json(consulta);
  } catch (erro) {
    console.error("Erro ao salvar consulta:", erro);

    res.status(500).json({
      erro: "Erro ao salvar consulta"
    });
  }
});

// ======================================================
// MEDICAÇÕES / CONSULTAS
// ======================================================

app.get("/medicacoes", (req, res) => {
  try {
    const db = readDB();

    res.json(db.consultas);
  } catch (erro) {
    console.error("Erro ao listar medicações:", erro);

    res.status(500).json({
      erro: "Erro ao listar medicações"
    });
  }
});

// ======================================================
// TRATAMENTO DE ERROS
// ======================================================

app.use((erro, req, res, next) => {
  console.error("Erro não tratado:", erro);

  res.status(500).json({
    erro: "Erro interno do servidor"
  });
});

// ======================================================
// VERCEL
// ======================================================

// IMPORTANTE:
// Não usar app.listen() na Vercel.
// A Vercel executa o Express como uma função.

module.exports = app;
```
