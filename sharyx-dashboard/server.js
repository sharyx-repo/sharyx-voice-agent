const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const TELEMETRY_FILE = path.join(__dirname, '../logs/telemetry.jsonl');
const TRANSCRIPTS_DIR = path.join(__dirname, '../logs/conversations');

// API: Get all telemetry logs
app.get('/api/telemetry', (req: any, res: any) => {
    try {
        if (!fs.existsSync(TELEMETRY_FILE)) return res.json([]);
        const lines = fs.readFileSync(TELEMETRY_FILE, 'utf8').split('\n').filter(Boolean);
        const data = lines.map(line => JSON.parse(line));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read telemetry' });
    }
});

// API: Get specific transcript
app.get('/api/transcripts/:sessionId', (req: any, res: any) => {
    const { sessionId } = req.params;
    const filePath = path.join(TRANSCRIPTS_DIR, `${sessionId}.json`);
    
    try {
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Transcript not found' });
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read transcript' });
    }
});

const PORT = process.env.DASHBOARD_PORT || 3001;
app.listen(PORT, () => {
    console.log(`📊 Sharyx Monitoring API running at http://localhost:${PORT}`);
});
