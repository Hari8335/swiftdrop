import { TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';
import { AvatarImageError, dataUrlByteSize, validateAvatarFile } from './avatar-image';

describe('AvatarComponent', () => {
  function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(AvatarComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('shows initials when there is no picture', () => {
    const el: HTMLElement = render({ initials: 'KP', src: null }).nativeElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent?.trim()).toBe('KP');
    expect(el.getAttribute('data-has-image')).toBeNull();
  });

  it('shows the picture when src is set and updates when it changes', () => {
    const fixture = render({ initials: 'KP', src: 'data:image/png;base64,AAAA' });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(el.getAttribute('data-has-image')).toBe('true');

    fixture.componentRef.setInput('src', null);
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent?.trim()).toBe('KP');
  });

  it('falls back to initials when the image fails to load', () => {
    const fixture = render({ initials: 'KP', src: 'data:image/png;base64,broken' });
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('KP');
  });
});

describe('avatar image helpers', () => {
  it('rejects SVG, GIF and oversized files', () => {
    expect(() => validateAvatarFile(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))).toThrow(AvatarImageError);
    expect(() => validateAvatarFile(new File(['GIF89a'], 'a.gif', { type: 'image/gif' }))).toThrow(AvatarImageError);
    const big = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    expect(() => validateAvatarFile(big)).toThrow(/10 MB/);
  });

  it('accepts PNG, JPEG and WebP', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(() => validateAvatarFile(new File(['x'], 'a', { type }))).not.toThrow();
    }
  });

  it('computes decoded data URL size', () => {
    expect(dataUrlByteSize('data:image/png;base64,AAAA')).toBe(3);
    expect(dataUrlByteSize('data:image/png;base64,AAA=')).toBe(2);
    expect(dataUrlByteSize('data:image/png;base64,AA==')).toBe(1);
  });
});
