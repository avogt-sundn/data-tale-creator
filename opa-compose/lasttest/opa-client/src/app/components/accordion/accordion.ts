import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-accordion',
  imports: [],
  templateUrl: './accordion.html',
  styleUrl: './accordion.scss',
})
export class Accordion {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() isOpen = true;
  id = this.title.replace(/\s+/g, '');

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.id = this.title.replace(/\s+/g, '');
      setTimeout(() => {
        const section = document.getElementById(this.id);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 180);
    }
  }
}
