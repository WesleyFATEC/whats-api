const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Message = require('../../domain/entities/Message');
const mime = require('mime-types');

class WhatsAppClient extends require('../../domain/repositories/WhatsAppRepository') {
  #client;
  #isReady = false;
  #clientReadyPromise;

  constructor() {
    super();
    this.#clientReadyPromise = new Promise((resolve) => {
      this.#client = new Client({
        authStrategy: new LocalAuth({ clientId: 'whatsapp-api-bot' }),
        puppeteer: { headless: true ,
                 executablePath: '/usr/bin/chromium-browser',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--no-zygote',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--single-process',
        '--disable-gpu',
        '--lang=en-US',
        '--disable-site-isolation-trials',
        '--disable-gl-drawing-for-tests',
        '--disable-features=site-per-process',
      ],
    }});

      this.#client.on('qr', (qr) => {
        console.log('QR Code recebido, escaneie com o WhatsApp:');
        qrcode.generate(qr, { small: true });
      });

      this.#client.on('ready', () => {
        console.log('WhatsApp Client está pronto!');
        this.#isReady = true;
        resolve();
      });

      this.#client.on('disconnected', () => {
        console.log('WhatsApp Client desconectado.');
        this.#isReady = false;
      });

      this.#client.initialize().catch((error) => {
        console.error(`Erro ao inicializar WhatsApp Client: ${error.message}`, error.stack);
      });
    });
  }

  setupMessageListener(callback) {
    this.#client.on('message', async (msg) => {
      const chat = await msg.getChat();
      callback(new Message({
        id: msg.id._serialized,
        from: msg.fromMe ? 'Me' : msg.from,
        fromMe: msg.fromMe,
        body: msg.body || '',
        timestamp: Math.floor(msg.timestamp),
        type: msg.type,
        hasMedia: msg.hasMedia,
        media: msg.hasMedia ? { mimetype: msg.mimetype || 'application/octet-stream', filename: msg.media?.filename || `media_${msg.id._serialized}` } : null,
      }));
    });
  }

  async isReady() {
    await this.#clientReadyPromise;
    return this.#isReady;
  }

  async sendTextMessage(to, message) {
    await this.#clientReadyPromise;
    await this.#client.sendMessage(to, message);
  }

  async sendMediaMessage(to, base64Data, filename, caption, isViewOnce, mimetype) {
    await this.#clientReadyPromise;
    const { MessageMedia } = require('whatsapp-web.js');
    const media = new MessageMedia(mimetype, base64Data, filename);
    await this.#client.sendMessage(to, media, { caption, isViewOnce });
  }

async listChats(searchTerm) {
    await this.#clientReadyPromise;
    const allChats = await this.#client.getChats();

    const filteredChats = allChats.filter((chat) => 
      !searchTerm || chat.name?.toLowerCase().includes(searchTerm)
    );

    // Mapeia cada chat para uma promise que busca seus dados
    const chatPromises = filteredChats.map(async (chat) => {
      const chatId = chat.id._serialized;
      let photoUrl = '';

      // Ainda é uma boa prática pular o chat de status
      if (chatId !== 'status@broadcast') {
        photoUrl = await this.getPhotoProfile(chatId);
      }
      
      // Retorna o objeto formatado final
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
        // Adiciona o chat bem-sucedido à lista final
        formattedChats.push(result.value);
      } else {
        // Loga um erro detalhado para a promise que falhou, nos dizendo qual chat é o problemático
        const failedChatId = filteredChats[index].id._serialized;
        console.error(`Falha ao processar o chat ${failedChatId}:`, result.reason);
      }
    });

    return formattedChats;
  }
  

async getPhotoProfile(chatId) {
    // Envolve toda a lógica em uma única Promise para correr contra o timeout
    const photoPromise = (async () => {
      await this.#clientReadyPromise;
      const chat = await this.#client.getChatById(chatId);
      const contact = await chat.getContact();
      if (contact) {
        const photoUrl = await contact.getProfilePicUrl();
        return photoUrl || ''; 
      }
      return ''; 
    })();

    // Cria uma promise de timeout que rejeitará após 10 segundos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout de 10s ao buscar foto para o chat ${chatId}.`));
      }, 10000); // 10 segundos
    });

    try {
      // Retorna o resultado da primeira promise que terminar (a foto ou o timeout)
      return await Promise.race([
        photoPromise,
        timeoutPromise
      ]);
    } catch (error) {
      // Se o timeout ocorrer, o erro será capturado aqui.
      // Não vamos poluir o console principal, mas a função retornará ''
      // console.error(error.message); 
      return ''; // Retorna um valor seguro para não quebrar o .map()
    }
  }

  async listMessages(chatId, limit) {
  await this.#clientReadyPromise;
  const chat = await this.#client.getChatById(chatId);
  let options = { limit };

  const messages = await chat.fetchMessages(options);
  return messages.map((msg) => {
    // Mapear msg.type para mimetype
    const typeToMimetype = {
      image: 'image/jpeg', // Pode ser jpeg, png, etc.; usar jpeg como padrão
      video: 'video/mp4',
      audio: 'audio/ogg', // .ogg é comum para áudios do WhatsApp
      document: 'application/pdf', // Fallback para documentos; pode ser ajustado
      chat: null, // Mensagens de texto não têm mídia
      sticker: 'image/webp',
      voice: 'audio/ogg', 
      ptt: 'audio/ogg',// Áudios de voz
    };

    // Determinar mimetype e extensão
    const mimetype = msg.hasMedia ? (typeToMimetype[msg.type] || 'application/octet-stream') : null;
    let filename = msg.hasMedia ? `media_${msg.id._serialized}` : null;
    if (msg.hasMedia && mimetype) {
      // Inferir extensão a partir do mimetype
      const extension = mime.extension(mimetype) || '';
      if (extension) {
        filename = `${msg.id._serialized}.${extension}`;
      }
    }

    console.log(`Mensagem processada: id=${msg.id._serialized}, type=${msg.type}, hasMedia=${msg.hasMedia}, mimetype=${mimetype}, filename=${filename}`);

    return new Message({
      id: msg.id._serialized,
      from: msg.fromMe ? 'Me' : msg.from,
      fromMe: msg.fromMe,
      body: msg.body || '',
      timestamp: Math.floor(msg.timestamp),
      type: msg.type,
      hasMedia: msg.hasMedia,
      media: msg.hasMedia ? { mimetype, filename } : null,
    });
  });
}

async getMediaByMessageId(messageId, chatId) {
  await this.#clientReadyPromise;
  const chat = await this.#client.getChatById(chatId);
  const messages = await chat.fetchMessages({ limit: 100 });
  const message = messages.find((msg) => msg.id._serialized === messageId);
  if (!message || !message.hasMedia) {
    throw new Error('Mensagem ou mídia não encontrada');
  }
  const media = await message.downloadMedia();
  if (!media) {
    throw new Error('Falha ao baixar a mídia');
  }

  // Determinar o mimetype
  let mimetype = media.mimetype;
  if (!mimetype || mimetype === 'application/octet-stream') {
    // Tentar inferir o mimetype a partir da extensão do filename
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

  async getMessageById(messageId) {
    await this.#clientReadyPromise;
    return this.#client.getMessageById(messageId);
  }
}

module.exports = WhatsAppClient;