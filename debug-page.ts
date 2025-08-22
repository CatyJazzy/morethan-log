import { NotionAPI } from "notion-client"

async function debugPage() {
  const api = new NotionAPI()
  const pageId = "21dd364a-4963-80c3-b91b-ecb0c08033c4"

  console.log(`🔍 Debugging page: ${pageId}`)

  try {
    // 1. 페이지 정보 가져오기 시도
    console.log("📡 Attempting to get page...")
    const page = await api.getPage(pageId)
    console.log("✅ Page retrieved successfully!")
    console.log("Page type:", page.block[pageId]?.value?.type)
    console.log("Page alive:", page.block[pageId]?.value?.alive)
    console.log("Page parent:", page.block[pageId]?.value?.parent_id)
  } catch (error) {
    console.error("❌ Failed to get page:")
    console.error(
      "Error name:",
      error instanceof Error ? error.name : "Unknown"
    )
    console.error(
      "Error message:",
      error instanceof Error ? error.message : "Unknown"
    )
    console.error("Error code:", (error as any)?.code || "No code")

    // 2. 다른 페이지 ID로 테스트
    console.log("\n🔍 Testing with different page ID...")
    try {
      const testPageId = "256d364a-4963-80c3-b91b-ecb0c08033c4" // 다른 패턴
      const testPage = await api.getPage(testPageId)
      console.log("✅ Test page works!")
    } catch (testError) {
      console.error(
        "❌ Test page also failed:",
        testError instanceof Error ? testError.message : "Unknown error"
      )
    }
  }
}

debugPage()
