

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const API_URL = 'https://api.themoviedb.org/3';

async function search(query, type) {
  try {
    const response = await axios.get(`${API_URL}/search/${type}`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query,
      },
    });
    return response.data.results[0];
  } catch (error) {
    console.error(`Error searching for ${query}:`, error.message);
    return null;
  }
}

async function getPoster(id, type) {
  try {
    const response = await axios.get(`${API_URL}/${type}/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });
    return response.data.poster_path;
  } catch (error) {
    console.error(`Error getting poster for ${type} ${id}:`, error.message);
    return null;
  }
}

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
    console.error(`Error downloading image from ${url}:`, error.message);
  }
}

async function processPath(itemPath) {
    const itemName = path.basename(itemPath);
    console.log(`Processing ${itemName}...`);

    let type = 'movie';
    let result = await search(itemName, type);

    if (!result) {
        type = 'tv';
        result = await search(itemName, type);
    }

    if (result) {
        const posterPath = await getPoster(result.id, type);
        if (posterPath) {
            const posterUrl = `https://image.tmdb.org/t/p/original${posterPath}`;
            const posterFilePath = path.join(itemPath, 'poster.jpg');
            await downloadImage(posterUrl, posterFilePath);
            console.log(`Downloaded poster for ${itemName}`);
        } else {
            console.log(`No poster found for ${itemName}`);
        }
    } else {
        console.log(`Could not find ${itemName} on TMDB.`);
    }
}

async function main(paths) {
  for (const itemPath of paths) {
    await processPath(itemPath);
  }
}

// Example usage:
// const movieFolders = ['/path/to/your/movies/Movie 1', '/path/to/your/tv/Series 1'];
// main(movieFolders);
