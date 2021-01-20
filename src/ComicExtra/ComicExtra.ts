import {
  Source,
  Manga,
  MangaStatus,
  Chapter,
  ChapterDetails,
  HomeSection,
  MangaTile,
  SearchRequest,
  LanguageCode,
  TagSection,
  PagedResults,
  SourceInfo,
  MangaUpdates,
  TagType
} from "paperback-extensions-common"

const COMICEXTRA_DOMAIN = 'https://www.comicextra.com'

export const ComicExtraInfo: SourceInfo = {
  version: '1.2.4',
  name: 'ComicExtra',
  description: 'Extension that pulls western comics from ComicExtra.com',
  author: 'GameFuzzy',
  authorWebsite: 'http://github.com/gamefuzzy',
  icon: "icon.png",
  hentaiSource: false,
  websiteBaseURL: COMICEXTRA_DOMAIN,
  sourceTags: [
    {
      text: "Work in progress",
      type: TagType.RED
    },
    {
      text: "Notifications",
      type: TagType.GREEN
    }
  ]
}

export class ComicExtra extends Source {
  getMangaShareUrl(mangaId: string): string | null { return `${COMICEXTRA_DOMAIN}/comic/${mangaId}` }

  async getMangaDetails(mangaId: string): Promise<Manga> {

    let request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}/comic/${mangaId}`,
      method: 'GET'
    })

    const data = await this.requestManager.schedule(request, 1)

    let manga: Manga[] = []
    let $ = this.cheerio.load(data.data)

    let titles = [$('.title-1', $('.mobile-hide')).text().trimStart()]
    let image = $('img', $('.movie-l-img')).attr('src')

    let summary = $('#film-content', $('#film-content-wrapper')).text().trim()
    let relatedIds: string[] = []
    for(let obj of $('.list-top-item').toArray()) {
        relatedIds.push($('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')!.trim() || '')
    }

    let status = MangaStatus.ONGOING, author, released, rating: number = 0
    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
    createTagSection({ id: '1', label: 'format', tags: [] })]
    let i = 0
    for (let item of $('.movie-dd', $('.movie-dl')).toArray()) {
      switch (i) {
        case 0: {
          tagSections[1].tags.push(createTag({id: $(item).text().trim(), label: $(item).text().trim()}))
          i++
          continue
        }
        case 1: {
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
        case 2: {
          // Alt Titles
           if($(item).text().toLowerCase().trim() == "-") {
            i++
            continue
           }
           titles.push($(item).text().trim())
          i++
          continue
        }
        case 3: {
          // Date of release
          released = ($(item).text().trim()) ?? undefined
          i++
          continue
        }
        case 4: {
          // Author
          author = ($(item).text().trim()) ?? undefined
          i++
          continue
          }
        case 5: {
          // Genres
          let genres = $(item).text().trim().split(', ')          
          genres.forEach(function(genre) {
            tagSections[0].tags.push(createTag({id: $(item).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/`, '')!.trim() ?? genre.trim(), label: genre.trim()}))
          })
          i++
          continue
        }
      }
      i = 0
    }
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


  async getChapters(mangaId: string): Promise<Chapter[]> {
    let request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}/comic/${mangaId}`,
      method: "GET"
    })

    const data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data)

    let chapters: Chapter[] = []
    let pagesLeft = $('a', $('.general-nav')).toArray().length
    pagesLeft = pagesLeft == 0 ? 1 : pagesLeft

    while(pagesLeft > 0)
    {
      let pageRequest = createRequestObject({
        url: `${COMICEXTRA_DOMAIN}/comic/${mangaId}/${pagesLeft}`,
        method: "GET"
      })
      const pageData = await this.requestManager.schedule(pageRequest, 1)
      $ = this.cheerio.load(pageData.data)
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
      pagesLeft--
    }
    let sortedChapters: Chapter[] = []
    
    // Sorts all the chapters and filters duplicates
    chapters.forEach((c) => {
      if (sortedChapters[sortedChapters.indexOf(c)]?.id !== c?.id) {
        sortedChapters.push(c);
      }
    })
    sortedChapters.sort((a, b) => (a.id > b.id) ? 1 : -1)
    return sortedChapters
  }



  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {

    let request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}/${mangaId}/${chapterId}/full`,
      method: 'GET',
    })

    const data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let pages: string[] = []

    // Get all of the pages
    for(let obj of $('.chapter_img').toArray()) {
      pages.push($(obj).attr('src')!)
  }

    return createChapterDetails({
      id: chapterId,
      mangaId: mangaId,
      pages: pages,
      longStrip: false
    })
  }

  async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {

    let loadNextPage: boolean = true
    let currPageNum: number = 1

    while (loadNextPage) {

      let request = createRequestObject({
        url: `${COMICEXTRA_DOMAIN}/comic-updates/${String(currPageNum)}`,
        method: 'GET'
      })

      let data = await this.requestManager.schedule(request, 1)

      let $ = this.cheerio.load(data.data)

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

      if (!passedReferenceTime) {
        currPageNum++
      }

      else {
        loadNextPage = false
      }

      mangaUpdatesFoundCallback(createMangaUpdates({
        ids: foundIds
      }))
    }
  }

  async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {

    let request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}/comic-search?key=${query.title}`,
      method: "GET"
    })

    const data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
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

    return createPagedResults({
      results: mangaTiles
    })

  }


  async getTags(): Promise<TagSection[] | null> {
    const request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}/comic-genres/`,
      method: 'GET'
    })

    const data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data)

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

  async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> {
    let page = ''
    switch (homepageSectionId) {
      case 'popular_comics': {
        page = `/popular-comic/${metadata.page ? metadata.page : 1}`
        break
      }
      case 'recently_released_comics': {
        page = `/recent-comic/${metadata.page ? metadata.page : 1}`
        break
      }
      case 'new_comics': {
        page = `/new-comic/${metadata.page ? metadata.page : 1}`
        break
      }
      default: return Promise.resolve(null)
    }

    let request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}${page}`,
      method: 'GET',
      metadata: metadata
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let manga: MangaTile[] = []

    for(let obj of $('.cartoon-box').toArray()) {
      let id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
      let title = $('h3', $(obj)).text().trim()
      let image = $('img', $(obj)).attr('src')

      manga.push(createMangaTile({
          id: id!,
          title: createIconText({text: title}),
          image: image!
      }))
    }

    /*if (!this.isLastPage($)) {
      metadata.page ? metadata.page++ : metadata.page = 2
    }
    else {
      metadata = undefined  // There are no more pages to continue on to, do not provide page metadata
    }*/

    return createPagedResults({
      results: manga,
      metadata: metadata
    })
  }
  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {

    // Let the app know what the homesections are without filling in the data
    let popularSection = createHomeSection({ id: 'popular_comics', title: 'POPULAR COMICS', view_more: true })
    let recentSection = createHomeSection({ id: 'recently_released_comics', title: 'RECENTLY ADDED COMICS', view_more: true })
    let newTitlesSection = createHomeSection({ id: 'new_comics', title: 'LATEST COMICS', view_more: true })
    sectionCallback(popularSection)
    sectionCallback(recentSection)
    sectionCallback(newTitlesSection)

    // Make the request and fill out available titles
    let request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}/popular-comic`,
      method: 'GET'
    })

    const popularData = await this.requestManager.schedule(request, 1)

    let popular: MangaTile[] = []
    let $ = this.cheerio.load(popularData.data)

    for(let obj of $('.cartoon-box').toArray()) {
      let id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
      let title = $('h3', $(obj)).text().trim()
      let image = $('img', $(obj)).attr('src')

      popular.push(createMangaTile({
          id: id!,
          title: createIconText({text: title}),
          image: image!
      }))
  }

    popularSection.items = popular
    sectionCallback(popularSection)


    let recent: MangaTile[] = []

    request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}/recent-comic`,
      method: 'GET'
    })

    const latestData = await this.requestManager.schedule(request, 1)
    $ = this.cheerio.load(latestData.data)

    for(let obj of $('.cartoon-box').toArray()) {
      let id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
      let title = $('h3', $(obj)).text().trim()
      let image = $('img', $(obj)).attr('src')

      recent.push(createMangaTile({
          id: id!,
          title: createIconText({text: title}),
          image: image!
      }))
  }

    recentSection.items = recent
    sectionCallback(recentSection)

    let newTitles: MangaTile[] = []

    request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}/new-comic`,
      method: 'GET'
    })

    const newData = await this.requestManager.schedule(request, 1)
    $ = this.cheerio.load(newData.data)

    for(let obj of $('.cartoon-box').toArray()) {
      let id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
      let title = $('h3', $(obj)).text().trim()
      let image = $('img', $(obj)).attr('src')

      newTitles.push(createMangaTile({
          id: id!,
          title: createIconText({text: title}),
          image: image!
      }))
    }

    newTitlesSection.items = newTitles
    sectionCallback(newTitlesSection)
  }
  
}
