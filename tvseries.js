require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const API_URL = 'https://api.themoviedb.org/3';

// Remove unnecessary parts like `[tags]` and `Season info`, and clean extra dots
function extractSeriesTitle(folderName) {
  return folderName
    .replace(/\[.*?\]/g, '')        // Remove things like [1080p], [WEB], etc.
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .replace(/\.\.+/g, '.')         // Replace multiple dots with a single dot
    .replace(/(S\d{2})/g, '')       // Remove season info like S01, S02, etc.
    .replace(/\s*\(\d{4}\)/, '')    // Remove year info in parentheses
    .replace(/(?:WEB-DL|HDR|2160p|H\.265|SDR|1080p)/g, '') // Remove common tags
    .trim();
}

// Search TMDB with fuzzy matching and year detection
async function search(title, type) {
  try {
    const query = title.replace(/\(.*?\)/g, '').trim(); // Remove year from query
    const response = await axios.get(`${API_URL}/search/${type}`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query,
      },
    });

    const results = response.data.results;
    if (!results || results.length === 0) return null;

    const yearMatch = title.match(/\((\d{4})\)/);
    const targetYear = yearMatch ? parseInt(yearMatch[1]) : null;

    if (targetYear) {
      const match = results.find(r => {
        const date = r.release_date || r.first_air_date || '';
        return date.startsWith(targetYear.toString());
      });
      return match || results[0];
    }

    return results[0];
  } catch (error) {
    console.error(`❌ Error searching for "${title}":`, error.message);
    return null;
  }
}

// Get poster path for a movie or show
async function getPoster(id, type) {
  try {
    const response = await axios.get(`${API_URL}/${type}/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });
    return response.data.poster_path;
  } catch (error) {
    console.error(`❌ Error getting poster for ${type} ID ${id}:`, error.message);
    return null;
  }
}

// Download poster image to file
async function downloadImage(url, filepath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`❌ Error downloading image from ${url}:`, error.message);
  }
}

// Process a single series folder
async function processSeriesFolder(folderPath) {
  const folderName = path.basename(folderPath);
  const cleanTitle = extractSeriesTitle(folderName);

  console.log(`\n🎬 Processing: ${cleanTitle}`);

  let type = 'tv';
  let result = await search(cleanTitle, type);

  // If no match found, try searching with only the main part of the title (fallback)
  if (!result) {
    console.log(`⚠️ Trying fallback search...`);
    const fallbackTitle = cleanTitle.split(' ')[0]; // Try just the first word (e.g., "Alice" or "Peacemaker")
    result = await search(fallbackTitle, type);
  }

  if (result) {
    const posterPath = await getPoster(result.id, type);
    if (posterPath) {
      const posterUrl = `https://image.tmdb.org/t/p/original${posterPath}`;
      const posterFilePath = path.join(folderPath, 'poster.jpg');
      await downloadImage(posterUrl, posterFilePath);
      console.log(`✅ Downloaded poster for "${cleanTitle}"`);
    } else {
      console.log(`⚠️  No poster found for "${cleanTitle}"`);
    }
  } else {
    console.log(`❌ Could not find "${cleanTitle}" on TMDB`);
  }
}

// Main function to scan all TV series subfolders
async function main() {
  const parentDir = 'D:/Videos/TvSeries'; // <- Change this to your folder path

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
    await processSeriesFolder(folder);
  }

  console.log('\n✅ Done!');
}

main();
