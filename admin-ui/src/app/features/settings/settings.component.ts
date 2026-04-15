import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../core/services/config.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full w-full flex flex-col bg-[#0d1117] text-gray-200 font-sans overflow-hidden">
      <header class="h-20 border-b border-gray-800 flex justify-between items-center px-10 bg-[#0d1117] shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-100">Global Settings</h1>
          <p class="text-gray-500 text-xs mt-1">Manage infrastructure, security, and alerting</p>
        </div>
        <button *ngIf="activeTab() !== 'provisioning'" (click)="saveSettings()" [disabled]="isSaving()" class="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50">
          {{ isSaving() ? 'Saving...' : 'Save Configuration' }}
        </button>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Vertical Tabs -->
        <div class="w-64 border-r border-gray-800 p-6 flex flex-col gap-2 shrink-0">
          <button (click)="activeTab.set('profile')" [ngClass]="{'bg-blue-600/10 text-blue-400 border-blue-500/20': activeTab() === 'profile', 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent': activeTab() !== 'profile'}" class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors border text-left">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            My Profile
          </button>
          <button (click)="activeTab.set('provisioning')" [ngClass]="{'bg-blue-600/10 text-blue-400 border-blue-500/20': activeTab() === 'provisioning', 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent': activeTab() !== 'provisioning'}" class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors border text-left">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            Provisioning
          </button>
          <button *ngIf="isSuperAdmin()" (click)="activeTab.set('security')" [ngClass]="{'bg-blue-600/10 text-blue-400 border-blue-500/20': activeTab() === 'security', 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent': activeTab() !== 'security'}" class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors border text-left">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Technicians
          </button>
          <button *ngIf="isSuperAdmin()" (click)="activeTab.set('fleet')" [ngClass]="{'bg-blue-600/10 text-blue-400 border-blue-500/20': activeTab() === 'fleet', 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent': activeTab() !== 'fleet'}" class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors border text-left">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Fleet Config
          </button>
          <button *ngIf="isSuperAdmin()" (click)="activeTab.set('webhooks')" [ngClass]="{'bg-blue-600/10 text-blue-400 border-blue-500/20': activeTab() === 'webhooks', 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent': activeTab() !== 'webhooks'}" class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors border text-left">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Alerts & Webhooks
          </button>
        </div>

        <!-- Content Area -->
        <div class="flex-1 p-10 overflow-auto">
          
          <!-- My Profile -->
          <div *ngIf="activeTab() === 'profile'" class="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 class="text-xl font-bold text-white mb-2">My Profile</h2>
            <p class="text-gray-400 mb-8">Personal account details and deployment credentials.</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-[#161b22] border border-gray-800 rounded-xl p-6">
                <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Identity</h3>
                <div class="space-y-4">
                  <div>
                    <div class="text-xs text-gray-500 mb-1">Username</div>
                    <div class="text-gray-100 font-medium">{{ me()?.username }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 mb-1">Privilege Level</div>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      [ngClass]="me()?.role === 'SUPER_ADMIN' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' : 'bg-blue-900/30 text-blue-400 border border-blue-500/20'">
                      {{ me()?.role }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="bg-[#161b22] border border-gray-800 rounded-xl p-6 relative group">
                <button (click)="copyToClipboard(me()?.deploymentKey)" class="absolute top-4 right-4 p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
                <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Current Deployment Key</h3>
                <div class="text-xs text-gray-500 mb-2 leading-relaxed">Hosts deployed with this key will appear in your private grid.</div>
                <div class="bg-[#0d1117] border border-gray-700 rounded-lg p-3 font-mono text-sm text-green-400 break-all select-all">
                  {{ me()?.deploymentKey }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Provisioning -->
          <div *ngIf="activeTab() === 'provisioning'" class="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 class="text-xl font-bold text-white mb-2">Zero-Touch Deployment</h2>
            <p class="text-gray-400 mb-8">Choose your preferred deployment method below.</p>
            
            <!-- PowerShell Method -->
            <div class="mb-10">
              <h3 class="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                Method 1: PowerShell One-Liner
              </h3>
              <p class="text-xs text-gray-500 mb-4 font-medium leading-relaxed">Instantly deploy the RMM Agent without downloading the installer package. Best for remote sessions or scripts.</p>
              <div class="bg-[#161b22] border border-gray-800 rounded-xl p-6 relative group">
                <button (click)="copySnippet()" class="absolute top-4 right-4 p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
                <pre class="text-sm text-green-400 overflow-x-auto whitespace-pre-wrap font-mono pr-12">{{ getPowerShellSnippet() }}</pre>
              </div>
            </div>

            <!-- EXE Method -->
            <div>
              <h3 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Method 2: Personalized Executable
              </h3>
              <p class="text-xs text-gray-500 mb-4 font-medium leading-relaxed">Download a pre-configured .exe signed to your account. Best for sending to clients or physical installation.</p>
              
              <div class="bg-[#161b22] border border-gray-800 rounded-xl p-8 text-center flex flex-col items-center">
                 <div *ngIf="!currentDeploymentToken()" class="max-w-md">
                    <p class="text-sm text-gray-400 mb-6">Generate a unique deployment link that identifies you as the owner of any machine registered with it.</p>
                    <button (click)="generateCustomInstaller()" [disabled]="isGenerating()" class="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all font-bold shadow-lg flex items-center gap-3">
                      <svg *ngIf="isGenerating()" class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {{ isGenerating() ? 'Generating...' : 'Create Personalized Link' }}
                    </button>
                 </div>

                 <div *ngIf="currentDeploymentToken()" class="w-full flex flex-col items-center animate-in zoom-in-95 duration-300">
                    <div class="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 class="text-white font-bold mb-1">Installer Ready</h4>
                    <p class="text-xs text-gray-500 mb-6 font-mono break-all">Install_Helper_Setup_{{ currentDeploymentToken() }}_{{ getSafeHost() }}.exe / .msi</p>
                    
                    <div class="flex gap-4">
                      <a [href]="getDownloadLink('exe')" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download .EXE
                      </a>
                      <a [href]="getDownloadLink('msi')" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-bold text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download .MSI
                      </a>
                      <button (click)="currentDeploymentToken.set('')" class="px-5 py-2.5 bg-[#0d1117] hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors text-sm font-medium">Reset</button>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <!-- Security -->
          <div *ngIf="activeTab() === 'security'" class="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 class="text-xl font-bold text-white mb-2">Team Management</h2>
            <p class="text-gray-400 mb-8">Authorizing technicians and controlling system-wide access.</p>

            <div class="bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden mb-8">
              <div class="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/30">
                <h3 class="font-medium text-gray-200">System Technicians</h3>
              </div>
              <ul class="divide-y divide-gray-800">
                <li *ngFor="let admin of admins()" class="px-6 py-4 flex justify-between items-center hover:bg-gray-800/30">
                  <div class="flex items-center gap-4">
                     <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg">
                      {{ admin?.username?.charAt(0)?.toUpperCase() }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-200">{{ admin.username }}</span>
                        <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase" 
                          [ngClass]="admin.role === 'SUPER_ADMIN' ? 'bg-purple-900/20 text-purple-400 border border-purple-500/10' : 'bg-blue-900/20 text-blue-400 border border-blue-500/10'">
                          {{ admin.role }}
                        </span>
                        <span *ngIf="admin.status === 'DISABLED'" class="px-2 py-0.5 rounded bg-red-900/20 text-red-500 border border-red-500/10 font-bold text-[9px] uppercase">
                          Disabled
                        </span>
                      </div>
                      <div class="text-xs text-gray-500 mt-1">Joined {{ admin.createdAt | date:'mediumDate' }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button *ngIf="admin.id !== me()?.id" (click)="toggleAdminStatus(admin)" 
                      class="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 transition-colors"
                      [ngClass]="admin.status === 'ENABLED' ? 'hover:bg-red-500/10 hover:text-red-400' : 'hover:bg-green-500/10 hover:text-green-400'">
                      {{ admin.status === 'ENABLED' ? 'Disable' : 'Enable' }}
                    </button>
                    <button *ngIf="admin.id !== me()?.id" (click)="deleteAdmin(admin.id)" class="bg-[#21262d] hover:bg-red-900/30 text-gray-500 hover:text-red-400 p-2 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </li>
              </ul>
              <div class="p-6 bg-gray-900/50 flex gap-4 border-t border-gray-800">
                <input type="text" [(ngModel)]="newAdminName" placeholder="New Username" class="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none">
                <input type="password" [(ngModel)]="newAdminPass" placeholder="New Password" class="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none">
                <button (click)="addAdmin()" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm shadow-md">Invite User</button>
              </div>
            </div>
          </div>

          <!-- Fleet Config -->
          <div *ngIf="activeTab() === 'fleet'" class="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 class="text-xl font-bold text-white mb-2">Fleet Mechanics</h2>
            <p class="text-gray-400 mb-8">Tune the global behavior of the connected RMM agent fleet.</p>

            <div class="space-y-6">
               <div class="bg-[#161b22] border border-gray-800 rounded-xl p-6">
                  <div class="flex justify-between items-start mb-4">
                     <div>
                        <h3 class="font-medium text-gray-200">Telemetry Heartbeat Interval (Seconds)</h3>
                        <p class="text-xs text-gray-500 mt-1">How often the agents report their status to the relay.</p>
                     </div>
                     <span class="px-3 py-1 bg-blue-900/30 text-blue-400 rounded-md text-sm font-mono">{{ settings['TELEMETRY_INTERVAL'] }}s</span>
                  </div>
                  <input type="range" [(ngModel)]="settings['TELEMETRY_INTERVAL']" min="5" max="300" step="1" class="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer">
                  <div class="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                     <span>Aggressive (5s)</span>
                     <span>Balanced (30s)</span>
                     <span>Passive (300s)</span>
                  </div>
               </div>

               <div class="bg-[#161b22] border border-gray-800 rounded-xl p-6">
                  <div class="flex justify-between items-start mb-4">
                     <div>
                        <h3 class="font-medium text-gray-200">Offline Auto-Purge Policy (Days)</h3>
                        <p class="text-xs text-gray-500 mt-1">Automatically delete machines from the database if they haven't checked in.</p>
                     </div>
                     <span class="px-3 py-1 bg-red-900/30 text-red-400 rounded-md text-sm font-mono">{{ settings['AUTO_PURGE_DAYS'] }} Days</span>
                  </div>
                  <input type="range" [(ngModel)]="settings['AUTO_PURGE_DAYS']" min="1" max="90" step="1" class="w-full accent-red-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer">
               </div>

               <div class="bg-[#161b22] border border-gray-800 rounded-xl p-6">
                  <div class="mb-4">
                     <h3 class="font-medium text-gray-200">Public Entrypoint (FQDN / IP)</h3>
                     <p class="text-xs text-gray-500 mt-1">The primary address agents will use to find the relay server. Must include protocol (e.g. http://rmm.example.com)</p>
                  </div>
                  <input type="text" [(ngModel)]="settings['PUBLIC_URL']" placeholder="http://1.2.3.4:3000" class="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none">
               </div>
            </div>
          </div>

          <!-- Webhooks -->
          <div *ngIf="activeTab() === 'webhooks'" class="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 class="text-xl font-bold text-white mb-2">Alerts & Notifications</h2>
            <p class="text-gray-400 mb-8">Receive instant push notifications when agents connect or disconnect.</p>

            <div class="bg-[#161b22] border border-gray-800 rounded-xl p-6">
               <h3 class="font-medium text-gray-200 mb-2">Discord / Slack Webhook URL</h3>
               <p class="text-xs text-gray-500 mb-4">Paste the incoming webhook URL to receive channel messages.</p>
               <input type="text" [(ngModel)]="settings['WEBHOOK_URL']" placeholder="https://discord.com/api/webhooks/..." class="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none mb-4">
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private token: string | null = null;

  activeTab = signal<'profile' | 'provisioning' | 'security' | 'fleet' | 'webhooks'>('profile');
  isSaving = signal<boolean>(false);
  isGenerating = signal<boolean>(false);
  currentDeploymentToken = signal<string>('');

  settings: Record<string, string> = {};
  admins = signal<any[]>([]);
  me = signal<any>(null);

  newAdminName = '';
  newAdminPass = '';

  isSuperAdmin() {
    return this.me()?.role === 'SUPER_ADMIN';
  }

  ngOnInit() {
    this.token = localStorage.getItem('rmm-token');
    if (this.token) {
      this.loadData();
    }
  }

  loadData() {
    if (!this.token) return;
    const headers = { Authorization: `Bearer ${this.token}` };
    const baseUrl = this.configService.getApiBaseUrl();

    this.http.get<any>(`${baseUrl}/api/me`, { headers }).subscribe(data => {
      this.me.set(data);
    });

    this.http.get<any>(`${baseUrl}/api/settings`, { headers }).subscribe({
      next: data => this.settings = data,
      error: () => { } // Silent for non-superAdmins
    });

    this.http.get<any[]>(`${baseUrl}/api/admins`, { headers }).subscribe({
      next: data => this.admins.set(data),
      error: () => { } // Silent for non-superAdmins
    });
  }

  saveSettings() {
    if (!this.token) return;
    this.isSaving.set(true);
    const baseUrl = this.configService.getApiBaseUrl();
    this.http.put(`${baseUrl}/api/settings`, this.settings, { headers: { Authorization: `Bearer ${this.token}` } }).subscribe({
      next: () => {
        setTimeout(() => this.isSaving.set(false), 500);
      },
      error: () => this.isSaving.set(false)
    });
  }

  addAdmin() {
    if (!this.token || !this.newAdminName || !this.newAdminPass) return;
    const baseUrl = this.configService.getApiBaseUrl();
    this.http.post(`${baseUrl}/api/admins`, { username: this.newAdminName, password: this.newAdminPass }, { headers: { Authorization: `Bearer ${this.token}` } }).subscribe({
      next: () => {
        this.newAdminName = '';
        this.newAdminPass = '';
        this.loadData();
      }
    });
  }

  deleteAdmin(id: number) {
    if (!this.token || !confirm('Are you sure you want to delete this administrator?')) return;
    const baseUrl = this.configService.getApiBaseUrl();
    this.http.delete(`${baseUrl}/api/admins/` + id, { headers: { Authorization: `Bearer ${this.token}` } }).subscribe({
      next: () => this.loadData(),
      error: (e) => alert(e.error.error)
    });
  }

  toggleAdminStatus(admin: any) {
    if (!this.token) return;
    const baseUrl = this.configService.getApiBaseUrl();
    const newStatus = admin.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    this.http.patch(`${baseUrl}/api/admins/${admin.id}`, { status: newStatus }, { headers: { Authorization: `Bearer ${this.token}` } }).subscribe({
      next: () => this.loadData(),
      error: (e) => alert(e.error.error)
    });
  }

  getPowerShellSnippet() {
    const publicUrl = this.settings['PUBLIC_URL'];
    const relayUrl = (publicUrl && publicUrl.startsWith('http'))
      ? publicUrl.replace(/\/$/, '')
      : (this.configService.getApiBaseUrl() || window.location.origin);

    const key = this.me()?.deploymentKey || 'YOUR_DEPLOYMENT_KEY';
    return `$url="${relayUrl}/agent.zip"; $out="C:\\RMM_Agent.zip"; Invoke-WebRequest -Uri $url -OutFile $out; Expand-Archive $out -DestinationPath "C:\\RMM_Agent"; Set-Content -Path "C:\\RMM_Agent\\.env" -Value "API_KEY=${key}\\nRELAY_URL=${relayUrl}"; cd "C:\\RMM_Agent"; npm install; npm install -g node-windows; node install-service.js`;
  }

  generateCustomInstaller() {
    if (!this.token) return;
    this.isGenerating.set(true);
    const baseUrl = this.configService.getApiBaseUrl();
    this.http.post<any>(`${baseUrl}/api/deploy/generate`, {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (res) => {
        this.currentDeploymentToken.set(res.token);
        this.isGenerating.set(false);
      },
      error: () => this.isGenerating.set(false)
    });
  }

  getDownloadLink(type: 'exe' | 'msi' = 'exe') {
    const baseUrl = this.configService.getApiBaseUrl();
    return `${baseUrl}/api/deploy/download/${this.currentDeploymentToken()}?type=${type}`;
  }


  getSafeHost() {
    return window.location.hostname.replace(/\./g, '-');
  }

  copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  }

  copySnippet() {
    navigator.clipboard.writeText(this.getPowerShellSnippet());
  }
}
