// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse JSON requests and serve static files from the "public" folder
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database (creates a local file named users.db)
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create a table for users if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (!err) {
                // Insert a test user. 
                // Security Note: In a production environment, passwords MUST be hashed (e.g., using bcrypt) before storage.
                db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'password123')`);
            }
        });
    }
});

// Create the Login Endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Use parameterized queries (?) to prevent SQL injection vulnerabilities
    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
    
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (row) {
            res.json({ success: true, message: 'Login successful! Welcome, ' + row.username });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
