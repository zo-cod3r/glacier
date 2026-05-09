const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./users.db', (err) => {
    if (!err) {
        db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, firstName TEXT, middleInitial TEXT, lastName TEXT, email TEXT, phone TEXT)");
    }
});

app.post('/register', (req, res) => {
    const { username, password, firstName, middleInitial, lastName, email, phone } = req.body;
    const sql = "INSERT INTO users (username, password, firstName, middleInitial, lastName, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.run(sql, [username, password, firstName, middleInitial, lastName, email, phone], function(err) {
        if (err) {
            return res.status(400).json({ success: false, message: 'User already exists or database error.' });
        }
        res.json({ success: true, message: 'Account created! Username: ' + username });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            res.json({ success: true, message: 'Login successful! Welcome, ' + row.firstName });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
    });
});

app.listen(port, () => {
    console.log("Server running at http://localhost:3000");
});
