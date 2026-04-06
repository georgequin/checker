import { Component } from '@angular/core';
import { HostListComponent } from './features/host-list/host-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HostListComponent],
  template: '<app-host-list></app-host-list>',
})
export class AppComponent {
  title = 'admin-ui';
}
