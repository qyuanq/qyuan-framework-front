<template>
  <div class="container">
      <el-form :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="100px" class="loginForm">
        <img src="/logo.png" style="width=200px">
        <h1>后台管理注册</h1>
        <el-form-item label="用户名" prop="name">
            <el-input type="text"  v-model="ruleForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
            <el-input type="email"  v-model="ruleForm.email" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
            <el-input type="password"  v-model="ruleForm.password" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="确认密码"  prop="relPassword">
            <el-input type="password" v-model="ruleForm.relPassword" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="验证码" prop="captcha" class="captcha">
            <el-input type="text"  v-model="ruleForm.captcha" autocomplete="off"></el-input>
            <div class="priture">
                <img :src="captionSrc" @click="updateCaption" />
            </div>
        </el-form-item>
        <el-form-item>
            <el-button type="primary" @click.native="onSumbit">提交</el-button>
            <el-button type="success" @click.native="onLogin">登录</el-button>
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
        ruleForm: {
            name: '老王',
            email: '',
            password: '',
            relPassword: '',
            captcha: ''
        },
        rules: {
            name: [
                {required: true,message: '用户名不能为空'}
            ],
            email: [
                {required: true, message: '邮箱不能为空'},
                {type: 'email', message: '请填写正确的邮箱格式'}
            ],
            password: [
                {required: true,pattern: /^[\w_-]{6,12}$/g,message: '请输入6-12位密码'}
            ],
            relPassword: [
                {required: true, message:'请再次输入密码'},
                {validator: (rule,value,callback) =>{
                    if(value !== this.ruleForm.password){
                        callback(new Error('两次密码不一致'))
                    }
                    callback()
                }}
            ],
            captcha:[
                {required:true, message:'请输入验证码'}
            ]
        },
        captionSrc: '/api/caption'
    };
  },

  components: {},

  computed: {},

  methods: {
      //更换验证码
      updateCaption(){
          this.captionSrc = `/api/caption?random=${Math.random()}`
      },

      onSumbit(){
          this.$refs['ruleForm'].validate(async valid => {
              if(valid){
                  console.log('校验成功，发送请求');
                  let data = {
                      name: this.ruleForm.name,
                      password: md5(this.ruleForm.password),
                      email: this.ruleForm.email,
                      captcha: this.ruleForm.captcha
                  }
                  const res = await this.$axios.post('/user/register',data)
                  if(res.code === 0){
                    this.$notify({
                        message: '注册成功'
                    })
                    setTimeout(() => {
                        this.$router.push("/login")
                    },1000)
                  }else{
                       this.$notify({
                        message: res.message
                    })
                  }
              }else{
                  console.log('提交失败');
                  return false;
              }
          })
      },

      onLogin(){
          this.$router.push("/login")
      }
  }
}

</script>
<style lang='scss' scoped>
</style>