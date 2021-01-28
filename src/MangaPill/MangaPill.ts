import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  TagSection,
  PagedResults,
  SourceInfo,
  MangaUpdates,
  TagType,
} from "paperback-extensions-common"

import {
  Parser,
} from './Parser'

const MANGAPILL_DOMAIN = 'https://www.mangapill.com'

export const MangaPillInfo: SourceInfo = {
  version: '1.0.5',
  name: 'MangaPill',
  description: 'Extension that pulls manga from MangaPill, has a lot of officially translated manga (can sometimes miss manga notifications)',
  author: 'GameFuzzy',
  authorWebsite: 'http://github.com/gamefuzzy',
  icon: "icon.png",
  hentaiSource: false,
  websiteBaseURL: MANGAPILL_DOMAIN,
  sourceTags: [
    {
      text: "Notifications",
      type: TagType.GREEN
    }
  ]
}

export class MangaPill extends Source {
  parser = new Parser()
  getMangaShareUrl(mangaId: string): string | null { return `${MANGAPILL_DOMAIN}/manga/${mangaId}` }

  async getMangaDetails(mangaId: string): Promise<Manga> {

    let request = createRequestObject({
      url: `${MANGAPILL_DOMAIN}/manga/${mangaId}`,
      method: 'GET'
    })
    const data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)

    return this.parser.parseMangaDetails($, mangaId)
  }


  async getChapters(mangaId: string): Promise<Chapter[]> {
    let chapters: Chapter[] = []
      let pageRequest = createRequestObject({
        url: `${MANGAPILL_DOMAIN}/manga/${mangaId}`,
        method: "GET"
      })
      const pageData = await this.requestManager.schedule(pageRequest, 1)
      let $ = this.cheerio.load(pageData.data)
      chapters = chapters.concat(this.parser.parseChapterList($, mangaId))
    
    return this.parser.sortChapters(chapters)
  }


  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    let request = createRequestObject({
      url: `${MANGAPILL_DOMAIN}${chapterId}`,
      method: 'GET',
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let pages = this.parser.parseChapterDetails($)

    return createChapterDetails({
      id: chapterId,
      mangaId: mangaId,
      pages: pages,
      longStrip: false
    })
  }

  async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {

      let request = createRequestObject({
        url: `${MANGAPILL_DOMAIN}`,
        method: 'GET'
      })

      let data = await this.requestManager.schedule(request, 1)
      let $ = this.cheerio.load(data.data)

      let updatedManga = this.parser.filterUpdatedManga($, time, ids)

      if (updatedManga.updates.length > 0) {
      mangaUpdatesFoundCallback(createMangaUpdates({
        ids: updatedManga.updates
      }))
      }
    
  }

  async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {
    let page : number = metadata?.page ?? 1
    let genres = '&genre=' + (query.includeGenre ?? []).join('&genre=')
    let format = '&type=' + (query.includeFormat ?? '')
    let status = ''
    switch (query.status) {
      case 0: status = '&status=2'; break
      case 1: status = '&status=1'; break
      default: status = ''
    }
    let request = createRequestObject({
      url: `${MANGAPILL_DOMAIN}/search`,
      method: "GET",
      param: `?page=${page}&title=${query.title?.replace(/ /gi, '+')}${format}${status}${genres}`
    })

    let data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data)
    let manga = this.parser.parseSearchResults($)
    let mData
    if (!this.parser.isLastPage($)) {
      mData = {page: (page + 1)}
    }
    else {
      mData = undefined  // There are no more pages to continue on to, do not provide page metadata
    }

    return createPagedResults({
      results: manga,
      metadata: mData
    })

  }


  async getTags(): Promise<TagSection[] | null> {
    const request = createRequestObject({
      url: `${MANGAPILL_DOMAIN}/search`,
      method: 'GET'
    })

    const data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data)

    return this.parser.parseTags($)
  }


  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {

    // Let the app know what the homesections are without filling in the data
    
    // Add featured section back in whenever a section type for that comes around
    
    //let featuredSection = createHomeSection({ id: '0', title: 'FEATURED MANGA', view_more: true })
    let recentUpdatesSection = createHomeSection({ id: '1', title: 'RECENTLY UPDATED MANGA', view_more: true })
    let popularSection = createHomeSection({ id: '2', title: 'POPULAR MANGA', view_more: true })
    //sectionCallback(featuredSection)
    sectionCallback(recentUpdatesSection)
    sectionCallback(popularSection)

    // Make the requests and fill out available titles
/*
    let request = createRequestObject({
      url: `${MANGAPILL_DOMAIN}`,
      method: 'GET'
    })

    const recentData = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(recentData.data)

    featuredSection.items = this.parser.parseFeaturedSection($)
    sectionCallback(featuredSection)
*/
    let request = createRequestObject({
      url: `${MANGAPILL_DOMAIN}`,
      method: 'GET'
    })

    const newData = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(newData.data)

    recentUpdatesSection.items = this.parser.parseRecentUpdatesSection($)
    sectionCallback(recentUpdatesSection)

    request = createRequestObject({
      url: `${MANGAPILL_DOMAIN}/search?title=&type=&status=1`,
      method: 'GET'
    })

    const popularData = await this.requestManager.schedule(request, 1)
    $ = this.cheerio.load(popularData.data)

    popularSection.items = this.parser.parsePopularSection($)
    sectionCallback(popularSection)
  }

  async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> {
    let page : number = metadata?.page ?? 1
    let manga
    let mData = undefined
    switch (homepageSectionId) {
      /*
      case '0': {
        let request = createRequestObject({
          url: `${MANGAPILL_DOMAIN}`,
          method: 'GET'
        })
    
        let data = await this.requestManager.schedule(request, 1)
        let $ = this.cheerio.load(data.data)

        manga = this.parser.parseFeaturedSection($)
        break
      }
      */
      case '1': {
        let request = createRequestObject({
          url: `${MANGAPILL_DOMAIN}`,
          method: 'GET'
        })
    
        let data = await this.requestManager.schedule(request, 1)
        let $ = this.cheerio.load(data.data)

        manga = this.parser.parseRecentUpdatesSection($)
        break
      }
      case '2': {
        let request = createRequestObject({
          url: `${MANGAPILL_DOMAIN}/search?title=&type=&status=1&page=${page}`,
          method: 'GET'
        })
    
        let data = await this.requestManager.schedule(request, 1)
        let $ = this.cheerio.load(data.data)

        manga = this.parser.parsePopularSection($)
        if (!this.parser.isLastPage($)) {
          mData = {page: (page + 1)}
        }

        break
      }
      default: return Promise.resolve(null)
    }

    return createPagedResults({
      results: manga,
      metadata: mData
    })
  }

  cloudflareBypassRequest() {
    return createRequestObject({
      url: `${MANGAPILL_DOMAIN}`,
      method: 'GET',
    })
  }

}
