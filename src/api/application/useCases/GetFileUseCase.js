const NotFoundError = require('../errors/NotFoundError');
const ValidationError = require('../errors/ValidationError');
class GetFileUseCase {
  #whatsAppRepository;
  #fileSystemAdapter;

  constructor(whatsAppRepository, fileSystemAdapter) {
    this.#whatsAppRepository = whatsAppRepository;
    this.#fileSystemAdapter = fileSystemAdapter;
  }

  async execute(messageId) {
    if (!messageId) {
      throw new ValidationError('messageId é obrigatório.');
    }

    // Verificar cache
    const cachedFile = await this.#fileSystemAdapter.findFile(messageId);
    if (cachedFile) {
      return {
        filePath: cachedFile.filePath,
        contentType: this.#fileSystemAdapter.getContentType(cachedFile.ext),
        filename:cachedFile.filename
      };
    }

    // Obter mensagem e mídia
    const msg = await this.#whatsAppRepository.getMessageById(messageId);
    if (!msg || !msg.hasMedia) {
      throw new NotFoundErrorError('Mídia não encontrada');
    }
    const media = await msg.downloadMedia();
    if (!media || !media.data) {
      throw new Error('Erro ao baixar mídia');
    }

//salvar no cache
  const savedFile = await this.#fileSystemAdapter.saveFile(
  messageId, 
  Buffer.from(media.data, 'base64'), 
  media.mimetype,
  media.filename
);
return {
  filePath: savedFile.filePath,
  contentType: savedFile.contentType,
  filename: savedFile.filename
};
  }
}

module.exports = GetFileUseCase;