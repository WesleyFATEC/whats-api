const AppError  = require('./AppError');
class ValidationError extends AppError {
  constructor(message = 'Erro de validação') {
    super(message, 400);
  }
}

module.exports = ValidationError;