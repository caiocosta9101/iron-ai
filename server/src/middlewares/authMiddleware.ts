import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Estendemos a interface padrão do Express para o TypeScript parar de reclamar
// que a propriedade 'userId' não existe no 'req'.
export interface AuthRequest extends Request {
  userId?: number; // ou string, dependendo de como está o tipo do seu ID no banco
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 2. Busca o token no cabeçalho da requisição
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido. Acesso negado.' });
  }

  // 3. Separa a palavra "Bearer" do hash do token
  const [, token] = authHeader.split(' ');

  try {
    // 4. Valida a assinatura e a expiração do token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    
    // 5. Injeta o ID do usuário (que estava guardado no token) dentro do 'req'
    req.userId = (decoded as any).id;

    // 6. Tudo certo! Manda a requisição seguir para o Controller.
    return next(); 
  } catch (err) {
    // Se a chave secreta não bater ou o tempo de 8h tiver passado, ele barra aqui.
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};