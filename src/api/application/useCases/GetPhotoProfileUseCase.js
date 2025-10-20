const ValidationError = require("../errors/ValidationError");
const axios = require('axios');
const path = require('path');

class GetPhotoProfileUseCase {
  #whatsAppRepository;
  #fileSystemAdapter;
  #defaultPhotoPath;

  constructor(whatsAppRepository, fileSystemAdapter) {
    this.#whatsAppRepository = whatsAppRepository;
    this.#fileSystemAdapter = fileSystemAdapter;
    // Tenha uma foto padrão no seu servidor
    this.#defaultPhotoPath = path.resolve(__dirname, '../../public/default-avatar.png'); 
  }

  async execute(chatId) {
    if (!chatId) {
      throw new ValidationError('chatId é obrigatório.');
    }

    // 1. TENTAR CACHE (Usando o adapter)
    // (Presumindo que você criou 'findProfilePic' no seu adapter)
    const cachedPic = await this.#fileSystemAdapter.findProfilePic(chatId);
    if (cachedPic) {
      return { filePath: cachedPic.filePath, contentType: cachedPic.contentType };
    }

    // 2. CACHE MISS: Buscar no WhatsApp
    const photoUrl = await this.#whatsAppRepository.getPhotoProfile(chatId);

    // 3. Se não tiver foto, retornar a padrão
    if (!photoUrl) {
      return { filePath: this.#defaultPhotoPath, contentType: 'image/png' };
    }

    // 4. Se tiver foto, baixar e salvar no cache
    try {
      const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
      const data = Buffer.from(response.data, 'binary');
      const contentType = response.headers['content-type'];

      // (Presumindo que você criou 'saveProfilePic' no seu adapter)
      const savedFile = await this.#fileSystemAdapter.saveProfilePic(chatId, data, contentType);
      
      return { filePath: savedFile.filePath, contentType: savedFile.contentType };

    } catch (error) {
      console.error(`Falha ao baixar/salvar foto de perfil para ${chatId}:`, error.message);
      // Se o download falhar, retorna a foto padrão
      return { filePath: this.#defaultPhotoPath, contentType: 'image/png' };
    }
  }
}

module.exports = GetPhotoProfileUseCase;