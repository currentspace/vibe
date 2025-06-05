#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const certPath = path.join(__dirname, '..', 'certs')
const keyFile = path.join(certPath, 'localhost-key.pem')
const certFile = path.join(certPath, 'localhost.pem')

console.log('🔍 Checking HTTPS certificate setup...\n')

const keyExists = fs.existsSync(keyFile)
const certExists = fs.existsSync(certFile)

if (keyExists && certExists) {
  console.log('✅ HTTPS certificates found!')
  console.log(`   Key:  ${keyFile}`)
  console.log(`   Cert: ${certFile}`)
  console.log('\n🚀 You can run the app with HTTPS:')
  console.log('   pnpm dev:https')
} else {
  console.log('❌ HTTPS certificates not found')
  console.log('\n📝 To set up HTTPS for local development:')
  console.log('\n1. Install mkcert:')
  console.log('   macOS:    brew install mkcert')
  console.log('   Windows:  choco install mkcert')
  console.log('   Linux:    brew install mkcert')
  console.log('\n2. Install the local CA:')
  console.log('   mkcert -install')
  console.log('\n3. Generate certificates:')
  console.log('   mkdir -p certs')
  console.log('   mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1')
  console.log('\n4. Run with HTTPS:')
  console.log('   pnpm dev:https')
}

console.log('\n💡 For more information, see the README.md file.')