/** 
 * give a regexp string and url return match array
 * regexp string must full match url
 * @param {string} regexp regexp string
 * @param {string} url 
 * @returns {RegExpMatchArray}
 */
export function matchUrl(regexp, url) {
    const regex = new RegExp(regexp);
    return url.match(regex);
}

/** 
 * give a RegExpMatchArray and url return new url
 * example:
 * if origin url `https://raw.githubusercontent.com/brianpetro` and regexp `https://raw.githubusercontent.com/.*`
 * and replace url `https://mirror.ghproxy.com/$0`, then return `https://mirror.ghproxy.com/https://raw.githubusercontent.com/brianpetro`
 * if origin url `https://raw.githubusercontent.com/brianpetro` and regexp `https://raw.githubusercontent.com/(.*)`
 * and replace url `https://mirror.ghproxy.com/$0`, then return `https://mirror.ghproxy.com/brianpetro`
 * @param {RegExpMatchArray} matches
 * @param {string} url 
 * @returns {string}
 */
export function replaceUrl(matches, url) {
    if (!matches) return url;
    let newUrl = url;
    matches.forEach((match, index) => {
        newUrl = newUrl.replace(new RegExp(`\\$${index}`, 'g'), match);
    });
    return newUrl;
}