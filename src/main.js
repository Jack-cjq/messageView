import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/style.css'
// 初始化请求拦截器
import './utils/requestInterceptor.js'

createApp(App).use(router).mount('#app')

