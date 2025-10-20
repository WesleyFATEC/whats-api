const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppConnection {
  #client;
  #clientReadyPromise;

  constructor() {
    this.#clientReadyPromise = new Promise((resolve, reject) => {
      this.#client = new Client({
        authStrategy: new LocalAuth({ clientId: 'whatsapp-api-bot' }),
        puppeteer: { headless: false 
                 /*executablePath: '/usr/bin/chromium-browser',*/
      
    }
      });

      this.#client.on('qr', (qr) => {
        console.log('QR Code recebido, escaneie com o WhatsApp:');
        qrcode.generate(qr, { small: true });
      });

      this.#client.on('ready', () => {
        console.log('WhatsApp Client está pronto!');
        resolve(this.#client);
      });
      
      this.#client.on('disconnected', () => {
        console.log('WhatsApp Client desconectado.');
        // inserir logicca de reconexão se necessário
      });

      this.#client.initialize().catch((error) => {
        console.error(`Erro ao inicializar WhatsApp Client: ${error.message}`, error.stack);
        reject(error);
      });
    });
  }

  /**
   * @returns {Promise<Client>}
   */
  async getClient() {
    return this.#clientReadyPromise;
  }
}

module.exports = WhatsAppConnection;