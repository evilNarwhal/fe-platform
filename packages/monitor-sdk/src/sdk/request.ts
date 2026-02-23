import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { debugLog, trackError, trackEvent } from './core'

// 请求数据上报
const trackRequest = (req: {
    url: string,
    method: string,
    status?: number,
    duration: number,
    ok: boolean,
    error?: string,
    source: "fetch" | "axios"
}) => {
    trackEvent({ name: 'request', props: req })
}

const resolveStartTime = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : performance.now();

// fetch请求打点处理 API
export const registerFetch = () => {
    const oriFetch = window.fetch;
    // 定义的async函数会自动按fetch进行类型推断，无需自己准备
    window.fetch = async (input, init) => {
        const startTime = performance.now();
        // 兼容string类型
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        // 方法类型转大写
        const method = ((input instanceof Request ? input.method : init?.method) || "GET").toUpperCase();
        // 调用原fetch并记录相关指标
        try {
            const res = await oriFetch(input, init);
            trackRequest({
                url,
                method,
                status: res.status,
                duration: performance.now() - startTime,
                ok: res.ok,
                source: "fetch"
            })
            return res;
        } catch (error) {
            trackRequest({
                url,
                method,
                duration: performance.now() - startTime,
                ok: false,
                error: (error as Error)?.message || "fetch error",
                source: 'fetch'
            })
            // 继续抛出错误，保证调用者自己可知
            throw error;
        }
    }
    // 注销函数
    return () => {
        window.fetch = oriFetch;
    }
}

interface AxiosConfig extends AxiosRequestConfig {
    __startTime?: number
}


// axios请求打点 init注册
export const registerAxios = (instance: AxiosInstance) => {
    if (!instance?.interceptors?.request?.use || !instance?.interceptors?.response?.use) {
        throw new TypeError("不合法的axios实例");
    }

    // 注册新的请求拦截器，确保请求成功有开始时间
    const reqId = instance.interceptors.request.use((config) => {
        (config as AxiosConfig).__startTime = performance.now();
        return config;
    })

    // 给实例注册新的响应拦截器 第一个参数为成功回调，第二个参数为失败回调
    const resId = instance.interceptors.response.use(
        (res) => {
            try {
                debugLog('axios响应数据：',res)
                const config = ((res as AxiosResponse)?.config ?? {});
                const startTime = resolveStartTime((config as AxiosConfig).__startTime);
                trackRequest({
                    url: config.url || "",
                    method: (config.method || "GET").toUpperCase(),
                    status: res.status,
                    duration: performance.now() - startTime,
                    ok: true,
                    source: 'axios'
                })
            } catch (error) {
                // 捕获SDK报错，不抛出避免影响业务
                trackError({
                    message: (error as Error)?.message || "track axios success failed",
                    type: "SDKAxiosTrackError"
                })
            }
            // 记得返回response
            return res;
        },
        // 处理响应失败，一样记录url、耗时等信息
        (err: any) => {
            try {
                const config = (err?.config ?? err?.response?.config ?? {}) as AxiosConfig;
                const startTime = resolveStartTime(config.__startTime);
                trackRequest({
                    url: config.url || "",
                    method: (config.method || "GET").toUpperCase(),
                    // 网络错误可能没有response
                    status: err?.response?.status,
                    duration: performance.now() - startTime,
                    ok: false,
                    error: err?.message,
                    source: 'axios'
                })
            } catch (error) {
                trackError({
                    message: (error as Error)?.message || "track axios error failed",
                    type: "SDKAxiosTrackError"
                })
            }
            // Promise异常应当继续抛出，让业务知晓
            throw err;
        })
    // 注销函数
    return () => {
        instance.interceptors.request.eject(reqId);
        instance.interceptors.response.eject(resId);
    }
}
