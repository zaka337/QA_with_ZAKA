import { describe, it, expect } from 'vitest';
import { detectCodeFlavor } from './codeFlavor';

describe('detectCodeFlavor', () => {
  it('detects Playwright from page.* call syntax', () => {
    expect(detectCodeFlavor(`await page.goto('/login'); await page.click('#submit');`)).toBe('playwright');
  });

  it('does not mistake a Selenium page-object method for Playwright', () => {
    // Regression case: substring matching previously misclassified this as
    // Playwright because "page.fill" appeared inside "checkout_page.fill_shipping_info".
    const seleniumCode = `
      driver = webdriver.Chrome()
      checkout_page.fill_shipping_info(driver, address)
      element = driver.find_element(By.ID, 'submit')
    `;
    expect(detectCodeFlavor(seleniumCode)).toBe('selenium');
  });

  it('detects Appium from driver.$( / mobile: syntax', () => {
    expect(detectCodeFlavor(`await driver.$('~loginBtn').click(); driver.execute('mobile: scroll');`)).toBe('appium');
  });

  it('detects pytest from def test_/assert, absent page./driver.', () => {
    expect(detectCodeFlavor(`import pytest\ndef test_addition():\n    assert 1 + 1 == 2`)).toBe('pytest');
  });

  it('detects Selenium from WebDriver APIs', () => {
    expect(detectCodeFlavor(`driver = webdriver.Firefox()\nel = driver.find_element(By.ID, 'x')`)).toBe('selenium');
  });

  it('falls back to unknown for unrecognized code', () => {
    expect(detectCodeFlavor(`console.log('hello world');`)).toBe('unknown');
  });
});
