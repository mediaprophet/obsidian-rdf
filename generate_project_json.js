const fs = require('fs').promises;
const path = require('path');

async function readFolderFiles(folderPath, baseFolder = '') {
  const files = [];
  try {
    const items = await fs.readdir(folderPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(folderPath, item.name);
      const relativePath = baseFolder ? path.join(baseFolder, item.name) : item.name;
      if (item.isDirectory()) {
        // Exclude the 'export' directory from being processed
        if (relativePath === 'export') {
          continue;
        }
        const subFiles = await readFolderFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const ext = path.extname(item.name).toLowerCase();
          const contentType = getContentType(ext);
          files.push({
            filename: relativePath,
            contentType,
            content
          });
          console.log(`Processed ${relativePath}`);
        } catch (error) {
          console.error(`Error reading ${relativePath}: ${error.message}`);
          files.push({
            filename: relativePath,
            contentType: getContentType(path.extname(item.name).toLowerCase()),
            content: '',
            error: `Failed to read file: ${error.message}`
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading folder ${folderPath}: ${error.message}`);
  }
  return files;
}

function getContentType(ext) {
  switch (ext) {
    case '.ts':
      return 'text/typescript';
    case '.ttl':
      return 'text/turtle';
    case '.json':
      return 'application/json';
    case '.mjs':
      return 'text/javascript';
    case '.yaml':
    case '.yml':
      return 'text/yaml';
    case '.md':
      return 'text/markdown';
    case '.css':
      return 'text/css';
    case '.canvas':
      return 'application/json';
    default:
      return 'text/plain';
  }
}

async function generateProjectJson() {
  const exportDir = path.join(process.cwd(), 'export');
  await fs.mkdir(exportDir, { recursive: true });

  const folders = [
    { name: 'root', path: '.', isRoot: true },
    { name: 'modals', path: 'modals' },
    { name: 'settings', path: 'settings' },
    { name: 'utils', path: 'utils' },
    { name: 'views', path: 'views' },
    { name: 'js', path: 'js' },
    { name: 'shims', path: 'shims' },
    { name: 'tests', path: 'tests' },
    { name: 'templates', path: 'templates' }
  ];

  for (const folder of folders) {
    const folderPath = path.join(process.cwd(), folder.path);
    const output = folder.isRoot
      ? await readFolderFiles(folderPath, '').then(files => files.filter(f => !f.filename.startsWith('.')))
      : await readFolderFiles(folderPath, folder.path);
    const outputPath = path.join(exportDir, `${folder.name}_files.json`);
    try {
      await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
      console.log(`Generated ${outputPath} with ${output.length} files`);
    } catch (error) {
      console.error(`Error writing ${outputPath}: ${error.message}`);
    }
  }
}

generateProjectJson().catch(error => {
  console.error('Error generating project JSON files:', error);
  process.exit(1);
});