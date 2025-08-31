class ListChatsUseCase {
  #whatsAppRepository;

  constructor(whatsAppRepository) {
    this.#whatsAppRepository = whatsAppRepository;
  }

  async execute(searchTerm) {
    return await this.#whatsAppRepository.listChats(searchTerm);
  }
}

module.exports = ListChatsUseCase;