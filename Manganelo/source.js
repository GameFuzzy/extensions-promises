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
exports.Manganelo = exports.ManganeloInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const ManganeloParser_1 = require("./ManganeloParser");
const MN_DOMAIN = 'https://manganelo.com';
const method = 'GET';
const headers = {
    "content-type": "application/x-www-form-urlencoded"
};
exports.ManganeloInfo = {
    version: '2.1.0',
    name: 'Manganelo',
    icon: 'icon.png',
    author: 'Daniel Kovalevich',
    authorWebsite: 'https://github.com/DanielKovalevich',
    description: 'Extension that pulls manga from Manganelo, includes Advanced Search and Updated manga fetching',
    hentaiSource: false,
    websiteBaseURL: MN_DOMAIN,
    sourceTags: [
        {
            text: "Notifications",
            type: paperback_extensions_common_1.TagType.GREEN
        }
    ]
};
class Manganelo extends paperback_extensions_common_1.Source {
    getMangaShareUrl(mangaId) { return `${MN_DOMAIN}/manga/${mangaId}`; }
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${MN_DOMAIN}/manga/`,
                method,
                param: mangaId
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return ManganeloParser_1.parseMangaDetails($, mangaId);
        });
    }
    getChapters(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${MN_DOMAIN}/manga/`,
                method,
                param: mangaId
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return ManganeloParser_1.parseChapters($, mangaId);
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${MN_DOMAIN}/chapter/`,
                method,
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    Cookie: 'content_lazyload=off'
                },
                param: `${mangaId}/${chapterId}`
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return ManganeloParser_1.parseChapterDetails($, mangaId, chapterId);
        });
    }
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        return __awaiter(this, void 0, void 0, function* () {
            let page = 1;
            let updatedManga = {
                ids: [],
                loadMore: true
            };
            while (updatedManga.loadMore) {
                const request = createRequestObject({
                    url: `${MN_DOMAIN}/genre-all/`,
                    method,
                    headers,
                    param: String(page++)
                });
                const response = yield this.requestManager.schedule(request, 1);
                const $ = this.cheerio.load(response.data);
                updatedManga = ManganeloParser_1.parseUpdatedManga($, time, ids);
                if (updatedManga.ids.length > 0) {
                    mangaUpdatesFoundCallback(createMangaUpdates({
                        ids: updatedManga.ids
                    }));
                }
            }
        });
    }
    getHomePageSections(sectionCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            // Give Paperback a skeleton of what these home sections should look like to pre-render them
            const section1 = createHomeSection({ id: 'top_week', title: 'TOP OF THE WEEK' });
            const section2 = createHomeSection({ id: 'latest_updates', title: 'LATEST UPDATES', view_more: true });
            const section3 = createHomeSection({ id: 'new_manga', title: 'NEW MANGA', view_more: true });
            const sections = [section1, section2, section3];
            // Fill the homsections with data
            const request = createRequestObject({
                url: MN_DOMAIN,
                method,
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            ManganeloParser_1.parseHomeSections($, sections, sectionCallback);
        });
    }
    searchRequest(query, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            const search = ManganeloParser_1.generateSearch(query);
            const request = createRequestObject({
                url: `${MN_DOMAIN}/advanced_search?`,
                method,
                headers,
                param: `${search}${'&page=' + page}`
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const manga = ManganeloParser_1.parseSearch($);
            metadata = !ManganeloParser_1.isLastPage($) ? { page: page + 1 } : undefined;
            return createPagedResults({
                results: manga,
                metadata
            });
        });
    }
    getTags() {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${MN_DOMAIN}/advanced_search?`,
                method,
                headers,
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return ManganeloParser_1.parseTags($);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            let param = '';
            if (homepageSectionId === 'latest_updates')
                param = `/genre-all/${page}`;
            else if (homepageSectionId === 'new_manga')
                param = `/genre-all/${page}?type=newest`;
            else
                return Promise.resolve(null);
            const request = createRequestObject({
                url: `${MN_DOMAIN}`,
                method,
                param: param,
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const manga = ManganeloParser_1.parseViewMore($);
            metadata = !ManganeloParser_1.isLastPage($) ? { page: page + 1 } : undefined;
            return createPagedResults({
                results: manga,
                metadata
            });
        });
    }
    globalRequestHeaders() {
        return {
            referer: MN_DOMAIN
        };
    }
}
exports.Manganelo = Manganelo;

},{"./ManganeloParser":27,"paperback-extensions-common":5}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLastPage = exports.parseViewMore = exports.parseTags = exports.parseSearch = exports.generateSearch = exports.parseHomeSections = exports.parseUpdatedManga = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
exports.parseMangaDetails = ($, mangaId) => {
    var _a, _b, _c, _d, _e;
    const panel = $('.panel-story-info');
    const title = (_a = $('.img-loading', panel).attr('title')) !== null && _a !== void 0 ? _a : '';
    const image = (_b = $('.img-loading', panel).attr('src')) !== null && _b !== void 0 ? _b : '';
    let table = $('.variations-tableInfo', panel);
    let author = '';
    let artist = '';
    let rating = 0;
    let status = paperback_extensions_common_1.MangaStatus.ONGOING;
    let titles = [title];
    let follows = 0;
    let views = 0;
    let lastUpdate = '';
    let hentai = false;
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] })];
    for (const row of $('tr', table).toArray()) {
        if ($(row).find('.info-alternative').length > 0) {
            const alts = $('h2', table).text().split(/,|;/);
            for (const alt of alts) {
                titles.push(alt.trim());
            }
        }
        else if ($(row).find('.info-author').length > 0) {
            const autart = $('.table-value', row).find('a').toArray();
            author = $(autart[0]).text();
            if (autart.length > 1) {
                artist = $(autart[1]).text();
            }
        }
        else if ($(row).find('.info-status').length > 0) {
            status = $('.table-value', row).text() == 'Ongoing' ? paperback_extensions_common_1.MangaStatus.ONGOING : paperback_extensions_common_1.MangaStatus.COMPLETED;
        }
        else if ($(row).find('.info-genres').length > 0) {
            const elems = $('.table-value', row).find('a').toArray();
            for (const elem of elems) {
                const text = $(elem).text();
                const id = (_e = (_d = (_c = $(elem).attr('href')) === null || _c === void 0 ? void 0 : _c.split('/').pop()) === null || _d === void 0 ? void 0 : _d.split('-').pop()) !== null && _e !== void 0 ? _e : '';
                if (text.toLowerCase().includes('smut')) {
                    hentai = true;
                }
                tagSections[0].tags.push(createTag({ id: id, label: text }));
            }
        }
    }
    table = $('.story-info-right-extent', panel);
    for (const row of $('p', table).toArray()) {
        if ($(row).find('.info-time').length > 0) {
            const time = new Date($('.stre-value', row).text().replace(/(-*(AM)*(PM)*)/g, ''));
            lastUpdate = time.toDateString();
        }
        else if ($(row).find('.info-view').length > 0) {
            views = Number($('.stre-value', row).text().replace(/,/g, ''));
        }
    }
    rating = Number($('[property=v\\:average]', table).text());
    follows = Number($('[property=v\\:votes]', table).text());
    const summary = $('.panel-story-info-description', panel).text();
    return createManga({
        id: mangaId,
        titles,
        image,
        rating: Number(rating),
        status,
        artist,
        author,
        tags: tagSections,
        views,
        follows,
        lastUpdate,
        desc: summary,
        hentai
    });
};
exports.parseChapters = ($, mangaId) => {
    var _a, _b, _c, _d, _e, _f;
    const allChapters = $('.row-content-chapter', '.body-site');
    const chapters = [];
    for (let chapter of $('li', allChapters).toArray()) {
        const id = (_b = (_a = $('a', chapter).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
        const name = (_c = $('a', chapter).text()) !== null && _c !== void 0 ? _c : '';
        const chapNum = Number((_e = (_d = /Chapter ([0-9]\d*(\.\d+)?)/g.exec(name)) === null || _d === void 0 ? void 0 : _d[1]) !== null && _e !== void 0 ? _e : '');
        const time = new Date((_f = $('.chapter-time', chapter).attr('title')) !== null && _f !== void 0 ? _f : '');
        chapters.push(createChapter({
            id,
            mangaId,
            name,
            langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
            chapNum,
            time
        }));
    }
    return chapters;
};
exports.parseChapterDetails = ($, mangaId, chapterId) => {
    var _a;
    const pages = [];
    for (let item of $('img', '.container-chapter-reader').toArray()) {
        pages.push((_a = $(item).attr('src')) !== null && _a !== void 0 ? _a : '');
    }
    return createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages,
        longStrip: false
    });
};
exports.parseUpdatedManga = ($, time, ids) => {
    var _a, _b;
    const foundIds = [];
    let passedReferenceTime = false;
    const panel = $('.panel-content-genres');
    for (const item of $('.content-genres-item', panel).toArray()) {
        const id = (_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
        let mangaTime = new Date($('.genres-item-time').first().text());
        // site has a quirk where if the manga what updated in the last hour
        // it will put the update time as tomorrow
        if (mangaTime > new Date(Date.now())) {
            mangaTime = new Date(Date.now() - 60000);
        }
        passedReferenceTime = mangaTime <= time;
        if (!passedReferenceTime) {
            if (ids.includes(id)) {
                foundIds.push(id);
            }
        }
        else
            break;
    }
    return {
        ids: foundIds,
        loadMore: !passedReferenceTime
    };
};
exports.parseHomeSections = ($, sections, sectionCallback) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    for (const section of sections)
        sectionCallback(section);
    const topManga = [];
    const updateManga = [];
    const newManga = [];
    for (const item of $('.item', '.owl-carousel').toArray()) {
        const id = (_b = (_a = $('a', item).first().attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
        const image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
        topManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: $('a', item).first().text() }),
            subtitleText: createIconText({ text: $('[rel=nofollow]', item).text() })
        }));
    }
    for (const item of $('.content-homepage-item', '.panel-content-homepage').toArray()) {
        const id = (_e = (_d = $('a', item).first().attr('href')) === null || _d === void 0 ? void 0 : _d.split('/').pop()) !== null && _e !== void 0 ? _e : '';
        const image = (_f = $('img', item).attr('src')) !== null && _f !== void 0 ? _f : '';
        const itemRight = $('.content-homepage-item-right', item);
        const latestUpdate = $('.item-chapter', itemRight).first();
        updateManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: $('a', itemRight).first().text() }),
            subtitleText: createIconText({ text: $('.item-author', itemRight).text() }),
            primaryText: createIconText({ text: $('.genres-item-rate', item).text(), icon: 'star.fill' }),
            secondaryText: createIconText({ text: $('i', latestUpdate).text(), icon: 'clock.fill' })
        }));
    }
    for (const item of $('a', '.panel-newest-content').toArray()) {
        const id = (_h = (_g = $(item).attr('href')) === null || _g === void 0 ? void 0 : _g.split('/').pop()) !== null && _h !== void 0 ? _h : '';
        const image = (_j = $('img', item).attr('src')) !== null && _j !== void 0 ? _j : '';
        const title = (_k = $('img', item).attr('alt')) !== null && _k !== void 0 ? _k : '';
        newManga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title })
        }));
    }
    sections[0].items = topManga;
    sections[1].items = updateManga;
    sections[2].items = newManga;
    // Perform the callbacks again now that the home page sections are filled with data
    for (const section of sections)
        sectionCallback(section);
};
exports.generateSearch = (query) => {
    var _a, _b, _c, _d, _e, _f;
    // Format the search query into a proper request
    const genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).concat((_b = query.includeDemographic) !== null && _b !== void 0 ? _b : []).join('_');
    const excluded = ((_c = query.excludeGenre) !== null && _c !== void 0 ? _c : []).concat((_d = query.excludeDemographic) !== null && _d !== void 0 ? _d : []).join('_');
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
    let keyword = ((_e = query.title) !== null && _e !== void 0 ? _e : '').replace(/ /g, '_');
    if (query.author)
        keyword += ((_f = query.author) !== null && _f !== void 0 ? _f : '').replace(/ /g, '_');
    let search = `s=all&keyw=${keyword}`;
    search += `&g_i=${genres}&g_e=${excluded}`;
    if (status) {
        search += `&sts=${status}`;
    }
    return search;
};
exports.parseSearch = ($) => {
    var _a, _b, _c;
    const panel = $('.panel-content-genres');
    const items = $('.content-genres-item', panel).toArray();
    const manga = [];
    for (const item of items) {
        const id = (_b = (_a = $('.genres-item-name', item).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
        const title = $('.genres-item-name', item).text();
        const subTitle = $('.genres-item-chap', item).text();
        const image = (_c = $('.img-loading', item).attr('src')) !== null && _c !== void 0 ? _c : '';
        const rating = $('.genres-item-rate', item).text();
        const updated = $('.genres-item-time', item).text();
        manga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subTitle }),
            primaryText: createIconText({ text: rating, icon: 'star.fill' }),
            secondaryText: createIconText({ text: updated, icon: 'clock.fill' })
        }));
    }
    return manga;
};
exports.parseTags = ($) => {
    var _a;
    const panel = $('.advanced-search-tool-genres-list');
    const genres = createTagSection({
        id: 'genre',
        label: 'Genre',
        tags: []
    });
    for (let item of $('span', panel).toArray()) {
        let id = (_a = $(item).attr('data-i')) !== null && _a !== void 0 ? _a : '';
        let label = $(item).text();
        genres.tags.push(createTag({ id: id, label: label }));
    }
    return [genres];
};
exports.parseViewMore = ($) => {
    var _a, _b, _c;
    const manga = [];
    const panel = $('.panel-content-genres');
    for (const item of $('.content-genres-item', panel).toArray()) {
        const id = (_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
        const image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
        const title = $('.genres-item-name', item).text();
        const subtitle = $('.genres-item-chap', item).text();
        let time = new Date($('.genres-item-time').first().text());
        if (time > new Date(Date.now())) {
            time = new Date(Date.now() - 60000);
        }
        const rating = $('.genres-item-rate', item).text();
        manga.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
            primaryText: createIconText({ text: rating, icon: 'star.fill' }),
            secondaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' })
        }));
    }
    return manga;
};
exports.isLastPage = ($) => {
    var _a;
    let current = $('.page-select').text();
    let total = $('.page-last').text();
    if (current) {
        total = ((_a = /(\d+)/g.exec(total)) !== null && _a !== void 0 ? _a : [''])[0];
        return (+total) === (+current);
    }
    return true;
};

},{"paperback-extensions-common":5}]},{},[26])(26)
});
