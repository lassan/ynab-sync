import type { AxiosInstance } from "axios"

type RequestInterceptor = Parameters<AxiosInstance["interceptors"]["request"]["use"]>[0]
type ErrorInterceptor = Parameters<AxiosInstance["interceptors"]["request"]["use"]>[1]

const requestLogger: RequestInterceptor = (request) => {
  console.log(`axios ${request.method} /${request.url}`)
  return request
}

const errorLogger: RequestInterceptor = (error) => {
  console.error("Request failed")
  return Promise.reject({})
}

type AuthHeaderInterceptor = (getToken: () => Promise<string>) => RequestInterceptor

const authHeader: AuthHeaderInterceptor = (getToken) => async (request) => {
  request.headers["Authorization"] = `Bearer ${await getToken()}`

  return request
}

export { requestLogger, authHeader, errorLogger }
