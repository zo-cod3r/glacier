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
        
        // Added is_active column for asset management
        db.run("CREATE TABLE IF NOT EXISTS cutters (name TEXT PRIMARY KEY, operation TEXT, status TEXT, op_updated TEXT, op_by TEXT, status_updated TEXT, status_by TEXT, is_active INTEGER DEFAULT 1)", (err) => {
            if (!err) {
                db.get("SELECT count(*) as count FROM cutters", (err, row) => {
                    if (row && row.count === 0) {
                        const defaults = [
                            ['CGC MACKINAW', 'Operation TACONITE'], ['CGC SPAR', 'Operation TACONITE'],
                            ['CGC BISCAYNE BAY', 'Operation TACONITE'], ['CGC MOBILE BAY', 'Operation TACONITE'],
                            ['CGC KATMAI BAY', 'Operation COAL SHOVEL'], ['CGC NEAH BAY', 'Operation COAL SHOVEL'],
                            ['CGC BRISTOL BAY', 'Operation COAL SHOVEL'], ['CGC MORRO BAY', 'Operation COAL SHOVEL']
                        ];
                        const stmt = db.prepare("INSERT INTO cutters (name, operation, status, op_updated, op_by, status_updated, status_by, is_active) VALUES (?, ?, 'No status reported', 'N/A', 'N/A', 'N/A', 'N/A', 1)");
                        defaults.forEach(d => stmt.run(d));
                        stmt.finalize();
                    }
                });
            }
        });
        
        // Ensure backwards compatibility for existing databases by adding the column if it doesn't exist
        db.run("ALTER TABLE cutters ADD COLUMN is_active INTEGER DEFAULT 1", (err) => {});

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
                            ["Whitefish Bay", "Operation TACONITE", "Area 6A (Whitefish Bay)"],
                            ["Duluth, Superior", "Operation TACONITE", "Area 8A (Duluth, Superior)"],
                            ["Thunder Bay, ON", "Operation TACONITE", "Area 8C (West Superior, Thunder Bay)"],
                            ["Eastern Lake Erie", "Operation COAL SHOVEL", "Area 1 (Eastern Lake Erie)"],
                            ["Western Lake Erie", "Operation COAL SHOVEL", "Area 2B (Western Lake Erie, Maumee Bay)"],
                            ["Detroit River", "Operation COAL SHOVEL", "Area 3A (Detroit River)"],
                            ["Lake St. Clair", "Operation COAL SHOVEL", "Area 3B (Lake St. Clair, St. Clair River)"]
                        ];
                        const stmt = db.prepare("INSERT INTO locations (name, operation, area) VALUES (?, ?, ?)");
                        defaultLocs.forEach(d => stmt.run(d));
                        stmt.finalize();
                    }
                });
            }
        });

        db.run("CREATE TABLE IF NOT EXISTS change_log (id INTEGER PRIMARY KEY AUTOINCREMENT, vessel TEXT, change_type TEXT, details TEXT, changed_by TEXT, timestamp TEXT)");
        db.run(`CREATE TABLE IF NOT EXISTS vmrs (id INTEGER PRIMARY KEY AUTOINCREMENT, submitter TEXT, vessel_name TEXT, east_lansing TEXT, west_round TEXT, up_detour TEXT, down_whitefish TEXT, eta_sturgeon TEXT, eta_rock TEXT, down_lhc TEXT, up_se_shoal TEXT, etd_erie_huron TEXT, etd_detroit TEXT, ice_breaker TEXT, cargo TEXT, dest TEXT, add_info TEXT)`);
        db.run("CREATE TABLE IF NOT EXISTS commercial_vessels (name TEXT PRIMARY KEY, flag TEXT, type TEXT)");
        db.run(`CREATE TABLE IF NOT EXISTS underway_hours (id INTEGER PRIMARY KEY AUTOINCREMENT, submitter TEXT, cutter TEXT, event_date TEXT, location TEXT, hour_type TEXT, hours REAL, timestamp TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS ice_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, submitter TEXT, date_observed TEXT, location_aor TEXT, location_segment TEXT, lower_range REAL, upper_range REAL, concentration INTEGER, ice_type TEXT, timestamp TEXT)`);
    }
});

// --- AUTH & SYSTEM ---
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

// --- CUTTERS & LOGS ---
app.get('/cutters', (req, res) => {
    db.all("SELECT * FROM cutters ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, cutters: rows });
    });
});
app.post('/cutters/status', (req, res) => {
    const { vessel, status, currentUser } = req.body;
    const ts = new Date().toLocaleString();
    db.run("UPDATE cutters SET status = ?, status_updated = ?, status_by = ? WHERE name = ?", [status, ts, currentUser || "System", vessel], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Status Update', ?, ?, ?)", [vessel, status, currentUser || "System", ts]);
        res.json({ success: true });
    });
});
app.post('/cutters/operation', (req, res) => {
    const { vessel, operation, currentUser } = req.body;
    const ts = new Date().toLocaleString();
    const status = (operation === "OutChop") ? "OutChop" : "No status reported";
    db.run("UPDATE cutters SET operation = ?, status = ?, op_updated = ?, op_by = ?, status_updated = ?, status_by = ? WHERE name = ?", [operation, status, ts, currentUser || "System", ts, currentUser || "System", vessel], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Reassigned', ?, ?, ?)", [vessel, `Assigned to ${operation}`, currentUser || "System", ts]);
        res.json({ success: true });
    });
});
app.post('/cutters/manage', (req, res) => {
    const { name, operation, currentUser } = req.body;
    const ts = new Date().toLocaleString();
    const sql = `INSERT INTO cutters (name, operation, status, op_updated, op_by, status_updated, status_by, is_active) 
                 VALUES (?, ?, 'No status reported', 'N/A', 'N/A', 'N/A', 'N/A', 1) 
                 ON CONFLICT(name) DO UPDATE SET is_active = 1, operation = excluded.operation, status = 'No status reported'`;
    db.run(sql, [name.toUpperCase(), operation], (err) => {
        if (err) return res.status(400).json({ success: false, message: "Error adding cutter." });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Asset Added', ?, ?, ?)", [name.toUpperCase(), `Added to ${operation}`, currentUser || "System", ts]);
        res.json({ success: true });
    });
});

// Reactivate a cutter to OutChop
app.post('/cutters/reactivate', (req, res) => {
    const { name, currentUser } = req.body;
    const ts = new Date().toLocaleString();
    const user = currentUser || "System";
    db.run("UPDATE cutters SET is_active = 1, operation = 'OutChop', status = 'OutChop', op_updated = ?, op_by = ?, status_updated = ?, status_by = ? WHERE name = ?", [ts, user, ts, user, name], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Asset Reactivated', 'Reactivated and assigned to OutChop', ?, ?)", [name, user, ts]);
        res.json({ success: true });
    });
});

// Soft Delete (Deactivate)
app.delete('/cutters/:name', (req, res) => {
    const name = req.params.name;
    const user = req.query.user || "System";
    const ts = new Date().toLocaleString();
    db.run("UPDATE cutters SET is_active = 0 WHERE name = ?", [name], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Asset Inactivated', 'Moved to inactive list', ?, ?)", [name, user, ts]);
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
    const { name, operation, area } = req.body;
    const sql = `INSERT INTO locations (name, operation, area) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET operation=excluded.operation, area=excluded.area`;
    db.run(sql, [name, operation, area], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});
app.delete('/locations/:name', (req, res) => {
    db.run("DELETE FROM locations WHERE name = ?", [req.params.name], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});
app.get('/changelog', (req, res) => {
    db.all("SELECT * FROM change_log ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, logs: rows });
    });
});

// --- VMRs, HOURS, ICE ---
app.post('/vmrs', (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO vmrs (submitter, vessel_name, east_lansing, west_round, up_detour, down_whitefish, eta_sturgeon, eta_rock, down_lhc, up_se_shoal, etd_erie_huron, etd_detroit, ice_breaker, cargo, dest, add_info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    db.run(sql, [d.submitter, d.vesselName, d.eastLansing, d.westRound, d.upDetour, d.downWhitefish, d.etaSturgeon, d.etaRock, d.downLhc, d.upSeShoal, d.etdErieHuron, d.etdDetroit, d.iceBreaker, d.cargo, d.dest, d.addInfo], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});
app.get('/vmrs/:user', (req, res) => {
    db.all("SELECT * FROM vmrs WHERE submitter = ? ORDER BY id DESC", [req.params.user], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, reports: rows });
    });
});
app.post('/underway-hours', (req, res) => {
    const d = req.body;
    const ts = new Date().toLocaleString();
    const sql = `INSERT INTO underway_hours (submitter, cutter, event_date, location, hour_type, hours, timestamp) VALUES (?,?,?,?,?,?,?)`;
    db.run(sql, [d.submitter, d.cutter, d.eventDate, d.location, d.hourType, d.hours, ts], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});
app.get('/underway-hours', (req, res) => {
    db.all("SELECT * FROM underway_hours", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, hours: rows });
    });
});
app.post('/ice-reports', (req, res) => {
    const d = req.body;
    const ts = new Date().toLocaleString();
    const sql = `INSERT INTO ice_reports (submitter, date_observed, location_aor, location_segment, lower_range, upper_range, concentration, ice_type, timestamp) VALUES (?,?,?,?,?,?,?,?,?)`;
    db.run(sql, [d.submitter, d.dateObserved, d.locationAOR, d.locationSegment, d.lowerRange, d.upperRange, d.concentration, d.iceType, ts], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});
app.get('/ice-reports', (req, res) => {
    db.all("SELECT * FROM ice_reports", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, reports: rows });
    });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
