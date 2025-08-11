import { queryClient, apiRequest } from "./queryClient";
import type { LoginCredentials, User } from "@shared/schema";

interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
  redirectPath?: string;
}

export class AuthService {
  private static TOKEN_KEY = "portray_auth_token";
  private static USER_KEY = "portray_user";

  static getToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(AuthService.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.USER_KEY);
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(AuthService.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static setUser(user: User): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  static isAuthenticated(): boolean {
    return !!AuthService.getToken();
  }

  static async validateSession(): Promise<boolean> {
    const token = AuthService.getToken();
    if (!token) {
      return false;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        AuthService.setUser(data.user);
        return true;
      } else {
        // Token is invalid, remove it
        AuthService.removeToken();
        return false;
      }
    } catch (error) {
      // Network error or other issues, assume invalid session
      AuthService.removeToken();
      return false;
    }
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiRequest("/api/auth/login", "POST", credentials);
      const data: AuthResponse = await response.json();
      
      console.log("Login successful, storing token:", data.token);
      AuthService.setToken(data.token);
      AuthService.setUser(data.user);
      console.log("Token stored, isAuthenticated:", AuthService.isAuthenticated());
      
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      const token = AuthService.getToken();
      if (token) {
        await apiRequest("/api/auth/logout", "POST");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      AuthService.removeToken();
      queryClient.clear();
    }
  }

  static async getCurrentUser(): Promise<User> {
    const response = await apiRequest("/api/auth/me", "GET");
    const data = await response.json();
    AuthService.setUser(data.user);
    return data.user;
  }

  static getAuthHeaders(): Record<string, string> {
    const token = AuthService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
