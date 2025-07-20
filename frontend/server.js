import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Important for Railway

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('Error: dist directory not found. Make sure to run npm run build first.');
  process.exit(1);
}

// Serve static files from the dist directory
app.use(express.static(distPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle client-side routing - serve index.html for any non-static routes
// Using a middleware function instead of wildcard route to avoid path-to-regexp issues
app.use((req, res, next) => {
  // If it's a file request (has extension), let it 404
  if (path.extname(req.path)) {
    return res.status(404).send('File not found');
  }
  
  // Otherwise, serve the index.html for client-side routing
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

// Start server with explicit host binding
const server = app.listen(PORT, HOST, () => {
  console.log(`Frontend server is running on http://${HOST}:${PORT}`);
  console.log(`Serving files from: ${distPath}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});