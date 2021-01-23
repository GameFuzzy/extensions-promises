import {Manga, MangaStatus, Tag, TagSection, LanguageCode, Chapter, ChapterDetails, MangaTile} from 'paperback-extensions-common'

const MANGAPILL_DOMAIN = 'https://www.mangapill.com'

export class Parser {

    
    parseMangaDetails($: CheerioSelector, mangaId: string): Manga {
    

    let titles = [$('.font-bold.text-xl').text().trim()]
    let altTitle = $('.text-color-text-secondary', $('div:nth-child(1)', $('.flex.flex-col'))).last().text().trim()
    if(altTitle != 'Title') {
      titles.push(altTitle)
    }
    let image = $('.lazy').attr('src')
    let summary = $('p', $('.my-3', $('.flex.flex-col'))).text().trim()

    let status = MangaStatus.ONGOING, released, rating: number = 0
    let tagArray0 : Tag[] = []
    let tagArray1 : Tag[] = []
    for(let obj of $('a[href*=genre]').toArray()){
      let id = $(obj).attr('href')?.replace(`/search?genre=`, '').trim()
      let label = $(obj).text().trim()
      if (typeof id === 'undefined' || typeof label === 'undefined') continue
      tagArray0 = [...tagArray0, createTag({id: id, label: $(obj).text().trim()})]
    }
    let i = 0
    for (let item of $('div', $('.grid.gap-2')).toArray()) {
      let descObj = $('div', $(item))
      if(!descObj.html()) {
        continue
      }
      switch (i) {
        case 0: {
          // Manga Type
          tagArray1 = [...tagArray1, createTag({id: descObj.text().trim(), label: descObj.text().trim().replace(/^\w/, (c) => c.toUpperCase())})]
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
        case 2: {
          // Date of release
          released = descObj.text().trim() ?? undefined
          i++
          continue
        }
        case 3: {
          // Rating
          rating = Number(descObj.text().trim().replace(' / 10', '')) ?? undefined
          i++
          continue
        }
      }
      i = 0
    }
    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: tagArray0 }), 
    createTagSection({ id: '1', label: 'format', tags: tagArray1 })]
      return createManga({
        id: mangaId,
        rating: rating,
        titles: titles,
        image: image ?? '',
        status: status,
        tags: tagSections,
        desc: summary,
        lastUpdate: released
      })
    }


    parseChapterList($: CheerioSelector, mangaId: string) : Chapter[] { 
    
    let chapters: Chapter[] = []

      for(let obj of $('option', $('select[name=view-chapter]')).toArray()) {
        let chapterId = $(obj).attr('value')
        if(chapterId == 'Read Chapters') {
          continue
        }
        let chapNum = $(obj).text().trim()?.replace(`Chapter `, '')
        if(isNaN(Number(chapNum))){
          chapNum = `0.${chapNum?.replace( /^\D+/g, '')}`
        }
        let chapName = $(obj).text()
        if (typeof chapterId === 'undefined') continue
        chapters.push(createChapter({
            id: chapterId,
            mangaId: mangaId,
            chapNum: Number(chapNum),
            langCode: LanguageCode.ENGLISH,
            name: chapName
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
      for(let obj of $('img',$('picture')).toArray()) {
        let page = $(obj).attr('data-src')
        if(typeof page === 'undefined') continue
        pages.push(page)
      }
      return pages
  }

    filterUpdatedManga($: CheerioSelector, time: Date, ids: string[] ) : {updates: string[], loadNextPage : boolean} {
    let foundIds: string[] = []
    let passedReferenceTime = false
    for (let item of $('.font-medium.text-color-text-primary').toArray()) {
      let href = ($(item).attr('href') ?? '')
      let id = href.split('-')[0].split('/').pop() + '/' + href.split('/').pop()?.split('-chapter')[0].trim()
      let mangaTime = new Date(time)
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
      let collectedIds: string[] = []
      for(let obj of $('div', $('.grid.gap-3')).toArray()) {
          let id = $('a', $(obj)).attr('href')?.replace(`/manga/`, '')
          let encodedTitleText = $('a', $('div', $(obj))).text()

          // Decode title
          let titleText = encodedTitleText.replace(/&#(\d+);/g, function(match, dec) {
            return String.fromCharCode(dec);
          })

          let image = $('img', $('a', $(obj))).attr('data-src')

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

    parseTags($: CheerioSelector): TagSection[] {
      let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
      createTagSection({ id: '1', label: 'format', tags: [] })]
  
      for(let obj of $('Label', $('.gap-2')).toArray()) {
        let genre = $(obj).text().trim()
        let id = $('input', $(obj)).attr('value') ?? genre
        tagSections[0].tags.push(createTag({id: id, label: genre}))
      }
      tagSections[1].tags.push(createTag({id: 'manga', label: 'Manga'}))
      return tagSections
  }

    parsePopularSection($ : CheerioSelector): MangaTile[]{
      let mangaTiles: MangaTile[] = []
      let collectedIds: string[] = []
      for(let obj of $('div', $('.grid.gap-3')).toArray()) {
          let id = $('a', $(obj)).attr('href')?.replace(`/manga/`, '')
          let encodedTitleText = $('a', $('div', $(obj))).text()

          // Decode title
          let titleText = encodedTitleText.replace(/&#(\d+);/g, function(match, dec) {
            return String.fromCharCode(dec);
          })

          let image = $('img', $('a', $(obj))).attr('data-src')

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

    // Add featured section back in whenever a section type for that comes around
    
    /*
    parseFeaturedSection($ : CheerioSelector): MangaTile[]{
      let mangaTiles: MangaTile[] = []
      for(let obj of $('div[class=relative]').toArray()) {
        let href = ($('a', $(obj)).attr('href') ?? '')
        let id = href.split('-')[0].split('/').pop() + '/' + href.split('/').pop()?.split('-chapter')[0].trim()
        let titleText = $('.text-sm', $('.text-color-text-fire-ch', $('div', $(obj)))).text()
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
    parseRecentUpdatesSection($ : CheerioSelector): MangaTile[]{
      let mangaTiles: MangaTile[] = []
      let collectedIds: string[] = []
      for(let obj of $('.mb-2.rounded.border').toArray()) {
        let href = ($('a', $(obj)).attr('href') ?? '')
        let id = href.split('-')[0].split('/').pop() + '/' + href.split('/').pop()?.split('-chapter')[0].trim()
        let encodedTitleText = $('a', $('.mb-2', $('.p-3', $(obj)))).text().split(' Chapter')[0]

        // Decode title
        let titleText = encodedTitleText.replace(/&#(\d+);/g, function(match, dec) {
          return String.fromCharCode(dec);
        })
        
        let image = $('img', $('a', $(obj))).attr('data-src')
        
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

    isLastPage($: CheerioSelector): boolean {
      return $('a:contains("Next")').length < 1
    }
}