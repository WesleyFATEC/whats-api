class GetPhotoProfileUseCase {
  #whatsAppRepository;

  constructor(whatsAppRepository) {
    this.#whatsAppRepository = whatsAppRepository;
  }

  async execute(messageId, chatId) {
    if (!messageId || !chatId) {
      throw new Error('messageId e chatId são obrigatórios.');
    }
    return await this.#whatsAppRepository.getPhotoProfile( chatId);
  }
}

module.exports = GetPhotoProfileUseCase;