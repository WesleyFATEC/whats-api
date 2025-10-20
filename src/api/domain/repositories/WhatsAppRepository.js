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


   async listLabels() {
    throw new Error('Method not implemented');
  }

  async setLabelToChat(chatId, label) {
    throw new Error('Method not implemented');
  }
  
  async removeLabelFromChat(chatId, label) {
    throw new Error('Method not implemented');
  }

  async changeLabelToChat(chatId, oldLabel, newLabel) {
    throw new Error('Method not implemented');
  }

  async listLabelsOfChat(chatId) {
    throw new Error('Method not implemented');
  }

  async listChats(searchTerm) {
    throw new Error('Method not implemented');
  }

      async listChats() {
    throw new Error('Method not implemented');
  }

  async deleteChat(chatId) {
    throw new Error('Method not implemented');
  }

  async listMessages(chatId, limit) {
    throw new Error('Method not implemented');
  }

  async searchMessages(chatId, searchTerm, limit) {
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

  async getContactById(contactId) {
    throw new Error('Method not implemented');
  }

  async logout() {
    throw new Error('Method not implemented');
  }

  async getChatByLabel(labelId) {
    throw new Error('Method not implemented');
  }




}

module.exports = WhatsAppRepository;