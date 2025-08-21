import { NotionAPI } from "notion-client"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const getRecordMap = async (pageId: string, retries = 3) => {
  const api = new NotionAPI()
  
  console.log(`🔄 Starting getRecordMap for pageId: ${pageId} (max retries: ${retries})`)
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📡 Attempt ${attempt}/${retries} for pageId: ${pageId}`)
      const recordMap = await api.getPage(pageId)
      
      console.log(`✅ Success on attempt ${attempt} for pageId: ${pageId}`)
      return recordMap
    } catch (error) {
      console.warn(`❌ Attempt ${attempt} failed for pageId: ${pageId}`)
      
      if (attempt === retries) {
        console.error(`💥 All ${retries} attempts failed for pageId: ${pageId}`)
        throw error
      }
      
      // 400 오류가 아닌 경우 즉시 재시도
      if (error instanceof Error && error.message.includes("400")) {
        const waitTime = attempt * 1000
        console.warn(
          `⏳ Attempt ${attempt} failed for page ${pageId}, retrying in ${waitTime}ms...`
        )
        await delay(waitTime) // 점진적으로 대기 시간 증가
      } else {
        console.error(`🚨 Non-400 error on attempt ${attempt}, not retrying:`, error)
        throw error
      }
    }
  }
}
