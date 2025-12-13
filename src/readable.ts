import { DOMParser, parseHTML } from 'linkedom'
import { Readability } from '@mozilla/readability'

export interface Link {
    title: string
    url: string
}

export interface Article {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
    publishedTime: string;
}


/**
 * convertToAbsoluteURL converts a relative URL to an absolute URL
 * @param base the base URL
 * @param relativePath the relative path to convert
 * @returns the absolute URL
 */
export function convertToAbsoluteURL(base: string, relativePath: string): string {
    const baseURL = new URL(base);
    const absoluteURL = new URL(relativePath, baseURL);
    return absoluteURL.href;
}

/**
 * makeImgPathsAbsolute makes all image paths absolute
 * @param hostname the hostname of the page
 * @param html the HTML of the page
 * @returns the HTML with all image paths absolute
 */
export function makeImgPathsAbsolute(hostname: string, html: string): string {
    return makeURLAbsolute('img', 'src', hostname, html)
}

/**
 * makeLinksAbsolute makes all links absolute
 * @param hostname the hostname of the page
 * @param html the HTML of the page
 * @returns the HTML with all links absolute
 */
export function makeLinksAbsolute(hostname: string, html: string): string {
    return makeURLAbsolute('a', 'href', hostname, html)
}

/**
 * makeURLAbsolute makes all URLs absolute
 * @param tag the tag to make absolute
 * @param attr the attribute to make absolute
 * @param hostname the hostname of the page
 * @param html the HTML of the page
 * @returns the HTML with all URLs absolute
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
 * 
 * @param html the HTML of the page to make readable
 * @returns the article if it was able to be parsed, null otherwise
 */
export function makeReadable(html: string): Article | null {
    let document: Document
    const r: any = parseHTML(html)
    document = r.document

    let article: null | any = null
    try {
        // extract article using Readability
        const reader = new Readability(document)
        article = reader.parse()
    } catch (e) {
        const textarea = document.createElement('textarea')
        textarea.innerHTML = html
        const cleanHTML = textarea.value

        const r: any = parseHTML(cleanHTML)
        const reader = new Readability(r.document)
        article = reader.parse()
    }
    // catchall -- if we can't parse the article, skip it
    if (article === null) {
        throw new Error(`Failed to make article readable`)
    }

    return { title: article.title || '', content: article.content || '', textContent: article.textContent || '', length: article.length || 0, excerpt: article.excerpt || '', byline: article.byline || '', dir: article.dir || '', siteName: article.siteName || '', lang: article.lang || '', publishedTime: article.publishedTime || '' } as Article
}