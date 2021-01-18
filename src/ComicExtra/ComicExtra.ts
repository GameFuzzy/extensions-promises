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
  SourceInfo
} from "paperback-extensions-common"

const COMICEXTRA_DOMAIN = 'https://www.comicextra.com'

export const ComicExtraInfo: SourceInfo = {
  version: '1.0.0',
  name: 'ComicExtra',
  description: 'Extension that pulls western comics from ComicExtra.com',
  author: 'GameFuzzy',
  authorWebsite: 'http://github.com/gamefuzzy',
  icon: "icon.png",
  hentaiSource: false,
  websiteBaseURL: COMICEXTRA_DOMAIN,
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

    let titles = [$('.title-1').text()]
    let image = $('img', $('.movie-l-img')).attr('src')

    let summary = $('#film-content', $('#film-content-wrapper')).text().trim()

    let status, author, released, views, rating: number = 0
    let tags: TagSection[] = [createTagSection({ id: 'genres', label: 'genres', tags: [] })]
    let i = 0
    for (let item of $('dd', $('.movie-dl')).toArray()) {
      switch (i) {
        case 0: {
          i++
          continue
        }
        case 1: {
          // Comic Status
          if ($(item).text().toLowerCase().includes("ongoing")) {
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
          // Genres (Cannot be parsed due to ::before and ::after tags, look into this later)
               // Genres
               let genres = $(item).text().split(",")
               for(let genre in genres) {
                   tags[0].tags.push(createTag({id: genre.trim(), label: genre.trim()}))
               }
               i++
               continue
          
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
      image: `${image!}`,
      status: Number(status),
      lastUpdate: released,
      tags: tags,
      desc: summary
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
    let i = $('tr', $('#list')).toArray().length
    for(let obj of $('tr', $('#list')).toArray()) {
        let chapterId = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/${mangaId}/`, '')
        let chapNum = i
        let chapName = $('a', $(obj)).text()
        let time = $($('td', $(obj)).toArray()[1]).text()

        i--
        chapters.push(createChapter({
            id: chapterId!,
            mangaId: mangaId,
            chapNum: chapNum,
            langCode: LanguageCode.ENGLISH,
            name: chapName,
            time: new Date(time)
        }))
    }
    return chapters
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


  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {

    // Let the app know what the homsections are without filling in the data
    let latest_comics = createHomeSection({ id: 'latest_comics', title: 'LATEST COMICS' })
    sectionCallback(latest_comics)

    // Make the request and fill out available titles
    let request = createRequestObject({
      url: `${COMICEXTRA_DOMAIN}`,
      method: 'GET'
    })

    const data = await this.requestManager.schedule(request, 1)

    let popularComics: MangaTile[] = []
    let $ = this.cheerio.load(data.data)

    for(let obj of $('.cartoon-box').toArray()) {
      let id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
      let title = $('h3', $(obj)).text().trim()
      let image = $('img', $(obj)).attr('src')

      popularComics.push(createMangaTile({
          id: id!,
          title: createIconText({text: title}),
          image: image!
      }))
  }

    latest_comics.items = popularComics

    sectionCallback(latest_comics)
  }
}