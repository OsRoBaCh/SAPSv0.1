import Database from 'better-sqlite3';
import path from 'path';

let _db: any = null;

function getDb() {
  if (!_db) {
    try {
      const dbPath = path.join(process.cwd(), 'saps.db');
      _db = new Database(dbPath);
      _db.pragma('journal_mode = WAL');
      _db.pragma('foreign_keys = ON');
    } catch (err) {
      console.error('Failed to initialize database:', err);
      throw err;
    }
  }
  return _db;
}

const db = getDb();

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS categoria (
      uuidCategoria TEXT PRIMARY KEY,
      nomeCategoria TEXT NOT NULL UNIQUE,
      descricao TEXT,
      precoBase REAL NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS utilizador (
      uuidUtilizador TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      senhaHash TEXT NOT NULL,
      nomeCompleto TEXT NOT NULL,
      nTelefone TEXT NOT NULL,
      tipoUtilizador TEXT NOT NULL,
      estadoConta TEXT NOT NULL DEFAULT 'Ativo',
      biometriaHabilitada INTEGER NOT NULL DEFAULT 0,
      biometriaCredentialId TEXT,
      biometriaPublicKey TEXT,
      resetToken TEXT,
      resetTokenExpires TEXT,
      dataCadastro TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cliente (
      uuidUtilizador TEXT PRIMARY KEY,
      preferencia TEXT,
      FOREIGN KEY(uuidUtilizador) REFERENCES utilizador(uuidUtilizador) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS prestador (
      uuidUtilizador TEXT PRIMARY KEY,
      lat REAL,
      lon REAL,
      raioCobertura INTEGER NOT NULL DEFAULT 10,
      estado TEXT NOT NULL DEFAULT 'Em Serviço',
      classificacao REAL NOT NULL DEFAULT 0,
      nContaBancaria TEXT,
      saldo REAL NOT NULL DEFAULT 0,
      portfolio TEXT,
      bio TEXT,
      urlBilheteIdentidade TEXT,
      urlRegistoCriminal TEXT,
      urlCertificadoFormacao TEXT,
      FOREIGN KEY(uuidUtilizador) REFERENCES utilizador(uuidUtilizador) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transacao (
      uuidTransacao TEXT PRIMARY KEY,
      uuidPrestador TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('Ganho', 'Levantamento')),
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      descricao TEXT,
      estado TEXT NOT NULL DEFAULT 'Concluido',
      FOREIGN KEY(uuidPrestador) REFERENCES prestador(uuidUtilizador) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tarifa_prestador (
      uuidTarifa TEXT PRIMARY KEY,
      uuidPrestador TEXT NOT NULL,
      uuidCategoria TEXT NOT NULL,
      precoBase REAL NOT NULL,
      precoHora REAL,
      unidadeCobranca TEXT NOT NULL DEFAULT 'Fixo',
      ativo INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(uuidPrestador) REFERENCES prestador(uuidUtilizador) ON DELETE CASCADE,
      FOREIGN KEY(uuidCategoria) REFERENCES categoria(uuidCategoria),
      UNIQUE (uuidPrestador, uuidCategoria)
  );

  CREATE TABLE IF NOT EXISTS solicitacao (
      uuidSolicitacao TEXT PRIMARY KEY,
      uuidCliente TEXT NOT NULL,
      uuidPrestador TEXT,
      uuidCategoria TEXT NOT NULL,
      uuidTarifa TEXT,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      descricaoProblema TEXT NOT NULL,
      tipoAtendimento TEXT NOT NULL DEFAULT 'Imediato',
      dataProgramada TEXT NOT NULL,
      duracaoEstimadaHoras REAL,
      dataInicio TEXT,
      dataFim TEXT,
      complexidade TEXT NOT NULL DEFAULT 'Normal',
      zonaAtendimento TEXT NOT NULL DEFAULT 'Centro',
      precoFinal REAL NOT NULL DEFAULT 0,
      referenciaPagamento TEXT,
      pagamentoConfirmado INTEGER NOT NULL DEFAULT 0,
      estadoSolicitacao TEXT NOT NULL DEFAULT 'Pendente',
      dataCriacao TEXT NOT NULL,
      FOREIGN KEY(uuidCliente) REFERENCES cliente(uuidUtilizador),
      FOREIGN KEY(uuidPrestador) REFERENCES prestador(uuidUtilizador),
      FOREIGN KEY(uuidCategoria) REFERENCES categoria(uuidCategoria),
      FOREIGN KEY(uuidTarifa) REFERENCES tarifa_prestador(uuidTarifa)
  );

  CREATE TABLE IF NOT EXISTS avaliacao (
      uuidAvaliacao TEXT PRIMARY KEY,
      uuidSolicitacao TEXT NOT NULL,
      pontuacao INTEGER NOT NULL CHECK (pontuacao BETWEEN 1 AND 5),
      comentario TEXT,
      tipoAutor TEXT NOT NULL CHECK (tipoAutor IN ('C','P')),
      dataAvaliacao TEXT NOT NULL,
      FOREIGN KEY(uuidSolicitacao) REFERENCES solicitacao(uuidSolicitacao),
      UNIQUE (uuidSolicitacao, tipoAutor)
  );

  CREATE TABLE IF NOT EXISTS notificacao (
      uuidNotificacao TEXT PRIMARY KEY,
      uuidUtilizador TEXT NOT NULL,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      lida INTEGER NOT NULL DEFAULT 0,
      dataCriacao TEXT NOT NULL,
      FOREIGN KEY(uuidUtilizador) REFERENCES utilizador(uuidUtilizador) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rejeicao_solicitacao (
      uuidRejeicao TEXT PRIMARY KEY,
      uuidSolicitacao TEXT NOT NULL,
      uuidPrestador TEXT NOT NULL,
      dataRejeicao TEXT NOT NULL,
      FOREIGN KEY(uuidSolicitacao) REFERENCES solicitacao(uuidSolicitacao) ON DELETE CASCADE,
      FOREIGN KEY(uuidPrestador) REFERENCES prestador(uuidUtilizador) ON DELETE CASCADE,
      UNIQUE(uuidSolicitacao, uuidPrestador)
  );

  CREATE TABLE IF NOT EXISTS log_sistema (
      uuidLog TEXT PRIMARY KEY,
      uuidUtilizador TEXT,
      acao TEXT NOT NULL,
      detalhes TEXT,
      data TEXT NOT NULL,
      FOREIGN KEY(uuidUtilizador) REFERENCES utilizador(uuidUtilizador)
  );

  CREATE TABLE IF NOT EXISTS configuracao_sistema (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      descricao TEXT
  );

  CREATE TABLE IF NOT EXISTS conta_bancaria_plataforma (
      uuidConta TEXT PRIMARY KEY,
      banco TEXT NOT NULL,
      iban TEXT NOT NULL,
      titular TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS conta_bancaria_prestador (
      uuidConta TEXT PRIMARY KEY,
      uuidPrestador TEXT NOT NULL,
      banco TEXT NOT NULL,
      iban TEXT NOT NULL,
      titular TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(uuidPrestador) REFERENCES prestador(uuidUtilizador) ON DELETE CASCADE
  );

  -- Default settings
  INSERT OR IGNORE INTO configuracao_sistema (chave, valor, descricao) VALUES ('comissao_plataforma', '0.15', 'Percentagem de comissão da plataforma (0.15 = 15%)');
  INSERT OR IGNORE INTO configuracao_sistema (chave, valor, descricao) VALUES ('nome_plataforma', 'SAPS Angola', 'Nome oficial da plataforma');
  INSERT OR IGNORE INTO configuracao_sistema (chave, valor, descricao) VALUES ('iban_plataforma', 'AO06 0000 0000 0000 0000 0', 'IBAN para recebimento de pagamentos dos clientes');

  -- Default bank accounts
  INSERT OR IGNORE INTO conta_bancaria_plataforma (uuidConta, banco, iban, titular, ativo) VALUES ('acc-1', 'BAI', 'AO06 0040 0000 1234 5678 1012 3', 'SAPS ANGOLA LDA', 1);
  INSERT OR IGNORE INTO conta_bancaria_plataforma (uuidConta, banco, iban, titular, ativo) VALUES ('acc-2', 'BFA', 'AO06 0006 0000 9876 5432 1098 7', 'SAPS ANGOLA LDA', 1);
  INSERT OR IGNORE INTO conta_bancaria_plataforma (uuidConta, banco, iban, titular, ativo) VALUES ('acc-3', 'BIC', 'AO06 0011 0000 5555 4444 3333 2', 'SAPS ANGOLA LDA', 1);
`);

try {
  db.exec("ALTER TABLE utilizador ADD COLUMN estadoConta TEXT NOT NULL DEFAULT 'Ativo'");
} catch (e) {}

try {
  db.exec("ALTER TABLE utilizador ADD COLUMN biometriaHabilitada INTEGER NOT NULL DEFAULT 0");
  db.exec("ALTER TABLE utilizador ADD COLUMN biometriaCredentialId TEXT");
  db.exec("ALTER TABLE utilizador ADD COLUMN biometriaPublicKey TEXT");
  db.exec("ALTER TABLE utilizador ADD COLUMN resetToken TEXT");
  db.exec("ALTER TABLE utilizador ADD COLUMN resetTokenExpires TEXT");
} catch (e) {}

// Simple migrations for existing tables
try {
  db.exec('ALTER TABLE prestador ADD COLUMN saldo REAL NOT NULL DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE categoria ADD COLUMN precoBase REAL NOT NULL DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE solicitacao ADD COLUMN complexidade TEXT NOT NULL DEFAULT 'Normal'");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE solicitacao ADD COLUMN precoFinal REAL NOT NULL DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE solicitacao ADD COLUMN referenciaPagamento TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE solicitacao ADD COLUMN pagamentoConfirmado INTEGER NOT NULL DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE solicitacao ADD COLUMN zonaAtendimento TEXT NOT NULL DEFAULT 'Centro'");
} catch (e) {}

try {
  db.exec("ALTER TABLE solicitacao ADD COLUMN iaJustificativaPreco TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE prestador ADD COLUMN urlBilheteIdentidade TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE prestador ADD COLUMN urlRegistoCriminal TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE prestador ADD COLUMN urlCertificadoFormacao TEXT");
} catch (e) {}

// Seed data if empty
const count = db.prepare('SELECT COUNT(*) as count FROM categoria').get() as { count: number };
if (count.count === 0) {
  const insertCategoria = db.prepare('INSERT INTO categoria (uuidCategoria, nomeCategoria, descricao, precoBase) VALUES (?, ?, ?, ?)');
  insertCategoria.run('cat-1', 'Canalização', 'Serviços de reparação de canos, fugas de água e instalação de sanitários.', 8000.00);
  insertCategoria.run('cat-2', 'Eletricidade', 'Manutenção elétrica, reparação de curto-circuitos e novas instalações.', 10000.00);
  insertCategoria.run('cat-3', 'Limpeza', 'Limpeza profunda ou regular de espaços residenciais e comerciais.', 5000.00);
  insertCategoria.run('cat-4', 'Mecânica', 'Reparação de veículos, mudança de óleo e diagnóstico de avarias.', 15000.00);
  insertCategoria.run('cat-5', 'Climatização', 'Instalação e reparação de ar condicionado e sistemas de ventilação.', 12000.00);

  const insertUtilizador = db.prepare('INSERT INTO utilizador (uuidUtilizador, email, senhaHash, nomeCompleto, nTelefone, tipoUtilizador, dataCadastro) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertUtilizador.run('client-1', 'cliente@saps.com', 'clienthash', 'João Cliente', '912345678', 'Cliente', new Date().toISOString());
  insertUtilizador.run('provider-1', 'prestador@saps.com', 'providerhash', 'Maria Prestadora', '987654321', 'Prestador', new Date().toISOString());
  insertUtilizador.run('admin-1', 'admin@saps.com', 'adminhash', 'Administrador SAPS', '900000000', 'Admin', new Date().toISOString());
  insertUtilizador.run('guest-id', 'visitante@saps.com', 'guesthash', 'Visitante', '000000000', 'Cliente', new Date().toISOString());

  const insertCliente = db.prepare('INSERT INTO cliente (uuidUtilizador, preferencia) VALUES (?, ?)');
  insertCliente.run('client-1', 'Nenhuma');
  insertCliente.run('guest-id', 'Nenhuma');

  const insertPrestador = db.prepare('INSERT INTO prestador (uuidUtilizador, lat, lon, raioCobertura, estado, classificacao, bio) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertPrestador.run('provider-1', 38.7223, -9.1393, 20, 'Em Serviço', 4.8, 'Especialista em canalização e eletricidade.');

  const insertTarifa = db.prepare('INSERT INTO tarifa_prestador (uuidTarifa, uuidPrestador, uuidCategoria, precoBase, unidadeCobranca) VALUES (?, ?, ?, ?, ?)');
  insertTarifa.run('tarifa-1', 'provider-1', 'cat-1', 50, 'Fixo');
  insertTarifa.run('tarifa-2', 'provider-1', 'cat-2', 40, 'Hora');
} else {
  // Update existing prices to be lower
  db.prepare("UPDATE categoria SET precoBase = 5000.00 WHERE uuidCategoria = 'cat-1'").run();
  db.prepare("UPDATE categoria SET precoBase = 5600.00 WHERE uuidCategoria = 'cat-2'").run();
  db.prepare("UPDATE categoria SET precoBase = 5000.00 WHERE uuidCategoria = 'cat-3'").run();
  db.prepare("UPDATE categoria SET precoBase = 7500.00 WHERE uuidCategoria = 'cat-4'").run();
  db.prepare("UPDATE categoria SET precoBase = 6500.00 WHERE uuidCategoria = 'cat-5'").run();
}

// Ensure Admin user exists
const adminExists = db.prepare("SELECT COUNT(*) as count FROM utilizador WHERE email = 'admin@saps.com'").get() as { count: number };
if (adminExists.count === 0) {
  db.prepare('INSERT INTO utilizador (uuidUtilizador, email, senhaHash, nomeCompleto, nTelefone, tipoUtilizador, dataCadastro) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('admin-1', 'admin@saps.com', 'adminhash', 'Administrador SAPS', '924544340', 'Admin', new Date().toISOString());
}

// Promote user email to Admin if exists
db.prepare("UPDATE utilizador SET tipoUtilizador = 'Admin' WHERE email = 'orchicomo@gmail.com'").run();

export default db;
