const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Conecta a pasta "public" para mostrar o HTML
app.use(express.static(__dirname));

// Cria e conecta o banco de dados
const db = new sqlite3.Database('./fila.db', (err) => {
    if (err) console.error(err.message);
    else console.log("Banco de dados conectado.");
});

// Cria a tabela da fila
db.run(`CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'waiting'
)`);

// Rota para ler a fila
app.get('/api/queue', (req, res) => {
    db.all(`SELECT * FROM queue WHERE status = 'waiting' ORDER BY id ASC`, [], (err, waitingList) => {
        db.get(`SELECT * FROM queue WHERE status = 'called' ORDER BY id DESC LIMIT 1`, [], (err, lastCalled) => {
            res.json({ waiting: waitingList, currentlyCalling: lastCalled ? lastCalled.id : null });
        });
    });
});

// Rota para entrar na fila
app.post('/api/join', (req, res) => {
    db.run(`INSERT INTO queue (name, status) VALUES (?, 'waiting')`, [req.body.name], function(err) {
        res.json({ ticketId: this.lastID, name: req.body.name, status: 'waiting' });
    });
});

// Rota para chamar o próximo
app.post('/api/call', (req, res) => {
    db.get(`SELECT id FROM queue WHERE status = 'waiting' ORDER BY id ASC LIMIT 1`, [], (err, row) => {
        if (!row) return res.status(400).json({ message: "Fila vazia" });
        db.run(`UPDATE queue SET status = 'called' WHERE id = ?`, [row.id], () => {
            res.json({ message: "Chamado", ticketId: row.id });
        });
    });
});

// Rota para limpar tudo
app.post('/api/reset', (req, res) => {
    db.run(`DELETE FROM queue`, () => {
        db.run(`DELETE FROM sqlite_sequence WHERE name='queue'`); // Reseta os números
        res.json({ message: "Resetado" });
    });
});

// Inicia o servidor
// ... suas rotas da API aqui em cima ...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});