const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

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
            ice_breaker TEXT, cargo TEXT, dest TEXT, add_info TEXT, timestamp TEXT, deleted INTEGER DEFAULT 0,
            response TEXT, comments_to_vessel TEXT, internal_comments TEXT, response_unread INTEGER DEFAULT 0
        )`);
        
         db.run("CREATE TABLE IF NOT EXISTS commercial_vessels (name TEXT PRIMARY KEY, flag TEXT, type TEXT)", (err) => {
            if (!err) {
                db.get("SELECT count(*) as count FROM commercial_vessels", (err, row) => {
                    // Only load from CSV if the table is currently empty
                    if (row && row.count < 10) { 
                        try {
                            // Read the CSV file from the root directory
                            const csvData = fs.readFileSync(path.join(__dirname, 'ships.csv'), 'utf8');
                            const lines = csvData.split(/\r?\n/); // Split by newline
                            
                        // Prepare the SQL statement to insert vessels dynamically
const stmt = db.prepare("INSERT OR IGNORE INTO commercial_vessels (name, flag, type) VALUES (?, ?, ?)");

let count = 0;
lines.forEach(line => {
    // Split the line by commas into an array
    let parts = line.split(',');
    
    // Grab each part, trim spaces, and remove stray quotes. Default to '??' if missing.
    let shipName = parts[0] ? parts[0].trim().replace(/(^"|"$)/g, '') : '';
    let shipFlag = parts[1] ? parts[1].trim().replace(/(^"|"$)/g, '') : '??';
    let shipType = parts[2] ? parts[2].trim().replace(/(^"|"$)/g, '') : '??';
    
    // Basic validation to ensure it's not a blank line
    if (shipName && shipName.length > 1) { 
        stmt.run([shipName, shipFlag, shipType]);
        count++;
    }
});

  
                            lines.forEach(line => {
                                // Split the line by commas, take the very first item [0], trim spaces, and remove any stray quotes
                                let shipName = line.split(',')[0].trim().replace(/(^"|"$)/g, '');
                                
                                // Basic validation to ensure it's not a blank line
                                if (shipName && shipName.length > 1) { 
                                    stmt.run([shipName]);
                                    count++;
                                }
                            });
;
                            stmt.finalize();
                            console.log(`Successfully loaded ${count} vessels from CSV into the database.`);
                        } catch (csvErr) {
                            console.error("WARNING: Could not find or read 'ships.csv'. Ensure the file is in the root directory.", csvErr.message);
                        }
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

        db.run(`CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT, submitter TEXT, description TEXT, 
            response TEXT, status TEXT DEFAULT 'Open', timestamp TEXT, response_unread INTEGER DEFAULT 0
        )`);

                db.run(`CREATE TABLE IF NOT EXISTS role_request_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            target_user TEXT, unit TEXT, role TEXT, 
            justification TEXT, action TEXT, 
            processed_by TEXT, timestamp TEXT
        )`);


             db.run(`CREATE TABLE IF NOT EXISTS delays (
            id INTEGER PRIMARY KEY AUTOINCREMENT, operation TEXT, aor TEXT, vessels TEXT, start_date TEXT, 
            misle TEXT, created_by TEXT, created_at TEXT, end_date TEXT, ended_by TEXT, status TEXT DEFAULT 'Active'
        )`);


        // Migration safety checks for Users and Tables
        db.run("ALTER TABLE ice_reports ADD COLUMN deleted INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE underway_hours ADD COLUMN deleted INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE vmrs ADD COLUMN timestamp TEXT", (err) => {});
        db.run("ALTER TABLE vmrs ADD COLUMN deleted INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE vmrs ADD COLUMN response TEXT", (err) => {});
        db.run("ALTER TABLE vmrs ADD COLUMN comments_to_vessel TEXT", (err) => {});
        db.run("ALTER TABLE vmrs ADD COLUMN internal_comments TEXT", (err) => {});
        db.run("ALTER TABLE vmrs ADD COLUMN response_unread INTEGER DEFAULT 0", (err) => {});
                db.run("ALTER TABLE delays ADD COLUMN cutter_on_scene TEXT", (err) => {});
        db.run("ALTER TABLE delays ADD COLUMN vessel_moving TEXT", (err) => {});
                db.run("ALTER TABLE delays ADD COLUMN operation TEXT", (err) => {});
        db.run("ALTER TABLE delays ADD COLUMN admin_notes TEXT", (err) => {});
                db.run("ALTER TABLE delays ADD COLUMN cutter_on_scene_by TEXT", (err) => {});
        db.run("ALTER TABLE delays ADD COLUMN vessel_moving_by TEXT", (err) => {});


        
        // RBAC Column Additions
        db.run("ALTER TABLE users ADD COLUMN unit TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN role TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN rank TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN admin_justification TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN comm_vessels TEXT", (err) => {});
    }
});

// --- API ---
app.post('/register', (req, res) => {
    // 1. ADD 'rank' TO THIS DESTRUCTURING LIST
    const { username, password, firstName, middleInitial, lastName, email, phone, unit, role, rank, adminJustification, commVessels } = req.body;
    let isAdmin = (username === 'admin.a.admin') ? 1 : 0; 
    
    // 2. ADD 'rank' TO THE COLUMNS, ADD A '?' TO VALUES, AND ADD 'rank' TO THE ARRAY
    db.run("INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone, unit, role, rank, is_admin, admin_justification, comm_vessels) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
    [username, password, firstName, middleInitial, lastName, email, phone, unit, role, rank, isAdmin, adminJustification, commVessels], (err) => {
        if (err) return res.status(400).json({ success: false, message: 'Account already exists.' });
        res.json({ success: true, message: 'Account created!' });
    });
});


app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) res.json({ success: true, user: row });
        else res.status(401).json({ success: false, message: 'Invalid credentials.' });
    });
});

app.get('/accounts', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, accounts: rows });
    });
});

app.put('/users/:id', (req, res) => {
    // 1. ADD adminJustification to destructuring
    const { firstName, middleInitial, lastName, email, phone, unit, role, rank, is_admin, password, adminJustification } = req.body;
    
    // 2. ADD admin_justification=COALESCE(?, admin_justification) to the query
    db.run("UPDATE users SET firstName=?, middleInitial=?, lastName=?, email=?, phone=?, unit=?, role=?, rank=?, is_admin=?, password=?, admin_justification=COALESCE(?, admin_justification) WHERE id=?", 
    [firstName, middleInitial, lastName, email, phone, unit, role, rank, is_admin, password, adminJustification, req.params.id], (err) => {
        if (err) {
            console.error("Error updating user:", err.message);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});


// --- NEW DELETE ROUTE ---
app.delete('/users/:id', (req, res) => {
    // 1. First check if they are trying to delete the root admin
    db.get("SELECT username FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (row && row.username === 'admin.a.admin') {
            return res.status(400).json({ success: false, message: 'Cannot delete root admin account.' });
        }
        
        // 2. If not root, proceed with deletion
        db.run("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        });
    });
});


app.get('/admin/requests', (req, res) => {
    db.all("SELECT * FROM users WHERE admin_justification IS NOT NULL AND admin_justification != '' AND is_admin = 0", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, requests: rows });
    });
});

app.put('/admin/requests/:id', (req, res) => {
    const { action, processedBy } = req.body; // 'approve' or 'deny', plus who clicked it
    const isAdmin = action === 'approve' ? 1 : 0;
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');

    // 1. Fetch user data before clearing it
    db.get("SELECT firstName, lastName, unit, role, admin_justification FROM users WHERE id=?", [req.params.id], (err, user) => {
        if(err || !user) return res.status(500).json({ success: false });
        
        let targetName = user.firstName + " " + user.lastName;
        let actionStr = action === 'approve' ? 'Approved' : 'Denied';

        // 2. Log it to the history table
        db.run("INSERT INTO role_request_history (target_user, unit, role, justification, action, processed_by, timestamp) VALUES (?,?,?,?,?,?,?)",
        [targetName, user.unit, user.role, user.admin_justification, actionStr, processedBy || 'System', ts], (err) => {
            
            // 3. Clear justification and grant/deny admin
            db.run("UPDATE users SET is_admin=?, admin_justification='' WHERE id=?", [isAdmin, req.params.id], (err) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true });
            });
        });
    });
});

// NEW ROUTE: Fetch the history
app.get('/admin/requests/history', (req, res) => {
    db.all("SELECT * FROM role_request_history ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, history: rows });
    });
});


app.get('/commercial-vessels', (req, res) => {
    // CHANGED: SELECT name to SELECT *
    db.all("SELECT * FROM commercial_vessels ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, vessels: rows });
    });
});


app.post('/commercial-vessels', (req, res) => {
    const { name, flag, type } = req.body;

    // Insert or Ignore to prevent duplicates
    const sql = "INSERT INTO commercial_vessels (name, flag, type) VALUES (?, ?, ?)";
    
    db.run(sql, [name, flag, type], function(err) {
        if (err) {
            // Check if the error is due to a unique constraint violation
            if (err.message.includes("UNIQUE")) {
                return res.status(400).json({ success: false, message: "Vessel already exists." });
            }
            console.error("Error adding vessel:", err.message);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, message: "Vessel added." });
    });
});

app.get('/cutters', (req, res) => {
    db.all("SELECT * FROM cutters ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, cutters: rows });
    });
});

app.post('/cutters/status', (req, res) => {
    const { vessel, status, currentUser } = req.body;
    const now = new Date();
    const ts = (now.getMonth()+1).toString().padStart(2,'0') + "/" + now.getDate().toString().padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
    db.run("UPDATE cutters SET status = ?, status_updated = ?, status_by = ? WHERE name = ?", [status, ts, currentUser || "System", vessel], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Status Update', ?, ?, ?)", [vessel, status, currentUser || "System", ts]);
        res.json({ success: true });
    });
});

app.post('/cutters/operation', (req, res) => {
    const { vessel, operation, currentUser } = req.body;
    const now = new Date();
    const ts = (now.getMonth()+1).toString().padStart(2,'0') + "/" + now.getDate().toString().padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
    db.run("UPDATE cutters SET operation = ?, op_updated = ?, op_by = ? WHERE name = ?", [operation, ts, currentUser || "System", vessel], (err) => {
        if (err) return res.status(500).json({ success: false });
        db.run("INSERT INTO change_log (vessel, change_type, details, changed_by, timestamp) VALUES (?, 'Reassigned', ?, ?, ?)", [vessel, `Assigned to ${operation}`, currentUser || "System", ts]);
        res.json({ success: true });
    });
});

app.post('/cutters/manage', (req, res) => {
    const { name, operation, currentUser } = req.body;
    db.run("INSERT INTO cutters (name, operation, status, op_updated, op_by, status_updated, status_by) VALUES (?, ?, 'No status reported', 'N/A', 'N/A', 'N/A', 'N/A')", [name.toUpperCase(), operation], (err) => {
        if (err) return res.status(400).json({ success: false, message: "Asset already exists." });
        res.json({ success: true });
    });
});

app.delete('/cutters/:name', (req, res) => {
    db.run("DELETE FROM cutters WHERE name = ?", [req.params.name], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/locations', (req, res) => {
    db.all("SELECT * FROM locations ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, locations: rows });
    });
});

app.post('/locations/manage', (req, res) => {
    const { name, operation, area } = req.body;
    db.run("INSERT INTO locations (name, operation, area) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET operation=excluded.operation, area=excluded.area", [name, operation, area], (err) => {
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

app.post('/vmrs', (req, res) => {
    const d = req.body;
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    const sql = `INSERT INTO vmrs (submitter, vessel_name, east_lansing, west_round, up_detour, down_whitefish, eta_sturgeon, eta_rock, down_lhc, up_se_shoal, etd_erie_huron, etd_detroit, ice_breaker, cargo, dest, add_info, timestamp, deleted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`;
    db.run(sql, [d.submitter, d.vesselName, d.eastLansing, d.westRound, d.upDetour, d.downWhitefish, d.etaSturgeon, d.etaRock, d.downLhc, d.upSeShoal, d.etdErieHuron, d.etdDetroit, d.iceBreaker, d.cargo, d.dest, d.addInfo, ts], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/vmrs/all', (req, res) => {
    db.all("SELECT v.*, u.email, u.phone FROM vmrs v LEFT JOIN users u ON v.submitter = u.username WHERE (v.deleted IS NULL OR v.deleted = 0) ORDER BY v.id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, reports: rows });
    });
});

app.get('/vmrs/:user', (req, res) => {
    db.all("SELECT * FROM vmrs WHERE submitter = ? ORDER BY id DESC", [req.params.user], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, reports: rows });
    });
});

app.delete('/vmrs/:id', (req, res) => {
    db.run("UPDATE vmrs SET deleted = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.put('/vmrs/:id/response', (req, res) => {
    const { response, comments_vessel, internal_comments } = req.body;
    db.run("UPDATE vmrs SET response=?, comments_to_vessel=?, internal_comments=?, response_unread=1 WHERE id=?", [response, comments_vessel, internal_comments, req.params.id], (err) => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true});
    });
});

app.put('/vmrs/:id/read', (req, res) => {
    db.run("UPDATE vmrs SET response_unread=0 WHERE id=?", [req.params.id], (err) => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true});
    });
});

app.post('/problems', (req, res) => {
    const { submitter, description } = req.body;
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    db.run("INSERT INTO problems (submitter, description, timestamp, response_unread) VALUES (?,?,?,0)", [submitter, description, ts], err => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/problems/all', (req, res) => {
    db.all("SELECT p.*, u.firstName, u.lastName, u.email, u.phone FROM problems p LEFT JOIN users u ON p.submitter = u.username ORDER BY p.id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, problems: rows });
    });
});

app.get('/problems/:user', (req, res) => {
    db.all("SELECT * FROM problems WHERE submitter = ? ORDER BY id DESC", [req.params.user], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, problems: rows });
    });
});

// NEW: Route for User Follow-ups
app.put('/problems/:id/followup', (req, res) => {
    const { description, response, timestamp } = req.body;
    // Updates strings, brings status back to Open, and resets unread
    db.run("UPDATE problems SET description=?, response=?, timestamp=?, status='Open', response_unread=0 WHERE id=?", 
    [description, response, timestamp, req.params.id], err => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true});
    });
});


app.put('/problems/:id/resolve', (req, res) => {
    db.run("UPDATE problems SET response=?, status='Resolved', response_unread=1 WHERE id=?", [req.body.response, req.params.id], err => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true});
    });
});

app.put('/problems/:id/read', (req, res) => {
    db.run("UPDATE problems SET response_unread=0 WHERE id=?", [req.params.id], err => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true});
    });
});

app.post('/delays', (req, res) => {
    const { operation, aor, vessels, startDate, misle, createdBy } = req.body; // NEW: Added operation
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    
    // NEW: Added operation to INSERT and VALUES
    db.run("INSERT INTO delays (operation, aor, vessels, start_date, misle, created_by, created_at, status) VALUES (?,?,?,?,?,?,?,'Active')", 
    [operation, aor, vessels, startDate, misle, createdBy, ts], err => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true});
    });
});

app.get('/delays', (req, res) => {
    db.all("SELECT * FROM delays ORDER BY id DESC", [], (err, rows) => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true, delays: rows});
    });
});

app.post('/delays', (req, res) => {
    const { operation, aor, vessels, startDate, misle, createdBy } = req.body; 
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    
    db.run("INSERT INTO delays (operation, aor, vessels, start_date, misle, created_by, created_at, status) VALUES (?,?,?,?,?,?,?,'Active')", 
    [operation, aor, vessels, startDate, misle, createdBy, ts], err => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true});
    });
});


// Handles a full edit of any field in a delay record (Admin Only)
app.put('/delays/:id/full-edit', (req, res) => {
    const d = req.body;
    
    // NEW: Added operation = ? to the SET clause
    const sql = `UPDATE delays SET 
        operation = ?, aor = ?, vessels = ?, start_date = ?, misle = ?, 
        cutter_on_scene = ?, vessel_moving = ?, admin_notes = ?, end_date = ?
        WHERE id = ?`;
        
    db.run(sql, [
        d.operation, d.aor, d.vessels, d.startDate, d.misle,  // NEW: Added d.operation
        d.cutterOnScene, d.vesselMoving, d.adminNotes, d.endDate, 
        req.params.id
    ], (err) => {
        // NOTE: If this bottom part was missing, it causes the "unexpected end of input" error
        if (err) {
            console.error("Error on full edit of delay:", err.message);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});

app.put('/delays/:id/end', (req, res) => {
    db.run("UPDATE delays SET status='Ended', end_date=?, ended_by=? WHERE id=?", [req.body.endDate, req.body.endedBy, req.params.id], err => {
        if(err) return res.status(500).json({success:false});
        res.json({success:true});
    });
});

app.post('/underway-hours', (req, res) => {
    const d = req.body;
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    db.run("INSERT INTO underway_hours (submitter, cutter, event_date, location, hour_type, hours, timestamp, deleted) VALUES (?,?,?,?,?,?,?,0)", [d.submitter, d.cutter, d.eventDate, d.location, d.hourType, d.hours, ts], (err) => {
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

app.delete('/underway-hours/:id', (req, res) => {
    db.run("UPDATE underway_hours SET deleted = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.post('/ice-reports', (req, res) => {
    const d = req.body;
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    db.run("INSERT INTO ice_reports (submitter, date_observed, location_aor, location_segment, lower_range, upper_range, concentration, ice_type, timestamp, deleted) VALUES (?,?,?,?,?,?,?,?,?,0)", [d.submitter, d.dateObserved, d.locationAOR, d.locationSegment, d.lowerRange, d.upperRange, d.concentration, d.iceType, ts], (err) => {
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

app.delete('/ice-reports/:id', (req, res) => {
    db.run("UPDATE ice_reports SET deleted = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.put('/ice-reports/:id', (req, res) => {
    const { dateObserved, locationAOR, locationSegment, lowerRange, upperRange, concentration, iceType } = req.body;
    db.run("UPDATE ice_reports SET date_observed=?, location_aor=?, location_segment=?, lower_range=?, upper_range=?, concentration=?, ice_type=? WHERE id=?", 
    [dateObserved, locationAOR, locationSegment, lowerRange, upperRange, concentration, iceType, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});


app.listen(3000, () => console.log("Server running at http://localhost:3000"));
