import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Global application configuration loaded at runtime.
 */
export interface AppConfig {
  backendUrl: string; // e.g. "http://187.124.47.7:3000"
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private config: AppConfig | null = null;

  /**
   * Loads the configuration from assets/app-config.json during app initialization.
   */
  async loadConfig(): Promise<void> {
    try {
      this.config = await firstValueFrom(
        this.http.get<AppConfig>('assets/app-config.json')
      );
      console.log('[ConfigService] Runtime configuration loaded:', this.config);
    } catch (err) {
      console.warn('[ConfigService] Could not load app-config.json, falling back to defaults:', err);
      this.config = { backendUrl: '' };
    }
  }

  /**
   * Returns the backend base URL (without trailing slash).
   * If backendUrl is set in config, it uses it.
   * Otherwise, it defaults to the current window origin.
   */
  getApiBaseUrl(): string {
    if (this.config?.backendUrl) {
      return this.config.backendUrl.replace(/\/$/, '');
    }
    // Fallback: If we're on localhost:4200, we might want to still use the proxy /api
    // but the user wants to "call backend url without using static".
    // If the config is empty, we return empty string so relative paths work via proxy.
    return '';
  }

  /**
   * Returns the WebSocket base URL.
   */
  getWsBaseUrl(): string {
    const apiBase = this.getApiBaseUrl();
    if (apiBase) {
      return apiBase.replace(/^http/, 'ws');
    }
    // If no absolute URL, derive from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
}
