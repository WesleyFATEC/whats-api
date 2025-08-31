class SendTextMessageUseCase {
  #whatsAppRepository;

  constructor(whatsAppRepository) {
    this.#whatsAppRepository = whatsAppRepository;
  }

  async execute(to, message) {
    if (!to || !message) {
      throw new Error('Parâmetros "to" e "message" são obrigatórios.');
    }
    await this.#whatsAppRepository.sendTextMessage(to, message);
  }
}

module.exports = SendTextMessageUseCase;