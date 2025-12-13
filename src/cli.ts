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
  .name('doc-reader')
  .description('CLI tool to convert web pages to clean markdown')
  .version(packageJson.version)
  .argument('<url>', 'URL of the web page to convert')
  .option('-o, --output <file>', 'Output file path (defaults to stdout)')
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

      // Fetch and convert the URL
      console.error(`Fetching ${url}...`);
      const result = await readURL(url, readerOptions);

      // Prepare markdown output with metadata header
      const output = `# ${result.title}

${result.byline ? `**By:** ${result.byline}\n` : ''}${result.siteName ? `**Source:** ${result.siteName}\n` : ''}${result.publishedTime ? `**Published:** ${result.publishedTime}\n` : ''}**URL:** ${result.url}

---

${result.markdown}
`;

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
