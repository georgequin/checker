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
    <div class="h-full w-full relative text-gray-200 font-sans overflow-hidden flex flex-col bg-[#0d1117]">
      
      <!-- Toast Notification -->
      <div *ngIf="toastMessage()" class="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
         <div class="bg-[#161b22] border rounded-lg shadow-2xl flex items-start gap-3 p-4 min-w-[300px] border-l-4"
              [ngClass]="{
                'border-red-500': toastMessage()?.type === 'error',
                'border-blue-500': toastMessage()?.type === 'info',
                'border-emerald-500': toastMessage()?.type === 'success'
              }">
            <div class="mt-0.5">
               <svg *ngIf="toastMessage()?.type === 'error'" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
               <svg *ngIf="toastMessage()?.type === 'info'" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <svg *ngIf="toastMessage()?.type === 'success'" class="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            <div class="flex-1">
               <h4 class="text-sm font-semibold text-gray-100">{{ toastMessage()?.title }}</h4>
               <p class="text-[13px] text-gray-400 mt-1 leading-snug">{{ toastMessage()?.message }}</p>
            </div>
            <button (click)="toastMessage.set(null)" class="text-gray-500 hover:text-white transition-colors p-1">
               <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
         </div>
      </div>

      <!-- Confirm Dialog Modal -->
      <div *ngIf="confirmDialog()" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
         <div class="bg-[#161b22] border border-gray-700/50 rounded-xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 to-orange-500"></div>
            <h3 class="text-lg font-bold text-gray-100 flex items-center gap-2">
               <svg class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
               </svg>
               {{ confirmDialog()?.title }}
            </h3>
            <p class="text-[13px] text-gray-400 mt-3 leading-relaxed">{{ confirmDialog()?.message }}</p>
            <div class="flex justify-end gap-3 mt-6">
               <button (click)="cancelConfirm()" class="px-4 py-2 rounded-lg bg-[#21262d] text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm font-medium border border-gray-700/50">Cancel</button>
               <button (click)="executeConfirm()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)]">Proceed</button>
            </div>
         </div>
      </div>
        <header class="h-20 border-b border-gray-800 flex justify-between items-center px-10 bg-[#0d1117] shrink-0">
          <div>
            <h1 class="text-2xl font-bold text-gray-100">Active Endpoints</h1>
            <p class="text-gray-500 text-xs mt-1">Manage and remote control connected machines</p>
          </div>
          <div class="flex items-center gap-4">
            <!-- Active Session Banner -->
            <div *ngIf="activeSessionHost() && isSessionMinimized()" class="bg-blue-600/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg flex items-center gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span class="text-sm font-semibold truncate max-w-[150px]">{{ activeSessionHost()?.hostname }}</span>
                </div>
                <div class="text-[10px] text-blue-300/70 uppercase tracking-widest mt-0.5">{{ sessionType() === 'vnc' ? 'Screen Session' : 'Terminal Session' }}</div>
              </div>
              <div class="flex gap-2">
                <button (click)="resumeSession()" class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors font-medium">Resume</button>
                <button (click)="closeSession()" class="text-xs bg-[#21262d] hover:bg-red-500 text-gray-300 hover:text-white px-3 py-1.5 rounded transition-colors font-medium border border-gray-700 hover:border-transparent">End</button>
              </div>
            </div>

            <button (click)="refresh()" class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg transition-all duration-200 font-medium shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] text-sm">
              Refresh
            </button>
          </div>
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
                  <th *ngIf="isSuperAdmin()" class="p-5 font-semibold">Owner</th>
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
                  
                  <td *ngIf="isSuperAdmin()" class="p-5">
                    <span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700">
                      {{ host.owner }}
                    </span>
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
        <div [ngClass]="(activeSessionHost() && !isSessionMinimized()) ? 'opacity-100 z-50 pointer-events-auto' : 'opacity-0 z-[-10] pointer-events-none'"
             class="absolute inset-0 bg-[#0d1117] flex-col transition-all duration-300 flex">
          <header class="h-14 bg-[#161b22] border-b border-gray-800 px-6 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <span class="relative flex h-2 w-2">
                 <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span class="font-mono text-sm font-medium text-gray-200">{{ activeSessionHost()?.hostname }} - {{ sessionType() === 'vnc' ? 'Live Screen' : 'Remote Terminal' }}</span>
            </div>
            <div class="flex gap-2">
              <button (click)="minimizeSession()" class="text-gray-400 hover:text-white bg-[#21262d] hover:bg-gray-700 transition-colors px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm border border-gray-700">
                Minimize to Background
              </button>
              <button (click)="closeSession()" class="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 transition-colors px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm">
                Disconnect
              </button>
            </div>
          </header>
          
          <div class="flex-1 bg-black relative p-2">
             <!-- Internal container for external dom manipulation by terminal/canvas -->
             <div #sessionContainer class="w-full h-full"></div>
             
             <!-- overlay loading spinner -->
             <div *ngIf="isConnecting()" class="absolute inset-0 flex items-center justify-center flex-col gap-4 z-10 bg-[#0d1117]/80 backdrop-blur-sm">
                <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div class="text-gray-200 text-sm animate-pulse font-medium">Negotiating Protocol Bridge...</div>
             </div>
          </div>
        </div>
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
  isSessionMinimized = signal<boolean>(false);
  
  toastMessage = signal<{title: string, message: string, type: 'error' | 'info' | 'success'} | null>(null);
  confirmDialog = signal<{title: string, message: string, onConfirm: () => void, onCancel?: () => void} | null>(null);
  me = signal<any>(null);

  isSuperAdmin() {
    return this.me()?.role === 'SUPER_ADMIN';
  }
  
  rfbInstance: any = null;
  terminalInstance: Terminal | null = null;
  terminalWs: WebSocket | null = null;

  ngOnInit() {
    this.token = localStorage.getItem('rmm-token');
    if (this.token) {
       this.fetchMe();
       this.refresh();
       // Poll for live heartbeat telemetry
       setInterval(() => this.refresh(), 5000);
    }
  }

  fetchMe() {
    const headers = { Authorization: `Bearer ${this.token}` };
    this.http.get<any>('/api/me', { headers }).subscribe(data => {
      this.me.set(data);
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

  showToast(title: string, message: string, type: 'error' | 'info' | 'success' = 'info') {
    this.toastMessage.set({title, message, type});
    setTimeout(() => {
       if (this.toastMessage()?.message === message) {
          this.toastMessage.set(null);
       }
    }, 5000);
  }

  showConfirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
    this.confirmDialog.set({title, message, onConfirm, onCancel});
  }

  cancelConfirm() {
    const dialog = this.confirmDialog();
    if (dialog && dialog.onCancel) dialog.onCancel();
    this.confirmDialog.set(null);
  }

  executeConfirm() {
    const dialog = this.confirmDialog();
    if (dialog && dialog.onConfirm) dialog.onConfirm();
    this.confirmDialog.set(null);
  }

  openVnc(host: any) {
    if (this.activeSessionHost()) {
      if (this.activeSessionHost().machineId === host.machineId && this.sessionType() === 'vnc') {
         this.resumeSession();
         return;
      } else {
         this.showConfirm(
           'Active Session Discovered', 
           `You already have an active background session running with ${this.activeSessionHost().hostname}. Disconnect it and securely migrate to a new VNC session with ${host.hostname}?`,
           () => {
             this.closeSession();
             this.executeVnc(host);
           }
         );
         return;
      }
    }
    this.executeVnc(host);
  }

  private executeVnc(host: any) {
    this.activeSessionHost.set(host);
    this.sessionType.set('vnc');
    this.isConnecting.set(true);
    this.isSessionMinimized.set(false);
    
    // Clear old container if exists
    if (this.sessionContainer && this.sessionContainer.nativeElement) {
      this.sessionContainer.nativeElement.innerHTML = '';
    }
    
    this.http.post<any>(`/api/hosts/${host.machineId}/ticket`, {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (res) => setTimeout(() => this.initVncCanvas(res.ticket, host.machineId), 50),
      error: (err) => {
        this.showToast('Connection Refused', 'Server refused to generate a VNC ticket. Target might be offline or proxy blocked.', 'error');
        this.closeSession();
      }
    });
  }

  openShell(host: any) {
    if (this.activeSessionHost()) {
      if (this.activeSessionHost().machineId === host.machineId && this.sessionType() === 'terminal') {
         this.resumeSession();
         return;
      } else {
         this.showConfirm(
           'Active Session Discovered', 
           `You already have an active background session running with ${this.activeSessionHost().hostname}. Disconnect it and securely migrate to a new Terminal session with ${host.hostname}?`,
           () => {
             this.closeSession();
             this.executeShell(host);
           }
         );
         return;
      }
    }
    this.executeShell(host);
  }

  private executeShell(host: any) {
    this.activeSessionHost.set(host);
    this.sessionType.set('terminal');
    this.isConnecting.set(true);
    this.isSessionMinimized.set(false);
    
    // Clear old container if exists
    if (this.sessionContainer && this.sessionContainer.nativeElement) {
      this.sessionContainer.nativeElement.innerHTML = '';
    }
    
    this.http.post<any>(`/api/hosts/${host.machineId}/shell-ticket`, {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (res) => setTimeout(() => this.initTerminalCanvas(res.ticket, host.machineId), 50),
      error: (err) => {
        this.showToast('Terminal Refused', 'Server refused to generate a Shell ticket. Target might be offline.', 'error');
        this.closeSession();
      }
    });
  }

  minimizeSession() {
    this.isSessionMinimized.set(true);
  }

  resumeSession() {
    this.isSessionMinimized.set(false);
    
    // Explicitly force a resize event to allow Xterm and NoVNC to recalculate their internal canvases
    // once the DOM element shifts from display: none to display: flex
    setTimeout(() => {
       window.dispatchEvent(new Event('resize'));
    }, 50);
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
      this.rfbInstance.addEventListener('disconnect', (e: any) => {
         if (this.isSessionMinimized()) {
            this.showToast('Session Dropped', 'The background VNC session was disconnected gracefully.', 'info');
         }
         this.closeSession();
      });
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
       // Convert raw \n (without preceding \r) to \r\n to prevent the staircase effect in xterm
       const text = ev.data.replace(/(?<!\r)\n/g, '\r\n');
       this.terminalInstance?.write(text);
    };
    
    this.terminalInstance.onData((data: string) => {
       // Local pseudo-tty echo mechanism (since raw detached processes do not natively echo lines)
       if (data === '\r') {
          this.terminalInstance?.write('\r\n');
       } else if (data === '\u007f') {
          this.terminalInstance?.write('\b \b'); // Handle Backspace cleanly
       } else {
          this.terminalInstance?.write(data);
       }

       if (this.terminalWs?.readyState === WebSocket.OPEN) {
          // Both \`cmd.exe\` and \`bash\` over spawn expect \`\n\` to flush their invisible buffer
          const payload = data === '\r' ? '\n' : data;
          this.terminalWs.send(payload);
       }
    });

    this.terminalWs.onclose = () => {
       if (this.isSessionMinimized()) {
          this.showToast('Session Dropped', 'The background terminal session was closed by the target host.', 'info');
       }
       this.closeSession();
    };
    
    // Add resize listener but ensure Xterm doesn't wipe its buffer if size becomes 0
    window.addEventListener('resize', () => {
       if (!this.isSessionMinimized()) fitAddon.fit();
    });
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
    this.isSessionMinimized.set(false);
    
    if (this.sessionContainer && this.sessionContainer.nativeElement) {
      this.sessionContainer.nativeElement.innerHTML = '';
    }
  }
}
