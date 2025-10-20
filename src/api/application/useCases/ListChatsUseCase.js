class ListChatsUseCase {
  #whatsAppRepository;
  #config;

  constructor(whatsAppRepository, config) { 
    this.#whatsAppRepository = whatsAppRepository;
    this.#config = config;
  }

  async execute(searchTerm) {
    const chats = await this.#whatsAppRepository.listChats(searchTerm); 
    const baseUrl = this.#config.baseUrl || 'http://localhost:3001';

    return chats.map(chat => ({
      ...chat,
      photo: {
        id: chat.id,
        url: `${baseUrl}/api/whatsapp/chat/${chat.id}/photo` 
      }
    }));
  }
}

module.exports = ListChatsUseCase;