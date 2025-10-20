// src/api/presentation/httpServer.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const streamifier = require('streamifier');
const { Server } = require('socket.io');
const http = require('http');
const config = require('../config/config');

class HttpServer {
  #app;
  #server;
  #io;
  #useCases;
  #whatsAppClient;
  #fileSystemAdapter;

  constructor(useCases, whatsAppClient, fileSystemAdapter) {
    this.#app = express();
    this.#server = http.createServer(this.#app);
    this.#io = new Server(this.#server, {
      cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
    });

    // Armazena as dependências injetadas
    this.#useCases = useCases;
    this.#whatsAppClient = whatsAppClient;
    this.#fileSystemAdapter = fileSystemAdapter;
  }
  
  // expor o 'io' para o index.js
  getIO() {
    return this.#io;
  }

  async setup() {
    // Middleware
   this.#app.use(
      cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }));
    this.#app.use(bodyParser.json({ limit: '50mb' }));
    this.#app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    this.#app.use(express.static('public'));
    // Endpoints
    this.#setupRoutes();
  }

  #setupRoutes() {
    const upload = multer({ storage: multer.memoryStorage() });

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
        await this.#useCases.sendTextMessageUseCase.execute(req.body.to, req.body.message);
        res.status(200).json({ success: true, message: 'Mensagem de texto enviada com sucesso.' });
      } catch (error) {
        console.error(`Erro ao enviar mensagem de texto: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });

  this.#app.get('/api/whatsapp/chats', async (req, res) => {
    const searchTerm = req.query.searchTerm; 
    const chats = await this.#useCases.listChatsUseCase.execute(searchTerm); 
    res.json(chats);
  });

  this.#app.get('/api/whatsapp/chat/:chatId/photo', async (req, res) => {
    try {
      const { chatId } = req.params;
      const { filePath, contentType } = await this.#useCases.getPhotoProfileUseCase.execute(chatId);
      
      res.set('Content-Type', contentType);
      // O frontend pode cachear isso por 1 dia no navegador
      res.set('Cache-Control', 'public, max-age=86400'); 
      res.sendFile(filePath);

    } catch (error) {
      // (Seu middleware de erro centralizado vai pegar isso)
      console.error(`Erro ao servir foto para ${req.params.chatId}:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

    this.#app.get('/api/whatsapp/messages', async (req, res) => {
      try {
        const messages = await this.#useCases.listMessagesUseCase.execute(req.query.chatId, req.query.limit ? parseInt(req.query.limit) : 20);
        res.json(messages.map((msg) => msg.toJSON()));
      } catch (error) {
        console.error(`Erro ao buscar mensagens: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });

    this.#app.get('/api/whatsapp/media/:messageId', async (req, res) => {
      try {
        const media = await this.#useCases.getMediaUseCase.execute(req.params.messageId, req.query.chatId);
        res.json(media);
      } catch (error) {
        console.error(`Erro ao baixar mídia: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });

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
        await this.#useCases.sendMediaMessageUseCase.execute(to, base64Data, filename, caption, mimetype);
        res.json({ success: true, message: 'Mídia enviada com sucesso.' });
      } catch (error) {
        console.error(`Erro ao enviar mídia: ${error.message}`, error.stack);
        res.status(400).json({ error: error.message });
      }
    });

    this.#app.get('/api/whatsapp/file/:messageId', async (req, res) => {
      res.set('Access-Control-Allow-Origin', config.corsOrigin);
      try {
        const { filePath, contentType, filename } = await this.#useCases.getFileUseCase.execute(req.params.messageId);
        console.log(`Servindo arquivo para messageId ${req.params.messageId}: ${filePath}`);
        res.set('Content-Type', contentType);
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(filePath);
      } catch (error) {
        console.error(`Erro ao baixar arquivo: ${error.message}`, error.stack);
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