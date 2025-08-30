const fs = require('fs');
const path = require('path');

// Function to clean the folder by removing unwanted files
function cleanupFolder(folderPath) {
  const files = fs.readdirSync(folderPath);

  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    const ext = path.extname(file).toLowerCase();

    // Remove all .txt files and non-poster .jpg files
    if (ext === '.txt' || (ext === '.jpg' && file !== 'poster.jpg')) {
      try {
        fs.unlinkSync(filePath); // Deletes the file
        console.log(`✅ Deleted: ${filePath}`);
      } catch (error) {
        console.error(`❌ Error deleting file ${filePath}:`, error.message);
      }
    }
  });
}

// Main function to clean all subfolders
async function main() {
  const parentDir = 'D:/Videos/Movies'; // <- Change this to your folder path

  if (!fs.existsSync(parentDir)) {
    console.error(`❌ Folder does not exist: ${parentDir}`);
    return;
  }

  const entries = fs.readdirSync(parentDir, { withFileTypes: true });
  const folders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(parentDir, entry.name));

  console.log(`\n📂 Found ${folders.length} folders in "${parentDir}"`);

  for (const folder of folders) {
    cleanupFolder(folder);
  }

  console.log('\n✅ Clean-up complete!');
}

main();
