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
  
  const READALLCOMICS_DOMAIN = 'https://readallcomics.com'
  
  export const ReadAllComicsInfo: SourceInfo = {
    version: '0.0.1',
    name: 'ReadAllComics',
    description: 'Extension that pulls western comics from ReadAllComics.com',
    author: 'GameFuzzy',
    authorWebsite: 'http://github.com/gamefuzzy',
    icon: "logo.png",
    hentaiSource: false,
    websiteBaseURL: READALLCOMICS_DOMAIN,
  }
  
  export class ReadAllComics extends Source {
    getMangaShareUrl(mangaId: string): string | null { return `${READALLCOMICS_DOMAIN}/category/${mangaId}` }
  
    async getMangaDetails(mangaId: string): Promise<Manga> {
  
      let request = createRequestObject({
        url: `${READALLCOMICS_DOMAIN}/category/${mangaId}`,
        method: 'GET'
      })
  
      const data = await this.requestManager.schedule(request, 1)
  
      let manga: Manga[] = []
      let $ = this.cheerio.load(data.data)
  
      let titles: string[] = []
      $('div[id="description-archive"]').find('h1 > b').each(function (index, element) {
        titles.push($(element).text().trim());
      });
      let image = $('div[id="description-archive"]').find('img').attr('src')
  
      let status, author, released, views, rating: number = 0
      let tags: TagSection[] = [createTagSection({ id: 'genres', label: 'genres', tags: [] })]
      let i = 0
      for (let item of $('dd', $('.dl-horizontal')).toArray()) {
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
            // Date of release
            released = ($(item).text().trim()) ?? undefined
            i++
            continue
          }
          case 3: {
            i++
            continue
          }
          case 4: {
            // Genres (Cannot be parsed due to ::before and ::after tags, look into this later)
            i++
            continue
          }
          case 5: {
            views = Number($(item).text()) ?? -1
            i++
            continue
          }
          case 6: {
            // Rating
            rating = Number($('#item-rating', $(item)).attr('data-score')) ?? -1
            i++
            continue
          }
        }
        i = 0
      }
  
      let summary = $('p', $('.well')).text().trim()
  
      return createManga({
        id: mangaId,
        rating: rating,
        titles: titles,
        image: `http:${image!}`,
        status: Number(status),
        lastUpdate: released,
        tags: tags,
        desc: summary
      })
    }
  
  
    async getChapters(mangaId: string): Promise<Chapter[]> {
  
      let request = createRequestObject({
        url: `${READALLCOMICS_DOMAIN}/${mangaId}`,
        method: "GET"
      })
  
      const data = await this.requestManager.schedule(request, 1)
  
      let $ = this.cheerio.load(data.data)
      let chapters: Chapter[] = []
  
      for (let obj of $('li', $('.chapters')).toArray()) {
        let id = $('a', $(obj)).attr('href')?.replace(`${READALLCOMICS_DOMAIN}/${mangaId}/`, '')
        let chapNum = Number(id)
        let name = $('a', $(obj)).text().trim()
        let time = new Date($('.date-chapter-title-rtl', $(obj)).text().trim())
  
        // If we parsed a bad ID out, don't include this in our list
        if (!id) {
          continue
        }
  
        chapters.push(createChapter({
          id: id,
          mangaId: mangaId,
          chapNum: chapNum,
          langCode: LanguageCode.ENGLISH,
          name: name,
          time: time
        }))
      }
  
      return chapters
    }
  
  
    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
  
      let request = createRequestObject({
        url: `${READALLCOMICS_DOMAIN}/${mangaId}/${chapterId}`,
        method: 'GET',
      })
  
      const data = await this.requestManager.schedule(request, 1)
  
      let $ = this.cheerio.load(data.data)
      let pages: string[] = []
  
      // Get all of the pages
      let pageListContext = $('#page-list').toArray()[0]
      let numPages = $('option', $(pageListContext)).toArray().length
  
      for (let i = 1; i <= numPages; i++) {
  
        // Pages when below 10 are listed as 01, 02 etc. Enforce this
        let y
        if (i < 10) {
          y = '0' + i + '.jpg'
        }
        else {
          y = i + '.jpg'
        }
  
        pages.push(`${READALLCOMICS_DOMAIN}/uploads/manga/${mangaId}/chapters/${chapterId}/${y}`)
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
        url: `${READALLCOMICS_DOMAIN}/search`,
        method: "GET"
      })
  
      const data = await this.requestManager.schedule(request, 1)
  
      let mangaTiles: MangaTile[] = []
  
      let obj = JSON.parse(data.data)
  
      // Parse the json context
      for (let entry of obj.suggestions) {
        // Is this relevent to the query?
        if (entry.value.toLowerCase().includes(metadata.searchQuery)) {
          let image = `${READALLCOMICS_DOMAIN}/uploads/manga/${entry.data}/cover/cover_250x350.jpg`
  
          mangaTiles.push(createMangaTile({
            id: entry.data,
            title: createIconText({ text: entry.value }),
            image: image
          }))
        }
      }
  
      // Because we're reading JSON, there will never be another page to search through
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
        url: `${READALLCOMICS_DOMAIN}`,
        method: 'GET'
      })
  
      const data = await this.requestManager.schedule(request, 1)
  
      let popularComics: MangaTile[] = []
      let $ = this.cheerio.load(data.data)
  
      let context = $('.list-container').toArray()[2]
      for (let obj of $('.col-sm-6', $(context)).toArray()) {
        let img = `https:${$('img', $(obj)).attr('src')}`
        let id = $('a', $(obj)).attr('href')?.replace(`${READALLCOMICS_DOMAIN}/`, '')
        let title = $('strong', $(obj)).text().trim()
  
        // If there was not a valid ID parsed, skip this entry
        if (!id) {
          continue
        }
  
        // Ensure that this title doesn't exist in the tile list already, as it causes weird glitches if so.
        // This unfortunately makes this method O(n^2) but there never will be many elements
        let foundItem = false
        for (let item of popularComics) {
          if (item.id == id) {
            foundItem = true
            break
          }
        }
  
        if (foundItem) {
          continue
        }
  
        popularComics.push(createMangaTile({
          id: id,
          title: createIconText({ text: title }),
          image: img
        }))
      }
  
      latest_comics.items = popularComics
  
      sectionCallback(latest_comics)
    }
  }