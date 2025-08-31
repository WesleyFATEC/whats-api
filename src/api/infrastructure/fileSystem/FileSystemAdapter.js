const fs = require('fs').promises;
const path = require('path');
const config = require('../../config/config');

class FileSystemAdapter {
  #mediaCachePath;

  constructor() {
    this.#mediaCachePath = config.mediaCachePath;
  }

  async ensureCacheDirectory() {
    try {
      await fs.mkdir(this.#mediaCachePath, { recursive: true });
      console.log(`Diretório de cache criado/acessado: ${this.#mediaCachePath}`);
    } catch (error) {
      console.error(`Erro ao criar diretório de cache ${this.#mediaCachePath}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findFile(messageId) {
    const basePath = path.normalize(path.resolve(this.#mediaCachePath, messageId));
    const exts = [
      '.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.mov',
      '.mp3', '.ogg', '.wav', '.opus', '.pdf', '.doc', '.docx', '.xls', '.xlsx', ''
    ];
    for (const ext of exts) {
      const file = `${basePath}${ext}`;
      try {
        await fs.access(file);
        return { filePath: file, ext };
      } catch {
        continue;
      }
    }
    return null;
  }

  async saveFile(messageId, data, mimetype) {
    
        function getExtension(mimetype) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'audio/mp3': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/opus': '.opus',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
  };
  if (map[mimetype]) return map[mimetype];
  if (mimetype && mimetype.startsWith('audio/ogg')) return '.ogg';
  return '';
}
    const ext = getExtension(mimetype);
    const filePath = path.normalize(path.resolve(this.#mediaCachePath, `${messageId}${ext}`));
    try {
      await fs.writeFile(filePath, data);
      
      console.log(`Arquivo salvo em: ${filePath }`);
      await fs.stat(filePath); // Validar após escrita
      return { filePath, ext };
    } catch (error) {
      console.error(`Erro ao salvar arquivo ${filePath}: ${error.message}`, error.stack);
      throw error;
    }
  }

  getContentType(ext) {
    return {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mp3',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.opus': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '': 'application/octet-stream'
    }[ext] || 'application/octet-stream';
  }
}

module.exports = FileSystemAdapter;