import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  template: `
    <div class="flex h-screen bg-[#0d1117] text-gray-200 font-sans overflow-hidden">
      <!-- Sidebar -->
      <aside *ngIf="!isLoginPage()" class="w-64 bg-[#161b22] border-r border-gray-800 flex flex-col shrink-0">
        <div class="h-20 flex items-center px-6 border-b border-gray-800">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
              </svg>
            </div>
            <span class="font-bold text-lg tracking-tight text-gray-100">DawnOfTech RMM</span>
          </div>
        </div>
        
        <nav class="flex-1 px-4 py-6 space-y-2">
          <a routerLink="/endpoints" routerLinkActive="bg-blue-600/10 text-blue-400 border border-blue-500/20" [routerLinkActiveOptions]="{exact: true}" class="flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-[#21262d] rounded-lg font-medium transition-colors border border-transparent">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm9 3a1 1 0 01-2 0V6a1 1 0 012 0v2zm-4 0a1 1 0 01-2 0V6a1 1 0 012 0v2zm4 4a1 1 0 01-2 0v-2a1 1 0 012 0v2zm-4 0a1 1 0 01-2 0v-2a1 1 0 012 0v2z" clip-rule="evenodd" />
            </svg>
            Endpoints
          </a>
          <a routerLink="/settings" routerLinkActive="bg-blue-600/10 text-blue-400 border border-blue-500/20" class="flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-[#21262d] rounded-lg font-medium transition-colors border border-transparent">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            Settings
          </a>
        </nav>
        
        <div class="p-4 border-t border-gray-800">
          <button (click)="signOut()" class="w-full flex items-center justify-center gap-2 bg-[#21262d] hover:bg-red-500/10 hover:text-red-400 text-gray-400 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm border border-transparent hover:border-red-500/20">
            Sign Out
          </button>
        </div>
      </aside>
      
      <!-- Main Content Outlet -->
      <main class="flex-1 overflow-hidden relative">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class AppComponent {
   private router = inject(Router);

   isLoginPage(): boolean {
      return this.router.url === '/login';
   }

   signOut() {
      localStorage.removeItem('rmm-token');
      this.router.navigate(['/login']);
   }
}
