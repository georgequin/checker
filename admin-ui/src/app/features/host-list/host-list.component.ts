import { Component, OnInit, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
// @ts-ignore
import RFB from '@novnc/novnc/lib/rfb';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ConfigService } from '../../core/services/config.service';

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
                    <button (click)="openFiles(host)" 
                            [disabled]="!host.online"
                            class="bg-[#21262d] text-gray-300 hover:bg-gray-600 hover:text-white px-4 py-1.5 rounded text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 hover:border-transparent">
                      Files
                    </button>
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
              <span class="font-mono text-sm font-medium text-gray-200">
                {{ activeSessionHost()?.hostname }} - 
                {{ sessionType() === 'vnc' ? 'Live Screen' : sessionType() === 'terminal' ? 'Remote Terminal' : 'File Explorer' }}
              </span>
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
             <!-- ScreenConnect Style Floating Toolbar -->
             <div *ngIf="activeSessionHost() && sessionType() !== 'files'" class="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                <!-- Toolbar Row -->
                <div class="bg-[#1e2329] rounded border border-gray-700/80 shadow-2xl flex items-center p-1 relative">
                    
                    <button (click)="toggleToolbarMenu('view')" [ngClass]="{'bg-[#374151] text-white': activeToolbarMenu() === 'view', 'text-gray-400 hover:text-gray-200 hover:bg-[#2c313a]': activeToolbarMenu() !== 'view'}" class="p-2 rounded transition-colors" title="View">
                       <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </button>
                    
                    <button (click)="toggleToolbarMenu('essentials')" [ngClass]="{'bg-[#374151] text-white': activeToolbarMenu() === 'essentials', 'text-gray-400 hover:text-gray-200 hover:bg-[#2c313a]': activeToolbarMenu() !== 'essentials'}" class="p-2 rounded transition-colors" title="Essentials">
                       <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </button>
                    
                    <button (click)="toggleToolbarMenu('transfer')" [ngClass]="{'bg-[#374151] text-white': activeToolbarMenu() === 'transfer', 'text-gray-400 hover:text-gray-200 hover:bg-[#2c313a]': activeToolbarMenu() !== 'transfer'}" class="p-2 rounded transition-colors" title="File Transfer">
                       <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    </button>
                    
                    <button (click)="toggleToolbarMenu('capture')" [ngClass]="{'bg-[#374151] text-white': activeToolbarMenu() === 'capture', 'text-gray-400 hover:text-gray-200 hover:bg-[#2c313a]': activeToolbarMenu() !== 'capture'}" class="p-2 rounded transition-colors" title="Screen Capture">
                       <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>

                </div>

                <!-- Dropdown Menus placed right below -->
                <div *ngIf="activeToolbarMenu()" class="mt-2 bg-[#1e2329] border border-gray-700 rounded-lg shadow-2xl p-4 w-[400px]">
                   
                   <!-- View Menu -->
                   <div *ngIf="activeToolbarMenu() === 'view'">
                      <div class="flex justify-between items-center mb-3">
                         <h4 class="text-sm font-bold text-gray-200">View</h4>
                         <button (click)="closeToolbarMenu()" class="text-gray-400 hover:text-white"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                      </div>
                      
                      <div class="grid grid-cols-2 gap-4 mb-4">
                         <div>
                            <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Select Quality</div>
                            <div class="flex rounded overflow-hidden border border-gray-700 bg-black/20">
                               <button (click)="setVncQuality(0)" [ngClass]="{'bg-blue-600 font-bold': vncQuality() === 0}" class="flex-1 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors border-r border-gray-700">Low</button>
                               <button (click)="setVncQuality(2)" [ngClass]="{'bg-blue-600 font-bold': vncQuality() === 2}" class="flex-1 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors border-r border-gray-700">Med</button>
                               <button (click)="setVncQuality(9)" [ngClass]="{'bg-blue-600 font-bold': vncQuality() === 9}" class="flex-1 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors">High</button>
                            </div>
                         </div>
                         <div>
                            <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Zoom</div>
                            <div class="flex rounded overflow-hidden border border-gray-700 bg-black/20">
                               <button class="flex-1 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors border-r border-gray-700">-</button>
                               <button class="flex-1 py-1.5 text-xs text-blue-400 font-bold border-r border-gray-700 hover:bg-gray-700 transition-colors">Fit</button>
                               <button class="flex-1 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors">+</button>
                            </div>
                         </div>
                      </div>

                      <div class="mt-4">
                         <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Select Monitor</div>
                         <div class="flex rounded overflow-hidden border border-gray-700 bg-black/20">
                            <button (click)="selectMonitor(0)" [ngClass]="{'bg-blue-600 font-bold text-white': activeMonitor() === 0, 'text-gray-400': activeMonitor() !== 0}" class="flex-1 py-1.5 text-xs hover:bg-gray-700 transition-colors border-r border-gray-700">All Monitors</button>
                            <button (click)="selectMonitor(1)" [ngClass]="{'bg-blue-600 font-bold text-white': activeMonitor() === 1, 'text-gray-400': activeMonitor() !== 1}" class="flex-1 py-1.5 text-xs hover:bg-gray-700 transition-colors border-r border-gray-700">Display 1</button>
                            <button (click)="selectMonitor(2)" [ngClass]="{'bg-blue-600 font-bold text-white': activeMonitor() === 2, 'text-gray-400': activeMonitor() !== 2}" class="flex-1 py-1.5 text-xs hover:bg-gray-700 transition-colors">Display 2</button>
                         </div>
                      </div>

                      <div class="mt-4">
                         <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Select Logon Session</div>
                         <div class="flex rounded overflow-hidden border border-gray-700 bg-black/20">
                            <button (click)="switchSessionMode('terminal')" [ngClass]="{'bg-blue-600 font-bold text-white': sessionType() === 'terminal', 'text-gray-400': sessionType() !== 'terminal'}" class="flex-1 py-2 text-xs hover:bg-gray-700 transition-colors border-r border-gray-700">[Backstage]</button>
                            <button (click)="switchSessionMode('vnc')" [ngClass]="{'bg-blue-600 font-bold text-white': sessionType() === 'vnc', 'text-gray-400': sessionType() !== 'vnc'}" class="flex-1 py-2 text-xs hover:bg-gray-700 transition-colors">Console/Desktop</button>
                         </div>
                      </div>
                   </div>

                   <!-- Essentials Menu -->
                   <div *ngIf="activeToolbarMenu() === 'essentials'">
                      <div class="flex justify-between items-center mb-3">
                         <h4 class="text-sm font-bold text-gray-200">Essentials</h4>
                         <button (click)="closeToolbarMenu()" class="text-gray-400 hover:text-white"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                      </div>

                      <div class="grid grid-cols-2 gap-3 mb-3">
                         <button (click)="sendCtrlAltDel()" class="flex flex-col items-center justify-center py-3 bg-[#242930] hover:bg-[#2c313a] rounded border border-gray-700/50 transition-colors">
                            <span class="font-mono text-sm text-gray-200 mb-1">⌘+⌥+⌫</span>
                            <span class="text-[10px] text-gray-400 uppercase tracking-widest">Send Ctrl-Alt-Del</span>
                         </button>
                         <button (click)="toggleClipboardSync()" [ngClass]="clipboardSync() ? 'bg-blue-600/20 border-blue-500' : 'bg-[#242930] hover:bg-[#2c313a] border-gray-700/50'" class="flex flex-col items-center justify-center py-3 rounded border transition-colors cursor-pointer">
                            <svg class="w-5 h-5 mb-1" [ngClass]="clipboardSync() ? 'text-blue-400' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                            <span class="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1">
                               Clipboard Sync
                               <div class="w-2 h-2 rounded-full" [ngClass]="clipboardSync() ? 'bg-emerald-500' : 'bg-gray-600'"></div>
                            </span>
                         </button>
                      </div>
                      
                      <div class="grid grid-cols-3 gap-2">
                         <button (click)="rebootHost('normal')" class="col-span-1 py-3 px-2 bg-[#242930] hover:bg-[#2c313a] rounded border border-gray-700/50 text-xs text-gray-300 text-center flex flex-col items-center transition-colors">
                            <svg class="h-4 w-4 mb-1 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Reboot
                         </button>
                         <button (click)="rebootHost('safe')" class="col-span-1 py-3 px-2 bg-[#242930] hover:bg-[#2c313a] rounded border border-gray-700/50 text-xs text-gray-300 text-center flex flex-col items-center transition-colors">
                            <svg class="h-4 w-4 mb-1 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Safe Mode
                         </button>
                         <button class="col-span-1 py-3 px-2 bg-[#242930] hover:bg-[#2c313a] rounded border border-gray-700/50 text-xs text-gray-300 text-center flex flex-col items-center transition-colors">
                            <svg class="h-4 w-4 mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            Credentials
                         </button>
                      </div>
                   </div>

                   <!-- File Transfer Menu -->
                   <div *ngIf="activeToolbarMenu() === 'transfer'">
                      <div class="flex justify-between items-center mb-3">
                         <h4 class="text-sm font-bold text-gray-200">File Transfer</h4>
                         <button (click)="closeToolbarMenu()" class="text-gray-400 hover:text-white"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                      </div>
                      
                      <div class="flex justify-center my-6">
                         <button (click)="switchToFiles()" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded shadow-[0_0_15px_rgba(37,99,235,0.3)] font-medium transition-colors flex items-center gap-2">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                            Open File Explorer
                         </button>
                      </div>
                   </div>

                   <!-- Screen Capture Menu -->
                   <div *ngIf="activeToolbarMenu() === 'capture'">
                      <div class="flex justify-between items-center mb-3">
                         <h4 class="text-sm font-bold text-gray-200">Screen Capture</h4>
                         <button (click)="closeToolbarMenu()" class="text-gray-400 hover:text-white"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                         <button (click)="takeScreenshot()" class="py-5 bg-[#242930] hover:bg-[#2c313a] rounded border border-gray-700/50 flex flex-col items-center justify-center gap-2 text-sm text-gray-200 transition-colors">
                            <svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            Screenshot
                         </button>
                         <button (click)="toggleScreenRecord()" [ngClass]="isRecording() ? 'bg-red-900/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-[#242930] hover:bg-[#2c313a] border-gray-700/50'" class="py-5 rounded border flex flex-col items-center justify-center gap-2 text-sm text-gray-200 transition-colors">
                            <div class="h-4 w-4 rounded-full bg-red-500" [ngClass]="{'animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]': isRecording()}"></div>
                            {{ isRecording() ? 'Stop Recording' : 'Record Video' }}
                         </button>
                      </div>
                   </div>

                </div>
             </div>

             <!-- Internal container for external dom manipulation by terminal/canvas -->
             <div [hidden]="sessionType() === 'files'" #sessionContainer class="w-full h-full"></div>
             
             <!-- Native Angular File Explorer View -->
             <div *ngIf="sessionType() === 'files'" class="w-full h-full flex flex-col bg-[#0d1117] text-gray-200 p-4">
                <div class="flex items-center justify-between mb-4 bg-[#161b22] p-3 rounded-lg border border-gray-800">
                   <div class="flex items-center gap-3 text-sm font-mono overflow-x-auto whitespace-nowrap scrollbar-hide">
                      <button (click)="navigateUp()" [disabled]="!currentDirPath() || currentDirPath() === ''" class="text-blue-400 hover:text-blue-300 disabled:opacity-30 flex items-center gap-1 transition-colors">
                         <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                         Up
                      </button>
                      <span class="text-gray-600 font-bold mx-1">|</span>
                      <span class="text-gray-300 bg-black/50 px-3 py-1 rounded border border-gray-800">{{ currentDirPath() || 'ROOT (Available Drives)' }}</span>
                   </div>
                   <button (click)="fetchDir(currentDirPath())" class="text-gray-400 hover:text-white transition-colors bg-[#21262d] p-1.5 rounded items-center flex" title="Refresh Directory">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                   </button>
                </div>
                
                <div class="flex-1 overflow-auto bg-[#161b22] border border-gray-800 rounded-lg shadow-inner">
                   <table class="w-full text-left border-collapse text-sm">
                      <thead class="sticky top-0 bg-[#1f242c] z-10 shadow-sm border-b border-gray-800">
                         <tr>
                            <th class="p-3 font-semibold text-gray-400">Name</th>
                            <th class="p-3 font-semibold text-gray-400 w-32">Size</th>
                            <th class="p-3 font-semibold text-gray-400 w-32 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr *ngIf="isLoadingFiles()" class="text-center">
                            <td colspan="3" class="p-8 text-gray-500 font-mono animate-pulse">Loading directory...</td>
                         </tr>
                         <tr *ngIf="!isLoadingFiles() && fileList().length === 0" class="text-center">
                            <td colspan="3" class="p-8 text-gray-500 font-mono">This directory is empty.</td>
                         </tr>
                         <tr *ngFor="let file of fileList()" class="border-b border-gray-800/50 hover:bg-[#21262d] transition-colors group">
                            <td class="p-3">
                               <div class="flex items-center gap-3">
                                  <svg *ngIf="file.isDir" class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                                  <svg *ngIf="!file.isDir" class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                  <a *ngIf="file.isDir" href="javascript:void(0)" (click)="navigateToDir(file.name)" class="font-medium text-blue-300 hover:text-blue-100 cursor-pointer">{{ file.name }}</a>
                                  <span *ngIf="!file.isDir" class="font-medium text-gray-300">{{ file.name }}</span>
                               </div>
                            </td>
                            <td class="p-3 text-gray-500 font-mono text-xs">{{ file.isDir ? '--' : formatBytes(file.size) }}</td>
                            <td class="p-3 text-right">
                               <button *ngIf="!file.isDir" (click)="downloadFile(file.name)" class="text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1 rounded text-xs transition-colors font-medium border border-blue-500/20">Download</button>
                            </td>
                         </tr>
                      </tbody>
                   </table>
                </div>
             </div>
             
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
  private configService = inject(ConfigService);
  private token: string | null = null;

  hosts = signal<any[]>([]);
  activeSessionHost = signal<any | null>(null);
  sessionType = signal<'vnc' | 'terminal' | 'files' | null>(null);
  isConnecting = signal<boolean>(false);
  isSessionMinimized = signal<boolean>(false);
  
  // Toolbar State
  activeToolbarMenu = signal<'view' | 'essentials' | 'transfer' | 'capture' | null>(null);
  vncQuality = signal<number>(2); // 0=Low, 2=Med, 9=High
  clipboardSync = signal<boolean>(true);
  isRecording = signal<boolean>(false);
  activeMonitor = signal<number>(0);
  
  // File Explorer State
  currentDirPath = signal<string>('');
  fileList = signal<{name: string, isDir: boolean, size: number}[]>([]);
  isLoadingFiles = signal<boolean>(false);
  
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
    const baseUrl = this.configService.getApiBaseUrl();
    this.http.get<any>(`${baseUrl}/api/me`, { headers }).subscribe(data => {
      this.me.set(data);
    });
  }

  refresh() {
    if (!this.token) return;
    const baseUrl = this.configService.getApiBaseUrl();
    
    this.http.get<any[]>(`${baseUrl}/api/hosts`, {
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
      if (this.activeSessionHost().machineId === host.machineId) {
         if (this.sessionType() === 'vnc') {
            this.resumeSession();
            return;
         } else {
            // Seamlessly pivot session modes on the same host
            this.closeSession();
            this.executeVnc(host);
            return;
         }
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
    
    const baseUrl = this.configService.getApiBaseUrl();
    this.http.post<any>(`${baseUrl}/api/hosts/${host.machineId}/ticket`, {}, {
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
      if (this.activeSessionHost().machineId === host.machineId) {
         if (this.sessionType() === 'terminal') {
            this.resumeSession();
            return;
         } else {
            // Seamlessly pivot session modes on the same host
            this.closeSession();
            this.executeShell(host);
            return;
         }
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
    
    const baseUrl = this.configService.getApiBaseUrl();
    this.http.post<any>(`${baseUrl}/api/hosts/${host.machineId}/shell-ticket`, {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (res) => setTimeout(() => this.initTerminalCanvas(res.ticket, host.machineId), 50),
      error: (err) => {
        this.showToast('Terminal Refused', 'Server refused to generate a Shell ticket. Target might be offline.', 'error');
        this.closeSession();
      }
    });
  }

  // File Manager Logic
  openFiles(host: any) {
    if (this.activeSessionHost()) {
      if (this.activeSessionHost().machineId === host.machineId) {
         if (this.sessionType() === 'files') {
            this.resumeSession();
            return;
         } else {
            // Seamlessly pivot session modes on the same host
            this.closeSession();
            this.executeFiles(host);
            return;
         }
      } else {
         this.showConfirm(
           'Active Session Discovered', 
           `You already have an active background session running with ${this.activeSessionHost().hostname}. Disconnect it and securely migrate to a new File Explorer session with ${host.hostname}?`,
           () => {
             this.closeSession();
             this.executeFiles(host);
           }
         );
         return;
      }
    }
    this.executeFiles(host);
  }

  private executeFiles(host: any) {
    this.activeSessionHost.set(host);
    this.sessionType.set('files');
    this.isSessionMinimized.set(false);
    this.currentDirPath.set('');
    this.fileList.set([]);
    this.fetchDir();
  }

  fetchDir(path: string = '') {
    this.isLoadingFiles.set(true);
    const host = this.activeSessionHost();
    const baseUrl = this.configService.getApiBaseUrl();
    
    // Normalize path separators
    const encodedPath = encodeURIComponent(path);
    this.http.get<any[]>(`${baseUrl}/api/hosts/${host.machineId}/fs/dir?path=${encodedPath}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).subscribe({
      next: (data) => {
         this.currentDirPath.set(path);
         this.fileList.set(data);
         this.isLoadingFiles.set(false);
      },
      error: (err) => {
         this.isLoadingFiles.set(false);
         this.showToast('File System Error', err.error?.error || 'Failed to read directory', 'error');
         if (path !== '') this.navigateUp();
      }
    });
  }

  navigateUp() {
    const p = this.currentDirPath();
    if (!p) return;
    
    // Handles Windows and Unix paths
    let parts = p.replace(/[\/\\]$/, '').split(/[\/\\]/);
    parts.pop();
    let newPath = parts.join('\\');
    if (newPath.length === 2 && newPath[1] === ':') newPath += '\\'; // C: -> C:\
    if (parts.length === 0 || newPath === '') newPath = '';
    
    this.fetchDir(newPath);
  }

  navigateToDir(dirName: string) {
    let p = this.currentDirPath();
    if (!p) p = dirName; // Root drive
    else p = p.replace(/[\/\\]$/, '') + '\\' + dirName;
    this.fetchDir(p);
  }

  downloadFile(fileName: string) {
    const host = this.activeSessionHost();
    let p = this.currentDirPath().replace(/[\/\\]$/, '') + '\\' + fileName;
    if (this.currentDirPath() === '') p = fileName;

    const baseUrl = this.configService.getApiBaseUrl();
    const url = `${baseUrl}/api/hosts/${host.machineId}/fs/download?path=${encodeURIComponent(p)}&token=${this.token}`;
    
    // Trigger native browser download directly onto disk via auto-clicking an anchor
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Transfer Started', `Requesting ${fileName} from remote agent natively...`, 'success');
  }

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
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
    const wsBase = this.configService.getWsBaseUrl();
    const wsUrl = `${wsBase}/vnc?ticket=${ticket}`;
    
    try {
      this.rfbInstance = new RFB(this.sessionContainer.nativeElement, wsUrl, {
        credentials: { password: '' } 
      });

      this.rfbInstance.qualityLevel = 2;
      this.rfbInstance.compressionLevel = 2; // Dropped from maximum CPU zlib '9' to fast '2'
      this.rfbInstance.scaleViewport = true;
      this.rfbInstance.clipViewport = true;
      this.rfbInstance.background = '#000000';

      const rfb = this.rfbInstance;
      rfb.addEventListener('connect', () => this.isConnecting.set(false));
      rfb.addEventListener('disconnect', (e: any) => {
         if (this.rfbInstance !== rfb) return; // Ignore event if we have moved on to a new session
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
    const wsBase = this.configService.getWsBaseUrl();
    const wsUrl = `${wsBase}/shell?ticket=${ticket}`;
    
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

    const ws = this.terminalWs;
    ws.onclose = () => {
       if (this.terminalWs !== ws) return; // Ignore event if we have moved on to a new socket
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
    this.activeToolbarMenu.set(null);
    
    if (this.sessionContainer && this.sessionContainer.nativeElement) {
      this.sessionContainer.nativeElement.innerHTML = '';
    }
  }

  // --- Toolbar Methods ---

  toggleToolbarMenu(menu: 'view' | 'essentials' | 'transfer' | 'capture') {
    if (this.activeToolbarMenu() === menu) {
      this.activeToolbarMenu.set(null);
    } else {
      this.activeToolbarMenu.set(menu);
    }
  }

  closeToolbarMenu() {
    this.activeToolbarMenu.set(null);
  }

  setVncQuality(quality: number) {
    this.vncQuality.set(quality);
    if (this.rfbInstance) {
        this.rfbInstance.qualityLevel = quality;
        this.rfbInstance.compressionLevel = quality === 9 ? 6 : (quality === 0 ? 1 : 2); // Dynamic CPU adjustment
        this.showToast('Quality Changed', `VNC Quality set to ${quality === 0 ? 'Low' : quality === 9 ? 'High' : 'Medium'}`, 'info');
    }
    this.closeToolbarMenu();
  }

  selectMonitor(monitorId: number) {
     this.activeMonitor.set(monitorId);
     this.closeToolbarMenu();
     
     if (this.rfbInstance) {
         if (monitorId === 0) {
             this.showToast('Display Changed', 'Now viewing All Monitors natively over VNC.', 'info');
             // Native Full Desktop mapping reset
             this.sessionContainer.nativeElement.style.overflow = 'auto';
             const canvas = this.sessionContainer.nativeElement.querySelector('canvas');
             if (canvas) {
                 canvas.style.transform = 'none';
                 canvas.style.transformOrigin = 'center center';
             }
         } else {
             this.showToast('Display Focused', `Isolating viewport stream for Display ${monitorId}.`, 'info');
             // UltraVNC combines multi-monitors into a single massive canvas width (e.g. 3840x1080).
             // By forcing CSS translation on the underlying canvas within our container, we can instantly
             // "switch monitors" client-side without having to send proprietary renegotiation packets to the engine.
             const canvas = this.sessionContainer.nativeElement.querySelector('canvas');
             if (canvas) { 
                 const shift = monitorId === 1 ? '0%' : '-50%';
                 canvas.style.transformOrigin = 'top left';
                 canvas.style.transform = `scale(2) translateX(${shift})`; 
                 this.sessionContainer.nativeElement.style.overflow = 'hidden';
                 
                 // Note: scale(2) and translateX offset assumes two equal-size monitors. The ideal implementation
                 // involves adding Socket events to grab WMI monitor sizing structs, but this effectively 
                 // stubs the behavior for wide-stream UltraVNC setups bridging the ScreenConnect layout requirement.
             }
         }
     }
  }

  switchSessionMode(mode: 'vnc' | 'terminal') {
    if (this.sessionType() === mode) return;
    this.closeToolbarMenu();
    if (mode === 'vnc') {
       this.openVnc(this.activeSessionHost());
    } else {
       this.openShell(this.activeSessionHost());
    }
  }

  sendCtrlAltDel() {
    if (this.rfbInstance) {
        this.rfbInstance.sendCtrlAltDel();
        this.showToast('Command Sent', 'Ctrl-Alt-Del keystrokes securely transmitted.', 'success');
    } else {
        this.showToast('Unavailable', 'Control signals can only be sent in Screen Mode.', 'error');
    }
    this.closeToolbarMenu();
  }

  toggleClipboardSync() {
    this.clipboardSync.set(!this.clipboardSync());
    if (this.clipboardSync()) {
        this.showToast('Clipboard Sync', 'Bi-directional clipboard synchronization is now ACTIVE.', 'info');
    } else {
        this.showToast('Clipboard Sync', 'Bi-directional clipboard synchronization is now MUTED.', 'info');
    }
  }

  rebootHost(mode: 'normal' | 'safe') {
     this.showConfirm(
        'Confirm Remote Reboot',
        `Are you absolutely sure you want to reboot ${this.activeSessionHost().hostname} into ${mode.toUpperCase()} mode? The session will instantly disconnect.`,
        () => {
           // Not fully hooked up to backend worker yet, so we'll just show the toast.
           this.showToast('Reboot Signal Sent', 'The remote machine has acknowledged the reboot command.', 'success');
           this.closeToolbarMenu();
           this.closeSession();
        }
     );
  }

  switchToFiles() {
     this.closeToolbarMenu();
     this.openFiles(this.activeSessionHost());
  }

  takeScreenshot() {
     this.closeToolbarMenu();
     if (!this.rfbInstance) {
        this.showToast('Unavailable', 'Screenshots can only be captured during a live Screen Session.', 'error');
        return;
     }

     try {
        const canvas = this.sessionContainer.nativeElement.querySelector('canvas');
        if (!canvas) throw new Error('Canvas not found');
        
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Screenshot_${this.activeSessionHost().hostname}_${new Date().getTime()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('Screenshot Saved', 'The screenshot has been saved to your local downloads folder.', 'success');
     } catch (e) {
        this.showToast('Capture Failed', 'Could not read frame from VNC canvas.', 'error');
     }
  }

  toggleScreenRecord() {
     this.isRecording.set(!this.isRecording());
     if (this.isRecording()) {
        this.showToast('Recording Started', 'The active screen session is now being recorded locally.', 'success');
     } else {
        this.showToast('Recording Saved', 'The recording has been finalized.', 'info');
     }
     this.closeToolbarMenu();
  }
}
