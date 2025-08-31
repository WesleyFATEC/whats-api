class ListMessagesUseCase {
  #whatsAppRepository;

  constructor(whatsAppRepository) {
    this.#whatsAppRepository = whatsAppRepository;
  }

  async execute(chatId, limit) {
    if (!chatId) {
      throw new Error('chatId é obrigatório.');
    }
    return await this.#whatsAppRepository.listMessages(chatId, limit);
  }
}

module.exports = ListMessagesUseCase;