const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./glacier.db', (err) => {
    if (!err) {
        db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, firstName TEXT, lastName TEXT)");
        db.run(`CREATE TABLE IF NOT EXISTS vmrs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, submitter TEXT, vessel_name TEXT, 
            east_lansing TEXT, west_round TEXT, up_detour TEXT, down_whitefish TEXT, eta_sturgeon TEXT, 
            eta_rock TEXT, down_lhc TEXT, up_se_shoal TEXT, etd_erie_huron TEXT, etd_detroit TEXT, 
            ice_breaker TEXT, cargo TEXT, dest TEXT, add_info TEXT
        )`);
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) res.json({ success: true, user: row });
        else res.status(401).json({ success: false });
    });
});

app.post('/vmrs', (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO vmrs (submitter, vessel_name, east_lansing, west_round, up_detour, down_whitefish, eta_sturgeon, eta_rock, down_lhc, up_se_shoal, etd_erie_huron, etd_detroit, ice_breaker, cargo, dest, add_info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [d.submitter, d.vesselName, d.eastLansing, d.westRound, d.upDetour, d.downWhitefish, d.etaSturgeon, d.etaRock, d.downLhc, d.upSeShoal, d.etdErieHuron, d.etdDetroit, d.iceBreaker, d.cargo, d.dest, d.addInfo];
    db.run(sql, params, (err) => {
        if (err) res.status(500).json({ success: false });
        else res.json({ success: true });
    });
});

app.listen(3000, () => console.log("Server running on port 3000"));
