const express = require('express');
const path = require('path');
const app = express();
const exportDir = path.join(process.env.HOME || process.env.USERPROFILE, 'my-docs', 'docs').replace(/\\/g, '/');

app.get('/canvas/:file', (req, res) => {
  const file = req.params.file;
  const format = req.query.format || 'ttl';
  const filePath = path.join(exportDir, 'canvas', `${file}.${format}`);
  res.sendFile(filePath, err => {
    if (err) {
      res.status(404).send(`File not found: ${file}.${format}`);
    }
  });
});

app.listen(3000, () => console.log('Semantic Weaver content negotiation server running on http://localhost:3000'));