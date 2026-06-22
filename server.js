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
            ice_breaker TEXT, cargo TEXT, cargo_amount TEXT, cargo_unit TEXT, dest TEXT, add_info TEXT, timestamp TEXT, deleted INTEGER DEFAULT 0,
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
                db.run("ALTER TABLE vmrs ADD COLUMN cargo_amount TEXT", (err) => {});
        db.run("ALTER TABLE vmrs ADD COLUMN cargo_unit TEXT", (err) => {});
                db.run("ALTER TABLE delays ADD COLUMN cutter_on_scene TEXT", (err) => {});
        db.run("ALTER TABLE delays ADD COLUMN vessel_moving TEXT", (err) => {});
                db.run("ALTER TABLE delays ADD COLUMN operation TEXT", (err) => {});
        db.run("ALTER TABLE delays ADD COLUMN admin_notes TEXT", (err) => {});
                db.run("ALTER TABLE delays ADD COLUMN cutter_on_scene_by TEXT", (err) => {});
        db.run("ALTER TABLE delays ADD COLUMN vessel_moving_by TEXT", (err) => {});
                db.run("ALTER TABLE underway_hours ADD COLUMN vessels TEXT", (err) => {});
                db.run("ALTER TABLE role_request_history ADD COLUMN target_username TEXT", (err) => {});
        db.run("ALTER TABLE role_request_history ADD COLUMN admin_reason TEXT", (err) => {});
        db.run("ALTER TABLE role_request_history ADD COLUMN admin_email TEXT", (err) => {});
                db.run("ALTER TABLE users ADD COLUMN sec_q1 TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN sec_a1 TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN sec_q2 TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN sec_a2 TEXT", (err) => {});
         db.run("ALTER TABLE vmrs ADD COLUMN response_timestamp TEXT", (err) => {});

        
        // RBAC Column Additions
        db.run("ALTER TABLE users ADD COLUMN unit TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN role TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN rank TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN admin_justification TEXT", (err) => {});
                db.run("ALTER TABLE users ADD COLUMN admin_request_date TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN comm_vessels TEXT", (err) => {});
        // Underneath the existing RBAC Column Additions:
db.run("ALTER TABLE users ADD COLUMN user_type TEXT", (err) => {});
db.run("ALTER TABLE users ADD COLUMN comp_phone TEXT", (err) => {});
db.run("ALTER TABLE users ADD COLUMN comp_email TEXT", (err) => {});
db.run("ALTER TABLE users ADD COLUMN comp_address TEXT", (err) => {});


                db.run(`CREATE TABLE IF NOT EXISTS provider_assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_company TEXT,
            vessel_name TEXT,
            service_areas TEXT,
            status TEXT DEFAULT 'Active'
        )`);


    }
});

// --- API ---
app.post('/register', (req, res) => {
    const { username, password, firstName, middleInitial, lastName, email, phone, unit, role, rank, adminJustification, commVessels, userType, secQ1, secA1, secQ2, secA2 } = req.body;
    let isAdmin = (username === 'admin.a.admin') ? 1 : 0; 
    
    // If it's a provider, check for existing company info first to link the accounts
    if (userType === 'Commercial Icebreaking assistance provider') {
        db.get("SELECT comp_phone, comp_email, comp_address FROM users WHERE unit = ? AND user_type = 'Commercial Icebreaking assistance provider' LIMIT 1", [unit], (err, existing) => {
            
            let pPhone = existing ? existing.comp_phone : null;
            let pEmail = existing ? existing.comp_email : null;
            let pAddr = existing ? existing.comp_address : null;

            db.run("INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone, unit, role, rank, is_admin, admin_justification, comm_vessels, user_type, comp_phone, comp_email, comp_address, sec_q1, sec_a1, sec_q2, sec_a2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [username, password, firstName, middleInitial, lastName, email, phone, unit, role, rank, isAdmin, adminJustification, commVessels, userType, pPhone, pEmail, pAddr, secQ1, secA1, secQ2, secA2], (err) => {
                if (err) return res.status(400).json({ success: false, message: 'Account already exists.' });
                res.json({ success: true, message: 'Account created!' });
            });
        });
    } else {
        // Normal registration
        db.run("INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone, unit, role, rank, is_admin, admin_justification, comm_vessels, user_type, sec_q1, sec_a1, sec_q2, sec_a2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [username, password, firstName, middleInitial, lastName, email, phone, unit, role, rank, isAdmin, adminJustification, commVessels, userType, secQ1, secA1, secQ2, secA2], (err) => {
            if (err) return res.status(400).json({ success: false, message: 'Account already exists.' });
            res.json({ success: true, message: 'Account created!' });
        });
    }
});

// Fetch security questions for a given username
app.get('/users/:username/security', (req, res) => {
    db.get("SELECT sec_q1, sec_q2 FROM users WHERE username = ?", [req.params.username], (err, row) => {
        if (row && row.sec_q1) res.json({ success: true, q1: row.sec_q1, q2: row.sec_q2 });
        else res.json({ success: false, message: 'User not found or no security questions set.' });
    });
});

// Verify answers and reset password
app.post('/users/reset-password', (req, res) => {
    const { username, a1, a2, newPassword } = req.body;
    db.get("SELECT id, sec_a1, sec_a2 FROM users WHERE username = ?", [username], (err, row) => {
        if (row) {
            // Case-insensitive comparison and trim spaces
            if (row.sec_a1.toLowerCase().trim() === a1.toLowerCase().trim() && 
                row.sec_a2.toLowerCase().trim() === a2.toLowerCase().trim()) {
                db.run("UPDATE users SET password = ? WHERE id = ?", [newPassword, row.id], (err) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({ success: true });
                });
            } else {
                res.json({ success: false, message: 'Security answers are incorrect.' });
            }
        } else {
            res.json({ success: false, message: 'User not found.' });
        }
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
    const { firstName, middleInitial, lastName, email, phone, unit, role, rank, is_admin, password, adminJustification, comp_phone, comp_email, comp_address, sec_q1, sec_a1, sec_q2, sec_a2 } = req.body;
    
    db.run(`UPDATE users SET 
        firstName=?, middleInitial=?, lastName=?, email=?, phone=?, unit=?, role=?, rank=?, is_admin=?, password=?, 
        admin_justification=COALESCE(?, admin_justification),
        comp_phone=COALESCE(?, comp_phone),
        comp_email=COALESCE(?, comp_email),
        comp_address=COALESCE(?, comp_address),
        sec_q1=COALESCE(?, sec_q1),
        sec_a1=COALESCE(?, sec_a1),
        sec_q2=COALESCE(?, sec_q2),
        sec_a2=COALESCE(?, sec_a2)
        WHERE id=?`, 
    [firstName, middleInitial, lastName, email, phone, unit, role, rank, is_admin, password, adminJustification, comp_phone, comp_email, comp_address, sec_q1, sec_a1, sec_q2, sec_a2, req.params.id], (err) => {
        if (err) {
            console.error("Error updating user:", err.message);
            return res.status(500).json({ success: false });
        }
        
        // Sync company info to all other users in the exact same company
        if (comp_phone !== undefined || comp_email !== undefined || comp_address !== undefined) {
            db.run(`UPDATE users SET 
                comp_phone = COALESCE(?, comp_phone), 
                comp_email = COALESCE(?, comp_email), 
                comp_address = COALESCE(?, comp_address) 
                WHERE unit = ? AND user_type = 'Commercial Icebreaking assistance provider'`, 
            [comp_phone, comp_email, comp_address, unit]);
        }
        
        res.json({ success: true });
    });
});
 
  

app.get('/admin/notifications', (req, res) => {
    db.get("SELECT count(*) as count FROM problems WHERE status = 'Open'", [], (err, probRow) => {
        if (err) return res.status(500).json({ success: false });
        
        db.get("SELECT count(*) as count FROM users WHERE admin_justification IS NOT NULL AND admin_justification != '' AND is_admin = 0", [], (err, roleRow) => {
            if (err) return res.status(500).json({ success: false });
            
            res.json({ 
                success: true, 
                problemsCount: probRow ? probRow.count : 0,
                rolesCount: roleRow ? roleRow.count : 0
            });
        });
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
    const { action, processedBy, adminEmail, adminReason } = req.body; 
    const isAdmin = action === 'approve' ? 1 : 0;
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    
    db.get("SELECT username, firstName, lastName, unit, role, admin_justification FROM users WHERE id=?", [req.params.id], (err, user) => {
        if(err || !user) return res.status(500).json({ success: false });
        
        let targetName = user.firstName + " " + user.lastName;
        let actionStr = action === 'approve' ? 'Approved' : 'Denied';
        
        db.run("INSERT INTO role_request_history (target_user, target_username, unit, role, justification, action, processed_by, timestamp, admin_reason, admin_email) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [targetName, user.username, user.unit, user.role, user.admin_justification, actionStr, processedBy || 'System', ts, adminReason || '', adminEmail || ''], (err) => {
            
            db.run("UPDATE users SET is_admin=?, admin_justification='' WHERE id=?", [isAdmin, req.params.id], (err) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true });
            });
        });
    });
});

app.get('/users/:username/admin-request-status', (req, res) => {
    const un = req.params.username;
    db.get("SELECT is_admin, admin_justification FROM users WHERE username=?", [un], (err, user) => {
        if (!user) return res.status(404).json({ success: false });
        
        if (user.is_admin === 1) return res.json({ success: true, status: 'Approved' });
        if (user.admin_justification && user.admin_justification !== '') return res.json({ success: true, status: 'Pending' });
        
        // If not approved or pending, check history for the latest denial
        db.get("SELECT * FROM role_request_history WHERE target_username=? ORDER BY id DESC LIMIT 1", [un], (err, row) => {
            if (row && row.action === 'Denied') {
                res.json({ success: true, status: 'Denied', reason: row.admin_reason, adminName: row.processed_by, adminEmail: row.admin_email });
            } else {
                res.json({ success: true, status: 'None' });
            }
        });
    });
});

app.post('/users/:id/admin-request', (req, res) => {
    const { justification } = req.body;
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    
    db.run("UPDATE users SET admin_justification = ?, admin_request_date = ? WHERE id = ?", [justification, ts, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, requestDate: ts });
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
    
    const sql = `INSERT INTO vmrs (
        submitter, vessel_name, east_lansing, west_round, up_detour, down_whitefish, 
        eta_sturgeon, eta_rock, down_lhc, up_se_shoal, etd_erie_huron, etd_detroit, 
        ice_breaker, cargo, cargo_amount, cargo_unit, dest, add_info, timestamp, deleted
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`;
    
    db.run(sql, [
        d.submitter, d.vesselName, d.eastLansing, d.westRound, d.upDetour, d.downWhitefish, 
        d.etaSturgeon, d.etaRock, d.downLhc, d.upSeShoal, d.etdErieHuron, d.etdDetroit, 
        d.iceBreaker, d.cargo, d.cargoAmount, d.cargoUnit, d.dest, d.addInfo, ts
    ], (err) => {
        if (err) {
            console.error("Error inserting VMR:", err.message);
            return res.status(500).json({ success: false });
        }
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
    const { response, comments_vessel, internal_comments, response_timestamp } = req.body;
    db.run("UPDATE vmrs SET response=?, comments_to_vessel=?, internal_comments=?, response_unread=1, response_timestamp=? WHERE id=?", 
    [response, comments_vessel, internal_comments, response_timestamp, req.params.id], (err) => {
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

// 1. Regular Update Route (USCG Users)
app.put('/delays/:id/update', (req, res) => {
    const { cutterOnScene, vesselMoving, adminNotes, currentUser } = req.body;
    
    const sql = `UPDATE delays SET 
        cutter_on_scene = ?, 
        vessel_moving = ?, 
        admin_notes = ?,
        cutter_on_scene_by = CASE 
            WHEN ? = '' THEN NULL
            WHEN ? != IFNULL(cutter_on_scene, '') THEN ? 
            ELSE cutter_on_scene_by 
        END,
        vessel_moving_by = CASE 
            WHEN ? = '' THEN NULL
            WHEN ? != IFNULL(vessel_moving, '') THEN ? 
            ELSE vessel_moving_by 
        END
        WHERE id = ?`;
        
    db.run(sql, [
        cutterOnScene, vesselMoving, adminNotes,
        cutterOnScene, cutterOnScene, currentUser,
        vesselMoving, vesselMoving, currentUser,
        req.params.id
    ], (err) => {
        if (err) {
            console.error("Error updating delay status:", err.message);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});

// 2. Full Edit Route (Admins)
app.put('/delays/:id/full-edit', (req, res) => {
    const d = req.body;
    
    const sql = `UPDATE delays SET 
        operation = ?, aor = ?, vessels = ?, start_date = ?, misle = ?, 
        cutter_on_scene = ?, vessel_moving = ?, admin_notes = ?, end_date = ?,
        cutter_on_scene_by = CASE 
            WHEN ? = '' THEN NULL
            WHEN ? != IFNULL(cutter_on_scene, '') THEN ? 
            ELSE cutter_on_scene_by 
        END,
        vessel_moving_by = CASE 
            WHEN ? = '' THEN NULL
            WHEN ? != IFNULL(vessel_moving, '') THEN ? 
            ELSE vessel_moving_by 
        END
        WHERE id = ?`;
        
    db.run(sql, [
        d.operation, d.aor, d.vessels, d.startDate, d.misle,  
        d.cutterOnScene, d.vesselMoving, d.adminNotes, d.endDate, 
        d.cutterOnScene, d.cutterOnScene, d.currentUser, 
        d.vesselMoving, d.vesselMoving, d.currentUser,   
        req.params.id
    ], (err) => {
        if (err) {
            console.error("Error on full edit of delay:", err.message);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});

app.post('/underway-hours', (req, res) => {
    const d = req.body;
    const ts = (new Date().getMonth()+1).toString().padStart(2,'0') + "/" + new Date().getDate().toString().padStart(2,'0') + "/" + new Date().getFullYear().toString().slice(-2) + " " + new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');
    
    // NEW: Added vessels to INSERT query
    db.run("INSERT INTO underway_hours (submitter, cutter, event_date, location, hour_type, hours, vessels, timestamp, deleted) VALUES (?,?,?,?,?,?,?,?,0)", 
    [d.submitter, d.cutter, d.eventDate, d.location, d.hourType, d.hours, d.vessels || '', ts], (err) => {
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

app.put('/underway-hours/:id', (req, res) => {
    const { eventDate, cutter, location, hourType, hours, vessels } = req.body;
    const sql = "UPDATE underway_hours SET event_date = ?, cutter = ?, location = ?, hour_type = ?, hours = ?, vessels = ? WHERE id = ?";
    
    db.run(sql, [eventDate, cutter, location, hourType, hours, vessels, req.params.id], (err) => {
        if (err) {
            console.error("Error updating underway hours:", err.message);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
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
    // JOIN users table so we can grab the email and unit (company name)
    db.all("SELECT i.*, u.email, u.unit FROM ice_reports i LEFT JOIN users u ON i.submitter = u.username", [], (err, rows) => {
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

// --- PROVIDER ASSET ROUTES ---
app.get('/provider-assets/:company', (req, res) => {
    db.all("SELECT * FROM provider_assets WHERE provider_company = ? ORDER BY id DESC", [req.params.company], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, assets: rows });
    });
});

app.post('/provider-assets', (req, res) => {
    const { company, vesselName, serviceAreas } = req.body; 
    db.run("INSERT INTO provider_assets (provider_company, vessel_name, service_areas, status) VALUES (?, ?, ?, 'Active')",
        [company, vesselName, JSON.stringify(serviceAreas)], err => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
    });
});

app.put('/provider-assets/:id/status', (req, res) => {
    const { status } = req.body;
    db.run("UPDATE provider_assets SET status = ? WHERE id = ?", [status, req.params.id], err => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.put('/provider-assets/:id', (req, res) => {
    const { vesselName, serviceAreas } = req.body;
    db.run("UPDATE provider_assets SET vessel_name = ?, service_areas = ? WHERE id = ?",
        [vesselName, JSON.stringify(serviceAreas), req.params.id], err => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
    });
});

// --- PROVIDER DIRECTORY ROUTE ---
app.get('/api/providers-directory', (req, res) => {
    // NEW: Added DISTINCT to collapse multiple employees into a single company entry
    db.all("SELECT DISTINCT unit as company, comp_phone, comp_email, comp_address FROM users WHERE user_type = 'Commercial Icebreaking assistance provider'", [], (err, users) => {
        if (err) return res.status(500).json({ success: false });
        
        db.all("SELECT * FROM provider_assets WHERE status = 'Active'", [], (err, assets) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, providers: users, assets: assets });
        });
    });
});


app.listen(3000, () => console.log("Server running at http://localhost:3000"));
