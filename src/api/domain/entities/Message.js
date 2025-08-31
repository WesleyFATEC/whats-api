class Message {
  constructor({ id, from, fromMe, body, timestamp, type, hasMedia, media }) {
    this.id = id;
    this.from = from;
    this.fromMe = fromMe;
    this.body = body || '';
    this.timestamp = timestamp;
    this.type = type;
    this.hasMedia = hasMedia;
    this.media = media ? { mimetype: media.mimetype, filename: media.filename } : null;
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      fromMe: this.fromMe,
      body: this.body,
      timestamp: this.timestamp,
      type: this.type,
      hasMedia: this.hasMedia,
      media: this.media,
    };
  }
}

module.exports = Message;