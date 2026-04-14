with open('vite.config.ts', 'r') as f:
    content = f.read()

proxy_config = """    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/rest': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }"""

if 'proxy:' not in content:
    content = content.replace("server: {", "server: {\n" + proxy_config + ",")
    with open('vite.config.ts', 'w') as f:
        f.write(content)
