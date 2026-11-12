import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HomeViewComponent } from './components/home-view/home-view.component';
import { RoomViewComponent } from './components/room-view/room-view.component';
import { FooterComponent } from './components/footer/footer.component';
import { AskModalComponent } from './components/ask-modal/ask-modal.component';
import { CreateRoomModalComponent } from './components/create-room-modal/create-room-modal.component';
import { AwsSettingsModalComponent } from './components/aws-settings-modal/aws-settings-modal.component';
import { RoomStoreService } from './services/room-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    HomeViewComponent,
    RoomViewComponent,
    FooterComponent,
    AskModalComponent,
    CreateRoomModalComponent,
    AwsSettingsModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  roomStore = inject(RoomStoreService);

  showAskModal = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);
  showSettings = signal<boolean>(false);
}
