<template>
  <div>
    <h1>用户中心</h1>
    <div ref="drag" class="drag">
      <input type="file" name="file" @change="handleFileChange">
    </div>
    <p>上传文件进度</p>
    <el-progress :text-inside="true" :stroke-width="26" :percentage="uploadProgress" />
    <p>计算hash进度</p>
    <el-progress :text-inside="true" :stroke-width="26" :percentage="hashProgress">
      hash进度条
    </el-progress>
    <el-button @click="updateFile">
      上传
    </el-button>
    <!-- chunk.progress
      progress<0 报错 显示红色
      == 100 成功
      别的数字 方块高度显示 -->
    <!-- 尽可能让方块看起来仕真方形
      比如10各方块 4*4
      9 3*3
      100 10*10 -->
    <div class="cube-container" :style="{width:cubeWidth+'px'}">
      <div v-for="chunk in chunks" :key="chunk.name" class="cube">
        <div
          :class="{
            'uploading': chunk.progress>0 && chunk.progress<100,
            'success': chunk.progress === 100,
            'error':chunk.progress < 0
          }"
          :style="{height:chunk.progress + '%'}"
        >
          <i v-if="chunk.progress<100 && chunk.progress>0" class="el-icon-loading" style="color:#f56c6c" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SparkMD5 from 'spark-md5'
const CHUNK_SIZE = 10 * 1024 * 1024 // 定义切片大小1M
export default {
  data () {
    return {
      file: null,
      // uploadProgress: 0,
      hashProgress: 0, // hash进度
      chunks: [], // 切片
      hash: null
    }
  },

  computed: {
    cubeWidth () {
      return Math.ceil(Math.sqrt(this.chunks.length)) * 16
    },
    uploadProgress () {
      if (!this.file || this.chunks.length <= 0) {
        return 0
      }
      const loaded = this.chunks.map(item => item.chunk.size * item.progress)
        .reduce((total, curr) => {
          return total + curr
        }, 0)
      return Number((loaded / this.file.size).toFixed(2))
    }
  },

  async mounted () {
    const res = await this.$axios.get('/user/info')
    // 绑定事件监听
    this.bindEvent()
  },

  methods: {
    handleFileChange (e) {
      // [file]用的se6解构
      const [file] = e.target.files
      if (!file) { return }
      this.file = file
      console.log(file)
    },
    // 文件上传
    async updateFile () {
      if (!this.file) {
        return
      }
      // if(!await this.isImage(this.file)){
      //   console.log('文件格式不对')
      //   return
      // }
      // 切片上传
      const chunks = this.createFileChunk(this.file)

      // web-work计算hash,为文件唯一标识
      // const hash = await this.calculateHashWork(chunks)

      // const hash = await this.calculateHashIdle(chunks)
      const hash = await this.calculateHashSample(this.file)
      // console.log(hash,hash1,hash2);
      this.hash = hash
      // 发送请求服务器是否存在该文件
      const { data: { uploaded, uploadedList } } = await this.$axios.post('/checkfile', {
        hash: this.hash,
        ext: this.file.name.split('.').pop()
      })
      if (uploaded) {
        this.$notify({
          message: '秒传成功'
        })
        return
      }
      this.chunks = chunks.map((chunk, index) => {
        // 切片的名字 hash+index
        const name = hash + '-' + index
        return {
          hash,
          name,
          index,
          chunk: chunk.file,
          // 设置进度条，已经上传的，设为100
          progress: uploadedList.includes(name) ? 100 : 0
        }
      })
      await this.uploadChunks(uploadedList)
    },

    async uploadChunks (uploadedList = []) {
      // let formData = new FormData();
      // formData.append('name','file');
      // formData.append('file',this.file)
      // const res = await this.$axios.post('/updateFile',formData,{
      //   onUploadProgress: progress => {
      //     this.uploadProgress = Number(((progress.loaded / progress.total) * 100).toFixed(2))
      //   }
      // })
      // console.log(res)

      // 断点续传：过滤不包含在uploadedList的chunk
      const requests = this.chunks
        .filter(chunk => !uploadedList.includes(chunk.name))
        .map((chunk, index) => {
          // 转成promise
          const form = new FormData()
          form.append('chunk', chunk.chunk)
          form.append('hash', chunk.hash)
          form.append('name', chunk.name)
          // form.append('index',chunk.index)
          return { form, index: chunk.index, error: 0 }
        })
      // .map(async ({form,index}) => {
      //   return await this.$axios.post('/updateFile',form,{
      //     onUploadProgress: progress => {
      //       // 不是整体的进度条了，而是每个区块有自己的进度条，整体的进度条需要计算
      //       this.chunks[index].progress = Number(((progress.loaded / progress.total) * 100).toFixed(2))
      //     }
      //   })
      // })
      // await Promise.all(requests)
      // 控制异步并发数
      await this.sendRequest(requests)
      // 合并切片
      await this.mergeRequest()
    },

    async mergeRequest () {
      const res = await this.$axios.post('/mergeFile', {
        ext: this.file.name.split('.').pop(),
        size: CHUNK_SIZE,
        hash: this.hash
      })
      if (res.code === 0) {
        this.$notify({
          message: '上传成功'
        })
      }
    },

    // tcp链接过多，会造成浏览器卡顿
    // 控制异步并发数
    async sendRequest (chunks, limit = 4) {
      // limit并发数
      // 一个数组，长度是limit
      // [task1,task2,task3] [task2,task3,task4]
      return new Promise((resolve, reject) => {
        const len = chunks.length
        let isStop = false
        let count = 0
        const start = async () => {
          if (isStop) {
            return
          }
          const task = chunks.shift() // 从数组第一个任务开始
          if (task) {
            const { form, index, error } = task
            try {
              await this.$axios.post('/updateFile', form, {
                onUploadProgress: (progress) => {
                  // 不是整体的进度条了，而是每个区块有自己的进度条，整体的进度条需要计算
                  this.chunks[index].progress = Number(((progress.loaded / progress.total) * 100).toFixed(2))
                }
              })
              if (count === len - 1) {
                // 最后一个任务
                resolve()
              } else {
                count++
                // 启动下一个任务
                start()
              }
            } catch (e) {
              this.chunks[index].progress = -1
              if (task.error < 3) {
                task.error++
                chunks.unshift(task)
                start()
              } else {
                // 错误三次，直接结束
                isStop = true
                reject()
              }
            }
          }
        }

        while (limit > 0) {
          start()
          limit -= 1
        }
      })
    },

    // 切片上传
    createFileChunk (file, size = CHUNK_SIZE) {
      const chunks = []
      let cur = 0
      while (cur < this.file.size) {
        chunks.push({ index: cur, file: this.file.slice(cur, cur + size) })
        cur += size
      }
      return chunks
    },
    // web-work计算hash
    async calculateHashWork (chunks) {
      return new Promise((resolve) => {
        // 开了个隐分身进程
        this.worker = new Worker('/hash.js')
        // 传递chunks切片给这个进程
        this.worker.postMessage({ chunks })
        // 每个切片的回传信息
        this.worker.onmessage = (e) => {
          const { progress, hash } = e.data
          this.hashProgress = Number(progress.toFixed(2))
          if (hash) {
            resolve(hash)
            // 关掉worker
            this.worker.terminate()
          }
        }
      })
    },
    // 时间切片浏览器空闲时间计算md5
    async calculateHashIdle (chunks) {
      return new Promise((resolve) => {
        const spark = new SparkMD5.ArrayBuffer()
        let count = 0
        const appendToSpark = async (file) => {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.readAsArrayBuffer(file)
            reader.onload = (e) => {
              spark.append(e.target.result)
              resolve()
            }
          })
        }

        const workLoop = async (deadline) => {
          // timeRemaining获取当前帧的剩余时间
          while (count < chunks.length && deadline.timeRemaining() > 1) {
            // 空闲时间且有任务 执行
            await appendToSpark(chunks[count].file)
            count++
            if (count < chunks.length) {
              this.hashProgress = Number(((100 * count) / chunks.length).toFixed(2))
            } else {
              this.hashProgress = 100
              resolve(spark.end())
            }
          }
          // 自己启动自己 没有空闲时间启动下一次任务 直到算完所有chunks
          window.requestIdleCallback(workLoop)
        }
        // 启动一次，浏览器一旦空闲，就会调用workLoop
        window.requestIdleCallback(workLoop)
      })
    },
    // 抽样hash
    async calculateHashSample (file) {
      return new Promise((resolve) => {
        const spark = new SparkMD5.ArrayBuffer()
        const reader = new FileReader()
        const offSize = 1 * 1024 * 1024
        // 第一个切片
        const chunks = [file.slice(0, offSize)]
        let cur = offSize
        while (cur < file.size) {
          if (cur + offSize >= file.size) {
            // 最后一个切片
            chunks.push(file.slice(cur, file.size))
          } else { // 中间切片 取前中后各2各字节
            const mid = cur + offSize / 2
            const end = cur + offSize
            chunks.push(file.slice(cur, cur + 2))
            chunks.push(file.slice(mid, mid + 2))
            chunks.push(file.slice(end - 2, end))
          }
          cur += offSize
        }
        reader.readAsArrayBuffer(new Blob(chunks))
        reader.onload = (e) => {
          spark.append(e.target.result)
          this.hashProgress = 100
          resolve(spark.end())
        }
      })
    },

    // 监听拖拽
    bindEvent () {
      const drag = this.$refs.drag
      // 监听拖进来
      drag.addEventListener('dragover', (e) => {
        // 修改样式
        drag.style.borderColor = 'red'
        // 阻止默认事件
        e.preventDefault()
      })
      // 拖出去
      drag.addEventListener('dragleave', (e) => {
        drag.style.borderColor = '#eee'
        e.preventDefault()
      })
      // 放下来
      drag.addEventListener('drop', (e) => {
        this.file = e.dataTransfer.files[0]
        drag.style.borderColor = '#eee'
        e.preventDefault()
      })
    },

    // file转16进制
    async blobToString (blob) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = function () {
          console.log('reader', reader.result)
          const res = reader.result.split('')
            .map(v => v.charCodeAt()) // 转ASII 是10进制
            .map(v => v.toString(16).toUpperCase()) // 转16进制并且大写
            .map(v => v.padStart(2, '0')) // 两位数前面补0
            .join(' ') // 拼成字符串
          resolve(res)
        }
        // 开始读取，reader.result为原始二进制数据
        reader.readAsBinaryString(blob)
      })
    },
    async isGIF (file) {
      // 前面6个16进制 两种规范 GIF87a / GIF89a
      const res = await this.blobToString(file.slice(0, 6))
      const isGif = (res === '47 49 46 38 39 61') || (res === '47 49 46 38 37 61')
      return isGif
    },
    async isPNG (file) {
      const res = await this.blobToString(file.slice(0, 8))
      const isPng = (res === '89 50 4E 47 0D 0A 1A 0A')
      return isPng
    },
    async isJPG (file) {
      const start = await this.blobToString(file.slice(0, 2))
      const tail = await this.blobToString(file.slice(-2, file.size))
      const isJpg = (start === 'FF D8' && tail === 'FF D9')
      return isJpg
    },
    async isImage (file) {
      // 通过文件流来判定
      return await this.isGIF(file) || await this.isPNG(file) || await this.isJPG(file)
    },
    async isExcleOrWord (file) {
      const res = await this.blobToString(file.slice(0, 4))
      const isExcelOrWord = (res === 'D0 CF 11 E0')
      return isExcelOrWord
    }
  }
}

</script>
<style lang='scss' scoped>
.drag{
  height: 100px;
  line-height: 100px;
  border: 2px dashed #eee;
  text-align: center;
}
.cube-container{
  .cube{
    width: 16px;
    height: 16px;
    float: left;
    background: #ccc;
    box-sizing: border-box;
    border:1px solid #000;
    .uploading{
      background: blue;
    }
    .success{
      background: green;
    }
    .error{
      background: red;
    }
  }
}
</style>
