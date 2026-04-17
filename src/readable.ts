/**
 * Content extraction and URL normalization module.
 *
 * This module provides utilities for extracting readable article content from HTML
 * using Mozilla's Readability algorithm, and for converting relative URLs to absolute
 * URLs. It handles the DOM parsing and manipulation needed to prepare content for
 * markdown conversion.
 *
 * The main function, {@link makeReadable}, combines Mozilla Readability with linkedom
 * (a lightweight DOM implementation) to extract clean article content from messy HTML.
 *
 * @module readable
 *
 * @example
 * ```typescript
 * import { makeReadable, makeImgPathsAbsolute, makeLinksAbsolute } from 'mdfetch/readable';
 *
 * // Fetch HTML from somewhere
 * const html = '<html><body><article><h1>Title</h1><p>Content</p></article></body></html>';
 *
 * // Make URLs absolute
 * const withAbsoluteImages = makeImgPathsAbsolute('https://example.com', html);
 * const withAbsoluteLinks = makeLinksAbsolute('https://example.com', withAbsoluteImages);
 *
 * // Extract readable content
 * const article = makeReadable(withAbsoluteLinks);
 * console.log(article.title);       // "Title"
 * console.log(article.content);     // "<h1>Title</h1><p>Content</p>"
 * console.log(article.textContent); // "Title Content"
 * ```
 */

import { DOMParser, parseHTML } from 'linkedom'
import { Readability } from '@mozilla/readability'

/**
 * Represents a hyperlink with title and URL.
 */
export interface Link {
    /** Link text/title */
    title: string
    /** Link URL */
    url: string
}

/**
 * Article data structure returned by Mozilla Readability.
 * Contains the extracted article content and associated metadata.
 */
export interface Article {
    /** Article title */
    title: string;
    /** Article content as HTML */
    content: string;
    /** Article content as plain text */
    textContent: string;
    /** Estimated reading length in characters */
    length: number;
    /** Article excerpt/summary */
    excerpt: string;
    /** Article author/byline */
    byline: string;
    /** Text direction ('ltr' or 'rtl') */
    dir: string;
    /** Name of the source website */
    siteName: string;
    /** Language code (e.g., 'en') */
    lang: string;
    /** Publication timestamp */
    publishedTime: string;
}


/**
 * Converts a relative URL to an absolute URL.
 *
 * Handles various URL formats:
 * - Relative paths: `/path` → `https://example.com/path`
 * - Parent directories: `../path` → resolves correctly
 * - Protocol-relative: `//cdn.com/file` → `https://cdn.com/file`
 * - Already absolute URLs are returned unchanged
 *
 * @param base - The base URL to resolve against
 * @param relativePath - The relative or absolute path to convert
 * @returns The absolute URL
 *
 * @example
 * ```typescript
 * convertToAbsoluteURL('https://example.com/page', '/images/pic.jpg')
 * // Returns: 'https://example.com/images/pic.jpg'
 *
 * convertToAbsoluteURL('https://example.com/dir/', '../file.html')
 * // Returns: 'https://example.com/file.html'
 * ```
 */
export function convertToAbsoluteURL(base: string, relativePath: string): string {
    const baseURL = new URL(base);
    const absoluteURL = new URL(relativePath, baseURL);
    return absoluteURL.href;
}

/**
 * Makes all image source paths absolute in HTML content.
 *
 * Finds all `<img>` tags and converts their `src` attributes from
 * relative to absolute URLs using the provided hostname.
 *
 * @param hostname - The base hostname/URL for resolving relative paths
 * @param html - The HTML content to process
 * @returns HTML with all image paths converted to absolute URLs
 *
 * @example
 * ```typescript
 * const html = '<img src="/logo.png">';
 * makeImgPathsAbsolute('https://example.com', html);
 * // Returns: '<img src="https://example.com/logo.png">'
 * ```
 */
export function makeImgPathsAbsolute(hostname: string, html: string): string {
    return makeURLAbsolute('img', 'src', hostname, html)
}

/**
 * Makes all link hrefs absolute in HTML content.
 *
 * Finds all `<a>` tags and converts their `href` attributes from
 * relative to absolute URLs using the provided hostname.
 *
 * @param hostname - The base hostname/URL for resolving relative paths
 * @param html - The HTML content to process
 * @returns HTML with all link hrefs converted to absolute URLs
 *
 * @example
 * ```typescript
 * const html = '<a href="/about">About</a>';
 * makeLinksAbsolute('https://example.com', html);
 * // Returns: '<a href="https://example.com/about">About</a>'
 * ```
 */
export function makeLinksAbsolute(hostname: string, html: string): string {
    return makeURLAbsolute('a', 'href', hostname, html)
}

/**
 * Makes URLs absolute for a specific HTML tag and attribute.
 *
 * Generic function that finds all instances of a given tag and converts
 * a specific attribute from relative to absolute URLs.
 *
 * @param tag - The HTML tag name to target (e.g., 'img', 'a', 'link')
 * @param attr - The attribute name to convert (e.g., 'src', 'href')
 * @param hostname - The base hostname/URL for resolving relative paths
 * @param html - The HTML content to process
 * @returns HTML with the specified URLs converted to absolute
 *
 * @example
 * ```typescript
 * // Convert video sources
 * makeURLAbsolute('video', 'src', 'https://example.com', html);
 *
 * // Convert stylesheet links
 * makeURLAbsolute('link', 'href', 'https://example.com', html);
 * ```
 */
export function makeURLAbsolute(tag: string, attr: string, hostname: string, html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html')
    const links = document.querySelectorAll(tag)
    links.forEach((link: any) => {
        const url = link.getAttribute(attr)
        if (url && !url.startsWith('http')) {
            link.setAttribute(attr, convertToAbsoluteURL(hostname, url).toString())
        }
    })
    return document.toString()
}



/**
 * Options for {@link makeReadable}.
 */
export interface MakeReadableOptions {
    /**
     * When true, relax Mozilla Readability's thresholds by passing
     * `charThreshold: 0` to the Readability constructor. This lets
     * short or borderline pages still produce an article instead of
     * being silently rejected by the default 500-char minimum.
     */
    alwaysReadable?: boolean;
}

/**
 * Extracts readable article content from HTML using Mozilla Readability.
 *
 * This function uses the Readability algorithm to extract the main article
 * content from a web page, removing navigation, ads, and other clutter.
 *
 * Features:
 * - Automatic article detection and extraction
 * - Metadata extraction (title, author, published date, etc.)
 * - Text direction and language detection
 * - Fallback handling for malformed HTML entities
 *
 * @param html - The raw HTML content to process
 * @param options - Optional behavior flags; see {@link MakeReadableOptions}
 * @returns Article object with extracted content and metadata
 *
 * @throws {Error} When the article cannot be parsed or lacks sufficient content
 *
 * @example
 * ```typescript
 * const html = await fetchHTML('https://example.com/article');
 * const article = makeReadable(html);
 *
 * console.log(article.title);        // Article title
 * console.log(article.textContent);  // Plain text content
 * console.log(article.content);      // HTML content
 * console.log(article.byline);       // Author information
 * ```
 */
export function makeReadable(html: string, options: MakeReadableOptions = {}): Article | null {
    const readabilityOptions = options.alwaysReadable ? { charThreshold: 0 } : {}
    let document: Document
    const r: any = parseHTML(html)
    document = r.document

    let article: null | any = null
    try {
        // extract article using Readability
        const reader = new Readability(document, readabilityOptions)
        article = reader.parse()
    } catch (e) {
        const textarea = document.createElement('textarea')
        textarea.innerHTML = html
        const cleanHTML = textarea.value

        const r: any = parseHTML(cleanHTML)
        const reader = new Readability(r.document, readabilityOptions)
        article = reader.parse()
    }
    // catchall -- if we can't parse the article, skip it
    if (article === null) {
        throw new Error(`Failed to make article readable`)
    }

    return { title: article.title || '', content: article.content || '', textContent: article.textContent || '', length: article.length || 0, excerpt: article.excerpt || '', byline: article.byline || '', dir: article.dir || '', siteName: article.siteName || '', lang: article.lang || '', publishedTime: article.publishedTime || '' } as Article
}