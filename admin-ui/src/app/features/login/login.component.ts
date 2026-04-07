import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen w-full flex items-center justify-center bg-[#0d1117] text-gray-200">
      
      <div class="w-full max-w-md p-8 bg-[#161b22] border border-gray-800 rounded-2xl shadow-2xl relative overflow-hidden">
        
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>

        <div class="text-center mb-8">
          <div class="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-100">DawnOfTech RMM</h1>
          <p class="text-gray-500 text-sm mt-1">Authenticate to access the endpoint grid</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1.5">Administrator Username</label>
            <input type="text" [(ngModel)]="username" name="username" required
              class="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. admin">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1.5">Secure Password</label>
            <input type="password" [(ngModel)]="password" name="password" required
              class="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••">
          </div>

          <div *ngIf="error()" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            {{ error() }}
          </div>

          <button type="submit" [disabled]="loading()"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50">
            {{ loading() ? 'Authenticating...' : 'Sign In' }}
          </button>
        </form>

      </div>
    </div>
  `
})
export class LoginComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit() {
    if (!this.username || !this.password) return;
    
    this.loading.set(true);
    this.error.set(null);

    this.http.post<any>('/api/login', { username: this.username, password: this.password }).subscribe({
      next: (res) => {
        if (res.token) {
          localStorage.setItem('rmm-token', res.token);
          this.router.navigate(['/endpoints']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Authentication failed');
      }
    });
  }
}
