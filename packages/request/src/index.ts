export const requestVersion = "0.1.0";


// 可超时的fetch请求
export const fetchWithTimeout = (timeout:number)=>{
    return (url:string,options:RequestInit={}):Promise<Response>=>{
        const controller = new AbortController();
        // 利用AbortSignal.any([])函数合并signal
        const signal = options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
        let timer = setTimeout(()=>{
            controller.abort();
        },timeout);
        // 执行实际逻辑
        return fetch(url,{...options,signal}).finally(()=>clearTimeout(timer));
    }
}