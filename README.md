# mdfetch

> A fast, reliable CLI tool to convert web pages into clean, readable markdown.

Convert any web article into clean markdown with a single command. Uses Mozilla's Readability algorithm to extract the main content and Turndown to convert it to GitHub Flavored Markdown.

## Features

- 🚀 **Fast & Reliable** - Built with TypeScript, exponential backoff retry logic, and robust error handling
- 📄 **Multiple Output Formats** - Get markdown (default), HTML, or plain text
- 🎯 **Smart Content Extraction** - Uses Mozilla Readability to extract just the article content
- 🔗 **Absolute URLs** - Automatically converts relative image and link paths to absolute URLs
- 📊 **GitHub Flavored Markdown** - Full support for tables, code blocks, strikethrough, and task lists
- ⚙️ **Configurable** - Customize timeout, retries, and output format
- 📦 **Zero Config** - Works out of the box with sensible defaults

## Installation

### Global Installation (Recommended)

```bash
npm install -g mdfetch
```

This installs the `mdfetch` command globally.

### Local Installation

```bash
npm install mdfetch
```

Then use via npx:
```bash
npx mdfetch <url>
```

## Usage

### Basic Usage

```bash
# Output markdown to stdout
mdfetch https://example.com/article

# Save to a file
mdfetch https://example.com/article -o article.md

# Get HTML instead of markdown
mdfetch https://example.com/article --html

# Get plain text
mdfetch https://example.com/article --text
```

### Advanced Options

```bash
# Custom timeout (in milliseconds)
mdfetch https://example.com/article --timeout 60000

# Custom retry settings
mdfetch https://example.com/article --retries 5 --retry-delay 2000

# Combine options
mdfetch https://example.com/article -o article.md --timeout 45000
```

### All Options

```
Usage: mdfetch [options] <url>

CLI tool to convert web pages to clean markdown

Arguments:
  url                  URL of the web page to convert

Options:
  -V, --version        output the version number
  -o, --output <file>  Output file path (defaults to stdout)
  --html               Output readable HTML instead of markdown
  --text               Output plain text instead of markdown
  --timeout <ms>       Request timeout in milliseconds (default: 30000)
  --retries <count>    Number of retry attempts (default: 3)
  --retry-delay <ms>   Delay between retries in milliseconds (default: 1000)
  -h, --help           display help for command
```

## Examples

### Save Article as Markdown

```bash
mdfetch https://blog.example.com/great-article -o great-article.md
```

The output will include a metadata header:

```markdown
# Article Title

**By:** Author Name
**Source:** Example Blog
**URL:** https://blog.example.com/great-article

---

Article content starts here...
```

### Extract Just the HTML

```bash
mdfetch https://example.com/article --html -o article.html
```

### Get Plain Text for Processing

```bash
mdfetch https://example.com/article --text | wc -w
```

### Pipeline Usage

```bash
# Fetch multiple articles
cat urls.txt | xargs -I {} mdfetch {} -o {}.md

# Convert and immediately view
mdfetch https://example.com/article | less
```

## Library Usage

You can also use `mdfetch` as a library in your Node.js projects:

```typescript
import { readURL } from 'mdfetch';

// Fetch and convert a URL
const result = await readURL('https://example.com/article');

console.log(result.markdown);     // Markdown version
console.log(result.plainText);    // Plain text version
console.log(result.readableHTML); // Clean HTML version

// Access metadata
console.log(result.title);        // Article title
console.log(result.byline);       // Author
console.log(result.excerpt);      // Summary
console.log(result.publishedTime);// Publication date
console.log(result.length);       // Reading length

// Custom options
const result = await readURL('https://example.com/article', {
  timeout: 60000,
  retries: 5,
  retryDelay: 2000
});
```

### API Documentation

Full API documentation is available by generating TypeDoc:

```bash
npm run docs
```

Then open `docs/index.html` in your browser.

## How It Works

1. **Fetch** - Downloads the HTML content with retry logic and timeout protection
2. **Extract** - Uses Mozilla's Readability algorithm to extract the main article content
3. **Process** - Converts relative URLs to absolute URLs for images and links
4. **Convert** - Transforms HTML to clean markdown using Turndown with GFM support
5. **Output** - Returns content in all three formats: markdown, HTML, and plain text

## Supported Content

Works best with:
- Blog posts and articles
- News articles
- Documentation pages
- Medium posts
- Substack articles
- Academic papers
- Technical tutorials

May not work well with:
- Paywalled content
- JavaScript-heavy SPAs (requires pre-rendered HTML)
- Sites with aggressive bot detection

## Error Handling

The tool includes robust error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Timeouts**: Configurable timeout with graceful cancellation
- **4xx Errors**: No retry (client errors like 404, 403)
- **5xx Errors**: Automatic retry (server errors)
- **Content Errors**: Clear error messages when content can't be extracted

## Development

### Setup

```bash
git clone https://github.com/yourusername/mdfetch.git
cd mdfetch
npm install
```

### Commands

```bash
npm run build      # Compile TypeScript
npm test           # Run tests in watch mode
npm run test:run   # Run tests once
npm run test:coverage  # Run tests with coverage
npm run docs       # Generate API documentation
npm run dev        # Run CLI in development mode
```

### Testing

The project has comprehensive test coverage (90%+ on all metrics):

- **Unit tests** for all core functions
- **Integration tests** for the CLI
- **Mocked tests** for HTTP fetching
- **Edge case tests** for error handling

```bash
npm test
```

### Project Structure

```
mdfetch/
├── src/
│   ├── cli.ts           # CLI entry point
│   ├── reader.ts        # Main library function
│   ├── fetcher.ts       # HTTP fetching with retries
│   ├── readable.ts      # Readability extraction
│   ├── types.ts         # TypeScript interfaces
│   └── __tests__/       # Test files
├── dist/                # Compiled JavaScript
├── docs/                # Generated API docs
└── package.json
```

## Dependencies

### Runtime
- `@mozilla/readability` - Content extraction
- `linkedom` - Lightweight DOM implementation
- `turndown` - HTML to Markdown conversion
- `turndown-plugin-gfm` - GitHub Flavored Markdown support
- `commander` - CLI argument parsing

### Development
- `typescript` - Type checking and compilation
- `vitest` - Fast unit testing
- `typedoc` - API documentation generation

## Development Workflow

This project follows strict TDD (Test-Driven Development):

1. Write failing tests first (RED)
2. Write minimal code to pass tests (GREEN)
3. Refactor while keeping tests green (REFACTOR)
4. Maintain 90%+ test coverage

See [CLAUDE.md](CLAUDE.md) for detailed development rules.

## Credits

- Built with [Mozilla Readability](https://github.com/mozilla/readability)
- Markdown conversion by [Turndown](https://github.com/mixmark-io/turndown)
- DOM implementation by [linkedom](https://github.com/WebReflection/linkedom)

---

Made with ❤️ and strict TDD practices
