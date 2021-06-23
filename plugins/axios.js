import Vue from 'vue'
import axios from 'axios'
import { MessageBox } from 'element-ui'

const service = axios.create({
  timeout: 10000, // 耗时超过10s 报错
  // 前缀
  baseURL: '/api'
})
export default ({ store, redirect }) => {
// 请求拦截器
  service.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token')
      if (token) {
        // 设置请求头加token
        config.headers.common.Authorization = 'Bearer ' + token
      }
      return config
    },
    (error) => {
      // 请求预处理错误
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  service.interceptors.response.use(
    (response) => {
      const { data } = response
      if (data.code === -666) {
        MessageBox.confirm('登录过期了', '过期', {
          confirmButtonText: '登录',
          showCancelButton: false,
          type: 'warning'
        }).then(() => {
          localStorage.removeItem('token')
          redirect({ path: '/login' })
        })
      }
      return data
    },
    (err) => {
      return Promise.reject(err)
    }
  )
}

Vue.prototype.$axios = service

export const http = service
