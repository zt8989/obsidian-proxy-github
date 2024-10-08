import { matchUrl, replaceUrl } from './utils.js';

describe('matchUrl', () => {
    it('should return null if no match is found', () => {
        const url = 'https://example.com';
        const regexp = 'https://raw.githubusercontent.com/.*';
        expect(matchUrl(regexp, url)).toBeNull();
    });

    it('should return a match array if a match is found', () => {
        const url = 'https://raw.githubusercontent.com/brianpetro';
        const regexp = 'https://raw.githubusercontent.com/.*';
        const result = matchUrl(regexp, url);
        expect(result).toBeInstanceOf(Array);
        expect(result[0]).toBe(url);
    });
});

describe('replaceUrl', () => {
    it('should return the original url if no matches are provided', () => {
        const url = 'https://raw.githubusercontent.com/brianpetro';
        expect(replaceUrl(null, url)).toBe(url);
    });

    it('should replace the url with the provided matches', () => {
        const url = 'https://raw.githubusercontent.com/brianpetro';
        const matches = matchUrl('https://raw.githubusercontent.com/.*', url);
        const replaceUrlString = 'https://mirror.ghproxy.com/$0'
        const newUrl = replaceUrl(matches, replaceUrlString);
        expect(newUrl).toBe('https://mirror.ghproxy.com/https://raw.githubusercontent.com/brianpetro');
    });

    it('should replace the url with the provided matches and capture groups', () => {
        const url = 'https://raw.githubusercontent.com/brianpetro';
        const matches = matchUrl('https://raw.githubusercontent.com/(.*)', url);
        const replaceUrlString = 'https://mirror.ghproxy.com/$1'
        const newUrl = replaceUrl(matches, replaceUrlString);
        expect(newUrl).toBe('https://mirror.ghproxy.com/brianpetro');
    });
});