import { Component, OnInit, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
// @ts-ignore
import RFB from '@novnc/novnc/lib/rfb';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

@Component({
  selector: 'app-host-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-screen bg-[#0d1117] text-gray-200 font-sans overflow-hidden">
      
      <!-- Sidebar -->
      <aside class="w-64 bg-[#161b22] border-r border-gray-800 flex flex-col">
        <div class="p-6 pb-2">
          <div class="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 tracking-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            RMM Proxy
          </div>
        </div>
        
        <nav class="flex-1 px-4 py-6 space-y-2">
          <a href="#" class="flex items-center gap-3 px-4 py-2.5 bg-blue-600/10 text-blue-400 rounded-lg font-medium transition-colors border border-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm9 3a1 1 0 01-2 0V6a1 1 0 012 0v2zm-4 0a1 1 0 01-2 0V6a1 1 0 012 0v2zm4 4a1 1 0 01-2 0v-2a1 1 0 012 0v2zm-4 0a1 1 0 01-2 0v-2a1 1 0 012 0v2z" clip-rule="evenodd" />
            </svg>
            Endpoints
          </a>
          <a href="#" class="flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-[#21262d] rounded-lg font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            Settings
          </a>
        </nav>
        
        <div class="p-4 border-t border-gray-800">
          <button class="w-full flex items-center justify-center gap-2 bg-[#21262d] hover:bg-red-500/10 hover:text-red-400 text-gray-400 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm border border-transparent hover:border-red-500/20">
            Sign Out
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden relative">
        <header class="h-20 border-b border-gray-800 flex justify-between items-center px-10 bg-[#0d1117] shrink-0">
          <div>
            <h1 class="text-2xl font-bold text-gray-100">Active Endpoints</h1>
            <p class="text-gray-500 text-xs mt-1">Manage and remote control connected machines</p>
          </div>
          <button (click)="refresh()" class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg transition-all duration-200 font-medium shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] text-sm">
            Refresh
          </button>
        </header>

        <div class="flex-1 overflow-auto p-10">
          <div class="bg-[#161b22] rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-[#1f242c] text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-800">
                  <th class="p-5 font-semibold w-32">Status</th>
                  <th class="p-5 font-semibold">Hostname / ID</th>
                  <th class="p-5 font-semibold">Network IP</th>
                  <th class="p-5 font-semibold">Telemetry</th>
                  <th class="p-5 font-semibold text-right w-48">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800/60">
                <tr *ngFor="let host of hosts()" class="hover:bg-[#1a1f26] transition-colors group">
                  <td class="p-5">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                          [ngClass]="host.online ? 'bg-green-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'">
                      <span class="relative flex h-1.5 w-1.5">
                         <span *ngIf="host.online" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span class="relative inline-flex rounded-full h-1.5 w-1.5" [ngClass]="host.online ? 'bg-emerald-500' : 'bg-red-500'"></span>
                      </span>
                      {{ host.online ? 'Online' : 'Offline' }}
                    </span>
                  </td>
                  
                  <td class="p-5">
                    <div class="font-bold text-gray-200 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm9 3a1 1 0 01-2 0V6a1 1 0 012 0v2zm-4 0a1 1 0 01-2 0V6a1 1 0 012 0v2zm4 4a1 1 0 01-2 0v-2a1 1 0 012 0v2zm-4 0a1 1 0 01-2 0v-2a1 1 0 012 0v2z" clip-rule="evenodd" />
                      </svg>
                      {{ host.hostname }}
                    </div>
                    <div class="text-[11px] text-gray-500 mt-1 font-mono tracking-tight">{{ host.machineId }}</div>
                  </td>
                  
                  <td class="p-5">
                    <div class="font-mono text-sm text-gray-300">{{ host.privateIp }}</div>
                    <div class="text-[11px] text-gray-600 mt-1" *ngIf="host.publicIp !== '0.0.0.0'">{{ host.publicIp }}</div>
                  </td>
                  
                  <td class="p-5">
                    <div class="text-sm text-gray-300 capitalize truncate max-w-[200px]" title="{{ host.cpu }}">{{ host.cpu }}</div>
                    <div class="text-[11px] text-gray-500 mt-1 font-medium flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {{ host.ram }}
                    </div>
                  </td>
                  
                  <td class="p-5 flex justify-end gap-2">
                    <button (click)="openShell(host)" 
                            [disabled]="!host.online"
                            class="bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white px-4 py-1.5 rounded text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed">
                      Terminal
                    </button>
                    <button (click)="openVnc(host)" 
                            [disabled]="!host.online"
                            class="bg-blue-600/10 text-blue-400 hover:bg-blue-500 hover:text-white px-5 py-1.5 rounded text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed border border-blue-500/20 hover:border-transparent focus:ring-2 focus:ring-blue-500/50">
                      Connect
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div *ngIf="hosts().length === 0" class="p-12 text-center text-gray-500 text-sm">
              No hosts registered yet. Ensure Windows Client is running.
            </div>
          </div>
        </div>

        <!-- Session Modal Overlay -->
        <div *ngIf="activeSessionHost()" class="absolute inset-0 z-50 bg-[#0d1117] flex flex-col animate-in fade-in duration-200">
          <header class="h-14 bg-[#161b22] border-b border-gray-800 px-6 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <span class="relative flex h-2 w-2">
                 <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span class="font-mono text-sm font-medium text-gray-200">{{ activeSessionHost()?.hostname }} - {{ sessionType() === 'vnc' ? 'Live Screen' : 'Remote Terminal' }}</span>
            </div>
            <button (click)="closeSession()" class="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 transition-colors px-3 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-sm">
              Disconnect
            </button>
          </header>
          
          <div class="flex-1 bg-black relative p-2" #sessionContainer>
             <div *ngIf="isConnecting()" class="absolute inset-0 flex items-center justify-center flex-col gap-4 z-10">
                <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div class="text-gray-400 text-sm animate-pulse">Negotiating Protocol Bridge...</div>
             </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class HostListComponent implements OnInit {
  @ViewChild('sessionContainer', { static: false }) sessionContainer!: ElementRef;
  
  private http = inject(HttpClient);
  private token: string | null = null;

  hosts = signal<any[]>([]);
  activeSessionHost = signal<any | null>(null);
  sessionType = signal<'vnc' | 'terminal' | null>(null);
  isConnecting = signal<boolean>(false);
  
  rfbInstance: any = null;
  terminalInstance: Terminal | null = null;
  terminalWs: WebSocket | null = null;

  ngOnInit() {
    // Perform mock admin login to retrieve JWT token on startup
    this.http.post<any>('/api/login', {}).subscribe({
      next: (res) => {
        this.token = res.token;
        this.refresh();
        // Poll for live heartbeat telemetry
        setInterval(() => this.refresh(), 5000);
      },
      error: (err) => console.error('Failed to login:', err)
    });
  }

  refresh() {
    if (!this.token) return;
    
    this.http.get<any[]>('/api/hosts', {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (data) => this.hosts.set(data),
      error: (err) => console.error('Error fetching host data:', err)
    });
  }

  openVnc(host: any) {
    this.activeSessionHost.set(host);
    this.sessionType.set('vnc');
    this.isConnecting.set(true);
    
    this.http.post<any>(`/api/hosts/${host.machineId}/ticket`, {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (res) => setTimeout(() => this.initVncCanvas(res.ticket, host.machineId), 100),
      error: (err) => {
        alert('Server refused to generate a VNC ticket.');
        this.closeSession();
      }
    });
  }

  openShell(host: any) {
    this.activeSessionHost.set(host);
    this.sessionType.set('terminal');
    this.isConnecting.set(true);
    
    this.http.post<any>(`/api/hosts/${host.machineId}/shell-ticket`, {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (res) => setTimeout(() => this.initTerminalCanvas(res.ticket, host.machineId), 100),
      error: (err) => {
        alert('Server refused to generate a Shell ticket.');
        this.closeSession();
      }
    });
  }

  initVncCanvas(ticket: string, machineId: string) {
    if (!this.sessionContainer) return;
    const wsUrl = `ws://187.124.47.7:3000/vnc?ticket=${ticket}`;
    
    try {
      this.rfbInstance = new RFB(this.sessionContainer.nativeElement, wsUrl, {
        credentials: { password: '' } 
      });

      this.rfbInstance.qualityLevel = 2;
      this.rfbInstance.compressionLevel = 9;
      this.rfbInstance.scaleViewport = true;
      this.rfbInstance.clipViewport = true;
      this.rfbInstance.background = '#000000';

      this.rfbInstance.addEventListener('connect', () => this.isConnecting.set(false));
      this.rfbInstance.addEventListener('disconnect', () => this.closeSession());
    } catch (e) {
      this.closeSession();
    }
  }

  initTerminalCanvas(ticket: string, machineId: string) {
    if (!this.sessionContainer) return;
    const wsUrl = `ws://187.124.47.7:3000/shell?ticket=${ticket}`;
    
    this.terminalInstance = new Terminal({
      cursorBlink: true,
      theme: { background: '#0d1117' },
      fontFamily: 'Consolas, monospace',
      fontSize: 14
    });
    
    const fitAddon = new FitAddon();
    this.terminalInstance.loadAddon(fitAddon);
    this.terminalInstance.open(this.sessionContainer.nativeElement);
    
    this.terminalWs = new WebSocket(wsUrl);
    
    this.terminalWs.onopen = () => {
      this.isConnecting.set(false);
      fitAddon.fit();
    };
    
    // Bridge terminal stream directly to WebSocket manually to avoid xterm-addon-attach generic bugs:
    this.terminalWs.onmessage = (ev) => {
       this.terminalInstance?.write(ev.data);
    };
    
    this.terminalInstance.onData((data: string) => {
       if (this.terminalWs?.readyState === WebSocket.OPEN) {
          this.terminalWs.send(data);
       }
    });

    this.terminalWs.onclose = () => this.closeSession();
    window.addEventListener('resize', () => fitAddon.fit());
  }

  closeSession() {
    this.isConnecting.set(false);
    
    if (this.rfbInstance) {
      try { this.rfbInstance.disconnect(); } catch (e) {}
      this.rfbInstance = null;
    }
    
    if (this.terminalWs) {
      try { this.terminalWs.close(); } catch(e) {}
      this.terminalWs = null;
    }
    
    if (this.terminalInstance) {
      this.terminalInstance.dispose();
      this.terminalInstance = null;
    }
    
    this.activeSessionHost.set(null);
    this.sessionType.set(null);
  }
}
