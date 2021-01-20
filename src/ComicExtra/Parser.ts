import {Manga, MangaStatus, Tag, TagSection, LanguageCode, Chapter, ChapterDetails, MangaTile} from 'paperback-extensions-common'

const COMICEXTRA_DOMAIN = 'https://www.comicextra.com'

export class Parser {

    
    parseMangaDetails(data: CheerioSelector, mangaId: string): Manga {
    let $ = data

    let titles = [$('.title-1', $('.mobile-hide')).text().trimStart()]
    let image = $('img', $('.movie-l-img')).attr('src')

    let summary = $('#film-content', $('#film-content-wrapper')).text().trim()
    let relatedIds: string[] = []
    for(let obj of $('.list-top-item').toArray()) {
        relatedIds.push($('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')!.trim() || '')
    }

    let status = MangaStatus.ONGOING, author, released, rating: number = 0
    let tagArray0 : Tag[] = []
    let i = 0
    for (let item of $('.movie-dd', $('.movie-dl')).toArray()) {
      switch (i) {
        case 0: {
          // Comic Status
          if ($('a', $(item)).text().toLowerCase().includes("ongoing")) {
            status = MangaStatus.ONGOING
          }
          else {
            status = MangaStatus.COMPLETED
          }
          i++
          continue
        }
        case 1: {
          // Alt Titles
           if($(item).text().toLowerCase().trim() == "-") {
            i++
            continue
           }
           titles.push($(item).text().trim())
          i++
          continue
        }
        case 2: {
          // Date of release
          released = ($(item).text().trim()) ?? undefined
          i++
          continue
        }
        case 3: {
          // Author
          author = ($(item).text().trim()) ?? undefined
          i++
          continue
          }
        case 4: {
          // Genres
          for(let obj of $('a',$(item)).toArray()){
            console.log($(obj).text().trim())
            //tagSections[0].tags.push(createTag({id: $(obj).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/`, '').trim()!, label: $(obj).text().trim()}))
            tagArray0 = [...tagArray0, createTag({id: $(obj).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/`, '').trim()!, label: $(obj).text().trim()})]
          }    
          i++
          continue
        }
      }
      i = 0
    }
    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: tagArray0 })]
      console.log(tagArray0[0])
      return createManga({
        id: mangaId,
        rating: rating,
        titles: titles,
        image: image!,
        status: status,
        author: author,
        tags: tagSections,
        desc: summary,
        lastUpdate: released,
        relatedIds: relatedIds
      })
    }


    parseChapterList(data: CheerioSelector, mangaId: string) : Chapter[] { 
    let $ = data
    let chapters: Chapter[] = []

      for(let obj of $('tr', $('#list')).toArray()) {
        let chapterId = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/${mangaId}/`, '')
        let chapNum = chapterId?.replace(`chapter-`, '').trim()
        if(isNaN(Number(chapNum))){
          chapNum = `0.${chapNum?.replace( /^\D+/g, '')}`
        }
        let chapName = $('a', $(obj)).text()
        let time = $($('td', $(obj)).toArray()[1]).text()

        chapters.push(createChapter({
            id: chapterId!,
            mangaId: mangaId,
            chapNum: Number(chapNum),
            langCode: LanguageCode.ENGLISH,
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
              sortedChapters.push(c);
            }
          })
          sortedChapters.sort((a, b) => (a.id > b.id) ? 1 : -1)
          return sortedChapters
    }


    parseChapterDetails(data: CheerioSelector, mangaId: string, chapterId: string) : ChapterDetails {
        let $ = data
        let pages: string[] = []
        if($('img',$('.chapter-container')).toArray().length < 1)
        {
          // Fallback to error image
          pages.push('https://2.bp.blogspot.com/-Vc_P29M_7yk/WdSYg9e6F9I/AAAAAAAAEUI/3K5wt1yFlWEXfMZ6m6-haWMhN1HbjCWSACHMYCw/s0/RCO001.jpg')
        }
        else {
          // Get all of the pages
          for(let obj of $('img',$('.chapter-container')).toArray()) {
            pages.push($(obj).attr('src')!)
          }
        }
    
        return createChapterDetails({
          id: chapterId,
          mangaId: mangaId,
          pages: pages,
          longStrip: false
        })
    }

    filterUpdatedManga(data: CheerioSelector, time: Date, ids: string[] ) : {updates: string[], loadNextPage : boolean} {
    let $ = data
    let foundIds: string[] = []
    let passedReferenceTime = false
    for (let item of $('.hlb-t').toArray()) {
      let id = ($('a', item).first().attr('href') ?? '')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')!.trim() ?? ''
      let mangaTime = new Date(time)
      if($('.date', item).first().text().trim().toLowerCase() === "yesterday") {
        mangaTime = new Date(Date.now())
        mangaTime.setDate(new Date(Date.now()).getDate() - 1)
      }
      else {
        mangaTime = new Date($('.date', item).first().text()) 
      }
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

    parseSearchResults(data: CheerioSelector): MangaTile[] { 
        let $ = data

        let mangaTiles: MangaTile[] = []
        for(let obj of $('.cartoon-box').toArray()) {
            let id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
            let titleText = $('h3', $(obj)).text()
            let image = $('img', $(obj)).attr('src')
      
            if(titleText == "Not found") continue // If a search result has no data, the only cartoon-box object has "Not Found" as title. Ignore.
      
            mangaTiles.push(createMangaTile({
                id: id!,
                title: createIconText({text: titleText}),
                image: image!
            }))
    }
    return mangaTiles
    }

    parseTags(data: CheerioSelector): TagSection[] {
        let $ = data
        let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
        createTagSection({ id: '1', label: 'format', tags: [] })]
    
        for(let obj of $('a', $('.home-list')).toArray()) {
          let id = $(obj).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/`, '')!.trim() ?? $(obj).text().trim()
          let genre = $(obj).text().trim()
          tagSections[0].tags.push(createTag({id: id, label: genre}))
        }
        tagSections[1].tags.push(createTag({id: 'comic/', label: 'Comic'}))
        return tagSections
    }

    parseHomePageSection(data : CheerioSelector): MangaTile[]{
        let $ = data
        let tiles: MangaTile[] = []
        for(let obj of $('.cartoon-box').toArray()) {
            let id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
            let title = $('h3', $(obj)).text().trim()
            let image = $('img', $(obj)).attr('src')
      
            tiles.push(createMangaTile({
                id: id!,
                title: createIconText({text: title}),
                image: image!
            }))
        }
        return tiles
    }
}