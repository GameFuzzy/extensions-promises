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
exports.Manganelo = exports.ManganeloInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const MN_DOMAIN = 'https://manganelo.com';
exports.ManganeloInfo = {
    version: '2.0.1',
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
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MN_DOMAIN}/manga/`,
                method: 'GET',
                param: mangaId
            });
            let data = yield this.requestManager.schedule(request, 1);
            let manga = [];
            let $ = this.cheerio.load(data.data);
            let panel = $('.panel-story-info');
            let title = (_a = $('.img-loading', panel).attr('title')) !== null && _a !== void 0 ? _a : '';
            let image = (_b = $('.img-loading', panel).attr('src')) !== null && _b !== void 0 ? _b : '';
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
            let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] })];
            for (let row of $('tr', table).toArray()) {
                if ($(row).find('.info-alternative').length > 0) {
                    let alts = $('h2', table).text().split(/,|;/);
                    for (let alt of alts) {
                        titles.push(alt.trim());
                    }
                }
                else if ($(row).find('.info-author').length > 0) {
                    let autart = $('.table-value', row).find('a').toArray();
                    author = $(autart[0]).text();
                    if (autart.length > 1) {
                        artist = $(autart[1]).text();
                    }
                }
                else if ($(row).find('.info-status').length > 0) {
                    status = $('.table-value', row).text() == 'Ongoing' ? paperback_extensions_common_1.MangaStatus.ONGOING : paperback_extensions_common_1.MangaStatus.COMPLETED;
                }
                else if ($(row).find('.info-genres').length > 0) {
                    let elems = $('.table-value', row).find('a').toArray();
                    for (let elem of elems) {
                        let text = $(elem).text();
                        let id = (_e = (_d = (_c = $(elem).attr('href')) === null || _c === void 0 ? void 0 : _c.split('/').pop()) === null || _d === void 0 ? void 0 : _d.split('-').pop()) !== null && _e !== void 0 ? _e : '';
                        if (text.toLowerCase().includes('smut')) {
                            hentai = true;
                        }
                        tagSections[0].tags.push(createTag({ id: id, label: text }));
                    }
                }
            }
            table = $('.story-info-right-extent', panel);
            for (let row of $('p', table).toArray()) {
                if ($(row).find('.info-time').length > 0) {
                    let time = new Date($('.stre-value', row).text().replace(/(-*(AM)*(PM)*)/g, ''));
                    lastUpdate = time.toDateString();
                }
                else if ($(row).find('.info-view').length > 0) {
                    views = Number($('.stre-value', row).text().replace(/,/g, ''));
                }
            }
            rating = Number($('[property=v\\:average]', table).text());
            follows = Number($('[property=v\\:votes]', table).text());
            let summary = $('.panel-story-info-description', panel).text();
            return createManga({
                id: mangaId,
                titles: titles,
                image: image,
                rating: Number(rating),
                status: status,
                artist: artist,
                author: author,
                tags: tagSections,
                views: views,
                follows: follows,
                lastUpdate: lastUpdate,
                desc: summary,
                hentai: hentai
            });
        });
    }
    getChapters(mangaId) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MN_DOMAIN}/manga/`,
                method: 'GET',
                param: mangaId
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let allChapters = $('.row-content-chapter', '.body-site');
            let chapters = [];
            for (let chapter of $('li', allChapters).toArray()) {
                let id = (_b = (_a = $('a', chapter).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
                let name = (_c = $('a', chapter).text()) !== null && _c !== void 0 ? _c : '';
                let chNum = Number((_e = ((_d = /Chapter ([0-9]\d*(\.\d+)?)/g.exec(name)) !== null && _d !== void 0 ? _d : [])[1]) !== null && _e !== void 0 ? _e : '');
                let time = new Date((_f = $('.chapter-time', chapter).attr('title')) !== null && _f !== void 0 ? _f : '');
                chapters.push(createChapter({
                    id: id,
                    mangaId: mangaId,
                    name: name,
                    langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                    chapNum: chNum,
                    time: time
                }));
            }
            return chapters;
        });
    }
    getChapterDetails(mangaId, chapterId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MN_DOMAIN}/chapter/`,
                method: "GET",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    Cookie: 'content_lazyload=off'
                },
                param: `${mangaId}/${chapterId}`
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let pages = [];
            for (let item of $('img', '.container-chapter-reader').toArray()) {
                pages.push((_a = $(item).attr('src')) !== null && _a !== void 0 ? _a : '');
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
            let loadNextPage = true;
            let currPageNum = 1;
            while (loadNextPage) {
                let request = createRequestObject({
                    url: `${MN_DOMAIN}/genre-all/`,
                    method: 'GET',
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    param: String(currPageNum)
                });
                let data = yield this.requestManager.schedule(request, 1);
                let $ = this.cheerio.load(data.data);
                let foundIds = [];
                let passedReferenceTime = false;
                let panel = $('.panel-content-genres');
                for (let item of $('.content-genres-item', panel).toArray()) {
                    let id = (_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
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
                if (!passedReferenceTime) {
                    currPageNum++;
                }
                else {
                    loadNextPage = false;
                }
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: foundIds
                }));
            }
        });
    }
    constructGetViewMoreRequest(key, page) {
        let metadata = { page: page };
        let param = '';
        switch (key) {
            case 'latest_updates': {
                param = `/genre-all/${metadata.page}`;
                break;
            }
            case 'new_manga': {
                param = `/genre-all/${metadata.page}?type=newest`;
                break;
            }
            default: return undefined;
        }
        return createRequestObject({
            url: `${MN_DOMAIN}`,
            method: 'GET',
            param: param,
            metadata: {
                key, page
            }
        });
    }
    getHomePageSections(sectionCallback) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return __awaiter(this, void 0, void 0, function* () {
            // Give Paperback a skeleton of what these home sections should look like to pre-render them
            let section1 = createHomeSection({ id: 'top_week', title: 'TOP OF THE WEEK' });
            let section2 = createHomeSection({ id: 'latest_updates', title: 'LATEST UPDATES', view_more: true });
            let section3 = createHomeSection({ id: 'new_manga', title: 'NEW MANGA', view_more: true });
            sectionCallback(section1);
            sectionCallback(section2);
            sectionCallback(section3);
            // Fill the homsections with data
            let request = createRequestObject({
                url: MN_DOMAIN,
                method: 'GET'
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let topManga = [];
            let updateManga = [];
            let newManga = [];
            for (let item of $('.item', '.owl-carousel').toArray()) {
                let id = (_b = (_a = $('a', item).first().attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
                let image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
                topManga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: $('a', item).first().text() }),
                    subtitleText: createIconText({ text: $('[rel=nofollow]', item).text() })
                }));
            }
            for (let item of $('.content-homepage-item', '.panel-content-homepage').toArray()) {
                let id = (_e = (_d = $('a', item).first().attr('href')) === null || _d === void 0 ? void 0 : _d.split('/').pop()) !== null && _e !== void 0 ? _e : '';
                let image = (_f = $('img', item).attr('src')) !== null && _f !== void 0 ? _f : '';
                let itemRight = $('.content-homepage-item-right', item);
                let latestUpdate = $('.item-chapter', itemRight).first();
                updateManga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: $('a', itemRight).first().text() }),
                    subtitleText: createIconText({ text: $('.item-author', itemRight).text() }),
                    primaryText: createIconText({ text: $('.genres-item-rate', item).text(), icon: 'star.fill' }),
                    secondaryText: createIconText({ text: $('i', latestUpdate).text(), icon: 'clock.fill' })
                }));
            }
            for (let item of $('a', '.panel-newest-content').toArray()) {
                let id = (_h = (_g = $(item).attr('href')) === null || _g === void 0 ? void 0 : _g.split('/').pop()) !== null && _h !== void 0 ? _h : '';
                let image = (_j = $('img', item).attr('src')) !== null && _j !== void 0 ? _j : '';
                let title = (_k = $('img', item).attr('alt')) !== null && _k !== void 0 ? _k : '';
                newManga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title })
                }));
            }
            section1.items = topManga;
            section2.items = updateManga;
            section3.items = newManga;
            // Perform the callbacks again now that the home page sections are filled with data
            sectionCallback(section1);
            sectionCallback(section2);
            sectionCallback(section3);
        });
    }
    searchRequest(query, metadata) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        return __awaiter(this, void 0, void 0, function* () {
            // Format the search query into a proper request
            let genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).concat((_b = query.includeDemographic) !== null && _b !== void 0 ? _b : []).join('_');
            let excluded = ((_c = query.excludeGenre) !== null && _c !== void 0 ? _c : []).concat((_d = query.excludeDemographic) !== null && _d !== void 0 ? _d : []).join('_');
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
            let request = createRequestObject({
                url: `${MN_DOMAIN}/advanced_search?`,
                method: 'GET',
                metadata: metadata,
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
                param: `${search}${metadata.page ? '&page=' + metadata.page : ''}` // If we have page information in our metadata, search for the provided page
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let panel = $('.panel-content-genres');
            let manga = [];
            for (let item of $('.content-genres-item', panel).toArray()) {
                let id = (_h = (_g = $('.genres-item-name', item).attr('href')) === null || _g === void 0 ? void 0 : _g.split('/').pop()) !== null && _h !== void 0 ? _h : '';
                let title = $('.genres-item-name', item).text();
                let subTitle = $('.genres-item-chap', item).text();
                let image = (_j = $('.img-loading', item).attr('src')) !== null && _j !== void 0 ? _j : '';
                let rating = $('.genres-item-rate', item).text();
                let updated = $('.genres-item-time', item).text();
                manga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title }),
                    subtitleText: createIconText({ text: subTitle }),
                    primaryText: createIconText({ text: rating, icon: 'star.fill' }),
                    secondaryText: createIconText({ text: updated, icon: 'clock.fill' })
                }));
            }
            metadata.page = metadata.page ? metadata.page++ : 2; // If the page value is null, we want page two. Otherwise, increment the page.
            return createPagedResults({
                results: manga,
                metadata: metadata
            });
        });
    }
    getTags() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MN_DOMAIN}/advanced_search?`,
                method: 'GET',
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                }
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let panel = $('.advanced-search-tool-genres-list');
            let genres = createTagSection({
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
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            let param = '';
            switch (homepageSectionId) {
                case 'latest_updates': {
                    param = `/genre-all/${metadata.page ? metadata.page : 1}`;
                    break;
                }
                case 'new_manga': {
                    param = `/genre-all/${metadata.page ? metadata.page : 1}?type=newest`;
                    break;
                }
                default: return Promise.resolve(null);
            }
            let request = createRequestObject({
                url: `${MN_DOMAIN}`,
                method: 'GET',
                param: param,
                metadata: metadata
            });
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let manga = [];
            if (homepageSectionId == 'latest_updates' || homepageSectionId == 'new_manga') {
                let panel = $('.panel-content-genres');
                for (let item of $('.content-genres-item', panel).toArray()) {
                    let id = (_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
                    let image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
                    let title = $('.genres-item-name', item).text();
                    let subtitle = $('.genres-item-chap', item).text();
                    let time = new Date($('.genres-item-time').first().text());
                    if (time > new Date(Date.now())) {
                        time = new Date(Date.now() - 60000);
                    }
                    let rating = $('.genres-item-rate', item).text();
                    manga.push(createMangaTile({
                        id: id,
                        image: image,
                        title: createIconText({ text: title }),
                        subtitleText: createIconText({ text: subtitle }),
                        primaryText: createIconText({ text: rating, icon: 'star.fill' }),
                        secondaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' })
                    }));
                }
            }
            else
                return Promise.resolve(null);
            if (!this.isLastPage($)) {
                metadata.page ? metadata.page++ : metadata.page = 2;
            }
            else {
                metadata = undefined; // There are no more pages to continue on to, do not provide page metadata
            }
            return createPagedResults({
                results: manga,
                metadata: metadata
            });
        });
    }
    globalRequestHeaders() {
        return {
            referer: MN_DOMAIN
        };
    }
    isLastPage($) {
        var _a;
        let current = $('.page-select').text();
        let total = $('.page-last').text();
        if (current) {
            total = ((_a = /(\d+)/g.exec(total)) !== null && _a !== void 0 ? _a : [''])[0];
            return (+total) === (+current);
        }
        return true;
    }
}
exports.Manganelo = Manganelo;

},{"paperback-extensions-common":4}]},{},[25])(25)
});
