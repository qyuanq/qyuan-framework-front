<template>
  <div class="editor">
    <div class="write-btn">
      <el-button type="primary" @click="submit">
        提交
      </el-button>
    </div>
    <el-row>
      <el-col :span="12">
        <textarea ref="editor" v-model="content" class="md-editor" />
      </el-col>
      <el-col :span="12">
        <div class="markdown-body" v-html="compilerContent" />
      </el-col>
    </el-row>
  </div>
</template>

<script>
import marked from 'marked'
export default {
  data () {
    return {
      content: '# 开课吧'
    }
  },

  computed: {
    compilerContent () {
      return marked(this.content, {})
    }
  },

  mounted () {
    this.bindEvent()
  },

  methods: {
    submit () {

    },
    bindEvent () {
      // 拖拽事件
      this.$refs.editor.addEventListener('drop', async (e) => {
        const files = e.dataTransfer.files
        e.preventDefault()
        // @todo  文件上传
      })
      // 粘贴事件
      this.$refs.editor.addEventListener('paste', async (e) => {
        const files = e.clipboardData.files
        // @todo 直接上传
      })
    }
    // 防抖 键盘停顿350ms在更新
  }
}

</script>
<style lang='scss' scoped>
.md-editor{
    width:100%;
    height:100vh;
}
.markdown-body{
    width:100%;
}
.write-btn{
    position: fixed;
    top:30px;
    right:10px;
}
</style>
