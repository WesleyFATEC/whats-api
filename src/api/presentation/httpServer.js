const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const streamifier = require('streamifier');
const { Server } = require('socket.io');
const http = require('http');
const config = require('../config/config');
const WhatsAppClient = require('../infrastructure/whatsapp/WhatsAppClient');
const FileSystemAdapter = require('../infrastructure/fileSystem/FileSystemAdapter');
const SendTextMessageUseCase = require('../application/useCases/SendTextMessageUseCase');
const ListChatsUseCase = require('../application/useCases/ListChatsUseCase');
const ListMessagesUseCase = require('../application/useCases/ListMessagesUseCase');
const GetMediaUseCase = require('../application/useCases/GetMediaUseCase');
const SendMediaMessageUseCase = require('../application/useCases/SendMediaMessageUseCase');
const GetFileUseCase = require('../application/useCases/GetFileUseCase');

class HttpServer {
  #app;
  #server;
  #io;
  #whatsAppClient;
  #fileSystemAdapter;
  #sendTextMessageUseCase;
  #listChatsUseCase;
  #listMessagesUseCase;
  #getMediaUseCase;
  #sendMediaMessageUseCase;
  #getFileUseCase;

  constructor() {
    this.#app = express();
    this.#server = http.createServer(this.#app);
    this.#io = new Server(this.#server, {
      cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
    });
    this.#whatsAppClient = new WhatsAppClient();
    this.#fileSystemAdapter = new FileSystemAdapter();
    this.#sendTextMessageUseCase = new SendTextMessageUseCase(this.#whatsAppClient);
    this.#listChatsUseCase = new ListChatsUseCase(this.#whatsAppClient);
    this.#listMessagesUseCase = new ListMessagesUseCase(this.#whatsAppClient);
    this.#getMediaUseCase = new GetMediaUseCase(this.#whatsAppClient);
    this.#sendMediaMessageUseCase = new SendMediaMessageUseCase(this.#whatsAppClient);
    this.#getFileUseCase = new GetFileUseCase(this.#whatsAppClient, this.#fileSystemAdapter);
  }

  async setup() {
    // Middleware
    this.#app.use(cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }));
    this.#app.use(bodyParser.json({ limit: '50mb' }));
    this.#app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    this.#app.use(express.static('public'));

    // Criar diretório de cache
    await this.#fileSystemAdapter.ensureCacheDirectory();

    // Configurar listener de mensagens
    this.#whatsAppClient.setupMessageListener((msg) => {
      this.#io.to(msg.from).emit('newMessage', msg.toJSON());
      this.#io.to(msg.to).emit('newMessage', msg.toJSON());
    });

    // Endpoints
    this.#setupRoutes();
  }

  #setupRoutes() {
    this.#app.get('/api/whatsapp/status', async (req, res) => {
      try {
        const isReady = await this.#whatsAppClient.isReady();
        res.json({
          status: isReady ? 'ready' : 'not_ready',
          message: isReady ? 'WhatsApp Client is ready and connected.' : 'WhatsApp Client is not ready or disconnected.',
        });
      } catch (error) {
        console.error(`Erro ao verificar status: ${error.message}`, error.stack);
        res.status(500).json({ error: 'Erro ao verificar status', details: error.message });
      }
    });

    this.#app.post('/api/whatsapp/send-text', async (req, res) => {
      try {
        await this.#sendTextMessageUseCase.execute(req.body.to, req.body.message);
        res.status(200).json({ success: true, message: 'Mensagem de texto enviada com sucesso.' });
      } catch (error) {
        console.error(`Erro ao enviar mensagem de texto: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });

    this.#app.get('/api/whatsapp/chats', async (req, res) => {
      try {
        const chats = await this.#listChatsUseCase.execute(req.query.search);
        res.json(chats);
      } catch (error) {
        console.error(`Erro ao buscar chats: ${error.message}`, error.stack);
        res.status(500).json({ error: 'Erro ao buscar chats', details: error.message });
      }
    });

    this.#app.get('/api/whatsapp/messages', async (req, res) => {
      try {
        const messages = await this.#listMessagesUseCase.execute(req.query.chatId, req.query.limit ? parseInt(req.query.limit) : 20);
        res.json(messages.map((msg) => msg.toJSON()));
      } catch (error) {
        console.error(`Erro ao buscar mensagens: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });

    this.#app.get('/api/whatsapp/media/:messageId', async (req, res) => {
      try {
        const media = await this.#getMediaUseCase.execute(req.params.messageId, req.query.chatId);
        res.json(media);
      } catch (error) {
        console.error(`Erro ao baixar mídia: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });

    const upload = multer({ storage: multer.memoryStorage() });
    this.#app.post('/api/whatsapp/send-media', upload.single('file'), async (req, res) => {
      try {
        const { to, caption } = req.body;
        const file = req.file;
        if (!to || !file) {
          throw new Error('Parâmetros "to" e "file" são obrigatórios.');
        }
        let base64Data, filename, mimetype;
        if (file.mimetype === 'audio/webm' || file.originalname.endsWith('.webm')) {
          const oggBuffer = await this.#convertWebmToOggOpus(file.buffer);
          base64Data = oggBuffer.toString('base64');
          filename = file.originalname.replace(/\.webm$/, '.ogg');
          mimetype = 'audio/ogg';
        } else {
          base64Data = file.buffer.toString('base64');
          filename = file.originalname;
          mimetype = file.mimetype;
        }
        await this.#sendMediaMessageUseCase.execute(to, base64Data, filename, caption, mimetype);
        res.json({ success: true, message: 'Mídia enviada com sucesso.' });
      } catch (error) {
        console.error(`Erro ao enviar mídia: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });

    this.#app.get('/api/whatsapp/file/:messageId', async (req, res) => {
      res.set('Access-Control-Allow-Origin', config.corsOrigin);
      try {
        const { filePath, contentType, filename } = await this.#getFileUseCase.execute(req.params.messageId);
        console.log(`Servindo arquivo para messageId ${req.params.messageId}: ${filePath}`);
        res.set('Content-Type', contentType);
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(filePath);
      } catch (error) {
        console.error(`Erro ao buscar/servir mídia para messageId ${req.params.messageId}: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });
  }

  async #convertWebmToOggOpus(webmBuffer) {
    return new Promise((resolve, reject) => {
      let chunks = [];
      const command = ffmpeg(streamifier.createReadStream(webmBuffer))
        .format('ogg')
        .audioCodec('libopus')
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks)))
        .pipe();
      command.on('data', (chunk) => chunks.push(chunk));
    });
  }

  async start() {
    await this.setup();
    this.#server.listen(config.port, () => {
      console.log(`API de Backend rodando em http://localhost:${config.port}`);
    });
  }
}

module.exports = HttpServer;