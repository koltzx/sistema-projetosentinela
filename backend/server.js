const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

// Serve os arquivos do frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Banco de dados JSON
const DB_FILE = path.join(__dirname, "db.json");

// Estrutura inicial do banco
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

// Ler banco
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const dbInicial = criarDBInicial();

      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(dbInicial, null, 2),
        "utf8"
      );

      return dbInicial;
    }

    const conteudo = fs.readFileSync(DB_FILE, "utf8").trim();

    if (!conteudo) {
      const dbInicial = criarDBInicial();

      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(dbInicial, null, 2),
        "utf8"
      );

      return dbInicial;
    }

    const db = JSON.parse(conteudo);

    // Garante que todas as propriedades existam
    if (!Array.isArray(db.usuarios)) db.usuarios = [];
    if (!Array.isArray(db.pacientes)) db.pacientes = [];
    if (!Array.isArray(db.triagens)) db.triagens = [];
    if (!Array.isArray(db.consultas)) db.consultas = [];

    if (!("tv_chamada" in db)) {
      db.tv_chamada = null;
    }

    if (!Array.isArray(db.tv_historico)) {
      db.tv_historico = [];
    }

    return db;
  } catch (erro) {
    console.error("Erro ao ler db.json:", erro);

    return criarDBInicial();
  }
}

// Salvar banco
function writeDB(data) {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (erro) {
    console.error("Erro ao salvar db.json:", erro);
    throw erro;
  }
}

// ======================================================
// TESTE DA API
// ======================================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API funcionando corretamente"
  });
});

// ======================================================
// LOGIN
// ======================================================

app.post("/login", (req, res) => {
  try {
    const db = readDB();

    const { usuario, senha } = req.body;

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
// ATENDIMENTO - CADASTRAR PACIENTE
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
    console.error("Erro ao cadastrar paciente:", erro);

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
      temperatura: temperatura,
      alergia: req.body.alergia,
      observacao: req.body.observacao,
      risco: risco,
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
// MÍDIA INDOOR - TV
// ======================================================

// Chamar paciente na TV
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

    // Mantém apenas as últimas 5 chamadas
    if (db.tv_historico.length > 5) {
      db.tv_historico = db.tv_historico.slice(0, 5);
    }

    writeDB(db);

    res.json(chamada);
  } catch (erro) {
    console.error("Erro ao chamar paciente na TV:", erro);

    res.status(500).json({
      erro: "Erro ao realizar chamada"
    });
  }
});

// Consultar chamada atual da TV
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
      erro: "Erro ao consultar chamada da TV"
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
// CONSULTA MÉDICA
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
// LISTAR CONSULTAS / MEDICAÇÕES
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

app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);

  res.status(500).json({
    erro: "Erro interno do servidor"
  });
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================

// IMPORTANTE:
// O Render fornece a porta através de process.env.PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
