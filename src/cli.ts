#!/usr/bin/env node

import { Command } from 'commander';
import { readURL } from './reader.js';
import { promises as fs } from 'fs';
import path from 'path';

const program = new Command();

// Read version from package.json
const packageJson = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url), 'utf-8')
);

program
  .name('mdfetch')
  .description('CLI tool to convert web pages to clean markdown')
  .version(packageJson.version)
  .argument('<url>', 'URL of the web page to convert')
  .option('-o, --output <file>', 'Output file path (defaults to stdout)')
  .option('--html', 'Output readable HTML instead of markdown')
  .option('--text', 'Output plain text instead of markdown')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--retries <count>', 'Number of retry attempts', '3')
  .option('--retry-delay <ms>', 'Delay between retries in milliseconds', '1000')
  .action(async (url: string, options: any) => {
    try {
      // Parse options
      const readerOptions = {
        timeout: parseInt(options.timeout),
        retries: parseInt(options.retries),
        retryDelay: parseInt(options.retryDelay)
      };

      // Check for conflicting flags
      if (options.html && options.text) {
        console.error('Error: Cannot use both --html and --text flags together');
        process.exit(1);
      }

      // Fetch and convert the URL
      console.error(`Fetching ${url}...`);
      const result = await readURL(url, readerOptions);

      // Determine output format
      let output: string;

      if (options.html) {
        // Output readable HTML
        output = result.readableHTML;
      } else if (options.text) {
        // Output plain text
        output = result.plainText;
      } else {
        // Default: output markdown with metadata header
        output = `# ${result.title}

${result.byline ? `**By:** ${result.byline}\n` : ''}${result.siteName ? `**Source:** ${result.siteName}\n` : ''}${result.publishedTime ? `**Published:** ${result.publishedTime}\n` : ''}**URL:** ${result.url}

---

${result.markdown}
`;
      }

      // Write to file or stdout
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output, 'utf-8');
        console.error(`✓ Saved to ${outputPath}`);
      } else {
        console.log(output);
      }

      process.exit(0);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

program.parse();
