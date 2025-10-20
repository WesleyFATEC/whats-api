const fs = require('fs').promises;
const path = require('path');
const config = require('../../config/config');

class FileSystemAdapter {
  #mediaCachePath;
  #profilePicCachePath;

  constructor() {
    // Carrega os dois caminhos de cache
    if (!config.mediaCachePath || !config.profilePicCachePath) {
      throw new Error('Config mediaCachePath e profilePicCachePath devem estar definidos.');
    }
    this.#mediaCachePath = config.mediaCachePath;
    this.#profilePicCachePath = config.profilePicCachePath;
  }

  /**
   * Garante que ambos os diretórios de cache existam.
   */
  async ensureCacheDirectory() {
    try {
      await fs.mkdir(this.#mediaCachePath, { recursive: true });
      await fs.mkdir(this.#profilePicCachePath, { recursive: true });
      console.log(`Diretório de cache de mídia: ${this.#mediaCachePath}`);
      console.log(`Diretório de cache de fotos de perfil: ${this.#profilePicCachePath}`);
    } catch (error) {
      console.error(`Erro ao criar diretórios de cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- Métodos de Mídia de Mensagem (para GetFileUseCase) ---

  /**
   * Encontra um arquivo de mídia de mensagem (vídeo, áudio, doc) no cache.
   * Procura por um arquivo .meta e .data.
   */
  async findFile(messageId) {
    const metaPath = path.normalize(path.resolve(this.#mediaCachePath, `${messageId}.meta`));
    const dataPath = path.normalize(path.resolve(this.#mediaCachePath, `${messageId}.data`));

    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      
      await fs.access(dataPath); // Garante que o arquivo de dados também existe
      
      return {
        filePath: dataPath,
        contentType: meta.mimetype,
        filename: meta.filename
      };
    } catch {
      // Se .meta ou .data não existem, o cache falhou
      return null;
    }
  }

  /**
   * Salva um arquivo de mídia de mensagem no cache.
   * Salva um arquivo .data (buffer) e .meta (json).
   */
  async saveFile(messageId, dataBuffer, mimetype, originalFilename) {
    const metaPath = path.normalize(path.resolve(this.#mediaCachePath, `${messageId}.meta`));
    const dataPath = path.normalize(path.resolve(this.#mediaCachePath, `${messageId}.data`));
    
    const meta = {
      filename: originalFilename || `media_${messageId}`,
      mimetype: mimetype || 'application/octet-stream'
    };
    
    try {
      await Promise.all([
        fs.writeFile(dataPath, dataBuffer),
        fs.writeFile(metaPath, JSON.stringify(meta))
      ]);
      
      return {
        filePath: dataPath,
        contentType: meta.mimetype,
        filename: meta.filename
      };
    } catch (error) {
      console.error(`Erro ao salvar arquivo ${dataPath}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- NOVOS Métodos de Foto de Perfil (para GetPhotoProfileUseCase) ---

  /**
   * Encontra uma foto de perfil no cache.
   */
  async findProfilePic(chatId) {
    const sanitizedId = this.#sanitizeId(chatId);
    const metaPath = path.normalize(path.resolve(this.#profilePicCachePath, `${sanitizedId}.meta`));
    const dataPath = path.normalize(path.resolve(this.#profilePicCachePath, `${sanitizedId}.data`));
    
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      
      await fs.access(dataPath); // Garante que o arquivo de dados também existe
      
      return {
        filePath: dataPath,
        contentType: meta.contentType
      };
    } catch {
      return null;
    }
  }

  /**
   * Salva uma foto de perfil no cache.
   */
  async saveProfilePic(chatId, dataBuffer, contentType) {
    const sanitizedId = this.#sanitizeId(chatId);
    const metaPath = path.normalize(path.resolve(this.#profilePicCachePath, `${sanitizedId}.meta`));
    const dataPath = path.normalize(path.resolve(this.#profilePicCachePath, `${sanitizedId}.data`));
    
    const meta = {
      contentType: contentType || 'image/jpeg' // Fotos de perfil são geralmente jpeg
    };
    
    try {
      await Promise.all([
        fs.writeFile(dataPath, dataBuffer),
        fs.writeFile(metaPath, JSON.stringify(meta))
      ]);
      
      return {
        filePath: dataPath,
        contentType: meta.contentType
      };
    } catch (error) {
      console.error(`Erro ao salvar foto de perfil ${dataPath}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Converte IDs de chat (ex: '55119999@c.us') em nomes de arquivo seguros.
   */
  #sanitizeId(id) {
    return id.replace(/[@.-]/g, '_');
  }
}

module.exports = FileSystemAdapter;