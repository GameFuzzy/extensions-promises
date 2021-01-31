(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Madara = void 0;
const _1 = require(".");
const models_1 = require("../models");
class Madara extends _1.Source {
    constructor() {
        super(...arguments);
        /**
         * The path that precedes a manga page not including the base URL.
         * Eg. for https://www.webtoon.xyz/read/limit-breaker/ it would be 'read'.
         * Used in all functions.
         */
        this.sourceTraversalPathName = 'manga';
        /**
         * By default, the homepage of a Madara is not its true homepage.
         * Accessing the site directory and sorting by the latest title allows
         * functions to step through the multiple pages easier, without a lot of custom
         * logic for each source.
         *
         * This variable holds the latter half of the website path which is required to reach the
         * directory page.
         * Eg. 'webtoons' for https://www.webtoon.xyz/webtoons/?m_orderby=latest
         */
        this.homePage = 'manga';
        /**
         * Some Madara sources have a different selector which is required in order to parse
         * out the popular manga. This defaults to the most common selector
         * but can be overridden by other sources which need it.
         */
        this.popularMangaSelector = "div.page-item-detail";
        /**
         * Much like {@link popularMangaSelector} this will default to the most used CheerioJS
         * selector to extract URLs from popular manga. This is available to be overridden.
         */
        this.popularMangaUrlSelector = "div.post-title a";
        /**
         * Different Madara sources might have a slightly different selector which is required to parse out
         * each manga object while on a search result page. This is the selector
         * which is looped over. This may be overridden if required.
         */
        this.searchMangaSelector = "div.c-tabs-item__content";
    }
    parseDate(dateString) {
        // Primarily we see dates for the format: "1 day ago" or "16 Apr 2020"
        let dateStringModified = dateString.replace('day', 'days').replace('month', 'months').replace('hour', 'hours');
        return new Date(this.convertTime(dateStringModified));
    }
    getMangaDetails(mangaId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${this.baseUrl}/${this.sourceTraversalPathName}/${mangaId}`,
                method: 'GET'
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let numericId = $('a.wp-manga-action-button').attr('data-post');
            let title = $('div.post-title h1').first().text().replace(/NEW/, '').replace('\\n', '').trim();
            let author = $('div.author-content').first().text().replace("\\n", '').trim();
            let artist = $('div.artist-content').first().text().replace("\\n", '').trim();
            let summary = $('p', $('div.description-summary')).text();
            let image = (_a = $('div.summary_image img').first().attr('data-src')) !== null && _a !== void 0 ? _a : '';
            let rating = $('span.total_votes').text().replace('Your Rating', '');
            let isOngoing = $('div.summary-content').text().toLowerCase().trim() == "ongoing";
            let genres = [];
            for (let obj of $('div.genres-content a').toArray()) {
                let genre = $(obj).text();
                genres.push(createTag({ label: genre, id: genre }));
            }
            // If we cannot parse out the data-id for this title, we cannot complete subsequent requests
            if (!numericId) {
                throw (`Could not parse out the data-id for ${mangaId} - This method might need overridden in the implementing source`);
            }
            return createManga({
                id: numericId,
                titles: [title],
                image: image,
                author: author,
                artist: artist,
                desc: summary,
                status: isOngoing ? models_1.MangaStatus.ONGOING : models_1.MangaStatus.COMPLETED,
                rating: Number(rating)
            });
        });
    }
    getChapters(mangaId) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${this.baseUrl}/wp-admin/admin-ajax.php`,
                method: 'POST',
                headers: {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "referer": this.baseUrl
                },
                data: `action=manga_get_chapters&manga=${mangaId}`
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let chapters = [];
            // Capture the manga title, as this differs from the ID which this function is fed
            let realTitle = (_a = $('a', $('li.wp-manga-chapter  ').first()).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`${this.baseUrl}/${this.sourceTraversalPathName}/`, '').replace(/\/chapter.*/, '');
            if (!realTitle) {
                throw (`Failed to parse the human-readable title for ${mangaId}`);
            }
            // For each available chapter..
            for (let obj of $('li.wp-manga-chapter  ').toArray()) {
                let id = (_b = $('a', $(obj)).first().attr('href')) === null || _b === void 0 ? void 0 : _b.replace(`${this.baseUrl}/${this.sourceTraversalPathName}/${realTitle}/`, '').replace('/', '');
                let chapNum = Number($('a', $(obj)).first().text().replace(/\D/g, ''));
                let releaseDate = $('i', $(obj)).text();
                if (!id) {
                    throw (`Could not parse out ID when getting chapters for ${mangaId}`);
                }
                chapters.push({
                    id: id,
                    mangaId: realTitle,
                    langCode: this.languageCode,
                    chapNum: chapNum,
                    time: this.parseDate(releaseDate)
                });
            }
            return chapters;
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${this.baseUrl}/${this.sourceTraversalPathName}/${mangaId}/${chapterId}`,
                method: 'GET',
                cookies: [createCookie({ name: 'wpmanga-adault', value: "1", domain: this.baseUrl })]
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let pages = [];
            for (let obj of $('div.page-break').toArray()) {
                let page = $('img', $(obj)).attr('data-src');
                if (!page) {
                    throw (`Could not parse page for ${mangaId}/${chapterId}`);
                }
                pages.push(page.replace(/[\t|\n]/g, ''));
            }
            return createChapterDetails({
                id: chapterId,
                mangaId: mangaId,
                pages: pages,
                longStrip: false
            });
        });
    }
    searchRequest(query, metadata) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            // If we're supplied a page that we should be on, set our internal reference to that page. Otherwise, we start from page 0.
            let page = (_a = metadata.page) !== null && _a !== void 0 ? _a : 0;
            const request = createRequestObject({
                url: `${this.baseUrl}/page/${page}?s=${query.title}&post_type=wp-manga`,
                method: 'GET',
                cookies: [createCookie({ name: 'wpmanga-adault', value: "1", domain: this.baseUrl })]
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let results = [];
            for (let obj of $(this.searchMangaSelector).toArray()) {
                let id = (_b = $('a', $(obj)).attr('href')) === null || _b === void 0 ? void 0 : _b.replace(`${this.baseUrl}/${this.sourceTraversalPathName}/`, '').replace('/', '');
                let title = createIconText({ text: (_c = $('a', $(obj)).attr('title')) !== null && _c !== void 0 ? _c : '' });
                let image = $('img', $(obj)).attr('data-src');
                if (!id || !title.text || !image) {
                    // Something went wrong with our parsing, return a detailed error
                    throw (`Failed to parse searchResult for ${this.baseUrl} using ${this.searchMangaSelector} as a loop selector`);
                }
                results.push(createMangaTile({
                    id: id,
                    title: title,
                    image: image
                }));
            }
            // Check to see whether we need to navigate to the next page or not
            if ($('div.wp-pagenavi')) {
                // There ARE multiple pages available, now we must check if we've reached the last or not
                let pageContext = $('span.pages').text().match(/(\d)/g);
                if (!pageContext || !pageContext[0] || !pageContext[1]) {
                    throw (`Failed to parse whether this search has more pages or not. This source may need to have it's searchRequest method overridden`);
                }
                // Because we used the \d regex, we can safely cast each capture to a numeric value
                if (Number(pageContext[1]) != Number(pageContext[2])) {
                    metadata.page = page + 1;
                }
                else {
                    metadata.page = undefined;
                }
            }
            return createPagedResults({
                results: results,
                metadata: metadata.page !== undefined ? metadata : undefined
            });
        });
    }
    /**
     * It's hard to capture a default logic for homepages. So for madara sources,
     * instead we've provided a homesection reader for the base_url/webtoons/ endpoint.
     * This supports having paged views in almost all cases.
     * @param sectionCallback
     */
    getHomePageSections(sectionCallback) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let section = createHomeSection({ id: "latest", title: "Latest Titles" });
            sectionCallback(section);
            // Parse all of the available data
            const request = createRequestObject({
                url: `${this.baseUrl}/${this.homePage}/?m_orderby=latest`,
                method: 'GET',
                cookies: [createCookie({ name: 'wpmanga-adault', value: "1", domain: this.baseUrl })]
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let items = [];
            for (let obj of $('div.manga').toArray()) {
                let image = $('img', $(obj)).attr('data-src');
                let title = $('a', $('h3.h5', $(obj))).text();
                let id = (_a = $('a', $('h3.h5', $(obj))).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`${this.baseUrl}/${this.sourceTraversalPathName}/`, '').replace('/', '');
                if (!id || !title || !image) {
                    throw (`Failed to parse homepage sections for ${this.baseUrl}/${this.sourceTraversalPathName}/`);
                }
                items.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: title }),
                    image: image
                }));
            }
            section.items = items;
            sectionCallback(section);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // We only have one homepage section ID, so we don't need to worry about handling that any
            let page = (_a = metadata.page) !== null && _a !== void 0 ? _a : 0; // Default to page 0
            const request = createRequestObject({
                url: `${this.baseUrl}/${this.homePage}/page/${page}/?m_orderby=latest`,
                method: 'GET',
                cookies: [createCookie({ name: 'wpmanga-adault', value: "1", domain: this.baseUrl })]
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let items = [];
            for (let obj of $('div.manga').toArray()) {
                let image = $('img', $(obj)).attr('data-src');
                let title = $('a', $('h3.h5', $(obj))).text();
                let id = (_b = $('a', $('h3.h5', $(obj))).attr('href')) === null || _b === void 0 ? void 0 : _b.replace(`${this.baseUrl}/${this.sourceTraversalPathName}/`, '').replace('/', '');
                if (!id || !title || !image) {
                    throw (`Failed to parse homepage sections for ${this.baseUrl}/${this.sourceTraversalPathName}`);
                }
                items.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: title }),
                    image: image
                }));
            }
            // Set up to go to the next page. If we are on the last page, remove the logic.
            metadata.page = page + 1;
            if (!$('a.last')) {
                metadata = undefined;
            }
            return createPagedResults({
                results: items,
                metadata: metadata
            });
        });
    }
}
exports.Madara = Madara;

},{".":4,"../models":25}],3:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
class Source {
    constructor(cheerio) {
        // <-----------        OPTIONAL METHODS        -----------> //
        /**
         * Manages the ratelimits and the number of requests that can be done per second
         * This is also used to fetch pages when a chapter is downloading
         */
        this.requestManager = createRequestManager({
            requestsPerSecond: 2.5,
            requestTimeout: 5000
        });
        this.cheerio = cheerio;
    }
    /**
     * (OPTIONAL METHOD) This function is called when ANY request is made by the Paperback Application out to the internet.
     * By modifying the parameter and returning it, the user can inject any additional headers, cookies, or anything else
     * a source may need to load correctly.
     * The most common use of this function is to add headers to image requests, since you cannot directly access these requests through
     * the source implementation itself.
     *
     * NOTE: This does **NOT** influence any requests defined in the source implementation. This function will only influence requests
     * which happen behind the scenes and are not defined in your source.
     */
    globalRequestHeaders() { return {}; }
    globalRequestCookies() { return []; }
    /**
     * (OPTIONAL METHOD) Given a manga ID, return a URL which Safari can open in a browser to display.
     * @param mangaId
     */
    getMangaShareUrl(mangaId) { return null; }
    /**
     * If a source is secured by Cloudflare, this method should be filled out.
     * By returning a request to the website, this source will attempt to create a session
     * so that the source can load correctly.
     * Usually the {@link Request} url can simply be the base URL to the source.
     */
    getCloudflareBypassRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which communicates with a given source, and returns a list of all possible tags which the source supports.
     * These tags are generic and depend on the source. They could be genres such as 'Isekai, Action, Drama', or they can be
     * listings such as 'Completed, Ongoing'
     * These tags must be tags which can be used in the {@link searchRequest} function to augment the searching capability of the application
     */
    getTags() { return Promise.resolve(null); }
    /**
     * (OPTIONAL METHOD) A function which should scan through the latest updates section of a website, and report back with a list of IDs which have been
     * updated BEFORE the supplied timeframe.
     * This function may have to scan through multiple pages in order to discover the full list of updated manga.
     * Because of this, each batch of IDs should be returned with the mangaUpdatesFoundCallback. The IDs which have been reported for
     * one page, should not be reported again on another page, unless the relevent ID has been detected again. You do not want to persist
     * this internal list between {@link Request} calls
     * @param mangaUpdatesFoundCallback A callback which is used to report a list of manga IDs back to the API
     * @param time This function should find all manga which has been updated between the current time, and this parameter's reported time.
     *             After this time has been passed, the system should stop parsing and return
     */
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) { return Promise.resolve(); }
    /**
     * (OPTIONAL METHOD) A function which should readonly allf the available homepage sections for a given source, and return a {@link HomeSection} object.
     * The sectionCallback is to be used for each given section on the website. This may include a 'Latest Updates' section, or a 'Hot Manga' section.
     * It is recommended that before anything else in your source, you first use this sectionCallback and send it {@link HomeSection} objects
     * which are blank, and have not had any requests done on them just yet. This way, you provide the App with the sections to render on screen,
     * which then will be populated with each additional sectionCallback method called. This is optional, but recommended.
     * @param sectionCallback A callback which is run for each independant HomeSection.
     */
    getHomePageSections(sectionCallback) { return Promise.resolve(); }
    /**
     * (OPTIONAL METHOD) This function will take a given homepageSectionId and metadata value, and with this information, should return
     * all of the manga tiles supplied for the given state of parameters. Most commonly, the metadata value will contain some sort of page information,
     * and this request will target the given page. (Incrementing the page in the response so that the next call will return relevent data)
     * @param homepageSectionId The given ID to the homepage defined in {@link getHomePageSections} which this method is to readonly moreata about
     * @param metadata This is a metadata parameter which is filled our in the {@link getHomePageSections}'s return
     * function. Afterwards, if the metadata value returned in the {@link PagedResults} has been modified, the modified version
     * will be supplied to this function instead of the origional {@link getHomePageSections}'s version.
     * This is useful for keeping track of which page a user is on, pagnating to other pages as ViewMore is called multiple times.
     */
    getViewMoreItems(homepageSectionId, metadata) { return Promise.resolve(null); }
    /**
     * (OPTIONAL METHOD) This function is to return the entire library of a manga website, page by page.
     * If there is an additional page which needs to be called, the {@link PagedResults} value should have it's metadata filled out
     * with information needed to continue pulling information from this website.
     * Note that if the metadata value of {@link PagedResults} is undefined, this method will not continue to run when the user
     * attempts to readonly morenformation
     * @param metadata Identifying information as to what the source needs to call in order to readonly theext batch of data
     * of the directory. Usually this is a page counter.
     */
    getWebsiteMangaDirectory(metadata) { return Promise.resolve(null); }
    // <-----------        PROTECTED METHODS        -----------> //
    // Many sites use '[x] time ago' - Figured it would be good to handle these cases in general
    convertTime(timeAgo) {
        var _a;
        let time;
        let trimmed = Number(((_a = /\d*/.exec(timeAgo)) !== null && _a !== void 0 ? _a : [])[0]);
        trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
        if (timeAgo.includes('minutes')) {
            time = new Date(Date.now() - trimmed * 60000);
        }
        else if (timeAgo.includes('hours')) {
            time = new Date(Date.now() - trimmed * 3600000);
        }
        else if (timeAgo.includes('days')) {
            time = new Date(Date.now() - trimmed * 86400000);
        }
        else if (timeAgo.includes('year') || timeAgo.includes('years')) {
            time = new Date(Date.now() - trimmed * 31556952000);
        }
        else {
            time = new Date(Date.now());
        }
        return time;
    }
}
exports.Source = Source;

},{}],4:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Source"), exports);
__exportStar(require("./Madara"), exports);

},{"./Madara":2,"./Source":3}],5:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./base"), exports);
__exportStar(require("./models"), exports);
__exportStar(require("./APIWrapper"), exports);

},{"./APIWrapper":1,"./base":4,"./models":25}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],7:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],8:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],9:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCode = void 0;
var LanguageCode;
(function (LanguageCode) {
    LanguageCode["UNKNOWN"] = "_unknown";
    LanguageCode["BENGALI"] = "bd";
    LanguageCode["BULGARIAN"] = "bg";
    LanguageCode["BRAZILIAN"] = "br";
    LanguageCode["CHINEESE"] = "cn";
    LanguageCode["CZECH"] = "cz";
    LanguageCode["GERMAN"] = "de";
    LanguageCode["DANISH"] = "dk";
    LanguageCode["ENGLISH"] = "gb";
    LanguageCode["SPANISH"] = "es";
    LanguageCode["FINNISH"] = "fi";
    LanguageCode["FRENCH"] = "fr";
    LanguageCode["WELSH"] = "gb";
    LanguageCode["GREEK"] = "gr";
    LanguageCode["CHINEESE_HONGKONG"] = "hk";
    LanguageCode["HUNGARIAN"] = "hu";
    LanguageCode["INDONESIAN"] = "id";
    LanguageCode["ISRELI"] = "il";
    LanguageCode["INDIAN"] = "in";
    LanguageCode["IRAN"] = "ir";
    LanguageCode["ITALIAN"] = "it";
    LanguageCode["JAPANESE"] = "jp";
    LanguageCode["KOREAN"] = "kr";
    LanguageCode["LITHUANIAN"] = "lt";
    LanguageCode["MONGOLIAN"] = "mn";
    LanguageCode["MEXIAN"] = "mx";
    LanguageCode["MALAY"] = "my";
    LanguageCode["DUTCH"] = "nl";
    LanguageCode["NORWEGIAN"] = "no";
    LanguageCode["PHILIPPINE"] = "ph";
    LanguageCode["POLISH"] = "pl";
    LanguageCode["PORTUGUESE"] = "pt";
    LanguageCode["ROMANIAN"] = "ro";
    LanguageCode["RUSSIAN"] = "ru";
    LanguageCode["SANSKRIT"] = "sa";
    LanguageCode["SAMI"] = "si";
    LanguageCode["THAI"] = "th";
    LanguageCode["TURKISH"] = "tr";
    LanguageCode["UKRAINIAN"] = "ua";
    LanguageCode["VIETNAMESE"] = "vn";
})(LanguageCode = exports.LanguageCode || (exports.LanguageCode = {}));

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],12:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],13:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],14:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],15:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],16:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],17:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],18:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],19:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],20:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],21:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagType = void 0;
/**
 * An enumerator which {@link SourceTags} uses to define the color of the tag rendered on the website.
 * Five types are available: blue, green, grey, yellow and red, the default one is blue.
 * Common colors are red for (Broken), yellow for (+18), grey for (Country-Proof)
 */
var TagType;
(function (TagType) {
    TagType["BLUE"] = "default";
    TagType["GREEN"] = "success";
    TagType["GREY"] = "info";
    TagType["YELLOW"] = "warning";
    TagType["RED"] = "danger";
})(TagType = exports.TagType || (exports.TagType = {}));

},{}],23:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],24:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],25:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Chapter"), exports);
__exportStar(require("./ChapterDetails"), exports);
__exportStar(require("./HomeSection"), exports);
__exportStar(require("./Manga"), exports);
__exportStar(require("./MangaTile"), exports);
__exportStar(require("./RequestObject"), exports);
__exportStar(require("./SearchRequest"), exports);
__exportStar(require("./TagSection"), exports);
__exportStar(require("./SourceTag"), exports);
__exportStar(require("./Languages"), exports);
__exportStar(require("./Constants"), exports);
__exportStar(require("./MangaUpdate"), exports);
__exportStar(require("./PagedResults"), exports);
__exportStar(require("./ResponseObject"), exports);
__exportStar(require("./RequestManager"), exports);
__exportStar(require("./RequestHeaders"), exports);
__exportStar(require("./SourceInfo"), exports);
__exportStar(require("./TrackObject"), exports);
__exportStar(require("./OAuth"), exports);

},{"./Chapter":6,"./ChapterDetails":7,"./Constants":8,"./HomeSection":9,"./Languages":10,"./Manga":11,"./MangaTile":12,"./MangaUpdate":13,"./OAuth":14,"./PagedResults":15,"./RequestHeaders":16,"./RequestManager":17,"./RequestObject":18,"./ResponseObject":19,"./SearchRequest":20,"./SourceInfo":21,"./SourceTag":22,"./TagSection":23,"./TrackObject":24}],26:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaPark = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
class MangaPark extends paperback_extensions_common_1.Source {
    constructor(cheerio) {
        super(cheerio);
        this.MP_DOMAIN = 'https://mangapark.net';
    }
    get version() { return '1.0.7'; }
    get name() { return 'MangaPark'; }
    get icon() { return 'icon.png'; }
    get author() { return 'Daniel Kovalevich'; }
    get authorWebsite() { return 'https://github.com/DanielKovalevich'; }
    get description() { return 'Archived MangaPark source. MangaPark requires a cloudflare client for connections.'; }
    get hentaiSource() { return false; }
    getMangaShareUrl(mangaId) { return `${this.MP_DOMAIN}/manga/${mangaId}`; }
    get websiteBaseURL() { return this.MP_DOMAIN; }
    getMangaDetails(mangaId) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            const detailsRequest = createRequestObject({
                url: `${this.MP_DOMAIN}/manga/${mangaId}`,
                cookies: [createCookie({ name: 'set', value: 'h=1', domain: this.MP_DOMAIN })],
                method: 'GET'
            });
            const data = yield this.requestManager.schedule(detailsRequest, 1);
            let $ = this.cheerio.load(data.data);
            let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
                createTagSection({ id: '1', label: 'format', tags: [] })];
            // let id: string = (($('head').html() ?? "").match((/(_manga_name\s*=\s)'([\S]+)'/)) ?? [])[2]
            let image = (_a = $('img', '.manga').attr('src')) !== null && _a !== void 0 ? _a : "";
            let rating = $('i', '#rating').text();
            let tableBody = $('tbody', '.manga');
            let titles = [];
            let title = $('.manga').find('a').first().text();
            titles.push(title.substring(0, title.lastIndexOf(' ')));
            let hentai = false;
            let author = "";
            let artist = "";
            let views = 0;
            let status = paperback_extensions_common_1.MangaStatus.ONGOING;
            for (let row of $('tr', tableBody).toArray()) {
                let elem = $('th', row).html();
                switch (elem) {
                    case 'Author(s)':
                        author = $('a', row).text();
                        break;
                    case 'Artist(s)':
                        artist = $('a', row).first().text();
                        break;
                    case 'Popularity': {
                        let pop = ((_b = /has (\d*(\.?\d*\w)?)/g.exec($('td', row).text())) !== null && _b !== void 0 ? _b : [])[1];
                        if (pop.includes('k')) {
                            pop = pop.replace('k', '');
                            views = Number(pop) * 1000;
                        }
                        else {
                            views = (_c = Number(pop)) !== null && _c !== void 0 ? _c : 0;
                        }
                        break;
                    }
                    case 'Alternative': {
                        let alts = $('td', row).text().split('  ');
                        for (let alt of alts) {
                            let trim = alt.trim().replace(/(;*\t*)/g, '');
                            if (trim != '')
                                titles.push(trim);
                        }
                        break;
                    }
                    case 'Genre(s)': {
                        for (let genre of $('a', row).toArray()) {
                            let item = (_d = $(genre).html()) !== null && _d !== void 0 ? _d : "";
                            let id = (_f = (_e = $(genre).attr('href')) === null || _e === void 0 ? void 0 : _e.split('/').pop()) !== null && _f !== void 0 ? _f : '';
                            let tag = item.replace(/<[a-zA-Z\/][^>]*>/g, "");
                            if (item.includes('Hentai')) {
                                hentai = true;
                            }
                            tagSections[0].tags.push(createTag({ id: id, label: tag }));
                        }
                        break;
                    }
                    case 'Status': {
                        let stat = $('td', row).text();
                        if (stat.includes('Ongoing'))
                            status = paperback_extensions_common_1.MangaStatus.ONGOING;
                        else if (stat.includes('Completed')) {
                            status = paperback_extensions_common_1.MangaStatus.COMPLETED;
                        }
                        break;
                    }
                    case 'Type': {
                        let type = $('td', row).text().split('-')[0].trim();
                        let id = '';
                        if (type.includes('Manga'))
                            id = 'manga';
                        else if (type.includes('Manhwa'))
                            id = 'manhwa';
                        else if (type.includes('Manhua'))
                            id = 'manhua';
                        else
                            id = 'unknown';
                        tagSections[1].tags.push(createTag({ id: id, label: type.trim() }));
                    }
                }
            }
            let summary = (_g = $('.summary').html()) !== null && _g !== void 0 ? _g : "";
            return createManga({
                id: mangaId,
                titles: titles,
                image: image.replace(/(https:)?\/\//gi, 'https://'),
                rating: Number(rating),
                status: status,
                artist: artist,
                author: author,
                tags: tagSections,
                views: views,
                desc: summary,
                hentai: hentai
            });
        });
    }
    getChapters(mangaId) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${this.MP_DOMAIN}/manga/${mangaId}`,
                method: "GET"
            });
            const data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let chapters = [];
            for (let elem of $('#list').children('div').toArray()) {
                // streamNum helps me navigate the weird id/class naming scheme
                let streamNum = ((_b = /(\d+)/g.exec((_a = $(elem).attr('id')) !== null && _a !== void 0 ? _a : "")) !== null && _b !== void 0 ? _b : [])[0];
                let groupName = $(`.ml-1.stream-text-${streamNum}`, elem).text();
                let volNum = 1;
                let chapNum = 1;
                let volumes = $('.volume', elem).toArray().reverse();
                for (let vol of volumes) {
                    let chapterElem = $('li', vol).toArray().reverse();
                    for (let chap of chapterElem) {
                        let chapId = (_c = $(chap).attr('id')) === null || _c === void 0 ? void 0 : _c.replace('b-', 'i');
                        let name;
                        let nameArr = ((_d = $('a', chap).html()) !== null && _d !== void 0 ? _d : "").replace(/(\t*\n*)/g, '').split(':');
                        name = nameArr.length > 1 ? nameArr[1].trim() : undefined;
                        let time = this.convertTime($('.time', chap).text().trim());
                        chapters.push(createChapter({
                            id: chapId !== null && chapId !== void 0 ? chapId : '',
                            mangaId: mangaId,
                            name: name,
                            chapNum: chapNum,
                            volume: volNum,
                            time: time,
                            group: groupName,
                            langCode: paperback_extensions_common_1.LanguageCode.ENGLISH
                        }));
                        chapNum++;
                    }
                    volNum++;
                }
            }
            return chapters;
        });
    }
    getChapterDetails(mangaId, chapterId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${this.MP_DOMAIN}/manga/${mangaId}/${chapterId}`,
                method: "GET",
                cookies: [createCookie({ name: 'set', value: 'h=1', domain: this.MP_DOMAIN })]
            });
            const data = yield this.requestManager.schedule(request, 1);
            let script = JSON.parse(((_a = /var _load_pages = (.*);/.exec(data.data)) !== null && _a !== void 0 ? _a : [])[1]);
            let pages = [];
            for (let page of script) {
                pages.push(page.u);
            }
            let chapterDetails = createChapterDetails({
                id: chapterId,
                mangaId: mangaId,
                pages: pages,
                longStrip: false
            });
            return chapterDetails;
        });
    }
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let shouldContinueScanning = true;
            let pageToScan = 1;
            while (shouldContinueScanning) {
                let returnObject = { ids: [] };
                let request = createRequestObject({
                    url: `${this.MP_DOMAIN}/latest/${pageToScan}`,
                    method: 'GET',
                    cookies: [createCookie({ name: 'set', value: 'h=1', domain: this.MP_DOMAIN })]
                });
                let data = yield this.requestManager.schedule(request, 1);
                pageToScan++;
                let $ = this.cheerio.load(data.data);
                for (let item of $('.item', '.ls1').toArray()) {
                    let id = (_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
                    let mangaTime = $('.time').first().text();
                    if (this.convertTime(mangaTime) > time) {
                        if (ids.includes(id)) {
                            returnObject.ids.push(id);
                        }
                    }
                    else {
                        mangaUpdatesFoundCallback(returnObject);
                        shouldContinueScanning = false;
                    }
                }
                mangaUpdatesFoundCallback(returnObject);
            }
        });
    }
    getHomePageSections(sectionCallback) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        return __awaiter(this, void 0, void 0, function* () {
            // Skeleton create the format of the homepage sections
            //TODO: View more? Does that work with this?
            let section1 = createHomeSection({ id: 'popular_titles', title: 'POPULAR MANGA' });
            let section2 = createHomeSection({ id: 'popular_new_titles', title: 'POPULAR MANGA UPDATES' });
            let section3 = createHomeSection({ id: 'recently_updated', title: 'RECENTLY UPDATED TITLES' });
            sectionCallback(section1);
            sectionCallback(section2);
            sectionCallback(section3);
            const request = createRequestObject({ url: `${this.MP_DOMAIN}`, method: 'GET' });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let popManga = [];
            let newManga = [];
            let updateManga = [];
            for (let item of $('li', '.top').toArray()) {
                let id = (_b = ((_a = $('.cover', item).attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
                let title = (_c = $('.cover', item).attr('title')) !== null && _c !== void 0 ? _c : '';
                let image = (_d = $('img', item).attr('src')) !== null && _d !== void 0 ? _d : '';
                let subtitle = (_e = $('.visited', item).text()) !== null && _e !== void 0 ? _e : '';
                let sIcon = 'clock.fill';
                let sText = $('i', item).text();
                popManga.push(createMangaTile({
                    id: id,
                    image: image.replace(/(https:)?\/\//gi, 'https://'),
                    title: createIconText({ text: title }),
                    subtitleText: createIconText({ text: subtitle }),
                    secondaryText: createIconText({ text: sText, icon: sIcon })
                }));
            }
            section1.items = popManga;
            sectionCallback(section1);
            for (let item of $('ul', '.mainer').toArray()) {
                for (let elem of $('li', item).toArray()) {
                    let id = (_g = ((_f = $('a', elem).first().attr('href')) !== null && _f !== void 0 ? _f : '').split('/').pop()) !== null && _g !== void 0 ? _g : '';
                    let title = (_h = $('img', elem).attr('alt')) !== null && _h !== void 0 ? _h : '';
                    let image = (_j = $('img', elem).attr('src')) !== null && _j !== void 0 ? _j : '';
                    let subtitle = (_k = $('.visited', elem).text()) !== null && _k !== void 0 ? _k : '';
                    newManga.push(createMangaTile({
                        id: id,
                        image: image.replace(/(https:)?\/\//gi, 'https://'),
                        title: createIconText({ text: title }),
                        subtitleText: createIconText({ text: subtitle })
                    }));
                }
            }
            section2.items = newManga;
            sectionCallback(section2);
            for (let item of $('.item', 'article').toArray()) {
                let id = (_m = ((_l = $('.cover', item).attr('href')) !== null && _l !== void 0 ? _l : '').split('/').pop()) !== null && _m !== void 0 ? _m : '';
                let title = (_o = $('.cover', item).attr('title')) !== null && _o !== void 0 ? _o : '';
                let image = (_p = $('img', item).attr('src')) !== null && _p !== void 0 ? _p : '';
                let subtitle = (_q = $('.visited', item).text()) !== null && _q !== void 0 ? _q : '';
                let sIcon = 'clock.fill';
                let sText = (_r = $('li.new', item).first().find('i').last().text()) !== null && _r !== void 0 ? _r : '';
                updateManga.push(createMangaTile({
                    id: id,
                    image: image.replace(/(https:)?\/\//gi, 'https://'),
                    title: createIconText({ text: title }),
                    subtitleText: createIconText({ text: subtitle }),
                    secondaryText: createIconText({ text: sText, icon: sIcon })
                }));
            }
            section3.items = updateManga;
            sectionCallback(section3);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        return __awaiter(this, void 0, void 0, function* () {
            if (!metadata.page) {
                metadata.page = 1;
            }
            let param = '';
            switch (homepageSectionId) {
                case 'popular_titles': {
                    param = `/genre/${metadata.page}`;
                    break;
                }
                case 'popular_new_titles': {
                    param = `/search?orderby=views&page=${metadata.page}`;
                    break;
                }
                case 'recently_updated': {
                    param = `/latest/${metadata.page}`;
                    break;
                }
                default: return Promise.resolve(null);
            }
            const request = createRequestObject({
                url: `${this.MP_DOMAIN}${param}`,
                method: 'GET'
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let manga = [];
            if (homepageSectionId == 'popular_titles') {
                for (let item of $('.item', '.row.mt-2.ls1').toArray()) {
                    let id = (_b = (_a = $('a', item).first().attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
                    let title = (_c = $('a', item).first().attr('title')) !== null && _c !== void 0 ? _c : '';
                    let image = (_d = $('img', item).attr('src')) !== null && _d !== void 0 ? _d : '';
                    let elems = $('small.ml-1', item);
                    let rating = $(elems[0]).text().trim();
                    let rank = $(elems[1]).text().split('-')[0].trim();
                    let chapters = $('span.small', item).text().trim();
                    manga.push(createMangaTile({
                        id: id,
                        image: image.replace(/(https:)?\/\//gi, 'https://'),
                        title: createIconText({ text: title }),
                        subtitleText: createIconText({ text: chapters }),
                        primaryText: createIconText({ text: rating, icon: 'star.fill' }),
                        secondaryText: createIconText({ text: rank, icon: 'chart.bar.fill' })
                    }));
                }
            }
            else if (homepageSectionId == 'popular_new_titles') {
                for (let item of $('.item', '.manga-list').toArray()) {
                    let id = (_f = (_e = $('.cover', item).attr('href')) === null || _e === void 0 ? void 0 : _e.split('/').pop()) !== null && _f !== void 0 ? _f : '';
                    let title = (_g = $('.cover', item).attr('title')) !== null && _g !== void 0 ? _g : '';
                    let image = (_h = $('img', item).attr('src')) !== null && _h !== void 0 ? _h : '';
                    let rank = $('[title=rank]', item).text().split('·')[1].trim();
                    let rating = $('.rate', item).text().trim();
                    let time = $('.justify-content-between', item).first().find('i').text();
                    manga.push(createMangaTile({
                        id: id,
                        image: image.replace(/(https:)?\/\//gi, 'https://'),
                        title: createIconText({ text: title }),
                        subtitleText: createIconText({ text: time }),
                        primaryText: createIconText({ text: rating, icon: 'star.fill' }),
                        secondaryText: createIconText({ text: rank, icon: 'chart.bar.fill' })
                    }));
                }
            }
            else if (homepageSectionId == 'recently_updated') {
                for (let item of $('.item', '.ls1').toArray()) {
                    let id = (_k = (_j = $('.cover', item).attr('href')) === null || _j === void 0 ? void 0 : _j.split('/').pop()) !== null && _k !== void 0 ? _k : '';
                    let title = (_l = $('.cover', item).attr('title')) !== null && _l !== void 0 ? _l : '';
                    let image = (_m = $('img', item).attr('src')) !== null && _m !== void 0 ? _m : '';
                    let chapter = $('.visited', item).first().text();
                    let time = $('.time', item).first().text();
                    manga.push(createMangaTile({
                        id: id,
                        image: image.replace(/(https:)?\/\//gi, 'https://'),
                        title: createIconText({ text: title }),
                        subtitleText: createIconText({ text: chapter }),
                        secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                    }));
                }
            }
            else
                return null;
            metadata.page++;
            return createPagedResults({
                results: manga,
                metadata: metadata
            });
        });
    }
    searchRequest(query, metadata) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function* () {
            let page;
            if (!metadata.page) {
                page = 1;
            }
            else {
                page = metadata.page;
            }
            // Put together the search query
            let genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).join(',');
            let excluded = ((_b = query.excludeGenre) !== null && _b !== void 0 ? _b : []).join(',');
            // will not let you search across more than one format
            let format = ((_c = query.includeFormat) !== null && _c !== void 0 ? _c : [])[0];
            let status = "";
            switch (query.status) {
                case 0:
                    status = 'completed';
                    break;
                case 1:
                    status = 'ongoing';
                    break;
                default: status = '';
            }
            let search = `q=${encodeURI((_d = query.title) !== null && _d !== void 0 ? _d : '')}&`;
            search += `autart=${encodeURI(query.author || query.artist || '')}&`;
            search += `&genres=${genres}&genres-exclude=${excluded}&page=1`;
            search += `&types=${format}&status=${status}&st-ss=1`;
            const request = createRequestObject({
                url: `${this.MP_DOMAIN}/search?${search}&page=${page}`,
                method: 'GET',
                metadata: metadata,
                cookies: [createCookie({ name: 'set', value: `h=${query.hStatus ? 1 : 0}`, domain: this.MP_DOMAIN })]
            });
            // Make the request
            const data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let mangaList = $('.manga-list');
            let manga = [];
            for (let item of $('.item', mangaList).toArray()) {
                let id = (_f = (_e = $('a', item).first().attr('href')) === null || _e === void 0 ? void 0 : _e.split('/').pop()) !== null && _f !== void 0 ? _f : '';
                let img = $('img', item);
                let image = (_g = $(img).attr('src')) !== null && _g !== void 0 ? _g : '';
                let title = (_h = $(img).attr('title')) !== null && _h !== void 0 ? _h : '';
                let rate = $('.rate', item);
                let rating = Number($(rate).find('i').text());
                let author = "";
                for (let field of $('.field', item).toArray()) {
                    let elem = $('b', field).first().text();
                    if (elem == 'Authors/Artists:') {
                        let authorCheerio = $('a', field).first();
                        author = $(authorCheerio).text();
                    }
                }
                let lastUpdate = $('ul', item).find('i').text();
                manga.push(createMangaTile({
                    id: id,
                    image: image.replace(/(https:)?\/\//gi, 'https://'),
                    title: createIconText({ text: title }),
                    subtitleText: createIconText({ text: author }),
                    primaryText: createIconText({ text: rating.toString(), icon: 'star.fill' }),
                    secondaryText: createIconText({ text: lastUpdate, icon: 'clock.fill' })
                }));
            }
            return createPagedResults({
                results: manga
            });
        });
    }
    getTags() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${this.MP_DOMAIN}/search?`,
                method: "GET",
                cookies: [createCookie({ name: 'set', value: 'h=1', domain: this.MP_DOMAIN })],
            });
            const data = yield this.requestManager.schedule(request, 1);
            let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
                createTagSection({ id: '1', label: 'format', tags: [] })];
            let $ = this.cheerio.load(data.data);
            for (let genre of $('span', '[name=genres]').toArray())
                tagSections[0].tags.push(createTag({ id: (_a = $(genre).attr('rel')) !== null && _a !== void 0 ? _a : '', label: $(genre).text() }));
            for (let type of $('span', '[name=types]').toArray())
                tagSections[1].tags.push(createTag({ id: (_b = $(type).attr('rel')) !== null && _b !== void 0 ? _b : '', label: $(type).text() }));
            return tagSections;
        });
    }
}
exports.MangaPark = MangaPark;

},{"paperback-extensions-common":5}]},{},[26])(26)
});
