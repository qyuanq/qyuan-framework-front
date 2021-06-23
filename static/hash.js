//web-work引入spark-md5
self.importScripts('spark-md5.min.js')

//接收主线程传递的数据
self.onmessage = e => {
    const{chunks} = e.data
    const spark = new self.SparkMD5.ArrayBuffer()
    let progress = 0;
    let count = 0;
    const loadNext = index => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(chunks[index].file)
        reader.onload = e => {
            count ++
            //增量计算md5
            spark.append(e.target.result)
            if(count == chunks.length){ //计算结束
                self.postMessage({      //返回数据
                    progress:100,       //进度值100%
                    hash:spark.end()    //md5结果
                })
                self.close()
            }else{
                progress += 100 / chunks.length
                self.postMessage({
                    progress    //返回计算进度
                })
                loadNext(count)
            }
        }
    }
    loadNext(0)
}