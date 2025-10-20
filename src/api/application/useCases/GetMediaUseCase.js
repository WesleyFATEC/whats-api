const ValidationError = require("../errors/ValidationError");

class GetMediaUseCase {
  #whatsAppRepository;

  constructor(whatsAppRepository) {
    this.#whatsAppRepository = whatsAppRepository;
  }

  async execute(messageId, chatId) {
    if (!messageId || !chatId) {
      throw new ValidationErrorError('messageId e chatId são obrigatórios.');
    }
    return await this.#whatsAppRepository.getMediaByMessageId(messageId, chatId);
  }
}

module.exports = GetMediaUseCase;