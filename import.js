const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./glacier.db', (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    // 1. Ensure table exists
    db.run("CREATE TABLE IF NOT EXISTS commercial_vessels (name TEXT PRIMARY KEY, flag TEXT, type TEXT)");
    
    // 2. Wipe the old nonsense words clean!
    db.run("DELETE FROM commercial_vessels", (err) => {
        if (!err) console.log("Old ship data cleared. Preparing for fresh import...");
    });
    
    const stmt = db.prepare("INSERT OR IGNORE INTO commercial_vessels (name, flag, type) VALUES (?, ?, ?)");
    let count = 0;

    // 3. Read the file
    fs.createReadStream('ships.csv')
        .pipe(csv()) // Reads the CSV properly
        .on('data', (row) => {
            const keys = Object.keys(row);
            if (keys.length >= 1) {
                const name = row[keys[0]] ? row[keys[0]].trim() : "";
                const flag = keys.length >= 2 && row[keys[1]] ? row[keys[1]].trim() : "Unknown";
                const type = keys.length >= 3 && row[keys[2]] ? row[keys[2]].trim() : "Unknown";
                
                if (name) {
                    stmt.run(name, flag, type);
                    count++;
                    // Print the first 5 ships so we can verify they are English words!
                    if (count <= 5) {
                        console.log(`Importing: ${name}`);
                    }
                }
            }
        })
        .on('end', () => {
            stmt.finalize();
            db.close();
            console.log(`\nSuccess! Imported ${count} proper vessel names into Glacier DB.`);
        });
});
