import crypto from 'node:crypto';
import { AppDataSource } from '../../config/database';
import { AppError } from '../../config/errors';
import { User, type UserRole } from '../users/user.entity';

export interface UserPayload {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  exp: number;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET || 'recibo-box-secret-key-2026-production';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf8');
}

export class AuthService {
  private repo() {
    return AppDataSource.getRepository(User);
  }

  // --- HASH DE CONTRASEÑA CON NODE:CRYPTO ---
  hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const hashBuffer = Buffer.from(hash, 'hex');
      const testBuffer = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(hashBuffer, testBuffer);
    } catch {
      return false;
    }
  }

  // --- TOKEN JWT CON NODE:CRYPTO (HMAC-SHA256) ---
  createToken(user: User): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    // Expira en 7 días
    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const payload = base64UrlEncode(
      JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        exp,
      }),
    );

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${header}.${payload}.${signature}`;
  }

  verifyToken(token: string): UserPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, payload, signature] = parts;

      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      if (signature !== expectedSignature) return null;

      const data = JSON.parse(base64UrlDecode(payload)) as UserPayload;
      if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expirado
      }
      return data;
    } catch {
      return null;
    }
  }

  // --- LOGIN ---
  async login(identifier: string, password: string): Promise<{ token: string; user: UserResponse }> {
    const user = await this.repo().findOne({
      where: [{ username: identifier }, { email: identifier }],
    });

    if (!user || !user.is_active) {
      throw new AppError(401, 'Credenciales incorrectas');
    }

    const isValid = this.verifyPassword(password, user.password_hash, user.password_salt);
    if (!isValid) {
      throw new AppError(401, 'Credenciales incorrectas');
    }

    const token = this.createToken(user);
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  // --- VERIFICAR USUARIO ACTUAL ---
  async getProfile(id: number): Promise<UserResponse> {
    const user = await this.repo().findOneBy({ id });
    if (!user || !user.is_active) throw new AppError(404, 'Usuario no encontrado');
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  // --- AUTO-SEED DE ADMINISTRADOR INICIAL ---
  async ensureInitialAdmin(): Promise<void> {
    try {
      const count = await this.repo().count();
      if (count === 0) {
        const defaultUser = process.env.DEFAULT_ADMIN_USER || 'admin';
        const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@recibobox.com';
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

        const { hash, salt } = this.hashPassword(defaultPassword);
        await this.repo().save({
          username: defaultUser,
          email: defaultEmail,
          password_hash: hash,
          password_salt: salt,
          role: 'admin',
          is_active: true,
        });
        console.log(`👤 Usuario administrador inicial creado: ${defaultUser} / ${defaultPassword}`);
      }
    } catch (err) {
      // Si la tabla users aún no se ha creado con schema.sql, no tumbar el servidor
      console.warn('⚠ Advertencia al verificar administrador inicial:', (err as any).message);
    }
  }
}

