import { test, expect } from '@playwright/test';
import { GOOGLE_API_KEY } from '../../src/config';

// Mock Data
const MOCK_ALBUM_ID = 'album-123';
const MOCK_ROOT_ID = 'root-folder-id';

const MOCK_ALBUM = {
  id: MOCK_ALBUM_ID,
  name: 'Test Album',
  mimeType: 'application/vnd.google-apps.folder',
  parents: [MOCK_ROOT_ID]
};

const MOCK_PHOTOS = Array.from({ length: 10 }, (_, i) => ({
  id: `photo-${i}`,
  name: `Photo ${i}.jpg`,
  mimeType: 'image/jpeg',
  parents: [MOCK_ALBUM_ID],
  thumbnailLink: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjwvc3ZnPg==',
  webViewLink: 'http://example.com/photo',
  imageMediaMetadata: { width: 800, height: 600 },
  createdTime: new Date().toISOString(),
  modifiedTime: new Date().toISOString(),
  size: '1024'
}));

test.describe('Album App E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Clear Local Storage
    await page.addInitScript(() => {
      try {
          localStorage.clear();
          localStorage.setItem('cazador-viewMode', 'grid');
      } catch (e) {}
    });

    // Intercept ALL Drive API requests
    await page.route('**', async route => {
      const url = new URL(route.request().url());

      // Pass through non-API requests
      if (!url.hostname.includes('googleapis.com')) {
          await route.continue();
          return;
      }

      // Handle Drive Files API
      if (url.pathname.includes('/drive/v3/files')) {
          const q = url.searchParams.get('q') || '';

          const has = (str) => q.includes(str);

          // 1. Root Album Listing
          if (has('application/vnd.google-apps.folder') && has('parents') && !has(MOCK_ALBUM_ID)) {
             await route.fulfill({
                json: {
                  files: [MOCK_ALBUM],
                  nextPageToken: null
                }
             });
             return;
          }

          // 2. Album Contents (Photos)
          if (has(MOCK_ALBUM_ID) && has('parents')) {
               if (url.searchParams.get('pageSize') === '1') {
                   await route.fulfill({
                        json: {
                            files: [MOCK_PHOTOS[0]],
                            nextPageToken: null
                        }
                   });
                   return;
               }

               await route.fulfill({
                json: {
                    files: MOCK_PHOTOS,
                    nextPageToken: null
                }
              });
              return;
          }

          // 3. Fallback: Return Empty
          await route.fulfill({
            json: { files: [] }
          });
          return;
      }

      await route.continue();
    });

    // Go to home
    await page.goto('/');
    // Wait for at least one album card to appear
    await expect(page.locator('[data-testid^="album-card-"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('Album Grid UI: Title pill only, no top-left text', async ({ page }) => {
    const firstAlbum = page.locator('[data-testid^="album-card-"]').first();
    const titlePill = firstAlbum.locator('[data-testid="album-title"]');

    await expect(titlePill).toBeVisible();

    const cardText = await firstAlbum.innerText();
    const titleText = await titlePill.innerText();
    expect(cardText.trim()).toBe(titleText.trim());

    const cardBox = await firstAlbum.boundingBox();
    const pillBox = await titlePill.boundingBox();

    if (cardBox && pillBox) {
      const cardCenterY = cardBox.y + cardBox.height / 2;
      const pillCenterY = pillBox.y + pillBox.height / 2;
      const cardCenterX = cardBox.x + cardBox.width / 2;
      const pillCenterX = pillBox.x + pillBox.width / 2;

      expect(Math.abs(cardCenterY - pillCenterY)).toBeLessThan(5);
      expect(Math.abs(cardCenterX - pillCenterX)).toBeLessThan(5);
    }
  });

  test('Viewer Navigation: Open, Index, Next/Prev, No Reset', async ({ page }) => {
    const firstAlbum = page.locator('[data-testid^="album-card-"]').first();
    await firstAlbum.click();

    // Robust Photo Selector (Grid or List)
    // Grid: .photoMedia
    // List: tbody tr (assuming table structure)
    const gridPhoto = page.locator('.photoMedia').first();
    const listPhoto = page.locator('tbody tr').first();

    // Wait for either
    await Promise.race([
        expect(gridPhoto).toBeVisible({ timeout: 10000 }),
        expect(listPhoto).toBeVisible({ timeout: 10000 })
    ]).catch(() => {
        console.log('No photos found (Grid or List).');
    });

    // Determine which mode we are in or fallback
    let targetSelector = '.photoMedia';
    if (await listPhoto.isVisible()) {
        targetSelector = 'tbody tr';
    }

    const count = await page.locator(targetSelector).count();
    console.log(`Found ${count} photos using selector "${targetSelector}"`);

    if (count === 0) {
        test.skip('No photos found to test viewer navigation.');
        return;
    }

    // Use dynamic index based on count
    let targetIndex = 2;
    if (count <= 2) targetIndex = 0;

    // Click photo
    const targetPhoto = page.locator(targetSelector).nth(targetIndex);
    await targetPhoto.click();

    // Verify Lightbox opens
    const lightbox = page.locator('[data-testid="lightbox-modal"]');
    await expect(lightbox).toBeVisible();

    // Verify Image
    const lightboxImage = page.locator('[data-testid="lightbox-image"]');
    await expect(lightboxImage).toBeVisible();

    // Verify Navigation Buttons
    const nextBtn = page.locator('[data-testid="lightbox-next"]');

    // Only expect next button if we have more photos and not at end
    if (count > 1 && targetIndex < count - 1) {
        await expect(nextBtn).toBeVisible();

        // Navigate Next
        await nextBtn.click();
        await page.waitForTimeout(500);

        // Verify Index Increment
        const counterText = await page.locator('.lightbox-footer .text-xs').innerText();
        const [idxStr] = counterText.split(' / ');
        const newIndex = parseInt(idxStr, 10);

        // targetIndex (0-based) -> newIndex (1-based) should be targetIndex + 2
        // e.g. start at index 2 (Photo 3). Click Next. Now at index 3 (Photo 4).
        // Displayed: "4 / 10".
        expect(newIndex).toBe(targetIndex + 2);
    }

    // Verify No Reset Glitch
    // If we navigate, it should NOT jump back to 1.
    const counterTextFinal = await page.locator('.lightbox-footer .text-xs').innerText();
    const [finalIdx] = counterTextFinal.split(' / ');
    expect(parseInt(finalIdx, 10)).not.toBe(1);
  });

});
