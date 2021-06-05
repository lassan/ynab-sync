import type { AxiosInstance } from "axios"

type RequestInterceptor = Parameters<AxiosInstance["interceptors"]["request"]["use"]>[0]

const requestLogger: RequestInterceptor = (request) => {
  console.log(`axios ${request.method} /${request.url}`)
  return request
}

type AuthHeaderInterceptor = (getToken: () => Promise<string>) => RequestInterceptor

const authHeader: AuthHeaderInterceptor = (getToken) => async (request) => {
  request.headers["Authorization"] = `Bearer ${await getToken()}`

  return request
}

export { requestLogger, authHeader }
