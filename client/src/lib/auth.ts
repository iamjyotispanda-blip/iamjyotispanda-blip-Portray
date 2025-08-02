import { queryClient, apiRequest } from "./queryClient";
import type { LoginCredentials, User } from "@shared/schema";

interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export class AuthService {
  private static TOKEN_KEY = "portray_auth_token";
  private static USER_KEY = "portray_user";

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      const data: AuthResponse = await response.json();
      
      this.setToken(data.token);
      this.setUser(data.user);
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await apiRequest("POST", "/api/auth/logout", undefined);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.removeToken();
      queryClient.clear();
    }
  }

  static async getCurrentUser(): Promise<User> {
    const response = await apiRequest("GET", "/api/auth/me");
    const data = await response.json();
    this.setUser(data.user);
    return data.user;
  }

  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
