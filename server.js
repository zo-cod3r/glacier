const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./users.db', (err) => {
    if (!err) {
        db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, firstName TEXT, middleInitial TEXT, lastName TEXT, email TEXT, phone TEXT)");
    }
});

// --- REGISTER ROUTE ---
app.post('/register', (req, res) => {
    const { username, password, firstName, middleInitial, lastName, email, phone } = req.body;
    const sql = "INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.run(sql, [username, password, firstName, middleInitial, lastName, email, phone], function(err) {
        if (err) return res.status(400).json({ success: false, message: 'Registration failed.' });
        res.json({ success: true, message: 'Account created!' });
    });
});

// --- LOGIN ROUTE ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            res.json({ success: true, user: { firstName: row.firstName, lastName: row.lastName } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
    });
});

// --- FETCH ALL ACCOUNTS ROUTE (NEW) ---
app.get('/accounts', (req, res) => {
    // Notice we DO NOT select the password column here for security reasons
    const sql = "SELECT username, firstName, middleInitial, lastName, email, phone FROM users";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error fetching accounts.' });
        }
        res.json({ success: true, accounts: rows });
    });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
