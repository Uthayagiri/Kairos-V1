import { apiClient } from '../../api/services/apiClient';
import { API_CONFIG } from '../../api/config/apiConfig';

export type ConnectivityState = 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | 'SYNCING';

type ConnectivityListener = (state: ConnectivityState) => void;

class ConnectivityManager {
  private state: ConnectivityState = 'UNKNOWN';
  private listeners: Set<ConnectivityListener> = new Set();
  private isChecking = false;
  private checkInterval: any = null;
  private consecutiveFailures = 0;

  constructor() {
    this.setupNetworkListeners();
    this.startPeriodicChecks();
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.checkBackendConnectivity();
      });

      window.addEventListener('offline', () => {
        this.setState('OFFLINE');
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkBackendConnectivity();
        }
      });
    }
  }

  /**
   * Starts lightweight periodic reachability polling.
   */
  public startPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    if (typeof window !== 'undefined') {
      // Periodic check every 30s
      this.checkInterval = setInterval(() => {
        this.checkBackendConnectivity();
      }, 30000);

      // Immediate check
      setTimeout(() => this.checkBackendConnectivity(), 100);
    }
  }

  public stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Probes backend /api/v1/sync/status endpoint to confirm true backend reachability.
   */
  public async checkBackendConnectivity(): Promise<boolean> {
    if (this.isChecking) {
      return this.state === 'ONLINE' || this.state === 'SYNCING';
    }

    // If browser itself reports offline, fast fail
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setState('OFFLINE');
      return false;
    }

    this.isChecking = true;
    try {
      const res = await apiClient.get<{ online: boolean }>(API_CONFIG.ENDPOINTS.SYNC_STATUS, {
        timeout: 4000,
        skipAuth: true,
        skipAutoRefresh: true
      });

      if (res && res.online) {
        this.consecutiveFailures = 0;
        if (this.state !== 'SYNCING') {
          this.setState('ONLINE');
        }
        return true;
      }

      this.handleFailure();
      return false;
    } catch {
      this.handleFailure();
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  private handleFailure(): void {
    this.consecutiveFailures++;
    this.setState('OFFLINE');
  }

  /**
   * Sets current connectivity state and notifies listeners.
   */
  public setState(newState: ConnectivityState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyListeners();
    }
  }

  public getState(): ConnectivityState {
    return this.state;
  }

  public isOnline(): boolean {
    return this.state === 'ONLINE' || this.state === 'SYNCING';
  }

  public setSyncing(isSyncing: boolean): void {
    if (isSyncing) {
      this.setState('SYNCING');
    } else {
      this.setState('ONLINE');
    }
  }

  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error in connectivity listener:', err);
      }
    });
  }
}

export const connectivityManager = new ConnectivityManager();
