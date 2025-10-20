const HttpServer = require('./presentation/httpServer');
const WhatsAppClient = require('./infrastructure/whatsapp/WhatsAppClient');
const FileSystemAdapter = require('./infrastructure/fileSystem/FileSystemAdapter');
const SendTextMessageUseCase = require('./application/useCases/SendTextMessageUseCase');
const ListChatsUseCase = require('./application/useCases/ListChatsUseCase');
const ListMessagesUseCase = require('./application/useCases/ListMessagesUseCase');
const GetMediaUseCase = require('./application/useCases/GetMediaUseCase');
const SendMediaMessageUseCase = require('./application/useCases/SendMediaMessageUseCase');
const GetFileUseCase = require('./application/useCases/GetFileUseCase');
const GetPhotoProfileUseCase = require('./application/useCases/GetPhotoProfileUseCase');
const WhatsAppConnection = require('./infrastructure/whatsapp/WhatsAppConnection');
const config = require('./config/config');


async function main() {
  const connection = new WhatsAppConnection();
  const fileSystemAdapter = new FileSystemAdapter();
  const whatsAppClient = new WhatsAppClient(connection);

  const useCases = {
    sendTextMessageUseCase: new SendTextMessageUseCase(whatsAppClient),
    listChatsUseCase: new ListChatsUseCase(whatsAppClient,config),
    listMessagesUseCase: new ListMessagesUseCase(whatsAppClient),
    getMediaUseCase: new GetMediaUseCase(whatsAppClient),
    sendMediaMessageUseCase: new SendMediaMessageUseCase(whatsAppClient),
    getFileUseCase: new GetFileUseCase(whatsAppClient, fileSystemAdapter),
    GetPhotoProfileUseCase: new GetPhotoProfileUseCase(whatsAppClient),
  };

  const server = new HttpServer(useCases, whatsAppClient, fileSystemAdapter);

  try {
    await fileSystemAdapter.ensureCacheDirectory();
    

    await server.start();
    const io = server.getIO(); // Pega a instância do Socket.io do servidor
    whatsAppClient.setupMessageListener((msg) => {
      io.to(msg.from).emit('newMessage', msg.toJSON());
      io.to(msg.to).emit('newMessage', msg.toJSON());
    });
    
    console.log("Aplicação iniciada com sucesso.");

  } catch (error) {
     console.error(`Erro ao inicializar a infraestrutura: ${error.message}`, error.stack);
     process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Erro fatal ao iniciar a aplicação: ${error.message}`, error.stack);
  process.exit(1);
});