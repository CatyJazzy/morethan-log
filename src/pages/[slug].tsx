import Detail from "src/routes/Detail"
import { filterPosts } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { NextPageWithLayout } from "../types"
import CustomError from "src/routes/Error"
import { getRecordMap, getPosts } from "src/apis"
import MetaConfig from "src/components/MetaConfig"
import { GetStaticProps } from "next"
import { queryClient } from "src/libs/react-query"
import { queryKey } from "src/constants/queryKey"
import { dehydrate } from "@tanstack/react-query"
import usePostQuery from "src/hooks/usePostQuery"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"
import { ExtendedRecordMap } from "notion-types"

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

export const getStaticPaths = async () => {
  const posts = await getPosts()
  const filteredPost = filterPosts(posts, filter)

  return {
    paths: filteredPost.map((row) => `/${row.slug}`),
    fallback: true,
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const slug = context.params?.slug

  const posts = await getPosts()
  const feedPosts = filterPosts(posts)
  await queryClient.prefetchQuery(queryKey.posts(), () => feedPosts)

  const detailPosts = filterPosts(posts, filter)
  const postDetail = detailPosts.find((t: any) => t.slug === slug)

  // 페이지 상세 정보 로깅
  console.log(`=== Processing slug: ${slug} ===`)
  if (postDetail) {
    console.log(`Post detail found:`, {
      id: postDetail.id,
      title: postDetail.title,
      slug: postDetail.slug,
      status: postDetail.status,
      type: postDetail.type,
      category: postDetail.category,
      tags: postDetail.tags,
      hasThumbnail: !!postDetail.thumbnail,
      fullWidth: postDetail.fullWidth,
      createdTime: postDetail.createdTime,
      date: postDetail.date,
    })
  } else {
    console.warn(`No post detail found for slug: ${slug}`)
  }

  let recordMap: ExtendedRecordMap | null = null
  if (postDetail?.id) {
    try {
      console.log(
        `Attempting to get record map for page ID: ${postDetail.id} (slug: ${slug})`
      )
      const result = await getRecordMap(postDetail.id)
      recordMap = result || null
      console.log(`✅ Successfully got record map for ${slug}`)
      
      // 성공한 페이지의 추가 정보
      if (recordMap) {
        const blockCount = Object.keys(recordMap.block).length
        const collectionCount = Object.keys(recordMap.collection || {}).length
        const viewCount = Object.keys(recordMap.collection_view || {}).length
        
        console.log(`📊 Record map stats for ${slug}:`, {
          blockCount,
          collectionCount,
          viewCount,
          totalSize: JSON.stringify(recordMap).length,
        })
      }

      // API 요청 간격 조절 (100ms 대기)
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      console.warn(`❌ Failed to get record map for ${slug}:`, error)
      
      // 실패한 페이지의 상세 분석
      console.error(`🔍 Failure analysis for ${slug}:`, {
        pageId: postDetail.id,
        pageTitle: postDetail.title,
        pageType: postDetail.type,
        pageStatus: postDetail.status,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
        errorCode: (error as any)?.code || 'No code',
        statusCode: (error as any)?.statusCode || 'No status code',
        hasRetries: (error as any)?.attempts || 1,
      })
      
      // 에러 객체를 더 자세히 출력 (안전하게)
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}`)
        console.error(`Error message: ${error.message}`)
        if ("statusCode" in error) {
          console.error(`HTTP Status Code: ${(error as any).statusCode}`)
        }
        if ("code" in error) {
          console.error(`Error code: ${(error as any).code}`)
        }
        // response 객체는 순환 참조가 있을 수 있으므로 안전하게 처리
        if ("response" in error && (error as any).response) {
          try {
            const response = (error as any).response
            console.error(
              `Response status: ${response.statusCode || response.status}`
            )
            console.error(
              `Response headers:`,
              Object.keys(response.headers || {})
            )
          } catch (e) {
            console.error(`Could not log response details:`, e)
          }
        }
      }
      // Continue without recordMap
    }
  }

  await queryClient.prefetchQuery(queryKey.post(`${slug}`), () => ({
    ...postDetail,
    recordMap,
  }))

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
    revalidate: CONFIG.revalidateTime,
  }
}

const DetailPage: NextPageWithLayout = () => {
  const post = usePostQuery()

  if (!post) return <CustomError />

  const image =
    post.thumbnail ??
    CONFIG.ogImageGenerateURL ??
    `${CONFIG.ogImageGenerateURL}/${encodeURIComponent(post.title)}.png`

  const date = post.date?.start_date || post.createdTime || ""

  const meta = {
    title: post.title,
    date: new Date(date).toISOString(),
    image: image,
    description: post.summary || "",
    type: post.type[0],
    url: `${CONFIG.link}/${post.slug}`,
  }

  return (
    <>
      <MetaConfig {...meta} />
      <Detail />
    </>
  )
}

DetailPage.getLayout = (page) => {
  return <>{page}</>
}

export default DetailPage
