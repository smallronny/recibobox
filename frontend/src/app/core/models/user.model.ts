export type UserRole = 'admin' | 'operador';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: User;
}

