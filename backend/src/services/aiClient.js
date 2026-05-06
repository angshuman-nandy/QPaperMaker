const axios = require('axios')

const aiClient = axios.create({
  baseURL: process.env.AI_PIPELINE_URL || 'http://localhost:8000',
  timeout: 300000, // 5 minutes — generation can take a while
})

module.exports = aiClient
