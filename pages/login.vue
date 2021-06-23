<template>
  <div class="container">
      <el-form :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="100px" class="loginForm">
        <img src="/logo.png" style="width=200px">
        <h1>后台管理登录</h1>
        <el-form-item label="邮箱" prop="email">
            <el-input type="email"  v-model="ruleForm.email" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
            <el-input type="password"  v-model="ruleForm.password" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="验证码" prop="captcha" class="captcha">
            <el-input type="text"  v-model="ruleForm.captcha" autocomplete="off"></el-input>
            <div class="priture">
                <img :src="captionSrc" @click="updateCaption" />
            </div>
        </el-form-item>
        <el-form-item label="邮箱验证码" prop="emailcode" class="emailcode">
            <el-input type="text"  v-model="ruleForm.emailcode" autocomplete="off"></el-input>
            <div class="emailcode">
                <el-button type="primary" :disabled="timer > 0" @click="sendCode" >{{emailText}}</el-button>
            </div>
        </el-form-item>
        <el-form-item>
            <el-button type="success" @click.native="onLogin">登录</el-button>
            <el-button type="primary" @click.native="onRegister">注册</el-button>
        </el-form-item>
    </el-form>
  </div>
</template>

<script>
import md5 from 'md5'
export default {
  layout: 'login',
  data () {
    return {
        timer: 0,
        ruleForm: {
            email: '',
            password: '',
            captcha: '',
            emailcode: ''
        },
        rules: {
            email: [
                {required: true, message: '邮箱不能为空'},
                {type: 'email', message: '请填写正确的邮箱格式'}
            ],
            password: [
                {required: true,pattern: /^[\w_-]{6,12}$/g,message: '请输入6-12位密码'}
            ],
            captcha:[
                {required:true, message:'请输入验证码'}
            ],
            emailcode:[
              {required:true, message:'请输入邮箱验证码'}
            ]
        },
        captionSrc: '/api/caption'
    };
  },

  components: {},

  computed: {
    emailText(){
      if(this.timer > 0){
        return `${this.timer}秒后发送`
      }
      return '发送'
    }
  },

  methods: {
      //更换验证码
      updateCaption(){
          this.captionSrc = `/api/caption?random=${Math.random()}`
      },
      //发送邮箱验证码
      async sendCode(){
        const res = await this.$axios.get(`/sendcode?email=${this.ruleForm.email}`)
        this.timer = 60;
        let setVal = setInterval(() => {
          this.timer -= 1;
          if(this.timer <= 0){
            clearInterval(setVal);
          }
        },1000)
      },

      onLogin(){
          this.$refs['ruleForm'].validate(async valid => {
              if(valid){
                  console.log('校验成功，发送请求');
                  let data = {
                      password: md5(this.ruleForm.password),
                      email: this.ruleForm.email,
                      captcha: this.ruleForm.captcha,
                      emailcode: this.ruleForm.emailcode
                  }
                  const res = await this.$axios.post('/user/login',data)
                  if(res.code === 0){
                    //token存储到localStorage
                    localStorage.setItem('token',res.data.token)
                    this.$router.push("/")
                  }else{
                      this.$message.error(res.message)
                  }
              }else{
                  console.log('校验失败');
                  return false;
              }
          })
      },

      onRegister(){
        this.$router.push('/register')
      }
  }
}

</script>
<style lang='scss' scoped>
</style>