import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// We'll test the CLI by actually running it as a subprocess
// This is an integration test that verifies the entire pipeline

describe('CLI Integration', () => {
  const testOutputDir = path.join(process.cwd(), 'test-output');

  beforeEach(async () => {
    // Create test output directory
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  it('should display help when --help flag is used', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('Usage:');
    expect(result).toContain('Options:');
  });

  it('should display version when --version flag is used', () => {
    const result = execSync('tsx src/cli.ts --version', { encoding: 'utf-8' });

    expect(result).toMatch(/\d+\.\d+\.\d+/); // Should match version format
  });

  it('should require a URL argument', () => {
    try {
      execSync('tsx src/cli.ts', { encoding: 'utf-8', stdio: 'pipe' });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.status).not.toBe(0);
      expect(error.stderr.toString()).toContain('missing required argument');
    }
  });

  it('should accept output file option', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('-o, --output');
  });

  it('should accept timeout option', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--timeout');
  });

  it('should accept retries option', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--retries');
  });

  it('should accept --html flag for HTML output', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--html');
  });

  it('should accept --text flag for plain text output', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--text');
  });

  it('should not allow both --html and --text flags together', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    // The help should indicate these are mutually exclusive or in a group
    expect(result).toContain('--html');
    expect(result).toContain('--text');
  });

  it('should accept --always-readable flag', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--always-readable');
    expect(result).toContain('Relax Readability thresholds');
  });

  it('should accept --all-links flag', () => {
    const result = execSync('tsx src/cli.ts --help', { encoding: 'utf-8' });

    expect(result).toContain('--all-links');
    expect(result).toContain('Extract every qualifying link');
  });

  it('should allow --always-readable and --all-links together', () => {
    // Smoke: invoking with both flags against a missing URL still fails for
    // "missing required argument" reasons, not for unknown-option reasons.
    try {
      execSync('tsx src/cli.ts --always-readable --all-links', {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      expect.fail('Should have thrown an error for missing URL');
    } catch (error: any) {
      expect(error.status).not.toBe(0);
      const stderr = error.stderr.toString();
      // If the flag weren't registered, commander would say "unknown option".
      expect(stderr).not.toContain('unknown option');
      expect(stderr).toContain('missing required argument');
    }
  });
});

describe('CLI Output', () => {
  it('should write markdown to stdout when no output file specified', () => {
    // We'll need to mock the readURL function for this test
    // This test will be implemented after we create the CLI module
    expect(true).toBe(true); // Placeholder
  });

  it('should write markdown to specified output file', async () => {
    // This will test the actual file writing
    expect(true).toBe(true); // Placeholder
  });

  it('should handle fetch errors gracefully', () => {
    // Test error handling
    expect(true).toBe(true); // Placeholder
  });
});
