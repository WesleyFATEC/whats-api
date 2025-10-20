const WhatsAppRepository = require('../../domain/repositories/WhatsAppRepository');

const WhatsAppMapper = require('./WhatsAppMapper');
const { MessageMedia } = require('whatsapp-web.js');

class WhatsAppClient extends WhatsAppRepository {
  #connection;

  constructor(connection) {
    super();
    this.#connection = connection;
  }

  async setupMessageListener(callback) {
    const client = await this.#connection.getClient();
    client.on('message', async (msg) => {
      const domainMessage = WhatsAppMapper.toDomainMessage(msg);
      callback(domainMessage);
    });
  }
  
  async isReady() {
    try {
      await this.#connection.getClient();
      return true; 
    } catch (error) {
      return false;
    }
  }

  async sendTextMessage(to, message) {
    const client = await this.#connection.getClient();
    await client.sendMessage(to, message);
  }

  async sendMediaMessage(to, base64Data, filename, caption, isViewOnce, mimetype) {
    const client = await this.#connection.getClient();
    const media = new MessageMedia(mimetype, base64Data, filename);
    await client.sendMessage(to, media, { caption, isViewOnce });
  }

  async listMessages(chatId, limit) {
    const client = await this.#connection.getClient();
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit });
    return messages.map(WhatsAppMapper.toDomainMessage);
  }
  
  async getMessageById(messageId) {
    const client = await this.#connection.getClient();
    return client.getMessageById(messageId);
  }
  

  async getChatByName(searchTerm) {
    const client = await this.#connection.getClient();
    const allChats = await client.getChats();
    const filteredChats = allChats.filter((chat) => 
      !searchTerm || chat.name?.toLowerCase().includes(searchTerm)
    );
    const chatPromises = filteredChats.map(async (chat) => {
      const chatId = chat.id._serialized;
      let photoUrl = '';
      if (chatId !== 'status@broadcast') {
        photoUrl = await this.getPhotoProfile(chatId);
      }
      return {
        id: chatId,
        name: chat.name || chat.id.user,
        photo: {
          id: chatId,
          url: photoUrl,
        },
        isGroup: chat.isGroup,
        lastMessage: chat.lastMessage ? { 
          id: chat.lastMessage.id._serialized,
          body: chat.lastMessage.body || '',
          timestamp: Math.floor(chat.lastMessage.timestamp),
          fromMe: chat.lastMessage.fromMe,
        } : null,
      };
    });
    const results = await Promise.allSettled(chatPromises);
    const formattedChats = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        formattedChats.push(result.value);
      } else {
        const failedChatId = filteredChats[index].id._serialized;
        console.error(`Falha ao processar o chat ${failedChatId}:`, result.reason);
      }
    });
    return formattedChats;
  
  }

  async listChats() {
    const client = await this.#connection.getClient();
    const allChats = await client.getChats();
    const chatPromises = allChats.map(async (chat) => {
      const chatId = chat.id._serialized;
      if (chatId === 'status@broadcast') return null; // Pular o chat de status
      return {
        id: chatId,
        name: chat.name || chat.id.user,
        isGroup: chat.isGroup,
        lastMessage: chat.lastMessage ? { 
          id: chat.lastMessage.id._serialized,
          body: chat.lastMessage.body || '',
          timestamp: Math.floor(chat.lastMessage.timestamp),
          fromMe: chat.lastMessage.fromMe,
        } : null,
      }
    });
   return allChats.filter(Boolean);  
  }

  async getPhotoProfile(chatId) {
    const client = await this.#connection.getClient();
    const chat = await client.getChatById(chatId);
    const contact = await chat.getContact();
    if (contact) {
      const photoUrl = await contact.getProfilePicUrl();
      return photoUrl || ''; 
    }
    return '';
  }

  async getMediaByMessageId(messageId, chatId) {
    const client = await this.#connection.getClient();
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: 100 });
    const message = messages.find((msg) => msg.id._serialized === messageId);
    if (!message || !message.hasMedia) {
      throw new Error('Mensagem ou mídia não encontrada');
    }
    const media = await message.downloadMedia();
    if (!media) {
      throw new Error('Falha ao baixar a mídia');
    }
    let mimetype = media.mimetype;
    if (!mimetype || mimetype === 'application/octet-stream') {
      const filename = media.filename || `media_${messageId}`;
      const extension = filename.split('.').pop()?.toLowerCase();
      mimetype = mime.lookup(extension) || 'application/octet-stream';
    }
    console.log(`Mídia baixada para messageId=${messageId}: mimetype=${mimetype}, filename=${media.filename || `media_${messageId}`}`);
    return {
      mimetype,
      data: media.data,
      filename: media.filename || `media_${messageId}`,
    };
  }
  
    
}


module.exports = WhatsAppClient;