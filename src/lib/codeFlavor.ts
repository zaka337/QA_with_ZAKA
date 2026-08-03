export type CodeFlavor = 'playwright' | 'appium' | 'pytest' | 'selenium' | 'unknown';

/**
 * Detects which testing tool a lesson's submitted code most likely targets,
 * so the mock terminal can narrate a tool-appropriate output. Word-boundary +
 * call-syntax anchored so e.g. `checkout_page.fill_shipping_info(...)` (a
 * Selenium sample) doesn't false-positive as Playwright's `page.fill(...)`.
 */
export function detectCodeFlavor(code: string): CodeFlavor {
  if (/\bpage\.(click|fill|goto|getBy)\w*\(|@playwright\/test/.test(code)) return 'playwright';
  if (/driver\.\$\(|mobile:|appium/i.test(code)) return 'appium';
  if (/def test_|import pytest|assert\s/.test(code) && !/page\.|driver\./.test(code)) return 'pytest';
  if (/webdriver\.(Chrome|Firefox)|find_element|WebDriverWait|new Builder\(\)/.test(code)) return 'selenium';
  return 'unknown';
}
