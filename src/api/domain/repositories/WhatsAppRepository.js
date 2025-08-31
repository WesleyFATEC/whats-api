class WhatsAppRepository {
  async isReady() {
    throw new Error('Method not implemented');
  }

  async sendTextMessage(to, message) {
    throw new Error('Method not implemented');
  }

  async sendMediaMessage(to, base64Data, filename, caption, isViewOnce, mimetype) {
    throw new Error('Method not implemented');
  }

  async listChats(searchTerm) {
    throw new Error('Method not implemented');
  }

  async listMessages(chatId, limit) {
    throw new Error('Method not implemented');
  }

  async getMediaByMessageId(messageId, chatId) {
    throw new Error('Method not implemented');
  }

  async getMessageById(messageId) {
    throw new Error('Method not implemented');
  }

  async getPhotoProfile(chatId) {
    throw new Error('Method not implemented');
  }
}

module.exports = WhatsAppRepository;