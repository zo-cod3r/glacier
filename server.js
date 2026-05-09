const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        // Ensure the table has ALL necessary columns
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            firstName TEXT,
            middleInitial TEXT,
            lastName TEXT,
            email TEXT,
            phone TEXT
        )`);
    }
});

app.post('/register', (req, res) => {
    const { username, password, firstName, middleInitial, lastName, email, phone } = req.body;
    console.log(`Attempting to register: ${username}`);

    const sql = `INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [username, password, firstName, middleInitial, lastName, email, phone], function(err) {
        if (err) {
            console.error("Database Error:", err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ success: false, message: 'Account already exists for this name.' });
            }
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, message: `Account created! Username: ${username}` });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (row) {
            res.json({ success: true, message: 'Login successful! Welcome, ' + row.firstName });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
