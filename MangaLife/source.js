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
exports.MangaLife = exports.MangaLifeInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const ML_DOMAIN = 'https://manga4life.com';
let ML_IMAGE_DOMAIN = 'https://cover.mangabeast01.com/cover';
exports.MangaLifeInfo = {
    version: '1.1.4',
    name: 'Manga4Life',
    icon: 'icon.png',
    author: 'Daniel Kovalevich',
    authorWebsite: 'https://github.com/DanielKovalevich',
    description: 'Extension that pulls manga from MangaLife, includes Advanced Search and Updated manga fetching',
    hentaiSource: false,
    websiteBaseURL: ML_DOMAIN,
    sourceTags: [
        {
            text: "Notifications",
            type: paperback_extensions_common_1.TagType.GREEN
        }
    ]
};
class MangaLife extends paperback_extensions_common_1.Source {
    getMangaShareUrl(mangaId) { return `${ML_DOMAIN}/manga/${mangaId}`; }
    getMangaDetails(mangaId) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${ML_DOMAIN}/manga/`,
                method: 'GET',
                param: mangaId
            });
            const data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let json = (_b = (_a = $('[type=application\\/ld\\+json]').html()) === null || _a === void 0 ? void 0 : _a.replace(/\t*\n*/g, '')) !== null && _b !== void 0 ? _b : '';
            // this is only because they added some really jank alternate titles and didn't propely string escape
            let jsonWithoutAlternateName = json.replace(/"alternateName".*?],/g, '');
            let alternateNames = ((_c = /"alternateName": \[(.*?)\]/.exec(json)) !== null && _c !== void 0 ? _c : [])[1]
                .replace(/\"/g, '')
                .split(',');
            let parsedJson = JSON.parse(jsonWithoutAlternateName);
            let entity = parsedJson.mainEntity;
            let info = $('.row');
            let imgSource = ((_e = (_d = $('.ImgHolder').html()) === null || _d === void 0 ? void 0 : _d.match(/src="(.*)\//)) !== null && _e !== void 0 ? _e : [])[1];
            if (imgSource !== ML_IMAGE_DOMAIN)
                ML_IMAGE_DOMAIN = imgSource;
            let image = `${ML_IMAGE_DOMAIN}/${mangaId}.jpg`;
            let title = (_f = $('h1', info).first().text()) !== null && _f !== void 0 ? _f : '';
            let titles = [title];
            let author = entity.author[0];
            titles = titles.concat(alternateNames);
            let follows = Number(((_h = (_g = $.root().html()) === null || _g === void 0 ? void 0 : _g.match(/vm.NumSubs = (.*);/)) !== null && _h !== void 0 ? _h : [])[1]);
            let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
                createTagSection({ id: '1', label: 'format', tags: [] })];
            tagSections[0].tags = entity.genre.map((elem) => createTag({ id: elem, label: elem }));
            let update = entity.dateModified;
            let status = paperback_extensions_common_1.MangaStatus.ONGOING;
            let summary = '';
            let hentai = entity.genre.includes('Hentai') || entity.genre.includes('Adult');
            let details = $('.list-group', info);
            for (let row of $('li', details).toArray()) {
                let text = $('.mlabel', row).text();
                switch (text) {
                    case 'Type:': {
                        let type = $('a', row).text();
                        tagSections[1].tags.push(createTag({ id: type.trim(), label: type.trim() }));
                        break;
                    }
                    case 'Status:': {
                        status = $(row).text().includes('Ongoing') ? paperback_extensions_common_1.MangaStatus.ONGOING : paperback_extensions_common_1.MangaStatus.COMPLETED;
                        break;
                    }
                    case 'Description:': {
                        summary = $('div', row).text().trim();
                        break;
                    }
                }
            }
            return createManga({
                id: mangaId,
                titles: titles,
                image: image,
                rating: 0,
                status: status,
                author: author,
                tags: tagSections,
                desc: summary,
                hentai: hentai,
                follows: follows,
                lastUpdate: update
            });
        });
    }
    getChapters(mangaId) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${ML_DOMAIN}/manga/`,
                method: "GET",
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                param: mangaId
            });
            const data = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(data.data);
            let chapterJS = JSON.parse(((_b = (_a = $.root().html()) === null || _a === void 0 ? void 0 : _a.match(/vm.Chapters = (.*);/)) !== null && _b !== void 0 ? _b : [])[1]).reverse();
            let chapters = [];
            // following the url encoding that the website uses, same variables too
            chapterJS.forEach((elem) => {
                let chapterCode = elem.Chapter;
                let vol = Number(chapterCode.substring(0, 1));
                let index = vol != 1 ? '-index-' + vol : '';
                let n = parseInt(chapterCode.slice(1, -1));
                let a = Number(chapterCode[chapterCode.length - 1]);
                let m = a != 0 ? '.' + a : '';
                let id = mangaId + '-chapter-' + n + m + index + '.html';
                let chNum = n + a * .1;
                let name = elem.ChapterName ? elem.ChapterName : ''; // can be null
                let timeStr = elem.Date.replace(/-/g, "/");
                let time = new Date(timeStr);
                chapters.push(createChapter({
                    id: id,
                    mangaId: mangaId,
                    name: name,
                    chapNum: chNum,
                    volume: vol,
                    langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                    time: time
                }));
            });
            return chapters;
        });
    }
    getChapterDetails(mangaId, chapterId) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${ML_DOMAIN}/read-online/`,
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                method: 'GET',
                param: chapterId
            });
            const data = yield this.requestManager.schedule(request, 1);
            let pages = [];
            let pathName = JSON.parse(((_a = data.data.match(/vm.CurPathName = (.*);/)) !== null && _a !== void 0 ? _a : [])[1]);
            let chapterInfo = JSON.parse(((_b = data.data.match(/vm.CurChapter = (.*);/)) !== null && _b !== void 0 ? _b : [])[1]);
            let pageNum = Number(chapterInfo.Page);
            let chapter = chapterInfo.Chapter.slice(1, -1);
            let odd = chapterInfo.Chapter[chapterInfo.Chapter.length - 1];
            let chapterImage = odd == 0 ? chapter : chapter + '.' + odd;
            for (let i = 0; i < pageNum; i++) {
                let s = '000' + (i + 1);
                let page = s.substr(s.length - 3);
                pages.push(`https://${pathName}/manga/${mangaId}/${chapterInfo.Directory == '' ? '' : chapterInfo.Directory + '/'}${chapterImage}-${page}.png`);
            }
            let chapterDetails = createChapterDetails({
                id: chapterId,
                mangaId: mangaId,
                pages, longStrip: false
            });
            return chapterDetails;
        });
    }
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${ML_DOMAIN}/`,
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                method: "GET"
            });
            const data = yield this.requestManager.schedule(request, 1);
            const returnObject = {
                'ids': []
            };
            const updateManga = JSON.parse(((_a = data.data.match(/vm.LatestJSON = (.*);/)) !== null && _a !== void 0 ? _a : [])[1]);
            updateManga.forEach((elem) => {
                if (ids.includes(elem.IndexName) && time < new Date(elem.Date))
                    returnObject.ids.push(elem.IndexName);
            });
            mangaUpdatesFoundCallback(createMangaUpdates(returnObject));
        });
    }
    searchRequest(query, _metadata) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            let status = "";
            switch (query.status) {
                case 0:
                    status = 'Completed';
                    break;
                case 1:
                    status = 'Ongoing';
                    break;
                default: status = '';
            }
            let genre = query.includeGenre ?
                (query.includeDemographic ? query.includeGenre.concat(query.includeDemographic) : query.includeGenre) :
                query.includeDemographic;
            let genreNo = query.excludeGenre ?
                (query.excludeDemographic ? query.excludeGenre.concat(query.excludeDemographic) : query.excludeGenre) :
                query.excludeDemographic;
            let metadata = {
                'keyword': query.title,
                'author': query.author || query.artist || '',
                'status': status,
                'type': query.includeFormat,
                'genre': genre,
                'genreNo': genreNo
            };
            const request = createRequestObject({
                url: `${ML_DOMAIN}/search/`,
                metadata: metadata,
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                method: "GET"
            });
            const data = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(data.data);
            let mangaTiles = [];
            let directory = JSON.parse(((_a = data.data.match(/vm.Directory = (.*);/)) !== null && _a !== void 0 ? _a : [])[1]);
            let imgSource = ((_c = (_b = $('.img-fluid').first().attr('src')) === null || _b === void 0 ? void 0 : _b.match(/(.*cover)/)) !== null && _c !== void 0 ? _c : [])[1];
            if (imgSource !== ML_IMAGE_DOMAIN)
                ML_IMAGE_DOMAIN = imgSource;
            directory.forEach((elem) => {
                let mKeyword = typeof metadata.keyword !== 'undefined' ? false : true;
                let mAuthor = metadata.author !== '' ? false : true;
                let mStatus = metadata.status !== '' ? false : true;
                let mType = typeof metadata.type !== 'undefined' && metadata.type.length > 0 ? false : true;
                let mGenre = typeof metadata.genre !== 'undefined' && metadata.genre.length > 0 ? false : true;
                let mGenreNo = typeof metadata.genreNo !== 'undefined' ? true : false;
                if (!mKeyword) {
                    let allWords = [elem.s.toLowerCase()].concat(elem.al.map((e) => e.toLowerCase()));
                    allWords.forEach((key) => {
                        if (key.includes(metadata.keyword.toLowerCase()))
                            mKeyword = true;
                    });
                }
                if (!mAuthor) {
                    let authors = elem.a.map((e) => e.toLowerCase());
                    if (authors.includes(metadata.author.toLowerCase()))
                        mAuthor = true;
                }
                if (!mStatus) {
                    if ((elem.ss == 'Ongoing' && metadata.status == 'Ongoing') || (elem.ss != 'Ongoing' && metadata.ss != 'Ongoing'))
                        mStatus = true;
                }
                if (!mType)
                    mType = metadata.type.includes(elem.t);
                if (!mGenre)
                    mGenre = metadata.genre.every((i) => elem.g.includes(i));
                if (mGenreNo)
                    mGenreNo = metadata.genreNo.every((i) => elem.g.includes(i));
                if (mKeyword && mAuthor && mStatus && mType && mGenre && !mGenreNo) {
                    mangaTiles.push(createMangaTile({
                        id: elem.i,
                        title: createIconText({ text: elem.s }),
                        image: `${ML_IMAGE_DOMAIN}/${elem.i}.jpg`,
                        subtitleText: createIconText({ text: elem.ss })
                    }));
                }
            });
            // This source parses JSON and never requires additional pages
            return createPagedResults({
                results: mangaTiles
            });
        });
    }
    getTags() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${ML_DOMAIN}/search/`,
                method: 'GET',
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                }
            });
            const data = yield this.requestManager.schedule(request, 1);
            let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
                createTagSection({ id: '1', label: 'format', tags: [] })];
            let genres = JSON.parse(((_a = data.data.match(/"Genre"\s*: (.*)/)) !== null && _a !== void 0 ? _a : [])[1].replace(/'/g, "\""));
            let typesHTML = ((_b = data.data.match(/"Type"\s*: (.*),/g)) !== null && _b !== void 0 ? _b : [])[1];
            let types = JSON.parse(((_c = typesHTML.match(/(\[.*\])/)) !== null && _c !== void 0 ? _c : [])[1].replace(/'/g, "\""));
            tagSections[0].tags = genres.map((e) => createTag({ id: e, label: e }));
            tagSections[1].tags = types.map((e) => createTag({ id: e, label: e }));
            return tagSections;
        });
    }
    getHomePageSections(sectionCallback) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${ML_DOMAIN}`,
                method: 'GET'
            });
            const data = yield this.requestManager.schedule(request, 1);
            const hotSection = createHomeSection({ id: 'hot_update', title: 'HOT UPDATES', view_more: true });
            const latestSection = createHomeSection({ id: 'latest', title: 'LATEST UPDATES', view_more: true });
            const newTitlesSection = createHomeSection({ id: 'new_titles', title: 'NEW TITLES', view_more: true });
            const recommendedSection = createHomeSection({ id: 'recommended', title: 'RECOMMENDATIONS', view_more: true });
            sectionCallback(hotSection);
            sectionCallback(latestSection);
            sectionCallback(newTitlesSection);
            sectionCallback(recommendedSection);
            const $ = this.cheerio.load(data.data);
            const hot = (JSON.parse(((_a = data.data.match(/vm.HotUpdateJSON = (.*);/)) !== null && _a !== void 0 ? _a : [])[1])).slice(0, 15);
            const latest = (JSON.parse(((_b = data.data.match(/vm.LatestJSON = (.*);/)) !== null && _b !== void 0 ? _b : [])[1])).slice(0, 15);
            const newTitles = (JSON.parse(((_c = data.data.match(/vm.NewSeriesJSON = (.*);/)) !== null && _c !== void 0 ? _c : [])[1])).slice(0, 15);
            const recommended = JSON.parse(((_d = data.data.match(/vm.RecommendationJSON = (.*);/)) !== null && _d !== void 0 ? _d : [])[1]);
            let imgSource = ((_f = (_e = $('.ImageHolder').html()) === null || _e === void 0 ? void 0 : _e.match(/ng-src="(.*)\//)) !== null && _f !== void 0 ? _f : [])[1];
            if (imgSource !== ML_IMAGE_DOMAIN)
                ML_IMAGE_DOMAIN = imgSource;
            let hotManga = [];
            hot.forEach((elem) => {
                let id = elem.IndexName;
                let title = elem.SeriesName;
                let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                let time = (new Date(elem.Date)).toDateString();
                time = time.slice(0, time.length - 5);
                time = time.slice(4, time.length);
                hotManga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title }),
                    secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                }));
            });
            hotSection.items = hotManga;
            sectionCallback(hotSection);
            let latestManga = [];
            latest.forEach((elem) => {
                let id = elem.IndexName;
                let title = elem.SeriesName;
                let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                let time = (new Date(elem.Date)).toDateString();
                time = time.slice(0, time.length - 5);
                time = time.slice(4, time.length);
                latestManga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title }),
                    secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                }));
            });
            latestSection.items = latestManga;
            sectionCallback(latestSection);
            let newManga = [];
            newTitles.forEach((elem) => {
                let id = elem.IndexName;
                let title = elem.SeriesName;
                let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                newManga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title })
                }));
            });
            newTitlesSection.items = newManga;
            sectionCallback(newTitlesSection);
            let recManga = [];
            recommended.forEach((elem) => {
                let id = elem.IndexName;
                let title = elem.SeriesName;
                let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                let time = (new Date(elem.Date)).toDateString();
                recManga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title })
                }));
            });
            recommendedSection.items = recManga;
            sectionCallback(recommendedSection);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: ML_DOMAIN,
                method: 'GET'
            });
            const data = yield this.requestManager.schedule(request, 1);
            //let manga: MangaTile[] = []
            let manga = new Set();
            if (homepageSectionId == 'hot_update') {
                let hot = JSON.parse(((_a = data.data.match(/vm.HotUpdateJSON = (.*);/)) !== null && _a !== void 0 ? _a : [])[1]).slice(15);
                hot.forEach((elem) => {
                    let id = elem.IndexName;
                    let title = elem.SeriesName;
                    let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                    let time = (new Date(elem.Date)).toDateString();
                    time = time.slice(0, time.length - 5);
                    time = time.slice(4, time.length);
                    manga.add(createMangaTile({
                        id: id,
                        image: image,
                        title: createIconText({ text: title }),
                        secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                    }));
                });
            }
            else if (homepageSectionId == 'latest') {
                let latest = JSON.parse(((_b = data.data.match(/vm.LatestJSON = (.*);/)) !== null && _b !== void 0 ? _b : [])[1]).slice(15);
                latest.forEach((elem) => {
                    let id = elem.IndexName;
                    let title = elem.SeriesName;
                    let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                    let time = (new Date(elem.Date)).toDateString();
                    time = time.slice(0, time.length - 5);
                    time = time.slice(4, time.length);
                    manga.add(createMangaTile({
                        id: id,
                        image: image,
                        title: createIconText({ text: title }),
                        secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                    }));
                });
            }
            else if (homepageSectionId == 'recommended') {
                let latest = JSON.parse(((_c = data.data.match(/vm.RecommendationJSON = (.*);/)) !== null && _c !== void 0 ? _c : [])[1]);
                latest.forEach((elem) => {
                    let id = elem.IndexName;
                    let title = elem.SeriesName;
                    let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                    let time = (new Date(elem.Date)).toDateString();
                    time = time.slice(0, time.length - 5);
                    time = time.slice(4, time.length);
                    manga.add(createMangaTile({
                        id: id,
                        image: image,
                        title: createIconText({ text: title }),
                        secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                    }));
                });
            }
            else if (homepageSectionId == 'new_titles') {
                let newTitles = JSON.parse(((_d = data.data.match(/vm.NewSeriesJSON = (.*);/)) !== null && _d !== void 0 ? _d : [])[1]).slice(15);
                newTitles.forEach((elem) => {
                    let id = elem.IndexName;
                    let title = elem.SeriesName;
                    let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                    let time = (new Date(elem.Date)).toDateString();
                    time = time.slice(0, time.length - 5);
                    time = time.slice(4, time.length);
                    manga.add(createMangaTile({
                        id: id,
                        image: image,
                        title: createIconText({ text: title })
                    }));
                });
            }
            else
                return null;
            // This source parses JSON and never requires additional pages
            return createPagedResults({
                results: Array.from(manga)
            });
        });
    }
}
exports.MangaLife = MangaLife;

},{"paperback-extensions-common":4}]},{},[25])(25)
});
