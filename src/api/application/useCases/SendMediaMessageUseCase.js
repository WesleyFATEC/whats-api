class SendMediaMessageUseCase {
  #whatsAppRepository;

  constructor(whatsAppRepository) {
    this.#whatsAppRepository = whatsAppRepository;
  }

  async execute(to, base64Data, filename, caption, mimetype) {
    if (!to || !base64Data || !filename) {
      throw new ValidationError('Parâmetros "to", "base64Data" e "filename" são obrigatórios.');
    }
    await this.#whatsAppRepository.sendMediaMessage(to, base64Data, filename, caption, false, mimetype);
  }
}

module.exports = SendMediaMessageUseCase;