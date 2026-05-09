// import.js
const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

// Connect to your local database
const db = new sqlite3.Database('./glacier.db', (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        process.exit(1);
    }
});

let count = 0;

db.serialize(() => {
    // Ensure the table exists
    db.run("CREATE TABLE IF NOT EXISTS commercial_vessels (name TEXT PRIMARY KEY, flag TEXT, type TEXT)");
    
    // Prepare the SQL statement (INSERT OR IGNORE prevents duplicates if you run this multiple times)
    const stmt = db.prepare("INSERT OR IGNORE INTO commercial_vessels (name, flag, type) VALUES (?, ?, ?)");

    console.log("Reading ships.csv and importing to Glacier DB...");

    fs.createReadStream('ships.csv')
        .pipe(csv())
        .on('data', (row) => {
            const keys = Object.keys(row);
            // Ensure we have at least 3 columns of data
            if (keys.length >= 3) {
                const name = row[keys[0]] ? row[keys[0]].trim() : "";
                const flag = row[keys[1]] ? row[keys[1]].trim() : "";
                const type = row[keys[2]] ? row[keys[2]].trim() : "";
                
                if (name) {
                    stmt.run(name, flag, type);
                    count++;
                }
            }
        })
        .on('end', () => {
            stmt.finalize();
            db.close((err) => {
                if (err) {
                    console.error(err.message);
                } else {
                    console.log(`\nSuccess! Imported ${count} vessels into glacier.db.`);
                    console.log("You can now start your server with 'node server.js'");
                }
            });
        });
});
