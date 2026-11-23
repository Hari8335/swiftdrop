import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthService, User } from 'shared-auth';
import { ProfilePhotoControlComponent } from './profile-photo-control.component';

describe('ProfilePhotoControlComponent', () => {
  const baseUser: User = { id: 'u1', email: 'a@b.lk', fullName: 'Kamal Perera', role: 'CUSTOMER' };
  let currentUser: ReturnType<typeof signal<User | null>>;
  let authService: { currentUser: () => User | null; uploadAvatar: jest.Mock; removeAvatar: jest.Mock };

  function setup(user: User = baseUser) {
    currentUser = signal<User | null>(user);
    authService = {
      currentUser: () => currentUser(),
      uploadAvatar: jest.fn((image: string) => {
        currentUser.set({ ...currentUser()!, avatarUrl: image });
        return of(currentUser()!);
      }),
      removeAvatar: jest.fn(() => {
        currentUser.set({ ...currentUser()!, avatarUrl: null });
        return of(currentUser()!);
      }),
    };
    TestBed.configureTestingModule({
      imports: [ProfilePhotoControlComponent],
      providers: [{ provide: AuthService, useValue: authService }],
    });
    const fixture = TestBed.createComponent(ProfilePhotoControlComponent);
    fixture.detectChanges();
    return fixture;
  }

  function pick(fixture: ReturnType<typeof setup>, file: File) {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#profile-photo-input');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  it('offers upload only when there is no picture', () => {
    const fixture = setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#profile-photo-upload-btn')?.textContent).toContain('Upload photo');
    expect(el.querySelector('#profile-photo-remove-btn')).toBeNull();
  });

  it('uploads the resized image and switches to change/remove', async () => {
    const fixture = setup();
    jest.spyOn(fixture.componentInstance, 'prepare').mockResolvedValue('data:image/jpeg;base64,/9j/');

    pick(fixture, new File(['x'], 'me.jpg', { type: 'image/jpeg' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(authService.uploadAvatar).toHaveBeenCalledWith('data:image/jpeg;base64,/9j/');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#profile-photo-status')?.textContent).toContain('updated');
    expect(el.querySelector('#profile-photo-upload-btn')?.textContent).toContain('Change photo');
    expect(el.querySelector('#profile-photo-remove-btn')).not.toBeNull();
  });

  it('rejects unsupported files without calling the server', async () => {
    const fixture = setup();
    pick(fixture, new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(authService.uploadAvatar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#profile-photo-error')?.textContent).toContain('PNG, JPG or WebP');
  });

  it('shows the server error message when upload fails', async () => {
    const fixture = setup();
    jest.spyOn(fixture.componentInstance, 'prepare').mockResolvedValue('data:image/png;base64,AAAA');
    authService.uploadAvatar.mockReturnValue(throwError(() => ({ error: { message: 'Image must be 200 KB or smaller' } })));

    pick(fixture, new File(['x'], 'me.png', { type: 'image/png' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#profile-photo-error')?.textContent).toContain('200 KB');
  });

  it('removes the picture', () => {
    const fixture = setup({ ...baseUser, avatarUrl: 'data:image/png;base64,AAAA' });
    fixture.componentRef.setInput('label', 'logo');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#profile-photo-remove-btn').click();
    fixture.detectChanges();

    expect(authService.removeAvatar).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#profile-photo-remove-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('#profile-photo-upload-btn')?.textContent).toContain('Upload logo');
  });
});
