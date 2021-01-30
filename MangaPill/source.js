(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{"./Source":2}],4:[function(require,module,exports){
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

},{"./APIWrapper":1,"./base":3,"./models":24}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],6:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],7:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],8:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],11:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],12:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],13:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],14:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],15:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],16:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],17:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],18:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],19:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],20:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],23:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],24:[function(require,module,exports){
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

},{"./Chapter":5,"./ChapterDetails":6,"./Constants":7,"./HomeSection":8,"./Languages":9,"./Manga":10,"./MangaTile":11,"./MangaUpdate":12,"./OAuth":13,"./PagedResults":14,"./RequestHeaders":15,"./RequestManager":16,"./RequestObject":17,"./ResponseObject":18,"./SearchRequest":19,"./SourceInfo":20,"./SourceTag":21,"./TagSection":22,"./TrackObject":23}],25:[function(require,module,exports){
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
exports.MangaPill = exports.MangaPillInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const Parser_1 = require("./Parser");
const MANGAPILL_DOMAIN = 'https://www.mangapill.com';
exports.MangaPillInfo = {
    version: '1.0.8',
    name: 'MangaPill',
    description: 'Extension that pulls manga from mangapill.com. It has a lot of officially translated manga but can sometimes miss manga notifications',
    author: 'GameFuzzy',
    authorWebsite: 'http://github.com/gamefuzzy',
    icon: "icon.png",
    hentaiSource: false,
    websiteBaseURL: MANGAPILL_DOMAIN,
    sourceTags: [
        {
            text: "Notifications",
            type: paperback_extensions_common_1.TagType.GREEN
        }
    ]
};
class MangaPill extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.parser = new Parser_1.Parser();
    }
    getMangaShareUrl(mangaId) {
        return `${MANGAPILL_DOMAIN}/manga/${mangaId}`;
    }
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MANGAPILL_DOMAIN}/manga/${mangaId}`,
                method: 'GET'
            });
            const data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            return this.parser.parseMangaDetails($, mangaId);
        });
    }
    getChapters(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let chapters = [];
            let pageRequest = createRequestObject({
                url: `${MANGAPILL_DOMAIN}/manga/${mangaId}`,
                method: "GET"
            });
            const pageData = yield this.requestManager.schedule(pageRequest, 1);
            let $ = this.cheerio.load(pageData.data);
            chapters = chapters.concat(this.parser.parseChapterList($, mangaId));
            return this.parser.sortChapters(chapters);
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MANGAPILL_DOMAIN}${chapterId}`,
                method: 'GET',
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let pages = this.parser.parseChapterDetails($);
            return createChapterDetails({
                id: chapterId,
                mangaId: mangaId,
                pages: pages,
                longStrip: false
            });
        });
    }
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MANGAPILL_DOMAIN}`,
                method: 'GET'
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let updatedManga = this.parser.filterUpdatedManga($, time, ids);
            if (updatedManga.updates.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.updates
                }));
            }
        });
    }
    searchRequest(query, metadata) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            let genres = '&genre=' + ((_b = query.includeGenre) !== null && _b !== void 0 ? _b : []).join('&genre=');
            let format = '&type=' + ((_c = query.includeFormat) !== null && _c !== void 0 ? _c : '');
            let status;
            switch (query.status) {
                case 0:
                    status = '&status=2';
                    break;
                case 1:
                    status = '&status=1';
                    break;
                default:
                    status = '';
            }
            let request = createRequestObject({
                url: `${MANGAPILL_DOMAIN}/search`,
                method: "GET",
                param: `?page=${page}&title=${encodeURIComponent((_d = query.title) !== null && _d !== void 0 ? _d : '')}${format}${status}${genres}`
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let manga = this.parser.parseSearchResults($);
            let mData;
            if (!this.parser.isLastPage($)) {
                mData = { page: (page + 1) };
            }
            else {
                mData = undefined; // There are no more pages to continue on to, do not provide page metadata
            }
            return createPagedResults({
                results: manga,
                metadata: mData
            });
        });
    }
    getTags() {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${MANGAPILL_DOMAIN}/search`,
                method: 'GET'
            });
            const data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            return this.parser.parseTags($);
        });
    }
    getHomePageSections(sectionCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            // Add featured section back in whenever a section type for that comes around
            const sections = [
                {
                    request: createRequestObject({
                        url: `${MANGAPILL_DOMAIN}`,
                        method: 'GET'
                    }),
                    section: createHomeSection({
                        id: '1',
                        title: 'RECENTLY UPDATED MANGA',
                        view_more: true,
                    }),
                },
                {
                    request: createRequestObject({
                        url: `${MANGAPILL_DOMAIN}/search?title=&type=&status=1`,
                        method: 'GET'
                    }),
                    section: createHomeSection({
                        id: '2',
                        title: 'POPULAR MANGA',
                        view_more: true
                    }),
                },
            ];
            const promises = [];
            for (const section of sections) {
                // Let the app load empty sections
                sectionCallback(section.section);
                // Get the section data
                promises.push(this.requestManager.schedule(section.request, 1).then(response => {
                    const $ = this.cheerio.load(response.data);
                    section.section.items = section.section.id === '1' ? this.parser.parseRecentUpdatesSection($) : this.parser.parsePopularSection($);
                    sectionCallback(section.section);
                }));
            }
            // Make sure the function completes
            yield Promise.all(promises);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            let manga;
            let mData = undefined;
            switch (homepageSectionId) {
                case '1': {
                    let request = createRequestObject({
                        url: `${MANGAPILL_DOMAIN}`,
                        method: 'GET'
                    });
                    let data = yield this.requestManager.schedule(request, 1);
                    let $ = this.cheerio.load(data.data);
                    manga = this.parser.parseRecentUpdatesSection($);
                    break;
                }
                case '2': {
                    let request = createRequestObject({
                        url: `${MANGAPILL_DOMAIN}/search?title=&type=&status=1&page=${page}`,
                        method: 'GET'
                    });
                    let data = yield this.requestManager.schedule(request, 1);
                    let $ = this.cheerio.load(data.data);
                    manga = this.parser.parsePopularSection($);
                    if (!this.parser.isLastPage($)) {
                        mData = { page: (page + 1) };
                    }
                    break;
                }
                default:
                    return Promise.resolve(null);
            }
            return createPagedResults({
                results: manga,
                metadata: mData
            });
        });
    }
    cloudflareBypassRequest() {
        return createRequestObject({
            url: `${MANGAPILL_DOMAIN}`,
            method: 'GET',
        });
    }
}
exports.MangaPill = MangaPill;

},{"./Parser":26,"paperback-extensions-common":4}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
class Parser {
    parseMangaDetails($, mangaId) {
        var _a, _b, _c;
        let titles = [$('.font-bold.text-xl').text().trim()];
        let descBox = $('.flex.flex-col');
        let altTitle = $('.text-color-text-secondary', $('div:nth-child(1)', descBox)).last().text().trim();
        if (altTitle != 'Title') {
            titles.push(altTitle);
        }
        let image = $('.lazy').attr('src');
        let summary = $('p', $('.my-3', descBox)).text().trim();
        let status = paperback_extensions_common_1.MangaStatus.ONGOING, released, rating = 0;
        let tagArray0 = [];
        let tagArray1 = [];
        for (let obj of $('a[href*=genre]').toArray()) {
            let id = (_a = $(obj).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`/search?genre=`, '').trim();
            let label = $(obj).text().trim();
            if (typeof id === 'undefined' || typeof label === 'undefined')
                continue;
            tagArray0 = [...tagArray0, createTag({ id: id, label: $(obj).text().trim() })];
        }
        let i = 0;
        for (let item of $('div', $('.grid.gap-2')).toArray()) {
            let descObj = $('div', $(item));
            if (!descObj.html()) {
                continue;
            }
            switch (i) {
                case 0: {
                    // Manga Type
                    tagArray1 = [...tagArray1, createTag({
                            id: descObj.text().trim(),
                            label: descObj.text().trim().replace(/^\w/, (c) => c.toUpperCase())
                        })];
                    i++;
                    continue;
                }
                case 1: {
                    // Manga Status
                    if (descObj.text().trim().toLowerCase().includes("publishing")) {
                        status = paperback_extensions_common_1.MangaStatus.ONGOING;
                    }
                    else {
                        status = paperback_extensions_common_1.MangaStatus.COMPLETED;
                    }
                    i++;
                    continue;
                }
                case 2: {
                    // Date of release
                    released = (_b = descObj.text().trim()) !== null && _b !== void 0 ? _b : undefined;
                    i++;
                    continue;
                }
                case 3: {
                    // Rating
                    rating = (_c = Number(descObj.text().trim().replace(' / 10', ''))) !== null && _c !== void 0 ? _c : undefined;
                    i++;
                    continue;
                }
            }
            i = 0;
        }
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: tagArray0 }),
            createTagSection({ id: '1', label: 'format', tags: tagArray1 })];
        return createManga({
            id: mangaId,
            rating: rating,
            titles: titles,
            image: image !== null && image !== void 0 ? image : '',
            status: status,
            tags: tagSections,
            desc: summary,
            lastUpdate: released
        });
    }
    parseChapterList($, mangaId) {
        var _a, _b;
        let chapters = [];
        for (let obj of $('option', $('select[name=view-chapter]')).toArray()) {
            let chapterId = $(obj).attr('value');
            if (chapterId == 'Read Chapters') {
                continue;
            }
            let chapNum = (_a = $(obj).text().trim()) === null || _a === void 0 ? void 0 : _a.replace(`Chapter `, '');
            // NaN check
            let chapName = $(obj).text();
            if (isNaN(Number(chapNum))) {
                chapNum = `${(_b = chapNum.replace(/^\D+/, '')) !== null && _b !== void 0 ? _b : '0'}`.split(/^\D+/)[0];
                if (isNaN(Number(chapNum))) {
                    chapNum = '0';
                }
            }
            if (typeof chapterId === 'undefined')
                continue;
            chapters.push(createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: Number(chapNum),
                langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                name: chapName
            }));
        }
        return chapters;
    }
    sortChapters(chapters) {
        let sortedChapters = [];
        chapters.forEach((c) => {
            var _a;
            if (((_a = sortedChapters[sortedChapters.indexOf(c)]) === null || _a === void 0 ? void 0 : _a.id) !== (c === null || c === void 0 ? void 0 : c.id)) {
                sortedChapters.push(c);
            }
        });
        sortedChapters.sort((a, b) => (a.id > b.id) ? 1 : -1);
        return sortedChapters;
    }
    parseChapterDetails($) {
        let pages = [];
        // Get all of the pages
        for (let obj of $('img', $('picture')).toArray()) {
            let page = $(obj).attr('data-src');
            if (typeof page === 'undefined')
                continue;
            pages.push(page);
        }
        return pages;
    }
    filterUpdatedManga($, time, ids) {
        var _a, _b;
        let foundIds = [];
        let passedReferenceTime = false;
        for (let item of $('.font-medium.text-color-text-primary').toArray()) {
            let href = ((_a = $(item).attr('href')) !== null && _a !== void 0 ? _a : '');
            let id = href.split('-')[0].split('/').pop() + '/' + ((_b = href.split('/').pop()) === null || _b === void 0 ? void 0 : _b.split('-chapter')[0].trim());
            let mangaTime = new Date(time);
            passedReferenceTime = mangaTime <= time;
            if (!passedReferenceTime) {
                if (ids.includes(id)) {
                    foundIds.push(id);
                }
            }
            else
                break;
        }
        if (!passedReferenceTime) {
            return { updates: foundIds, loadNextPage: true };
        }
        else {
            return { updates: foundIds, loadNextPage: false };
        }
    }
    parseSearchResults($) {
        var _a;
        let mangaTiles = [];
        let collectedIds = [];
        for (let obj of $('div', $('.grid.gap-3')).toArray()) {
            let id = (_a = $('a', $(obj)).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`/manga/`, '');
            let encodedTitleText = $('a', $('div', $(obj))).text();
            // Decode title
            let titleText = encodedTitleText.replace(/&#(\d+);/g, function (match, dec) {
                return String.fromCharCode(dec);
            });
            let image = $('img', $('a', $(obj))).attr('data-src');
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: titleText }),
                    image: image
                }));
                collectedIds.push(id);
            }
        }
        return mangaTiles;
    }
    parseTags($) {
        var _a;
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
            createTagSection({ id: '1', label: 'format', tags: [] })];
        for (let obj of $('Label', $('.gap-2')).toArray()) {
            let genre = $(obj).text().trim();
            let id = (_a = $('input', $(obj)).attr('value')) !== null && _a !== void 0 ? _a : genre;
            tagSections[0].tags.push(createTag({ id: id, label: genre }));
        }
        tagSections[1].tags.push(createTag({ id: 'manga', label: 'Manga' }));
        return tagSections;
    }
    parsePopularSection($) {
        var _a;
        let mangaTiles = [];
        let collectedIds = [];
        for (let obj of $('div', $('.grid.gap-3')).toArray()) {
            let id = (_a = $('a', $(obj)).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`/manga/`, '');
            let encodedTitleText = $('a', $('div', $(obj))).text();
            // Decode title
            let titleText = encodedTitleText.replace(/&#(\d+);/g, function (match, dec) {
                return String.fromCharCode(dec);
            });
            let image = $('img', $('a', $(obj))).attr('data-src');
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: titleText }),
                    image: image
                }));
                collectedIds.push(id);
            }
        }
        return mangaTiles;
    }
    // Add featured section back in whenever a section type for that comes around
    /*
    parseFeaturedSection($ : CheerioSelector): MangaTile[]{
      let mangaTiles: MangaTile[] = []
      for(let obj of $('div[class=relative]').toArray()) {
        let href = ($('a', $(obj)).attr('href') ?? '')
        let id = href.split('-')[0].split('/').pop() + '/' + href.split('/').pop()?.split('-chapter')[0].trim()
        let encodedTitleText = $('.text-sm', $('.text-color-text-fire-ch', $('div', $(obj)))).text()
        
         // Decode title
         let titleText = encodedTitleText.replace(/&#(\d+);/g, function(match, dec) {
           return String.fromCharCode(dec);
         })

        let image = $('img', $('div', $(obj))).attr('data-src')

        let collectedIds: string[] = []
        if (typeof id === 'undefined' || typeof image === 'undefined') continue
        if(!collectedIds.includes(id)) {
          mangaTiles.push(createMangaTile({
            id: id,
            title: createIconText({text: titleText}),
            image: image
        }))
        collectedIds.push(id)
        }
      }
      return mangaTiles
    }
    */
    parseRecentUpdatesSection($) {
        var _a, _b;
        let mangaTiles = [];
        let collectedIds = [];
        for (let obj of $('.mb-2.rounded.border').toArray()) {
            let href = ((_a = $('a', $(obj)).attr('href')) !== null && _a !== void 0 ? _a : '');
            let id = href.split('-')[0].split('/').pop() + '/' + ((_b = href.split('/').pop()) === null || _b === void 0 ? void 0 : _b.split('-chapter')[0].trim());
            let encodedTitleText = $('a', $('.mb-2', $('.p-3', $(obj)))).text().split(' Chapter')[0];
            // Decode title
            let titleText = encodedTitleText.replace(/&#(\d+);/g, function (match, dec) {
                return String.fromCharCode(dec);
            });
            let image = $('img', $('a', $(obj))).attr('data-src');
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: titleText }),
                    image: image
                }));
                collectedIds.push(id);
            }
        }
        return mangaTiles;
    }
    isLastPage($) {
        return $('a:contains("Next")').length < 1;
    }
}
exports.Parser = Parser;

},{"paperback-extensions-common":4}]},{},[25])(25)
});
