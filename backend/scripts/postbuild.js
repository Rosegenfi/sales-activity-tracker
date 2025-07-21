const fs = require('fs');
const path = require('path');

// Create migrations directory in dist
const distMigrationsDir = path.join(__dirname, '../dist/migrations');
if (!fs.existsSync(distMigrationsDir)) {
  fs.mkdirSync(distMigrationsDir, { recursive: true });
}

// Copy migration files
const srcMigrationsDir = path.join(__dirname, '../src/migrations');
if (fs.existsSync(srcMigrationsDir)) {
  const files = fs.readdirSync(srcMigrationsDir);
  files.forEach(file => {
    if (file.endsWith('.sql')) {
      fs.copyFileSync(
        path.join(srcMigrationsDir, file),
        path.join(distMigrationsDir, file)
      );
      console.log(`Copied ${file} to dist/migrations`);
    }
  });
}

console.log('Post-build tasks completed');