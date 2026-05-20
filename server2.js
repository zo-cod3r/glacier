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
                            ['CGC BRISTOL BAY', 'Operation COAL SHOVEL'], ['CGC MORRO BAY', 'Operation COAL SHOVEL']
                        ];
                        const stmt = db.prepare("INSERT INTO cutters (name, operation, status, op_updated, op_by, status_updated, status_by) VALUES (?, ?, 'No status reported', 'N/A', 'N/A', 'N/A', 'N/A')");
                        defaults.forEach(d => stmt.run(d));
                        stmt.finalize();
                    }
                });
            }
        });

        db.run("CREATE TABLE IF NOT EXISTS locations (name TEXT PRIMARY KEY, operation TEXT, area TEXT)", (err) => {
            if (!err) {
                db.get("SELECT count(*) as count FROM locations", (err, row) => {
                    if (row && row.count === 0) {
                        const defaultLocs = [
                            ["Thunder Bay, MI", "Operation TACONITE", "Area 8C (West Superior, Thunder Bay)"],
                            ["Straits of Mackinac", "Operation TACONITE", "Area 5A (Straits)"],
                            ["Lake Huron", "Operation TACONITE", "Area 4 (Lake Huron, Georgian Bay)"],
                            ["Green Bay", "Operation TACONITE", "Area 9 (Green Bay, Escanaba)"],
                            ["Lake Michigan", "Operation TACONITE", "Unassigned"],
                            ["St. Marys River", "Operation TACONITE", "Area 6B (St Mary’s River)"],
                            ["Georgian Bay", "Operation TACONITE", "Area 4 (Lake Huron, Georgian Bay)"],
                            ["North Channel", "Operation TACONITE", "Unassigned"],
                            ["Alpena", "Operation TACONITE", "Unassigned"],
                            ["Cheboygan", "Operation TACONITE", "Unassigned"],
                            ["Charlevoix", "Operation TACONITE", "Unassigned"],
                            ["Grand Traverse Bay", "Operation TACONITE", "Area 5B (Traverse Bay)"],
                            ["Whitefish Bay", "Operation TACONITE", "Area 6A (Whitefish Bay)"],
                            ["Eastern Lake Superior", "Operation TACONITE", "Unassigned"],
                            ["Marquette", "Operation TACONITE", "Unassigned"],
                            ["Central Lake Superior", "Operation TACONITE", "Unassigned"],
                            ["Keweenaw", "Operation TACONITE", "Unassigned"],
                            ["Duluth, Superior", "Operation TACONITE", "Area 8A (Duluth, Superior)"],
                            ["Western Lake Superior", "Operation TACONITE", "Area 8C (West Superior, Thunder Bay)"],
                            ["Two Harbors", "Operation TACONITE", "Area 8B (Two Harbors)"],
                            ["Silver Bay", "Operation TACONITE", "Unassigned"],
                            ["Apostle Islands", "Operation TACONITE", "Unassigned"],
                            ["Thunder Bay, ON", "Operation TACONITE", "Area 8C (West Superior, Thunder Bay)"],
                            ["Escanaba", "Operation TACONITE", "Area 9 (Green Bay, Escanaba)"],
                            ["Marinette", "Operation TACONITE", "Unassigned"],
                            ["Lake Michigan-West Milwaukee", "Operation TACONITE", "Unassigned"],
                            ["Lake Michigan-South Calumet-Gary-Indiana Harbor", "Operation TACONITE", "Area 10B (Southern Lake Michigan)"],
                            ["Lake Michigan-East Ludington", "Operation TACONITE", "Unassigned"],
                            ["Eastern Lake Erie", "Operation COAL SHOVEL", "Area 1 (Eastern Lake Erie)"],
                            ["Pelle Pass", "Operation COAL SHOVEL", "Area 2A (Pelee Pass)"],
                            ["Western Lake Erie", "Operation COAL SHOVEL", "Area 2B (Western Lake Erie, Maumee Bay)"],
                            ["Maumee Bay", "Operation COAL SHOVEL", "Area 2B (Western Lake Erie, Maumee Bay)"],
                            ["Detroit River", "Operation COAL SHOVEL", "Area 3A (Detroit River)"],
                            ["Lake St. Clair", "Operation COAL SHOVEL", "Area 3B (Lake St. Clair, St. Clair River)"],
                            ["St. Clair River", "Operation COAL SHOVEL", "Area 3B (Lake St. Clair, St. Clair River)"]
                        ];
                        const stmt = db.prepare("INSERT INTO locations (name, operation, area) VALUES (?, ?, ?)");
                        defaultLocs.forEach(d => stmt.run(d));
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
            ice_breaker TEXT, cargo TEXT, dest TEXT, add_info TEXT, timestamp TEXT, deleted INTEGER DEFAULT 0
        )`);
        
        db.run("CREATE TABLE IF NOT EXISTS commercial_vessels (name TEXT PRIMARY KEY, flag TEXT, type TEXT)", (err) => {
            if (!err) {
                db.get("SELECT count(*) as count FROM commercial_vessels", (err, row) => {
                    if (row && row.count === 0) {
                        const defaultVessels = [
                            ['M/V PAUL R. TREGURTHA', 'USA', 'Bulk'],
                            ['M/V EDGAR B. SPEER', 'USA', 'Bulk'],
                            ['M/V JAMES R. BARKER', 'USA', 'Bulk'],
                            ['M/V MESABI MINER', 'USA', 'Bulk'],
                            ['M/V LEE A. TREGURTHA', 'USA', 'Bulk']
                        ];
                        const stmt = db.prepare("INSERT INTO commercial_vessels (name, flag, type) VALUES (?, ?, ?)");
                        defaultVessels.forEach(d => stmt.run(d));
                        stmt.finalize();
                    }
                });
            }
        });
        
        db.run(`CREATE TABLE IF NOT EXISTS underway_hours (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            submitter TEXT, cutter TEXT, event_date TEXT, location TEXT, 
            hour_type TEXT, hours REAL, timestamp TEXT, deleted INTEGER DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ice_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submitter TEXT, date_observed TEXT, location_aor TEXT, location_segment TEXT,
            lower_range REAL, upper_range REAL, concentration INTEGER, ice_type TEXT, 
            timestamp TEXT, deleted INTEGER DEFAULT 0
        )`);

        // Safely add columns if they don't exist (for existing databases)
        db.run("ALTER TABLE ice_reports ADD COLUMN deleted INTEGER DEFAULT 0", (err) => { /* Ignored if exists */ });
        db.run("ALTER TABLE underway_hours ADD COLUMN deleted INTEGER DEFAULT 0", (err) => { /* Ignored if exists */ });
        db.run("ALTER TABLE vmrs ADD COLUMN timestamp TEXT", (err) => { /* Ignored if exists */ });
        db.run("ALTER TABLE vmrs ADD COLUMN deleted INTEGER DEFAULT 0", (err) => { /* Ignored if exists */ });
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

app.post('/cutters/manage', (req, res) => {
    const { name, operation, currentUser } = req.body;
    const user = currentUser || "System";
    const ts = String(new Date().getMonth()+1).padStart(2,'0') + "/" + String(new Date().getDate()).padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + String(new Date().getHours()).padStart(2,'0') + ":" + String(new Date().getMinutes()).padStart(2,'0');
    
    const sql = "INSERT INTO cutters (name, operation, status, op_updated, op_by, status_updated, status_by) VALUES (?, ?, 'No status reported', 'N/A', 'N/A', 'N/A', 'N/A')";
    db.run(sql, [name.toUpperCase(), operation], (err) => {
        if (err) return res.status(400).json({ success: false, message: "Cutter already exists." });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Asset Added', ?, ?, ?)", [name.toUpperCase(), `Added to ${operation}`, user, ts]);
        res.json({ success: true });
    });
});

app.delete('/cutters/:name', (req, res) => {
    const name = req.params.name;
    const user = req.query.user || "System";
    const ts = String(new Date().getMonth()+1).padStart(2,'0') + "/" + String(new Date().getDate()).padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + String(new Date().getHours()).padStart(2,'0') + ":" + String(new Date().getMinutes()).padStart(2,'0');
    db.run("DELETE FROM cutters WHERE name = ?", [name], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Asset Removed', 'Removed from fleet', ?, ?)", [name, user, ts]);
        res.json({ success: true });
    });
});

// --- LOCATIONS ---
app.get('/locations', (req, res) => {
    db.all("SELECT * FROM locations ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, locations: rows });
    });
});

app.post('/locations/manage', (req, res) => {
    const { name, operation, area, currentUser } = req.body;
    const user = currentUser || "System";
    const ts = String(new Date().getMonth()+1).padStart(2,'0') + "/" + String(new Date().getDate()).padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + String(new Date().getHours()).padStart(2,'0') + ":" + String(new Date().getMinutes()).padStart(2,'0');
    const sql = `INSERT INTO locations (name, operation, area) VALUES (?, ?, ?) 
                 ON CONFLICT(name) DO UPDATE SET operation=excluded.operation, area=excluded.area`;
    db.run(sql, [name, operation, area], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Location Update', ?, ?, ?)", [name, `Mapped to ${operation} / ${area}`, user, ts]);
        res.json({ success: true });
    });
});

app.delete('/locations/:name', (req, res) => {
    const name = req.params.name;
    const user = req.query.user || "System";
    const ts = String(new Date().getMonth()+1).padStart(2,'0') + "/" + String(new Date().getDate()).padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + String(new Date().getHours()).padStart(2,'0') + ":" + String(new Date().getMinutes()).padStart(2,'0');
    db.run("DELETE FROM locations WHERE name = ?", [name], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Location Removed', 'Removed from database', ?, ?)", [name, user, ts]);
        res.json({ success: true });
    });
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
    const ts = String(new Date().getMonth()+1).padStart(2,'0') + "/" + String(new Date().getDate()).padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + String(new Date().getHours()).padStart(2,'0') + ":" + String(new Date().getMinutes()).padStart(2,'0');
    const sql = `INSERT INTO vmrs (submitter, vessel_name, east_lansing, west_round, up_detour, down_whitefish, eta_sturgeon, eta_rock, down_lhc, up_se_shoal, etd_erie_huron, etd_detroit, ice_breaker, cargo, dest, add_info, timestamp, deleted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`;
    db.run(sql, [d.submitter, d.vesselName, d.eastLansing, d.westRound, d.upDetour, d.downWhitefish, d.etaSturgeon, d.etaRock, d.downLhc, d.upSeShoal, d.etdErieHuron, d.etdDetroit, d.iceBreaker, d.cargo, d.dest, d.addInfo, ts], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/vmrs/:user', (req, res) => {
    const user = req.params.user;
    // We intentionally return deleted records here so the UI can render them crossed out.
    db.all("SELECT * FROM vmrs WHERE submitter = ? ORDER BY id DESC", [user], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, reports: rows });
    });
});

app.delete('/vmrs/:id', (req, res) => {
    db.run("UPDATE vmrs SET deleted = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// --- UNDERWAY HOURS ---
app.post('/underway-hours', (req, res) => {
    const d = req.body;
    const ts = String(new Date().getMonth()+1).padStart(2,'0') + "/" + String(new Date().getDate()).padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + String(new Date().getHours()).padStart(2,'0') + ":" + String(new Date().getMinutes()).padStart(2,'0');
    const sql = `INSERT INTO underway_hours (submitter, cutter, event_date, location, hour_type, hours, timestamp, deleted) VALUES (?,?,?,?,?,?,?,0)`;
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

app.delete('/underway-hours/:id', (req, res) => {
    db.run("UPDATE underway_hours SET deleted = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// --- ICE REPORTING ---
app.post('/ice-reports', (req, res) => {
    const d = req.body;
    const ts = String(new Date().getMonth()+1).padStart(2,'0') + "/" + String(new Date().getDate()).padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + String(new Date().getHours()).padStart(2,'0') + ":" + String(new Date().getMinutes()).padStart(2,'0');
    const sql = `INSERT INTO ice_reports (submitter, date_observed, location_aor, location_segment, lower_range, upper_range, concentration, ice_type, timestamp, deleted) VALUES (?,?,?,?,?,?,?,?,?,0)`;
    db.run(sql, [d.submitter, d.dateObserved, d.locationAOR, d.locationSegment, d.lowerRange, d.upperRange, d.concentration, d.iceType, ts], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.get('/ice-reports', (req, res) => {
    db.all("SELECT * FROM ice_reports", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, reports: rows });
    });
});

app.delete('/ice-reports/:id', (req, res) => {
    db.run("UPDATE ice_reports SET deleted = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// --- SERVER INIT ---
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
