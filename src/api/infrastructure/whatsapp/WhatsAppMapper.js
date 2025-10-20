const Message = require('../../domain/entities/Message');
const mime = require('mime-types');

class WhatsAppMapper {
  
  static toDomainMessage(msg) {
    const typeToMimetype = {
      image: 'image/jpeg', video: 'video/mp4', audio: 'audio/ogg',
      document: 'application/pdf', chat: null, sticker: 'image/webp',
      voice: 'audio/ogg', ptt: 'audio/ogg',
    };
    
    const mimetype = msg.hasMedia ? (typeToMimetype[msg.type] || 'application/octet-stream') : null;
    let filename = msg.hasMedia ? `media_${msg.id._serialized}` : null;
    if (msg.hasMedia && mimetype) {
      const extension = mime.extension(mimetype) || '';
      if (extension) filename = `${msg.id._serialized}.${extension}`;
    }

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
  }
  
  // adicionar outros mappers aqui, ex: toDomainChat(chat)
}

module.exports = WhatsAppMapper;