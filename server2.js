const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./glacier.db', (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the GLACIER mission database.");
        
        db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, firstName TEXT, middleInitial TEXT, lastName TEXT, email TEXT, phone TEXT)");
        
        db.run("CREATE TABLE IF NOT EXISTS cutters (name TEXT PRIMARY KEY, operation TEXT, status TEXT, last_updated TEXT, updated_by TEXT)", (err) => {
            if (!err) {
                db.get("SELECT count(*) as count FROM cutters", (err, row) => {
                    if (row && row.count === 0) {
                        const defaults = [
                            ['CGC MACKINAW', 'Operation TACONITE'], ['CGC SPAR', 'Operation TACONITE'],
                            ['CGC BISCAYNE BAY', 'Operation TACONITE'], ['CGC MOBILE BAY', 'Operation TACONITE'],
                            ['CGC KATMAI BAY', 'Operation COAL SHOVEL'], ['CGC NEAH BAY', 'Operation COAL SHOVEL'],
                            ['CGC BRISTOL BAY', 'Operation COAL SHOVEL']
                        ];
                        const stmt = db.prepare("INSERT INTO cutters (name, operation, status, last_updated, updated_by) VALUES (?, ?, 'No status reported', 'N/A', 'N/A')");
                        defaults.forEach(d => stmt.run(d));
                        stmt.finalize();
                    }
                });
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS vmrs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, submitter TEXT, vessel_name TEXT, 
            east_lansing TEXT, west_round TEXT, up_detour TEXT, down_whitefish TEXT, eta_sturgeon TEXT, 
            eta_rock TEXT, down_lhc TEXT, up_se_shoal TEXT, etd_erie_huron TEXT, etd_detroit TEXT, 
            ice_breaker TEXT, cargo TEXT, dest TEXT, add_info TEXT
        )`);

        db.run("CREATE TABLE IF NOT EXISTS commercial_vessels (name TEXT PRIMARY KEY, flag TEXT, type TEXT)");
    }
});

// --- AUTHENTICATION ROUTES ---
app.post('/register', (req, res) => {
    const { username, password, firstName, middleInitial, lastName, email, phone } = req.body;
    db.run("INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)", [username, password, firstName, middleInitial, lastName, email, phone], (err) => {
        if (err) return res.status(400).json({ success: false, message: 'Account already exists.' });
        res.json({ success: true, message: 'Account created!' });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) res.json({ success: true, user: { username: row.username, firstName: row.firstName, lastName: row.lastName } });
        else res.status(401).json({ success: false, message: 'Invalid credentials.' });
    });
});

// --- SYSTEM ROUTES ---
app.get('/accounts', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, accounts: rows });
    });
});

app.get('/commercial-vessels', (req, res) => {
    db.all("SELECT name FROM commercial_vessels ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, vessels: rows });
    });
});

app.post('/import-vessels', (req, res) => {
    const vessels = req.body.vessels;
    if (!vessels || !Array.isArray(vessels)) return res.status(400).json({ success: false });

    db.serialize(() => {
        db.run("DELETE FROM commercial_vessels"); 
        const stmt = db.prepare("INSERT OR IGNORE INTO commercial_vessels (name, flag, type) VALUES (?, ?, ?)");
        let addedCount = 0;
        vessels.forEach(v => {
            if (v.name) { stmt.run(v.name, v.flag, v.type); addedCount++; }
        });
        stmt.finalize();
        res.json({ success: true, count: addedCount });
    });
});

// --- CUTTER ROUTES ---
app.get('/cutters', (req, res) => {
    db.all("SELECT * FROM cutters ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, cutters: rows });
    });
});

app.post('/cutters/status', (req, res) => {
    const { vessel, status, currentUser } = req.body;
    
    // Generate clean Timestamp
    const now = new Date();
    const ts = String(now.getMonth()+1).padStart(2,'0') + "/" + String(now.getDate()).padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');
    
    db.run("UPDATE cutters SET status = ?, last_updated = ?, updated_by = ? WHERE name = ?", [status, ts, currentUser, vessel], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// UPDATED: Logs time and user for ALL operation reassignments (including OutChop)
app.post('/cutters/operation', (req, res) => {
    const { vessel, operation, currentUser } = req.body;
    
    // Generate clean Timestamp
    const now = new Date();
    const ts = String(now.getMonth()+1).padStart(2,'0') + "/" + String(now.getDate()).padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');
    
    // Fallback in case user is missing
    const userToLog = currentUser ? currentUser : "System";

    if (operation === "OutChop") {
        db.run("UPDATE cutters SET operation = ?, status = ?, last_updated = ?, updated_by = ? WHERE name = ?", 
            [operation, "OutChop", ts, userToLog, vessel], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    } else {
        db.run("UPDATE cutters SET operation = ?, last_updated = ?, updated_by = ? WHERE name = ?", 
            [operation, ts, userToLog, vessel], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    }
});

// --- VMR ROUTES ---
app.post('/vmrs', (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO vmrs (submitter, vessel_name, east_lansing, west_round, up_detour, down_whitefish, eta_sturgeon, eta_rock, down_lhc, up_se_shoal, etd_erie_huron, etd_detroit, ice_breaker, cargo, dest, add_info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    db.run(sql, [d.submitter, d.vesselName, d.eastLansing, d.westRound, d.upDetour, d.downWhitefish, d.etaSturgeon, d.etaRock, d.downLhc, d.upSeShoal, d.etdErieHuron, d.etdDetroit, d.iceBreaker, d.cargo, d.dest, d.addInfo], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
