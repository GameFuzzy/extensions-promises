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
exports.BatoTo = exports.ComicExtraInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const Parser_1 = require("./Parser");
const BATOTO_DOMAIN = 'https://bato.to';
exports.ComicExtraInfo = {
    version: '1.0.0',
    name: 'Bato.To',
    description: 'Extension that pulls western comics from Bato.To',
    author: 'GameFuzzy',
    authorWebsite: 'http://github.com/gamefuzzy',
    icon: "icon.png",
    hentaiSource: false,
    websiteBaseURL: BATOTO_DOMAIN,
    sourceTags: [
        {
            text: "Notifications",
            type: paperback_extensions_common_1.TagType.GREEN
        }
    ]
};
class BatoTo extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.parser = new Parser_1.Parser();
    }
    getMangaShareUrl(mangaId) { return `${BATOTO_DOMAIN}/series/${mangaId}`; }
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${BATOTO_DOMAIN}/series/${mangaId}`,
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
                url: `${BATOTO_DOMAIN}/series/${mangaId}`,
                method: "GET"
            });
            const pageData = yield this.requestManager.schedule(pageRequest, 1);
            let $ = this.cheerio.load(pageData.data);
            chapters = chapters.concat(this.parser.parseChapterList($, mangaId, this));
            return this.parser.sortChapters(chapters);
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${BATOTO_DOMAIN}/chapter/${chapterId}`,
                method: 'GET',
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data, { xmlMode: false });
            let pages = yield this.parser.parseChapterDetails($, this.cryptoJS);
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
            let loadNextPage = true;
            let currPageNum = 1;
            while (loadNextPage) {
                let request = createRequestObject({
                    url: `${BATOTO_DOMAIN}/browse/?sort=update&page=${String(currPageNum)}`,
                    method: 'GET'
                });
                let data = yield this.requestManager.schedule(request, 1);
                let $ = this.cheerio.load(data.data);
                let updatedManga = this.parser.filterUpdatedManga($, time, ids, this);
                loadNextPage = updatedManga.loadNextPage;
                if (loadNextPage) {
                    currPageNum++;
                }
                if (updatedManga.updates.length > 0) {
                    mangaUpdatesFoundCallback(createMangaUpdates({
                        ids: updatedManga.updates
                    }));
                }
            }
        });
    }
    searchRequest(query, metadata) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            let request = createRequestObject({
                url: `${BATOTO_DOMAIN}/search`,
                method: "GET",
                param: `?word=${(_b = query.title) === null || _b === void 0 ? void 0 : _b.replaceAll(' ', '+')}&page=${page}`
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let manga = this.parser.parseSearchResults($, this);
            let mData = undefined;
            if (!this.parser.isLastPage($)) {
                mData = { page: (page + 1) };
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
                url: `${BATOTO_DOMAIN}/comic-genres/`,
                method: 'GET'
            });
            const data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            return this.parser.parseTags($);
        });
    }
    getHomePageSections(sectionCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            // Let the app know what the homesections are without filling in the data
            let popularSection = createHomeSection({ id: '2', title: 'POPULAR', view_more: true });
            let recentSection = createHomeSection({ id: '1', title: 'RECENTLY UPDATED', view_more: true });
            let newTitlesSection = createHomeSection({ id: '0', title: 'RECENTLY ADDED', view_more: true });
            sectionCallback(popularSection);
            sectionCallback(recentSection);
            sectionCallback(newTitlesSection);
            // Make the request and fill out available titles
            let request = createRequestObject({
                url: `${BATOTO_DOMAIN}?sort=views_a`,
                method: 'GET'
            });
            const popularData = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(popularData.data);
            popularSection.items = this.parser.parseHomePageSection($, this);
            sectionCallback(popularSection);
            request = createRequestObject({
                url: `${BATOTO_DOMAIN}?sort=update`,
                method: 'GET'
            });
            const recentData = yield this.requestManager.schedule(request, 1);
            $ = this.cheerio.load(recentData.data);
            recentSection.items = this.parser.parseHomePageSection($, this);
            sectionCallback(recentSection);
            request = createRequestObject({
                url: `${BATOTO_DOMAIN}?sort=create`,
                method: 'GET'
            });
            const newData = yield this.requestManager.schedule(request, 1);
            $ = this.cheerio.load(newData.data);
            newTitlesSection.items = this.parser.parseHomePageSection($, this);
            sectionCallback(newTitlesSection);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let webPage = '';
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            switch (homepageSectionId) {
                case '0': {
                    webPage = `?sort=views_a&page=${page}`;
                    break;
                }
                case '1': {
                    webPage = `?sort=update&page=${page}`;
                    break;
                }
                case '2': {
                    webPage = `?sort=create&page=${page}`;
                    break;
                }
                default: return Promise.resolve(null);
            }
            let request = createRequestObject({
                url: `${BATOTO_DOMAIN}${webPage}`,
                method: 'GET'
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let manga = this.parser.parseHomePageSection($, this);
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
    convertTime(timeAgo) {
        var _a;
        let time;
        let trimmed = Number(((_a = /\d*/.exec(timeAgo)) !== null && _a !== void 0 ? _a : [])[0]);
        trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
        if (timeAgo.includes('sec') || timeAgo.includes('secs')) {
            time = new Date(Date.now() - trimmed * 1000);
        }
        if (timeAgo.includes('min') || timeAgo.includes('mins')) {
            time = new Date(Date.now() - trimmed * 60000);
        }
        else if (timeAgo.includes('hour') || timeAgo.includes('hours')) {
            time = new Date(Date.now() - trimmed * 3600000);
        }
        else if (timeAgo.includes('day') || timeAgo.includes('days')) {
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
    cloudflareBypassRequest() {
        return createRequestObject({
            url: `${BATOTO_DOMAIN}`,
            method: 'GET',
        });
    }
    cryptoJS() {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js`,
                method: 'GET'
            });
            const data = yield this.requestManager.schedule(request, 1);
            return this.cheerio.load(data.data)('body').html();
        });
    }
}
exports.BatoTo = BatoTo;

},{"./Parser":27,"paperback-extensions-common":4}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseLangCode = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
exports.reverseLangCode = {
    '_unknown': paperback_extensions_common_1.LanguageCode.UNKNOWN,
    'bd': paperback_extensions_common_1.LanguageCode.BENGALI,
    'bg': paperback_extensions_common_1.LanguageCode.BULGARIAN,
    'br': paperback_extensions_common_1.LanguageCode.BRAZILIAN,
    'cn': paperback_extensions_common_1.LanguageCode.CHINEESE,
    'cz': paperback_extensions_common_1.LanguageCode.CZECH,
    'de': paperback_extensions_common_1.LanguageCode.GERMAN,
    'dk': paperback_extensions_common_1.LanguageCode.DANISH,
    'gb': paperback_extensions_common_1.LanguageCode.ENGLISH,
    'es': paperback_extensions_common_1.LanguageCode.SPANISH,
    'fi': paperback_extensions_common_1.LanguageCode.FINNISH,
    'fr': paperback_extensions_common_1.LanguageCode.FRENCH,
    'gr': paperback_extensions_common_1.LanguageCode.GREEK,
    'hk': paperback_extensions_common_1.LanguageCode.CHINEESE_HONGKONG,
    'hu': paperback_extensions_common_1.LanguageCode.HUNGARIAN,
    'id': paperback_extensions_common_1.LanguageCode.INDONESIAN,
    'il': paperback_extensions_common_1.LanguageCode.ISRELI,
    'in': paperback_extensions_common_1.LanguageCode.INDIAN,
    'ir': paperback_extensions_common_1.LanguageCode.IRAN,
    'it': paperback_extensions_common_1.LanguageCode.ITALIAN,
    'jp': paperback_extensions_common_1.LanguageCode.JAPANESE,
    'kr': paperback_extensions_common_1.LanguageCode.KOREAN,
    'lt': paperback_extensions_common_1.LanguageCode.LITHUANIAN,
    'mn': paperback_extensions_common_1.LanguageCode.MONGOLIAN,
    'mx': paperback_extensions_common_1.LanguageCode.MEXIAN,
    'my': paperback_extensions_common_1.LanguageCode.MALAY,
    'nl': paperback_extensions_common_1.LanguageCode.DUTCH,
    'no': paperback_extensions_common_1.LanguageCode.NORWEGIAN,
    'ph': paperback_extensions_common_1.LanguageCode.PHILIPPINE,
    'pl': paperback_extensions_common_1.LanguageCode.POLISH,
    'pt': paperback_extensions_common_1.LanguageCode.PORTUGUESE,
    'ro': paperback_extensions_common_1.LanguageCode.ROMANIAN,
    'ru': paperback_extensions_common_1.LanguageCode.RUSSIAN,
    'sa': paperback_extensions_common_1.LanguageCode.SANSKRIT,
    'si': paperback_extensions_common_1.LanguageCode.SAMI,
    'th': paperback_extensions_common_1.LanguageCode.THAI,
    'tr': paperback_extensions_common_1.LanguageCode.TURKISH,
    'ua': paperback_extensions_common_1.LanguageCode.UKRAINIAN,
    'vn': paperback_extensions_common_1.LanguageCode.VIETNAMESE
};

},{"paperback-extensions-common":4}],27:[function(require,module,exports){
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
exports.Parser = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const Languages_1 = require("./Languages");
const BATOTO_DOMAIN = 'https://www.bato.to';
class Parser {
    parseMangaDetails($, mangaId) {
        var _a, _b, _c;
        let titles = [$('a', $('.item-title')).text().trim()];
        let altTitles = (_a = $('.alias-set').text().split('/').map(s => s.trim())) !== null && _a !== void 0 ? _a : '';
        for (let title of altTitles)
            titles.push(title);
        let image = $('.shadow-6').attr('src');
        let summary = $('pre', $('.attr-main')).text().trim();
        // Doesn't work, assuming it's because they're created by some JS script
        /*
        let relatedIds: string[] = []
        for(let obj of $('.recommend-post').toArray()) {
            relatedIds.push($(obj).attr('data-link')?.replace(`${BATOTO_DOMAIN}/series/`, '').trim() || '')
        }
        */
        let status = paperback_extensions_common_1.MangaStatus.ONGOING, author, released, rating = 0, views = 0, isHentai = false;
        let tagArray0 = [];
        let i = 0;
        for (let item of $('.attr-item').toArray()) {
            let itemSpan = $('span', $(item));
            switch (i) {
                case 0: {
                    views = parseInt($(itemSpan).text().split('/')[1].trim());
                }
                case 1: {
                    // Author
                    let authorList = $('a', $(itemSpan));
                    author = (_b = authorList.map((i, elem) => $(elem).text()).get().join(', ')) !== null && _b !== void 0 ? _b : '';
                    i++;
                    continue;
                }
                case 2: {
                    // Genres
                    for (let obj of $(itemSpan).children().toArray()) {
                        let label = $(obj).text().trim();
                        if (typeof label === 'undefined') {
                            i++;
                            continue;
                        }
                        tagArray0 = [...tagArray0, createTag({ id: label, label: label })];
                    }
                    i++;
                    continue;
                }
                case 3: {
                    i++;
                    continue;
                }
                case 4: {
                    // Comic Status
                    if ($(itemSpan).text().toLowerCase().includes("ongoing")) {
                        status = paperback_extensions_common_1.MangaStatus.ONGOING;
                    }
                    else {
                        status = paperback_extensions_common_1.MangaStatus.COMPLETED;
                    }
                    i++;
                    continue;
                }
                case 5: {
                    // Date of release
                    released = (_c = ($(itemSpan).text().trim())) !== null && _c !== void 0 ? _c : undefined;
                    i++;
                    continue;
                }
                case 6: {
                    // Hentai
                    if ($(itemSpan).text()[0] == 'G') {
                        isHentai = true;
                    }
                    i++;
                    continue;
                }
            }
            i = 0;
        }
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: tagArray0 })];
        return createManga({
            id: mangaId,
            rating: rating,
            titles: titles,
            image: image !== null && image !== void 0 ? image : '',
            status: status,
            author: author,
            tags: tagSections,
            desc: summary,
            lastUpdate: released,
            hentai: isHentai,
            views: views
        });
    }
    parseChapterList($, mangaId, source) {
        var _a, _b, _c, _d;
        let chapters = [];
        for (let obj of $('.item', $('.main')).toArray()) {
            let chapter = $('a', $(obj));
            let chapterId = (_a = chapter.attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`/chapter/`, '');
            let chapNum = $('b', chapter).text().toLowerCase().replace('chapter', '').trim();
            let chapName = $(chapter).text().trim().split('\n')[0];
            let chapGroup = (_b = $(chapter).text().trim().split('\n').pop()) === null || _b === void 0 ? void 0 : _b.trim();
            let language = (_c = $('.emoji').attr('data-lang')) !== null && _c !== void 0 ? _c : 'gb';
            let time = source.convertTime($('i', $(obj)).text());
            if (typeof chapterId === 'undefined')
                continue;
            chapters.push(createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: Number(chapNum),
                group: chapGroup,
                langCode: (_d = Languages_1.reverseLangCode[language]) !== null && _d !== void 0 ? _d : Languages_1.reverseLangCode['_unknown'],
                name: chapName,
                time: new Date(time)
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
    parseChapterDetails($, cryptoJS) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            let pages = [];
            // Get all of the pages
            let scripts = $('script').toArray();
            for (let scriptObj of scripts) {
                let script = (_a = scriptObj.children[0]) === null || _a === void 0 ? void 0 : _a.data;
                if (typeof script === 'undefined')
                    continue;
                if (script.includes("var images =")) {
                    let imgJson = JSON.parse((_b = script.split('var images = ', 2)[1].split(";", 2)[0]) !== null && _b !== void 0 ? _b : '');
                    let imgNames = imgJson.names();
                    if (imgNames != null) {
                        for (let i = 0; i < imgNames.length(); i++) {
                            let imgKey = imgNames.getString(i);
                            let imgUrl = imgJson.getString(imgKey);
                            pages.push(imgUrl);
                        }
                    }
                }
                else if (script.includes("const server =")) {
                    let encryptedServer = (_c = script.split('const server = ', 2)[1].split(";", 2)[0]) !== null && _c !== void 0 ? _c : '';
                    let batoJS = eval((_d = script.split('const batojs = ', 2)[1].split(";", 2)[0]) !== null && _d !== void 0 ? _d : '').toString();
                    let decryptScript = (yield cryptoJS()) + `CryptoJS.AES.decrypt(${encryptedServer}, "${batoJS}").toString(CryptoJS.enc.Utf8);`;
                    let server = eval(decryptScript).toString().replace('"', '');
                    let imgArray = JSON.parse((_e = script.split('const images = ', 2)[1].split(";", 2)[0]) !== null && _e !== void 0 ? _e : '');
                    if (imgArray != null) {
                        if (script.includes('bato.to/images')) {
                            for (let i = 0; i < imgArray.length(); i++) {
                                let imgUrl = imgArray.get(i);
                                pages.push(`${imgUrl}`);
                            }
                        }
                        else {
                            for (let i = 0; i < imgArray.length(); i++) {
                                let imgUrl = imgArray.get(i);
                                if (server.startsWith("http"))
                                    pages.push(`${server}${imgUrl}`);
                                else
                                    pages.push(`https:${server}${imgUrl}`);
                            }
                        }
                    }
                }
            }
            return pages;
        });
    }
    filterUpdatedManga($, time, ids, source) {
        var _a, _b;
        let foundIds = [];
        let passedReferenceTime = false;
        for (let item of $('.item', $('#series-list')).toArray()) {
            let id = (_b = (_a = $('a', item).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`/series/`, '').trim().split('/')[0]) !== null && _b !== void 0 ? _b : '';
            let mangaTime = source.convertTime($('i', item).text().trim());
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
    parseSearchResults($, source) {
        var _a, _b;
        let mangaTiles = [];
        let collectedIds = [];
        for (let obj of $('.item', $('#series-list')).toArray()) {
            let id = (_b = (_a = $('.item-cover', obj).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`/series/`, '').trim().split('/')[0]) !== null && _b !== void 0 ? _b : '';
            let encodedTitleText = $('.item-title', $(obj)).text();
            // Decode title
            let titleText = encodedTitleText.replace(/&#(\d+);/g, function (match, dec) {
                return String.fromCharCode(dec);
            });
            let subtitle = $('.visited', $(obj)).text().trim();
            let time = source.convertTime($('i', $(obj)).text().trim());
            let image = $('img', $(obj)).attr('src');
            if (titleText == "Not found")
                continue; // If a search result has no data, the only cartoon-box object has "Not Found" as title. Ignore.
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: titleText }),
                    subtitleText: createIconText({ text: subtitle }),
                    primaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' }),
                    image: image
                }));
                collectedIds.push(id);
            }
        }
        return mangaTiles;
    }
    parseTags($) {
        var _a, _b;
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
            createTagSection({ id: '1', label: 'format', tags: [] })];
        for (let obj of $('a', $('.home-list')).toArray()) {
            let id = (_b = (_a = $(obj).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`${BATOTO_DOMAIN}/`, '').trim()) !== null && _b !== void 0 ? _b : $(obj).text().trim();
            let genre = $(obj).text().trim();
            tagSections[0].tags.push(createTag({ id: id, label: genre }));
        }
        tagSections[1].tags.push(createTag({ id: 'comic/', label: 'Comic' }));
        return tagSections;
    }
    parseHomePageSection($, source) {
        var _a, _b;
        let tiles = [];
        let collectedIds = [];
        for (let item of $('.item', $('#series-list')).toArray()) {
            let id = (_b = (_a = $('a', item).attr('href')) === null || _a === void 0 ? void 0 : _a.replace(`/series/`, '').trim().split('/')[0]) !== null && _b !== void 0 ? _b : '';
            let encodedTitleText = $('.item-title', $(item)).text();
            // Decode title
            let titleText = encodedTitleText.replace(/&#(\d+);/g, function (match, dec) {
                return String.fromCharCode(dec);
            });
            let subtitle = $('.visited', $(item)).text().trim();
            let time = source.convertTime($('i', $(item)).text().trim());
            let image = $('img', $(item)).attr('src');
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            if (!collectedIds.includes(id)) {
                tiles.push(createMangaTile({
                    id: id,
                    title: createIconText({ text: titleText }),
                    subtitleText: createIconText({ text: subtitle }),
                    primaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' }),
                    image: image
                }));
            }
        }
        return tiles;
    }
    isLastPage($) {
        if (!$('.page-item').last().hasClass('disabled')) {
            return false;
        }
        return true;
    }
}
exports.Parser = Parser;

},{"./Languages":26,"paperback-extensions-common":4}]},{},[25])(25)
});
