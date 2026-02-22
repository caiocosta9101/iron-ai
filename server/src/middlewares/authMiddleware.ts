import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Estendemos a interface padrão do Express para o TypeScript parar de reclamar
// que a propriedade 'userId' não existe no 'req'.
export interface AuthRequest extends Request {
  userId?: number;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 2. Busca o token no cabeçalho da requisição
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido. Acesso negado.' });
  }

  // 3. Valida se o formato é realmente "Bearer <token>"
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  // 4. Separa a palavra "Bearer" do hash do token
  const [, token] = authHeader.split(' ');

  // 5. Valida se o JWT_SECRET está configurado no ambiente
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não configurado no ambiente!');
    return res.status(500).json({ error: 'Erro interno de configuração.' });
  }

  try {
    // 6. Valida a assinatura e a expiração do token
    const decoded = jwt.verify(token, secret);
    
    // 7. Injeta o ID do usuário (que estava guardado no token) dentro do 'req'
    req.userId = (decoded as any).id;

    // 8. Tudo certo! Manda a requisição seguir para o Controller.
    return next(); 
  } catch (err) {
    // Se a chave secreta não bater ou o tempo de 8h tiver passado, ele barra aqui.
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};