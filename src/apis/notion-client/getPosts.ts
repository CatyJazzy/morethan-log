import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

// TODO: react query를 사용해서 처음 불러온 뒤로는 해당데이터만 사용하도록 수정
export const getPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  const api = new NotionAPI()

  try {
    const response = await api.getPage(id)
    id = idToUuid(id)
    const collection = Object.values(response.collection)[0]?.value
    const block = response.block
    const schema = collection?.schema

    const rawMetadata = block[id].value

    // Check Type
    if (
      rawMetadata?.type !== "collection_view_page" &&
      rawMetadata?.type !== "collection_view"
    ) {
      return []
    } else {
      // Construct Data
      const pageIds = getAllPageIds(response)
      console.log(`Total pages found: ${pageIds.length}`)
      
      const data = []
      for (let i = 0; i < pageIds.length; i++) {
        const id = pageIds[i]
        try {
          const properties = (await getPageProperties(id, block, schema)) || null
          
          // 페이지 상세 정보 로깅
          const pageInfo = {
            id: id,
            title: properties.title || 'No title',
            slug: properties.slug || 'No slug',
            status: properties.status || [],
            type: properties.type || [],
            category: properties.category || [],
            tags: properties.tags || [],
            createdTime: block[id].value?.created_time,
            lastEditedTime: block[id].value?.last_edited_time,
            hasThumbnail: !!properties.thumbnail,
            fullWidth: (block[id].value?.format as any)?.page_full_width ?? false,
            // 페이지 크기 추정 (블록 수)
            blockCount: Object.keys(block).filter(key => key.startsWith(id)).length,
          }
          
          console.log(`Page ${i + 1}/${pageIds.length}:`, {
            id: pageInfo.id,
            title: pageInfo.title,
            slug: pageInfo.slug,
            status: pageInfo.status,
            type: pageInfo.type,
            category: pageInfo.category,
            tags: pageInfo.tags,
            blockCount: pageInfo.blockCount,
            hasThumbnail: pageInfo.hasThumbnail,
            fullWidth: pageInfo.fullWidth,
            createdTime: pageInfo.createdTime,
            lastEditedTime: pageInfo.lastEditedTime,
          })

          // Add fullwidth, createdtime to properties
          properties.createdTime = new Date(
            block[id].value?.created_time
          ).toString()
          properties.fullWidth =
            (block[id].value?.format as any)?.page_full_width ?? false

          data.push(properties)
        } catch (error) {
          console.warn(`Failed to get properties for page ${id}:`, error)
          // 실패한 페이지 정보도 로깅
          console.error(`Failed page details:`, {
            id: id,
            error: error instanceof Error ? error.message : 'Unknown error',
            blockExists: !!block[id],
            blockType: block[id]?.value?.type,
            createdTime: block[id]?.value?.created_time,
            lastEditedTime: block[id]?.value?.last_edited_time,
          })
          // Skip this page and continue with others
          continue
        }
      }

      console.log(`Successfully processed ${data.length}/${pageIds.length} pages`)

      // Sort by date
      data.sort((a: any, b: any) => {
        const dateA: any = new Date(a?.date?.start_date || a.createdTime)
        const dateB: any = new Date(b?.date?.start_date || b.createdTime)
        return dateB - dateA
      })

      const posts = data as TPosts
      return posts
    }
  } catch (error) {
    console.error("Failed to get posts:", error)
    return []
  }
}
