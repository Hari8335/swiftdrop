import { Component } from '@angular/core';
import { MerchantComponent } from '../merchant.component';

@Component({
  selector: 'app-merchant-portal',
  standalone: true,
  imports: [MerchantComponent],
  template: `<app-merchant />`,
})
export class MerchantPortalComponent {}
