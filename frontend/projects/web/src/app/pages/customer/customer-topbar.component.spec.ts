import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, User } from 'shared-auth';
import { CustomerTopbarComponent } from './customer-topbar.component';

describe('CustomerTopbarComponent', () => {
  const currentUser = signal<User | null>(null);

  function render(inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({
      imports: [CustomerTopbarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { currentUser, isAuthenticated: () => false } }],
    });
    const fixture = TestBed.createComponent(CustomerTopbarComponent);
    fixture.componentRef.setInput('name', 'Kamal Perera');
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture;
  }

  const avatarImg = (fixture: ReturnType<typeof render>) =>
    (fixture.nativeElement as HTMLElement).querySelector('#profile-badge ui-avatar img');

  it('shows initials when the user has no picture', () => {
    currentUser.set({ id: 'u1', email: 'k@p.lk', fullName: 'Kamal Perera', role: 'CUSTOMER' });
    const fixture = render();
    expect(avatarImg(fixture)).toBeNull();
    expect(fixture.nativeElement.querySelector('#profile-badge ui-avatar').textContent.trim()).toBe('KP');
  });

  it('shows the signed-in user picture on any page without the page passing it in', () => {
    currentUser.set({ id: 'u1', email: 'k@p.lk', fullName: 'Kamal Perera', role: 'CUSTOMER', avatarUrl: 'data:image/png;base64,AAAA' });
    const fixture = render();
    expect(avatarImg(fixture)?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  });

  it('updates as soon as the picture changes', () => {
    currentUser.set({ id: 'u1', email: 'k@p.lk', fullName: 'Kamal Perera', role: 'CUSTOMER' });
    const fixture = render();
    currentUser.set({ ...currentUser()!, avatarUrl: 'data:image/png;base64,BBBB' });
    fixture.detectChanges();
    expect(avatarImg(fixture)?.getAttribute('src')).toBe('data:image/png;base64,BBBB');
  });
});
