import axios from 'axios';

/**
 * Connectivity Service
 * Probes browser network status and actively verifies backend API reachability.
 */
export class ConnectivityService {
  constructor(options = {}) {
    this.healthEndpoint = options.healthEndpoint || '/api/health';
    this.probeTimeoutMs = options.probeTimeoutMs || 3000;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isServerReachable = false;
    this.databaseConnected = false;
    this.lastChecked = null;
    this.listeners = new Set();
    this.probeTimer = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getStatus();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('Error in connectivity listener:', e);
      }
    }
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    if (!online) {
      this.isServerReachable = false;
      this.notify();
    } else {
      // Re-probe server immediately
      this.checkServerReachability();
    }
  }

  /**
   * Probe server health endpoint to confirm true end-to-end communication
   * @returns {Promise<Object>}
   */
  async checkServerReachability() {
    this.lastChecked = new Date().toISOString();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOnline = false;
      this.isServerReachable = false;
      this.notify();
      return this.getStatus();
    }

    try {
      const response = await axios.get(this.healthEndpoint, {
        timeout: this.probeTimeoutMs,
      });

      if (response && response.status === 200 && response.data?.status === 'ONLINE') {
        this.isServerReachable = true;
        this.databaseConnected = response.data.database === 'connected';
      } else {
        this.isServerReachable = false;
      }
    } catch (err) {
      this.isServerReachable = false;
      this.databaseConnected = false;
    }

    this.notify();
    return this.getStatus();
  }

  getStatus() {
    let mode = 'LOCAL_AUTONOMOUS';
    if (this.isOnline && this.isServerReachable) {
      mode = 'ONLINE';
    } else if (this.isOnline && !this.isServerReachable) {
      mode = 'DEGRADED';
    }

    return {
      isOnline: this.isOnline,
      isServerReachable: this.isServerReachable,
      databaseConnected: this.databaseConnected,
      mode,
      lastChecked: this.lastChecked,
    };
  }

  startPeriodicProbe(intervalMs = 30000) {
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.checkServerReachability();
    this.probeTimer = setInterval(() => this.checkServerReachability(), intervalMs);
  }

  stopPeriodicProbe() {
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = null;
    }
  }
}

export const connectivityService = new ConnectivityService();
