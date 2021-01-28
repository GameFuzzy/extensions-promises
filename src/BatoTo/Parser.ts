import {Manga, MangaStatus, Tag, TagSection, Chapter, MangaTile} from 'paperback-extensions-common'
import {reverseLangCode} from "./Languages";
const { CryptoJS } = require('./external/crypto.min.js')

const BATOTO_DOMAIN = 'https://www.bato.to'

export class Parser {

    
    parseMangaDetails($: CheerioSelector, mangaId: string): Manga {

        let titles = [$('a', $('.item-title')).text().trim()]
        let altTitles: string[] = $('.alias-set').text().split('/').map(s => s.trim()) ?? ''
        for(let title of altTitles)
            titles.push(title)

        let image = $('.shadow-6').attr('src')

        let summary = $('pre', $('.attr-main')).text().trim()

        // Doesn't work, assuming it's because they're created by some JS script
        /*
        let relatedIds: string[] = []
        for(let obj of $('.recommend-post').toArray()) {
            relatedIds.push($(obj).attr('data-link')?.replace(`${BATOTO_DOMAIN}/series/`, '').trim() || '')
        }
        */

        let status = MangaStatus.ONGOING, author, released, rating: number = 0, views: number = 0, isHentai = false
        let tagArray0 : Tag[] = []
        let i = 0
        for (let item of $('.attr-item').toArray()) {
            let itemSpan = $('span', $(item))
            switch (i) {
                case 0: {
                    views = parseInt($(itemSpan).text().split('/')[1].trim())
                }
                case 1: {
                    // Author
                    let authorList: Cheerio = $('a', $(itemSpan))
                    author = authorList.map((i, elem) => $(elem).text()).get().join(', ') ?? ''
                    i++
                    continue
                }
                case 2: {
                    // Genres
                    for(let obj of $(itemSpan).children().toArray()){
                        let label = $(obj).text().trim()
                        if (typeof label === 'undefined') {i++; continue}
                        tagArray0 = [...tagArray0, createTag({id: label, label: label})]
                    }
                    i++
                    continue
                }
                case 3: {i++; continue}
                case 4: {
                    // Comic Status
                    if ($(itemSpan).text().toLowerCase().includes("ongoing")) {
                      status = MangaStatus.ONGOING
                    }
                    else {
                      status = MangaStatus.COMPLETED
                    }
                    i++
                    continue
                }
                case 5: {
                    // Date of release
                    released = ($(itemSpan).text().trim()) ?? undefined
                    i++
                    continue
                }
                case 6: {
                    // Hentai
                    if($(itemSpan).text()[0] == 'G') {
                        isHentai = true
                    }
                    i++
                    continue
                }
          }
          i = 0
        }
        let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: tagArray0 })]
            return createManga({
                id: mangaId,
                rating: rating,
                titles: titles,
                image: image ?? '',
                status: status,
                author: author,
                tags: tagSections,
                desc: summary,
                lastUpdate: released,
                hentai: isHentai,
                views: views
            })
        }


    parseChapterList($: CheerioSelector, mangaId: string, source: any) : Chapter[] {
        let chapters: Chapter[] = []

        for(let obj of $('.item', $('.main')).toArray()) {
            let chapter: Cheerio = $('a', $(obj))
            let chapterId = chapter.attr('href')?.replace(`/chapter/`, '')
            let chapNum = $('b', chapter).text().toLowerCase().replace('chapter', '').trim()
            let chapName = $(chapter).text().trim().split('\n')[0]
            let chapGroup = $(chapter).text().trim().split('\n').pop()?.trim()
            let language = $('.emoji').attr('data-lang') ?? 'gb'
            let time = source.convertTime($('i', $(obj)).text())
            if (typeof chapterId === 'undefined') continue
            chapters.push(createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: Number(chapNum),
                group: chapGroup,
                langCode: reverseLangCode[language] ?? reverseLangCode['_unknown'],
                name: chapName,
                time: new Date(time)
            }))
        }
        return chapters
}


    sortChapters(chapters: Chapter[]) : Chapter[] {
        let sortedChapters: Chapter[] = []
        chapters.forEach((c) => {
            if (sortedChapters[sortedChapters.indexOf(c)]?.id !== c?.id) {
                sortedChapters.push(c)
            }
        })
            sortedChapters.sort((a, b) => (a.id > b.id) ? 1 : -1)
            return sortedChapters
    }


     parseChapterDetails($: CheerioSelector) : string[] {
        let pages: string[] = []
        // Get all of the pages

        let scripts = $('script').toArray()
        for(let scriptObj of scripts) {
            let script = scriptObj.children[0]?.data
            if (typeof script === 'undefined') continue
            if (script.includes("var images =")) {
                let imgJson = JSON.parse(script.split('var images = ', 2)[1].split(";", 2)[0] ?? '') as any
                let imgNames = imgJson.names()

                if (imgNames != null) {
                    for (let i = 0; i < imgNames.length(); i++) {
                        let imgKey = imgNames.getString(i)
                        let imgUrl = imgJson.getString(imgKey)
                        pages.push(imgUrl)
                    }
                }

            }
            else if(script.includes("const server =")) {
                let encryptedServer = script.split('const server = ', 2)[1].split(";", 2)[0] ?? ''
                let batoJS = eval(script.split('const batojs = ', 2)[1].split(";", 2)[0] ?? '').toString()
                let decryptScript = CryptoJS.AES.decrypt(encryptedServer, batoJS).toString(CryptoJS.enc.Utf8)
                let server = eval(decryptScript).toString().replace('"', '')
                let imgArray = JSON.parse(script.split('const images = ', 2)[1].split(";", 2)[0] ?? '') as any
                if (imgArray != null) {
                    if (script.includes('bato.to/images')) {
                        for (let i = 0; i < imgArray.length(); i++) {
                            let imgUrl = imgArray.get(i)
                            pages.push(`${imgUrl}`)
                        }
                    } else {
                        for (let i = 0; i < imgArray.length(); i++) {
                            let imgUrl = imgArray.get(i)
                            if (server.startsWith("http"))
                                pages.push(`${server}${imgUrl}`)
                            else
                                pages.push(`https:${server}${imgUrl}`)
                        }
                    }
                }
            }
        }

        return pages
    }

    filterUpdatedManga($: CheerioSelector, time: Date, ids: string[], source: any) : {updates: string[], loadNextPage : boolean} {
        let foundIds: string[] = []
        let passedReferenceTime = false
        for(let item of $('.item', $('#series-list')).toArray()) {
          let id = $('a', item).attr('href')?.replace(`/series/`, '')!.trim().split('/')[0] ?? ''
            let mangaTime = source.convertTime($('i', item).text().trim())
             passedReferenceTime = mangaTime <= time
            if (!passedReferenceTime) {
                if (ids.includes(id)) {
                    foundIds.push(id)
                }
            }
          else break
        }
        if(!passedReferenceTime) {
            return {updates: foundIds, loadNextPage: true}
        }
        else {
            return {updates: foundIds, loadNextPage: false}
        }


    }

    parseSearchResults($: CheerioSelector, source: any): MangaTile[] {
        let mangaTiles: MangaTile[] = []
        let collectedIds: string[] = []
        for(let obj of $('.item', $('#series-list')).toArray()) {
            let id = $('.item-cover', obj).attr('href')?.replace(`/series/`, '')!.trim().split('/')[0] ?? ''
            let encodedTitleText = $('.item-title', $(obj)).text()
            // Decode title
            let titleText = encodedTitleText.replace(/&#(\d+);/g, function(match, dec) {
              return String.fromCharCode(dec);
            })
            let subtitle = $('.visited', $(obj)).text().trim()
            let time = source.convertTime($('i', $(obj)).text().trim())
            let image = $('img', $(obj)).attr('src')

            if(titleText == "Not found") continue // If a search result has no data, the only cartoon-box object has "Not Found" as title. Ignore.
            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if(!collectedIds.includes(id)) {
            mangaTiles.push(createMangaTile({
                id: id,
                title: createIconText({text: titleText}),
                subtitleText: createIconText({ text: subtitle }),
                primaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' }),
                image: image
            }))
            collectedIds.push(id)
          }
    }
    return mangaTiles
    }

    parseTags($: CheerioSelector): TagSection[] {
        
        let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
        createTagSection({ id: '1', label: 'format', tags: [] })]
    
        for(let obj of $('a', $('.home-list')).toArray()) {
          let id = $(obj).attr('href')?.replace(`${BATOTO_DOMAIN}/`, '').trim() ?? $(obj).text().trim()
          let genre = $(obj).text().trim()
          tagSections[0].tags.push(createTag({id: id, label: genre}))
        }
        tagSections[1].tags.push(createTag({id: 'comic/', label: 'Comic'}))
        return tagSections
    }

    parseHomePageSection($ : CheerioSelector, source: any): MangaTile[]{
        
        let tiles: MangaTile[] = []
        let collectedIds: string[] = []
        for(let item of $('.item', $('#series-list')).toArray()) {
            let id = $('a', item).attr('href')?.replace(`/series/`, '')!.trim().split('/')[0] ?? ''
            let encodedTitleText = $('.item-title', $(item)).text()
            // Decode title
            let titleText = encodedTitleText.replace(/&#(\d+);/g, function(match, dec) {
                return String.fromCharCode(dec);
            })
            let subtitle = $('.visited', $(item)).text().trim()
            let time = source.convertTime($('i', $(item)).text().trim())

            let image = $('img', $(item)).attr('src')

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if(!collectedIds.includes(id)) {
            tiles.push(createMangaTile({
                id: id,
                title: createIconText({text: titleText}),
                subtitleText: createIconText({ text: subtitle }),
                primaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' }),
                image: image
            }))
        }
      }
        return tiles
    }
    isLastPage($: CheerioSelector): boolean {

            if(!$('.page-item').last().hasClass('disabled')) {
                return false

        }
        return true
    }

}
