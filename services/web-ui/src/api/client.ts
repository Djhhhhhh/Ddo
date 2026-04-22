import axios, { type AxiosInstance, type AxiosError } from 'axios'

// Create axios instance with default config
const client: AxiosInstance = axios.create({
  baseURL: '',
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
client.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('ddo_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
client.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error('Unauthorized - please login')
          break
        case 500:
          console.error('Server error')
          break
        default:
          console.error(`API Error: ${error.response.status}`)
      }
    } else if (error.request) {
      console.error('Network error - server may be unavailable')
    }
    return Promise.reject(error)
  }
)

export default client
