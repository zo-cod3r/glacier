const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./glacier.db', (err) => {
    if (!err) {
        db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, firstName TEXT, middleInitial TEXT, lastName TEXT, email TEXT, phone TEXT)");
        db.run("CREATE TABLE IF NOT EXISTS cutters (name TEXT PRIMARY KEY, operation TEXT, status TEXT, last_updated TEXT, updated_by TEXT)", (err) => {
            if (!err) {
                db.get("SELECT count(*) as count FROM cutters", (err, row) => {
                    if (row && row.count === 0) {
                        const defaults = [['CGC MACKINAW', 'Operation TACONITE'], ['CGC SPAR', 'Operation TACONITE'], ['CGC BISCAYNE BAY', 'Operation TACONITE'], ['CGC MOBILE BAY', 'Operation TACONITE'], ['CGC KATMAI BAY', 'Operation COAL SHOVEL'], ['CGC NEAH BAY', 'Operation COAL SHOVEL'], ['CGC BRISTOL BAY', 'Operation COAL SHOVEL']];
                        const stmt = db.prepare("INSERT INTO cutters (name, operation, status, last_updated, updated_by) VALUES (?, ?, 'No status reported', 'N/A', 'N/A')");
                        defaults.forEach(d => stmt.run(d));
                        stmt.finalize();
                    }
                });
            }
        });
        db.run(`CREATE TABLE IF NOT EXISTS vmrs (id INTEGER PRIMARY KEY AUTOINCREMENT, submitter TEXT, vessel_name TEXT, east_lansing TEXT, west_round TEXT, up_detour TEXT, down_whitefish TEXT, eta_sturgeon TEXT, eta_rock TEXT, down_lhc TEXT, up_se_shoal TEXT, etd_erie_huron TEXT, etd_detroit TEXT, ice_breaker TEXT, cargo TEXT, dest TEXT, add_info TEXT)`);
    }
});

app.post('/register', (req, res) => {
    const { username, password, firstName, middleInitial, lastName, email, phone } = req.body;
    db.run("INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)", [username, password, firstName, middleInitial, lastName, email, phone], (err) => {
        if (err) res.status(400).json({ success: false }); else res.json({ success: true, message: 'Account created!' });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) res.json({ success: true, user: { username: row.username, firstName: row.firstName, lastName: row.lastName } });
        else res.status(401).json({ success: false, message: 'Invalid credentials.' });
    });
});

app.get('/accounts', (req, res) => {
    db.all("SELECT username, firstName, middleInitial, lastName, email, phone FROM users", [], (err, rows) => res.json({ success: true, accounts: rows }));
});

app.get('/cutters', (req, res) => {
    db.all("SELECT * FROM cutters ORDER BY name ASC", [], (err, rows) => res.json({ success: true, cutters: rows }));
});

app.post('/vmrs', (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO vmrs (submitter, vessel_name, east_lansing, west_round, up_detour, down_whitefish, eta_sturgeon, eta_rock, down_lhc, up_se_shoal, etd_erie_huron, etd_detroit, ice_breaker, cargo, dest, add_info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    db.run(sql, [d.submitter, d.vesselName, d.eastLansing, d.westRound, d.upDetour, d.downWhitefish, d.etaSturgeon, d.etaRock, d.downLhc, d.upSeShoal, d.etdErieHuron, d.etdDetroit, d.iceBreaker, d.cargo, d.dest, d.addInfo], (err) => {
        if (err) res.status(500).json({ success: false }); else res.json({ success: true });
    });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
