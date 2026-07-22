// ============================================================
// Site Configuration
// ============================================================

export interface SiteConfig {
  language: string;
  brandName: string;
}

export const siteConfig: SiteConfig = {
  language: "en",
  brandName: "QA with Zaka.",
};

// ============================================================
// Navigation
// ============================================================

export interface NavLink {
  label: string;
  href: string;
}

export interface NavigationConfig {
  links: NavLink[];
  ctaText: string;
}

export const navigationConfig: NavigationConfig = {
  links: [
    { label: "Learning Path", href: "#curriculum" },
    { label: "Live Demo", href: "#cinematic" },
    { label: "Tool Stack", href: "#alumni" },
    { label: "Contact", href: "#footer" },
  ],
  ctaText: "Start Learning",
};

// ============================================================
// Hero
// ============================================================

export interface HeroConfig {
  title: string;
  subtitleLine1: string;
  subtitleLine2: string;
  ctaText: string;
}

export const heroConfig: HeroConfig = {
  title: "QA AUTOMATION",
  subtitleLine1:
    "A complete roadmap from manual testing to senior automation engineer — code, frameworks, CI/CD.",
  subtitleLine2: "Deep dives into every layer of the testing pyramid.",
  ctaText: "Explore the roadmap",
};

// ============================================================
// Capabilities (Curriculum section)
// ============================================================

export interface CapabilityItem {
  title: string;
  slug: string;
  description: string;
  image: string;
}

export interface CapabilitiesConfig {
  sectionLabel: string;
  items: CapabilityItem[];
}

export const capabilitiesConfig: CapabilitiesConfig = {
  sectionLabel: "The Learning Path",
  items: [
    {
      title: "Foundations of Code",
      slug: "foundations-of-code",
      description:
        "Master the programming core every automation engineer needs: Python or JavaScript, OOP design, data structures, Git workflows, and debugging discipline before touching a framework.",
      image: "images/capability-1.webp",
    },
    {
      title: "UI Test Automation",
      slug: "ui-test-automation",
      description:
        "Deep dive into browser automation with Selenium, Playwright, and Cypress — locators, smart waits, Page Object Model, cross-browser grids, and taming flaky tests for good.",
      image: "images/capability-2.webp",
    },
    {
      title: "API & Backend Testing",
      slug: "api-backend-testing",
      description:
        "Validate the layers beneath the UI: REST and GraphQL testing, Postman and REST Assured, contract testing with Pact, schema validation, and database verification.",
      image: "images/capability-3.webp",
    },
    {
      title: "CI/CD & Quality Ops",
      slug: "cicd-quality-ops",
      description:
        "Ship quality at pipeline speed: GitHub Actions and Jenkins, Dockerized test environments, parallel execution, Allure reporting, and enforcing quality gates on every merge.",
      image: "images/capability-4.webp",
    },
  ],
};

// ============================================================
// Capability Detail (sub-pages)
// ============================================================

export interface CapabilityDetailData {
  title: string;
  subtitle: string;
  paragraphs: string[];
}

export interface CapabilityDetailConfig {
  sectionLabel: string;
  backLinkText: string;
  prevLabel: string;
  nextLabel: string;
  notFoundText: string;
  capabilities: Record<string, CapabilityDetailData>;
}

export const capabilityDetailConfig: CapabilityDetailConfig = {
  sectionLabel: "Deep Dive",
  backLinkText: "Back to roadmap",
  prevLabel: "Previous stage",
  nextLabel: "Next stage",
  notFoundText: "Roadmap stage not found.",
  capabilities: {
    "foundations-of-code": {
      title: "Foundations of Code",
      subtitle:
        "Automation is software engineering — learn to write real code first.",
      paragraphs: [
        "Every durable automation career starts with one language learned deeply. Pick Python for its gentle syntax and rich test ecosystem (pytest, requests, allure) or JavaScript/TypeScript to stay close to modern web stacks. Cover variables, control flow, functions, collections, file I/O, and error handling until writing small utilities feels effortless — this is the muscle every framework later relies on.",
        "Next comes object-oriented design, because serious frameworks are built on it. Understand classes, inheritance, encapsulation, and composition, then study the patterns that dominate test automation: Page Object Model, Factory, Builder, and Singleton. Learn SOLID principles pragmatically — enough to keep a 500-test suite maintainable instead of a tangled script graveyard.",
        "Data structures and algorithms matter more than most testers expect. Lists, maps, sets, and queues appear constantly when processing API responses and test data; basic complexity awareness keeps data-driven suites fast. Pair this with regular expressions, JSON/YAML parsing, and working comfortably in the terminal — the daily toolkit of an automation engineer.",
        "Finally, treat Git as non-negotiable. Branching strategies, pull requests, code reviews, merge-conflict resolution, and semantic commit messages are how quality engineers collaborate with developers. Finish this stage by building a small CLI tool — a log parser or test-data generator — and publishing it on GitHub with a clean README and CI check.",
      ],
    },
    "ui-test-automation": {
      title: "UI Test Automation",
      subtitle:
        "Drive browsers like a user, engineer suites like a developer.",
      paragraphs: [
        "Begin with Selenium WebDriver to learn how browser automation actually works: the WebDriver protocol, browser drivers, sessions, and the DOM. Master locator strategy in depth — CSS selectors and XPath, relative locators, shadow DOM piercing, and why stable data-test attributes beat brittle XPaths every time. Then confront the number one source of flakiness: synchronization. Implicit, explicit, and fluent waits must become second nature.",
        "Move to Playwright or Cypress for the modern workflow. Playwright brings auto-waiting, network interception, browser contexts, trace viewers, and true multi-browser coverage from one API; Cypress offers time-travel debugging and a developer-friendly in-browser runner. Learn both philosophies — out-of-process control versus in-browser execution — so you can choose deliberately for each project.",
        "Architecture is where suites live or die. Implement the Page Object Model with component objects for shared UI fragments, separate test data from logic, and centralize configuration for environments. Add data-driven testing, retry policies with quarantine tagging, and visual regression with screenshot comparison. A well-architected suite reads like documentation of the product.",
        "Scale out with Selenium Grid or cloud device farms for cross-browser and cross-platform coverage, running tests in parallel to keep feedback under ten minutes. Study flaky-test forensics: tracing, video capture, deterministic waits, and test isolation. Graduate by automating a real web app end-to-end — login, CRUD flows, file upload, and a checkout — wired into a clean, reviewed repository.",
      ],
    },
    "api-backend-testing": {
      title: "API & Backend Testing",
      subtitle:
        "Test where the logic lives — faster, stabler, closer to the metal.",
      paragraphs: [
        "API testing delivers the highest return on automation effort. Start with HTTP fundamentals: methods, status codes, headers, authentication schemes (Basic, Bearer tokens, OAuth2), and idempotency. Use Postman to explore endpoints and build collections with environments, pre-request scripts, and test assertions, then graduate to Newman for running those collections headlessly in pipelines.",
        "Bring tests into code with REST Assured (Java) or requests/pytest and Playwright's API context (Python/JS). Structure tests around given-when-then, validate response bodies with JSON schema, assert on headers and timing, and chain multi-step workflows where one call's output feeds the next. Learn to serialize and deserialize payloads into typed objects instead of poking at raw JSON strings.",
        "Expand into contract and integration testing. Consumer-driven contracts with Pact let frontend and backend teams verify agreements without a shared environment. Add GraphQL query testing, WebSocket message assertions, and mocking/stubbing with WireMock to isolate systems under test. Understand idempotency, pagination, rate limiting, and how to test them explicitly.",
        "Round out the backend with data-layer verification: SQL queries to assert state after API operations, validating database migrations, and seeding test data through fixtures or factories. Touch message queues (Kafka, RabbitMQ) by asserting that events are produced and consumed correctly. The capstone: a full API test suite with schema validation, contract tests, and database checks running in CI.",
      ],
    },
    "cicd-quality-ops": {
      title: "CI/CD & Quality Ops",
      subtitle:
        "A test that never runs is worthless — automate the automation.",
      paragraphs: [
        "Continuous integration turns your suite from a local script into a team asset. Learn GitHub Actions and Jenkins pipelines: triggers on push and pull request, job matrices, caching dependencies, secrets management, and artifact storage. Structure pipelines so fast smoke tests gate every commit while full regression runs nightly, keeping developers' feedback loops tight.",
        "Containerization makes environments reproducible. Master Docker fundamentals — images, containers, volumes, networks — and Docker Compose for spinning up the app, its database, and your test runner together. Run suites against ephemeral environments per pull request, and use Selenium Grid in containers for parallel browser execution that scales horizontally.",
        "Reporting transforms raw results into decisions. Implement Allure or ReportPortal for rich historical reporting with steps, attachments, and trend analysis. Define quality gates — pass-rate thresholds, coverage floors, performance budgets — that fail the build automatically, and wire notifications into Slack so failures are seen within minutes, not discovered at release time.",
        "Finish with the senior skill set: test strategy and metrics. Apply the testing pyramid deliberately, track flaky-test rate and mean time to feedback, calculate automation ROI, and learn when not to automate. Explore performance testing with JMeter or k6, accessibility checks with axe, and chaos basics. Capstone: a pipeline that builds, deploys to staging, runs UI + API + performance suites, and publishes a quality report.",
      ],
    },
  },
};

// ============================================================
// Architecture (CinematicVision section)
// ============================================================

export interface ArchitectureConfig {
  sectionLabel: string;
  videoPath: string;
  title: string;
  description: string;
}

export const architectureConfig: ArchitectureConfig = {
  sectionLabel: "Live from the Field",
  videoPath: "videos/test_Subscription.mp4",
  title: "Real automation, real product — My Zong App.",
  description:
    "This isn't a tutorial demo — it's a real Appium automation test running against the production My Zong App during my internship at Zong 5G. The script navigates the dashboard, filters bundle offers, and completes a subscription flow end-to-end. Built with Python, Appium, and the Page Object Model — the same engineering principles this roadmap teaches.",
};

// ============================================================
// Research (AlumniArchives section)
// ============================================================

export interface ResearchProject {
  title: string;
  year: string;
  discipline: string;
  image: string;
}

export interface ResearchConfig {
  sectionLabel: string;
  projects: ResearchProject[];
}

export const researchConfig: ResearchConfig = {
  sectionLabel: "The Tool Stack",
  projects: [
    {
      title: "Python for Testers",
      year: "01",
      discipline: "Language Core",
      image: "images/tool_python.webp",
    },
    {
      title: "Git & Code Review",
      year: "02",
      discipline: "Collaboration",
      image: "images/tool_git.webp",
    },
    {
      title: "Selenium WebDriver",
      year: "03",
      discipline: "UI Automation",
      image: "images/tool_selenium.webp",
    },
    {
      title: "Playwright",
      year: "04",
      discipline: "UI Automation",
      image: "images/tool_playwright.webp",
    },
    {
      title: "Cypress",
      year: "05",
      discipline: "UI Automation",
      image: "images/tool_cypress.webp",
    },
    {
      title: "Appium Mobile",
      year: "06",
      discipline: "Mobile Automation",
      image: "images/tool_appium.webp",
    },
    {
      title: "Postman & REST Assured",
      year: "07",
      discipline: "API Testing",
      image: "images/tool_postman.webp",
    },
    {
      title: "Pact Contract Tests",
      year: "08",
      discipline: "API Testing",
      image: "images/tool_pact.webp",
    },
    {
      title: "JMeter & k6",
      year: "09",
      discipline: "Performance",
      image: "images/tool_jmeter.webp",
    },
    {
      title: "Docker for QA",
      year: "10",
      discipline: "Infrastructure",
      image: "images/qa_tool_2.webp", // Temporarily using abstraction due to rate limit
    },
    {
      title: "Jenkins & GH Actions",
      year: "11",
      discipline: "CI/CD",
      image: "images/qa_tool_4.webp", // Temporarily using abstraction due to rate limit
    },
    {
      title: "Allure Reporting",
      year: "12",
      discipline: "Quality Intelligence",
      image: "images/qa_tool_3.webp", // Temporarily using abstraction due to rate limit
    },
  ],
};

// ============================================================
// Footer
// ============================================================

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterLinkColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterBottomLink {
  label: string;
  href: string;
}

export interface FooterConfig {
  heading: string;
  columns: FooterLinkColumn[];
  copyright: string;
  bottomLinks: FooterBottomLink[];
}

export const footerConfig: FooterConfig = {
  heading: "Test everything. Trust nothing.",
  columns: [
    {
      title: "Roadmap",
      links: [
        { label: "Foundations", href: "/capability/foundations-of-code" },
        { label: "UI Automation", href: "/capability/ui-test-automation" },
        { label: "API Testing", href: "/capability/api-backend-testing" },
        { label: "CI/CD & DevOps", href: "/capability/cicd-quality-ops" },
      ],
    },
    {
      title: "Connect with Zaka",
      links: [
        { label: "Portfolio", href: "https://zakasportfolio.netlify.app/" },
        { label: "GitHub", href: "https://github.com/zaka337" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/zaka-ullah-waheed-80380832a" },
      ],
    },
  ],
  copyright: "© 2026 QA with Zaka. Built for future automation engineers.",
  bottomLinks: [
    { label: "Portfolio", href: "https://zakasportfolio.netlify.app/" },
    { label: "GitHub", href: "https://github.com/zaka337" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/zaka-ullah-waheed-80380832a" },
  ],
};
