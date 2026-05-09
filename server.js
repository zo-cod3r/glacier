// --- DATABASE INITIALIZATION UPDATE ---
// Added op_updated, op_by, status_updated, and status_by
db.run("CREATE TABLE IF NOT EXISTS cutters (name TEXT PRIMARY KEY, operation TEXT, status TEXT, op_updated TEXT, op_by TEXT, status_updated TEXT, status_by TEXT)", (err) => {
    if (!err) {
        db.get("SELECT count(*) as count FROM cutters", (err, row) => {
            if (row && row.count === 0) {
                const defaults = [
                    ['CGC MACKINAW', 'Operation TACONITE'], ['CGC SPAR', 'Operation TACONITE'],
                    ['CGC BISCAYNE BAY', 'Operation TACONITE'], ['CGC MOBILE BAY', 'Operation TACONITE'],
                    ['CGC KATMAI BAY', 'Operation COAL SHOVEL'], ['CGC NEAH BAY', 'Operation COAL SHOVEL'],
                    ['CGC BRISTOL BAY', 'Operation COAL SHOVEL']
                ];
                const stmt = db.prepare("INSERT INTO cutters (name, operation, status, op_updated, op_by, status_updated, status_by) VALUES (?, ?, 'No status reported', 'N/A', 'N/A', 'N/A', 'N/A')");
                defaults.forEach(d => stmt.run(d));
                stmt.finalize();
            }
        });
    }
});

// --- UPDATE STATUS ROUTE ---
app.post('/cutters/status', (req, res) => {
    const { vessel, status, currentUser } = req.body;
    const now = new Date();
    const ts = String(now.getMonth()+1).padStart(2,'0') + "/" + String(now.getDate()).padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');

    db.run("UPDATE cutters SET status = ?, status_updated = ?, status_by = ? WHERE name = ?", [status, ts, currentUser, vessel], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// --- UPDATE OPERATION ROUTE ---
app.post('/cutters/operation', (req, res) => {
    const { vessel, operation, currentUser } = req.body;
    const now = new Date();
    const ts = String(now.getMonth()+1).padStart(2,'0') + "/" + String(now.getDate()).padStart(2,'0') + "/" + now.getFullYear().toString().slice(-2) + " " + String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');
    const userToLog = currentUser ? currentUser : "System";

    if (operation === "OutChop") {
        db.run("UPDATE cutters SET operation = ?, status = ?, op_updated = ?, op_by = ? WHERE name = ?", 
            [operation, "OutChop", ts, userToLog, vessel], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    } else {
        db.run("UPDATE cutters SET operation = ?, op_updated = ?, op_by = ? WHERE name = ?", 
            [operation, ts, userToLog, vessel], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    }
});
