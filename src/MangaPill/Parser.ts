import {Manga, MangaStatus, Tag, TagSection, LanguageCode, Chapter, ChapterDetails, MangaTile} from 'paperback-extensions-common'

const MANGAPILL_DOMAIN = 'https://www.mangapill.com'

export class Parser {

    
    parseMangaDetails($: CheerioSelector, mangaId: string): Manga {
    

    let titles = [$('.font-bold.text-xl').text().trim()]
    titles.push($('.text-color-text-secondary', $('div', $('.flex.flex-col').toArray()[4])).text().trim())

    let image = $('.lazy').attr('src')

    let summary = $('p', $('.my-3', $('.flex.flex-col'))).text().trim()

    let status = MangaStatus.ONGOING, author, released, rating: number = 0
    let tagArray0 : Tag[] = []
    let tagArray1 : Tag[] = []
    let i = 0
    for (let item of $('div', $('.grid.gap-2')).toArray()) {
      let descObj = $($(item).toArray()[1])
      switch (i) {
        case 0: {
          // Manga Type
          tagArray1 = [...tagArray1, createTag({id: descObj.text().trim(), label: descObj.text().trim()})]
        }
        case 1: {
          // Manga Status
          if (descObj.text().trim().toLowerCase().includes("publishing")) {
            status = MangaStatus.ONGOING
          }
          else {
            status = MangaStatus.COMPLETED
          }
          i++
          continue
        }
        case 2: {/*
          // Alt Titles
           if(descObj.text().trim().toLowerCase().trim() == "-") {
            i++
            continue
           }
           titles.push($(item).text().trim())*/
          // Date of release
          released = descObj.text().trim() ?? undefined
          i++
          continue

        }
        case 3: {
          // Date of release
          rating = Number(descObj.text().trim().replace(' / 10', '')) ?? undefined
          i++
          continue
        }
        case 4: {
          // Genres
          /*for(let obj of $('a',$(item)).toArray()){
            tagArray0 = [...tagArray0, createTag({id: $(obj).attr('href')?.replace(`${MANGAPILL_DOMAIN}/search?genre=`, '').trim()!, label: $(obj).text().trim()})]
          }*/
          //
          i++
          continue
        }
      }
      i = 0
    }
    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: tagArray0 }), 
    createTagSection({ id: '0', label: 'genres', tags: tagArray1 })]
      return createManga({
        id: mangaId,
        rating: rating,
        titles: titles,
        image: image!,
        status: status,
        author: author,
        tags: tagSections,
        desc: summary,
        lastUpdate: released
      })
    }


    parseChapterList($: CheerioSelector, mangaId: string) : Chapter[] { 
    
    let chapters: Chapter[] = []

      for(let obj of $('tr', $('#list')).toArray()) {
        let chapterId = $('a', $(obj)).attr('href')?.replace(`${MANGAPILL_DOMAIN}/${mangaId}/`, '')
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
              sortedChapters.push(c)
            }
          })
          sortedChapters.sort((a, b) => (a.id > b.id) ? 1 : -1)
          return sortedChapters
    }


    parseChapterDetails($: CheerioSelector, mangaId: string, chapterId: string) : ChapterDetails {
        const fallback = 'https://cdn.discordapp.com/attachments/549267639881695289/801836271407726632/fallback.png'
        let pages: string[] = []
        // Get all of the pages
        for(let obj of $('img',$('.chapter-container')).toArray()) {
          let image = $(obj).attr('src')!
          if(image === undefined || (image.includes('.jpg') && image.includes('/RCO'))) {
            // Fallback to error image
            pages.push(fallback)
          }
          else{
            pages.push(image)
          }
        }
        // Fallback if empty
        if(pages.length < 1) {
          pages.push(fallback)
        }
    
        return createChapterDetails({
          id: chapterId,
          mangaId: mangaId,
          pages: pages,
          longStrip: false
        })
    }

    filterUpdatedManga($: CheerioSelector, time: Date, ids: string[] ) : {updates: string[], loadNextPage : boolean} {
    
    let foundIds: string[] = []
    let passedReferenceTime = false
    for (let item of $('.hlb-t').toArray()) {
      let id = ($('a', item).first().attr('href') ?? '')?.replace(`${MANGAPILL_DOMAIN}/manga/`, '')!.trim() ?? ''
      let mangaTime = new Date(time)
      if($('.date', item).first().text().trim().toLowerCase() === "yesterday") {
        // For testing
        // mangaTime = new Date(Date.now())
        // mangaTime.setDate(new Date(Date.now()).getDate() - 1)
        mangaTime.setDate(time.getDate() - 1)
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

    parseSearchResults($: CheerioSelector): MangaTile[] { 
        
        let mangaTiles: MangaTile[] = []
        for(let obj of $('.cartoon-box').toArray()) {
            let id = $('a', $(obj)).attr('href')?.replace(`${MANGAPILL_DOMAIN}/manga/`, '')
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

    parseTags($: CheerioSelector): TagSection[] {
        
        let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
        createTagSection({ id: '1', label: 'format', tags: [] })]
    
        for(let obj of $('a', $('.home-list')).toArray()) {
          let id = $(obj).attr('href')?.replace(`${MANGAPILL_DOMAIN}/`, '')!.trim() ?? $(obj).text().trim()
          let genre = $(obj).text().trim()
          tagSections[0].tags.push(createTag({id: id, label: genre}))
        }
        tagSections[1].tags.push(createTag({id: 'manga/', label: 'Manga'}))
        return tagSections
    }

    parseHomePageSection($ : CheerioSelector): MangaTile[]{
        
        let tiles: MangaTile[] = []
        for(let obj of $('.cartoon-box').toArray()) {
            let id = $('a', $(obj)).attr('href')?.replace(`${MANGAPILL_DOMAIN}/manga/`, '')
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
    isLastPage($: CheerioSelector): boolean {
      for(let obj of $('a', $('.general-nav')).toArray()) {
        if($(obj).text().trim().toLowerCase() == 'next') {
          return false
        }
      }
      return true
    }
}