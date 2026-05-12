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
        
        db.run("CREATE TABLE IF NOT EXISTS cutters (name TEXT PRIMARY KEY, operation TEXT, status TEXT, op_updated TEXT, op_by TEXT, status_updated TEXT, status_by TEXT)", (err) => {
            if (!err) {
                db.get("SELECT count(*) as count FROM cutters", (err, row) => {
                    if (row && row.count === 0) {
                        const defaults = [
                            ['CGC MACKINAW', 'Operation TACONITE'], ['CGC SPAR', 'Operation TACONITE'],
                            ['CGC BISCAYNE BAY', 'Operation TACONITE'], ['CGC MOBILE BAY', 'Operation TACONITE'],
                            ['CGC KATMAI BAY', 'Operation COAL SHOVEL'], ['CGC NEAH BAY', 'Operation COAL SHOVEL'],
                            ['CGC BRISTOL BAY', 'Operation COAL SHOVEL']
                        ];
                        const stmt = db.prepare("INSERT INTO cutters (name, operation, status, op_updated, op_by, status_updated, status_by) VALUES (?, ?, 'No status reported', 'N/A', 'N/A', 'N/A', 'N/A')");
                        defaults.forEach(d => stmt.run(d));
                        stmt.finalize();
                    }
                });
            }
        });

        db.run("CREATE TABLE IF NOT EXISTS change_log (id INTEGER PRIMARY KEY AUTOINCREMENT, vessel TEXT, change_type TEXT, details TEXT, changed_by TEXT, timestamp TEXT)");

        db.run(`CREATE TABLE IF NOT EXISTS vmrs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, submitter TEXT, vessel_name TEXT, 
            east_lansing TEXT, west_round TEXT, up_detour TEXT, down_whitefish TEXT, eta_sturgeon TEXT, 
            eta_rock TEXT, down_lhc TEXT, up_se_shoal TEXT, etd_erie_huron TEXT, etd_detroit TEXT, 
            ice_breaker TEXT, cargo TEXT, dest TEXT, add_info TEXT
        )`);

        db.run("CREATE TABLE IF NOT EXISTS commercial_vessels (name TEXT PRIMARY KEY, flag TEXT, type TEXT)");

        db.run(`CREATE TABLE IF NOT EXISTS underway_hours (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            submitter TEXT, 
            cutter TEXT, 
            event_date TEXT, 
            location TEXT, 
            hour_type TEXT, 
            hours REAL
        )`);

        // Safely add timestamp column if it doesn't already exist (No need to delete DB)
        db.run("ALTER TABLE underway_hours ADD COLUMN timestamp TEXT", (err) => {
            // Ignored if column already exists
        });
    }
});

// --- AUTH ---
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

// --- SYSTEM ---
app.get('/accounts', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, accounts: rows });
    });
});

app.get('/commercial-vessels', (req, res) => {
    db.all("SELECT name FROM commercial_vessels ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, vessels: rows });
    });
});

// --- CUTTERS ---
app.get('/cutters', (req, res) => {
    db.all("SELECT * FROM cutters ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, cutters: rows });
    });
});

app.post('/cutters/status', (req, res) => {
    const { vessel, status, currentUser } = req.body;
    const now = new Date();
    const ts = String(now.getMonth()+1).padStart(2,'0') + "/" + String(now.getDate()).padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');
    const userToLog = currentUser || "System";

    db.run("UPDATE cutters SET status = ?, status_updated = ?, status_by = ? WHERE name = ?", [status, ts, userToLog, vessel], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Status Update', ?, ?, ?)", [vessel, status, userToLog, ts]);
        res.json({ success: true });
    });
});

app.post('/cutters/operation', (req, res) => {
    const { vessel, operation, currentUser } = req.body;
    const now = new Date();
    const ts = String(now.getMonth()+1).padStart(2,'0') + "/" + String(now.getDate()).padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');
    const userToLog = currentUser || "System";

    if (operation === "OutChop") {
        db.run("UPDATE cutters SET operation = ?, status = ?, op_updated = ?, op_by = ?, status_updated = ?, status_by = ? WHERE name = ?", 
            [operation, "OutChop", ts, userToLog, ts, userToLog, vessel], (err) => {
            if (err) return res.status(500).json({ success: false });
            db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Reassigned', 'Moved to OutChop', ?, ?)", [vessel, userToLog, ts]);
            res.json({ success: true });
        });
    } else {
        db.run("UPDATE cutters SET operation = ?, status = 'No status reported', op_updated = ?, op_by = ?, status_updated = 'N/A', status_by = 'N/A' WHERE name = ?", 
            [operation, ts, userToLog, vessel], (err) => {
            if (err) return res.status(500).json({ success: false });
            db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Reassigned', ?, ?, ?)", [vessel, `Assigned to ${operation}`, userToLog, ts]);
            res.json({ success: true });
        });
    }
});

app.get('/changelog', (req, res) => {
    db.all("SELECT * FROM change_log ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, logs: rows });
    });
});

// --- VMRS ---
app.post('/vmrs', (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO vmrs (submitter, vessel_name, east_lansing, west_round, up_detour, down_whitefish, eta_sturgeon, eta_rock, down_lhc, up_se_shoal, etd_erie_huron, etd_detroit, ice_breaker, cargo, dest, add_info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    
    db.run(sql, [d.submitter, d.vesselName, d.eastLansing, d.westRound, d.upDetour, d.downWhitefish, d.etaSturgeon, d.etaRock, d.downLhc, d.upSeShoal, d.etdErieHuron, d.etdDetroit, d.iceBreaker, d.cargo, d.dest, d.addInfo], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/vmrs/:user', (req, res) => {
    const user = req.params.user;
    db.all("SELECT * FROM vmrs WHERE submitter = ? ORDER BY id DESC", [user], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, reports: rows });
    });
});

// --- UNDERWAY HOURS ---
app.post('/underway-hours', (req, res) => {
    const d = req.body;
    const now = new Date();
    const ts = String(now.getMonth()+1).padStart(2,'0') + "/" + String(now.getDate()).padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');

    const sql = `INSERT INTO underway_hours (submitter, cutter, event_date, location, hour_type, hours, timestamp) VALUES (?,?,?,?,?,?,?)`;
    
    db.run(sql, [d.submitter, d.cutter, d.eventDate, d.location, d.hourType, d.hours, ts], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/underway-hours', (req, res) => {
    db.all("SELECT * FROM underway_hours", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, hours: rows });
    });
});

// --- SERVER INIT ---
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
