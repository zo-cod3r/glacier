const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./users.db', (err) => {
    if (!err) {
        // Users Table
        db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, firstName TEXT, middleInitial TEXT, lastName TEXT, email TEXT, phone TEXT)");
        
        // NEW: Cutters Table
        db.run(`CREATE TABLE IF NOT EXISTS cutters (
            name TEXT PRIMARY KEY,
            operation TEXT,
            status TEXT,
            last_updated TEXT,
            updated_by TEXT
        )`, (err) => {
            if (!err) {
                // Pre-populate the table with default cutters if it is empty
                db.get("SELECT count(*) as count FROM cutters", (err, row) => {
                    if (row && row.count === 0) {
                        const defaults = [
                            ['CGC MACKINAW', 'Operation TACONITE'],
                            ['CGC SPAR', 'Operation TACONITE'],
                            ['CGC BISCAYNE BAY', 'Operation TACONITE'],
                            ['CGC MOBILE BAY', 'Operation TACONITE'],
                            ['CGC KATMAI BAY', 'Operation COAL SHOVEL'],
                            ['CGC NEAH BAY', 'Operation COAL SHOVEL'],
                            ['CGC BRISTOL BAY', 'Operation COAL SHOVEL']
                        ];
                        const stmt = db.prepare("INSERT INTO cutters (name, operation, status, last_updated, updated_by) VALUES (?, ?, 'No status reported', 'N/A', 'N/A')");
                        defaults.forEach(d => stmt.run(d));
                        stmt.finalize();
                    }
                });
            }
        });
    }
});

app.post('/register', (req, res) => {
    const { username, password, firstName, middleInitial, lastName, email, phone } = req.body;
    const sql = "INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.run(sql, [username, password, firstName, middleInitial, lastName, email, phone], (err) => {
        if (err) return res.status(400).json({ success: false, message: 'Failed to create account.' });
        res.json({ success: true, message: 'Account created!' });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            // Added 'username' to the response so the frontend can use it for cutter logs
            res.json({ success: true, user: { username: row.username, firstName: row.firstName, lastName: row.lastName } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
    });
});

app.get('/accounts', (req, res) => {
    db.all("SELECT username, firstName, middleInitial, lastName, email, phone FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, accounts: rows });
    });
});

// --- NEW CUTTER ROUTES ---

// 1. Get all cutters
app.get('/cutters', (req, res) => {
    db.all("SELECT * FROM cutters ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, cutters: rows });
    });
});

// 2. Update Cutter Status
app.post('/cutters/status', (req, res) => {
    const { vessel, status, currentUser } = req.body;
    
    // Create timestamp matching PowerShell script format (MM/dd/yy HH:mm)
    const now = new Date();
    const timestamp = `${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}/${now.getFullYear().toString().slice(-2)} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    
    const sql = "UPDATE cutters SET status = ?, last_updated = ?, updated_by = ? WHERE name = ?";
    db.run(sql, [status, timestamp, currentUser, vessel], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Status updated!' });
    });
});

// 3. Assign Cutter to Operation
app.post('/cutters/operation', (req, res) => {
    const { vessel, operation } = req.body;
    const sql = "UPDATE cutters SET operation = ? WHERE name = ?";
    db.run(sql, [operation, vessel], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Assignment updated!' });
    });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
